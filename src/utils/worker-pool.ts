import { WorkerError } from './errors';

/**
 * Message types for worker communication
 */
export interface WorkerMessage<T = any> {
  id: string;
  type: 'process' | 'result' | 'error';
  payload?: T;
  error?: string;
}

/**
 * Task definition for worker processing
 */
export interface WorkerTask<TInput = any, TOutput = any> {
  id: string;
  operation: string;
  input: TInput;
  resolve: (result: TOutput) => void;
  reject: (error: Error) => void;
}

/**
 * Generate a task id without relying on crypto.randomUUID (which is
 * unavailable on non-secure origins such as http:// intranet deployments).
 */
let taskSeq = 0;
function createTaskId(): string {
  taskSeq += 1;
  return `task-${Date.now().toString(36)}-${taskSeq.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Reject `promise` if it does not settle within `ms` milliseconds.
 * The underlying promise keeps running; this only bounds the caller.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, message = 'Operation timed out'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); }
    );
  });
}

/**
 * Web Worker pool manager for processing large datasets.
 *
 * Workers are created lazily — the first task triggers pool population —
 * so pages only pay for workers when a large input actually arrives.
 */
export class WorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private taskQueue: WorkerTask[] = [];
  private activeTasks = new Map<string, WorkerTask>();
  private maxWorkers: number = Math.min(4, navigator.hardwareConcurrency || 2);
  private workerScript: string | null = null;
  private initialized = false;

  constructor(workerScript?: string) {
    if (workerScript) {
      this.workerScript = workerScript;
      this.initialized = true;
    }
  }

  /**
   * Initialize the worker pool with a worker script (lazy initialization).
   * No-op if the pool was constructed with a script.
   */
  public async init(workerScript?: string): Promise<void> {
    if (this.initialized) return;
    const script = workerScript || this.workerScript;
    if (script) {
      this.workerScript = script;
      this.initialized = true;
    }
  }

  /**
   * Get an available worker directly (for tools that manage workers manually)
   */
  public getWorker(): Worker | null {
    if (this.availableWorkers.length === 0) {
      return null;
    }
    const worker = this.availableWorkers.shift()!;
    return worker;
  }

  /**
   * Populate the pool with workers (up to maxWorkers). Throws WorkerError
   * if worker construction fails (e.g. `Worker` unavailable in this context).
   */
  private ensureWorkers(): void {
    if (!this.workerScript) return;

    while (this.workers.length < this.maxWorkers) {
      let worker: Worker;
      try {
        worker = this.createWorker(this.workerScript);
      } catch (error) {
        throw new WorkerError(
          `Failed to initialize worker pool: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { workerScript: this.workerScript, maxWorkers: this.maxWorkers }
        );
      }
      this.workers.push(worker);
      this.availableWorkers.push(worker);
    }
  }

  /**
   * Create a new worker with error handling
   */
  private createWorker(workerScript: string): Worker {
    const worker = new Worker(workerScript, { type: 'module' });

    worker.addEventListener('message', (event) => {
      this.handleWorkerMessage(worker, event.data);
    });

    worker.addEventListener('error', (error) => {
      this.handleWorkerError(worker, error);
    });

    return worker;
  }

  /**
   * Handle incoming messages from workers
   */
  private handleWorkerMessage(worker: Worker, message: WorkerMessage): void {
    const task = this.activeTasks.get(message.id);

    if (!task) {
      console.warn(`Received message for unknown task: ${message.id}`);
      // The task was already settled (e.g. timed out client-side) — return
      // the worker to the pool so it is not leaked.
      if (
        (message.type === 'result' || message.type === 'error') &&
        this.workers.includes(worker) &&
        !this.availableWorkers.includes(worker)
      ) {
        this.availableWorkers.push(worker);
        this.processQueue();
      }
      return;
    }

    if (message.type === 'result') {
      task.resolve(message.payload);
      this.completeTask(worker, message.id);
    } else if (message.type === 'error') {
      const error = new WorkerError(message.error || 'Unknown worker error', { taskId: message.id });
      task.reject(error);
      this.completeTask(worker, message.id);
    }
  }

  /**
   * Handle worker errors
   */
  private handleWorkerError(worker: Worker, error: ErrorEvent): void {
    console.error('Worker error:', error);

    // Find and reject all tasks assigned to this worker
    for (const [taskId, task] of this.activeTasks.entries()) {
      const workerError = new WorkerError(
        `Worker crashed: ${error.message}`,
        { originalError: error.error, filename: error.filename, lineno: error.lineno }
      );
      task.reject(workerError);
      this.activeTasks.delete(taskId);
    }

    // Remove the failed worker and create a new one
    this.workers = this.workers.filter(w => w !== worker);
    this.availableWorkers = this.availableWorkers.filter(w => w !== worker);

    try {
      worker.terminate();
    } catch (e) {
      // Ignore termination errors
    }
  }

  /**
   * Process a task using the worker pool
   */
  public async processTask<TInput, TOutput>(
    operation: string,
    input: TInput
  ): Promise<TOutput> {
    return new Promise<TOutput>((resolve, reject) => {
      const taskId = createTaskId();
      const task: WorkerTask<TInput, TOutput> = {
        id: taskId,
        operation,
        input,
        resolve,
        reject
      };

      this.taskQueue.push(task);
      this.processQueue();
    });
  }

  /**
   * Process the task queue
   */
  private processQueue(): void {
    if (this.taskQueue.length === 0) {
      return;
    }

    try {
      this.ensureWorkers();
    } catch (error) {
      // Workers cannot be created in this context — reject every queued task
      const queued = this.taskQueue.splice(0);
      for (const task of queued) {
        task.reject(error instanceof Error ? error : new WorkerError('Failed to initialize worker pool'));
      }
      return;
    }

    if (this.availableWorkers.length === 0) {
      return;
    }

    const task = this.taskQueue.shift()!;
    const worker = this.availableWorkers.shift()!;

    this.activeTasks.set(task.id, task);

    const message: WorkerMessage = {
      id: task.id,
      type: 'process',
      payload: {
        operation: task.operation,
        input: task.input
      }
    };

    worker.postMessage(message);
  }

  /**
   * Complete a task and return worker to pool
   */
  private completeTask(worker: Worker, taskId: string): void {
    this.activeTasks.delete(taskId);
    this.availableWorkers.push(worker);
    this.processQueue(); // Process any queued tasks
  }

  /**
   * Get pool statistics
   */
  public getStats() {
    return {
      totalWorkers: this.workers.length,
      availableWorkers: this.availableWorkers.length,
      activeTasks: this.activeTasks.size,
      queuedTasks: this.taskQueue.length
    };
  }

  /**
   * Terminate all workers and clear the pool
   */
  public terminate(): void {
    // Reject all pending tasks
    for (const task of this.activeTasks.values()) {
      task.reject(new WorkerError('Worker pool terminated'));
    }

    for (const task of this.taskQueue) {
      task.reject(new WorkerError('Worker pool terminated'));
    }

    // Terminate all workers
    for (const worker of this.workers) {
      try {
        worker.terminate();
      } catch (e) {
        // Ignore termination errors
      }
    }

    this.workers = [];
    this.availableWorkers = [];
    this.taskQueue = [];
    this.activeTasks.clear();
  }
}

/**
 * Create a worker pool singleton for the application
 */
let workerPool: WorkerPool | null = null;

export function getWorkerPool(): WorkerPool | null {
  return workerPool;
}

export function initializeWorkerPool(workerScript: string): WorkerPool {
  if (workerPool) {
    workerPool.terminate();
  }

  workerPool = new WorkerPool(workerScript);
  return workerPool;
}

export function terminateWorkerPool(): void {
  if (workerPool) {
    workerPool.terminate();
    workerPool = null;
  }
}
