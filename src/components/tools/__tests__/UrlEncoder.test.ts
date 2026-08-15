import { describe, it, expect, beforeEach } from 'vitest';
import { UrlEncoder } from '../UrlEncoder.js';

describe('UrlEncoder UI Component', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'url-test-container';
    document.body.appendChild(container);
  });

  describe('Instantiation', () => {
    it('should create instance with default state', () => {
      const encoder = new UrlEncoder(container);
      expect(encoder).toBeDefined();
      expect(encoder.element).toBe(container);
      expect(encoder.currentInput).toBe('');
      expect(encoder.currentOutput).toBe('');
      expect(encoder.isProcessing).toBe(false);
      expect(encoder.mode).toBe('encode');
    });
  });

  describe('Rendering', () => {
    it('should render tab selector buttons', async () => {
      const encoder = new UrlEncoder(container);
      await encoder.init();
      const encoderTab = document.getElementById('tab-encoder');
      const queryTab = document.getElementById('tab-query');
      const objectIdTab = document.getElementById('tab-objectid');
      expect(encoderTab).toBeDefined();
      expect(queryTab).toBeDefined();
      expect(objectIdTab).toBeDefined();
    });

    it('should render mode selector buttons', async () => {
      const encoder = new UrlEncoder(container);
      await encoder.init();
      const encodeBtn = document.getElementById('mode-encode');
      const decodeBtn = document.getElementById('mode-decode');
      expect(encodeBtn).toBeDefined();
      expect(decodeBtn).toBeDefined();
    });

    it('should render input textarea', async () => {
      const encoder = new UrlEncoder(container);
      await encoder.init();
      const textarea = document.getElementById('url-input');
      expect(textarea).toBeDefined();
      expect(textarea?.tagName).toBe('TEXTAREA');
    });

    it('should render convert button', async () => {
      const encoder = new UrlEncoder(container);
      await encoder.init();
      const button = document.getElementById('convert-btn');
      expect(button).toBeDefined();
      expect(button?.textContent?.trim()).toBe('Encode');
    });

    it('should render load sample and clear buttons', async () => {
      const encoder = new UrlEncoder(container);
      await encoder.init();
      const loadSampleBtn = document.getElementById('load-sample-btn');
      const clearBtn = document.getElementById('clear-btn');
      expect(loadSampleBtn).toBeDefined();
      expect(clearBtn).toBeDefined();
    });

    it('should render error container (hidden by default)', async () => {
      const encoder = new UrlEncoder(container);
      await encoder.init();
      const errorContainer = document.getElementById('error-container');
      expect(errorContainer).toBeDefined();
      expect(errorContainer?.classList.contains('hidden')).toBe(true);
    });

    it('should render output section', async () => {
      const encoder = new UrlEncoder(container);
      await encoder.init();
      const output = document.getElementById('url-output');
      expect(output).toBeDefined();
    });

    it('should render copy button', async () => {
      const encoder = new UrlEncoder(container);
      await encoder.init();
      const copyBtn = document.getElementById('copy-btn');
      expect(copyBtn).toBeDefined();
    });

    it('should render output size indicator', async () => {
      const encoder = new UrlEncoder(container);
      await encoder.init();
      const sizeIndicator = document.getElementById('output-size');
      expect(sizeIndicator).toBeDefined();
      expect(sizeIndicator?.textContent?.trim()).toBe('0 bytes');
    });

    it('should render query params panel (hidden by default)', async () => {
      const encoder = new UrlEncoder(container);
      await encoder.init();
      const queryPanel = document.getElementById('panel-query');
      expect(queryPanel).toBeDefined();
      expect(queryPanel?.classList.contains('hidden')).toBe(true);
    });

    it('should render ObjectId panel (hidden by default)', async () => {
      const encoder = new UrlEncoder(container);
      await encoder.init();
      const objectIdPanel = document.getElementById('panel-objectid');
      expect(objectIdPanel).toBeDefined();
      expect(objectIdPanel?.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Tab Switching', () => {
    it('should switch to query params tab', async () => {
      const encoder = new UrlEncoder(container);
      await encoder.init();
      const queryTab = document.getElementById('tab-query') as HTMLButtonElement;
      queryTab.click();
      const encoderPanel = document.getElementById('panel-encoder');
      const queryPanel = document.getElementById('panel-query');
      expect(encoderPanel?.classList.contains('hidden')).toBe(true);
      expect(queryPanel?.classList.contains('hidden')).toBe(false);
    });

    it('should switch to ObjectId tab', async () => {
      const encoder = new UrlEncoder(container);
      await encoder.init();
      const objectIdTab = document.getElementById('tab-objectid') as HTMLButtonElement;
      objectIdTab.click();
      const encoderPanel = document.getElementById('panel-encoder');
      const objectIdPanel = document.getElementById('panel-objectid');
      expect(encoderPanel?.classList.contains('hidden')).toBe(true);
      expect(objectIdPanel?.classList.contains('hidden')).toBe(false);
    });

    it('should switch back to encoder tab', async () => {
      const encoder = new UrlEncoder(container);
      await encoder.init();
      const queryTab = document.getElementById('tab-query') as HTMLButtonElement;
      const encoderTab = document.getElementById('tab-encoder') as HTMLButtonElement;
      queryTab.click();
      encoderTab.click();
      const encoderPanel = document.getElementById('panel-encoder');
      expect(encoderPanel?.classList.contains('hidden')).toBe(false);
    });
  });

  describe('Event Handling', () => {
    it('should handle clear button click', async () => {
      const encoder = new UrlEncoder(container);
      await encoder.init();
      const textarea = document.getElementById('url-input') as HTMLTextAreaElement;
      textarea.value = 'https://example.com/test';
      const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
      clearBtn.click();
      expect(textarea.value).toBe('');
    });

    it('should handle load sample button click', async () => {
      const encoder = new UrlEncoder(container);
      await encoder.init();
      const textarea = document.getElementById('url-input') as HTMLTextAreaElement;
      const loadSampleBtn = document.getElementById('load-sample-btn') as HTMLButtonElement;
      loadSampleBtn.click();
      expect(textarea.value.length).toBeGreaterThan(0);
    });
  });

  describe('Mode Switching', () => {
    it('should switch to decode mode', async () => {
      const encoder = new UrlEncoder(container);
      await encoder.init();
      const decodeBtn = document.getElementById('mode-decode') as HTMLButtonElement;
      decodeBtn.click();
      const convertBtn = document.getElementById('convert-btn');
      expect(convertBtn?.textContent?.trim()).toBe('Decode');
    });

    it('should switch back to encode mode', async () => {
      const encoder = new UrlEncoder(container);
      await encoder.init();
      const decodeBtn = document.getElementById('mode-decode') as HTMLButtonElement;
      const encodeBtn = document.getElementById('mode-encode') as HTMLButtonElement;
      decodeBtn.click();
      encodeBtn.click();
      const convertBtn = document.getElementById('convert-btn');
      expect(convertBtn?.textContent?.trim()).toBe('Encode');
    });
  });

  describe('Destroy', () => {
    it('should have a destroy method', async () => {
      const encoder = new UrlEncoder(container);
      await encoder.init();
      expect(typeof encoder.destroy).toBe('function');
      encoder.destroy();
    });
  });
});
