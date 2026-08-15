import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock WorkerPool before importing Base64Encoder
vi.mock('../../../utils/worker-pool.js', () => ({
  WorkerPool: class {
    async init() { /* no-op */ }
    async execute() { return { result: 'mocked' }; }
    destroy() { /* no-op */ }
    terminate() { /* no-op */ }
  }
}));

import { Base64Encoder } from '../Base64Encoder.js';

describe('Base64Encoder UI Component', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'b64-test-container';
    document.body.appendChild(container);
    vi.clearAllMocks();
  });

  afterEach(() => {
    container.remove();
  });

  describe('Instantiation', () => {
    it('should create instance with default state', () => {
      const encoder = new Base64Encoder(container);
      expect(encoder).toBeDefined();
      expect(encoder.element).toBe(container);
      expect(encoder.currentInput).toBe('');
      expect(encoder.currentOutput).toBe('');
      expect(encoder.isProcessing).toBe(false);
      expect(encoder.mode).toBe('encode');
      expect(encoder.variant).toBe('standard');
    });
  });

  describe('Rendering', () => {
    it('should render input textarea', async () => {
      const encoder = new Base64Encoder(container);
      await encoder.init();
      const textarea = document.getElementById('b64-input');
      expect(textarea).toBeDefined();
      expect(textarea?.tagName).toBe('TEXTAREA');
    });

    it('should render mode selector buttons', async () => {
      const encoder = new Base64Encoder(container);
      await encoder.init();
      const encodeBtn = document.getElementById('mode-encode');
      const decodeBtn = document.getElementById('mode-decode');
      expect(encodeBtn).toBeDefined();
      expect(decodeBtn).toBeDefined();
    });

    it('should render variant selector buttons', async () => {
      const encoder = new Base64Encoder(container);
      await encoder.init();
      const standardBtn = document.getElementById('variant-standard');
      const urlsafeBtn = document.getElementById('variant-urlsafe');
      expect(standardBtn).toBeDefined();
      expect(urlsafeBtn).toBeDefined();
    });

    it('should render convert button', async () => {
      const encoder = new Base64Encoder(container);
      await encoder.init();
      const button = document.getElementById('convert-btn');
      expect(button).toBeDefined();
      expect(button?.textContent?.trim()).toBe('Encode');
    });

    it('should render load sample and clear buttons', async () => {
      const encoder = new Base64Encoder(container);
      await encoder.init();
      const loadSampleBtn = document.getElementById('load-sample-btn');
      const clearBtn = document.getElementById('clear-btn');
      expect(loadSampleBtn).toBeDefined();
      expect(clearBtn).toBeDefined();
    });

    it('should render error container (hidden by default)', async () => {
      const encoder = new Base64Encoder(container);
      await encoder.init();
      const errorContainer = document.getElementById('error-container');
      expect(errorContainer).toBeDefined();
      expect(errorContainer?.classList.contains('hidden')).toBe(true);
    });

    it('should render output section', async () => {
      const encoder = new Base64Encoder(container);
      await encoder.init();
      const outputContainer = document.getElementById('b64-output');
      expect(outputContainer).toBeDefined();
    });

    it('should render input size indicator', async () => {
      const encoder = new Base64Encoder(container);
      await encoder.init();
      const sizeIndicator = document.getElementById('input-size');
      expect(sizeIndicator).toBeDefined();
      expect(sizeIndicator?.textContent?.trim()).toBe('0 bytes');
    });
  });

  describe('Event Handling', () => {
    it('should handle clear button click', async () => {
      const encoder = new Base64Encoder(container);
      await encoder.init();
      const textarea = document.getElementById('b64-input') as HTMLTextAreaElement;
      textarea.value = 'test data';
      const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
      clearBtn.click();
      expect(textarea.value).toBe('');
    });

    it('should handle load sample button click', async () => {
      const encoder = new Base64Encoder(container);
      await encoder.init();
      const textarea = document.getElementById('b64-input') as HTMLTextAreaElement;
      const loadSampleBtn = document.getElementById('load-sample-btn') as HTMLButtonElement;
      loadSampleBtn.click();
      expect(textarea.value.length).toBeGreaterThan(0);
    });

    it('should update input size indicator on text input', async () => {
      const encoder = new Base64Encoder(container);
      await encoder.init();
      const textarea = document.getElementById('b64-input') as HTMLTextAreaElement;
      textarea.value = 'hello';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      const sizeIndicator = document.getElementById('input-size');
      expect(sizeIndicator?.textContent).toContain('bytes');
    });
  });

  describe('Destroy', () => {
    it('should have a destroy method', async () => {
      const encoder = new Base64Encoder(container);
      await encoder.init();
      expect(typeof encoder.destroy).toBe('function');
      encoder.destroy();
    });
  });
});
