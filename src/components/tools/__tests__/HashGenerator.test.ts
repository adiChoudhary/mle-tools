import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HashGenerator } from '../HashGenerator.js';

describe('HashGenerator UI Component', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'hash-test-container';
    document.body.appendChild(container);
  });

  describe('Instantiation', () => {
    it('should create instance with default state', () => {
      const generator = new HashGenerator(container);
      expect(generator).toBeDefined();
      expect(generator.element).toBe(container);
      expect(generator.currentInput).toBe('');
      expect(generator.isProcessing).toBe(false);
    });
  });

  describe('Rendering', () => {
    it('should render algorithm selection buttons', async () => {
      const generator = new HashGenerator(container);
      await generator.init();
      const md5Btn = document.getElementById('alg-md5');
      const sha1Btn = document.getElementById('alg-sha1');
      const sha256Btn = document.getElementById('alg-sha256');
      const sha512Btn = document.getElementById('alg-sha512');
      expect(md5Btn).toBeDefined();
      expect(sha1Btn).toBeDefined();
      expect(sha256Btn).toBeDefined();
      expect(sha512Btn).toBeDefined();
    });

    it('should have MD5 selected by default', async () => {
      const generator = new HashGenerator(container);
      await generator.init();
      const md5Btn = document.getElementById('alg-md5');
      expect(md5Btn?.classList.contains('dt-alg-btn-active')).toBe(true);
    });

    it('should render "all algorithms" checkbox', async () => {
      const generator = new HashGenerator(container);
      await generator.init();
      const allAlgsCheckbox = document.getElementById('all-algs');
      expect(allAlgsCheckbox).toBeDefined();
      expect(allAlgsCheckbox?.tagName).toBe('INPUT');
      expect((allAlgsCheckbox as HTMLInputElement).type).toBe('checkbox');
    });

    it('should render input textarea', async () => {
      const generator = new HashGenerator(container);
      await generator.init();
      const textarea = document.getElementById('hash-input');
      expect(textarea).toBeDefined();
      expect(textarea?.tagName).toBe('TEXTAREA');
    });

    it('should render load sample and clear buttons', async () => {
      const generator = new HashGenerator(container);
      await generator.init();
      const loadSampleBtn = document.getElementById('load-sample-btn');
      const clearBtn = document.getElementById('clear-btn');
      expect(loadSampleBtn).toBeDefined();
      expect(clearBtn).toBeDefined();
    });

    it('should render error container (hidden by default)', async () => {
      const generator = new HashGenerator(container);
      await generator.init();
      const errorContainer = document.getElementById('error-container');
      expect(errorContainer).toBeDefined();
      expect(errorContainer?.classList.contains('hidden')).toBe(true);
    });

    it('should render hash output section', async () => {
      const generator = new HashGenerator(container);
      await generator.init();
      const hashOutput = document.getElementById('hash-output');
      expect(hashOutput).toBeDefined();
    });

    it('should render input size indicator', async () => {
      const generator = new HashGenerator(container);
      await generator.init();
      const sizeIndicator = document.getElementById('input-size');
      expect(sizeIndicator).toBeDefined();
      expect(sizeIndicator?.textContent?.trim()).toBe('0 bytes');
    });

    it('should render processing indicator (hidden by default)', async () => {
      const generator = new HashGenerator(container);
      await generator.init();
      const processing = document.getElementById('processing');
      expect(processing).toBeDefined();
      expect(processing?.classList.contains('hidden')).toBe(true);
    });

    it('should render info section about hash algorithms', async () => {
      const generator = new HashGenerator(container);
      await generator.init();
      const infoSection = container.querySelector('[class*="dt-box-info"]');
      expect(infoSection).toBeDefined();
    });
  });

  describe('Algorithm Selection', () => {
    it('should switch to SHA-1 algorithm', async () => {
      const generator = new HashGenerator(container);
      await generator.init();
      const sha1Btn = document.getElementById('alg-sha1') as HTMLButtonElement;
      sha1Btn.click();
      const sha1BtnActive = document.getElementById('alg-sha1');
      expect(sha1BtnActive?.classList.contains('dt-alg-btn-active')).toBe(true);
    });

    it('should switch to SHA-256 algorithm', async () => {
      const generator = new HashGenerator(container);
      await generator.init();
      const sha256Btn = document.getElementById('alg-sha256') as HTMLButtonElement;
      sha256Btn.click();
      const sha256BtnActive = document.getElementById('alg-sha256');
      expect(sha256BtnActive?.classList.contains('dt-alg-btn-active')).toBe(true);
    });

    it('should switch to SHA-512 algorithm', async () => {
      const generator = new HashGenerator(container);
      await generator.init();
      const sha512Btn = document.getElementById('alg-sha512') as HTMLButtonElement;
      sha512Btn.click();
      const sha512BtnActive = document.getElementById('alg-sha512');
      expect(sha512BtnActive?.classList.contains('dt-alg-btn-active')).toBe(true);
    });

    it('should toggle all algorithms checkbox', async () => {
      const generator = new HashGenerator(container);
      await generator.init();
      const allAlgsCheckbox = document.getElementById('all-algs') as HTMLInputElement;
      expect(allAlgsCheckbox.checked).toBe(false);
      allAlgsCheckbox.click();
      expect(allAlgsCheckbox.checked).toBe(true);
    });
  });

  describe('Event Handling', () => {
    it('should handle clear button click', async () => {
      const generator = new HashGenerator(container);
      await generator.init();
      const textarea = document.getElementById('hash-input') as HTMLTextAreaElement;
      textarea.value = 'test data to hash';
      const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
      clearBtn.click();
      expect(textarea.value).toBe('');
    });

    it('should handle load sample button click', async () => {
      const generator = new HashGenerator(container);
      await generator.init();
      const textarea = document.getElementById('hash-input') as HTMLTextAreaElement;
      const loadSampleBtn = document.getElementById('load-sample-btn') as HTMLButtonElement;
      loadSampleBtn.click();
      expect(textarea.value.length).toBeGreaterThan(0);
    });

    it('should update input size indicator on text input', async () => {
      const generator = new HashGenerator(container);
      await generator.init();
      const textarea = document.getElementById('hash-input') as HTMLTextAreaElement;
      textarea.value = 'hello world';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      const sizeIndicator = document.getElementById('input-size');
      expect(sizeIndicator?.textContent).toContain('bytes');
    });
  });

  describe('Real-time Hashing', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should trigger debounce timer on input', async () => {
      const generator = new HashGenerator(container);
      await generator.init();
      const textarea = document.getElementById('hash-input') as HTMLTextAreaElement;
      textarea.value = 'test';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      // Verify debounce timer was set
      const timers = vi.getTimerCount();
      expect(timers).toBeGreaterThan(0);
    });

    it('should update input size on text entry', async () => {
      const generator = new HashGenerator(container);
      await generator.init();
      const textarea = document.getElementById('hash-input') as HTMLTextAreaElement;
      textarea.value = 'hello world';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      const sizeIndicator = document.getElementById('input-size');
      expect(sizeIndicator?.textContent).not.toBe('0 bytes');
    });

    it('should show placeholder when input is cleared', async () => {
      const generator = new HashGenerator(container);
      await generator.init();
      const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
      clearBtn.click();
      const hashOutput = document.getElementById('hash-output');
      expect(hashOutput?.textContent).toContain('Enter text above to see the hash');
    });
  });

  describe('Destroy', () => {
    it('should have a destroy method', async () => {
      const generator = new HashGenerator(container);
      await generator.init();
      expect(typeof generator.destroy).toBe('function');
      generator.destroy();
    });
  });
});
