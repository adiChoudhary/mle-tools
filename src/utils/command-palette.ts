/**
 * Command palette search/filter logic — extracted for testability.
 * Used by both the Astro component and its test suite.
 */

export interface ToolEntry {
  name: string;
  path: string;
  icon: string;
  description: string;
}

/**
 * Filter tools by a search query.
 * Matches against name and description (case-insensitive, substring).
 */
export function filterTools(tools: ToolEntry[], query: string): ToolEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return tools.slice();
  return tools.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q)
  );
}

/**
 * Determine the next active index after an arrow-key navigation step.
 */
export function nextActiveIndex(
  current: number,
  total: number,
  direction: 'up' | 'down'
): number {
  if (total === 0) return -1;
  if (direction === 'up') {
    return current <= 0 ? total - 1 : current - 1;
  }
  return current >= total - 1 ? 0 : current + 1;
}

/**
 * Escape HTML entities to prevent XSS in search result highlighting.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Highlight a substring match inside text.
 * Returns HTML with `<mark>` wrapping the matched portion.
 */
export function highlightMatch(text: string, query: string): string {
  const q = query.trim();
  if (!q) return escapeHtml(text);
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q.toLowerCase());
  if (idx === -1) return escapeHtml(text);

  const before = escapeHtml(text.slice(0, idx));
  const match = escapeHtml(text.slice(idx, idx + q.length));
  const after = escapeHtml(text.slice(idx + q.length));
  return `${before}<mark class="bg-yellow-200 dark:bg-yellow-700/50 rounded-sm px-0.5 -mx-0.5">${match}</mark>${after}`;
}
