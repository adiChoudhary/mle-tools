import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorBoundary } from '../error-boundary';

describe('ErrorBoundary', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-tool';
    container.innerHTML = '<p>Original content</p>';
    document.body.appendChild(container);
  });

  describe('successful init', () => {
    it('should run init function without errors', async () => {
      const initFn = vi.fn().mockResolvedValue(undefined);
      const boundary = new ErrorBoundary(container, initFn);
      await boundary.run();
      expect(initFn).toHaveBeenCalledTimes(1);
      expect(container.innerHTML).toContain('Original content');
    });
  });

  describe('error handling', () => {
    it('should display error message when init fails', async () => {
      const initFn = vi.fn().mockRejectedValue(new Error('Test error message'));
      const boundary = new ErrorBoundary(container, initFn);
      const errorLogSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await boundary.run();
      expect(container.innerHTML).toContain('Something went wrong');
      expect(container.innerHTML).toContain('Test error message');
      expect(container.innerHTML).toContain('Try again');
      expect(errorLogSpy).toHaveBeenCalled();
      errorLogSpy.mockRestore();
    });

    it('should display worker-specific message for worker errors', async () => {
      const initFn = vi.fn().mockRejectedValue(new Error('Worker failed to start'));
      const boundary = new ErrorBoundary(container, initFn);
      const errorLogSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await boundary.run();
      expect(container.innerHTML).toContain('Web Worker unavailable');
      expect(errorLogSpy).toHaveBeenCalled();
      errorLogSpy.mockRestore();
    });

    it('should handle non-Error thrown values', async () => {
      const initFn = vi.fn().mockRejectedValue('String error');
      const boundary = new ErrorBoundary(container, initFn);
      const errorLogSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await boundary.run();
      expect(container.innerHTML).toContain('Something went wrong');
      expect(errorLogSpy).toHaveBeenCalled();
      errorLogSpy.mockRestore();
    });
  });

  describe('retry mechanism', () => {
    it('should allow retry up to maxRetries times', async () => {
      let callCount = 0;
      const initFn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail again'))
        .mockResolvedValue(undefined);

      const boundary = new ErrorBoundary(container, initFn);
      const errorLogSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // First run fails
      await boundary.run();
      expect(container.innerHTML).toContain('Something went wrong');

      // First retry fails again
      container.innerHTML = '<p>Original content</p>';
      await boundary.run();
      expect(container.innerHTML).toContain('Something went wrong');

      // Second retry succeeds
      container.innerHTML = '<p>Original content</p>';
      await boundary.run();
      expect(initFn).toHaveBeenCalledTimes(3);
      errorLogSpy.mockRestore();
    });
  });

  describe('HTML escaping', () => {
    it('should escape HTML in error messages to prevent XSS', async () => {
      const initFn = vi.fn().mockRejectedValue(new Error('<script>alert("xss")</script>'));
      const boundary = new ErrorBoundary(container, initFn);
      const errorLogSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await boundary.run();
      expect(container.innerHTML).not.toContain('<script>alert');
      expect(container.innerHTML).toContain('&lt;script&gt;');
      errorLogSpy.mockRestore();
    });
  });
});
