/**
 * Hash Generator Tool Island
 * Generates MD5, SHA-1, SHA-256, SHA-512 hashes with live hashing
 */

import { generateHash } from "../../utils/crypto.ts";
import { checkMemoryLimit } from "../../utils/memory.ts";
import { escapeHtml } from "../../utils/escape-html.ts";
import { icon } from "../../utils/icons.ts";

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
        <div class="dt-panel p-4">
          <h3 class="dt-label mb-3">Hash Algorithm</h3>
          <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
            <button id="alg-md5" class="dt-alg-btn dt-alg-btn-active" data-alg="MD5">MD5</button>
            <button id="alg-sha1" class="dt-alg-btn" data-alg="SHA-1">SHA-1</button>
            <button id="alg-sha256" class="dt-alg-btn" data-alg="SHA-256">SHA-256</button>
            <button id="alg-sha512" class="dt-alg-btn" data-alg="SHA-512">SHA-512</button>
          </div>
          <div class="mt-3.5 flex items-center gap-3">
            <label class="flex cursor-pointer items-center gap-2 text-[13px] dt-text-2">
              <input type="checkbox" id="all-algs" class="h-3.5 w-3.5 rounded">
              Generate all algorithms at once
            </label>
          </div>
        </div>

        <!-- Input -->
        <div class="space-y-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <label for="hash-input" class="dt-label">Input Data</label>
            <div class="flex items-center gap-2">
              <span id="input-size" class="dt-meta">0 bytes</span>
              <button id="load-sample-btn" type="button" class="dt-btn dt-btn-soft dt-btn-sm">Load Sample</button>
              <button id="clear-btn" type="button" class="dt-btn dt-btn-sm">Clear</button>
            </div>
          </div>
          <textarea id="hash-input" class="dt-field h-40" placeholder="Enter text to hash (hashes update in real-time)..." spellcheck="false"></textarea>
        </div>

        <!-- Processing indicator -->
        <div id="processing" class="dt-accent hidden flex items-center gap-2 text-[13px]">
          <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Computing hash...</span>
        </div>

        <!-- Error -->
        <div id="error-container" class="dt-box dt-box-error hidden">
          <span class="text-red-500 dark:text-red-400">${icon('alert-circle', 18)}</span>
          <p id="error-message" class="text-[13px] text-red-600 dark:text-red-400"></p>
        </div>

        <!-- Hash Output -->
        <div id="hash-output" class="space-y-4">
          <div class="dt-empty text-sm">Enter text above to see the hash...</div>
        </div>

        <!-- Info -->
        <div class="dt-box dt-box-info items-start!">
          <span class="dt-accent">${icon('info', 18)}</span>
          <div>
            <h3 class="mb-2 text-sm font-medium">About Hash Algorithms</h3>
            <div class="space-y-1 text-[13px] dt-text-2">
              <p><strong>MD5</strong> (128-bit): Fast but cryptographically broken. Use only for checksums, not security.</p>
              <p><strong>SHA-1</strong> (160-bit): Deprecated for security use. Collisions have been demonstrated.</p>
              <p><strong>SHA-256</strong> (256-bit): Current standard for security. Used in TLS, Git, cryptocurrencies.</p>
              <p><strong>SHA-512</strong> (512-bit): Strongest option. Better performance on 64-bit systems.</p>
            </div>
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
      this.hashOutput.innerHTML = '<div class="dt-empty text-sm">Enter text above to see the hash...</div>';
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
      btn.className = active ? 'dt-alg-btn dt-alg-btn-active' : 'dt-alg-btn';
    });
  }

  async hashInput() {
    const input = this.inputTextarea.value;
    if (!input) {
      this.hashOutput.innerHTML = '<div class="dt-empty text-sm">Enter text above to see the hash...</div>';
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
    // Static class names (Tailwind's JIT scanner cannot see concatenated
    // class strings like `bg-${color}-500` — they would get no CSS emitted).
    const dotColors = {
      'MD5': 'bg-amber-500',
      'SHA-1': 'bg-yellow-500',
      'SHA-256': 'bg-green-500',
      'SHA-512': 'bg-emerald-500',
    };

    for (const [alg, hash] of Object.entries(hashes)) {
      const color = dotColors[alg] || 'bg-violet-500';
      html += `
        <div class="dt-card p-4">
          <div class="mb-2 flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="inline-block h-2 w-2 rounded-full ${color}"></span>
              <h4 class="text-sm font-medium">${alg}</h4>
              <span class="dt-meta">${alg === 'MD5' ? '128-bit' : alg === 'SHA-1' ? '160-bit' : alg === 'SHA-256' ? '256-bit' : '512-bit'}</span>
            </div>
            <button class="copy-hash-btn dt-btn dt-btn-sm py-0.5! px-2.5! text-xs!" data-hash="${this.escapeHtml(hash)}">Copy</button>
          </div>
          <p class="break-all font-mono text-[13px]">${hash}</p>
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
      <div class="dt-card p-4">
        <div class="mb-2 flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="inline-block h-2 w-2 rounded-full bg-violet-500"></span>
            <h4 class="text-sm font-medium">${algorithm}</h4>
            <span class="dt-meta">${bitLength}-bit</span>
          </div>
          <button class="copy-hash-btn dt-btn dt-btn-sm py-0.5! px-2.5! text-xs!" data-hash="${this.escapeHtml(hash)}">Copy</button>
        </div>
        <p class="break-all font-mono text-[13px]">${hash}</p>
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
    return escapeHtml(text);
  }

  destroy() {
    clearTimeout(this.debounceTimer);
  }
}
