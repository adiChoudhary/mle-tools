/**
 * Accessibility compliance testing utilities
 *
 * Provides automated checks for WCAG 2.1 AA compliance including:
 * - Color contrast verification
 * - Focus management
 * - ARIA attributes validation
 * - Keyboard navigation testing
 */

import { contrastRatio, meetsAA } from './a11y';

export interface AccessibilityReport {
  passed: number;
  failed: number;
  warnings: number;
  issues: AccessibilityIssue[];
  score: number; // 0-100
}

export interface AccessibilityIssue {
  type: 'error' | 'warning';
  rule: string;
  message: string;
  element?: HTMLElement;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Run comprehensive accessibility audit on the current page
 */
export function auditPageAccessibility(): AccessibilityReport {
  const issues: AccessibilityIssue[] = [];

  // Check color contrast
  issues.push(...checkColorContrast());

  // Check focus management
  issues.push(...checkFocusManagement());

  // Check ARIA attributes
  issues.push(...checkARIAAttributes());

  // Check keyboard navigation
  issues.push(...checkKeyboardNavigation());

  // Check semantic markup
  issues.push(...checkSemanticMarkup());

  // Calculate score
  const errors = issues.filter(i => i.type === 'error').length;
  const warnings = issues.filter(i => i.type === 'warning').length;
  const totalChecks = Math.max(10, errors + warnings + 10); // Minimum 10 checks for baseline

  const passed = totalChecks - errors - warnings;
  const failed = errors;

  const score = Math.round((passed / totalChecks) * 100);

  return {
    passed,
    failed,
    warnings,
    issues,
    score
  };
}

/**
 * Check color contrast compliance across the page
 */
function checkColorContrast(): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];

  // Get all text elements
  const textElements = document.querySelectorAll<HTMLElement>(
    'p, h1, h2, h3, h4, h5, h6, span, div, button, input, label, a'
  );

  textElements.forEach(element => {
    const computedStyle = window.getComputedStyle(element);
    const color = computedStyle.color;
    const backgroundColor = computedStyle.backgroundColor;

    // Skip elements with transparent backgrounds
    if (backgroundColor === 'rgba(0, 0, 0, 0)' || backgroundColor === 'transparent') {
      return;
    }

    try {
      const ratio = contrastRatio(rgbToHex(color), rgbToHex(backgroundColor));
      const fontSize = parseFloat(computedStyle.fontSize);
      const fontWeight = computedStyle.fontWeight;
      const isLargeText = fontSize >= 18 || (fontSize >= 14 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700));

      if (!meetsAA(rgbToHex(color), rgbToHex(backgroundColor), isLargeText)) {
        issues.push({
          type: 'error',
          rule: 'WCAG 2.1 AA Color Contrast',
          message: `Insufficient color contrast (${ratio.toFixed(2)}:1). ${isLargeText ? 'Large text requires 3:1 minimum.' : 'Normal text requires 4.5:1 minimum.'}`,
          element,
          severity: 'high'
        });
      } else if (ratio < (isLargeText ? 4.5 : 7)) {
        issues.push({
          type: 'warning',
          rule: 'WCAG 2.1 AAA Color Contrast',
          message: `Color contrast could be improved (${ratio.toFixed(2)}:1) for AAA compliance.`,
          element,
          severity: 'medium'
        });
      }
    } catch (error) {
      // Skip elements where color parsing fails
    }
  });

  return issues;
}

/**
 * Check focus management and keyboard accessibility
 */
function checkFocusManagement(): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];

  // Check for focusable elements without visible focus indicators
  const focusableElements = document.querySelectorAll<HTMLElement>(
    'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
  );

  focusableElements.forEach(element => {
    // Check if element has proper focus styles
    element.focus();
    const computedStyle = window.getComputedStyle(element, ':focus');
    const hasOutline = computedStyle.outline !== 'none' && computedStyle.outline !== '';
    const hasBoxShadow = computedStyle.boxShadow !== 'none';
    const hasFocusVisible = element.matches(':focus-visible');

    if (!hasOutline && !hasBoxShadow && !hasFocusVisible) {
      issues.push({
        type: 'error',
        rule: 'WCAG 2.1 AA Focus Visible',
        message: 'Focusable element lacks visible focus indicator',
        element,
        severity: 'high'
      });
    }
  });

  // Remove focus from last element
  (document.activeElement as HTMLElement)?.blur();

  return issues;
}

/**
 * Check ARIA attributes and labels
 */
function checkARIAAttributes(): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];

  // Check buttons without accessible names
  const buttons = document.querySelectorAll<HTMLElement>('button');
  buttons.forEach(button => {
    const hasText = button.textContent?.trim();
    const hasAriaLabel = button.getAttribute('aria-label');
    const hasAriaLabelledBy = button.getAttribute('aria-labelledby');

    if (!hasText && !hasAriaLabel && !hasAriaLabelledBy) {
      issues.push({
        type: 'error',
        rule: 'WCAG 2.1 AA Accessible Name',
        message: 'Button element lacks accessible name (text content, aria-label, or aria-labelledby)',
        element: button,
        severity: 'critical'
      });
    }
  });

  // Check form inputs without labels
  const inputs = document.querySelectorAll<HTMLInputElement>('input:not([type="hidden"])');
  inputs.forEach(input => {
    const hasLabel = document.querySelector(`label[for="${input.id}"]`);
    const hasAriaLabel = input.getAttribute('aria-label');
    const hasAriaLabelledBy = input.getAttribute('aria-labelledby');

    if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy) {
      issues.push({
        type: 'error',
        rule: 'WCAG 2.1 AA Form Labels',
        message: 'Form input lacks associated label',
        element: input,
        severity: 'high'
      });
    }
  });

  // Check images without alt text
  const images = document.querySelectorAll<HTMLImageElement>('img');
  images.forEach(img => {
    if (!img.alt && !img.getAttribute('aria-hidden')) {
      issues.push({
        type: 'error',
        rule: 'WCAG 2.1 AA Images of Text',
        message: 'Image lacks alt attribute or aria-hidden',
        element: img,
        severity: 'high'
      });
    }
  });

  return issues;
}

/**
 * Check keyboard navigation support
 */
function checkKeyboardNavigation(): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];

  // Check for click handlers on non-interactive elements
  const nonInteractiveElements = document.querySelectorAll<HTMLElement>(
    'div[onclick], span[onclick], img[onclick]'
  );

  nonInteractiveElements.forEach(element => {
    if (!element.getAttribute('tabindex') && !element.getAttribute('role')) {
      issues.push({
        type: 'error',
        rule: 'WCAG 2.1 AA Keyboard Accessible',
        message: 'Interactive element is not keyboard accessible (missing tabindex or role)',
        element,
        severity: 'high'
      });
    }
  });

  return issues;
}

/**
 * Check semantic markup
 */
function checkSemanticMarkup(): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];

  // Check for heading hierarchy
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
    .map(h => parseInt(h.tagName.charAt(1)));

  for (let i = 1; i < headings.length; i++) {
    const current = headings[i];
    const previous = headings[i - 1];

    if (current > previous + 1) {
      issues.push({
        type: 'warning',
        rule: 'WCAG 2.1 AA Heading Hierarchy',
        message: `Heading level skipped (h${previous} to h${current})`,
        severity: 'medium'
      });
    }
  }

  // Check for missing main landmark
  const main = document.querySelector('main, [role="main"]');
  if (!main) {
    issues.push({
      type: 'error',
      rule: 'WCAG 2.1 AA Landmarks',
      message: 'Page lacks main landmark',
      severity: 'medium'
    });
  }

  return issues;
}

/**
 * Convert RGB color string to hex
 */
function rgbToHex(rgb: string): string {
  // Handle hex colors that are already in hex format
  if (rgb.startsWith('#')) {
    return rgb;
  }

  // Handle rgb() format
  const result = rgb.match(/\d+/g);
  if (!result || result.length < 3) {
    throw new Error('Invalid RGB color format');
  }

  const [r, g, b] = result.map(num => parseInt(num, 10));
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Generate accessibility report as formatted text
 */
export function formatAccessibilityReport(report: AccessibilityReport): string {
  const { passed, failed, warnings, issues, score } = report;

  let output = `\n=== Accessibility Report ===\n`;
  output += `Score: ${score}/100\n`;
  output += `Passed: ${passed} | Failed: ${failed} | Warnings: ${warnings}\n\n`;

  if (issues.length === 0) {
    output += `✅ No accessibility issues found!\n`;
  } else {
    const errors = issues.filter(i => i.type === 'error');
    const warns = issues.filter(i => i.type === 'warning');

    if (errors.length > 0) {
      output += `❌ Errors (${errors.length}):\n`;
      errors.forEach((issue, index) => {
        output += `  ${index + 1}. [${issue.severity.toUpperCase()}] ${issue.rule}\n`;
        output += `     ${issue.message}\n\n`;
      });
    }

    if (warns.length > 0) {
      output += `⚠️  Warnings (${warns.length}):\n`;
      warns.forEach((issue, index) => {
        output += `  ${index + 1}. [${issue.severity.toUpperCase()}] ${issue.rule}\n`;
        output += `     ${issue.message}\n\n`;
      });
    }
  }

  return output;
}