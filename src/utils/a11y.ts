/**
 * Accessibility (a11y) utilities.
 *
 * - WCAG 2.1 AA color contrast verification
 * - Focus trap management for modal dialogs
 */

// ── WCAG 2.1 Color Contrast ──

/**
 * Parse a hex color string (#RGB or #RRGGBB) to { r, g, b } (0–255).
 */
export function parseHexColor(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  const num = parseInt(h, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Relative luminance per WCAG 2.1 (W3C formula).
 */
export function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Contrast ratio between two hex colors.
 * Returns a number between 1 and 21.
 */
export function contrastRatio(
  fg: string,
  bg: string
): number {
  const l1 = relativeLuminance(...Object.values(parseHexColor(fg)));
  const l2 = relativeLuminance(...Object.values(parseHexColor(bg)));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if a foreground/background pair passes WCAG 2.1 AA.
 * - Normal text (≤ 18pt / 14pt bold): 4.5:1
 * - Large text (> 18pt / 14pt bold): 3:1
 */
export function meetsAA(fg: string, bg: string, largeText = false): boolean {
  const ratio = contrastRatio(fg, bg);
  return largeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Check if a foreground/background pair passes WCAG 2.1 AAA.
 * - Normal text: 7:1
 * - Large text: 4.5:1
 */
export function meetsAAA(fg: string, bg: string, largeText = false): boolean {
  const ratio = contrastRatio(fg, bg);
  return largeText ? ratio >= 4.5 : ratio >= 7;
}

// ── Focus Trap (for dialogs / modals) ──

/**
 * Focusable element selector.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Trap focus inside a container element.
 * Returns a cleanup function that restores previous focus.
 */
export function createFocusTrap(container: HTMLElement): () => void {
  const previousFocus = document.activeElement;
  const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  function handleKeydown(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  }

  document.addEventListener('keydown', handleKeydown);

  // Focus first element
  first?.focus();

  return () => {
    document.removeEventListener('keydown', handleKeydown);
    if (previousFocus instanceof HTMLElement) {
      previousFocus.focus();
    }
  };
}

// ── Keyboard Navigation ──

/**
 * Move focus to the next or previous focusable element within a container.
 */
export function moveFocus(
  container: HTMLElement | Document,
  direction: 'next' | 'previous' = 'next'
): void {
  const focusable = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  ).filter((el) => {
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });

  const currentIdx = focusable.indexOf(document.activeElement as HTMLElement);
  let nextIdx: number;

  if (direction === 'next') {
    nextIdx = currentIdx < focusable.length - 1 ? currentIdx + 1 : 0;
  } else {
    nextIdx = currentIdx > 0 ? currentIdx - 1 : focusable.length - 1;
  }

  focusable[nextIdx]?.focus();
}
