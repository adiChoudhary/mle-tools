/**
 * JWT Decoder Tool Island
 * Handles JWT decoding, validation, signature verification, and security analysis
 */

import { escapeHtml } from "../../utils/escape-html.ts";

export class JwtDecoder {
  constructor(element) {
    this.element = element;
    this.currentInput = '';
    this.currentOutput = '';
    this.isProcessing = false;
    this.decodedJWT = null;
    this.validationResult = null;
    this.signatureVerified = null;
  }

  async init() {
    this.render();
    this.bindEvents();
    await this.loadJWTUtils();
  }

  async loadJWTUtils() {
    this.jwtUtils = await import("../../utils/jwt.ts");
  }

  render() {
    this.element.innerHTML = `
      <div class="space-y-6">
        <!-- Input Section -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label for="jwt-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              JWT Token
            </label>
            <div class="flex items-center space-x-2">
              <button
                id="load-sample-btn"
                class="px-3 py-1.5 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50
                       text-blue-700 dark:text-blue-300 rounded transition-colors"
              >
                Load Sample
              </button>
              <button
                id="clear-btn"
                class="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600
                       text-gray-700 dark:text-gray-300 rounded transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
          <textarea
            id="jwt-input"
            class="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                   font-mono text-sm resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
            spellcheck="false"
          ></textarea>
        </div>

        <!-- Decode Button -->
        <div class="flex items-center gap-3">
          <button
            id="decode-btn"
            class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg
                   disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Decode JWT
          </button>
          <div id="decode-status" class="hidden flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Decoding...</span>
          </div>
        </div>

        <!-- Error Display -->
        <div id="error-container" class="hidden bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800 dark:text-red-200">JWT Error</h3>
              <p id="error-message" class="mt-1 text-sm text-red-700 dark:text-red-300"></p>
            </div>
          </div>
        </div>

        <!-- Decoded Output -->
        <div id="decoded-output" class="hidden space-y-6">
          <!-- Token Overview -->
          <div class="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Token Overview</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Algorithm</span>
                <p id="jwt-algorithm" class="mt-1 font-mono text-sm text-gray-900 dark:text-gray-100"></p>
              </div>
              <div>
                <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Type</span>
                <p id="jwt-type" class="mt-1 font-mono text-sm text-gray-900 dark:text-gray-100"></p>
              </div>
              <div>
                <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Status</span>
                <div id="jwt-status" class="mt-1 flex items-center space-x-2">
                  <span class="inline-block w-2 h-2 rounded-full"></span>
                  <span class="text-sm font-medium"></span>
                </div>
              </div>
              <div>
                <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Expires</span>
                <p id="jwt-expires" class="mt-1 text-sm text-gray-900 dark:text-gray-100"></p>
              </div>
            </div>
          </div>

          <!-- Header Section -->
          <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">Header</h3>
              <div class="flex space-x-2">
                <button class="copy-btn px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded" data-target="header-json">
                  Copy
                </button>
              </div>
            </div>
            <div id="header-json" class="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 font-mono text-sm text-gray-900 dark:text-gray-100 overflow-x-auto"></div>
          </div>

          <!-- Payload Section -->
          <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">Payload</h3>
              <div class="flex space-x-2">
                <button class="copy-btn px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded" data-target="payload-json">
                  Copy
                </button>
              </div>
            </div>
            <div id="payload-json" class="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 font-mono text-sm text-gray-900 dark:text-gray-100 overflow-x-auto"></div>
          </div>

          <!-- Signature Section -->
          <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Signature</h3>
            <div class="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 font-mono text-sm text-gray-900 dark:text-gray-100 overflow-x-auto break-all">
              <p class="text-gray-500 dark:text-gray-400 mb-2">Raw signature (Base64URL encoded):</p>
              <p id="signature-raw" class="font-mono text-xs"></p>
            </div>

            <!-- HMAC Verification -->
            <div id="hmac-verification" class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 class="text-md font-medium text-gray-900 dark:text-white mb-3">Verify Signature (HMAC)</h4>
              <div class="flex flex-col md:flex-row gap-3">
                <div class="flex-1">
                  <label for="hmac-secret" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Secret Key
                  </label>
                  <input
                    type="text"
                    id="hmac-secret"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                           bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                           font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter secret key for verification"
                  >
                </div>
                <div class="flex items-end">
                  <button
                    id="verify-btn"
                    class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg
                           disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Verify
                  </button>
                </div>
              </div>
              <div id="verification-result" class="mt-3 hidden"></div>
            </div>
          </div>

          <!-- Validation & Security -->
          <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Validation & Security</h3>

            <!-- Validation Results -->
            <div id="validation-results" class="mb-4"></div>

            <!-- Security Recommendations -->
            <div id="security-recommendations" class="pt-4 border-t border-gray-200 dark:border-gray-700"></div>
          </div>

          <!-- Raw Token Parts -->
          <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Raw Token Parts</h3>
            <div class="space-y-3">
              <div>
                <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Header (Base64URL):</span>
                <p id="raw-header" class="mt-1 font-mono text-xs text-gray-900 dark:text-gray-100 overflow-x-auto bg-gray-50 dark:bg-gray-900/50 p-2 rounded"></p>
              </div>
              <div>
                <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Payload (Base64URL):</span>
                <p id="raw-payload" class="mt-1 font-mono text-xs text-gray-900 dark:text-gray-100 overflow-x-auto bg-gray-50 dark:bg-gray-900/50 p-2 rounded"></p>
              </div>
              <div>
                <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Signature (Base64URL):</span>
                <p id="raw-signature" class="mt-1 font-mono text-xs text-gray-900 dark:text-gray-100 overflow-x-auto bg-gray-50 dark:bg-gray-900/50 p-2 rounded"></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Get DOM references
    this.inputTextarea = this.element.querySelector('#jwt-input');
    this.decodeBtn = this.element.querySelector('#decode-btn');
    this.decodeStatus = this.element.querySelector('#decode-status');
    this.clearBtn = this.element.querySelector('#clear-btn');
    this.loadSampleBtn = this.element.querySelector('#load-sample-btn');
    this.errorContainer = this.element.querySelector('#error-container');
    this.errorMessage = this.element.querySelector('#error-message');
    this.decodedOutput = this.element.querySelector('#decoded-output');

    // Overview elements
    this.algorithmDisplay = this.element.querySelector('#jwt-algorithm');
    this.typeDisplay = this.element.querySelector('#jwt-type');
    this.statusDisplay = this.element.querySelector('#jwt-status');
    this.expiresDisplay = this.element.querySelector('#jwt-expires');

    // Content elements
    this.headerJson = this.element.querySelector('#header-json');
    this.payloadJson = this.element.querySelector('#payload-json');
    this.signatureRaw = this.element.querySelector('#signature-raw');

    // Verification elements
    this.hmacSecret = this.element.querySelector('#hmac-secret');
    this.verifyBtn = this.element.querySelector('#verify-btn');
    this.verificationResult = this.element.querySelector('#verification-result');
    this.hmacVerification = this.element.querySelector('#hmac-verification');

    // Validation elements
    this.validationResults = this.element.querySelector('#validation-results');
    this.securityRecommendations = this.element.querySelector('#security-recommendations');

    // Raw token elements
    this.rawHeader = this.element.querySelector('#raw-header');
    this.rawPayload = this.element.querySelector('#raw-payload');
    this.rawSignature = this.element.querySelector('#raw-signature');
  }

  bindEvents() {
    this.decodeBtn.addEventListener('click', () => this.decode());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.loadSampleBtn.addEventListener('click', () => this.loadSample());
    this.verifyBtn.addEventListener('click', () => this.verifySignature());

    // Copy buttons
    this.element.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const targetId = btn.dataset.target;
        const target = this.element.querySelector(`#${targetId}`);
        if (target) {
          try {
            await navigator.clipboard.writeText(target.textContent);
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => { btn.textContent = originalText; }, 2000);
          } catch (error) {
            console.error('Failed to copy:', error);
          }
        }
      });
    });

    // Keyboard shortcut: Ctrl/Cmd+Enter to decode
    this.inputTextarea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.decode();
      }
    });
  }

  async decode() {
    const token = this.inputTextarea.value.trim();
    if (!token) {
      this.showError('Please enter a JWT token.');
      return;
    }

    this.setProcessing(true);
    this.clearError();

    try {
      this.decodedJWT = this.jwtUtils.decodeJWT(token);
      this.validationResult = this.jwtUtils.validateJWTStructure(this.decodedJWT);
      this.displayDecodedJWT();
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.setProcessing(false);
    }
  }

  displayDecodedJWT() {
    this.decodedOutput.classList.remove('hidden');

    // Overview
    this.algorithmDisplay.textContent = this.decodedJWT.header.alg || 'N/A';
    this.typeDisplay.textContent = this.decodedJWT.header.typ || 'N/A';

    // Status display
    const statusContainer = this.statusDisplay;
    if (this.validationResult.isExpired) {
      statusContainer.innerHTML = `
        <span class="inline-block w-2 h-2 rounded-full bg-red-500"></span>
        <span class="text-sm font-medium text-red-600 dark:text-red-400">Expired</span>
      `;
    } else if (this.validationResult.errors.length > 0) {
      statusContainer.innerHTML = `
        <span class="inline-block w-2 h-2 rounded-full bg-yellow-500"></span>
        <span class="text-sm font-medium text-yellow-600 dark:text-yellow-400">Validation Issues</span>
      `;
    } else {
      statusContainer.innerHTML = `
        <span class="inline-block w-2 h-2 rounded-full bg-green-500"></span>
        <span class="text-sm font-medium text-green-600 dark:text-green-400">Valid Structure</span>
      `;
    }

    // Expires display
    if (this.validationResult.expiresAt) {
      const expDate = this.validationResult.expiresAt;
      const now = new Date();
      const isExpired = expDate < now;
      this.expiresDisplay.innerHTML = `
        <span class="${isExpired ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}">
          ${expDate.toLocaleString()}
        </span>
        <span class="text-xs text-gray-500 dark:text-gray-400 ml-2">
          (${this.formatTimeAgo(expDate)})
        </span>
      `;
    } else {
      this.expiresDisplay.textContent = 'No expiration (exp claim missing)';
    }

    // Header and Payload
    this.headerJson.textContent = JSON.stringify(this.decodedJWT.header, null, 2);
    this.payloadJson.textContent = JSON.stringify(this.jwtUtils.formatJWTPayload(this.decodedJWT.payload), null, 2);

    // Signature
    this.signatureRaw.textContent = this.decodedJWT.signature;

    // HMAC verification section visibility
    const isHMAC = this.decodedJWT.header.alg && this.decodedJWT.header.alg.startsWith('HS');
    this.hmacVerification.style.display = isHMAC ? 'block' : 'none';

    // Clear previous verification
    this.verificationResult.classList.add('hidden');

    // Validation results
    this.displayValidationResults();

    // Security recommendations
    this.displaySecurityRecommendations();

    // Raw token parts
    this.rawHeader.textContent = this.decodedJWT.raw.header;
    this.rawPayload.textContent = this.decodedJWT.raw.payload;
    this.rawSignature.textContent = this.decodedJWT.raw.signature;
  }

  displayValidationResults() {
    const results = this.validationResult;
    let html = '';

    if (results.errors.length > 0) {
      html += '<div class="mb-4">';
      html += '<h4 class="text-sm font-medium text-red-800 dark:text-red-200 mb-2">Errors</h4>';
      html += '<ul class="space-y-1">';
      results.errors.forEach(error => {
        html += `<li class="text-sm text-red-700 dark:text-red-300 flex items-start">
          <span class="mr-2 mt-1">⚠️</span>${this.escapeHtml(error)}
        </li>`;
      });
      html += '</ul></div>';
    }

    if (results.warnings.length > 0) {
      html += '<div>';
      html += '<h4 class="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">Warnings</h4>';
      html += '<ul class="space-y-1">';
      results.warnings.forEach(warning => {
        html += `<li class="text-sm text-yellow-700 dark:text-yellow-300 flex items-start">
          <span class="mr-2 mt-1">⚠️</span>${this.escapeHtml(warning)}
        </li>`;
      });
      html += '</ul></div>';
    }

    if (results.errors.length === 0 && results.warnings.length === 0) {
      html += '<div class="text-sm text-green-700 dark:text-green-300 flex items-center"><span class="mr-2">✅</span>No validation issues found</div>';
    }

    this.validationResults.innerHTML = html;
  }

  displaySecurityRecommendations() {
    const recommendations = this.jwtUtils.getJWTSecurityRecommendations(this.decodedJWT);
    if (recommendations.length === 0) {
      this.securityRecommendations.innerHTML = '';
      return;
    }

    let html = '<h4 class="text-sm font-medium text-gray-900 dark:text-white mb-2">Security Recommendations</h4>';
    html += '<ul class="space-y-2">';
    recommendations.forEach(rec => {
      html += `<li class="text-sm text-gray-700 dark:text-gray-300">${this.escapeHtml(rec)}</li>`;
    });
    html += '</ul>';
    this.securityRecommendations.innerHTML = html;
  }

  async verifySignature() {
    const secret = this.hmacSecret.value.trim();
    if (!secret) {
      this.verificationResult.innerHTML = '<p class="text-sm text-red-600 dark:text-red-400">Please enter a secret key.</p>';
      this.verificationResult.classList.remove('hidden');
      return;
    }

    this.verifyBtn.disabled = true;
    this.verificationResult.innerHTML = `
      <div class="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
        <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Verifying signature...</span>
      </div>
    `;
    this.verificationResult.classList.remove('hidden');

    try {
      const token = this.inputTextarea.value.trim();
      const alg = this.decodedJWT.header.alg;
      const isValid = await this.jwtUtils.verifyJWTSignatureHMAC(token, secret, alg);

      if (isValid) {
        this.verificationResult.innerHTML = `
          <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <p class="text-sm text-green-700 dark:text-green-300 flex items-center">
              <span class="mr-2">✅</span>Signature is valid - token has not been tampered with
            </p>
          </div>
        `;
      } else {
        this.verificationResult.innerHTML = `
          <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p class="text-sm text-red-700 dark:text-red-300 flex items-center">
              <span class="mr-2">❌</span>Signature is invalid - token may have been tampered with or wrong secret
            </p>
          </div>
        `;
      }
    } catch (error) {
      this.verificationResult.innerHTML = `
        <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p class="text-sm text-red-700 dark:text-red-300">Verification failed: ${this.escapeHtml(error.message)}</p>
        </div>
      `;
    } finally {
      this.verifyBtn.disabled = false;
    }
  }

  showError(message) {
    this.errorContainer.classList.remove('hidden');
    this.errorMessage.textContent = message;
    this.decodedOutput.classList.add('hidden');
  }

  clearError() {
    this.errorContainer.classList.add('hidden');
  }

  clear() {
    this.inputTextarea.value = '';
    this.decodedJWT = null;
    this.validationResult = null;
    this.clearError();
    this.decodedOutput.classList.add('hidden');
  }

  loadSample() {
    this.inputTextarea.value = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE5MDQwMTA0MDB9.9pN9K7qJZbqPqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq';
    this.decode();
  }

  setProcessing(isProcessing) {
    this.isProcessing = isProcessing;
    this.decodeBtn.disabled = isProcessing;
    this.decodeStatus.classList.toggle('hidden', !isProcessing);
  }

  formatTimeAgo(date) {
    const now = new Date();
    const diff = date - now;
    const absDiff = Math.abs(diff);
    const minutes = Math.floor(absDiff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const prefix = diff > 0 ? 'in' : '';
    if (days > 0) return `${prefix} ${days}d`;
    if (hours > 0) return `${prefix} ${hours}h`;
    if (minutes > 0) return `${prefix} ${minutes}m`;
    return diff > 0 ? 'in moments' : 'just now';
  }

  escapeHtml(text) {
    return escapeHtml(text);
  }

  destroy() {
    // Cleanup if needed
  }
}
