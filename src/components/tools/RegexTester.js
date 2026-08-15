/**
 * Regex Tester Tool Island
 * Real-time regex match highlighting with pre-loaded common patterns
 */

export class RegexTester {
  constructor(element) {
    this.element = element;
    this.currentPattern = '';
    this.currentFlags = 'gi';
    this.currentText = '';
    this.matches = [];
    this.regexp = null;
  }

  init() {
    this.render();
    this.bindEvents();
  }

  render() {
    this.element.innerHTML = `
      <div class="space-y-4">
        <!-- Pattern & Flags -->
        <div class="flex flex-col sm:flex-row gap-3">
          <div class="flex-1">
            <label for="regex-pattern" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pattern</label>
            <div class="flex gap-2">
              <span class="flex items-center text-gray-400 dark:text-gray-500 font-mono text-sm self-stretch">/</span>
              <input id="regex-pattern" type="text" class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter regex pattern..." />
              <span class="flex items-center text-gray-400 dark:text-gray-500 font-mono text-sm self-stretch">/</span>
              <input id="regex-flags" type="text" value="gi" class="w-16 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>
        </div>

        <!-- Flags info -->
        <div class="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>Flags:</span>
          <code class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">g</code> global
          <code class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">i</code> case-insensitive
          <code class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">m</code> multiline
          <code class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">s</code> dotAll
          <code class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">u</code> unicode
        </div>

        <!-- Preset patterns -->
        <div class="space-y-2">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Common Patterns:</span>
          <div id="regex-presets" class="flex flex-wrap gap-2"></div>
        </div>

        <!-- Error -->
        <div id="regex-error" class="hidden bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300"></div>

        <!-- Test text -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label for="regex-test-text" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Test Text</label>
            <div class="flex items-center space-x-2">
              <span id="match-count" class="text-sm text-gray-500 dark:text-gray-400">0 matches</span>
              <button id="regex-clear-btn" class="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors">Clear</button>
            </div>
          </div>
          <textarea id="regex-test-text" class="w-full h-48 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter text to test the regex against..." spellcheck="false"></textarea>
        </div>

        <!-- Highlighted output -->
        <div class="space-y-2">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Matches (highlighted)</span>
          <div id="regex-output" class="w-full min-h-32 max-h-64 overflow-auto px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 font-mono text-sm whitespace-pre-wrap break-words">
            <span class="text-gray-400 dark:text-gray-500 italic">Enter a pattern and test text...</span>
          </div>
        </div>

        <!-- Match details -->
        <div id="regex-matches" class="hidden space-y-2">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Match Details</span>
          <div id="regex-matches-list" class="space-y-1"></div>
        </div>
      </div>
    `;

    // DOM refs
    this.patternInput = this.element.querySelector('#regex-pattern');
    this.flagsInput = this.element.querySelector('#regex-flags');
    this.testTextarea = this.element.querySelector('#regex-test-text');
    this.output = this.element.querySelector('#regex-output');
    this.errorDiv = this.element.querySelector('#regex-error');
    this.matchCount = this.element.querySelector('#match-count');
    this.matchesDiv = this.element.querySelector('#regex-matches');
    this.matchesList = this.element.querySelector('#regex-matches-list');
    this.presetsDiv = this.element.querySelector('#regex-presets');

    // Bind presets
    this.renderPresets();
  }

  renderPresets() {
    const presets = [
      { label: 'Email', pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}' },
      { label: 'URL', pattern: "https?://[\\w\\-._~:/?#\\[\\]@!$&()*+,;=%]+" },
      { label: 'IPv4', pattern: '\\b(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\b' },
      { label: 'UUID', pattern: '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}' },
      { label: 'Phone (US)', pattern: '\\+?1?[-.\\s]?(\\d{3})[-.\\s]?(\\d{3})[-.\\s]?(\\d{4})' },
      { label: 'Hex Color', pattern: '#?[0-9a-fA-F]{6}' },
      { label: 'IP Address', pattern: '\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\b' },
      { label: 'HTML Tag', pattern: '<\\w+[^>]*>' },
      { label: 'Log Timestamp', pattern: '\\d{4}-\\d{2}-\\d{2}[T ]\\d{2}:\\d{2}:\\d{2}' },
      { label: 'Base64', pattern: '^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$' },
    ];

    this.presetsDiv.innerHTML = presets.map(p =>
      `<button class="preset-btn px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" data-pattern="${p.pattern}">${p.label}</button>`
    ).join('');

    this.presetsDiv.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.patternInput.value = btn.dataset.pattern;
        this.test();
      });
    });
  }

  bindEvents() {
    // Live testing on input
    this.patternInput.addEventListener('input', () => this.test());
    this.flagsInput.addEventListener('input', () => this.test());
    this.testTextarea.addEventListener('input', () => this.test());

    // Clear
    this.element.querySelector('#regex-clear-btn').addEventListener('click', () => {
      this.patternInput.value = '';
      this.testTextarea.value = '';
      this.output.innerHTML = '<span class="text-gray-400 dark:text-gray-500 italic">Enter a pattern and test text...</span>';
      this.matchCount.textContent = '0 matches';
      this.matchesDiv.classList.add('hidden');
      this.errorDiv.classList.add('hidden');
    });

    // Keyboard shortcuts
    this.patternInput.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.test();
      }
    });
  }

  test() {
    const pattern = this.patternInput.value;
    const flags = this.flagsInput.value;
    const text = this.testTextarea.value;

    this.currentPattern = pattern;
    this.currentFlags = flags;
    this.currentText = text;

    if (!pattern) {
      this.output.innerHTML = text ? this.highlightText(text) : '<span class="text-gray-400 dark:text-gray-500 italic">Enter a pattern and test text...</span>';
      this.errorDiv.classList.add('hidden');
      this.matchCount.textContent = '0 matches';
      this.matchesDiv.classList.add('hidden');
      return;
    }

    try {
      this.regexp = new RegExp(pattern, flags);
      this.errorDiv.classList.add('hidden');
    } catch (error) {
      this.errorDiv.textContent = `Invalid regex: ${error.message}`;
      this.errorDiv.classList.remove('hidden');
      this.output.innerHTML = text ? this.highlightText(text) : '<span class="text-gray-400 dark:text-gray-500 italic">Fix the regex error above...</span>';
      this.matchCount.textContent = '0 matches';
      this.matchesDiv.classList.add('hidden');
      return;
    }

    this.matches = [];
    let match;

    // Reset sticky for global regex
    this.regexp.lastIndex = 0;

    if (flags.includes('g')) {
      while ((match = this.regexp.exec(text)) !== null) {
        this.matches.push({
          index: match.index,
          length: match[0].length,
          match: match[0],
          groups: match.slice(1),
        });
        // Prevent infinite loop on zero-length matches
        if (match[0].length === 0) {
          this.regexp.lastIndex++;
        }
      }
    } else {
      match = this.regexp.exec(text);
      if (match) {
        this.matches.push({
          index: match.index,
          length: match[0].length,
          match: match[0],
          groups: match.slice(1),
        });
      }
    }

    this.matchCount.textContent = `${this.matches.length} match${this.matches.length !== 1 ? 'es' : ''}`;

    // Highlighted output
    this.output.innerHTML = this.highlightTextWithMatches(text);

    // Match details
    if (this.matches.length > 0) {
      let html = '';
      this.matches.forEach((m, i) => {
        html += `
          <div class="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-blue-600 dark:text-blue-400">Match ${i + 1}</span>
              <span class="text-xs text-gray-500 dark:text-gray-400">Position: ${m.index}</span>
            </div>
            <p class="font-mono text-sm text-gray-900 dark:text-gray-100 mt-1">${this.escapeHtml(m.match)}</p>
            ${m.groups.length > 0 ? `
              <div class="mt-1 space-y-0.5">
                ${m.groups.map((g, gi) => `
                  <p class="text-xs font-mono text-gray-600 dark:text-gray-400">Group ${gi + 1}: <span class="text-gray-900 dark:text-gray-100">${this.escapeHtml(g ?? '(empty)')}</span></p>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `;
      });
      this.matchesList.innerHTML = html;
      this.matchesDiv.classList.remove('hidden');
    } else {
      this.matchesDiv.classList.add('hidden');
    }
  }

  highlightTextWithMatches(text) {
    if (!this.matches.length) {
      return this.highlightText(text);
    }

    let result = '';
    let lastIndex = 0;

    for (const m of this.matches) {
      // Add text before the match
      result += this.highlightText(text.slice(lastIndex, m.index));

      // Add the highlighted match
      result += `<mark class="bg-yellow-200 dark:bg-yellow-900/40 rounded-sm px-0.5">${this.escapeHtml(m.match)}</mark>`;

      lastIndex = m.index + m.length;
    }

    // Add remaining text
    result += this.highlightText(text.slice(lastIndex));
    return result;
  }

  highlightText(text) {
    return this.escapeHtml(text).replace(/\n/g, '<br>');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  destroy() {}
}
