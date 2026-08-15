/**
 * Data Measurement Converter Tool Island
 * Data size converter (B to PB, decimal vs binary) and transfer rate converter
 */

import {
  DECIMAL_UNITS,
  BINARY_UNITS,
  convertToAllUnits,
  convertRateToAll,
  estimateDownloadTime,
  RATE_UNITS,
} from "../../utils/data-measurement.ts";

function formatNumber(n) {
  if (Number.isInteger(n)) return n.toString();
  // Avoid floating point noise
  if (Math.abs(n) > 1e12) return n.toExponential(4);
  if (Math.abs(n) < 1e-6) return n.toExponential(4);
  return parseFloat(n.toFixed(6)).toString();
}

export class DataMeasurementConverter {
  constructor(element) {
    this.element = element;
    this.tab = 'size';
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
          <button id="tab-size" class="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white" data-tab="size">Data Size</button>
          <button id="tab-rate" class="px-4 py-2 text-sm font-medium rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" data-tab="rate">Transfer Rate</button>
        </div>

        <!-- Data Size Panel -->
        <div id="panel-size" class="space-y-4">
          <div class="flex flex-wrap items-center gap-4">
            <div class="flex-1 min-w-[200px]">
              <label for="size-value" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Value</label>
              <input id="size-value" type="number" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="1" value="1" />
            </div>
            <div class="w-full sm:w-auto">
              <label for="size-unit" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit</label>
              <select id="size-unit" class="w-full sm:w-40 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"></select>
            </div>
          </div>

          <div class="flex items-center space-x-4 text-sm">
            <label class="inline-flex items-center text-gray-700 dark:text-gray-300">
              <input type="radio" name="size-system" value="decimal" class="mr-2 text-blue-600 focus:ring-blue-500" />
              Decimal (SI: KB, MB, GB)
            </label>
            <label class="inline-flex items-center text-gray-700 dark:text-gray-300">
              <input type="radio" name="size-system" value="binary" class="mr-2 text-blue-600 focus:ring-blue-500" />
              Binary (IEC: KiB, MiB, GiB)
            </label>
            <label class="inline-flex items-center text-gray-700 dark:text-gray-300">
              <input type="radio" name="size-system" value="all" class="mr-2 text-blue-600 focus:ring-blue-500" checked />
              Show both
            </label>
          </div>

          <div id="size-error" class="hidden bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300"></div>

          <div id="size-output" class="space-y-4">
            <div class="text-gray-500 dark:text-gray-400 text-sm italic">Enter a value to see conversions...</div>
          </div>
        </div>

        <!-- Transfer Rate Panel -->
        <div id="panel-rate" class="hidden space-y-4">
          <div class="flex flex-wrap items-center gap-4">
            <div class="flex-1 min-w-[200px]">
              <label for="rate-value" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rate</label>
              <input id="rate-value" type="number" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="100" value="100" />
            </div>
            <div class="w-full sm:w-auto">
              <label for="rate-unit" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit</label>
              <select id="rate-unit" class="w-full sm:w-40 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"></select>
            </div>
          </div>

          <div id="rate-error" class="hidden bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300"></div>

          <div id="rate-output" class="space-y-4">
            <div class="text-gray-500 dark:text-gray-400 text-sm italic">Enter a rate to see conversions...</div>
          </div>

          <!-- Download time calculator -->
          <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4 space-y-3">
            <h3 class="text-sm font-medium text-blue-800 dark:text-blue-200">Download Time Estimator</h3>
            <div class="flex flex-wrap items-center gap-3">
              <div>
                <label for="download-size" class="block text-xs text-blue-700 dark:text-blue-300 mb-1">File Size</label>
                <input id="download-size" type="number" class="px-3 py-1.5 border border-blue-300 dark:border-blue-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm w-32 focus:ring-2 focus:ring-blue-500" placeholder="1" value="1" />
              </div>
              <div>
                <label for="download-unit" class="block text-xs text-blue-700 dark:text-blue-300 mb-1">Unit</label>
                <select id="download-unit" class="px-3 py-1.5 border border-blue-300 dark:border-blue-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500">
                  <option value="MB">MB</option>
                  <option value="GB">GB</option>
                  <option value="TB">TB</option>
                  <option value="B">Bytes</option>
                </select>
              </div>
              <div class="flex items-end">
                <span id="download-time" class="text-sm font-medium text-blue-700 dark:text-blue-300">—</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // DOM refs - size
    this.sizePanel = this.element.querySelector('#panel-size');
    this.sizeValue = this.element.querySelector('#size-value');
    this.sizeUnit = this.element.querySelector('#size-unit');
    this.sizeOutput = this.element.querySelector('#size-output');
    this.sizeError = this.element.querySelector('#size-error');

    // DOM refs - rate
    this.ratePanel = this.element.querySelector('#panel-rate');
    this.rateValue = this.element.querySelector('#rate-value');
    this.rateUnit = this.element.querySelector('#rate-unit');
    this.rateOutput = this.element.querySelector('#rate-output');
    this.rateError = this.element.querySelector('#rate-error');

    // DOM refs - download time
    this.downloadSize = this.element.querySelector('#download-size');
    this.downloadUnit = this.element.querySelector('#download-unit');
    this.downloadTime = this.element.querySelector('#download-time');

    // Populate selects
    this.populateUnitSelects();
  }

  populateUnitSelects() {
    // Size unit select (defaults to decimal + binary)
    const sizeOptions = [...DECIMAL_UNITS, ...BINARY_UNITS];
    this.sizeUnit.innerHTML = sizeOptions.map(u => `<option value="${u.short}">${u.name} (${u.short})</option>`).join('');

    // Rate unit select
    this.rateUnit.innerHTML = RATE_UNITS.map(u => `<option value="${u.short}">${u.name} (${u.short})</option>`).join('');
  }

  bindEvents() {
    // Tab switching
    this.element.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.element.querySelectorAll('[data-tab]').forEach(b => {
          const active = b.dataset.tab === btn.dataset.tab;
          b.className = `px-4 py-2 text-sm font-medium rounded-md ${active ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`;
        });
        this.sizePanel.classList.toggle('hidden', btn.dataset.tab !== 'size');
        this.ratePanel.classList.toggle('hidden', btn.dataset.tab !== 'rate');
      });
    });

    // Size conversion (live)
    this.sizeValue.addEventListener('input', () => this.convertSize());
    this.sizeUnit.addEventListener('change', () => this.convertSize());
    this.element.querySelectorAll('input[name="size-system"]').forEach(r => {
      r.addEventListener('change', () => this.convertSize());
    });

    // Rate conversion (live)
    this.rateValue.addEventListener('input', () => this.convertRate());
    this.rateUnit.addEventListener('change', () => this.convertRate());

    // Download time
    this.downloadSize.addEventListener('input', () => this.calcDownloadTime());
    this.downloadUnit.addEventListener('change', () => this.calcDownloadTime());

    // Initial conversion
    this.convertSize();
    this.convertRate();
    this.calcDownloadTime();
  }

  convertSize() {
    const value = parseFloat(this.sizeValue.value);
    const unit = this.sizeUnit.value;
    const system = this.element.querySelector('input[name="size-system"]:checked').value;

    if (isNaN(value)) {
      this.sizeOutput.innerHTML = '<div class="text-gray-500 dark:text-gray-400 text-sm italic">Enter a numeric value...</div>';
      this.sizeError.classList.add('hidden');
      return;
    }

    try {
      const results = convertToAllUnits(value, unit);
      const units = system === 'binary' ? BINARY_UNITS : system === 'decimal' ? DECIMAL_UNITS : [...DECIMAL_UNITS, ...BINARY_UNITS];

      let html = '<div class="space-y-2">';
      for (const u of units) {
        const converted = results[u.short];
        html += `
          <div class="flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <span class="text-sm text-gray-700 dark:text-gray-300">${u.name} <span class="text-gray-400">(${u.short})</span></span>
            <span class="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">${formatNumber(converted)} ${u.short}</span>
          </div>
        `;
      }
      html += '</div>';
      this.sizeOutput.innerHTML = html;
      this.sizeError.classList.add('hidden');
    } catch (error) {
      this.sizeError.textContent = error.message;
      this.sizeError.classList.remove('hidden');
    }
  }

  convertRate() {
    const value = parseFloat(this.rateValue.value);
    const unit = this.rateUnit.value;

    if (isNaN(value)) {
      this.rateOutput.innerHTML = '<div class="text-gray-500 dark:text-gray-400 text-sm italic">Enter a numeric value...</div>';
      this.rateError.classList.add('hidden');
      return;
    }

    try {
      const results = convertRateToAll(value, unit);
      let html = '<div class="space-y-2">';
      for (const u of RATE_UNITS) {
        const converted = results[u.short];
        html += `
          <div class="flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <span class="text-sm text-gray-700 dark:text-gray-300">${u.name} <span class="text-gray-400">(${u.short})</span></span>
            <span class="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">${formatNumber(converted)} ${u.short}</span>
          </div>
        `;
      }
      html += '</div>';
      this.rateOutput.innerHTML = html;
      this.rateError.classList.add('hidden');
    } catch (error) {
      this.rateError.textContent = error.message;
      this.rateError.classList.remove('hidden');
    }
  }

  calcDownloadTime() {
    const sizeVal = parseFloat(this.downloadSize.value);
    const sizeUnitShort = this.downloadUnit.value;
    const rateVal = parseFloat(this.rateValue.value);
    const rateUnitShort = this.rateUnit.value;

    if (isNaN(sizeVal) || isNaN(rateVal) || rateVal <= 0) {
      this.downloadTime.textContent = '—';
      return;
    }

    try {
      // Convert size to bytes
      const unit = [...DECIMAL_UNITS, ...BINARY_UNITS].find(u => u.short === sizeUnitShort);
      if (!unit) { this.downloadTime.textContent = '\u2014'; return; }

      const sizeBytes = sizeVal * unit.factor;
      // Convert rate to bps
      const rateUnit = RATE_UNITS.find(u => u.short === rateUnitShort);
      if (!rateUnit) { this.downloadTime.textContent = '\u2014'; return; }
      const rateBps = rateVal * rateUnit.factor;

      const { seconds, humanReadable } = estimateDownloadTime(sizeBytes, rateBps);
      this.downloadTime.textContent = `≈ ${humanReadable}`;
    } catch (error) {
      this.downloadTime.textContent = '—';
    }
  }

  destroy() {}
}
