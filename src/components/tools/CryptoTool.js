/**
 * Crypto Tool Island
 * AES-GCM and RSA-OAEP encryption/decryption with key management
 */

import {
  generateAESKey,
  generateRSAKeyPair,
  encryptAES,
  decryptAES,
  encryptRSA,
  decryptRSA,
  exportKey,
} from "../../utils/crypto.ts";
import { escapeHtml } from "../../utils/escape-html.ts";
import { icon } from "../../utils/icons.ts";

function arrayBufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToArrayBuffer(hex) {
  const clean = hex.replace(/\s+/g, '');
  if (clean.length === 0 || clean.length % 2 !== 0) {
    throw new Error('Hex input must contain an even number of characters');
  }
  if (!/^[0-9a-fA-F]+$/.test(clean)) {
    throw new Error('Hex input contains invalid characters (expected 0-9, a-f)');
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

export class CryptoTool {
  constructor(element) {
    this.element = element;
    this.mode = 'aes';
    this.operation = 'encrypt';
    this.aesKey = null;
    this.rsaKeyPair = null;
    this.currentOutput = '';
  }

  init() {
    this.render();
    this.bindEvents();
  }

  render() {
    this.element.innerHTML = `
      <div class="space-y-6">
        <!-- Security Warning -->
        <div class="dt-box dt-box-warn items-start!">
          <span class="text-amber-500 dark:text-amber-400">${icon('alert-circle', 18)}</span>
          <div>
            <h3 class="mb-1.5 text-sm font-medium text-amber-800 dark:text-amber-200">Client-Side Cryptography Warning</h3>
            <ul class="list-disc space-y-1 pl-4 text-[13px] text-amber-700 dark:text-amber-300">
              <li>Keys are handled in browser memory and may be visible in developer tools</li>
              <li>No hardware security modules (HSMs) are used</li>
              <li>Do not store private keys in browser storage</li>
              <li>Use this for development/testing only, not production security</li>
            </ul>
          </div>
        </div>

        <!-- Algorithm Selection -->
        <div class="dt-panel p-4">
          <div class="flex flex-wrap items-center gap-x-8 gap-y-4">
            <div class="flex items-center gap-3">
              <span class="dt-label">Algorithm:</span>
              <div class="dt-seg">
                <button id="alg-aes" class="dt-seg-btn dt-seg-btn-active" data-alg="aes">AES-GCM</button>
                <button id="alg-rsa" class="dt-seg-btn" data-alg="rsa">RSA-OAEP</button>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="dt-label">Operation:</span>
              <div class="dt-seg">
                <button id="op-encrypt" class="dt-seg-btn dt-seg-btn-active" data-op="encrypt">Encrypt</button>
                <button id="op-decrypt" class="dt-seg-btn" data-op="decrypt">Decrypt</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Key Management Section -->
        <div id="key-section" class="dt-panel p-4 space-y-4">
          <h3 class="dt-label">Key Management</h3>
          <div class="flex flex-wrap gap-3">
            <button id="generate-key-btn" type="button" class="dt-btn dt-btn-primary">Generate New Key</button>
            <button id="export-key-btn" type="button" class="dt-btn" disabled>Export Key</button>
          </div>
          <div id="key-display" class="hidden">
            <p class="dt-meta mb-1.5">Key (hex):</p>
            <p id="key-hex" class="dt-field break-all p-2.5! text-xs!"></p>
          </div>
          <div id="iv-display" class="hidden">
            <p class="dt-meta mb-1.5">Initialization Vector (IV, hex):</p>
            <p id="iv-hex" class="dt-field break-all p-2.5! text-xs!"></p>
          </div>
        </div>

        <!-- Input Section -->
        <div class="space-y-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <label for="crypto-input" id="crypto-input-label" class="dt-label">Plaintext Input</label>
            <div class="flex items-center gap-2">
              <button id="load-sample-btn" type="button" class="dt-btn dt-btn-soft dt-btn-sm">Load Sample</button>
              <button id="clear-btn" type="button" class="dt-btn dt-btn-sm">Clear</button>
            </div>
          </div>
          <textarea id="crypto-input" class="dt-field h-32" placeholder="Enter text to encrypt..." spellcheck="false"></textarea>
        </div>

        <!-- Custom Key Input (for decryption) -->
        <div id="custom-key-section" class="hidden space-y-3">
          <h3 class="dt-label">Import Key for Decryption</h3>
          <div class="space-y-1.5">
            <label for="custom-key" class="dt-meta block">Key (hex):</label>
            <input id="custom-key" type="text" class="dt-field" placeholder="Paste key hex..." />
          </div>
          <div id="custom-iv-section" class="space-y-1.5">
            <label for="custom-iv" class="dt-meta block">IV (hex, 12 bytes for AES-GCM):</label>
            <input id="custom-iv" type="text" class="dt-field" placeholder="Paste IV hex..." />
          </div>
        </div>

        <!-- Action Button -->
        <div class="flex items-center gap-3">
          <button id="action-btn" type="button" class="dt-btn dt-btn-primary">Encrypt</button>
          <div id="processing" class="dt-accent hidden flex items-center gap-2 text-[13px]">
            <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Processing...</span>
          </div>
        </div>

        <!-- Error -->
        <div id="error-container" class="dt-box dt-box-error hidden">
          <span class="text-red-500 dark:text-red-400">${icon('alert-circle', 18)}</span>
          <p id="error-message" class="text-[13px] text-red-600 dark:text-red-400"></p>
        </div>

        <!-- Output -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label id="crypto-output-label" class="dt-label">Encrypted Output</label>
            <button id="copy-btn" type="button" class="dt-btn dt-btn-sm">Copy</button>
          </div>
          <div id="crypto-output" class="dt-field min-h-24 max-h-48 overflow-auto whitespace-pre-wrap break-all">
            <div class="dt-empty">Output will appear here...</div>
          </div>
        </div>
      </div>
    `;

    // DOM refs
    this.inputTextarea = this.element.querySelector('#crypto-input');
    this.cryptoOutput = this.element.querySelector('#crypto-output');
    this.errorContainer = this.element.querySelector('#error-container');
    this.errorMessage = this.element.querySelector('#error-message');
    this.processingIndicator = this.element.querySelector('#processing');
    this.actionBtn = this.element.querySelector('#action-btn');
    this.inputLabel = this.element.querySelector('#crypto-input-label');
    this.outputLabel = this.element.querySelector('#crypto-output-label');

    // Key management
    this.generateKeyBtn = this.element.querySelector('#generate-key-btn');
    this.exportKeyBtn = this.element.querySelector('#export-key-btn');
    this.keyDisplay = this.element.querySelector('#key-display');
    this.keyHex = this.element.querySelector('#key-hex');
    this.ivDisplay = this.element.querySelector('#iv-display');
    this.ivHex = this.element.querySelector('#iv-hex');
    this.customKeySection = this.element.querySelector('#custom-key-section');
    this.customKeyInput = this.element.querySelector('#custom-key');
    this.customIvSection = this.element.querySelector('#custom-iv-section');
    this.customIvInput = this.element.querySelector('#custom-iv');

    // State
    this.lastIv = null;
  }

  bindEvents() {
    // Algorithm toggle
    this.element.querySelectorAll('[data-alg]').forEach(btn => {
      btn.addEventListener('click', () => this.setAlgorithm(btn.dataset.alg));
    });

    // Operation toggle
    this.element.querySelectorAll('[data-op]').forEach(btn => {
      btn.addEventListener('click', () => this.setOperation(btn.dataset.op));
    });

    // Key management
    this.generateKeyBtn.addEventListener('click', () => this.generateKey());
    this.exportKeyBtn.addEventListener('click', () => this.exportKey());

    // Action
    this.actionBtn.addEventListener('click', () => this.performAction());
    this.inputTextarea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.performAction();
      }
    });

    // Utility
    this.element.querySelector('#clear-btn').addEventListener('click', () => {
      this.inputTextarea.value = '';
      this.cryptoOutput.innerHTML = '<div class="dt-empty">Output will appear here...</div>';
      this.currentOutput = '';
      this.clearError();
    });
    this.element.querySelector('#load-sample-btn').addEventListener('click', () => this.loadSample());
    this.element.querySelector('#copy-btn').addEventListener('click', () => this.copy());
  }

  setAlgorithm(alg) {
    this.mode = alg;
    this.aesKey = null;
    this.rsaKeyPair = null;

    this.element.querySelectorAll('[data-alg]').forEach(btn => {
      const active = btn.dataset.alg === alg;
      btn.className = active ? 'dt-seg-btn dt-seg-btn-active' : 'dt-seg-btn';
    });

    // Reset key display
    this.keyDisplay.classList.add('hidden');
    this.ivDisplay.classList.add('hidden');
    this.exportKeyBtn.disabled = true;
    this.updateUI();
  }

  setOperation(op) {
    this.operation = op;
    const isEncrypt = op === 'encrypt';

    this.element.querySelectorAll('[data-op]').forEach(btn => {
      const active = btn.dataset.op === op;
      btn.className = active ? 'dt-seg-btn dt-seg-btn-active' : 'dt-seg-btn';
    });

    this.customKeySection.classList.toggle('hidden', isEncrypt);
    this.updateUI();
  }

  updateUI() {
    const isEncrypt = this.operation === 'encrypt';
    const isAes = this.mode === 'aes';

    this.inputLabel.textContent = isEncrypt ? 'Plaintext Input' : 'Encrypted Input (hex)';
    this.outputLabel.textContent = isEncrypt ? 'Encrypted Output (hex)' : 'Decrypted Output';
    this.actionBtn.textContent = isEncrypt ? 'Encrypt' : 'Decrypt';
    this.inputTextarea.placeholder = isEncrypt ? 'Enter text to encrypt...' : 'Paste encrypted hex...';

    this.customIvSection.classList.toggle('hidden', !isAes);
  }

  async generateKey() {
    try {
      if (this.mode === 'aes') {
        this.aesKey = await generateAESKey(256);
        this.keyDisplay.classList.remove('hidden');
        this.ivDisplay.classList.add('hidden');

        // Export key for display
        const rawKey = await exportKey(this.aesKey, 'raw');
        this.keyHex.textContent = arrayBufferToHex(rawKey);
        this.exportKeyBtn.disabled = false;
      } else {
        this.rsaKeyPair = await generateRSAKeyPair(2048);
        this.keyDisplay.classList.remove('hidden');

        const rawKey = await exportKey(this.rsaKeyPair.publicKey, 'spki');
        this.keyHex.textContent = arrayBufferToHex(rawKey);
        this.exportKeyBtn.disabled = false;
      }
      this.clearError();
    } catch (error) {
      this.showError(`Key generation failed: ${error.message}`);
    }
  }

  async exportKey() {
    try {
      let key;
      if (this.mode === 'aes') {
        key = await exportKey(this.aesKey, 'jwk');
      } else {
        key = await exportKey(this.rsaKeyPair.privateKey, 'pkcs8');
        const hex = arrayBufferToHex(key);
        this.currentOutput = hex;
        this.cryptoOutput.innerHTML = this.escapeHtml(hex);
        return;
      }

      const json = JSON.stringify(key, null, 2);
      this.currentOutput = json;
      this.cryptoOutput.innerHTML = this.escapeHtml(json);
    } catch (error) {
      this.showError(`Key export failed: ${error.message}`);
    }
  }

  async performAction() {
    const input = this.inputTextarea.value;
    if (!input) {
      this.showError('Please enter some input.');
      return;
    }

    this.setProcessing(true);
    this.clearError();

    try {
      if (this.mode === 'aes') {
        await this.performAES(input);
      } else {
        await this.performRSA(input);
      }
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.setProcessing(false);
    }
  }

  async performAES(input) {
    let key;
    let ivHex = '';
    let iv;

    if (this.operation === 'encrypt') {
      if (!this.aesKey) {
        throw new Error('Please generate a key first.');
      }
      key = this.aesKey;
      iv = crypto.getRandomValues(new Uint8Array(12));
      ivHex = arrayBufferToHex(iv.buffer);

      const result = await encryptAES(input, key, iv);
      this.lastIv = iv.buffer;

      // Combine ciphertext + IV for output
      const ciphertextHex = arrayBufferToHex(result.ciphertext);
      this.currentOutput = ciphertextHex;
      this.cryptoOutput.innerHTML = this.escapeHtml(ciphertextHex);

      // Show IV
      this.ivDisplay.classList.remove('hidden');
      this.ivHex.textContent = ivHex;
    } else {
      // Decrypt: need custom key + IV
      const keyHex = this.customKeyInput.value.trim();
      const ivInput = this.customIvInput.value.trim();

      if (!keyHex || !ivInput) {
        throw new Error('Please provide both the key and IV for decryption.');
      }

      // Import key
      key = await crypto.subtle.importKey(
        'raw',
        hexToArrayBuffer(keyHex),
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );

      iv = hexToArrayBuffer(ivInput);

      const ciphertext = hexToArrayBuffer(input);
      const plaintext = await decryptAES(ciphertext, key, iv);
      const text = new TextDecoder().decode(plaintext);
      this.currentOutput = text;
      this.cryptoOutput.innerHTML = this.escapeHtml(text);
    }
  }

  async performRSA(input) {
    if (this.operation === 'encrypt') {
      if (!this.rsaKeyPair) {
        throw new Error('Please generate a key pair first.');
      }

      const ciphertext = await encryptRSA(input, this.rsaKeyPair.publicKey);
      const hex = arrayBufferToHex(ciphertext);
      this.currentOutput = hex;
      this.cryptoOutput.innerHTML = this.escapeHtml(hex);
    } else {
      if (!this.rsaKeyPair) {
        throw new Error('Please generate a key pair first. For production, import a private key instead.');
      }

      const ciphertext = hexToArrayBuffer(input);
      const plaintext = await decryptRSA(ciphertext, this.rsaKeyPair.privateKey);
      const text = new TextDecoder().decode(plaintext);
      this.currentOutput = text;
      this.cryptoOutput.innerHTML = this.escapeHtml(text);
    }
  }

  showError(message) {
    this.errorContainer.classList.remove('hidden');
    this.errorMessage.textContent = message;
  }

  clearError() {
    this.errorContainer.classList.add('hidden');
  }

  setProcessing(isProcessing) {
    this.actionBtn.disabled = isProcessing;
    this.processingIndicator.classList.toggle('hidden', !isProcessing);
  }

  loadSample() {
    this.inputTextarea.value = this.operation === 'encrypt'
      ? 'Hello, this is a secret message encrypted with AES-GCM!'
      : '';
  }

  async copy() {
    if (!this.currentOutput) return;
    try {
      await navigator.clipboard.writeText(this.currentOutput);
      const btn = this.element.querySelector('#copy-btn');
      const original = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = original; }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }

  escapeHtml(text) {
    return escapeHtml(text);
  }

  destroy() {}
}
