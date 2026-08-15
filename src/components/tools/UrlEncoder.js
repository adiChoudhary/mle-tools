/**
 * URL Encoder/Decoder Tool Island
 * URL encode/decode, query parameter editor, and MongoDB ObjectId decoder
 */

import { escapeHtml } from "../../utils/escape-html.ts";
import { icon } from "../../utils/icons.ts";

export class UrlEncoder {
  constructor(element) {
    this.element = element;
    this.mode = 'encode';
    this.currentInput = '';
    this.currentOutput = '';
    this.isProcessing = false;
  }

  init() {
    this.render();
    this.bindEvents();
  }

  render() {
    this.element.innerHTML = `
      <div class="space-y-6">
        <!-- Tab Selector -->
        <div class="dt-seg">
          <button id="tab-encoder" class="dt-seg-btn dt-seg-btn-active" data-tab="encoder">URL Encode/Decode</button>
          <button id="tab-query" class="dt-seg-btn" data-tab="query">Query Params</button>
          <button id="tab-objectid" class="dt-seg-btn" data-tab="objectid">ObjectId Decoder</button>
        </div>

        <!-- URL Encode/Decode Panel -->
        <div id="panel-encoder" class="space-y-4">
          <!-- Mode toggle -->
          <div class="flex items-center gap-3">
            <span class="dt-label">Mode:</span>
            <div class="dt-seg">
              <button id="mode-encode" class="dt-seg-btn dt-seg-btn-active" data-mode="encode">Encode</button>
              <button id="mode-decode" class="dt-seg-btn" data-mode="decode">Decode</button>
            </div>
          </div>

          <!-- Input -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label for="url-input" id="url-input-label" class="dt-label">Text Input</label>
              <div class="flex items-center gap-2">
                <button id="load-sample-btn" type="button" class="dt-btn dt-btn-soft dt-btn-sm">Load Sample</button>
                <button id="clear-btn" type="button" class="dt-btn dt-btn-sm">Clear</button>
              </div>
            </div>
            <textarea id="url-input" class="dt-field h-40" placeholder="Enter URL or text..." spellcheck="false"></textarea>
          </div>

          <!-- Convert -->
          <button id="convert-btn" type="button" class="dt-btn dt-btn-primary">Encode</button>

          <!-- Error -->
          <div id="error-container" class="dt-box dt-box-error hidden">
            <span class="text-red-500 dark:text-red-400">${icon('alert-circle', 18)}</span>
            <p id="error-message" class="text-[13px] text-red-600 dark:text-red-400"></p>
          </div>

          <!-- Output -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label id="url-output-label" class="dt-label">Encoded Output</label>
              <div class="flex items-center gap-2">
                <span id="output-size" class="dt-meta">0 bytes</span>
                <button id="copy-btn" type="button" class="dt-btn dt-btn-sm">Copy</button>
              </div>
            </div>
            <div id="url-output" class="dt-field min-h-32 max-h-64 overflow-auto whitespace-pre-wrap break-all">
              <div class="dt-empty">Output will appear here...</div>
            </div>
          </div>
        </div>

        <!-- Query Params Panel -->
        <div id="panel-query" class="hidden space-y-4">
          <div class="space-y-2">
            <label for="query-url-input" class="dt-label">URL with Query Parameters</label>
            <input id="query-url-input" type="text" class="dt-field" placeholder="https://example.com/path?name=Alice&age=30" />
          </div>
          <button id="parse-query-btn" type="button" class="dt-btn dt-btn-primary">Parse Query Params</button>
          <div id="query-output" class="space-y-2">
            <div class="dt-empty text-sm">Enter a URL and click Parse to see the parameters...</div>
          </div>
        </div>

        <!-- ObjectId Decoder Panel -->
        <div id="panel-objectid" class="hidden space-y-4">
          <div class="space-y-2">
            <label for="objectid-input" class="dt-label">MongoDB ObjectId (24 hex characters)</label>
            <div class="flex gap-3">
              <input id="objectid-input" type="text" class="dt-field flex-1" placeholder="507f1f77bcf86cd799439011" />
              <button id="decode-objectid-btn" type="button" class="dt-btn dt-btn-primary whitespace-nowrap">Decode</button>
            </div>
          </div>
          <div id="objectid-output" class="space-y-2">
            <div class="dt-empty text-sm">Enter an ObjectId to decode its components...</div>
          </div>
        </div>
      </div>
    `;

    // DOM refs - Encoder
    this.encoderPanel = this.element.querySelector('#panel-encoder');
    this.urlInput = this.element.querySelector('#url-input');
    this.urlOutput = this.element.querySelector('#url-output');
    this.urlInputLabel = this.element.querySelector('#url-input-label');
    this.urlOutputLabel = this.element.querySelector('#url-output-label');
    this.outputSize = this.element.querySelector('#output-size');
    this.convertBtn = this.element.querySelector('#convert-btn');
    this.errorContainer = this.element.querySelector('#error-container');
    this.errorMessage = this.element.querySelector('#error-message');

    // DOM refs - Query
    this.queryPanel = this.element.querySelector('#panel-query');
    this.queryUrlInput = this.element.querySelector('#query-url-input');
    this.parseQueryBtn = this.element.querySelector('#parse-query-btn');
    this.queryOutput = this.element.querySelector('#query-output');

    // DOM refs - ObjectId
    this.objectidPanel = this.element.querySelector('#panel-objectid');
    this.objectidInput = this.element.querySelector('#objectid-input');
    this.decodeObjectidBtn = this.element.querySelector('#decode-objectid-btn');
    this.objectidOutput = this.element.querySelector('#objectid-output');
  }

  bindEvents() {
    // Tabs
    this.element.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });

    // Mode toggle
    this.element.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => this.setMode(btn.dataset.mode));
    });

    // Encoder
    this.convertBtn.addEventListener('click', () => this.convert());
    this.urlInput.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.convert();
      }
    });
    this.urlInput.addEventListener('input', () => {
      this.currentInput = this.urlInput.value;
    });

    // Encoder utility buttons
    this.element.querySelector('#clear-btn').addEventListener('click', () => {
      this.urlInput.value = '';
      this.currentInput = '';
      this.currentOutput = '';
      this.urlOutput.innerHTML = '<div class="dt-empty">Output will appear here...</div>';
      this.outputSize.textContent = '0 bytes';
      this.clearError();
    });
    this.element.querySelector('#load-sample-btn').addEventListener('click', () => this.loadSample());
    this.element.querySelector('#copy-btn').addEventListener('click', () => this.copy());

    // Query params
    this.parseQueryBtn.addEventListener('click', () => this.parseQueryParams());
    this.queryUrlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.parseQueryParams();
    });

    // ObjectId
    this.decodeObjectidBtn.addEventListener('click', () => this.decodeObjectId());
    this.objectidInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.decodeObjectId();
    });
  }

  switchTab(tab) {
    // Update tab buttons
    this.element.querySelectorAll('[data-tab]').forEach(btn => {
      const active = btn.dataset.tab === tab;
      btn.className = active ? 'dt-seg-btn dt-seg-btn-active' : 'dt-seg-btn';
    });

    // Show/hide panels
    this.encoderPanel.classList.toggle('hidden', tab !== 'encoder');
    this.queryPanel.classList.toggle('hidden', tab !== 'query');
    this.objectidPanel.classList.toggle('hidden', tab !== 'objectid');
  }

  setMode(mode) {
    this.mode = mode;
    const isEncode = mode === 'encode';

    this.element.querySelectorAll('[data-mode]').forEach(btn => {
      const active = btn.dataset.mode === mode;
      btn.className = active ? 'dt-seg-btn dt-seg-btn-active' : 'dt-seg-btn';
    });

    this.urlInputLabel.textContent = isEncode ? 'Text Input' : 'URL-encoded Input';
    this.urlOutputLabel.textContent = isEncode ? 'Encoded Output' : 'Decoded Output';
    this.urlInput.placeholder = isEncode ? 'Enter text or URL to encode...' : 'Enter URL-encoded string...';
    this.convertBtn.textContent = isEncode ? 'Encode' : 'Decode';
    this.clearOutput();
  }

  convert() {
    const input = this.urlInput.value;
    if (!input) {
      this.showError('Please enter some input.');
      return;
    }

    try {
      const result = this.mode === 'encode' ? encodeURIComponent(input) : decodeURIComponent(input);
      this.currentOutput = result;
      this.urlOutput.innerHTML = this.escapeHtml(result);
      this.outputSize.textContent = this.formatBytes(new Blob([result]).size);
      this.clearError();
    } catch (error) {
      this.showError(error.message);
    }
  }

  loadSample() {
    if (this.mode === 'encode') {
      this.urlInput.value = 'https://example.com/search?q=hello world&lang=en&tags=js,css&emoji=🎉';
    } else {
      this.urlInput.value = 'https%3A%2F%2Fexample.com%2Fsearch%3Fq%3Dhello%20world%26lang%3Den';
    }
    this.currentInput = this.urlInput.value;
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

  showError(message) {
    this.errorContainer.classList.remove('hidden');
    this.errorMessage.textContent = message;
  }

  clearError() {
    this.errorContainer.classList.add('hidden');
  }

  clearOutput() {
    this.urlOutput.innerHTML = '<div class="dt-empty">Output will appear here...</div>';
    this.currentOutput = '';
    this.outputSize.textContent = '0 bytes';
  }

  /* ----- Query Params ----- */

  parseQueryParams() {
    const url = this.queryUrlInput.value.trim();
    if (!url) {
      this.queryOutput.innerHTML = '<p class="dt-box p-3! text-[13px] text-amber-600 dark:text-amber-400">Enter a URL to parse.</p>';
      return;
    }

    try {
      let queryString;
      if (url.includes('?')) {
        queryString = url.split('?').slice(1).join('?');
      } else {
        queryString = url;
      }

      const params = new URLSearchParams(queryString);
      const entries = [...params.entries()];

      if (entries.length === 0) {
        this.queryOutput.innerHTML = '<p class="dt-empty text-sm">No query parameters found.</p>';
        return;
      }

      let html = `
        <div class="mb-3">
          <p class="dt-label mb-1.5">${entries.length} parameter${entries.length > 1 ? 's' : ''} found</p>
          <div class="overflow-x-auto">
            <div class="dt-card overflow-hidden p-0!">
              <table class="min-w-full text-[13.5px] border-collapse">
                <thead>
                  <tr class="bg-(--surface-2)">
                    <th class="text-left px-3.5 py-2.5 font-medium dt-text-2 border-b border-(--border)">Key</th>
                    <th class="text-left px-3.5 py-2.5 font-medium dt-text-2 border-b border-(--border)">Value</th>
                  </tr>
                </thead>
                <tbody>
      `;

      for (const [key, value] of entries) {
        html += `
          <tr class="border-b border-(--border) last:border-0">
            <td class="px-3.5 py-2.5 font-mono dt-accent">${this.escapeHtml(key)}</td>
            <td class="px-3.5 py-2.5 font-mono">${this.escapeHtml(value)}</td>
          </tr>
        `;
      }

      html += '</tbody></table></div></div>';

      // JSON representation
      const obj = {};
      entries.forEach(([key, value]) => {
        if (obj[key]) {
          if (!Array.isArray(obj[key])) obj[key] = [obj[key]];
          obj[key].push(value);
        } else {
          obj[key] = value;
        }
      });

      html += `
        <div class="mt-4">
          <p class="dt-label mb-1.5">JSON representation:</p>
          <pre class="dt-field w-auto! overflow-x-auto">${this.escapeHtml(JSON.stringify(obj, null, 2))}</pre>
        </div>
      `;

      this.queryOutput.innerHTML = html;
    } catch (error) {
      this.queryOutput.innerHTML = `<p class="text-[13px] text-red-600 dark:text-red-400">Failed to parse: ${this.escapeHtml(error.message)}</p>`;
    }
  }

  /* ----- ObjectId Decoder ----- */

  decodeObjectId() {
    const input = this.objectidInput.value.trim();

    // Validate: must be 24 hex chars
    if (!/^[0-9a-fA-F]{24}$/.test(input)) {
      this.objectidOutput.innerHTML = `
        <div class="dt-box dt-box-error">
          <span class="text-red-500 dark:text-red-400">${icon('alert-circle', 18)}</span>
          <p class="text-[13px] text-red-600 dark:text-red-400">Invalid ObjectId. Must be exactly 24 hexadecimal characters (0-9, a-f).</p>
        </div>
      `;
      return;
    }

    const hex = input.toLowerCase();

    // Parse components
    const timestampHex = hex.substring(0, 8);
    const timestampSeconds = parseInt(timestampHex, 16);
    const timestamp = new Date(timestampSeconds * 1000);

    const machineHex = hex.substring(8, 14);
    const processHex = hex.substring(14, 18);
    const counterHex = hex.substring(18, 24);

    // Format values
    const machine = parseInt(machineHex, 16);
    const processId = parseInt(processHex, 16);
    const counter = parseInt(counterHex, 16);

    let html = `
      <div class="dt-panel p-4 space-y-4">
        <div class="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          ${icon('check-circle', 17)}
          <span class="text-sm font-medium">Valid MongoDB ObjectId</span>
        </div>

        <div class="space-y-3.5">
          <div>
            <span class="dt-meta">Timestamp (4 bytes)</span>
            <div class="mt-1 flex flex-wrap items-baseline gap-2">
              <span class="font-mono text-[13.5px]">${timestampHex}</span>
              <span class="dt-text-3">→</span>
              <span class="text-[13.5px]">${timestamp.toLocaleString()}</span>
              <span class="dt-meta">(UTC: ${timestamp.toISOString()})</span>
            </div>
          </div>

          <div>
            <span class="dt-meta">Machine Identifier (3 bytes)</span>
            <div class="mt-1 flex flex-wrap items-baseline gap-2">
              <span class="font-mono text-[13.5px]">${machineHex}</span>
              <span class="dt-text-3">→</span>
              <span class="text-[13.5px]">${machine} (decimal)</span>
            </div>
          </div>

          <div>
            <span class="dt-meta">Process ID (2 bytes)</span>
            <div class="mt-1 flex flex-wrap items-baseline gap-2">
              <span class="font-mono text-[13.5px]">${processHex}</span>
              <span class="dt-text-3">→</span>
              <span class="text-[13.5px]">${processId}</span>
            </div>
          </div>

          <div>
            <span class="dt-meta">Counter (3 bytes)</span>
            <div class="mt-1 flex flex-wrap items-baseline gap-2">
              <span class="font-mono text-[13.5px]">${counterHex}</span>
              <span class="dt-text-3">→</span>
              <span class="text-[13.5px]">${counter}</span>
            </div>
          </div>
        </div>

        <div class="border-t border-(--border) pt-3.5">
          <span class="dt-meta">Raw hex breakdown</span>
          <div class="mt-1.5 font-mono text-xs">
            <span class="dt-accent">${timestampHex}</span><span class="text-emerald-600 dark:text-emerald-400">${machineHex}</span><span class="text-amber-600 dark:text-amber-400">${processHex}</span><span class="text-fuchsia-600 dark:text-fuchsia-400">${counterHex}</span>
          </div>
        </div>
      </div>
    `;

    this.objectidOutput.innerHTML = html;
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
    // Cleanup
  }
}
