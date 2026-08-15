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
import { icon } from "../../utils/icons.ts";

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
        <div class="dt-seg">
          <button id="tab-size" class="dt-seg-btn dt-seg-btn-active" data-tab="size">Data Size</button>
          <button id="tab-rate" class="dt-seg-btn" data-tab="rate">Transfer Rate</button>
        </div>

        <!-- Data Size Panel -->
        <div id="panel-size" class="space-y-4">
          <div class="flex flex-wrap items-end gap-4">
            <div class="flex-1 min-w-[200px]">
              <label for="size-value" class="dt-label mb-1.5 block">Value</label>
              <input id="size-value" type="number" class="dt-field" placeholder="1" value="1" />
            </div>
            <div class="w-full sm:w-44">
              <label for="size-unit" class="dt-label mb-1.5 block">Unit</label>
              <select id="size-unit" class="dt-field"></select>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13.5px]">
            <label class="flex cursor-pointer items-center gap-2 dt-text-2">
              <input type="radio" name="size-system" value="decimal" />
              Decimal (SI: KB, MB, GB)
            </label>
            <label class="flex cursor-pointer items-center gap-2 dt-text-2">
              <input type="radio" name="size-system" value="binary" />
              Binary (IEC: KiB, MiB, GiB)
            </label>
            <label class="flex cursor-pointer items-center gap-2 dt-text-2">
              <input type="radio" name="size-system" value="all" checked />
              Show both
            </label>
          </div>

          <div id="size-error" class="dt-box dt-box-error hidden items-center! p-3! text-[13px] text-red-600 dark:text-red-400"></div>

          <div id="size-output" class="space-y-4">
            <div class="dt-empty text-sm">Enter a value to see conversions...</div>
          </div>
        </div>

        <!-- Transfer Rate Panel -->
        <div id="panel-rate" class="hidden space-y-4">
          <div class="flex flex-wrap items-end gap-4">
            <div class="flex-1 min-w-[200px]">
              <label for="rate-value" class="dt-label mb-1.5 block">Rate</label>
              <input id="rate-value" type="number" class="dt-field" placeholder="100" value="100" />
            </div>
            <div class="w-full sm:w-44">
              <label for="rate-unit" class="dt-label mb-1.5 block">Unit</label>
              <select id="rate-unit" class="dt-field"></select>
            </div>
          </div>

          <div id="rate-error" class="dt-box dt-box-error hidden items-center! p-3! text-[13px] text-red-600 dark:text-red-400"></div>

          <div id="rate-output" class="space-y-4">
            <div class="dt-empty text-sm">Enter a rate to see conversions...</div>
          </div>

          <!-- Download time calculator -->
          <div class="dt-box dt-box-info items-start! space-y-3">
            <span class="dt-accent">${icon('download', 18)}</span>
            <div class="min-w-0 flex-1 space-y-3">
              <h3 class="text-sm font-medium">Download Time Estimator</h3>
              <div class="flex flex-wrap items-end gap-3">
                <div>
                  <label for="download-size" class="dt-meta mb-1 block">File Size</label>
                  <input id="download-size" type="number" class="dt-field w-32! py-1.5!" placeholder="1" value="1" />
                </div>
                <div>
                  <label for="download-unit" class="dt-meta mb-1 block">Unit</label>
                  <select id="download-unit" class="dt-field w-auto! py-1.5!">
                    <option value="MB">MB</option>
                    <option value="GB">GB</option>
                    <option value="TB">TB</option>
                    <option value="B">Bytes</option>
                  </select>
                </div>
                <div class="flex items-center">
                  <span id="download-time" class="dt-accent text-sm font-medium">—</span>
                </div>
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
          b.className = active ? 'dt-seg-btn dt-seg-btn-active' : 'dt-seg-btn';
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
      this.sizeOutput.innerHTML = '<div class="dt-empty text-sm">Enter a numeric value...</div>';
      this.sizeError.classList.add('hidden');
      return;
    }

    try {
      const results = convertToAllUnits(value, unit);
      const units = system === 'binary' ? BINARY_UNITS : system === 'decimal' ? DECIMAL_UNITS : [...DECIMAL_UNITS, ...BINARY_UNITS];

      let html = '<div class="dt-card divide-y divide-(--border) overflow-hidden p-0!">';
      for (const u of units) {
        const converted = results[u.short];
        html += `
          <div class="flex items-center justify-between px-4 py-2.5">
            <span class="text-[13.5px] dt-text-2">${u.name} <span class="dt-text-3">(${u.short})</span></span>
            <span class="font-mono text-[13.5px] font-medium">${formatNumber(converted)} ${u.short}</span>
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
      this.rateOutput.innerHTML = '<div class="dt-empty text-sm">Enter a numeric value...</div>';
      this.rateError.classList.add('hidden');
      return;
    }

    try {
      const results = convertRateToAll(value, unit);
      let html = '<div class="dt-card divide-y divide-(--border) overflow-hidden p-0!">';
      for (const u of RATE_UNITS) {
        const converted = results[u.short];
        html += `
          <div class="flex items-center justify-between px-4 py-2.5">
            <span class="text-[13.5px] dt-text-2">${u.name} <span class="dt-text-3">(${u.short})</span></span>
            <span class="font-mono text-[13.5px] font-medium">${formatNumber(converted)} ${u.short}</span>
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
