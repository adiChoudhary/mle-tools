import { WorkerPool } from './worker-pool';
import {
  enforceMemoryLimit,
  shouldUseWorker,
  estimateMemoryUsage
} from './memory';
import { WorkerOperation } from './worker-interface';

/**
 * State of a tool instance
 */
export enum ToolState {
  IDLE = 'idle',
  PROCESSING = 'processing',
  COMPLETE = 'complete',
  ERROR = 'error'
}

/**
 * Lifecycle hooks for tool islands.
 * Extend this class to create a new tool.
 */
export abstract class BaseTool {
  protected state: ToolState = ToolState.IDLE;
  protected workerPool: WorkerPool | null = null;
  protected maxMemoryBytes: number;
  protected processingTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: {
    rootElement: HTMLElement;
    maxMemoryBytes?: number;
    workerScript?: string;
  }) {
    this.rootElement = config.rootElement;
    this.maxMemoryBytes = config.maxMemoryBytes ?? 50 * 1024 * 1024; // 50MB default
  }

  abstract readonly rootElement: HTMLElement;

  /**
   * Called by the Astro island onMount. Subclasses can override to set up
   * initial state (sample data, default options, etc.).
   */
  public onMount(): void {
    // Default: no-op. Override to add setup logic.
  }

  /**
   * Called by the Astro island onDispose. Clean up all resources.
   */
  public onDispose(): void {
    this.dispose();
  }

  /**
   * Bind event listeners for the tool's UI.
   * Must be implemented by subclasses.
   */
  protected abstract bindEvents(): void;

  /**
   * Render or update the tool's output area.
   * Must be implemented by subclasses.
   */
  protected abstract renderOutput(data: string | ArrayBuffer): void;

  /**
   * Optional: render an error message in the UI.
   */
  protected renderError(error: string): void {
    // Default: log to console. Override for custom UI.
    console.error(`[Tool Error] ${this.constructor.name}:`, error);
  }

  // ---- Public lifecycle (called from Astro island) ----

  /**
   * Full initialization: set up UI, events, and workers.
   */
  public init(): void {
    this.bindEvents();
  }

  /**
   * Clean up all resources.
   */
  public dispose(): void {
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
      this.processingTimer = null;
    }
    this.workerPool?.terminate();
    this.workerPool = null;
    this.state = ToolState.IDLE;
  }

  // ---- Memory & Worker helpers ----

  /**
   * Enforce the memory limit. Throws if data is too large.
   */
  protected checkMemory(data: string | ArrayBuffer): void {
    enforceMemoryLimit(data);
  }

  /**
   * Get estimated memory usage of data.
   */
  protected getMemoryUsage(data: string | ArrayBuffer): number {
    return estimateMemoryUsage(data);
  }

  /**
   * Initialize the shared worker pool.
   * Uses a singleton pattern so multiple tools share the same pool.
   */
  protected async initWorker(workerScript?: string): Promise<WorkerPool> {
    if (this.workerPool) {
      return this.workerPool;
    }

    if (!workerScript) {
      // Default: use the generic data-processor worker
      workerScript = new URL('../workers/data-processor.ts', import.meta.url).href;
    }

    // Use import to get the module functions
    const { initializeWorkerPool } = await import('./worker-pool');
    this.workerPool = initializeWorkerPool(workerScript);
    return this.workerPool;
  }

  /**
   * Process data: enforce memory limit, then route to worker or main thread.
   */
  protected async processData<TInput, TOutput>(
    data: TInput & (string | ArrayBuffer),
    operation: WorkerOperation,
    processSync: (data: TInput) => TOutput,
    processAsync?: (data: TInput, workerPool: WorkerPool) => Promise<TOutput>
  ): Promise<TOutput> {
    this.setState(ToolState.PROCESSING);

    try {
      // Memory check
      if (typeof data === 'string' || data instanceof ArrayBuffer) {
        this.checkMemory(data);
      }

      // Route large data to Web Worker
      if (
        shouldUseWorker(data) &&
        this.workerPool &&
        processAsync
      ) {
        return await processAsync(data, this.workerPool);
      }

      return processSync(data);
    } catch (error) {
      this.setState(ToolState.ERROR);
      const message = error instanceof Error ? error.message : String(error);
      this.renderError(message);
      throw error;
    }
  }

  // ---- State management ----

  public setState(newState: ToolState): void {
    const previous = this.state;
    this.state = newState;

    if (previous !== newState) {
      this.rootElement.dispatchEvent(
        new CustomEvent('tool-state-change', {
          detail: { previous, current: newState }
        })
      );
    }
  }

  public getState(): ToolState {
    return this.state;
  }
}
