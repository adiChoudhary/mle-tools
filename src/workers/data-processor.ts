/**
 * Generic data processing worker
 * Handles JSON, CSV, YAML operations and other data transformations
 */

import type { EnhancedWorkerMessage, WorkerOperation, WorkerProgress } from '../utils/worker-interface';

// Worker context
const ctx = self as any;

/**
 * Send progress update to main thread
 */
function reportProgress(id: string, progress: WorkerProgress): void {
  ctx.postMessage({
    id,
    type: 'progress',
    progress
  });
}

/**
 * Send success result to main thread
 */
function sendResult<T>(id: string, result: T): void {
  ctx.postMessage({
    id,
    type: 'result',
    payload: result
  });
}

/**
 * Send error to main thread
 */
function sendError(id: string, error: string | Error): void {
  ctx.postMessage({
    id,
    type: 'error',
    error: error instanceof Error ? error.message : error
  });
}

/**
 * Process JSON operations
 */
async function processJSONOperation(id: string, operation: WorkerOperation, input: any): Promise<void> {
  try {
    const { data, options = {} } = input;

    reportProgress(id, { percentage: 20, message: 'Parsing input data' });

    let result: any;
    let isValid = true;

    switch (operation) {
      case WorkerOperation.JSON_PARSE:
        try {
          result = JSON.parse(data);
          result = { result: JSON.stringify(result), isValid: true, size: data.length };
        } catch (error) {
          result = { result: '', isValid: false, error: (error as Error).message, size: data.length };
        }
        break;

      case WorkerOperation.JSON_BEAUTIFY:
        try {
          const parsed = JSON.parse(data);
          const indent = options.indent || 2;
          result = JSON.stringify(parsed, null, indent);
          result = { result, isValid: true, size: result.length };
        } catch (error) {
          result = { result: '', isValid: false, error: (error as Error).message, size: data.length };
        }
        break;

      case WorkerOperation.JSON_MINIFY:
        try {
          const parsed = JSON.parse(data);
          result = JSON.stringify(parsed);
          result = { result, isValid: true, size: result.length };
        } catch (error) {
          result = { result: '', isValid: false, error: (error as Error).message, size: data.length };
        }
        break;

      default:
        throw new Error(`Unsupported JSON operation: ${operation}`);
    }

    reportProgress(id, { percentage: 90, message: 'Finalizing result' });
    sendResult(id, result);

  } catch (error) {
    sendError(id, error as Error);
  }
}

/**
 * Process CSV conversion operations
 */
async function processCsvOperation(id: string, operation: WorkerOperation, input: any): Promise<void> {
  try {
    const { data, options = {} } = input;

    // Dynamically import papaparse (available in worker via module type)
    const Papa = await import('papaparse');

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
          dynamicTyping: true,
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

    // Dynamically import js-yaml
    const yaml = await import('js-yaml');

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
 * Auto-detect CSV delimiter
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
 * Process Base64 operations
 */
async function processBase64Operation(id: string, operation: WorkerOperation, input: string): Promise<void> {
  try {
    reportProgress(id, { percentage: 30, message: 'Processing Base64 operation' });

    let result: string;

    switch (operation) {
      case WorkerOperation.BASE64_ENCODE:
        // Handle both string and binary data
        const encoder = new TextEncoder();
        const data = encoder.encode(input);
        result = btoa(String.fromCharCode(...data));
        break;

      case WorkerOperation.BASE64_DECODE:
        try {
          const decoded = atob(input);
          const uint8Array = new Uint8Array(decoded.length);
          for (let i = 0; i < decoded.length; i++) {
            uint8Array[i] = decoded.charCodeAt(i);
          }
          const decoder = new TextDecoder();
          result = decoder.decode(uint8Array);
        } catch (error) {
          throw new Error('Invalid Base64 input');
        }
        break;

      default:
        throw new Error(`Unsupported Base64 operation: ${operation}`);
    }

    reportProgress(id, { percentage: 90, message: 'Encoding complete' });
    sendResult(id, { result, originalLength: input.length, resultLength: result.length });

  } catch (error) {
    sendError(id, error as Error);
  }
}

/**
 * Process hash generation
 */
async function processHashOperation(id: string, input: any): Promise<void> {
  try {
    const { data, algorithm } = input;

    reportProgress(id, { percentage: 20, message: `Generating ${algorithm} hash` });

    // Convert input to ArrayBuffer
    let buffer: ArrayBuffer;
    if (typeof data === 'string') {
      buffer = new TextEncoder().encode(data).buffer;
    } else {
      buffer = data;
    }

    reportProgress(id, { percentage: 50, message: 'Computing hash' });

    // Use Web Crypto API for hashing
    const hashBuffer = await crypto.subtle.digest(algorithm.replace('-', ''), buffer);
    const hashArray = new Uint8Array(hashBuffer);
    const hash = Array.from(hashArray)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    reportProgress(id, { percentage: 90, message: 'Hash computation complete' });

    sendResult(id, {
      hash,
      algorithm,
      inputSize: buffer.byteLength
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

// Signal that worker is ready
ctx.postMessage({ type: 'ready' });