import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { auditPageAccessibility, formatAccessibilityReport } from '../accessibility-compliance';

// Mock the a11y functions
vi.mock('../a11y', () => ({
  contrastRatio: vi.fn((fg: string, bg: string) => {
    // Simulate different contrast ratios based on colors
    if (fg === '#000000' && bg === '#FFFFFF') return 21;
    if (fg === '#CCCCCC' && bg === '#FFFFFF') return 1.6;
    if (fg === '#666666' && bg === '#FFFFFF') return 5.7;
    return 4.5; // Default to passing ratio
  }),
  meetsAA: vi.fn((fg: string, bg: string, largeText: boolean) => {
    const ratio = fg === '#CCCCCC' && bg === '#FFFFFF' ? 1.6 : 4.5;
    return largeText ? ratio >= 3 : ratio >= 4.5;
  })
}));

describe('Accessibility Compliance', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('auditPageAccessibility', () => {
    it('should return clean report for accessible page', () => {
      document.body.innerHTML = `
        <main>
          <h1>Test Page</h1>
          <button aria-label="Close">×</button>
          <input type="text" id="name" />
          <label for="name">Name</label>
          <img src="test.jpg" alt="Test image" />
        </main>
      `;

      const report = auditPageAccessibility();

      expect(report.failed).toBe(0);
      expect(report.score).toBeGreaterThan(0);
      expect(report.issues).toEqual(expect.arrayContaining([]));
    });

    it('should detect missing alt text on images', () => {
      document.body.innerHTML = `
        <img src="test.jpg" />
      `;

      const report = auditPageAccessibility();

      expect(report.failed).toBeGreaterThan(0);
      expect(report.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'error',
            rule: 'WCAG 2.1 AA Images of Text',
            message: 'Image lacks alt attribute or aria-hidden'
          })
        ])
      );
    });

    it('should detect buttons without accessible names', () => {
      document.body.innerHTML = `
        <button></button>
      `;

      const report = auditPageAccessibility();

      expect(report.failed).toBeGreaterThan(0);
      expect(report.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'error',
            rule: 'WCAG 2.1 AA Accessible Name',
            severity: 'critical'
          })
        ])
      );
    });

    it('should detect form inputs without labels', () => {
      document.body.innerHTML = `
        <input type="text" id="unlabeled" />
      `;

      const report = auditPageAccessibility();

      expect(report.failed).toBeGreaterThan(0);
      expect(report.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'error',
            rule: 'WCAG 2.1 AA Form Labels',
            message: 'Form input lacks associated label'
          })
        ])
      );
    });

    it('should detect missing main landmark', () => {
      document.body.innerHTML = `
        <div>
          <h1>No main element</h1>
        </div>
      `;

      const report = auditPageAccessibility();

      expect(report.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'error',
            rule: 'WCAG 2.1 AA Landmarks',
            message: 'Page lacks main landmark'
          })
        ])
      );
    });

    it('should detect heading hierarchy issues', () => {
      document.body.innerHTML = `
        <main>
          <h1>Title</h1>
          <h3>Skipped H2</h3>
        </main>
      `;

      const report = auditPageAccessibility();

      expect(report.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'warning',
            rule: 'WCAG 2.1 AA Heading Hierarchy',
            message: 'Heading level skipped (h1 to h3)'
          })
        ])
      );
    });

    it('should detect non-interactive elements with click handlers', () => {
      document.body.innerHTML = `
        <main>
          <div onclick="alert('click')">Clickable div</div>
        </main>
      `;

      const report = auditPageAccessibility();

      expect(report.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'error',
            rule: 'WCAG 2.1 AA Keyboard Accessible',
            message: 'Interactive element is not keyboard accessible (missing tabindex or role)'
          })
        ])
      );
    });

    it('should accept interactive elements with proper roles', () => {
      document.body.innerHTML = `
        <main>
          <div onclick="alert('click')" role="button" tabindex="0">Proper clickable div</div>
        </main>
      `;

      const report = auditPageAccessibility();

      // Should not have keyboard accessibility errors
      const keyboardErrors = report.issues.filter(
        issue => issue.rule === 'WCAG 2.1 AA Keyboard Accessible'
      );
      expect(keyboardErrors).toHaveLength(0);
    });

    it('should calculate score correctly', () => {
      document.body.innerHTML = `
        <main>
          <h1>Good Page</h1>
          <button>Good Button</button>
          <img src="test.jpg" alt="Good image" />
        </main>
      `;

      const report = auditPageAccessibility();

      expect(report.score).toBeGreaterThan(50);
      expect(typeof report.score).toBe('number');
      expect(report.score).toBeLessThanOrEqual(100);
    });

    it('should handle elements with proper ARIA attributes', () => {
      document.body.innerHTML = `
        <main>
          <button aria-label="Close dialog">×</button>
          <input type="text" aria-label="Search query" />
          <img src="decorative.jpg" aria-hidden="true" />
        </main>
      `;

      const report = auditPageAccessibility();

      // Should not have ARIA-related errors
      const ariaErrors = report.issues.filter(
        issue => issue.rule.includes('Accessible Name') ||
                issue.rule.includes('Form Labels') ||
                issue.rule.includes('Images')
      );
      expect(ariaErrors).toHaveLength(0);
    });
  });

  describe('formatAccessibilityReport', () => {
    it('should format report with no issues', () => {
      const report = {
        passed: 10,
        failed: 0,
        warnings: 0,
        issues: [],
        score: 100
      };

      const formatted = formatAccessibilityReport(report);

      expect(formatted).toContain('Score: 100/100');
      expect(formatted).toContain('Passed: 10 | Failed: 0 | Warnings: 0');
      expect(formatted).toContain('✅ No accessibility issues found!');
    });

    it('should format report with errors and warnings', () => {
      const report = {
        passed: 5,
        failed: 2,
        warnings: 1,
        issues: [
          {
            type: 'error' as const,
            rule: 'WCAG 2.1 AA Color Contrast',
            message: 'Insufficient color contrast',
            severity: 'high' as const
          },
          {
            type: 'warning' as const,
            rule: 'WCAG 2.1 AA Heading Hierarchy',
            message: 'Heading level skipped',
            severity: 'medium' as const
          }
        ],
        score: 75
      };

      const formatted = formatAccessibilityReport(report);

      expect(formatted).toContain('Score: 75/100');
      expect(formatted).toContain('❌ Errors (1)');
      expect(formatted).toContain('⚠️  Warnings (1)');
      expect(formatted).toContain('WCAG 2.1 AA Color Contrast');
      expect(formatted).toContain('WCAG 2.1 AA Heading Hierarchy');
    });

    it('should handle empty report gracefully', () => {
      const report = {
        passed: 0,
        failed: 0,
        warnings: 0,
        issues: [],
        score: 0
      };

      const formatted = formatAccessibilityReport(report);

      expect(formatted).toContain('Score: 0/100');
      expect(formatted).toContain('✅ No accessibility issues found!');
    });
  });
});