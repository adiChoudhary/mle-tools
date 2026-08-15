/**
 * Crontab Evaluator Tool Island
 * Validates cron expressions, shows human-readable translation, and next 5 execution times
 */

import { validateCronExpression, cronToHuman, getNextExecutions, getCronExamples } from "../../utils/cron.ts";
import { escapeHtml } from "../../utils/escape-html.ts";

export class CrontabEvaluator {
  constructor(element) {
    this.element = element;
  }

  init() {
    this.render();
    this.bindEvents();
  }

  render() {
    this.element.innerHTML = `
      <div class="space-y-6">
        <!-- Input -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label for="cron-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Cron Expression</label>
            <div class="flex items-center space-x-2">
              <button id="clear-cron-btn" class="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors">Clear</button>
            </div>
          </div>
          <div class="flex gap-3">
            <input id="cron-input" type="text" class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="* * * * *" />
            <button id="evaluate-btn" class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors whitespace-nowrap">Evaluate</button>
          </div>
        </div>

        <!-- Error -->
        <div id="cron-error" class="hidden bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p id="cron-error-message" class="text-sm text-red-700 dark:text-red-300"></p>
        </div>

        <!-- Output -->
        <div id="cron-output" class="hidden space-y-4">
          <!-- Human-readable -->
          <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div class="flex items-center space-x-2">
              <span class="text-lg">✅</span>
              <span class="text-sm font-medium text-green-700 dark:text-green-300">Valid cron expression</span>
            </div>
            <p id="cron-human" class="mt-2 text-green-700 dark:text-green-300 text-sm"></p>
          </div>

          <!-- Field breakdown -->
          <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Expression Breakdown</h3>
            <div id="cron-fields" class="overflow-x-auto"></div>
          </div>

          <!-- Next executions -->
          <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Next 5 Execution Times</h3>
            <div id="cron-next" class="space-y-2"></div>
          </div>
        </div>

        <!-- Examples -->
        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 class="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Common Cron Expressions</h3>
          <div id="cron-examples" class="space-y-1"></div>
        </div>

        <!-- Cron format reference -->
        <div class="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cron Format Reference</h3>
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700">
                <th class="text-left py-2 font-medium text-gray-500 dark:text-gray-400">Field</th>
                <th class="text-left py-2 font-medium text-gray-500 dark:text-gray-400">Range</th>
                <th class="text-left py-2 font-medium text-gray-500 dark:text-gray-400">Special</th>
              </tr>
            </thead>
            <tbody class="text-gray-700 dark:text-gray-300">
              <tr class="border-b border-gray-100 dark:border-gray-800"><td class="py-1.5 py-2 font-mono">Minute</td><td class="py-1.5 py-2">0-59</td><td class="py-1.5 py-2">* , - /</td></tr>
              <tr class="border-b border-gray-100 dark:border-gray-800"><td class="py-2 font-mono">Hour</td><td class="py-2">0-23</td><td class="py-2">* , - /</td></tr>
              <tr class="border-b border-gray-100 dark:border-gray-800"><td class="py-2 font-mono">Day of Month</td><td class="py-2">1-31</td><td class="py-2">* , - / ?</td></tr>
              <tr class="border-b border-gray-100 dark:border-gray-800"><td class="py-2 font-mono">Month</td><td class="py-2">1-12</td><td class="py-2">* , - /</td></tr>
              <tr><td class="py-2 font-mono">Day of Week</td><td class="py-2">0-7 (0=Sun)</td><td class="py-2">* , - / ?</td></tr>
            </tbody>
          </table>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
            <code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">*</code> = any value |
            <code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">,</code> = list |
            <code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">-</code> = range |
            <code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">/</code> = step (e.g., */5)
          </p>
        </div>
      </div>
    `;

    // DOM refs
    this.cronInput = this.element.querySelector('#cron-input');
    this.cronError = this.element.querySelector('#cron-error');
    this.cronErrorMessage = this.element.querySelector('#cron-error-message');
    this.cronOutput = this.element.querySelector('#cron-output');
    this.cronHuman = this.element.querySelector('#cron-human');
    this.cronFields = this.element.querySelector('#cron-fields');
    this.cronNext = this.element.querySelector('#cron-next');
    this.cronExamples = this.element.querySelector('#cron-examples');
  }

  bindEvents() {
    this.element.querySelector('#evaluate-btn').addEventListener('click', () => this.evaluate());
    this.cronInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.evaluate();
    });

    this.element.querySelector('#clear-cron-btn').addEventListener('click', () => {
      this.cronInput.value = '';
      this.cronError.classList.add('hidden');
      this.cronOutput.classList.add('hidden');
    });

    // Live validation on input
    this.cronInput.addEventListener('input', () => {
      const val = this.cronInput.value.trim();
      if (!val) {
        this.cronError.classList.add('hidden');
        return;
      }
      try {
        validateCronExpression(val);
        this.cronError.classList.add('hidden');
      } catch (error) {
        this.cronErrorMessage.textContent = error.message;
        this.cronError.classList.remove('hidden');
      }
    });

    // Populate examples
    this.renderExamples();
  }

  evaluate() {
    const expr = this.cronInput.value.trim();
    if (!expr) {
      this.cronErrorMessage.textContent = 'Please enter a cron expression.';
      this.cronError.classList.remove('hidden');
      return;
    }

    try {
      validateCronExpression(expr);
    } catch (error) {
      this.cronErrorMessage.textContent = error.message;
      this.cronError.classList.remove('hidden');
      this.cronOutput.classList.add('hidden');
      return;
    }

    this.cronError.classList.add('hidden');

    // Human-readable
    const human = cronToHuman(expr);
    this.cronHuman.textContent = `This cron runs: ${human}`;

    // Field breakdown
    const parts = expr.split(/\s+/);
    const fieldNames = parts.length === 6
      ? ['Second', 'Minute', 'Hour', 'Day of Month', 'Month', 'Day of Week']
      : ['Minute', 'Hour', 'Day of Month', 'Month', 'Day of Week'];

    let fieldsHtml = '<table class="w-full text-sm"><thead><tr><th class="text-left py-1.5 font-medium text-gray-500 dark:text-gray-400">Position</th><th class="text-left py-1.5 font-medium text-gray-500 dark:text-gray-400">Field</th><th class="text-left py-1.5 font-medium text-gray-500 dark:text-gray-400">Value</th><th class="text-left py-1.5 font-medium text-gray-500 dark:text-gray-400">Meaning</th></tr></thead><tbody>';

    for (let i = 0; i < parts.length; i++) {
      const val = parts[i];
      const meaning = this.describeValue(val, fieldNames[i]);
      fieldsHtml += `<tr class="border-b border-gray-100 dark:border-gray-800">
        <td class="py-1.5 text-gray-500 dark:text-gray-400">${i + 1}</td>
        <td class="py-1.5 font-medium text-gray-700 dark:text-gray-300">${fieldNames[i]}</td>
        <td class="py-1.5 font-mono text-gray-900 dark:text-gray-100">${this.escapeHtml(val)}</td>
        <td class="py-1.5 text-gray-600 dark:text-gray-400">${meaning}</td>
      </tr>`;
    }

    fieldsHtml += '</tbody></table>';
    this.cronFields.innerHTML = fieldsHtml;

    // Next 5 executions
    const nextExecs = getNextExecutions(expr, 5);
    let nextHtml = '';
    for (let i = 0; i < nextExecs.length; i++) {
      const d = nextExecs[i];
      const local = d.toLocaleString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' });
      const utc = d.toISOString();
      nextHtml += `
        <div class="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
          <div>
            <span class="inline-block w-6 text-center text-sm font-medium text-blue-600 dark:text-blue-400">${i + 1}</span>
            <span class="ml-2 text-sm text-gray-900 dark:text-gray-100">${local}</span>
          </div>
          <span class="text-xs font-mono text-gray-500 dark:text-gray-400">${utc}</span>
        </div>
      `;
    }
    this.cronNext.innerHTML = nextHtml;
    this.cronOutput.classList.remove('hidden');
  }

  describeValue(val, fieldName) {
    if (val === '*') return 'Every';
    if (val.startsWith('*/')) return `Every ${val.slice(2)} ${fieldName.toLowerCase()}(s)`;
    if (val.includes(',')) return `On ${val}`;
    if (val.includes('-')) return `From ${val.split('-')[0]} to ${val.split('-')[1]}`;
    return val;
  }

  renderExamples() {
    const examples = getCronExamples();
    let html = '';
    for (const ex of examples) {
      html += `
        <button data-cron="${ex.expr}" class="example-cron-btn w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left">
          <code class="text-sm font-mono text-blue-700 dark:text-blue-300">${ex.expr}</code>
          <span class="text-xs text-gray-500 dark:text-gray-400">${ex.desc}</span>
        </button>
      `;
    }
    this.cronExamples.innerHTML = html;

    this.cronExamples.querySelectorAll('.example-cron-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.cronInput.value = btn.dataset.cron;
        this.cronError.classList.add('hidden');
        this.evaluate();
      });
    });
  }

  escapeHtml(text) {
    return escapeHtml(text);
  }

  destroy() {}
}
