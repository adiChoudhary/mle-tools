/**
 * Generic data processing worker
 * Handles JSON, CSV, YAML, Base64 and hash operations off the main thread.
 *
 * Bundled by Vite via `?worker&url` (module worker). Dependencies are
 * statically imported so the worker is a single self-contained bundle
 * (no dynamic chunk loading — keeps CSP `worker-src 'self'` simple).
 *
 * Message protocol (see WorkerPool.processTask):
 *   in:  { id, type: 'process', payload: { operation, input } }
 *   out: { id, type: 'result' | 'error', payload | error }
 */

import Papa from 'papaparse';
import * as yaml from 'js-yaml';
import { md5 } from '../utils/md5.ts';
import { WorkerOperation } from '../utils/worker-interface.ts';
import type { EnhancedWorkerMessage, WorkerProgress } from '../utils/worker-interface.ts';

// Worker context (browser workers expose `self`)
const ctx = self as unknown as DedicatedWorkerGlobalScope & Record<string, any>;

/**
 * Send progress update to main thread
 */
function reportProgress(id: string, progress: WorkerProgress): void {
  ctx.postMessage({ id, type: 'progress', progress });
}

/**
 * Send success result to main thread
 */
function sendResult<T>(id: string, result: T): void {
  ctx.postMessage({ id, type: 'result', payload: result });
}

/**
 * Send error to main thread
 */
function sendError(id: string, error: string | Error): void {
  ctx.postMessage({ id, type: 'error', error: error instanceof Error ? error.message : error });
}

/**
 * Base64-encode a byte array in chunks (spreading multi-MB arrays into
 * String.fromCharCode overflows the call stack).
 */
function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
  }
  return btoa(binary);
}

/**
 * Base64-decode a string into bytes
 */
function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Process JSON operations
 */
async function processJSONOperation(id: string, operation: WorkerOperation, input: any): Promise<void> {
  try {
    const { data, options = {} } = input;

    reportProgress(id, { percentage: 20, message: 'Parsing input data' });

    let parsed: unknown;
    let error: string | undefined;
    try {
      parsed = JSON.parse(data);
    } catch (e) {
      error = (e as Error).message;
    }

    let result: string;
    let size: number;
    if (error !== undefined) {
      result = '';
      size = 0;
    } else if (operation === WorkerOperation.JSON_PARSE) {
      // Mirror sync path: validate only, return input unchanged
      result = data;
      size = data.length;
    } else if (operation === WorkerOperation.JSON_MINIFY) {
      result = JSON.stringify(parsed);
      size = result.length;
    } else {
      // JSON_BEAUTIFY: pretty-print
      const indent = options.indent && options.indent !== '\t' ? options.indent : 2;
      result = JSON.stringify(parsed, null, indent);
      size = result.length;
    }

    reportProgress(id, { percentage: 90, message: 'Finalizing result' });
    sendResult(id, { result, isValid: error === undefined, error, size });
  } catch (e) {
    sendError(id, e as Error);
  }
}

/**
 * Auto-detect CSV delimiter (comma, semicolon, tab, pipe)
 */
function autoDetectDelimiter(csv: string): string {
  const firstLine = csv.split('\n')[0];
  const candidates = [
    { char: ',', count: (firstLine.match(/,/g) || []).length },
    { char: ';', count: (firstLine.match(/;/g) || []).length },
    { char: '\t', count: (firstLine.match(/\t/g) || []).length },
    { char: '|', count: (firstLine.match(/\|/g) || []).length },
  ];
  candidates.sort((a, b) => b.count - a.count);
  return candidates[0].count > 0 ? candidates[0].char : ',';
}

/**
 * Process CSV conversion operations
 */
async function processCsvOperation(id: string, operation: WorkerOperation, input: any): Promise<void> {
  try {
    const { data, options = {} } = input;

    reportProgress(id, { percentage: 20, message: 'Parsing input data' });

    let result: any;

    switch (operation) {
      case WorkerOperation.CSV_TO_JSON: {
        const delimiter = options?.delimiter || autoDetectDelimiter(data);
        const parsed = Papa.parse<string[]>(data, {
          header: false,
          delimiter,
          skipEmptyLines: options?.skipEmptyLines ?? true,
          cleanBlankLines: true,
          transformHeader: (h: string) => h.trim(),
        });

        if (parsed.errors.length && parsed.data.length === 0) {
          throw new Error(parsed.errors[0]?.message || 'Failed to parse CSV');
        }

        const dataRows = parsed.data as unknown[][];
        const headers = options?.headers || (dataRows[0] as string[]);
        const startIdx = options?.headers ? 0 : 1;
        const jsonObjects: Record<string, unknown>[] = [];

        for (let i = startIdx; i < dataRows.length; i++) {
          const row = dataRows[i] as unknown[];
          const obj: Record<string, unknown> = {};
          for (let j = 0; j < Math.max(headers.length, row.length); j++) {
            obj[headers[j] ?? `column_${j}`] = row[j];
          }
          jsonObjects.push(obj);
        }

        result = {
          result: JSON.stringify(jsonObjects, null, 2),
          rowCount: jsonObjects.length,
          columnCount: headers.length,
          metadata: { headers, delimiter },
        };
        break;
      }

      case WorkerOperation.JSON_TO_CSV: {
        let jsonData: Record<string, unknown>[];
        try {
          jsonData = JSON.parse(data);
        } catch {
          throw new Error('Invalid JSON input');
        }

        if (!Array.isArray(jsonData) || jsonData.length === 0) {
          throw new Error('JSON input must be a non-empty array of objects');
        }

        const allKeys = Array.from(new Set(jsonData.flatMap((row) => Object.keys(row))));
        const csv = Papa.unparse(jsonData, {
          header: true,
          columns: allKeys,
          delimiter: options?.delimiter || ',',
        });

        result = {
          result: csv,
          rowCount: jsonData.length,
          columnCount: allKeys.length,
          metadata: { headers: allKeys },
        };
        break;
      }

      default:
        throw new Error(`Unsupported CSV operation: ${operation}`);
    }

    reportProgress(id, { percentage: 90, message: 'Conversion complete' });
    sendResult(id, result);
  } catch (error) {
    sendError(id, error as Error);
  }
}

/**
 * Process YAML conversion operations
 */
async function processYamlOperation(id: string, operation: WorkerOperation, input: any): Promise<void> {
  try {
    const { data, options = {} } = input;

    reportProgress(id, { percentage: 20, message: 'Parsing input data' });

    let result: any;

    switch (operation) {
      case WorkerOperation.YAML_TO_JSON: {
        let parsed: unknown;
        try {
          parsed = yaml.load(data);
        } catch (e) {
          throw new Error(e instanceof Error ? e.message : 'Failed to parse YAML');
        }

        if (parsed === null || parsed === undefined) {
          throw new Error('YAML input contains no data');
        }

        result = {
          result: JSON.stringify(parsed, null, 2),
        };
        break;
      }

      case WorkerOperation.JSON_TO_YAML: {
        let parsed: unknown;
        try {
          parsed = JSON.parse(data);
        } catch {
          throw new Error('Invalid JSON input');
        }

        const yamlStr = yaml.dump(parsed, {
          indent: options?.indent ?? 2,
          lineWidth: options?.lineWidth ?? 80,
          noRefs: true,
          quotingType: '"',
        });

        result = {
          result: yamlStr,
        };
        break;
      }

      default:
        throw new Error(`Unsupported YAML operation: ${operation}`);
    }

    reportProgress(id, { percentage: 90, message: 'Conversion complete' });
    sendResult(id, result);
  } catch (error) {
    sendError(id, error as Error);
  }
}

/**
 * Process Base64 operations
 * input: string (standard variant) or { data: string, variant?: 'standard' | 'urlsafe' }
 */
async function processBase64Operation(id: string, operation: WorkerOperation, input: any): Promise<void> {
  try {
    const { data, variant = 'standard' } = typeof input === 'string' ? { data: input } : input;

    reportProgress(id, { percentage: 30, message: 'Processing Base64 operation' });

    let result: string;

    switch (operation) {
      case WorkerOperation.BASE64_ENCODE: {
        const encoded = bytesToBase64(new TextEncoder().encode(data));
        result = variant === 'urlsafe'
          ? encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
          : encoded;
        break;
      }

      case WorkerOperation.BASE64_DECODE: {
        let base64 = data;
        if (variant === 'urlsafe') {
          base64 = base64.replace(/-/g, '+').replace(/_/g, '/');
          while (base64.length % 4) base64 += '=';
        }
        const decoded = new TextDecoder().decode(base64ToBytes(base64));
        result = decoded;
        break;
      }

      default:
        throw new Error(`Unsupported Base64 operation: ${operation}`);
    }

    reportProgress(id, { percentage: 90, message: 'Encoding complete' });
    sendResult(id, { result, originalLength: data.length, resultLength: result.length });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    // atob() rejects malformed base64; TextDecoder rejects invalid UTF-8
    const invalidInput = /Invalid character|atob|encoding/i.test(msg);
    sendError(id, invalidInput ? new Error('Invalid Base64 input') : (error as Error));
  }
}

/**
 * Process hash generation.
 * MD5 is not available in WebCrypto — use the local RFC 1321 implementation.
 */
async function processHashOperation(id: string, input: any): Promise<void> {
  try {
    const { data, algorithm } = input;

    reportProgress(id, { percentage: 20, message: `Generating ${algorithm} hash` });

    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);

    reportProgress(id, { percentage: 50, message: 'Computing hash' });

    let hashHex: string;
    if (algorithm === 'MD5') {
      hashHex = md5(bytes);
    } else {
      // Canonical WebCrypto names ('SHA-1', 'SHA-256', 'SHA-512') — accepted
      // by browsers and Node's webcrypto alike (no hyphen-stripping aliases).
      const hashBuffer = await crypto.subtle.digest(algorithm, bytes.buffer);
      hashHex = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }

    reportProgress(id, { percentage: 90, message: 'Hash computation complete' });

    sendResult(id, {
      hash: hashHex,
      algorithm,
      inputSize: bytes.length,
    });
  } catch (error) {
    sendError(id, error as Error);
  }
}

/**
 * Main message handler
 */
ctx.addEventListener('message', async (event: MessageEvent<EnhancedWorkerMessage>) => {
  const { id, payload } = event.data;

  if (!payload || !payload.operation) {
    sendError(id, 'Invalid operation payload');
    return;
  }

  const { operation, input } = payload;

  try {
    reportProgress(id, { percentage: 10, message: 'Starting operation' });

    // Route to appropriate processor based on operation type
    if ([
      WorkerOperation.JSON_PARSE,
      WorkerOperation.JSON_BEAUTIFY,
      WorkerOperation.JSON_MINIFY
    ].includes(operation)) {
      await processJSONOperation(id, operation, input);
    } else if ([
      WorkerOperation.CSV_TO_JSON,
      WorkerOperation.JSON_TO_CSV
    ].includes(operation)) {
      await processCsvOperation(id, operation, input);
    } else if ([
      WorkerOperation.YAML_TO_JSON,
      WorkerOperation.JSON_TO_YAML
    ].includes(operation)) {
      await processYamlOperation(id, operation, input);
    } else if ([
      WorkerOperation.BASE64_ENCODE,
      WorkerOperation.BASE64_DECODE
    ].includes(operation)) {
      await processBase64Operation(id, operation, input);
    } else if (operation === WorkerOperation.HASH_GENERATE) {
      await processHashOperation(id, input);
    } else {
      sendError(id, `Unsupported operation: ${operation}`);
    }

  } catch (error) {
    sendError(id, error as Error);
  }
});
