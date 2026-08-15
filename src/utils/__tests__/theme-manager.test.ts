import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThemeManager } from '../theme-manager';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

describe('ThemeManager', () => {
  let themeManager: ThemeManager;

  beforeEach(() => {
    // Reset DOM
    document.documentElement.className = '';

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });

    // Reset localStorage mock
    vi.clearAllMocks();

    // Mock dispatchEvent
    vi.spyOn(window, 'dispatchEvent');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should apply the default dark theme when no saved preference', () => {
      localStorageMock.getItem.mockReturnValue(null);

      themeManager = new ThemeManager();

      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(themeManager.theme).toBe('dark');
    });

    it('should apply saved light preference over the default', () => {
      localStorageMock.getItem.mockReturnValue('light');

      themeManager = new ThemeManager();

      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(themeManager.theme).toBe('light');
    });

    it('should apply saved dark preference', () => {
      localStorageMock.getItem.mockReturnValue('dark');

      themeManager = new ThemeManager();

      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(themeManager.theme).toBe('dark');
    });

    it('should dispatch theme-change event on initialization', () => {
      localStorageMock.getItem.mockReturnValue('light');

      themeManager = new ThemeManager();

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'theme-change',
          detail: { theme: 'light' }
        })
      );
    });

    it('should export the dark default theme constant', () => {
      expect(ThemeManager.DEFAULT_THEME).toBe('dark');
    });
  });

  describe('Theme Getting', () => {
    it('should return saved preference when available', () => {
      localStorageMock.getItem.mockReturnValue('light');
      const tm = new ThemeManager();
      expect(tm.theme).toBe('light');
    });

    it('should return the default (dark) when no saved preference', () => {
      localStorageMock.getItem.mockReturnValue(null);
      const tm = new ThemeManager();
      expect(tm.theme).toBe('dark');
    });
  });

  describe('Theme Setting', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(null);
      themeManager = new ThemeManager();
      vi.clearAllMocks();
    });

    it('should save theme to localStorage', () => {
      themeManager.set('light');

      expect(localStorageMock.setItem).toHaveBeenCalledWith('devtoolbox-theme', 'light');
    });

    it('should apply light class state when setting light theme', () => {
      themeManager.set('light');

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should apply dark class when setting dark theme', () => {
      themeManager.set('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      themeManager.set('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should dispatch theme-change event when setting theme', () => {
      themeManager.set('light');

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'theme-change',
          detail: { theme: 'light' }
        })
      );
    });

    it('should update theme getter after setting', () => {
      expect(themeManager.theme).toBe('dark');

      themeManager.set('light');
      expect(themeManager.theme).toBe('light');
    });
  });

  describe('Theme Toggle', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(null);
      themeManager = new ThemeManager();
      vi.clearAllMocks();
    });

    it('should toggle from the dark default to light', () => {
      expect(themeManager.theme).toBe('dark');

      themeManager.toggle();

      expect(themeManager.theme).toBe('light');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('devtoolbox-theme', 'light');
    });

    it('should toggle from dark to light when dark is set explicitly', () => {
      themeManager.set('dark');
      vi.clearAllMocks();

      themeManager.toggle();

      expect(themeManager.theme).toBe('light');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('devtoolbox-theme', 'light');
    });
  });

  describe('Theme Reset', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue('light');
      themeManager = new ThemeManager();
      vi.clearAllMocks();
    });

    it('should remove saved preference from localStorage', () => {
      themeManager.reset();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('devtoolbox-theme');
    });

    it('should fall back to the default theme after reset', () => {
      expect(themeManager.theme).toBe('light'); // Saved preference

      themeManager.reset();

      expect(themeManager.theme).toBe('dark'); // Default theme
    });

    it('should apply the default theme visually after reset', () => {
      // Initially light due to saved preference
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      themeManager.reset();

      // Should be dark due to the default
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should dispatch theme-change event on reset', () => {
      themeManager.reset();

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'theme-change',
          detail: { theme: 'dark' }
        })
      );
    });
  });

  describe('Event Handling', () => {
    it('should be initialized and ready for event handling', () => {
      localStorageMock.getItem.mockReturnValue(null);
      const tm = new ThemeManager();
      expect(tm).toBeInstanceOf(ThemeManager);
      expect(tm.theme).toBe('dark');
    });
  });
});
