import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { whenVisible, hydrateOnVisible } from '../visibility';

// Track the last created observer instance for triggering
let lastObserver: MockIntersectionObserver | null = null;

class MockIntersectionObserver implements IntersectionObserver {
  private callback: IntersectionObserverCallback;
  public observedTargets: Element[] = [];

  constructor(callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {
    this.callback = callback;
    lastObserver = this;
  }

  observe(target: Element): void {
    this.observedTargets.push(target);
  }

  unobserve(_target: Element): void {
    this.observedTargets = [];
  }

  disconnect(): void {
    this.observedTargets = [];
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  triggerIntersecting(isIntersecting = true): void {
    const entries: IntersectionObserverEntry[] = this.observedTargets.map(
      (target) =>
        ({
          target,
          isIntersecting,
          intersectionRatio: isIntersecting ? 1 : 0,
          boundingClientRect: target.getBoundingClientRect(),
          rootBounds: new DOMRect(),
          intersectionRect: new DOMRect()
        } as IntersectionObserverEntry)
    );
    this.callback(entries, this);
  }

  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds = [];
}

describe('Visibility Utilities', () => {
  let element: HTMLElement;
  let originalIntersectionObserver: typeof IntersectionObserver;

  beforeEach(() => {
    element = document.createElement('div');
    element.id = 'test-element';
    document.body.appendChild(element);

    originalIntersectionObserver = window.IntersectionObserver;
    lastObserver = null;
  });

  afterEach(() => {
    document.body.removeChild(element);
    window.IntersectionObserver = originalIntersectionObserver;
  });

  describe('whenVisible', () => {
    it('should call onVisible when element becomes visible', () => {
      window.IntersectionObserver = MockIntersectionObserver as any;

      const onVisible = vi.fn();
      whenVisible(element, onVisible);

      expect(lastObserver).not.toBeNull();
      expect(lastObserver!.observedTargets).toContain(element);

      lastObserver!.triggerIntersecting(true);
      expect(onVisible).toHaveBeenCalledTimes(1);
    });

    it('should create IntersectionObserver with default options', () => {
      let capturedOptions: IntersectionObserverInit | undefined;
      class CapturingObserver extends MockIntersectionObserver {
        constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
          super(callback, options);
          capturedOptions = options;
        }
      }
      window.IntersectionObserver = CapturingObserver as any;

      whenVisible(element, vi.fn());

      expect(capturedOptions).toBeDefined();
      expect(capturedOptions!.threshold).toBe(0.1);
    });

    it('should accept custom options', () => {
      let capturedOptions: IntersectionObserverInit | undefined;
      class CapturingObserver extends MockIntersectionObserver {
        constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
          super(callback, options);
          capturedOptions = options;
        }
      }
      window.IntersectionObserver = CapturingObserver as any;

      whenVisible(element, vi.fn(), {
        threshold: 0.5,
        rootMargin: '100px',
        once: false
      });

      expect(capturedOptions!.threshold).toBe(0.5);
      expect(capturedOptions!.rootMargin).toBe('100px');
    });

    it('should return a cleanup function that disconnects observer', () => {
      window.IntersectionObserver = MockIntersectionObserver as any;

      const onVisible = vi.fn();
      const cleanup = whenVisible(element, onVisible);

      expect(lastObserver!.observedTargets).toContain(element);

      cleanup();
      // After cleanup, disconnect clears observed targets
      expect(lastObserver!.observedTargets).toEqual([]);

      // Triggering after cleanup should not call onVisible
      lastObserver!.triggerIntersecting(true);
      expect(onVisible).not.toHaveBeenCalled();
    });

    it('should hydrate immediately when IntersectionObserver is unavailable', () => {
      window.IntersectionObserver = undefined as any;

      const onVisible = vi.fn();
      whenVisible(element, onVisible);

      expect(onVisible).toHaveBeenCalledTimes(1);
    });

    it('should not call onVisible when element is not intersecting', () => {
      window.IntersectionObserver = MockIntersectionObserver as any;

      const onVisible = vi.fn();
      whenVisible(element, onVisible);

      lastObserver!.triggerIntersecting(false);
      expect(onVisible).not.toHaveBeenCalled();
    });
  });

  describe('hydrateOnVisible', () => {
    it('should call init when element becomes visible', () => {
      window.IntersectionObserver = MockIntersectionObserver as any;

      const tool = {
        init: vi.fn(),
        dispose: vi.fn()
      };

      hydrateOnVisible(element, tool);
      lastObserver!.triggerIntersecting(true);

      expect(tool.init).toHaveBeenCalledTimes(1);
    });

    it('should not call init multiple times', () => {
      window.IntersectionObserver = MockIntersectionObserver as any;

      const tool = {
        init: vi.fn(),
        dispose: vi.fn()
      };

      hydrateOnVisible(element, tool);

      lastObserver!.triggerIntersecting(true);
      lastObserver!.triggerIntersecting(true);
      lastObserver!.triggerIntersecting(true);

      expect(tool.init).toHaveBeenCalledTimes(1);
    });

    it('should call dispose on cleanup when tool was initialized', () => {
      window.IntersectionObserver = MockIntersectionObserver as any;

      const tool = {
        init: vi.fn(),
        dispose: vi.fn()
      };

      const cleanup = hydrateOnVisible(element, tool);
      lastObserver!.triggerIntersecting(true);

      expect(tool.dispose).not.toHaveBeenCalled();
      cleanup();
      expect(tool.dispose).toHaveBeenCalledTimes(1);
    });

    it('should not call dispose if tool was never initialized', () => {
      window.IntersectionObserver = MockIntersectionObserver as any;

      const tool = {
        init: vi.fn(),
        dispose: vi.fn()
      };

      const cleanup = hydrateOnVisible(element, tool);
      // Don't trigger intersection
      cleanup();

      expect(tool.init).not.toHaveBeenCalled();
      expect(tool.dispose).not.toHaveBeenCalled();
    });

    it('should hydrate immediately when IntersectionObserver is unavailable', () => {
      window.IntersectionObserver = undefined as any;

      const tool = {
        init: vi.fn(),
        dispose: vi.fn()
      };

      hydrateOnVisible(element, tool);

      expect(tool.init).toHaveBeenCalledTimes(1);
    });
  });
});
