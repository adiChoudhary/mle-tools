/**
 * JSON Formatter Tool Island
 * Handles JSON validation, beautification, minification, and tree view
 */

import { WorkerOperation } from "../../utils/worker-interface.ts";
import { WorkerPool } from "../../utils/worker-pool.ts";
import { checkMemoryLimit } from "../../utils/memory.ts";

export class JsonFormatter {
  constructor(element) {
    this.element = element;
    this.workerPool = new WorkerPool();
    this.maxMemoryMB = 50;

    // DOM elements
    this.inputTextarea = null;
    this.outputContainer = null;
    this.errorContainer = null;
    this.sizeDisplay = null;
    this.formatButtons = null;

    // State
    this.currentInput = '';
    this.currentOutput = '';
    this.isProcessing = false;
    this.compareMode = false;
    this.compareInput = '';
  }

  async init() {
    this.render();
    this.bindEvents();
    await this.workerPool.init();
  }

  render() {
    this.element.innerHTML = `
      <div class="space-y-6">
        <!-- Input Section -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label for="json-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              JSON Input
            </label>
            <div class="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <span id="input-size">0 bytes</span>
              <span id="memory-status" class="hidden px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded text-xs">
                Memory limit exceeded
              </span>
            </div>
          </div>
          <textarea
            id="json-input"
            class="w-full h-64 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                   font-mono text-sm resize-y focus:ring-2 focus:ring-blue-500 focuser-transparent"
            placeholder="Paste your JSON here..."
            spellcheck="false"
          ></textarea>
        </div>

        <!-- Format Controls -->
        <div class="flex flex-wrap items-center gap-3">
          <button
            id="beautify-btn"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                   disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Beautify
          </button>
          <button
            id="minify-btn"
            class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg
                   disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Minify
          </button>
          <button
            id="validate-btn"
            class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg
                   disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Validate Only
          </button>
          <button
            id="tree-view-btn"
            class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg
                   disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Tree View
          </button>
          <button
            id="escape-btn"
            class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg
                   disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Escape
          </button>
          <button
            id="unescape-btn"
            class="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg
                   disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Unescape
          </button>
          <button
            id="compare-btn"
            class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg
                   disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Compare Mode
          </button>
          <button
            id="clear-btn"
            class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Clear
          </button>

          <!-- Indent Options -->
          <div class="flex items-center space-x-2 ml-auto">
            <label for="indent-select" class="text-sm text-gray-700 dark:text-gray-300">Indent:</label>
            <select
              id="indent-select"
              class="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="2">2 spaces</option>
              <option value="4">4 spaces</option>
              <option value="tab">Tab</option>
            </select>
          </div>
        </div>

        <!-- Comparison Mode (initially hidden) -->
        <div id="compare-container" class="hidden space-y-4">
          <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 class="text-sm font-medium text-blue-800 dark:text-blue-200 mb-3">JSON Comparison Mode</h3>
            <p class="text-sm text-blue-700 dark:text-blue-300 mb-4">
              Compare two JSON objects to see the differences. The first input above is JSON A, enter JSON B below.
            </p>

            <div class="space-y-2">
              <label for="json-compare-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                JSON B (for comparison)
              </label>
              <textarea
                id="json-compare-input"
                class="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                       font-mono text-sm resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Paste second JSON here for comparison..."
                spellcheck="false"
              ></textarea>
            </div>

            <div class="flex items-center space-x-3 mt-4">
              <button
                id="run-compare-btn"
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                       disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Compare JSONs
              </button>
              <button
                id="exit-compare-btn"
                class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Exit Compare Mode
              </button>
            </div>
          </div>
        </div>

        <!-- Processing Indicator -->
        <div id="processing-indicator" class="hidden">
          <div class="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
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
              <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800 dark:text-red-200">
                JSON Error
              </h3>
              <p id="error-message" class="mt-1 text-sm text-red-700 dark:text-red-300"></p>
            </div>
          </div>
        </div>

        <!-- Output Section -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label for="json-output" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Formatted Output
            </label>
            <div class="flex items-center space-x-2">
              <span id="output-size" class="text-sm text-gray-500 dark:text-gray-400">0 bytes</span>
              <button
                id="copy-btn"
                class="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600
                       text-gray-700 dark:text-gray-300 rounded transition-colors"
              >
                Copy
              </button>
              <button
                id="download-btn"
                class="px-3 py-1 text-sm bg-green-100 hover:bg-green-200 dark:bg-green-700 dark:hover:bg-green-600
                       text-green-700 dark:text-green-300 rounded transition-colors"
              >
                Download
              </button>
            </div>
          </div>
          <div
            id="json-output"
            class="w-full min-h-64 max-h-96 overflow-auto px-3 py-2 border border-gray-300 dark:border-gray-700
                   rounded-lg bg-gray-50 dark:bg-gray-800 font-mono text-sm"
          >
            <div class="text-gray-500 dark:text-gray-400 italic">
              Enter JSON above and click a format button to see the result here...
            </div>
          </div>
        </div>
      </div>
    `;

    // Get DOM references
    this.inputTextarea = this.element.querySelector('#json-input');
    this.outputContainer = this.element.querySelector('#json-output');
    this.errorContainer = this.element.querySelector('#error-container');
    this.processingIndicator = this.element.querySelector('#processing-indicator');
    this.inputSizeDisplay = this.element.querySelector('#input-size');
    this.outputSizeDisplay = this.element.querySelector('#output-size');
    this.memoryStatus = this.element.querySelector('#memory-status');

    this.beautifyBtn = this.element.querySelector('#beautify-btn');
    this.minifyBtn = this.element.querySelector('#minify-btn');
    this.validateBtn = this.element.querySelector('#validate-btn');
    this.treeViewBtn = this.element.querySelector('#tree-view-btn');
    this.escapeBtn = this.element.querySelector('#escape-btn');
    this.unescapeBtn = this.element.querySelector('#unescape-btn');
    this.compareBtn = this.element.querySelector('#compare-btn');
    this.clearBtn = this.element.querySelector('#clear-btn');
    this.copyBtn = this.element.querySelector('#copy-btn');
    this.downloadBtn = this.element.querySelector('#download-btn');
    this.indentSelect = this.element.querySelector('#indent-select');

    // Compare mode elements
    this.compareContainer = this.element.querySelector('#compare-container');
    this.compareInput = this.element.querySelector('#json-compare-input');
    this.runCompareBtn = this.element.querySelector('#run-compare-btn');
    this.exitCompareBtn = this.element.querySelector('#exit-compare-btn');
  }

  bindEvents() {
    // Input change handler
    this.inputTextarea.addEventListener('input', this.handleInputChange.bind(this));

    // Format button handlers
    this.beautifyBtn.addEventListener('click', () => this.formatJSON('beautify'));
    this.minifyBtn.addEventListener('click', () => this.formatJSON('minify'));
    this.validateBtn.addEventListener('click', () => this.formatJSON('validate'));
    this.treeViewBtn.addEventListener('click', () => this.formatJSON('tree'));
    this.escapeBtn.addEventListener('click', () => this.formatJSON('escape'));
    this.unescapeBtn.addEventListener('click', () => this.formatJSON('unescape'));

    // Compare mode handlers
    this.compareBtn.addEventListener('click', this.toggleCompareMode.bind(this));
    this.runCompareBtn.addEventListener('click', this.compareJSONs.bind(this));
    this.exitCompareBtn.addEventListener('click', this.exitCompareMode.bind(this));

    // Utility button handlers
    this.clearBtn.addEventListener('click', this.clearAll.bind(this));
    this.copyBtn.addEventListener('click', this.copyOutput.bind(this));
    this.downloadBtn.addEventListener('click', this.downloadOutput.bind(this));

    // Keyboard shortcuts
    this.inputTextarea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.formatJSON('beautify');
      }
    });
  }

  handleInputChange() {
    const input = this.inputTextarea.value.trim();
    const inputChanged = input !== this.currentInput;
    this.currentInput = input;

    // Update input size display
    const sizeBytes = new Blob([input]).size;
    this.inputSizeDisplay.textContent = this.formatBytes(sizeBytes);

    // Check memory limit
    const exceedsLimit = !checkMemoryLimit(input);
    this.memoryStatus.classList.toggle('hidden', !exceedsLimit);

    // Disable buttons if memory limit exceeded
    const buttons = [this.beautifyBtn, this.minifyBtn, this.validateBtn, this.treeViewBtn];
    buttons.forEach(btn => btn.disabled = exceedsLimit);

    // Clear previous output and errors when input changes
    if (inputChanged) {
      this.clearOutput();
      this.clearError();
    }
  }

  async formatJSON(operation) {
    if (this.isProcessing || !this.currentInput) return;

    this.setProcessing(true);
    this.clearError();

    try {
      const indentValue = this.indentSelect.value;
      const indent = indentValue === 'tab' ? '\t' : parseInt(indentValue);

      let workerOperation;
      let options = { indent };

      switch (operation) {
        case 'beautify':
          workerOperation = WorkerOperation.JSON_BEAUTIFY;
          break;
        case 'minify':
          workerOperation = WorkerOperation.JSON_MINIFY;
          break;
        case 'validate':
          workerOperation = WorkerOperation.JSON_PARSE;
          break;
        case 'tree':
          // Tree view is handled locally
          this.generateTreeView();
          return;
        case 'escape':
          // Escape JSON strings
          this.escapeJSONStrings();
          return;
        case 'unescape':
          // Unescape JSON strings
          this.unescapeJSONStrings();
          return;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      // Determine if we need a worker (>10MB)
      const needsWorker = new Blob([this.currentInput]).size > 10 * 1024 * 1024;

      let result;
      if (needsWorker) {
        result = await this.processWithWorker(workerOperation, {
          data: this.currentInput,
          options
        });
      } else {
        result = this.processSync(workerOperation, this.currentInput, options);
      }

      this.displayResult(result, operation);

    } catch (error) {
      this.displayError(error.message);
    } finally {
      this.setProcessing(false);
    }
  }

  async processWithWorker(operation, input) {
    return new Promise((resolve, reject) => {
      const worker = this.workerPool.getWorker();
      const operationId = `json_${Date.now()}`;

      const timeout = setTimeout(() => {
        reject(new Error('Operation timed out'));
      }, 30000); // 30 second timeout

      const messageHandler = (event) => {
        if (event.data.id === operationId) {
          worker.removeEventListener('message', messageHandler);
          clearTimeout(timeout);

          if (event.data.success) {
            resolve(event.data.result);
          } else {
            reject(new Error(event.data.error || 'Worker processing failed'));
          }
        }
      };

      worker.addEventListener('message', messageHandler);
      worker.postMessage({
        id: operationId,
        operation,
        input
      });
    });
  }

  processSync(operation, data, options) {
    try {
      switch (operation) {
        case WorkerOperation.JSON_PARSE:
          JSON.parse(data); // Validate
          return {
            result: data,
            isValid: true,
            size: data.length
          };

        case WorkerOperation.JSON_BEAUTIFY:
          const parsed = JSON.parse(data);
          const beautified = JSON.stringify(parsed, null, options.indent);
          return {
            result: beautified,
            isValid: true,
            size: beautified.length
          };

        case WorkerOperation.JSON_MINIFY:
          const minified = JSON.stringify(JSON.parse(data));
          return {
            result: minified,
            isValid: true,
            size: minified.length
          };

        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }
    } catch (error) {
      return {
        result: '',
        isValid: false,
        error: error.message,
        size: 0
      };
    }
  }

  generateTreeView() {
    try {
      const parsed = JSON.parse(this.currentInput);
      const treeHTML = this.renderJsonTree(parsed);

      this.outputContainer.innerHTML = `
        <div class="json-tree">
          ${treeHTML}
        </div>
      `;

      this.outputSizeDisplay.textContent = this.formatBytes(this.outputContainer.textContent.length);

    } catch (error) {
      this.displayError(error.message);
    }
  }

  renderJsonTree(obj, level = 0) {
    const indent = '  '.repeat(level);

    if (obj === null) {
      return `<span class="text-gray-500">null</span>`;
    }

    if (typeof obj === 'string') {
      return `<span class="text-green-600 dark:text-green-400">"${this.escapeHtml(obj)}"</span>`;
    }

    if (typeof obj === 'number') {
      return `<span class="text-blue-600 dark:text-blue-400">${obj}</span>`;
    }

    if (typeof obj === 'boolean') {
      return `<span class="text-purple-600 dark:text-purple-400">${obj}</span>`;
    }

    if (Array.isArray(obj)) {
      if (obj.length === 0) {
        return `<span class="text-gray-600 dark:text-gray-400">[]</span>`;
      }

      let html = `<span class="text-gray-600 dark:text-gray-400">[</span>\n`;
      obj.forEach((item, index) => {
        html += `${indent}  ${this.renderJsonTree(item, level + 1)}`;
        if (index < obj.length - 1) {
          html += `<span class="text-gray-600 dark:text-gray-400">,</span>`;
        }
        html += '\n';
      });
      html += `${indent}<span class="text-gray-600 dark:text-gray-400">]</span>`;
      return html;
    }

    if (typeof obj === 'object') {
      const keys = Object.keys(obj);
      if (keys.length === 0) {
        return `<span class="text-gray-600 dark:text-gray-400">{}</span>`;
      }

      let html = `<span class="text-gray-600 dark:text-gray-400">{</span>\n`;
      keys.forEach((key, index) => {
        html += `${indent}  <span class="text-red-600 dark:text-red-400">"${this.escapeHtml(key)}"</span>: ${this.renderJsonTree(obj[key], level + 1)}`;
        if (index < keys.length - 1) {
          html += `<span class="text-gray-600 dark:text-gray-400">,</span>`;
        }
        html += '\n';
      });
      html += `${indent}<span class="text-gray-600 dark:text-gray-400">}</span>`;
      return html;
    }

    return String(obj);
  }

  escapeJSONStrings() {
    if (!this.currentInput) return;

    this.clearError();
    const escaped = JSON.stringify(this.currentInput);
    this.outputContainer.innerHTML = `<pre class="whitespace-pre-wrap text-gray-900 dark:text-gray-100">${this.escapeHtml(escaped)}</pre>`;
    this.currentOutput = escaped;
    this.outputSizeDisplay.textContent = this.formatBytes(new Blob([escaped]).size);
  }

  unescapeJSONStrings() {
    if (!this.currentInput) return;

    this.clearError();
    const input = this.currentInput.trim();
    let unescaped;

    try {
      // Case 1: input is a quoted JSON string literal, e.g. "hello \"world\""
      const parsed = JSON.parse(input);
      unescaped = typeof parsed === 'string' ? parsed : input;
    } catch {
      // Case 2: input is an escaped payload without surrounding quotes
      try {
        unescaped = JSON.parse(`"${input}"`);
      } catch (error) {
        this.displayError(`Not a valid escaped JSON string: ${error.message}`);
        return;
      }
    }

    this.outputContainer.innerHTML = `<pre class="whitespace-pre-wrap text-gray-900 dark:text-gray-100">${this.escapeHtml(unescaped)}</pre>`;
    this.currentOutput = unescaped;
    this.outputSizeDisplay.textContent = this.formatBytes(new Blob([unescaped]).size);
  }

  toggleCompareMode() {
    if (this.compareMode) {
      this.exitCompareMode();
      return;
    }

    this.compareMode = true;
    this.compareContainer.classList.remove('hidden');
    this.compareBtn.textContent = 'Exit Compare';

    // Single-document operations are not available in compare mode
    const buttons = [this.beautifyBtn, this.minifyBtn, this.validateBtn, this.treeViewBtn, this.escapeBtn, this.unescapeBtn];
    buttons.forEach(btn => btn.disabled = true);

    this.compareInput.focus();
  }

  exitCompareMode() {
    this.compareMode = false;
    this.compareContainer.classList.add('hidden');
    this.compareBtn.textContent = 'Compare Mode';
    this.compareInput.value = '';

    const buttons = [this.beautifyBtn, this.minifyBtn, this.validateBtn, this.treeViewBtn, this.escapeBtn, this.unescapeBtn];
    buttons.forEach(btn => btn.disabled = false);

    this.clearOutput();
  }

  collectDiffs(a, b, path, out) {
    if (Object.is(a, b)) return;

    const bothObjects =
      a !== null && b !== null &&
      typeof a === 'object' && typeof b === 'object' &&
      Array.isArray(a) === Array.isArray(b);

    if (!bothObjects) {
      out.changed.push({ path: path || '$', a, b });
      return;
    }

    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    keys.forEach(key => {
      const p = path ? `${path}.${key}` : key;
      if (!(key in a)) {
        out.added.push({ path: p, value: b[key] });
      } else if (!(key in b)) {
        out.removed.push({ path: p, value: a[key] });
      } else {
        this.collectDiffs(a[key], b[key], p, out);
      }
    });
  }

  compareJSONs() {
    const a = this.currentInput.trim();
    const b = this.compareInput.value.trim();

    if (!a || !b) {
      this.displayError('Enter JSON in both the main input (A) and the comparison input (B) to compare.');
      return;
    }

    this.clearError();

    let parsedA, parsedB;
    try {
      parsedA = JSON.parse(a);
    } catch (error) {
      this.displayError(`JSON A is invalid: ${error.message}`);
      return;
    }
    try {
      parsedB = JSON.parse(b);
    } catch (error) {
      this.displayError(`JSON B is invalid: ${error.message}`);
      return;
    }

    const diff = { added: [], removed: [], changed: [] };
    this.collectDiffs(parsedA, parsedB, '', diff);

    if (!diff.added.length && !diff.removed.length && !diff.changed.length) {
      this.outputContainer.innerHTML = `
        <div class="flex items-center space-x-2 text-green-600 dark:text-green-400">
          <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
          <span>Both JSON objects are identical.</span>
        </div>`;
      this.currentOutput = '';
      this.outputSizeDisplay.textContent = '0 bytes';
      return;
    }

    const fmt = (v) => (typeof v === 'string' ? `"${v}"` : JSON.stringify(v));
    const text = [];
    let html = '<ul class="space-y-1 text-sm">';

    diff.added.forEach(item => {
      text.push(`+ ${item.path}: ${fmt(item.value)}`);
      html += `<li class="text-green-700 dark:text-green-300"><code class="font-mono">${this.escapeHtml(item.path)}</code> <span class="text-gray-500 dark:text-gray-400">added</span>: ${this.escapeHtml(fmt(item.value))}</li>`;
    });

    diff.removed.forEach(item => {
      text.push(`- ${item.path}: ${fmt(item.value)}`);
      html += `<li class="text-red-700 dark:text-red-300"><code class="font-mono">${this.escapeHtml(item.path)}</code> <span class="text-gray-500 dark:text-gray-400">removed</span>: ${this.escapeHtml(fmt(item.value))}</li>`;
    });

    diff.changed.forEach(item => {
      text.push(`~ ${item.path}: ${fmt(item.a)} -> ${fmt(item.b)}`);
      html += `<li class="text-yellow-700 dark:text-yellow-300"><code class="font-mono">${this.escapeHtml(item.path)}</code> <span class="text-gray-500 dark:text-gray-400">changed</span>: ${this.escapeHtml(fmt(item.a))} &rarr; ${this.escapeHtml(fmt(item.b))}</li>`;
    });

    html += '</ul>';

    this.outputContainer.innerHTML = `
      <div class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        ${diff.added.length} added, ${diff.removed.length} removed, ${diff.changed.length} changed
      </div>
      ${html}`;
    this.currentOutput = text.join('\n');
    this.outputSizeDisplay.textContent = this.formatBytes(new Blob([this.currentOutput]).size);
  }

  displayResult(result, operation) {
    if (!result.isValid) {
      this.displayError(result.error || 'Invalid JSON');
      return;
    }

    if (operation === 'validate') {
      this.outputContainer.innerHTML = `
        <div class="flex items-center space-x-2 text-green-600 dark:text-green-400">
          <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
          <span>Valid JSON (${this.formatBytes(result.size)})</span>
        </div>
      `;
    } else {
      this.outputContainer.innerHTML = `<pre class="whitespace-pre-wrap text-gray-900 dark:text-gray-100">${this.escapeHtml(result.result)}</pre>`;
    }

    this.currentOutput = result.result;
    this.outputSizeDisplay.textContent = this.formatBytes(result.size);
  }

  displayError(message) {
    this.errorContainer.classList.remove('hidden');
    this.element.querySelector('#error-message').textContent = message;
    this.clearOutput();
  }

  clearError() {
    this.errorContainer.classList.add('hidden');
  }

  clearOutput() {
    this.outputContainer.innerHTML = `
      <div class="text-gray-500 dark:text-gray-400 italic">
        Enter JSON above and click a format button to see the result here...
      </div>
    `;
    this.currentOutput = '';
    this.outputSizeDisplay.textContent = '0 bytes';
  }

  clearAll() {
    this.inputTextarea.value = '';
    this.currentInput = '';
    this.inputSizeDisplay.textContent = '0 bytes';
    this.memoryStatus.classList.add('hidden');
    this.clearOutput();
    this.clearError();

    // Re-enable buttons
    const buttons = [this.beautifyBtn, this.minifyBtn, this.validateBtn, this.treeViewBtn];
    buttons.forEach(btn => btn.disabled = false);
  }

  async copyOutput() {
    if (!this.currentOutput) return;

    try {
      await navigator.clipboard.writeText(this.currentOutput);

      // Visual feedback
      const originalText = this.copyBtn.textContent;
      this.copyBtn.textContent = 'Copied!';
      this.copyBtn.classList.add('text-green-600');

      setTimeout(() => {
        this.copyBtn.textContent = originalText;
        this.copyBtn.classList.remove('text-green-600');
      }, 2000);

    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }

  downloadOutput() {
    if (!this.currentOutput) return;

    const blob = new Blob([this.currentOutput], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'devtoolbox-output.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  setProcessing(isProcessing) {
    this.isProcessing = isProcessing;

    // Toggle processing indicator
    this.processingIndicator.classList.toggle('hidden', !isProcessing);

    // Disable buttons during processing
    const buttons = [this.beautifyBtn, this.minifyBtn, this.validateBtn, this.treeViewBtn];
    buttons.forEach(btn => btn.disabled = isProcessing);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 bytes';

    const k = 1024;
    const sizes = ['bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  destroy() {
    // Cleanup when component is destroyed
    if (this.workerPool) {
      this.workerPool.terminate();
    }
  }
}