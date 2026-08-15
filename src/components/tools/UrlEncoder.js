/**
 * URL Encoder/Decoder Tool Island
 * URL encode/decode, query parameter editor, and MongoDB ObjectId decoder
 */

import { escapeHtml } from "../../utils/escape-html.ts";

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
        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1 inline-flex">
          <button id="tab-encoder" class="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white" data-tab="encoder">URL Encode/Decode</button>
          <button id="tab-query" class="px-4 py-2 text-sm font-medium rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" data-tab="query">Query Params</button>
          <button id="tab-objectid" class="px-4 py-2 text-sm font-medium rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" data-tab="objectid">ObjectId Decoder</button>
        </div>

        <!-- URL Encode/Decode Panel -->
        <div id="panel-encoder" class="space-y-4">
          <!-- Mode toggle -->
          <div class="flex items-center space-x-3">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Mode:</span>
            <div class="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5">
              <button id="mode-encode" class="px-4 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white" data-mode="encode">Encode</button>
              <button id="mode-decode" class="px-4 py-1.5 text-sm font-medium rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" data-mode="decode">Decode</button>
            </div>
          </div>

          <!-- Input -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label for="url-input" id="url-input-label" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Text Input</label>
              <div class="flex items-center space-x-2">
                <button id="load-sample-btn" class="px-3 py-1.5 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded transition-colors">Load Sample</button>
                <button id="clear-btn" class="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors">Clear</button>
              </div>
            </div>
            <textarea id="url-input" class="w-full h-40 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter URL or text..." spellcheck="false"></textarea>
          </div>

          <!-- Convert -->
          <button id="convert-btn" class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">Encode</button>

          <!-- Error -->
          <div id="error-container" class="hidden bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p id="error-message" class="text-sm text-red-700 dark:text-red-300"></p>
          </div>

          <!-- Output -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label id="url-output-label" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Encoded Output</label>
              <div class="flex items-center space-x-2">
                <span id="output-size" class="text-sm text-gray-500 dark:text-gray-400">0 bytes</span>
                <button id="copy-btn" class="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors">Copy</button>
              </div>
            </div>
            <div id="url-output" class="w-full min-h-32 max-h-64 overflow-auto px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 font-mono text-sm whitespace-pre-wrap break-all">
              <div class="text-gray-500 dark:text-gray-400 italic">Output will appear here...</div>
            </div>
          </div>
        </div>

        <!-- Query Params Panel -->
        <div id="panel-query" class="hidden space-y-4">
          <div class="space-y-2">
            <label for="query-url-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300">URL with Query Parameters</label>
            <input id="query-url-input" type="text" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="https://example.com/path?name=Alice&age=30" />
          </div>
          <button id="parse-query-btn" class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">Parse Query Params</button>
          <div id="query-output" class="space-y-2">
            <div class="text-gray-500 dark:text-gray-400 text-sm italic">Enter a URL and click Parse to see the parameters...</div>
          </div>
        </div>

        <!-- ObjectId Decoder Panel -->
        <div id="panel-objectid" class="hidden space-y-4">
          <div class="space-y-2">
            <label for="objectid-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300">MongoDB ObjectId (24 hex characters)</label>
            <div class="flex gap-3">
              <input id="objectid-input" type="text" class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="507f1f77bcf86cd799439011" />
              <button id="decode-objectid-btn" class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors whitespace-nowrap">Decode</button>
            </div>
          </div>
          <div id="objectid-output" class="space-y-2">
            <div class="text-gray-500 dark:text-gray-400 text-sm italic">Enter an ObjectId to decode its components...</div>
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
      this.urlOutput.innerHTML = '<div class="text-gray-500 dark:text-gray-400 italic">Output will appear here...</div>';
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
      btn.className = `px-4 py-2 text-sm font-medium rounded-md ${active ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`;
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
      btn.className = `px-4 py-1.5 text-sm font-medium rounded-md ${active ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`;
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
    this.urlOutput.innerHTML = '<div class="text-gray-500 dark:text-gray-400 italic">Output will appear here...</div>';
    this.currentOutput = '';
    this.outputSize.textContent = '0 bytes';
  }

  /* ----- Query Params ----- */

  parseQueryParams() {
    const url = this.queryUrlInput.value.trim();
    if (!url) {
      this.queryOutput.innerHTML = '<p class="text-sm text-yellow-600 dark:text-yellow-400">Enter a URL to parse.</p>';
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
        this.queryOutput.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">No query parameters found.</p>';
        return;
      }

      let html = `
        <div class="mb-3">
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">${entries.length} parameter${entries.length > 1 ? 's' : ''} found</p>
          <div class="overflow-x-auto">
            <table class="min-w-full text-sm border-collapse border border-gray-200 dark:border-gray-700 rounded-lg">
              <thead>
                <tr class="bg-gray-100 dark:bg-gray-900/50">
                  <th class="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">Key</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">Value</th>
                </tr>
              </thead>
              <tbody>
      `;

      for (const [key, value] of entries) {
        html += `
          <tr class="border-b border-gray-100 dark:border-gray-800">
            <td class="px-3 py-2 font-mono text-blue-600 dark:text-blue-400">${this.escapeHtml(key)}</td>
            <td class="px-3 py-2 font-mono text-gray-900 dark:text-gray-100">${this.escapeHtml(value)}</td>
          </tr>
        `;
      }

      html += '</tbody></table></div>';

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
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">JSON representation:</p>
          <pre class="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 text-sm font-mono text-gray-900 dark:text-gray-100 overflow-x-auto">${this.escapeHtml(JSON.stringify(obj, null, 2))}</pre>
        </div>
      `;

      this.queryOutput.innerHTML = html;
    } catch (error) {
      this.queryOutput.innerHTML = `<p class="text-sm text-red-600 dark:text-red-400">Failed to parse: ${this.escapeHtml(error.message)}</p>`;
    }
  }

  /* ----- ObjectId Decoder ----- */

  decodeObjectId() {
    const input = this.objectidInput.value.trim();

    // Validate: must be 24 hex chars
    if (!/^[0-9a-fA-F]{24}$/.test(input)) {
      this.objectidOutput.innerHTML = `
        <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p class="text-sm text-red-700 dark:text-red-300">Invalid ObjectId. Must be exactly 24 hexadecimal characters (0-9, a-f).</p>
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
      <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <div class="flex items-center space-x-2 text-green-600 dark:text-green-400 mb-2">
          <span class="text-lg">✅</span>
          <span class="text-sm font-medium">Valid MongoDB ObjectId</span>
        </div>

        <div class="space-y-3">
          <div>
            <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Timestamp (4 bytes)</span>
            <div class="mt-1">
              <span class="font-mono text-sm text-gray-900 dark:text-gray-100">${timestampHex}</span>
              <span class="mx-2 text-gray-400">→</span>
              <span class="text-sm text-gray-900 dark:text-gray-100">${timestamp.toLocaleString()}</span>
              <span class="text-xs text-gray-500 dark:text-gray-400 ml-2">(UTC: ${timestamp.toISOString()})</span>
            </div>
          </div>

          <div>
            <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Machine Identifier (3 bytes)</span>
            <div class="mt-1">
              <span class="font-mono text-sm text-gray-900 dark:text-gray-100">${machineHex}</span>
              <span class="mx-2 text-gray-400">→</span>
              <span class="text-sm text-gray-900 dark:text-gray-100">${machine} (decimal)</span>
            </div>
          </div>

          <div>
            <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Process ID (2 bytes)</span>
            <div class="mt-1">
              <span class="font-mono text-sm text-gray-900 dark:text-gray-100">${processHex}</span>
              <span class="mx-2 text-gray-400">→</span>
              <span class="text-sm text-gray-900 dark:text-gray-100">${processId}</span>
            </div>
          </div>

          <div>
            <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Counter (3 bytes)</span>
            <div class="mt-1">
              <span class="font-mono text-sm text-gray-900 dark:text-gray-100">${counterHex}</span>
              <span class="mx-2 text-gray-400">→</span>
              <span class="text-sm text-gray-900 dark:text-gray-100">${counter}</span>
            </div>
          </div>
        </div>

        <div class="pt-3 border-t border-gray-200 dark:border-gray-700">
          <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Raw hex breakdown</span>
          <div class="mt-1 font-mono text-xs text-gray-900 dark:text-gray-100">
            <span class="text-blue-600 dark:text-blue-400">${timestampHex}</span><span class="text-green-600 dark:text-green-400">${machineHex}</span><span class="text-yellow-600 dark:text-yellow-400">${processHex}</span><span class="text-purple-600 dark:text-purple-400">${counterHex}</span>
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
