// Memory limits and performance constants
export const MEMORY_LIMITS = {
  WORKER_THRESHOLD: 10 * 1024 * 1024, // 10MB - threshold for using Web Workers
  MAX_FILE_SIZE: 50 * 1024 * 1024,    // 50MB - hard limit for processing
  LOADING_DELAY: 500,                   // 500ms - delay before showing loading state
} as const;

// Security and privacy constants
export const SECURITY = {
  CSP_NONCE: crypto.randomUUID(),
  WIPE_DATA_ON_UNLOAD: true,
} as const;

// Performance thresholds
export const PERFORMANCE = {
  TARGET_LIGHTHOUSE_SCORE: 95,
  MAX_BUNDLE_SIZE: 250 * 1024, // 250KB per tool bundle
} as const;

// Tool categories and metadata
export const TOOL_CATEGORIES = {
  JSON: 'JSON Tools',
  ENCODING: 'Encoding/Decoding',
  CRYPTO: 'Cryptographic Tools',
  TIME: 'Time & Date',
  DATA: 'Data Conversion',
  DEV: 'Developer Utilities',
} as const;

// Common MIME types for file handling
export const MIME_TYPES = {
  JSON: 'application/json',
  CSV: 'text/csv',
  YAML: 'text/yaml',
  TEXT: 'text/plain',
} as const;