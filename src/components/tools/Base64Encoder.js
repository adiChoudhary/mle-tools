/**
 * Base64 Encoder/Decoder Tool Island
 * Handles bidirectional Base64 encoding for text and files
 */

import { WorkerOperation } from "../../utils/worker-interface.ts";
import { WorkerPool, withTimeout } from "../../utils/worker-pool.ts";
import { checkMemoryLimit } from "../../utils/memory.ts";
import { escapeHtml } from "../../utils/escape-html.ts";
import { icon } from "../../utils/icons.ts";
import DataProcessorWorkerUrl from "../../workers/data-processor.ts?worker&url";

// Threshold above which Base64 work is offloaded to the worker pool
const WORKER_THRESHOLD_BYTES = 10 * 1024 * 1024;

/**
 * Base64-encode UTF-8 text (chunked — spreading multi-MB byte arrays into
 * String.fromCharCode overflows the call stack).
 */
function base64FromUtf8(text) {
  const bytes = new TextEncoder().encode(text);
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
  }
  return btoa(binary);
}

/**
 * Base64-decode a string back to UTF-8 text
 */
function utf8FromBase64(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export class Base64Encoder {
  constructor(element) {
    this.element = element;
    this.workerPool = new WorkerPool(DataProcessorWorkerUrl);
    this.currentInput = '';
    this.currentOutput = '';
    this.isProcessing = false;
    this.mode = 'encode';
    this.variant = 'standard';
  }

  async init() {
    this.render();
    this.bindEvents();
    await this.workerPool.init();
  }

  render() {
    this.element.innerHTML = `
      <div class="space-y-6">
        <!-- Mode Selector -->
        <div class="dt-panel p-4">
          <div class="flex flex-wrap items-center gap-x-8 gap-y-4">
            <div class="flex items-center gap-3">
              <span class="dt-label">Mode:</span>
              <div class="dt-seg">
                <button id="mode-encode" class="dt-seg-btn dt-seg-btn-active" data-mode="encode">Encode</button>
                <button id="mode-decode" class="dt-seg-btn" data-mode="decode">Decode</button>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="dt-label">Variant:</span>
              <div class="dt-seg">
                <button id="variant-standard" class="dt-seg-btn dt-seg-btn-active" data-variant="standard">Standard</button>
                <button id="variant-urlsafe" class="dt-seg-btn" data-variant="urlsafe">URL-safe</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Input Section -->
        <div class="space-y-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <label for="b64-input" class="dt-label" id="input-label">Text Input</label>
            <div class="flex items-center gap-2">
              <span id="input-size" class="dt-meta">0 bytes</span>
              <button id="load-sample-btn" type="button" class="dt-btn dt-btn-soft dt-btn-sm">Load Sample</button>
              <button id="clear-btn" type="button" class="dt-btn dt-btn-sm">Clear</button>
            </div>
          </div>
          <textarea id="b64-input" class="dt-field h-48" placeholder="Enter text to encode..." spellcheck="false"></textarea>
        </div>

        <!-- Convert Buttons -->
        <div class="flex items-center gap-3">
          <button id="convert-btn" type="button" class="dt-btn dt-btn-primary">Encode</button>
          <div id="processing" class="dt-accent hidden flex items-center gap-2 text-[13px]">
            <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Processing...</span>
          </div>
        </div>

        <!-- Error Display -->
        <div id="error-container" class="dt-box dt-box-error hidden">
          <span class="text-red-500 dark:text-red-400">${icon('alert-circle', 18)}</span>
          <div>
            <h3 class="text-sm font-medium text-red-700 dark:text-red-300">Error</h3>
            <p id="error-message" class="mt-0.5 text-[13px] text-red-600 dark:text-red-400"></p>
          </div>
        </div>

        <!-- Output Section -->
        <div class="space-y-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <label for="b64-output" class="dt-label" id="output-label">Base64 Output</label>
            <div class="flex items-center gap-2">
              <span id="output-size" class="dt-meta">0 bytes</span>
              <button id="copy-btn" type="button" class="dt-btn dt-btn-sm">Copy</button>
              <button id="download-btn" type="button" class="dt-btn dt-btn-sm">Download</button>
            </div>
          </div>
          <div id="b64-output" class="dt-field min-h-48 max-h-72 overflow-auto whitespace-pre-wrap break-all">
            <div class="dt-empty">Output will appear here...</div>
          </div>
        </div>
      </div>
    `;

    // DOM refs
    this.inputTextarea = this.element.querySelector('#b64-input');
    this.outputContainer = this.element.querySelector('#b64-output');
    this.errorContainer = this.element.querySelector('#error-container');
    this.errorMessage = this.element.querySelector('#error-message');
    this.inputSizeDisplay = this.element.querySelector('#input-size');
    this.outputSizeDisplay = this.element.querySelector('#output-size');
    this.inputLabel = this.element.querySelector('#input-label');
    this.outputLabel = this.element.querySelector('#output-label');
    this.convertBtn = this.element.querySelector('#convert-btn');
    this.processingIndicator = this.element.querySelector('#processing');
    this.clearBtn = this.element.querySelector('#clear-btn');
    this.copyBtn = this.element.querySelector('#copy-btn');
    this.downloadBtn = this.element.querySelector('#download-btn');
    this.loadSampleBtn = this.element.querySelector('#load-sample-btn');
    this.modeButtons = this.element.querySelectorAll('[data-mode]');
    this.variantButtons = this.element.querySelectorAll('[data-variant]');
  }

  bindEvents() {
    // Mode toggle
    this.modeButtons.forEach(btn => {
      btn.addEventListener('click', () => this.setMode(btn.dataset.mode));
    });

    // Variant toggle
    this.variantButtons.forEach(btn => {
      btn.addEventListener('click', () => this.setVariant(btn.dataset.variant));
    });

    // Input change
    this.inputTextarea.addEventListener('input', () => {
      const input = this.inputTextarea.value;
      this.currentInput = input;
      this.inputSizeDisplay.textContent = this.formatBytes(new Blob([input]).size);
      this.convertBtn.disabled = !checkMemoryLimit(input);
    });

    // Convert
    this.convertBtn.addEventListener('click', () => this.convert());

    // Keyboard shortcut
    this.inputTextarea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.convert();
      }
    });

    // Utility buttons
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.loadSampleBtn.addEventListener('click', () => this.loadSample());
  }

  setMode(mode) {
    this.mode = mode;
    const isEncode = mode === 'encode';

    this.modeButtons.forEach(btn => {
      const active = btn.dataset.mode === mode;
      btn.className = active ? 'dt-seg-btn dt-seg-btn-active' : 'dt-seg-btn';
    });

    this.inputLabel.textContent = isEncode ? 'Text Input' : 'Base64 Input';
    this.outputLabel.textContent = isEncode ? 'Base64 Output' : 'Decoded Output';
    this.inputTextarea.placeholder = isEncode ? 'Enter text to encode...' : 'Enter Base64 string to decode...';
    this.convertBtn.textContent = isEncode ? 'Encode' : 'Decode';
    this.clearOutput();
  }

  setVariant(variant) {
    this.variant = variant;
    this.variantButtons.forEach(btn => {
      const active = btn.dataset.variant === variant;
      btn.className = active ? 'dt-seg-btn dt-seg-btn-active' : 'dt-seg-btn';
    });
  }

  async convert() {
    const input = this.inputTextarea.value;
    if (!input) {
      this.showError('Please enter some input.');
      return;
    }

    if (this.isProcessing) return;

    this.setProcessing(true);
    this.clearError();

    try {
      let result;
      if (new Blob([input]).size > WORKER_THRESHOLD_BYTES) {
        // Large input — offload to the worker so the main thread never freezes
        const operation = this.mode === 'encode' ? WorkerOperation.BASE64_ENCODE : WorkerOperation.BASE64_DECODE;
        const workerResult = await withTimeout(
          this.workerPool.processTask(operation, { data: input, variant: this.variant }),
          30000,
          'Operation timed out'
        );
        result = workerResult.result;
      } else if (this.mode === 'encode') {
        result = this.encode(input);
      } else {
        result = this.decode(input);
      }

      this.currentOutput = result;
      this.outputContainer.innerHTML = this.escapeHtml(result);
      this.outputSizeDisplay.textContent = this.formatBytes(new Blob([result]).size);
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.setProcessing(false);
    }
  }

  encode(text) {
    const encoded = base64FromUtf8(text);
    return this.variant === 'urlsafe'
      ? encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      : encoded;
  }

  decode(b64) {
    let base64 = b64.trim();
    if (this.variant === 'urlsafe') {
      base64 = base64.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) base64 += '=';
    }
    return utf8FromBase64(base64);
  }

  showError(message) {
    this.errorContainer.classList.remove('hidden');
    this.errorMessage.textContent = message;
  }

  clearError() {
    this.errorContainer.classList.add('hidden');
  }

  clearOutput() {
    this.outputContainer.innerHTML = '<div class="dt-empty">Output will appear here...</div>';
    this.currentOutput = '';
    this.outputSizeDisplay.textContent = '0 bytes';
  }

  clear() {
    this.inputTextarea.value = '';
    this.currentInput = '';
    this.inputSizeDisplay.textContent = '0 bytes';
    this.convertBtn.disabled = false;
    this.clearOutput();
    this.clearError();
  }

  async copy() {
    if (!this.currentOutput) return;
    try {
      await navigator.clipboard.writeText(this.currentOutput);
      const original = this.copyBtn.textContent;
      this.copyBtn.textContent = 'Copied!';
      setTimeout(() => { this.copyBtn.textContent = original; }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }

  download() {
    if (!this.currentOutput) return;
    const ext = this.mode === 'encode' ? 'b64' : 'txt';
    const blob = new Blob([this.currentOutput], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `base64-${this.mode}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  loadSample() {
    if (this.mode === 'encode') {
      this.inputTextarea.value = 'Hello, World! This is a test of Base64 encoding with special characters: äöü ñ 你好';
    } else {
      this.inputTextarea.value = 'SGVsbG8sIFdvcmxkIQ==';
    }
    this.inputTextarea.dispatchEvent(new Event('input'));
  }

  setProcessing(isProcessing) {
    this.isProcessing = isProcessing;
    this.convertBtn.disabled = isProcessing;
    this.processingIndicator.classList.toggle('hidden', !isProcessing);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 bytes';
    const k = 1024;
    const sizes = ['bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  escapeHtml(text) {
    return escapeHtml(text);
  }

  destroy() {
    if (this.workerPool) this.workerPool.terminate();
  }
}
