/**
 * Base64 Encoder/Decoder Tool Island
 * Handles bidirectional Base64 encoding for text and files
 */

import { WorkerOperation } from "../../utils/worker-interface.ts";
import { WorkerPool } from "../../utils/worker-pool.ts";
import { checkMemoryLimit } from "../../utils/memory.ts";

export class Base64Encoder {
  constructor(element) {
    this.element = element;
    this.workerPool = new WorkerPool();
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
        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div class="flex flex-wrap items-center gap-6">
            <div>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300 mr-3">Mode:</span>
              <div class="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5">
                <button id="mode-encode" class="px-4 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white" data-mode="encode">Encode</button>
                <button id="mode-decode" class="px-4 py-1.5 text-sm font-medium rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" data-mode="decode">Decode</button>
              </div>
            </div>
            <div>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300 mr-3">Variant:</span>
              <div class="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5">
                <button id="variant-standard" class="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white" data-variant="standard">Standard</button>
                <button id="variant-urlsafe" class="px-3 py-1.5 text-sm font-medium rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" data-variant="urlsafe">URL-safe</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Input Section -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label for="b64-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300" id="input-label">Text Input</label>
            <div class="flex items-center space-x-2">
              <span id="input-size" class="text-sm text-gray-500 dark:text-gray-400">0 bytes</span>
              <button id="load-sample-btn" class="px-3 py-1.5 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded transition-colors">Load Sample</button>
              <button id="clear-btn" class="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors">Clear</button>
            </div>
          </div>
          <textarea id="b64-input" class="w-full h-48 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter text to encode..." spellcheck="false"></textarea>
        </div>

        <!-- Convert Buttons -->
        <div class="flex items-center gap-3">
          <button id="convert-btn" class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">Encode</button>
          <div id="processing" class="hidden flex items-center space-x-2 text-blue-600 dark:text-blue-400">
            <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Processing...</span>
          </div>
        </div>

        <!-- Error Display -->
        <div id="error-container" class="hidden bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
              <p id="error-message" class="mt-1 text-sm text-red-700 dark:text-red-300"></p>
            </div>
          </div>
        </div>

        <!-- Output Section -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label for="b64-output" class="block text-sm font-medium text-gray-700 dark:text-gray-300" id="output-label">Base64 Output</label>
            <div class="flex items-center space-x-2">
              <span id="output-size" class="text-sm text-gray-500 dark:text-gray-400">0 bytes</span>
              <button id="copy-btn" class="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors">Copy</button>
              <button id="download-btn" class="px-3 py-1 text-sm bg-green-100 hover:bg-green-200 dark:bg-green-700 dark:hover:bg-green-600 text-green-700 dark:text-green-300 rounded transition-colors">Download</button>
            </div>
          </div>
          <div id="b64-output" class="w-full min-h-48 max-h-72 overflow-auto px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 font-mono text-sm whitespace-pre-wrap break-all">
            <div class="text-gray-500 dark:text-gray-400 italic">Output will appear here...</div>
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
      btn.className = `px-4 py-1.5 text-sm font-medium rounded-md ${active ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`;
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
      btn.className = `px-3 py-1.5 text-sm font-medium rounded-md ${active ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`;
    });
  }

  convert() {
    const input = this.inputTextarea.value;
    if (!input) {
      this.showError('Please enter some input.');
      return;
    }

    this.setProcessing(true);
    this.clearError();

    try {
      let result;
      if (this.mode === 'encode') {
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
    const encoded = btoa(unescape(encodeURIComponent(text)));
    return this.variant === 'urlsafe'
      ? encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
      : encoded;
  }

  decode(b64) {
    let base64 = b64.trim();
    if (this.variant === 'urlsafe') {
      base64 = base64.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) base64 += '=';
    }
    const decoded = atob(base64);
    return decodeURIComponent(escape(decoded));
  }

  showError(message) {
    this.errorContainer.classList.remove('hidden');
    this.errorMessage.textContent = message;
  }

  clearError() {
    this.errorContainer.classList.add('hidden');
  }

  clearOutput() {
    this.outputContainer.innerHTML = '<div class="text-gray-500 dark:text-gray-400 italic">Output will appear here...</div>';
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
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  destroy() {
    if (this.workerPool) this.workerPool.terminate();
  }
}
