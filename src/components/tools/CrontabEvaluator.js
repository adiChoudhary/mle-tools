/**
 * Crontab Evaluator Tool Island
 * Validates cron expressions, shows human-readable translation, and next 5 execution times
 */

import { validateCronExpression, cronToHuman, getNextExecutions, getCronExamples } from "../../utils/cron.ts";
import { escapeHtml } from "../../utils/escape-html.ts";
import { icon } from "../../utils/icons.ts";

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
            <label for="cron-input" class="dt-label">Cron Expression</label>
            <div class="flex items-center gap-2">
              <button id="clear-cron-btn" type="button" class="dt-btn dt-btn-sm">Clear</button>
            </div>
          </div>
          <div class="flex gap-3">
            <input id="cron-input" type="text" class="dt-field flex-1" placeholder="* * * * *" />
            <button id="evaluate-btn" type="button" class="dt-btn dt-btn-primary whitespace-nowrap">Evaluate</button>
          </div>
        </div>

        <!-- Error -->
        <div id="cron-error" class="dt-box dt-box-error hidden">
          <span class="text-red-500 dark:text-red-400">${icon('alert-circle', 18)}</span>
          <p id="cron-error-message" class="text-[13px] text-red-600 dark:text-red-400"></p>
        </div>

        <!-- Output -->
        <div id="cron-output" class="hidden space-y-4">
          <!-- Human-readable -->
          <div class="dt-box dt-box-success items-start!">
            <span class="text-emerald-600 dark:text-emerald-400">${icon('check-circle', 18)}</span>
            <div>
              <span class="text-sm font-medium text-emerald-700 dark:text-emerald-300">Valid cron expression</span>
              <p id="cron-human" class="mt-1 text-[13px] dt-text-2"></p>
            </div>
          </div>

          <!-- Field breakdown -->
          <div class="dt-panel p-4">
            <h3 class="dt-label mb-3">Expression Breakdown</h3>
            <div id="cron-fields" class="overflow-x-auto"></div>
          </div>

          <!-- Next executions -->
          <div class="dt-panel p-4">
            <h3 class="dt-label mb-3">Next 5 Execution Times</h3>
            <div id="cron-next" class="space-y-2"></div>
          </div>
        </div>

        <!-- Examples -->
        <div class="dt-panel p-4">
          <h3 class="dt-label mb-3">Common Cron Expressions</h3>
          <div id="cron-examples" class="space-y-1.5"></div>
        </div>

        <!-- Cron format reference -->
        <div class="dt-card p-4">
          <h3 class="dt-label mb-3">Cron Format Reference</h3>
          <table class="w-full text-[13.5px]">
            <thead>
              <tr class="border-b border-(--border)">
                <th class="text-left py-2 font-medium dt-text-3">Field</th>
                <th class="text-left py-2 font-medium dt-text-3">Range</th>
                <th class="text-left py-2 font-medium dt-text-3">Special</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b border-(--border)"><td class="py-2 font-mono">Minute</td><td class="py-2 dt-text-2">0-59</td><td class="py-2 dt-text-2">* , - /</td></tr>
              <tr class="border-b border-(--border)"><td class="py-2 font-mono">Hour</td><td class="py-2 dt-text-2">0-23</td><td class="py-2 dt-text-2">* , - /</td></tr>
              <tr class="border-b border-(--border)"><td class="py-2 font-mono">Day of Month</td><td class="py-2 dt-text-2">1-31</td><td class="py-2 dt-text-2">* , - / ?</td></tr>
              <tr class="border-b border-(--border)"><td class="py-2 font-mono">Month</td><td class="py-2 dt-text-2">1-12</td><td class="py-2 dt-text-2">* , - /</td></tr>
              <tr><td class="py-2 font-mono">Day of Week</td><td class="py-2 dt-text-2">0-7 (0=Sun)</td><td class="py-2 dt-text-2">* , - / ?</td></tr>
            </tbody>
          </table>
          <p class="dt-meta mt-3">
            <code class="dt-code">*</code> = any value |
            <code class="dt-code">,</code> = list |
            <code class="dt-code">-</code> = range |
            <code class="dt-code">/</code> = step (e.g., */5)
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

    let fieldsHtml = '<table class="w-full text-[13.5px]"><thead><tr><th class="text-left py-1.5 font-medium dt-text-3">Position</th><th class="text-left py-1.5 font-medium dt-text-3">Field</th><th class="text-left py-1.5 font-medium dt-text-3">Value</th><th class="text-left py-1.5 font-medium dt-text-3">Meaning</th></tr></thead><tbody>';

    for (let i = 0; i < parts.length; i++) {
      const val = parts[i];
      const meaning = this.describeValue(val, fieldNames[i]);
      fieldsHtml += `<tr class="border-b border-(--border) last:border-0">
        <td class="py-2 dt-text-3">${i + 1}</td>
        <td class="py-2 font-medium">${fieldNames[i]}</td>
        <td class="py-2 font-mono dt-accent">${this.escapeHtml(val)}</td>
        <td class="py-2 dt-text-2">${meaning}</td>
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
        <div class="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-(--surface-2) px-3.5 py-2.5">
          <div class="flex items-baseline gap-2.5">
            <span class="grid h-5 w-5 place-items-center rounded-md bg-(--accent-soft) text-xs font-semibold dt-accent">${i + 1}</span>
            <span class="text-[13.5px]">${local}</span>
          </div>
          <span class="dt-meta">${utc}</span>
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
        <button data-cron="${ex.expr}" type="button" class="example-cron-btn flex w-full items-center justify-between gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:border-(--border) hover:bg-(--surface-2)">
          <code class="font-mono text-[13px] dt-accent">${ex.expr}</code>
          <span class="text-xs dt-text-3">${ex.desc}</span>
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
