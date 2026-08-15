import { describe, it, expect, beforeEach } from 'vitest';
import { JwtDecoder } from '../JwtDecoder.js';

describe('JwtDecoder UI Component', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'jwt-test-container';
    document.body.appendChild(container);
  });

  describe('Instantiation', () => {
    it('should create instance with default state', () => {
      const decoder = new JwtDecoder(container);
      expect(decoder).toBeDefined();
      expect(decoder.element).toBe(container);
      expect(decoder.currentInput).toBe('');
      expect(decoder.currentOutput).toBe('');
      expect(decoder.isProcessing).toBe(false);
      expect(decoder.decodedJWT).toBe(null);
      expect(decoder.validationResult).toBe(null);
      expect(decoder.signatureVerified).toBe(null);
    });
  });

  describe('Rendering', () => {
    it('should render input textarea', async () => {
      const decoder = new JwtDecoder(container);
      await decoder.init();
      const textarea = document.getElementById('jwt-input');
      expect(textarea).toBeDefined();
      expect(textarea?.tagName).toBe('TEXTAREA');
    });

    it('should render decode button', async () => {
      const decoder = new JwtDecoder(container);
      await decoder.init();
      const button = document.getElementById('decode-btn');
      expect(button).toBeDefined();
      expect(button?.textContent?.trim()).toBe('Decode JWT');
    });

    it('should render load sample and clear buttons', async () => {
      const decoder = new JwtDecoder(container);
      await decoder.init();
      const loadSampleBtn = document.getElementById('load-sample-btn');
      const clearBtn = document.getElementById('clear-btn');
      expect(loadSampleBtn).toBeDefined();
      expect(clearBtn).toBeDefined();
    });

    it('should render error container (hidden by default)', async () => {
      const decoder = new JwtDecoder(container);
      await decoder.init();
      const errorContainer = document.getElementById('error-container');
      expect(errorContainer).toBeDefined();
      expect(errorContainer?.classList.contains('hidden')).toBe(true);
    });

    it('should render decoded output container (hidden by default)', async () => {
      const decoder = new JwtDecoder(container);
      await decoder.init();
      const decodedOutput = document.getElementById('decoded-output');
      expect(decodedOutput).toBeDefined();
      expect(decodedOutput?.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Event Handling', () => {
    it('should handle clear button click', async () => {
      const decoder = new JwtDecoder(container);
      await decoder.init();
      const textarea = document.getElementById('jwt-input') as HTMLTextAreaElement;
      textarea.value = 'test jwt token';
      const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
      clearBtn.click();
      expect(textarea.value).toBe('');
    });

    it('should handle load sample button click', async () => {
      const decoder = new JwtDecoder(container);
      await decoder.init();
      const textarea = document.getElementById('jwt-input') as HTMLTextAreaElement;
      const loadSampleBtn = document.getElementById('load-sample-btn') as HTMLButtonElement;
      loadSampleBtn.click();
      expect(textarea.value.length).toBeGreaterThan(0);
      // Sample JWT should have 3 parts separated by dots
      const parts = textarea.value.split('.');
      expect(parts.length).toBe(3);
    });
  });

  describe('Destroy', () => {
    it('should have a destroy method', async () => {
      const decoder = new JwtDecoder(container);
      await decoder.init();
      expect(typeof decoder.destroy).toBe('function');
      decoder.destroy();
    });
  });
});
