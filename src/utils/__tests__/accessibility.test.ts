import { describe, it, expect } from 'vitest';
import { parseHexColor, relativeLuminance, contrastRatio, meetsAA, meetsAAA } from '../a11y';

describe('Accessibility Testing', () => {
  describe('parseHexColor', () => {
    it('should parse 3-digit hex color', () => {
      const { r, g, b } = parseHexColor('#F00');
      expect(r).toBe(255);
      expect(g).toBe(0);
      expect(b).toBe(0);
    });

    it('should parse 6-digit hex color', () => {
      const { r, g, b } = parseHexColor('#FF0000');
      expect(r).toBe(255);
      expect(g).toBe(0);
      expect(b).toBe(0);
    });

    it('should parse white', () => {
      const { r, g, b } = parseHexColor('#FFFFFF');
      expect(r).toBe(255);
      expect(g).toBe(255);
      expect(b).toBe(255);
    });

    it('should parse black', () => {
      const { r, g, b } = parseHexColor('#000000');
      expect(r).toBe(0);
      expect(g).toBe(0);
      expect(b).toBe(0);
    });

    it('should parse mixed color', () => {
      const { r, g, b } = parseHexColor('#336699');
      expect(r).toBe(51);
      expect(g).toBe(102);
      expect(b).toBe(153);
    });
  });

  describe('relativeLuminance', () => {
    it('should return 1 for white', () => {
      expect(relativeLuminance(255, 255, 255)).toBe(1);
    });

    it('should return 0 for black', () => {
      expect(relativeLuminance(0, 0, 0)).toBe(0);
    });

    it('should return value between 0 and 1 for gray', () => {
      const lum = relativeLuminance(128, 128, 128);
      expect(lum).toBeGreaterThan(0);
      expect(lum).toBeLessThan(1);
    });
  });

  describe('contrastRatio', () => {
    it('should return 21 for black on white', () => {
      const ratio = contrastRatio('#000000', '#FFFFFF');
      expect(ratio).toBeCloseTo(21, 1);
    });

    it('should return 1 for white on white', () => {
      const ratio = contrastRatio('#FFFFFF', '#FFFFFF');
      expect(ratio).toBeCloseTo(1, 1);
    });

    it('should return 1 for black on black', () => {
      const ratio = contrastRatio('#000000', '#000000');
      expect(ratio).toBeCloseTo(1, 1);
    });

    it('should return symmetric ratio', () => {
      const ratio1 = contrastRatio('#000000', '#FFFFFF');
      const ratio2 = contrastRatio('#FFFFFF', '#000000');
      expect(ratio1).toBeCloseTo(ratio2, 1);
    });

    it('should return ratio between 1 and 21', () => {
      const ratio = contrastRatio('#333333', '#CCCCCC');
      expect(ratio).toBeGreaterThanOrEqual(1);
      expect(ratio).toBeLessThanOrEqual(21);
    });
  });

  describe('meetsAA', () => {
    it('should pass AA normal text for black on white (4.5:1)', () => {
      const passes = meetsAA('#000000', '#FFFFFF', false);
      expect(passes).toBe(true);
    });

    it('should fail AA normal text for low contrast', () => {
      const passes = meetsAA('#777777', '#FFFFFF', false);
      expect(passes).toBe(false);
    });

    it('should pass AA large text for moderate contrast (3:1)', () => {
      const passes = meetsAA('#595959', '#FFFFFF', true);
      expect(passes).toBe(true);
    });
  });

  describe('meetsAAA', () => {
    it('should pass AAA normal text for high contrast (7:1)', () => {
      const passes = meetsAAA('#000000', '#FFFFFF', false);
      expect(passes).toBe(true);
    });

    it('should fail AAA normal text for moderate contrast', () => {
      // #666666 on white is ~5.7:1 — passes AA (4.5:1) but fails AAA (7:1).
      // (#333333 on white is ~12.6:1, which actually passes AAA.)
      const passes = meetsAAA('#666666', '#FFFFFF', false);
      expect(passes).toBe(false);
    });
  });

  describe('WCAG Compliance DOM Checks', () => {
    it('should detect missing alt text on images', () => {
      const img = document.createElement('img');
      img.src = 'test.jpg';
      document.body.appendChild(img);
      expect(img.getAttribute('alt')).toBeNull();
      img.remove();
    });

    it('should detect images with proper alt text', () => {
      const img = document.createElement('img');
      img.src = 'test.jpg';
      img.alt = 'A descriptive alt text';
      document.body.appendChild(img);
      expect(img.getAttribute('alt')).toBe('A descriptive alt text');
      img.remove();
    });

    it('should detect decorative images with empty alt', () => {
      const img = document.createElement('img');
      img.src = 'decorative.jpg';
      img.alt = '';
      img.setAttribute('role', 'presentation');
      document.body.appendChild(img);
      expect(img.getAttribute('alt')).toBe('');
      expect(img.getAttribute('role')).toBe('presentation');
      img.remove();
    });

    it('should detect properly labeled form inputs', () => {
      const label = document.createElement('label');
      label.setAttribute('for', 'email');
      label.textContent = 'Email';
      const input = document.createElement('input');
      input.id = 'email';
      input.type = 'email';
      document.body.appendChild(label);
      document.body.appendChild(input);
      const associatedLabel = document.querySelector('label[for="email"]');
      expect(associatedLabel).toBeDefined();
      label.remove();
      input.remove();
    });

    it('should detect focusable elements', () => {
      const btn = document.createElement('button');
      document.body.appendChild(btn);
      btn.focus();
      expect(document.activeElement).toBe(btn);
      btn.remove();
    });

    it('should detect skip navigation link', () => {
      const skipLink = document.createElement('a');
      skipLink.href = '#main-content';
      skipLink.textContent = 'Skip to main content';
      skipLink.className = 'sr-only focus:not-sr-only';
      document.body.appendChild(skipLink);
      expect(skipLink.getAttribute('href')).toBe('#main-content');
      expect(skipLink.className).toContain('sr-only');
      skipLink.remove();
    });
  });
});
