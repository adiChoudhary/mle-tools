import { describe, it, expect } from 'vitest';
import { filterTools, nextActiveIndex, escapeHtml, highlightMatch } from '../command-palette';
import type { ToolEntry } from '../command-palette';

const sampleTools: ToolEntry[] = [
  { name: 'JSON Formatter', path: '/tools/json-formatter', icon: '📄', description: 'Format and validate JSON' },
  { name: 'Base64 Encoder', path: '/tools/base64-encoder', icon: '🔤', description: 'Encode and decode Base64' },
  { name: 'JWT Decoder', path: '/tools/jwt-decoder', icon: '🔑', description: 'Decode JSON Web Tokens' },
  { name: 'Hash Generator', path: '/tools/hash-generator', icon: '🔐', description: 'Generate MD5 and SHA hashes' },
];

describe('Command Palette — filterTools', () => {
  it('returns all tools for empty query', () => {
    expect(filterTools(sampleTools, '')).toHaveLength(4);
    expect(filterTools(sampleTools, '   ')).toHaveLength(4);
  });

  it('matches by name (case-insensitive)', () => {
    expect(filterTools(sampleTools, 'json')).toHaveLength(2);
    expect(filterTools(sampleTools, 'JSON')).toHaveLength(2);
    expect(filterTools(sampleTools, 'Json')).toHaveLength(2);
  });

  it('matches by description', () => {
    expect(filterTools(sampleTools, 'base64')).toHaveLength(1);
    expect(filterTools(sampleTools, 'token')).toHaveLength(1);
  });

  it('returns empty for no match', () => {
    expect(filterTools(sampleTools, 'xyz123')).toHaveLength(0);
  });

  it('handles partial matches', () => {
    expect(filterTools(sampleTools, 'encod')).toHaveLength(1);
  });

  it('does not mutate the original array', () => {
    const original = [...sampleTools];
    filterTools(sampleTools, 'json');
    expect(sampleTools).toEqual(original);
  });
});

describe('Command Palette — nextActiveIndex', () => {
  it('wraps down at the end', () => {
    expect(nextActiveIndex(3, 4, 'down')).toBe(0);
  });

  it('wraps up at the start', () => {
    expect(nextActiveIndex(0, 4, 'up')).toBe(3);
  });

  it('moves normally in the middle', () => {
    expect(nextActiveIndex(1, 4, 'down')).toBe(2);
    expect(nextActiveIndex(2, 4, 'up')).toBe(1);
  });

  it('returns -1 for empty list', () => {
    expect(nextActiveIndex(0, 0, 'down')).toBe(-1);
    expect(nextActiveIndex(0, 0, 'up')).toBe(-1);
  });

  it('handles single item', () => {
    expect(nextActiveIndex(0, 1, 'down')).toBe(0);
    expect(nextActiveIndex(0, 1, 'up')).toBe(0);
  });
});

describe('Command Palette — escapeHtml', () => {
  it('escapes & < > " "', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('leaves safe text unchanged', () => {
    expect(escapeHtml('Hello World 123')).toBe('Hello World 123');
  });
});

describe('Command Palette — highlightMatch', () => {
  it('wraps match in <mark>', () => {
    const result = highlightMatch('JSON Formatter', 'json');
    expect(result).toContain('<mark class="bg-yellow-200 dark:bg-yellow-700/50 rounded-sm px-0.5 -mx-0.5">JSON</mark>');
  });

  it('returns escaped text for no match', () => {
    expect(highlightMatch('Hello', 'xyz')).toBe('Hello');
  });

  it('escapes XSS in non-matched portion', () => {
    const result = highlightMatch('<b>Bold</b>', 'bold');
    expect(result).not.toContain('<b>');
    expect(result).toContain('&lt;b&gt;');
  });

  it('returns escaped text for empty query', () => {
    expect(highlightMatch('Test', '')).toBe('Test');
  });
});
