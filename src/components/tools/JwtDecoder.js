/**
 * JWT Decoder Tool Island
 * Handles JWT decoding, validation, signature verification, and security analysis
 */

import { escapeHtml } from "../../utils/escape-html.ts";
import { icon } from "../../utils/icons.ts";

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
            <label for="jwt-input" class="dt-label">
              JWT Token
            </label>
            <div class="flex items-center gap-2">
              <button
                id="load-sample-btn"
                type="button"
                class="dt-btn dt-btn-soft dt-btn-sm"
              >
                Load Sample
              </button>
              <button
                id="clear-btn"
                type="button"
                class="dt-btn dt-btn-sm"
              >
                Clear
              </button>
            </div>
          </div>
          <textarea
            id="jwt-input"
            class="dt-field h-32"
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
            spellcheck="false"
          ></textarea>
        </div>

        <!-- Decode Button -->
        <div class="flex items-center gap-3">
          <button
            id="decode-btn"
            type="button"
            class="dt-btn dt-btn-primary"
          >
            Decode JWT
          </button>
          <div id="decode-status" class="dt-accent hidden flex items-center gap-2 text-[13px]">
            <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Decoding...</span>
          </div>
        </div>

        <!-- Error Display -->
        <div id="error-container" class="dt-box dt-box-error hidden">
          <span class="text-red-500 dark:text-red-400">${icon('alert-circle', 18)}</span>
          <div>
            <h3 class="text-sm font-medium text-red-700 dark:text-red-300">JWT Error</h3>
            <p id="error-message" class="mt-0.5 text-[13px] text-red-600 dark:text-red-400"></p>
          </div>
        </div>

        <!-- Decoded Output -->
        <div id="decoded-output" class="hidden space-y-5">
          <!-- Token Overview -->
          <div class="dt-card p-4">
            <h3 class="mb-4 text-[15px] font-semibold tracking-tight">Token Overview</h3>
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <span class="dt-meta">Algorithm</span>
                <p id="jwt-algorithm" class="mt-1 font-mono text-[13.5px]"></p>
              </div>
              <div>
                <span class="dt-meta">Type</span>
                <p id="jwt-type" class="mt-1 font-mono text-[13.5px]"></p>
              </div>
              <div>
                <span class="dt-meta">Status</span>
                <div id="jwt-status" class="mt-1 flex items-center gap-2">
                  <span class="inline-block h-2 w-2 rounded-full"></span>
                  <span class="text-[13.5px] font-medium"></span>
                </div>
              </div>
              <div>
                <span class="dt-meta">Expires</span>
                <p id="jwt-expires" class="mt-1 text-[13.5px]"></p>
              </div>
            </div>
          </div>

          <!-- Header Section -->
          <div class="dt-panel p-4">
            <div class="mb-3.5 flex items-center justify-between">
              <h3 class="text-[15px] font-semibold tracking-tight">Header</h3>
              <div class="flex gap-2">
                <button class="copy-btn dt-btn dt-btn-sm py-0.5! px-2.5! text-xs!" data-target="header-json">
                  Copy
                </button>
              </div>
            </div>
            <div id="header-json" class="dt-field overflow-x-auto text-[13px]!"></div>
          </div>

          <!-- Payload Section -->
          <div class="dt-panel p-4">
            <div class="mb-3.5 flex items-center justify-between">
              <h3 class="text-[15px] font-semibold tracking-tight">Payload</h3>
              <div class="flex gap-2">
                <button class="copy-btn dt-btn dt-btn-sm py-0.5! px-2.5! text-xs!" data-target="payload-json">
                  Copy
                </button>
              </div>
            </div>
            <div id="payload-json" class="dt-field overflow-x-auto text-[13px]!"></div>
          </div>

          <!-- Signature Section -->
          <div class="dt-panel p-4">
            <h3 class="mb-3.5 text-[15px] font-semibold tracking-tight">Signature</h3>
            <div class="dt-field break-all overflow-x-auto text-[13px]!">
              <p class="dt-empty not-italic! mb-2">Raw signature (Base64URL encoded):</p>
              <p id="signature-raw" class="text-xs"></p>
            </div>

            <!-- HMAC Verification -->
            <div id="hmac-verification" class="mt-4 border-t border-(--border) pt-4">
              <h4 class="mb-3 text-[14px] font-semibold">Verify Signature (HMAC)</h4>
              <div class="flex flex-col gap-3 md:flex-row md:items-end">
                <div class="flex-1">
                  <label for="hmac-secret" class="dt-label mb-1.5 block">
                    Secret Key
                  </label>
                  <input
                    type="text"
                    id="hmac-secret"
                    class="dt-field"
                    placeholder="Enter secret key for verification"
                  >
                </div>
                <button
                  id="verify-btn"
                  type="button"
                  class="dt-btn dt-btn-primary"
                >
                  Verify
                </button>
              </div>
              <div id="verification-result" class="mt-3 hidden"></div>
            </div>
          </div>

          <!-- Validation & Security -->
          <div class="dt-panel p-4">
            <h3 class="mb-3.5 text-[15px] font-semibold tracking-tight">Validation & Security</h3>

            <!-- Validation Results -->
            <div id="validation-results" class="mb-4"></div>

            <!-- Security Recommendations -->
            <div id="security-recommendations" class="border-t border-(--border) pt-4"></div>
          </div>

          <!-- Raw Token Parts -->
          <div class="dt-panel p-4">
            <h3 class="mb-3.5 text-[15px] font-semibold tracking-tight">Raw Token Parts</h3>
            <div class="space-y-3.5">
              <div>
                <span class="dt-meta">Header (Base64URL):</span>
                <p id="raw-header" class="dt-field mt-1.5 overflow-x-auto p-2.5! text-xs!"></p>
              </div>
              <div>
                <span class="dt-meta">Payload (Base64URL):</span>
                <p id="raw-payload" class="dt-field mt-1.5 overflow-x-auto p-2.5! text-xs!"></p>
              </div>
              <div>
                <span class="dt-meta">Signature (Base64URL):</span>
                <p id="raw-signature" class="dt-field mt-1.5 overflow-x-auto p-2.5! text-xs!"></p>
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
        <span class="text-sm font-medium text-emerald-600 dark:text-emerald-400">Valid Structure</span>
      `;
    }

    // Expires display
    if (this.validationResult.expiresAt) {
      const expDate = this.validationResult.expiresAt;
      const now = new Date();
      const isExpired = expDate < now;
      this.expiresDisplay.innerHTML = `
        <span class="${isExpired ? 'text-red-600 dark:text-red-400' : ''}">
          ${expDate.toLocaleString()}
        </span>
        <span class="dt-meta ml-2">
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
      html += '<h4 class="mb-2 text-sm font-medium text-red-700 dark:text-red-300">Errors</h4>';
      html += '<ul class="space-y-1.5">';
      results.errors.forEach(error => {
        html += `<li class="flex items-start gap-2 text-[13.5px] text-red-600 dark:text-red-400">
          <span class="mt-0.5 shrink-0">${icon('alert-circle', 14)}</span>${this.escapeHtml(error)}
        </li>`;
      });
      html += '</ul></div>';
    }

    if (results.warnings.length > 0) {
      html += '<div>';
      html += '<h4 class="mb-2 text-sm font-medium text-amber-700 dark:text-amber-300">Warnings</h4>';
      html += '<ul class="space-y-1.5">';
      results.warnings.forEach(warning => {
        html += `<li class="flex items-start gap-2 text-[13.5px] text-amber-700 dark:text-amber-400">
          <span class="mt-0.5 shrink-0">${icon('alert-circle', 14)}</span>${this.escapeHtml(warning)}
        </li>`;
      });
      html += '</ul></div>';
    }

    if (results.errors.length === 0 && results.warnings.length === 0) {
      html += `<div class="flex items-center gap-2 text-[13.5px] text-emerald-700 dark:text-emerald-400">${icon('check-circle', 15)}No validation issues found</div>`;
    }

    this.validationResults.innerHTML = html;
  }

  displaySecurityRecommendations() {
    const recommendations = this.jwtUtils.getJWTSecurityRecommendations(this.decodedJWT);
    if (recommendations.length === 0) {
      this.securityRecommendations.innerHTML = '';
      return;
    }

    let html = '<h4 class="mb-2 text-sm font-semibold">Security Recommendations</h4>';
    html += '<ul class="list-disc space-y-1.5 pl-5">';
    recommendations.forEach(rec => {
      html += `<li class="text-[13.5px] dt-text-2">${this.escapeHtml(rec)}</li>`;
    });
    html += '</ul>';
    this.securityRecommendations.innerHTML = html;
  }

  async verifySignature() {
    const secret = this.hmacSecret.value.trim();
    if (!secret) {
      this.verificationResult.innerHTML = '<p class="text-[13px] text-red-600 dark:text-red-400">Please enter a secret key.</p>';
      this.verificationResult.classList.remove('hidden');
      return;
    }

    this.verifyBtn.disabled = true;
    this.verificationResult.innerHTML = `
      <div class="dt-accent flex items-center gap-2 text-[13px]">
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
          <div class="dt-box dt-box-success p-3!">
            <span class="text-emerald-600 dark:text-emerald-400">${icon('check-circle', 16)}</span>
            <p class="text-[13px] text-emerald-700 dark:text-emerald-300">Signature is valid - token has not been tampered with</p>
          </div>
        `;
      } else {
        this.verificationResult.innerHTML = `
          <div class="dt-box dt-box-error p-3!">
            <span class="text-red-500 dark:text-red-400">${icon('alert-circle', 16)}</span>
            <p class="text-[13px] text-red-600 dark:text-red-400">Signature is invalid - token may have been tampered with or wrong secret</p>
          </div>
        `;
      }
    } catch (error) {
      this.verificationResult.innerHTML = `
        <div class="dt-box dt-box-error p-3!">
          <span class="text-red-500 dark:text-red-400">${icon('alert-circle', 16)}</span>
          <p class="text-[13px] text-red-600 dark:text-red-400">Verification failed: ${this.escapeHtml(error.message)}</p>
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
