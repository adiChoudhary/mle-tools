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

function arrayBufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToArrayBuffer(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToArrayBuffer(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
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
        <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div class="flex items-start">
            <span class="text-lg mr-3">⚠️</span>
            <div>
              <h3 class="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">Client-Side Cryptography Warning</h3>
              <ul class="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                <li>Keys are handled in browser memory and may be visible in developer tools</li>
                <li>No hardware security modules (HSMs) are used</li>
                <li>Do not store private keys in browser storage</li>
                <li>Use this for development/testing only, not production security</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Algorithm Selection -->
        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div class="flex flex-wrap items-center gap-6">
            <div>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300 mr-3">Algorithm:</span>
              <div class="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5">
                <button id="alg-aes" class="px-4 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white" data-alg="aes">AES-GCM</button>
                <button id="alg-rsa" class="px-4 py-1.5 text-sm font-medium rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" data-alg="rsa">RSA-OAEP</button>
              </div>
            </div>
            <div>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300 mr-3">Operation:</span>
              <div class="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5">
                <button id="op-encrypt" class="px-4 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white" data-op="encrypt">Encrypt</button>
                <button id="op-decrypt" class="px-4 py-1.5 text-sm font-medium rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" data-op="decrypt">Decrypt</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Key Management Section -->
        <div id="key-section" class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
          <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">Key Management</h3>
          <div class="flex flex-wrap gap-3">
            <button id="generate-key-btn" class="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">Generate New Key</button>
            <button id="export-key-btn" class="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled>Export Key</button>
          </div>
          <div id="key-display" class="hidden">
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Key (hex):</p>
            <p id="key-hex" class="font-mono text-xs bg-gray-50 dark:bg-gray-900/50 p-2 rounded break-all"></p>
          </div>
          <div id="iv-display" class="hidden">
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Initialization Vector (IV, hex):</p>
            <p id="iv-hex" class="font-mono text-xs bg-gray-50 dark:bg-gray-900/50 p-2 rounded break-all"></p>
          </div>
        </div>

        <!-- Input Section -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label for="crypto-input" id="crypto-input-label" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Plaintext Input</label>
            <div class="flex items-center space-x-2">
              <button id="load-sample-btn" class="px-3 py-1.5 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded transition-colors">Load Sample</button>
              <button id="clear-btn" class="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors">Clear</button>
            </div>
          </div>
          <textarea id="crypto-input" class="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter text to encrypt..." spellcheck="false"></textarea>
        </div>

        <!-- Custom Key Input (for decryption) -->
        <div id="custom-key-section" class="hidden space-y-3">
          <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">Import Key for Decryption</h3>
          <div class="space-y-2">
            <label for="custom-key" class="block text-xs text-gray-500 dark:text-gray-400">Key (hex):</label>
            <input id="custom-key" type="text" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Paste key hex..." />
          </div>
          <div id="custom-iv-section" class="space-y-2">
            <label for="custom-iv" class="block text-xs text-gray-500 dark:text-gray-400">IV (hex, 12 bytes for AES-GCM):</label>
            <input id="custom-iv" type="text" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Paste IV hex..." />
          </div>
        </div>

        <!-- Action Button -->
        <div class="flex items-center gap-3">
          <button id="action-btn" class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed">Encrypt</button>
          <div id="processing" class="hidden flex items-center space-x-2 text-blue-600 dark:text-blue-400">
            <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Processing...</span>
          </div>
        </div>

        <!-- Error -->
        <div id="error-container" class="hidden bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p id="error-message" class="text-sm text-red-700 dark:text-red-300"></p>
        </div>

        <!-- Output -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label id="crypto-output-label" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Encrypted Output</label>
            <button id="copy-btn" class="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors">Copy</button>
          </div>
          <div id="crypto-output" class="w-full min-h-24 max-h-48 overflow-auto px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 font-mono text-sm whitespace-pre-wrap break-all">
            <div class="text-gray-500 dark:text-gray-400 italic">Output will appear here...</div>
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
      this.cryptoOutput.innerHTML = '<div class="text-gray-500 dark:text-gray-400 italic">Output will appear here...</div>';
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
      btn.className = `px-4 py-1.5 text-sm font-medium rounded-md ${active ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`;
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
      btn.className = `px-4 py-1.5 text-sm font-medium rounded-md ${active ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`;
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
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  destroy() {}
}
