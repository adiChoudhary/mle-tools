/**
 * Theme manager — persists user choice, provides toggle with
 * `theme-change` event dispatch.
 *
 * Default theme is **dark** (the flagship look); the user's explicit
 * choice always wins and is persisted in localStorage.
 * The inline bootstrap script in BaseLayout.astro mirrors this logic
 * to avoid a flash of the wrong theme before first paint.
 */
export class ThemeManager {
  #storageKey = 'devtoolbox-theme';

  /** Theme applied when the user has made no explicit choice. */
  static readonly DEFAULT_THEME: 'light' | 'dark' = 'dark';

  constructor() {
    this.#init();
  }

  /** Get the current effective theme. */
  get theme(): 'light' | 'dark' {
    return this.#saved ?? ThemeManager.DEFAULT_THEME;
  }

  #saved: 'light' | 'dark' | null = (() => {
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem(this.#storageKey) : null;
    return v === 'dark' || v === 'light' ? v : null;
  })();

  #init(): void {
    this.#apply(this.theme);
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

  /** Remove the explicit choice and fall back to the default theme. */
  reset(): void {
    localStorage.removeItem(this.#storageKey);
    this.#saved = null;
    this.#apply(this.theme);
  }
}
