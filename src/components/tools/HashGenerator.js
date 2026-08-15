/**
 * Hash Generator Tool Island
 * Generates MD5, SHA-1, SHA-256, SHA-512 hashes with live hashing
 */

import { generateHash } from "../../utils/crypto.ts";
import { checkMemoryLimit } from "../../utils/memory.ts";

export class HashGenerator {
  constructor(element) {
    this.element = element;
    this.currentInput = '';
    this.isProcessing = false;
  }

  init() {
    this.render();
    this.bindEvents();
  }

  render() {
    this.element.innerHTML = `
      <div class="space-y-6">
        <!-- Algorithm Selection -->
        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Hash Algorithm</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button id="alg-md5" class="px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" data-alg="MD5">MD5</button>
            <button id="alg-sha1" class="px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 hover:border-blue-400" data-alg="SHA-1">SHA-1</button>
            <button id="alg-sha256" class="px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 hover:border-blue-400" data-alg="SHA-256">SHA-256</button>
            <button id="alg-sha512" class="px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 hover:border-blue-400" data-alg="SHA-512">SHA-512</button>
          </div>
          <div class="mt-3 flex items-center space-x-3">
            <label class="inline-flex items-center text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" id="all-algs" class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 mr-2">
              Generate all algorithms at once
            </label>
          </div>
        </div>

        <!-- Input -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label for="hash-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Input Data</label>
            <div class="flex items-center space-x-2">
              <span id="input-size" class="text-sm text-gray-500 dark:text-gray-400">0 bytes</span>
              <button id="load-sample-btn" class="px-3 py-1.5 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded transition-colors">Load Sample</button>
              <button id="clear-btn" class="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors">Clear</button>
            </div>
          </div>
          <textarea id="hash-input" class="w-full h-40 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter text to hash (hashes update in real-time)..." spellcheck="false"></textarea>
        </div>

        <!-- Processing indicator -->
        <div id="processing" class="hidden flex items-center space-x-2 text-blue-600 dark:text-blue-400">
          <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Computing hash...</span>
        </div>

        <!-- Error -->
        <div id="error-container" class="hidden bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p id="error-message" class="text-sm text-red-700 dark:text-red-300"></p>
        </div>

        <!-- Hash Output -->
        <div id="hash-output" class="space-y-4">
          <div class="text-gray-500 dark:text-gray-400 text-sm italic">Enter text above to see the hash...</div>
        </div>

        <!-- Info -->
        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 class="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">About Hash Algorithms</h3>
          <div class="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <p><strong>MD5</strong> (128-bit): Fast but cryptographically broken. Use only for checksums, not security.</p>
            <p><strong>SHA-1</strong> (160-bit): Deprecated for security use. Collisions have been demonstrated.</p>
            <p><strong>SHA-256</strong> (256-bit): Current standard for security. Used in TLS, Git, cryptocurrencies.</p>
            <p><strong>SHA-512</strong> (512-bit): Strongest option. Better performance on 64-bit systems.</p>
          </div>
        </div>
      </div>
    `;

    // DOM refs
    this.inputTextarea = this.element.querySelector('#hash-input');
    this.hashOutput = this.element.querySelector('#hash-output');
    this.inputSizeDisplay = this.element.querySelector('#input-size');
    this.processingIndicator = this.element.querySelector('#processing');
    this.errorContainer = this.element.querySelector('#error-container');
    this.errorMessage = this.element.querySelector('#error-message');
    this.allAlgsCheckbox = this.element.querySelector('#all-algs');
    this.algorithmButtons = this.element.querySelectorAll('[data-alg]');

    // State
    this.selectedAlgorithm = 'MD5';
    this.debounceTimer = null;
  }

  bindEvents() {
    // Algorithm selection
    this.algorithmButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedAlgorithm = btn.dataset.alg;
        this.updateAlgorithmUI();
        this.hashInput();
      });
    });

    // All algorithms toggle
    this.allAlgsCheckbox.addEventListener('change', () => {
      if (this.allAlgsCheckbox.checked) {
        this.hashInput();
      }
    });

    // Input - live hashing with debounce
    this.inputTextarea.addEventListener('input', () => {
      this.currentInput = this.inputTextarea.value;
      this.inputSizeDisplay.textContent = this.formatBytes(new Blob([this.currentInput]).size);

      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.hashInput(), 150);
    });

    // Utility buttons
    this.element.querySelector('#clear-btn').addEventListener('click', () => {
      this.inputTextarea.value = '';
      this.currentInput = '';
      this.inputSizeDisplay.textContent = '0 bytes';
      this.hashOutput.innerHTML = '<div class="text-gray-500 dark:text-gray-400 text-sm italic">Enter text above to see the hash...</div>';
      this.clearError();
    });

    this.element.querySelector('#load-sample-btn').addEventListener('click', () => {
      this.inputTextarea.value = 'The quick brown fox jumps over the lazy dog';
      this.currentInput = this.inputTextarea.value;
      this.inputSizeDisplay.textContent = this.formatBytes(new Blob([this.currentInput]).size);
      this.hashInput();
    });
  }

  updateAlgorithmUI() {
    this.algorithmButtons.forEach(btn => {
      const active = btn.dataset.alg === this.selectedAlgorithm;
      btn.className = `px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${active
        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 hover:border-blue-400'
      }`;
    });
  }

  async hashInput() {
    const input = this.inputTextarea.value;
    if (!input) {
      this.hashOutput.innerHTML = '<div class="text-gray-500 dark:text-gray-400 text-sm italic">Enter text above to see the hash...</div>';
      return;
    }

    if (!checkMemoryLimit(input)) {
      this.showError('Input exceeds 50MB limit. Please use a smaller input.');
      return;
    }

    this.setProcessing(true);
    this.clearError();

    try {
      if (this.allAlgsCheckbox.checked) {
        await this.hashAllAlgorithms(input);
      } else {
        await this.hashSingle(input, this.selectedAlgorithm);
      }
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.setProcessing(false);
    }
  }

  async hashAllAlgorithms(input) {
    const algorithms = ['MD5', 'SHA-1', 'SHA-256', 'SHA-512'];
    const hashes = {};

    for (const alg of algorithms) {
      hashes[alg] = await generateHash(input, { algorithm: alg });
    }

    let html = '';
    const colors = {
      'MD5': 'amber',
      'SHA-1': 'yellow',
      'SHA-256': 'green',
      'SHA-512': 'emerald',
    };

    for (const [alg, hash] of Object.entries(hashes)) {
      const color = colors[alg] || 'blue';
      html += `
        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center space-x-2">
              <span class="inline-block w-2 h-2 rounded-full bg-${color}-500"></span>
              <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">${alg}</h4>
              <span class="text-xs text-gray-500 dark:text-gray-400">${alg === 'MD5' ? '128-bit' : alg === 'SHA-1' ? '160-bit' : alg === 'SHA-256' ? '256-bit' : '512-bit'}</span>
            </div>
            <button class="copy-hash-btn px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors" data-hash="${this.escapeHtml(hash)}">Copy</button>
          </div>
          <p class="font-mono text-sm text-gray-900 dark:text-gray-100 break-all">${hash}</p>
        </div>
      `;
    }

    this.hashOutput.innerHTML = html;
    this.bindCopyButtons();
  }

  async hashSingle(input, algorithm) {
    const hash = await generateHash(input, { algorithm });
    const bitLength = algorithm === 'MD5' ? 128 : algorithm === 'SHA-1' ? 160 : algorithm === 'SHA-256' ? 256 : 512;

    this.hashOutput.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center space-x-2">
            <span class="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">${algorithm}</h4>
            <span class="text-xs text-gray-500 dark:text-gray-400">${bitLength}-bit</span>
          </div>
          <button class="copy-hash-btn px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors" data-hash="${this.escapeHtml(hash)}">Copy</button>
        </div>
        <p class="font-mono text-sm text-gray-900 dark:text-gray-100 break-all">${hash}</p>
      </div>
    `;

    this.bindCopyButtons();
  }

  bindCopyButtons() {
    this.hashOutput.querySelectorAll('.copy-hash-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const hash = btn.dataset.hash;
        try {
          await navigator.clipboard.writeText(hash);
          const original = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(() => { btn.textContent = original; }, 2000);
        } catch (error) {
          console.error('Failed to copy:', error);
        }
      });
    });
  }

  showError(message) {
    this.errorContainer.classList.remove('hidden');
    this.errorMessage.textContent = message;
  }

  clearError() {
    this.errorContainer.classList.add('hidden');
  }

  setProcessing(isProcessing) {
    this.isProcessing = isProcessing;
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
    clearTimeout(this.debounceTimer);
  }
}
