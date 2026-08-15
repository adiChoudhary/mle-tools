/**
 * Single source of truth for the tool list.
 * Used by the home page grid and the command palette (BaseLayout).
 */
export interface ToolEntry {
  name: string;
  path: string;
  icon: string;
  description: string;
}

export const TOOLS: ToolEntry[] = [
  { name: 'JSON Formatter', path: '/tools/json-formatter', icon: '📄', description: 'Format, validate, and compare JSON data' },
  { name: 'Base64 Encoder', path: '/tools/base64-encoder', icon: '🔤', description: 'Encode and decode Base64 strings' },
  { name: 'JWT Decoder', path: '/tools/jwt-decoder', icon: '🔑', description: 'Decode and validate JSON Web Tokens' },
  { name: 'URL Encoder', path: '/tools/url-encoder', icon: '🔗', description: 'Encode and decode URL parameters' },
  { name: 'Hash Generator', path: '/tools/hash-generator', icon: '🔐', description: 'Generate MD5, SHA-1, SHA-256, SHA-512 hashes' },
  { name: 'Timestamp Converter', path: '/tools/timestamp-converter', icon: '⏰', description: 'Convert between timestamp formats' },
  { name: 'Data Converter', path: '/tools/data-converter', icon: '🔄', description: 'Convert between CSV, JSON, and YAML' },
  { name: 'Regex Tester', path: '/tools/regex-and-sample-data', icon: '🎯', description: 'Test regular expressions with real-time matching' },
  { name: 'Sample Data Generator', path: '/tools/regex-and-sample-data', icon: '📊', description: 'Generate mock JSON, CSV, and SQL data' },
  { name: 'Crypto Tool', path: '/tools/crypto', icon: '🛡️', description: 'AES-GCM and RSA encryption and decryption' },
  { name: 'Crontab Evaluator', path: '/tools/crontab-evaluator', icon: '⏱️', description: 'Validate and evaluate cron expressions' },
  { name: 'Data Measurement', path: '/tools/data-measurement', icon: '📐', description: 'Convert data sizes and transfer rates' },
];
