/**
 * Pure string-based HTML escaping (no DOM node allocation).
 * Use everywhere user-influenced text is interpolated into innerHTML —
 * creating a DOM node per call is slow for tree/row rendering.
 */
const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
}
