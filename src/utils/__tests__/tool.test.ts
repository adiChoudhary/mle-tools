import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BaseTool, ToolState } from '../tool';
import { WorkerOperation } from '../worker-interface';

/**
 * Concrete test implementation of BaseTool
 */
class TestTool extends BaseTool {
  private _events: string[] = [];
  private _renderCalls: Array<string | ArrayBuffer> = [];

  constructor(config: { rootElement: HTMLElement }) {
    super(config);
  }

  protected bindEvents(): void {
    this._events.push('bindEvents');
  }

  protected renderOutput(data: string | ArrayBuffer): void {
    this._renderCalls.push(data);
  }

  /** Expose internals for testing */
  getEvents(): string[] {
    return this._events;
  }

  getRenderCalls(): Array<string | ArrayBuffer> {
    return this._renderCalls;
  }
}

describe('BaseTool', () => {
  let rootElement: HTMLElement;

  beforeEach(() => {
    rootElement = document.createElement('div');
    rootElement.id = 'test-tool-root';
    document.body.appendChild(rootElement);
  });

  afterEach(() => {
    document.body.removeChild(rootElement);
  });

  describe('Construction', () => {
    it('should initialize with idle state', () => {
      const tool = new TestTool({ rootElement });
      expect(tool.getState()).toBe(ToolState.IDLE);
    });

    it('should set the root element', () => {
      const tool = new TestTool({ rootElement });
      expect(tool.rootElement).toBe(rootElement);
    });
  });

  describe('Lifecycle', () => {
    it('should bind events on init', () => {
      const tool = new TestTool({ rootElement });
      tool.init();
      expect(tool.getEvents()).toContain('bindEvents');
    });

    it('should clean up on dispose', () => {
      const tool = new TestTool({ rootElement });
      tool.setState(ToolState.PROCESSING);
      tool.dispose();
      expect(tool.getState()).toBe(ToolState.IDLE);
    });

    it('should call onMount and onDispose hooks', () => {
      const tool = new TestTool({ rootElement });
      // onMount is no-op by default, should not throw
      expect(() => tool.onMount()).not.toThrow();
      expect(() => tool.onDispose()).not.toThrow();
    });
  });

  describe('State Management', () => {
    it('should update state', () => {
      const tool = new TestTool({ rootElement });
      tool.setState(ToolState.PROCESSING);
      expect(tool.getState()).toBe(ToolState.PROCESSING);
    });

    it('should dispatch state-change event on state transition', () => {
      const tool = new TestTool({ rootElement });
      const handler = vi.fn();
      rootElement.addEventListener('tool-state-change', handler);

      tool.setState(ToolState.PROCESSING);

      expect(handler).toHaveBeenCalled();
      const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
      expect(detail).toEqual({
        previous: ToolState.IDLE,
        current: ToolState.PROCESSING
      });
    });

    it('should not dispatch event when state does not change', () => {
      const tool = new TestTool({ rootElement });
      const handler = vi.fn();
      rootElement.addEventListener('tool-state-change', handler);

      tool.setState(ToolState.IDLE);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Memory Checking', () => {
    it('should not throw for small data', () => {
      const tool = new TestTool({ rootElement });
      expect(() => tool.checkMemory('small data')).not.toThrow();
    });

    it('should throw for data exceeding memory limit', () => {
      const tool = new TestTool({ rootElement });
      const largeData = 'x'.repeat(51 * 1024 * 1024 / 2); // > 50MB (strings are 2 bytes/char)

      expect(() => tool.checkMemory(largeData)).toThrow();
    });
  });

  describe('Memory Usage', () => {
    it('should estimate string memory', () => {
      const tool = new TestTool({ rootElement });
      expect(tool.getMemoryUsage('hello')).toBe(10); // 5 chars * 2 bytes
    });

    it('should estimate ArrayBuffer memory', () => {
      const tool = new TestTool({ rootElement });
      const buffer = new ArrayBuffer(1024);
      expect(tool.getMemoryUsage(buffer)).toBe(1024);
    });
  });

  describe('processData', () => {
    it('should process small data synchronously', async () => {
      const tool = new TestTool({ rootElement });

      const result = await tool.processData(
        'test',
        WorkerOperation.JSON_STRINGIFY,
        (data) => `sync: ${data}`
      );

      expect(result).toBe('sync: test');
    });

    it('should set state to PROCESSING during operation', async () => {
      const tool = new TestTool({ rootElement });

      tool.processData(
        'test',
        WorkerOperation.JSON_STRINGIFY,
        (data) => `sync: ${data}`
      );

      expect(tool.getState()).toBe(ToolState.PROCESSING);
    });

    it('should throw and set ERROR state on memory limit', async () => {
      const tool = new TestTool({ rootElement });
      const largeData = 'x'.repeat(51 * 1024 * 1024 / 2);

      await expect(
        tool.processData(
          largeData,
          WorkerOperation.JSON_STRINGIFY,
          () => 'result'
        )
      ).rejects.toThrow();

      expect(tool.getState()).toBe(ToolState.ERROR);
    });

    it('should render error on failure', async () => {
      const tool = new TestTool({ rootElement });
      const renderErrorSpy = vi.spyOn(tool, 'renderError');

      const largeData = 'x'.repeat(51 * 1024 * 1024 / 2);

      await tool.processData(
        largeData,
        WorkerOperation.JSON_STRINGIFY,
        () => 'result'
      ).catch(() => {});

      expect(renderErrorSpy).toHaveBeenCalled();
    });
  });
});
