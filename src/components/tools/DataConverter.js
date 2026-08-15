/**
 * Data Converter Tool Island
 * Handles CSV ↔ JSON ↔ YAML bidirectional conversion
 */

import { WorkerOperation } from "../../utils/worker-interface.ts";
import { WorkerPool, withTimeout } from "../../utils/worker-pool.ts";
import { checkMemoryLimit } from "../../utils/memory.ts";
import { escapeHtml } from "../../utils/escape-html.ts";
import { icon } from "../../utils/icons.ts";
import DataProcessorWorkerUrl from "../../workers/data-processor.ts?worker&url";

export class DataConverter {
  constructor(element) {
    this.element = element;
    this.workerPool = new WorkerPool(DataProcessorWorkerUrl);
    this.maxMemoryMB = 50;

    // DOM elements
    this.inputTextarea = null;
    this.outputContainer = null;
    this.errorContainer = null;
    this.sizeDisplay = null;
    this.convertButtons = null;

    // State
    this.currentInput = '';
    this.currentOutput = '';
    this.isProcessing = false;
    this.conversionMode = 'csv-to-json'; // csv-to-json, json-to-csv, json-to-yaml, yaml-to-json
    this.autoDetectedDelimiter = ',';
  }

  async init() {
    this.render();
    this.bindEvents();
    await this.workerPool.init();
  }

  render() {
    this.element.innerHTML = `
      <div class="space-y-6">
        <!-- Conversion Mode Selector -->
        <div class="dt-panel p-4">
          <h3 class="dt-label mb-3">Conversion Mode</h3>
          <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
            <button
              id="mode-csv-to-json"
              class="dt-alg-btn dt-alg-btn-active"
              data-mode="csv-to-json"
              aria-pressed="true"
            >
              CSV → JSON
            </button>
            <button
              id="mode-json-to-csv"
              class="dt-alg-btn"
              data-mode="json-to-csv"
              aria-pressed="false"
            >
              JSON → CSV
            </button>
            <button
              id="mode-json-to-yaml"
              class="dt-alg-btn"
              data-mode="json-to-yaml"
              aria-pressed="false"
            >
              JSON → YAML
            </button>
            <button
              id="mode-yaml-to-json"
              class="dt-alg-btn"
              data-mode="yaml-to-json"
              aria-pressed="false"
            >
              YAML → JSON
            </button>
          </div>
        </div>

        <!-- Options Panel -->
        <div id="options-panel" class="dt-card p-4">
          <h3 class="dt-label mb-3">Options</h3>
          <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
            <!-- Delimiter (CSV modes) -->
            <div id="delimiter-option" class="flex items-center gap-3">
              <label for="delimiter-select" class="text-[13.5px] dt-text-2">Delimiter:</label>
              <select id="delimiter-select" class="dt-field w-auto! px-2.5! py-1.5! text-[13px]!">
                <option value="auto">Auto-detect</option>
                <option value=",">Comma (,)</option>
                <option value=";">Semicolon (;)</option>
                <option value="\t">Tab</option>
                <option value="|">Pipe (|)</option>
              </select>
            </div>

            <!-- YAML indent -->
            <div id="yaml-indent-option" class="hidden flex items-center gap-3">
              <label for="yaml-indent-select" class="text-[13.5px] dt-text-2">Indent:</label>
              <select id="yaml-indent-select" class="dt-field w-auto! px-2.5! py-1.5! text-[13px]!">
                <option value="2">2 spaces</option>
                <option value="4">4 spaces</option>
                <option value="8">8 spaces</option>
              </select>
            </div>

            <!-- YAML line width -->
            <div id="yaml-linewidth-option" class="hidden flex items-center gap-3">
              <label for="yaml-linewidth-select" class="text-[13.5px] dt-text-2">Line Width:</label>
              <select id="yaml-linewidth-select" class="dt-field w-auto! px-2.5! py-1.5! text-[13px]!">
                <option value="80">80 chars</option>
                <option value="120">120 chars</option>
                <option value="0">No wrap</option>
              </select>
            </div>

            <!-- Detected delimiter info -->
            <div id="delimiter-info" class="hidden flex items-center gap-2 text-[13px] dt-text-3">
              <span>Detected:</span>
              <span id="detected-delimiter" class="dt-code"></span>
            </div>
          </div>
        </div>

        <!-- Input Section -->
        <div class="space-y-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <label for="data-input" class="dt-label">
              <span id="input-label">CSV Input</span>
            </label>
            <div class="flex items-center gap-2">
              <span id="input-size" class="dt-meta">0 bytes</span>
              <span id="memory-status" class="hidden rounded-md bg-red-500/10 px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400">
                Memory limit exceeded
              </span>
            </div>
          </div>
          <textarea
            id="data-input"
            class="dt-field h-64"
            placeholder="Paste your data here..."
            spellcheck="false"
          ></textarea>
        </div>

        <!-- Convert Buttons -->
        <div class="flex flex-wrap items-center gap-3">
          <button
            id="convert-btn"
            type="button"
            class="dt-btn dt-btn-primary"
          >
            Convert
          </button>
          <button
            id="clear-btn"
            type="button"
            class="dt-btn"
          >
            Clear
          </button>

          <!-- Stats display -->
          <div id="stats-display" class="dt-meta ml-auto hidden flex items-center gap-4">
            <span id="row-count"></span>
            <span id="col-count"></span>
          </div>
        </div>

        <!-- Processing Indicator -->
        <div id="processing-indicator" class="hidden">
          <div class="dt-accent flex items-center gap-2 text-[13px]">
            <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span id="processing-message">Converting...</span>
          </div>
        </div>

        <!-- Error Display -->
        <div id="error-container" class="dt-box dt-box-error hidden">
          <span class="text-red-500 dark:text-red-400">${icon('alert-circle', 18)}</span>
          <div>
            <h3 class="text-sm font-medium text-red-700 dark:text-red-300">
              Conversion Error
            </h3>
            <p id="error-message" class="mt-0.5 text-[13px] text-red-600 dark:text-red-400"></p>
          </div>
        </div>

        <!-- Output Section -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label for="data-output" class="dt-label">
              <span id="output-label">JSON Output</span>
            </label>
            <div class="flex items-center gap-2">
              <span id="output-size" class="dt-meta">0 bytes</span>
              <button
                id="copy-btn"
                type="button"
                class="dt-btn dt-btn-sm"
                aria-label="Copy output to clipboard"
              >
                Copy
              </button>
              <button
                id="download-btn"
                type="button"
                class="dt-btn dt-btn-sm"
                aria-label="Download output as file"
              >
                Download
              </button>
            </div>
          </div>
          <div
            id="data-output"
            class="dt-field min-h-64 max-h-96 overflow-auto"
          >
            <div class="dt-empty">
              Enter data above and click Convert to see the result here...
            </div>
          </div>
        </div>

        <!-- Examples -->
        <div class="dt-panel p-4">
          <h3 class="dt-label mb-3">Quick Examples</h3>
          <div class="flex flex-wrap gap-2">
            <button
              id="example-csv"
              type="button"
              class="dt-btn dt-btn-soft dt-btn-sm"
              data-example="csv"
            >
              Sample CSV
            </button>
            <button
              id="example-json-array"
              type="button"
              class="dt-btn dt-btn-soft dt-btn-sm"
              data-example="json-array"
            >
              Sample JSON Array
            </button>
            <button
              id="example-yaml"
              type="button"
              class="dt-btn dt-btn-soft dt-btn-sm"
              data-example="yaml"
            >
              Sample YAML
            </button>
          </div>
        </div>
      </div>
    `;

    // Get DOM references
    this.inputTextarea = this.element.querySelector('#data-input');
    this.outputContainer = this.element.querySelector('#data-output');
    this.errorContainer = this.element.querySelector('#error-container');
    this.processingIndicator = this.element.querySelector('#processing-indicator');
    this.processingMessage = this.element.querySelector('#processing-message');
    this.inputSizeDisplay = this.element.querySelector('#input-size');
    this.outputSizeDisplay = this.element.querySelector('#output-size');
    this.memoryStatus = this.element.querySelector('#memory-status');

    this.convertBtn = this.element.querySelector('#convert-btn');
    this.clearBtn = this.element.querySelector('#clear-btn');
    this.copyBtn = this.element.querySelector('#copy-btn');
    this.downloadBtn = this.element.querySelector('#download-btn');

    this.inputLabel = this.element.querySelector('#input-label');
    this.outputLabel = this.element.querySelector('#output-label');
    this.statsDisplay = this.element.querySelector('#stats-display');
    this.rowCountDisplay = this.element.querySelector('#row-count');
    this.colCountDisplay = this.element.querySelector('#col-count');

    this.delimiterOption = this.element.querySelector('#delimiter-option');
    this.delimiterSelect = this.element.querySelector('#delimiter-select');
    this.delimiterInfo = this.element.querySelector('#delimiter-info');
    this.detectedDelimiter = this.element.querySelector('#detected-delimiter');
    this.yamlIndentOption = this.element.querySelector('#yaml-indent-option');
    this.yamlIndentSelect = this.element.querySelector('#yaml-indent-select');
    this.yamlLinewidthOption = this.element.querySelector('#yaml-linewidth-option');
    this.yamlLinewidthSelect = this.element.querySelector('#yaml-linewidth-select');

    // Mode buttons
    this.modeButtons = this.element.querySelectorAll('[data-mode]');
  }

  bindEvents() {
    // Mode switching
    this.modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        this.setConversionMode(mode);
      });
    });

    // Input change handler
    this.inputTextarea.addEventListener('input', this.handleInputChange.bind(this));

    // Convert button
    this.convertBtn.addEventListener('click', () => this.convert());

    // Keyboard shortcut: Ctrl/Cmd+Enter to convert
    this.inputTextarea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.convert();
      }
    });

    // Utility buttons
    this.clearBtn.addEventListener('click', this.clearAll.bind(this));
    this.copyBtn.addEventListener('click', this.copyOutput.bind(this));
    this.downloadBtn.addEventListener('click', this.downloadOutput.bind(this));

    // Example buttons
    this.element.querySelectorAll('[data-example]').forEach(btn => {
      btn.addEventListener('click', () => {
        const example = btn.dataset.example;
        this.loadExample(example);
      });
    });
  }

  setConversionMode(mode) {
    this.conversionMode = mode;

    // Update button states
    this.modeButtons.forEach(btn => {
      const isActive = btn.dataset.mode === mode;
      btn.setAttribute('aria-pressed', isActive);
      btn.className = isActive ? 'dt-alg-btn dt-alg-btn-active' : 'dt-alg-btn';
    });

    // Update labels and placeholders
    this.updateModeUI(mode);

    // Clear output when mode changes
    this.clearOutput();
    this.clearError();
  }

  updateModeUI(mode) {
    const config = this.getModeConfig(mode);

    this.inputLabel.textContent = config.inputLabel;
    this.outputLabel.textContent = config.outputLabel;
    this.inputTextarea.placeholder = config.placeholder;
    this.convertBtn.textContent = config.convertLabel;

    // Show/hide options
    this.delimiterOption.classList.toggle('hidden', !config.showDelimiter);
    this.yamlIndentOption.classList.toggle('hidden', !config.showYamlIndent);
    this.yamlLinewidthOption.classList.toggle('hidden', !config.showYamlLinewidth);
    this.delimiterInfo.classList.add('hidden');

    // Reset delimiter select
    if (config.showDelimiter) {
      this.delimiterSelect.value = 'auto';
    }
  }

  getModeConfig(mode) {
    switch (mode) {
      case 'csv-to-json':
        return {
          inputLabel: 'CSV Input',
          outputLabel: 'JSON Output',
          placeholder: 'name,age,city\nAlice,30,New York\nBob,25,London',
          convertLabel: 'CSV → JSON',
          showDelimiter: true,
          showYamlIndent: false,
          showYamlLinewidth: false,
          workerOp: WorkerOperation.CSV_TO_JSON,
          downloadExt: 'json',
          downloadType: 'application/json',
        };
      case 'json-to-csv':
        return {
          inputLabel: 'JSON Input',
          outputLabel: 'CSV Output',
          placeholder: '[\n  {"name": "Alice", "age": 30, "city": "New York"},\n  {"name": "Bob", "age": 25, "city": "London"}\n]',
          convertLabel: 'JSON → CSV',
          showDelimiter: true,
          showYamlIndent: false,
          showYamlLinewidth: false,
          workerOp: WorkerOperation.JSON_TO_CSV,
          downloadExt: 'csv',
          downloadType: 'text/csv',
        };
      case 'json-to-yaml':
        return {
          inputLabel: 'JSON Input',
          outputLabel: 'YAML Output',
          placeholder: '{\n  "name": "Alice",\n  "age": 30,\n  "city": "New York"\n}',
          convertLabel: 'JSON → YAML',
          showDelimiter: false,
          showYamlIndent: true,
          showYamlLinewidth: true,
          workerOp: WorkerOperation.JSON_TO_YAML,
          downloadExt: 'yaml',
          downloadType: 'text/yaml',
        };
      case 'yaml-to-json':
        return {
          inputLabel: 'YAML Input',
          outputLabel: 'JSON Output',
          placeholder: 'name: Alice\nage: 30\ncity: New York',
          convertLabel: 'YAML → JSON',
          showDelimiter: false,
          showYamlIndent: false,
          showYamlLinewidth: false,
          workerOp: WorkerOperation.YAML_TO_JSON,
          downloadExt: 'json',
          downloadType: 'application/json',
        };
      default:
        throw new Error(`Unknown mode: ${mode}`);
    }
  }

  handleInputChange() {
    const input = this.inputTextarea.value;
    this.currentInput = input;

    // Update input size
    const sizeBytes = new Blob([input]).size;
    this.inputSizeDisplay.textContent = this.formatBytes(sizeBytes);

    // Check memory limit
    const exceedsLimit = !checkMemoryLimit(input);
    this.memoryStatus.classList.toggle('hidden', !exceedsLimit);

    // Disable convert button if memory limit exceeded
    this.convertBtn.disabled = exceedsLimit;

    // Auto-detect delimiter for CSV mode
    if (this.conversionMode === 'csv-to-json' && this.delimiterSelect.value === 'auto' && input.trim()) {
      const delimiter = this.autoDetectDelimiter(input);
      this.autoDetectedDelimiter = delimiter;
      this.detectedDelimiter.textContent = delimiter === '\t' ? 'Tab' : `"${delimiter}"`;
      this.delimiterInfo.classList.remove('hidden');
    }
  }

  autoDetectDelimiter(csv) {
    const firstLine = csv.split('\n')[0];
    const candidates = [
      { char: ',', count: (firstLine.match(/,/g) || []).length },
      { char: ';', count: (firstLine.match(/;/g) || []).length },
      { char: '\t', count: (firstLine.match(/\t/g) || []).length },
      { char: '|', count: (firstLine.match(/\|/g) || []).length },
    ];
    candidates.sort((a, b) => b.count - a.count);
    return candidates[0].count > 0 ? candidates[0].char : ',';
  }

  async convert() {
    const input = this.inputTextarea.value.trim();
    if (!input) {
      this.displayError('Please enter some data to convert.');
      return;
    }

    if (this.isProcessing) return;

    this.setProcessing(true);
    this.clearError();
    this.statsDisplay.classList.add('hidden');

    try {
      const config = this.getModeConfig(this.conversionMode);

      // Build options
      const options = this.buildOptions();

      // Determine if we need a worker (>10MB)
      const needsWorker = new Blob([input]).size > 10 * 1024 * 1024;

      let result;
      if (needsWorker) {
        result = await this.processWithWorker(config.workerOp, {
          data: input,
          options,
        });
      } else {
        result = await this.processSync(config.workerOp, input, options);
      }

      this.displayResult(result, config);

      // Show stats if available
      if (result.rowCount != null) {
        this.rowCountDisplay.textContent = `${result.rowCount} rows`;
        this.statsDisplay.classList.remove('hidden');
      }
      if (result.columnCount != null) {
        this.colCountDisplay.textContent = `${result.columnCount} columns`;
        this.statsDisplay.classList.remove('hidden');
      }

    } catch (error) {
      this.displayError(error.message);
    } finally {
      this.setProcessing(false);
    }
  }

  buildOptions() {
    const options = {};

    if (this.conversionMode === 'csv-to-json' || this.conversionMode === 'json-to-csv') {
      const delimiterValue = this.delimiterSelect.value;
      if (delimiterValue !== 'auto') {
        options.delimiter = delimiterValue;
      } else if (this.conversionMode === 'csv-to-json') {
        options.delimiter = this.autoDetectedDelimiter;
      }
    }

    if (this.conversionMode === 'json-to-yaml') {
      options.indent = parseInt(this.yamlIndentSelect.value);
      const lineWidth = parseInt(this.yamlLinewidthSelect.value);
      options.lineWidth = lineWidth === 0 ? -1 : lineWidth;
    }

    return options;
  }

  async processWithWorker(operation, input) {
    // The worker pool speaks {id, type:'process', payload:{operation, input}}
    // and answers {id, type:'result'|'error', payload} — see worker-pool.ts.
    const result = await withTimeout(
      this.workerPool.processTask(operation, input),
      30000,
      'Conversion timed out. Try with smaller data.'
    );
    return result;
  }

  processSync(operation, data, options) {
    // Import the csv-yaml utils
    return import("../../utils/csv-yaml.ts").then(({ csvToJson, jsonToCsv, yamlToJson, jsonToYaml }) => {
      switch (operation) {
        case WorkerOperation.CSV_TO_JSON:
          return csvToJson(data, options);
        case WorkerOperation.JSON_TO_CSV:
          return jsonToCsv(data, options);
        case WorkerOperation.YAML_TO_JSON:
          return yamlToJson(data);
        case WorkerOperation.JSON_TO_YAML:
          return jsonToYaml(data, options);
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }
    });
  }

  displayResult(result, config) {
    this.currentOutput = result.result;

    // Render output based on format
    if (config.downloadExt === 'json') {
      // Try to format JSON nicely
      try {
        const parsed = JSON.parse(result.result);
        result.result = JSON.stringify(parsed, null, 2);
        this.currentOutput = result.result;
      } catch {
        // Already formatted or not JSON
      }
    }

    this.outputContainer.innerHTML = `<pre class="whitespace-pre-wrap break-words">${this.escapeHtml(this.currentOutput)}</pre>`;

    // Update output size
    const sizeBytes = new Blob([this.currentOutput]).size;
    this.outputSizeDisplay.textContent = this.formatBytes(sizeBytes);
  }

  displayError(message) {
    this.errorContainer.classList.remove('hidden');
    this.element.querySelector('#error-message').textContent = message;
  }

  clearError() {
    this.errorContainer.classList.add('hidden');
  }

  clearOutput() {
    this.outputContainer.innerHTML = `
      <div class="dt-empty">
        Enter data above and click Convert to see the result here...
      </div>
    `;
    this.currentOutput = '';
    this.outputSizeDisplay.textContent = '0 bytes';
    this.statsDisplay.classList.add('hidden');
  }

  clearAll() {
    this.inputTextarea.value = '';
    this.currentInput = '';
    this.inputSizeDisplay.textContent = '0 bytes';
    this.memoryStatus.classList.add('hidden');
    this.convertBtn.disabled = false;
    this.clearOutput();
    this.clearError();
    this.delimiterInfo.classList.add('hidden');
  }

  async copyOutput() {
    if (!this.currentOutput) return;

    try {
      await navigator.clipboard.writeText(this.currentOutput);

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

    const config = this.getModeConfig(this.conversionMode);
    const blob = new Blob([this.currentOutput], { type: `${config.downloadType};charset=utf-8` });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `converted.${config.downloadExt}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  loadExample(type) {
    switch (type) {
      case 'csv':
        this.setConversionMode('csv-to-json');
        this.inputTextarea.value = 'name,age,city,email\nAlice Johnson,30,New York,alice@example.com\nBob Smith,25,London,bob@example.com\n"Eve, Jr.",35,"San Francisco, CA",eve@example.com';
        break;
      case 'json-array':
        this.setConversionMode('json-to-csv');
        this.inputTextarea.value = JSON.stringify([
          { name: 'Alice Johnson', age: 30, city: 'New York', email: 'alice@example.com' },
          { name: 'Bob Smith', age: 25, city: 'London', email: 'bob@example.com' },
          { name: 'Eve Jr.', age: 35, city: 'San Francisco, CA', email: 'eve@example.com' },
        ], null, 2);
        break;
      case 'yaml':
        this.setConversionMode('yaml-to-json');
        this.inputTextarea.value = `name: Alice Johnson
age: 30
city: New York
skills:
  - JavaScript
  - Python
  - Rust
address:
  street: "123 Main St"
  zip: "10001"`;
        break;
    }

    // Trigger input change to update size display
    this.handleInputChange();
  }

  setProcessing(isProcessing) {
    this.isProcessing = isProcessing;
    this.processingIndicator.classList.toggle('hidden', !isProcessing);
    this.convertBtn.disabled = isProcessing;
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
    if (this.workerPool) {
      this.workerPool.terminate();
    }
  }
}
