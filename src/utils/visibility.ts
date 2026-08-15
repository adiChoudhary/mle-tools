/**
 * Progressive enhancement: hydrate tools only when they become visible
 * in the viewport using IntersectionObserver.
 */

/**
 * Options for the visibility observer.
 */
export interface VisibilityObserverOptions {
  /**
   * Threshold at which the callback fires (0-1).
   * Default: 0.1 (10% of the element is visible).
   */
  threshold?: number;

  /**
   * Root margin to expand/contract the viewport.
   * Default: '200px' (hydrate 200px before the element enters the viewport).
   */
  rootMargin?: string;

  /**
   * Whether to unobserve after the first intersection.
   * Default: true (one-time hydration).
   */
  once?: boolean;
}

/**
 * Observe an element and call a callback when it becomes visible.
 * Returns a cleanup function.
 */
export function whenVisible(
  element: HTMLElement,
  onVisible: () => void,
  options: VisibilityObserverOptions = {}
): () => void {
  const {
    threshold = 0.1,
    rootMargin = '200px',
    once = true
  } = options;

  if (!IntersectionObserver) {
    // Fallback: hydrate immediately if IntersectionObserver is not available
    onVisible();
    return () => {};
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          onVisible();
          if (once) {
            observer.unobserve(entry.target);
          }
        }
      }
    },
    { threshold, rootMargin }
  );

  observer.observe(element);

  return () => {
    observer.disconnect();
  };
}

/**
 * Defer initialization of a tool until its container element is visible.
 * Returns a disposal function that cleans up the observer and calls tool.dispose().
 */
export function hydrateOnVisible(
  element: HTMLElement,
  tool: { init(): void; dispose(): void },
  options?: VisibilityObserverOptions
): () => void {
  let initialized = false;

  const cleanup = whenVisible(element, () => {
    if (!initialized) {
      initialized = true;
      tool.init();
    }
  }, options);

  return () => {
    cleanup();
    if (initialized) {
      tool.dispose();
    }
  };
}
