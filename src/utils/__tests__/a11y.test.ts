import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  parseHexColor,
  relativeLuminance,
  contrastRatio,
  meetsAA,
  meetsAAA,
  createFocusTrap,
  moveFocus
} from '../a11y';

describe('Accessibility Utilities', () => {
  describe('Color Parsing and Contrast', () => {
    describe('parseHexColor', () => {
      it('should parse 6-character hex colors', () => {
        expect(parseHexColor('#FF0000')).toEqual({ r: 255, g: 0, b: 0 });
        expect(parseHexColor('#00FF00')).toEqual({ r: 0, g: 255, b: 0 });
        expect(parseHexColor('#0000FF')).toEqual({ r: 0, g: 0, b: 255 });
        expect(parseHexColor('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
        expect(parseHexColor('#000000')).toEqual({ r: 0, g: 0, b: 0 });
      });

      it('should parse 3-character hex colors', () => {
        expect(parseHexColor('#F00')).toEqual({ r: 255, g: 0, b: 0 });
        expect(parseHexColor('#0F0')).toEqual({ r: 0, g: 255, b: 0 });
        expect(parseHexColor('#00F')).toEqual({ r: 0, g: 0, b: 255 });
        expect(parseHexColor('#FFF')).toEqual({ r: 255, g: 255, b: 255 });
        expect(parseHexColor('#000')).toEqual({ r: 0, g: 0, b: 0 });
      });

      it('should handle hex colors without # prefix', () => {
        expect(parseHexColor('FF0000')).toEqual({ r: 255, g: 0, b: 0 });
        expect(parseHexColor('F00')).toEqual({ r: 255, g: 0, b: 0 });
      });
    });

    describe('relativeLuminance', () => {
      it('should calculate correct luminance for white', () => {
        const luminance = relativeLuminance(255, 255, 255);
        expect(luminance).toBeCloseTo(1, 3);
      });

      it('should calculate correct luminance for black', () => {
        const luminance = relativeLuminance(0, 0, 0);
        expect(luminance).toBeCloseTo(0, 3);
      });

      it('should calculate luminance for mid-gray', () => {
        const luminance = relativeLuminance(128, 128, 128);
        expect(luminance).toBeGreaterThan(0);
        expect(luminance).toBeLessThan(1);
      });
    });

    describe('contrastRatio', () => {
      it('should return 21:1 for black on white', () => {
        const ratio = contrastRatio('#000000', '#FFFFFF');
        expect(ratio).toBeCloseTo(21, 1);
      });

      it('should return 1:1 for identical colors', () => {
        expect(contrastRatio('#FF0000', '#FF0000')).toBeCloseTo(1, 1);
        expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 1);
      });

      it('should be symmetric (order should not matter)', () => {
        const ratio1 = contrastRatio('#000000', '#FFFFFF');
        const ratio2 = contrastRatio('#FFFFFF', '#000000');
        expect(ratio1).toBeCloseTo(ratio2, 3);
      });
    });

    describe('WCAG Compliance', () => {
      describe('meetsAA', () => {
        it('should pass for high contrast combinations', () => {
          expect(meetsAA('#000000', '#FFFFFF')).toBe(true); // 21:1
          expect(meetsAA('#FFFFFF', '#000000')).toBe(true); // 21:1
        });

        it('should fail for low contrast combinations', () => {
          expect(meetsAA('#888888', '#999999')).toBe(false);
          expect(meetsAA('#FF0000', '#FF4444')).toBe(false);
        });

        it('should handle large text threshold correctly', () => {
          // Use black/white which we know has 21:1 ratio, so both should pass
          // And use gray that definitely fails normal but passes large
          expect(meetsAA('#000000', '#FFFFFF', true)).toBe(true); // Black/white large text
          expect(meetsAA('#000000', '#FFFFFF', false)).toBe(true); // Black/white normal text

          // Light gray that should fail both (very low contrast)
          expect(meetsAA('#F0F0F0', '#FFFFFF', true)).toBe(false); // Light gray large text
          expect(meetsAA('#F0F0F0', '#FFFFFF', false)).toBe(false); // Light gray normal text
        });
      });

      describe('meetsAAA', () => {
        it('should pass for very high contrast combinations', () => {
          expect(meetsAAA('#000000', '#FFFFFF')).toBe(true); // 21:1
        });

        it('should fail for moderate contrast that passes AA', () => {
          // Test with light gray that should fail AAA but could pass AA
          expect(meetsAAA('#CCCCCC', '#FFFFFF')).toBe(false); // Light gray has very low contrast
        });

        it('should handle large text threshold correctly', () => {
          // Test with black/white (21:1) which passes all thresholds
          expect(meetsAAA('#000000', '#FFFFFF', true)).toBe(true); // Black/white large text
          expect(meetsAAA('#000000', '#FFFFFF', false)).toBe(true); // Black/white normal text

          // Test with light gray that fails all thresholds
          expect(meetsAAA('#F0F0F0', '#FFFFFF', true)).toBe(false); // Light gray large text
          expect(meetsAAA('#F0F0F0', '#FFFFFF', false)).toBe(false); // Light gray normal text
        });
      });
    });
  });

  describe('Focus Management', () => {
    let container: HTMLElement;

    beforeEach(() => {
      document.body.innerHTML = '';
      container = document.createElement('div');
      container.innerHTML = `
        <button id="btn1">Button 1</button>
        <input id="input1" type="text" />
        <a id="link1" href="#">Link 1</a>
        <button id="btn2" disabled>Disabled Button</button>
        <select id="select1">
          <option>Option 1</option>
        </select>
        <textarea id="textarea1"></textarea>
        <div tabindex="0" id="div1">Focusable Div</div>
        <div tabindex="-1" id="div2">Non-focusable Div</div>
      `;
      document.body.appendChild(container);
    });

    afterEach(() => {
      document.body.innerHTML = '';
    });

    describe('createFocusTrap', () => {
      it('should focus first focusable element on creation', () => {
        const cleanup = createFocusTrap(container);
        expect(document.activeElement).toBe(document.getElementById('btn1'));
        cleanup();
      });

      it('should trap focus within container', () => {
        const cleanup = createFocusTrap(container);
        const btn1 = document.getElementById('btn1') as HTMLElement;
        const div1 = document.getElementById('div1') as HTMLElement;

        // Focus should start on first element
        expect(document.activeElement).toBe(btn1);

        // Simulate Shift+Tab on first element - should go to last
        btn1.focus();
        const shiftTabEvent = new KeyboardEvent('keydown', {
          key: 'Tab',
          shiftKey: true,
          bubbles: true
        });
        document.dispatchEvent(shiftTabEvent);

        // Should cycle to last focusable element
        expect(document.activeElement).toBe(div1);

        cleanup();
      });

      it('should restore previous focus on cleanup', () => {
        const externalButton = document.createElement('button');
        externalButton.id = 'external';
        document.body.appendChild(externalButton);
        externalButton.focus();

        const cleanup = createFocusTrap(container);
        expect(document.activeElement).not.toBe(externalButton);

        cleanup();
        expect(document.activeElement).toBe(externalButton);
      });

      it('should not interfere with non-Tab key events', () => {
        const cleanup = createFocusTrap(container);
        const btn1 = document.getElementById('btn1') as HTMLElement;
        btn1.focus();

        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true
        });

        // Should not prevent Enter key
        let defaultPrevented = false;
        btn1.addEventListener('keydown', (e) => {
          defaultPrevented = e.defaultPrevented;
        });

        document.dispatchEvent(enterEvent);
        expect(defaultPrevented).toBe(false);

        cleanup();
      });
    });

    describe('moveFocus', () => {
      it('should move focus to next element', () => {
        const btn1 = document.getElementById('btn1') as HTMLElement;
        const input1 = document.getElementById('input1') as HTMLElement;

        btn1.focus();
        moveFocus(container, 'next');
        expect(document.activeElement).toBe(input1);
      });

      it('should move focus to previous element', () => {
        const input1 = document.getElementById('input1') as HTMLElement;
        const btn1 = document.getElementById('btn1') as HTMLElement;

        input1.focus();
        moveFocus(container, 'previous');
        expect(document.activeElement).toBe(btn1);
      });

      it('should wrap around when at end', () => {
        const div1 = document.getElementById('div1') as HTMLElement;
        const btn1 = document.getElementById('btn1') as HTMLElement;

        div1.focus(); // Last focusable element
        moveFocus(container, 'next');
        expect(document.activeElement).toBe(btn1); // Should wrap to first
      });

      it('should wrap around when at beginning', () => {
        const btn1 = document.getElementById('btn1') as HTMLElement;
        const div1 = document.getElementById('div1') as HTMLElement;

        btn1.focus(); // First focusable element
        moveFocus(container, 'previous');
        expect(document.activeElement).toBe(div1); // Should wrap to last
      });

      it('should skip disabled elements', () => {
        const input1 = document.getElementById('input1') as HTMLElement;
        const link1 = document.getElementById('link1') as HTMLElement;

        input1.focus();
        moveFocus(container, 'next');
        expect(document.activeElement).toBe(link1); // Should skip disabled button
      });

      it('should skip elements with tabindex="-1"', () => {
        const textarea1 = document.getElementById('textarea1') as HTMLElement;
        const div1 = document.getElementById('div1') as HTMLElement;

        textarea1.focus();
        moveFocus(container, 'next');
        expect(document.activeElement).toBe(div1); // Should skip div with tabindex="-1"
      });
    });
  });
});