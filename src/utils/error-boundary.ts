/**
 * ErrorBoundary — wrapper utility for tool islands.
 *
 * Catches unhandled errors from any tool island component,
 * displays a user-friendly error message, and provides
 * a retry mechanism without crashing the whole page.
 *
 * Usage in Astro island script:
 *   import { ErrorBoundary } from '../../utils/error-boundary.ts';
 *   const boundary = new ErrorBoundary(element);
 *   boundary.run(async () => { await formatter.init(); });
 */

const ERROR_TEMPLATES = {
  default: (message) => `
    <div class="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 my-4" role="alert">
      <div class="flex items-start space-x-3">
        <svg class="w-6 h-6 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
        </svg>
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-red-800 dark:text-red-200">Something went wrong</h3>
          <p class="mt-1 text-sm text-red-700 dark:text-red-300">${escapeHtml(message || 'An unexpected error occurred while loading this tool.')}</p>
        </div>
      </div>
      <button class="error-boundary-retry mt-4 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 transition-colors">
        Try again
      </button>
    </div>
  `,

  worker: `
    <div class="rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 p-6 my-4" role="alert">
      <div class="flex items-start space-x-3">
        <svg class="w-6 h-6 text-orange-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-orange-800 dark:text-orange-200">Web Worker unavailable</h3>
          <p class="mt-1 text-sm text-orange-700 dark:text-orange-300">Your browser doesn't support Web Workers or they've been disabled. This tool may run slower for large inputs.</p>
        </div>
      </div>
    </div>
  `,
};

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export class ErrorBoundary {
  #element: HTMLElement;
  #originalContent: string;
  #initFn: () => Promise<void> | void;
  #retries = 0;
  #maxRetries = 2;

  /**
   * @param element  The container element that the tool renders into
   * @param initFn   Async function that initializes the tool (render + bindEvents)
   */
  constructor(element: HTMLElement, initFn: () => Promise<void> | void) {
    this.#element = element;
    this.#initFn = initFn;
    this.#originalContent = element.innerHTML;
  }

  /**
   * Run the init function with error boundary protection.
   * Call this in the island script instead of calling init() directly.
   */
  async run(): Promise<void> {
    try {
      await this.#initFn();
    } catch (error) {
      this.#handleError(error);
    }
  }

  /**
   * Attach global error handler to catch unhandled rejections
   * and runtime errors inside the tool.
   */
  attachGlobalHandler(): void {
    this.#element.addEventListener('error', (e) => {
      e.stopPropagation();
      this.#handleError(e.error || new Error('Unknown runtime error'));
    }, true);
  }

  #handleError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);

    console.error(`[ErrorBoundary] Tool error:`, error);

    // Show worker-specific message
    if (message.includes('Worker') || message.includes('worker')) {
      this.#element.innerHTML = ERROR_TEMPLATES.worker;
      return;
    }

    this.#element.innerHTML = ERROR_TEMPLATES.default(message);

    // Wire up retry button
    const retryBtn = this.#element.querySelector('.error-boundary-retry');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        if (this.#retries < this.#maxRetries) {
          this.#retries++;
          this.#element.innerHTML = this.#originalContent;
          this.run();
        } else {
          this.#element.innerHTML = `
            <div class="rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 p-6 my-4" role="alert">
              <p class="text-yellow-800 dark:text-yellow-200">
                Unable to load this tool after multiple attempts. Please refresh the page.
              </p>
            </div>`;
        }
      });
    }
  }
}
