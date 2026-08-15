import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThemeManager } from '../theme-manager';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

// Mock matchMedia
const createMatchMediaMock = (matches: boolean) => {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];
  return {
    matches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn((event: string, listener: (e: MediaQueryListEvent) => void) => {
      if (event === 'change') {
        listeners.push(listener);
      }
    }),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    // Helper to trigger change event
    _triggerChange: (newMatches: boolean) => {
      listeners.forEach(listener => {
        listener({ matches: newMatches } as MediaQueryListEvent);
      });
    }
  };
};

describe('ThemeManager', () => {
  let themeManager: ThemeManager;
  let mockMatchMedia: ReturnType<typeof createMatchMediaMock>;

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

    // Mock matchMedia
    mockMatchMedia = createMatchMediaMock(false); // Default to light mode
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn(() => mockMatchMedia)
    });

    // Mock dispatchEvent
    vi.spyOn(window, 'dispatchEvent');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should apply light theme by default when no saved preference and system is light', () => {
      localStorageMock.getItem.mockReturnValue(null);
      mockMatchMedia.matches = false;

      themeManager = new ThemeManager();

      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(themeManager.theme).toBe('light');
    });

    it('should apply dark theme when system preference is dark and no saved preference', () => {
      localStorageMock.getItem.mockReturnValue(null);
      mockMatchMedia.matches = true;

      themeManager = new ThemeManager();

      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(themeManager.theme).toBe('dark');
    });

    it('should apply saved preference over system preference', () => {
      localStorageMock.getItem.mockReturnValue('dark');
      mockMatchMedia.matches = false; // System is light

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
  });

  describe('Theme Getting', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(null);
      mockMatchMedia.matches = false;
      themeManager = new ThemeManager();
      vi.clearAllMocks();
    });

    it('should return saved preference when available', () => {
      localStorageMock.getItem.mockReturnValue('dark');
      // Create new instance to test saved preference
      const tm = new ThemeManager();
      expect(tm.theme).toBe('dark');
    });

    it('should return system preference when no saved preference', () => {
      localStorageMock.getItem.mockReturnValue(null);
      mockMatchMedia.matches = true;
      const tm = new ThemeManager();
      expect(tm.theme).toBe('dark');
    });
  });

  describe('Theme Setting', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(null);
      mockMatchMedia.matches = false;
      themeManager = new ThemeManager();
      vi.clearAllMocks();
    });

    it('should save theme to localStorage', () => {
      themeManager.set('dark');

      expect(localStorageMock.setItem).toHaveBeenCalledWith('devtoolbox-theme', 'dark');
    });

    it('should apply dark class when setting dark theme', () => {
      themeManager.set('dark');

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should remove dark class when setting light theme', () => {
      // First set dark
      themeManager.set('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      // Then set light
      themeManager.set('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should dispatch theme-change event when setting theme', () => {
      themeManager.set('dark');

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'theme-change',
          detail: { theme: 'dark' }
        })
      );
    });

    it('should update theme getter after setting', () => {
      expect(themeManager.theme).toBe('light');

      themeManager.set('dark');
      expect(themeManager.theme).toBe('dark');
    });
  });

  describe('Theme Toggle', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(null);
      mockMatchMedia.matches = false;
      themeManager = new ThemeManager();
      vi.clearAllMocks();
    });

    it('should toggle from light to dark', () => {
      expect(themeManager.theme).toBe('light');

      themeManager.toggle();

      expect(themeManager.theme).toBe('dark');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('devtoolbox-theme', 'dark');
    });

    it('should toggle from dark to light', () => {
      themeManager.set('dark');
      vi.clearAllMocks();

      themeManager.toggle();

      expect(themeManager.theme).toBe('light');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('devtoolbox-theme', 'light');
    });
  });

  describe('Theme Reset', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue('dark');
      mockMatchMedia.matches = false; // System preference is light
      themeManager = new ThemeManager();
      vi.clearAllMocks();
    });

    it('should remove saved preference from localStorage', () => {
      themeManager.reset();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('devtoolbox-theme');
    });

    it('should fall back to system preference after reset', () => {
      expect(themeManager.theme).toBe('dark'); // Saved preference

      themeManager.reset();

      expect(themeManager.theme).toBe('light'); // System preference
    });

    it('should apply system preference visually after reset', () => {
      // Initially dark due to saved preference
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      themeManager.reset();

      // Should be light due to system preference
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should dispatch theme-change event on reset', () => {
      themeManager.reset();

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'theme-change',
          detail: { theme: 'light' }
        })
      );
    });
  });

  describe('System Preference Changes', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(null); // No saved preference
      mockMatchMedia.matches = false;
      themeManager = new ThemeManager();
      vi.clearAllMocks();
    });

    it('should respond to system theme changes when no saved preference', () => {
      expect(themeManager.theme).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      // Simulate system change to dark
      mockMatchMedia.matches = true;
      (mockMatchMedia as any)._triggerChange(true);

      expect(themeManager.theme).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should not respond to system changes when user has saved preference', () => {
      // Set user preference
      themeManager.set('light');
      vi.clearAllMocks();

      // Simulate system change to dark
      mockMatchMedia.matches = true;
      (mockMatchMedia as any)._triggerChange(true);

      // Should still be light due to saved preference
      expect(themeManager.theme).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(window.dispatchEvent).not.toHaveBeenCalled();
    });
  });

  describe('Event Handling', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(null);
      mockMatchMedia.matches = false;
      themeManager = new ThemeManager();
      vi.clearAllMocks();
    });

    it('should be initialized and ready for event handling', () => {
      // Basic test to ensure theme manager is properly set up
      expect(themeManager).toBeInstanceOf(ThemeManager);
      expect(themeManager.theme).toBe('light');
    });
  });
});