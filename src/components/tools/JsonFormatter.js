/**
 * JSON Formatter Tool Island
 * Handles JSON validation, beautification, minification, and tree view
 */

import { WorkerOperation } from "../../utils/worker-interface.ts";
import { WorkerPool, withTimeout } from "../../utils/worker-pool.ts";
import { checkMemoryLimit } from "../../utils/memory.ts";
import { escapeHtml } from "../../utils/escape-html.ts";
import { icon } from "../../utils/icons.ts";
import DataProcessorWorkerUrl from "../../workers/data-processor.ts?worker&url";

// Tree view safety caps (keep the main thread responsive on large inputs)
const TREE_VIEW_MAX_NODES = 50000;
const TREE_VIEW_MAX_DEPTH = 1000;

export class JsonFormatter {
  constructor(element) {
    this.element = element;
    this.workerPool = new WorkerPool(DataProcessorWorkerUrl);
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
          <div class="flex flex-wrap items-center justify-between gap-2">
            <label for="json-input" class="dt-label">
              JSON Input
            </label>
            <div class="flex items-center gap-2">
              <span id="input-size" class="dt-meta">0 bytes</span>
              <span id="memory-status" class="hidden rounded-md bg-red-500/10 px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400">
                Memory limit exceeded
              </span>
            </div>
          </div>
          <textarea
            id="json-input"
            class="dt-field h-64"
            placeholder="Paste your JSON here..."
            spellcheck="false"
          ></textarea>
        </div>

        <!-- Format Controls -->
        <div class="flex flex-wrap items-center gap-2.5">
          <button
            id="beautify-btn"
            type="button"
            class="dt-btn dt-btn-primary"
          >
            Beautify
          </button>
          <button
            id="minify-btn"
            type="button"
            class="dt-btn"
          >
            Minify
          </button>
          <button
            id="validate-btn"
            type="button"
            class="dt-btn"
          >
            Validate Only
          </button>
          <button
            id="tree-view-btn"
            type="button"
            class="dt-btn"
          >
            Tree View
          </button>
          <button
            id="escape-btn"
            type="button"
            class="dt-btn"
          >
            Escape
          </button>
          <button
            id="unescape-btn"
            type="button"
            class="dt-btn"
          >
            Unescape
          </button>
          <button
            id="compare-btn"
            type="button"
            class="dt-btn dt-btn-soft"
          >
            Compare Mode
          </button>
          <button
            id="clear-btn"
            type="button"
            class="dt-btn dt-btn-ghost"
          >
            Clear
          </button>

          <!-- Indent Options -->
          <div class="ml-auto flex items-center gap-2">
            <label for="indent-select" class="text-[13px] dt-text-2">Indent:</label>
            <select
              id="indent-select"
              class="dt-field w-auto! px-2.5! py-1! text-[13px]!"
            >
              <option value="2">2 spaces</option>
              <option value="4">4 spaces</option>
              <option value="tab">Tab</option>
            </select>
          </div>
        </div>

        <!-- Comparison Mode (initially hidden) -->
        <div id="compare-container" class="hidden space-y-4">
          <div class="dt-box dt-box-info items-start!">
            <span class="dt-accent">${icon('info', 18)}</span>
            <div class="min-w-0 flex-1">
              <h3 class="mb-1 text-sm font-medium">JSON Comparison Mode</h3>
              <p class="text-[13px] dt-text-2">
                Compare two JSON objects to see the differences. The first input above is JSON A, enter JSON B below.
              </p>

              <div class="mt-3 space-y-1.5">
                <label for="json-compare-input" class="dt-label block">
                  JSON B (for comparison)
                </label>
                <textarea
                  id="json-compare-input"
                  class="dt-field h-32"
                  placeholder="Paste second JSON here for comparison..."
                  spellcheck="false"
                ></textarea>
              </div>

              <div class="mt-4 flex items-center gap-3">
                <button
                  id="run-compare-btn"
                  type="button"
                  class="dt-btn dt-btn-primary"
                >
                  Compare JSONs
                </button>
                <button
                  id="exit-compare-btn"
                  type="button"
                  class="dt-btn"
                >
                  Exit Compare Mode
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Processing Indicator -->
        <div id="processing-indicator" class="hidden">
          <div class="dt-accent flex items-center gap-2 text-[13px]">
            <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Processing...</span>
          </div>
        </div>

        <!-- Error Display -->
        <div id="error-container" class="dt-box dt-box-error hidden">
          <span class="text-red-500 dark:text-red-400">${icon('alert-circle', 18)}</span>
          <div>
            <h3 class="text-sm font-medium text-red-700 dark:text-red-300">
              JSON Error
            </h3>
            <p id="error-message" class="mt-0.5 text-[13px] text-red-600 dark:text-red-400"></p>
          </div>
        </div>

        <!-- Output Section -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label for="json-output" class="dt-label">
              Formatted Output
            </label>
            <div class="flex items-center gap-2">
              <span id="output-size" class="dt-meta">0 bytes</span>
              <button
                id="copy-btn"
                type="button"
                class="dt-btn dt-btn-sm"
              >
                Copy
              </button>
              <button
                id="download-btn"
                type="button"
                class="dt-btn dt-btn-sm"
              >
                Download
              </button>
            </div>
          </div>
          <div
            id="json-output"
            class="dt-field min-h-64 max-h-96 overflow-auto"
          >
            <div class="dt-empty">
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
    // The worker pool speaks {id, type:'process', payload:{operation, input}}
    // and answers {id, type:'result'|'error', payload} — see worker-pool.ts.
    const result = await withTimeout(
      this.workerPool.processTask(operation, input),
      30000,
      'Operation timed out'
    );
    return result;
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

      // Iterative size probe: refuse huge/deep trees before rendering
      // (avoids main-thread freezes and recursion stack overflows).
      const { nodes, depth } = this.measureTree(parsed);
      if (nodes > TREE_VIEW_MAX_NODES || depth > TREE_VIEW_MAX_DEPTH) {
        this.displayError(
          `Tree view is limited to ${TREE_VIEW_MAX_NODES.toLocaleString()} nodes and depth ${TREE_VIEW_MAX_DEPTH}. This JSON has ~${nodes.toLocaleString()} nodes (depth ${depth}) — use Beautify instead.`
        );
        return;
      }

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

  /**
   * Count nodes and max nesting depth iteratively (explicit stack —
   * never recurses, so it is safe for pathological inputs).
   */
  measureTree(value) {
    if (value === null || typeof value !== 'object') {
      return { nodes: 1, depth: 1 };
    }

    let nodes = 1;
    let depth = 0;
    const stack = [{ value, level: 1 }];

    while (stack.length > 0) {
      const frame = stack.pop();
      if (frame.level > depth) depth = frame.level;

      const children = Array.isArray(frame.value)
        ? frame.value
        : Object.values(frame.value);

      for (const child of children) {
        nodes++;
        if (child !== null && typeof child === 'object') {
          stack.push({ value: child, level: frame.level + 1 });
        }
      }
    }

    return { nodes, depth };
  }

  renderJsonTree(obj, level = 0) {
    const indent = '  '.repeat(level);
    // Syntax palette (restrained, theme-aware)
    const PUNCT = 'text-(--text-3)';
    const KEY = 'dt-accent';
    const STR = 'text-emerald-600 dark:text-emerald-400';
    const NUM = 'text-amber-600 dark:text-amber-400';
    const BOOL = 'text-fuchsia-600 dark:text-fuchsia-400';

    if (obj === null) {
      return `<span class="text-(--text-3)">null</span>`;
    }

    if (typeof obj === 'string') {
      return `<span class="${STR}">"${this.escapeHtml(obj)}"</span>`;
    }

    if (typeof obj === 'number') {
      return `<span class="${NUM}">${obj}</span>`;
    }

    if (typeof obj === 'boolean') {
      return `<span class="${BOOL}">${obj}</span>`;
    }

    if (Array.isArray(obj)) {
      if (obj.length === 0) {
        return `<span class="${PUNCT}">[]</span>`;
      }

      let html = `<span class="${PUNCT}">[</span>\n`;
      obj.forEach((item, index) => {
        html += `${indent}  ${this.renderJsonTree(item, level + 1)}`;
        if (index < obj.length - 1) {
          html += `<span class="${PUNCT}">,</span>`;
        }
        html += '\n';
      });
      html += `${indent}<span class="${PUNCT}">]</span>`;
      return html;
    }

    if (typeof obj === 'object') {
      const keys = Object.keys(obj);
      if (keys.length === 0) {
        return `<span class="${PUNCT}">{}</span>`;
      }

      let html = `<span class="${PUNCT}">{</span>\n`;
      keys.forEach((key, index) => {
        html += `${indent}  <span class="${KEY}">"${this.escapeHtml(key)}"</span>: ${this.renderJsonTree(obj[key], level + 1)}`;
        if (index < keys.length - 1) {
          html += `<span class="${PUNCT}">,</span>`;
        }
        html += '\n';
      });
      html += `${indent}<span class="${PUNCT}">}</span>`;
      return html;
    }

    return String(obj);
  }

  escapeJSONStrings() {
    if (!this.currentInput) return;

    this.clearError();
    const escaped = JSON.stringify(this.currentInput);
    this.outputContainer.innerHTML = `<pre class="whitespace-pre-wrap break-words">${this.escapeHtml(escaped)}</pre>`;
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

    this.outputContainer.innerHTML = `<pre class="whitespace-pre-wrap break-words">${this.escapeHtml(unescaped)}</pre>`;
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
        <div class="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          ${icon('check-circle', 18)}
          <span>Both JSON objects are identical.</span>
        </div>`;
      this.currentOutput = '';
      this.outputSizeDisplay.textContent = '0 bytes';
      return;
    }

    const fmt = (v) => (typeof v === 'string' ? `"${v}"` : JSON.stringify(v));
    const text = [];
    let html = '<ul class="space-y-1.5 text-[13.5px]">';

    diff.added.forEach(item => {
      text.push(`+ ${item.path}: ${fmt(item.value)}`);
      html += `<li class="text-emerald-700 dark:text-emerald-400"><code class="font-mono">${this.escapeHtml(item.path)}</code> <span class="dt-text-3">added</span>: ${this.escapeHtml(fmt(item.value))}</li>`;
    });

    diff.removed.forEach(item => {
      text.push(`- ${item.path}: ${fmt(item.value)}`);
      html += `<li class="text-red-700 dark:text-red-400"><code class="font-mono">${this.escapeHtml(item.path)}</code> <span class="dt-text-3">removed</span>: ${this.escapeHtml(fmt(item.value))}</li>`;
    });

    diff.changed.forEach(item => {
      text.push(`~ ${item.path}: ${fmt(item.a)} -> ${fmt(item.b)}`);
      html += `<li class="text-amber-700 dark:text-amber-400"><code class="font-mono">${this.escapeHtml(item.path)}</code> <span class="dt-text-3">changed</span>: ${this.escapeHtml(fmt(item.a))} &rarr; ${this.escapeHtml(fmt(item.b))}</li>`;
    });

    html += '</ul>';

    this.outputContainer.innerHTML = `
      <div class="dt-label mb-2.5">
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
        <div class="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          ${icon('check-circle', 18)}
          <span>Valid JSON (${this.formatBytes(result.size)})</span>
        </div>
      `;
    } else {
      this.outputContainer.innerHTML = `<pre class="whitespace-pre-wrap break-words">${this.escapeHtml(result.result)}</pre>`;
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
      <div class="dt-empty">
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
      this.copyBtn.classList.add('dt-accent');

      setTimeout(() => {
        this.copyBtn.textContent = originalText;
        this.copyBtn.classList.remove('dt-accent');
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
    return escapeHtml(text);
  }

  destroy() {
    // Cleanup when component is destroyed
    if (this.workerPool) {
      this.workerPool.terminate();
    }
  }
}