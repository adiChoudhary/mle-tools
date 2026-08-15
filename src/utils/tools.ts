/**
 * Single source of truth for the tool list.
 * Used by the home page grid and the command palette (BaseLayout).
 *
 * `icon` is a key into the inline SVG icon library (utils/icons.ts) —
 * icons are inlined so the site makes zero external requests.
 */
export interface ToolEntry {
  name: string;
  path: string;
  icon: string;
  description: string;
  category: ToolCategory;
}

export type ToolCategory = 'convert' | 'format' | 'security' | 'generate';

export const TOOL_CATEGORIES: Array<{ id: ToolCategory; label: string }> = [
  { id: 'convert', label: 'Convert & Encode' },
  { id: 'format', label: 'Format & Parse' },
  { id: 'security', label: 'Security & Crypto' },
  { id: 'generate', label: 'Test & Generate' },
];

export const TOOLS: ToolEntry[] = [
  { name: 'Base64 Encoder', path: '/tools/base64-encoder', icon: 'binary', category: 'convert', description: 'Encode and decode Base64 strings' },
  { name: 'URL Encoder', path: '/tools/url-encoder', icon: 'link', category: 'convert', description: 'Encode and decode URL parameters' },
  { name: 'Data Converter', path: '/tools/data-converter', icon: 'arrow-left-right', category: 'convert', description: 'Convert between CSV, JSON, and YAML' },
  { name: 'Timestamp Converter', path: '/tools/timestamp-converter', icon: 'clock', category: 'convert', description: 'Convert between timestamp formats' },
  { name: 'Data Measurement', path: '/tools/data-measurement', icon: 'ruler', category: 'convert', description: 'Convert data sizes and transfer rates' },
  { name: 'JSON Formatter', path: '/tools/json-formatter', icon: 'braces', category: 'format', description: 'Format, validate, and compare JSON data' },
  { name: 'Crontab Evaluator', path: '/tools/crontab-evaluator', icon: 'timer', category: 'format', description: 'Validate and evaluate cron expressions' },
  { name: 'JWT Decoder', path: '/tools/jwt-decoder', icon: 'key-round', category: 'security', description: 'Decode and validate JSON Web Tokens' },
  { name: 'Hash Generator', path: '/tools/hash-generator', icon: 'hash', category: 'security', description: 'Generate MD5, SHA-1, SHA-256, SHA-512 hashes' },
  { name: 'Crypto Tool', path: '/tools/crypto', icon: 'shield-check', category: 'security', description: 'AES-GCM and RSA encryption and decryption' },
  { name: 'Regex Tester', path: '/tools/regex-and-sample-data', icon: 'target', category: 'generate', description: 'Test regular expressions with real-time matching' },
  { name: 'Sample Data Generator', path: '/tools/regex-and-sample-data', icon: 'database', category: 'generate', description: 'Generate mock JSON, CSV, and SQL data' },
];
