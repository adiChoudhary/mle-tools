/**
 * Timestamp Converter Tool Island
 * Bidirectional conversion between Unix Epoch, ISO 8601, and human-readable dates
 */

import { icon } from "../../utils/icons.ts";

export class TimestampConverter {
  constructor(element) {
    this.element = element;
    this.mode = 'epoch-to-datetime';
    this.currentInput = '';
  }

  init() {
    this.render();
    this.bindEvents();
  }

  render() {
    this.element.innerHTML = `
      <div class="space-y-6">
        <!-- Mode Selector -->
        <div class="dt-panel p-4">
          <h3 class="dt-label mb-3">Conversion Mode</h3>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button id="mode-epoch-to-datetime" class="dt-alg-btn dt-alg-btn-active text-left" data-mode="epoch-to-datetime">
              <span class="block font-semibold">Epoch → Date/Time</span>
              <span class="block text-xs opacity-75 mt-0.5">Convert Unix timestamp to readable date</span>
            </button>
            <button id="mode-datetime-to-epoch" class="dt-alg-btn text-left" data-mode="datetime-to-epoch">
              <span class="block font-semibold">Date/Time → Epoch</span>
              <span class="block text-xs opacity-75 mt-0.5">Convert date string to Unix timestamp</span>
            </button>
          </div>
        </div>

        <!-- Epoch-to-Datetime Panel -->
        <div id="panel-epoch-to-datetime" class="space-y-4">
          <div class="space-y-2">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <label for="epoch-input" class="dt-label">Unix Timestamp</label>
              <div class="flex items-center gap-2">
                <select id="epoch-unit" class="dt-field w-auto! px-2.5! py-1.5! text-[13px]!">
                  <option value="seconds">Seconds</option>
                  <option value="milliseconds">Milliseconds</option>
                </select>
                <button id="now-btn" type="button" class="dt-btn dt-btn-soft dt-btn-sm">Now</button>
                <button id="clear-epoch-btn" type="button" class="dt-btn dt-btn-sm">Clear</button>
              </div>
            </div>
            <input id="epoch-input" type="text" class="dt-field" placeholder="e.g. 1704067200" />
          </div>

          <div id="epoch-error" class="dt-box dt-box-error hidden items-center! p-3! text-[13px] text-red-600 dark:text-red-400"></div>

          <!-- Output -->
          <div id="epoch-output" class="space-y-3">
            <div class="dt-empty text-sm">Enter a Unix timestamp to see conversions...</div>
          </div>
        </div>

        <!-- Datetime-to-Epoch Panel -->
        <div id="panel-datetime-to-epoch" class="hidden space-y-4">
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label for="datetime-input" class="dt-label">Date / Time</label>
              <div class="flex items-center gap-2">
                <button id="clear-datetime-btn" type="button" class="dt-btn dt-btn-sm">Clear</button>
              </div>
            </div>
            <input id="datetime-input" type="text" class="dt-field" placeholder="e.g. 2024-01-01T00:00:00Z or Jan 1, 2024 00:00:00 UTC" />
          </div>

          <div id="datetime-error" class="dt-box dt-box-error hidden items-center! p-3! text-[13px] text-red-600 dark:text-red-400"></div>

          <button id="convert-datetime-btn" type="button" class="dt-btn dt-btn-primary">Convert</button>

          <div id="datetime-output" class="space-y-3">
            <div class="dt-empty text-sm">Enter a date/time to see the epoch timestamp...</div>
          </div>
        </div>

        <!-- Timezone info -->
        <div class="dt-box dt-box-info items-start!">
          <span class="dt-accent">${icon('info', 18)}</span>
          <div>
            <h3 class="mb-2 text-sm font-medium">About Unix Timestamps</h3>
            <div class="space-y-1 text-[13px] dt-text-2">
              <p>Unix timestamps count seconds (or milliseconds) since January 1, 1970 00:00:00 UTC (the "Unix Epoch").</p>
              <p>Most systems use <strong>seconds</strong> (10 digits), but JavaScript and some APIs use <strong>milliseconds</strong> (13 digits).</p>
              <p>Your browser's local timezone: <strong id="user-timezone"></strong></p>
            </div>
          </div>
        </div>
      </div>
    `;

    // DOM refs
    this.epochPanel = this.element.querySelector('#panel-epoch-to-datetime');
    this.datetimePanel = this.element.querySelector('#panel-datetime-to-epoch');
    this.epochInput = this.element.querySelector('#epoch-input');
    this.epochUnit = this.element.querySelector('#epoch-unit');
    this.epochOutput = this.element.querySelector('#epoch-output');
    this.epochError = this.element.querySelector('#epoch-error');
    this.datetimeInput = this.element.querySelector('#datetime-input');
    this.datetimeOutput = this.element.querySelector('#datetime-output');
    this.datetimeError = this.element.querySelector('#datetime-error');

    // Set timezone
    this.element.querySelector('#user-timezone').textContent = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  bindEvents() {
    // Mode toggle
    this.element.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => this.setMode(btn.dataset.mode));
    });

    // Epoch-to-datetime: live conversion on input
    this.epochInput.addEventListener('input', () => this.convertEpoch());
    this.epochUnit.addEventListener('change', () => this.convertEpoch());

    // Now button
    this.element.querySelector('#now-btn').addEventListener('click', () => {
      const now = this.epochUnit.value === 'milliseconds'
        ? Date.now().toString()
        : Math.floor(Date.now() / 1000).toString();
      this.epochInput.value = now;
      this.convertEpoch();
    });

    // Clear epoch
    this.element.querySelector('#clear-epoch-btn').addEventListener('click', () => {
      this.epochInput.value = '';
      this.epochOutput.innerHTML = '<div class="dt-empty text-sm">Enter a Unix timestamp to see conversions...</div>';
      this.epochError.classList.add('hidden');
    });

    // Datetime-to-epoch
    this.element.querySelector('#convert-datetime-btn').addEventListener('click', () => this.convertDatetime());
    this.datetimeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.convertDatetime();
    });

    this.element.querySelector('#clear-datetime-btn').addEventListener('click', () => {
      this.datetimeInput.value = '';
      this.datetimeOutput.innerHTML = '<div class="dt-empty text-sm">Enter a date/time to see the epoch timestamp...</div>';
      this.datetimeError.classList.add('hidden');
    });
  }

  setMode(mode) {
    this.element.querySelectorAll('[data-mode]').forEach(btn => {
      const active = btn.dataset.mode === mode;
      btn.className = active ? 'dt-alg-btn dt-alg-btn-active text-left' : 'dt-alg-btn text-left';
    });

    this.epochPanel.classList.toggle('hidden', mode !== 'epoch-to-datetime');
    this.datetimePanel.classList.toggle('hidden', mode !== 'datetime-to-epoch');
  }

  convertEpoch() {
    const input = this.epochInput.value.trim();
    if (!input) {
      this.epochOutput.innerHTML = '<div class="dt-empty text-sm">Enter a Unix timestamp to see conversions...</div>';
      this.epochError.classList.add('hidden');
      return;
    }

    const num = parseInt(input, 10);
    if (isNaN(num)) {
      this.epochError.textContent = 'Please enter a valid numeric timestamp.';
      this.epochError.classList.remove('hidden');
      return;
    }
    this.epochError.classList.add('hidden');

    // Determine milliseconds
    const unit = this.epochUnit.value;
    const ms = unit === 'seconds' ? num * 1000 : num;
    const date = new Date(ms);

    if (isNaN(date.getTime())) {
      this.epochError.textContent = 'Timestamp is out of valid range.';
      this.epochError.classList.remove('hidden');
      return;
    }

    const utcString = date.toUTCString();
    const isoString = date.toISOString();
    const localString = date.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' });
    const utcFormatted = date.toLocaleString('en-US', { timeZone: 'UTC', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' UTC';

    // Relative time
    const now = Date.now();
    const diff = ms - now;
    const absDiff = Math.abs(diff);
    const seconds = Math.floor(absDiff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const prefix = diff > 0 ? 'in ' : '';
    let relative;
    if (days > 365) relative = `${prefix}${Math.floor(days / 365)} year${Math.floor(days / 365) !== 1 ? 's' : ''}`;
    else if (days > 30) relative = `${prefix}${Math.floor(days / 30)} month${Math.floor(days / 30) !== 1 ? 's' : ''}`;
    else if (days > 0) relative = `${prefix}${days} day${days !== 1 ? 's' : ''}`;
    else if (hours > 0) relative = `${prefix}${hours} hour${hours !== 1 ? 's' : ''}`;
    else if (minutes > 0) relative = `${prefix}${minutes} minute${minutes !== 1 ? 's' : ''}`;
    else relative = diff > 0 ? 'in a few seconds' : diff < 0 ? 'a few seconds ago' : 'right now';

    const isFuture = diff > 0;
    const isPast = diff < 0;
    const timeColor = isFuture ? 'dt-accent' : isPast ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400';

    this.epochOutput.innerHTML = `
      <div class="dt-panel p-4 space-y-3.5">
        <div class="flex items-baseline gap-2.5">
          <span class="flex items-center gap-1.5 text-sm font-semibold ${timeColor}">${icon('clock', 15)}${isFuture ? 'Future' : isPast ? 'Past' : 'Right Now'}</span>
          <span class="text-[13px] dt-text-3">${relative}</span>
        </div>

        <div class="space-y-2.5">
          <div>
            <span class="dt-meta">Local Time</span>
            <p class="mt-0.5 font-medium">${localString}</p>
          </div>

          <div>
            <span class="dt-meta">UTC</span>
            <p class="mt-0.5 font-medium">${utcFormatted}</p>
          </div>

          <div>
            <span class="dt-meta">ISO 8601</span>
            <p class="mt-0.5 font-mono text-[13.5px]">${isoString}</p>
          </div>

          <div>
            <span class="dt-meta">RFC 2822</span>
            <p class="mt-0.5 font-mono text-[13.5px]">${utcString}</p>
          </div>

          <div class="border-t border-(--border) pt-2.5">
            <span class="dt-meta">Timestamps</span>
            <div class="mt-1 space-y-1">
              <p class="font-mono text-[13.5px]">Seconds: <span class="dt-accent">${Math.floor(ms / 1000)}</span></p>
              <p class="font-mono text-[13.5px]">Milliseconds: <span class="dt-accent">${ms}</span></p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  convertDatetime() {
    const input = this.datetimeInput.value.trim();
    if (!input) {
      this.datetimeError.textContent = 'Please enter a date/time.';
      this.datetimeError.classList.remove('hidden');
      return;
    }

    const date = new Date(input);
    if (isNaN(date.getTime())) {
      this.datetimeError.textContent = 'Could not parse that date. Try ISO 8601 format (2024-01-01T00:00:00Z) or a readable format (Jan 1, 2024).';
      this.datetimeError.classList.remove('hidden');
      this.datetimeOutput.innerHTML = '<div class="dt-empty text-sm">Fix the error above and try again.</div>';
      return;
    }

    this.datetimeError.classList.add('hidden');

    const seconds = Math.floor(date.getTime() / 1000);
    const milliseconds = date.getTime();

    this.datetimeOutput.innerHTML = `
      <div class="dt-panel p-4 space-y-3.5">
        <div>
          <span class="dt-meta">Parsed as:</span>
          <p class="mt-0.5 font-medium">${date.toUTCString()}</p>
        </div>

        <div class="space-y-3 border-t border-(--border) pt-3">
          <div class="flex items-center justify-between gap-3">
            <div>
              <span class="dt-meta">Epoch Seconds</span>
              <p class="mt-0.5 font-mono text-lg dt-accent">${seconds}</p>
            </div>
            <button class="copy-epoch-btn dt-btn dt-btn-sm py-0.5! px-2.5! text-xs!" data-value="${seconds}">Copy</button>
          </div>

          <div class="flex items-center justify-between gap-3">
            <div>
              <span class="dt-meta">Epoch Milliseconds</span>
              <p class="mt-0.5 font-mono text-lg dt-accent">${milliseconds}</p>
            </div>
            <button class="copy-epoch-btn dt-btn dt-btn-sm py-0.5! px-2.5! text-xs!" data-value="${milliseconds}">Copy</button>
          </div>
        </div>
      </div>
    `;

    // Bind copy buttons
    this.datetimeOutput.querySelectorAll('.copy-epoch-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(btn.dataset.value);
          const original = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(() => { btn.textContent = original; }, 2000);
        } catch (error) {
          console.error('Failed to copy:', error);
        }
      });
    });
  }

  destroy() {}
}
