/**
 * Theme manager — detects system preference, persists user choice,
 * provides toggle with `theme-change` event dispatch.
 */
export class ThemeManager {
  #storageKey = 'devtoolbox-theme';

  constructor() {
    this.#init();
  }

  /** Get the current effective theme. */
  get theme(): 'light' | 'dark' {
    const saved = this.#saved;
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  #saved: 'light' | 'dark' | null = (() => {
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem(this.#storageKey) : null;
    return v === 'dark' || v === 'light' ? v : null;
  })();

  #init(): void {
    this.#apply(this.theme);
    // Listen for system preference changes
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    mql.addEventListener('change', () => {
      if (!this.#saved) this.#apply(this.theme);
    });
  }

  #apply(theme: 'light' | 'dark'): void {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme } }));
  }

  set(theme: 'light' | 'dark'): void {
    localStorage.setItem(this.#storageKey, theme);
    this.#saved = theme;
    this.#apply(theme);
  }

  toggle(): void {
    this.set(this.theme === 'dark' ? 'light' : 'dark');
  }

  reset(): void {
    localStorage.removeItem(this.#storageKey);
    this.#saved = null;
    this.#apply(this.theme);
  }
}
