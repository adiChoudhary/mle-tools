/**
 * Standard operation types supported by workers
 */
export enum WorkerOperation {
  JSON_PARSE = 'json_parse',
  JSON_STRINGIFY = 'json_stringify',
  JSON_BEAUTIFY = 'json_beautify',
  JSON_MINIFY = 'json_minify',
  CSV_TO_JSON = 'csv_to_json',
  JSON_TO_CSV = 'json_to_csv',
  YAML_TO_JSON = 'yaml_to_json',
  JSON_TO_YAML = 'json_to_yaml',
  BASE64_ENCODE = 'base64_encode',
  BASE64_DECODE = 'base64_decode',
  HASH_GENERATE = 'hash_generate',
  ENCRYPT_DATA = 'encrypt_data',
  DECRYPT_DATA = 'decrypt_data'
}

/**
 * Input/Output interfaces for different operations
 */
export interface JSONOperationInput {
  data: string;
  options?: {
    indent?: number;
    sortKeys?: boolean;
  };
}

export interface JSONOperationOutput {
  result: string;
  size: number;
  isValid: boolean;
  error?: string;
}

export interface CSVOperationInput {
  data: string;
  options?: {
    delimiter?: string;
    headers?: string[];
    skipEmptyLines?: boolean;
  };
}

export interface CSVOperationOutput {
  result: string;
  rowCount: number;
  columnCount: number;
  error?: string;
}

export interface HashOperationInput {
  data: string | ArrayBuffer;
  algorithm: 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-512';
}

export interface HashOperationOutput {
  hash: string;
  algorithm: string;
  inputSize: number;
}

export interface EncryptionOperationInput {
  data: string | ArrayBuffer;
  key: string;
  algorithm: 'AES-GCM' | 'RSA-OAEP';
  iv?: Uint8Array;
}

export interface EncryptionOperationOutput {
  result: string;
  iv?: string;
  algorithm: string;
}

/**
 * Progress callback for long-running operations
 */
export interface WorkerProgress {
  percentage: number;
  message?: string;
  currentStep?: string;
}

/**
 * Worker task with progress support
 */
export interface WorkerTaskWithProgress<TInput = any, TOutput = any> {
  operation: WorkerOperation;
  input: TInput;
  onProgress?: (progress: WorkerProgress) => void;
}

/**
 * Enhanced worker message with progress support
 */
export interface EnhancedWorkerMessage<T = any> {
  id: string;
  type: 'process' | 'result' | 'error' | 'progress';
  operation?: WorkerOperation;
  payload?: T;
  progress?: WorkerProgress;
  error?: string;
}

/**
 * Utility to validate worker operation input
 */
export function validateWorkerInput(operation: WorkerOperation, input: any): boolean {
  switch (operation) {
    case WorkerOperation.JSON_PARSE:
    case WorkerOperation.JSON_STRINGIFY:
    case WorkerOperation.JSON_BEAUTIFY:
    case WorkerOperation.JSON_MINIFY:
      return typeof input === 'object' && input !== null && typeof input.data === 'string';

    case WorkerOperation.CSV_TO_JSON:
    case WorkerOperation.JSON_TO_CSV:
    case WorkerOperation.YAML_TO_JSON:
    case WorkerOperation.JSON_TO_YAML:
      return typeof input === 'object' && input !== null && typeof input.data === 'string';

    case WorkerOperation.BASE64_ENCODE:
    case WorkerOperation.BASE64_DECODE:
      return typeof input === 'string';

    case WorkerOperation.HASH_GENERATE:
      return typeof input === 'object' && input !== null &&
             (typeof input.data === 'string' || input.data instanceof ArrayBuffer) &&
             ['MD5', 'SHA-1', 'SHA-256', 'SHA-512'].includes(input.algorithm);

    case WorkerOperation.ENCRYPT_DATA:
    case WorkerOperation.DECRYPT_DATA:
      return typeof input === 'object' && input !== null &&
             (typeof input.data === 'string' || input.data instanceof ArrayBuffer) &&
             typeof input.key === 'string' &&
             ['AES-GCM', 'RSA-OAEP'].includes(input.algorithm);

    default:
      return false;
  }
}

/**
 * Create a standardized error response for workers
 */
export function createWorkerErrorResponse(id: string, error: string | Error): EnhancedWorkerMessage {
  return {
    id,
    type: 'error',
    error: error instanceof Error ? error.message : error
  };
}

/**
 * Create a standardized success response for workers
 */
export function createWorkerSuccessResponse<T>(id: string, payload: T): EnhancedWorkerMessage<T> {
  return {
    id,
    type: 'result',
    payload
  };
}

/**
 * Create a progress update for workers
 */
export function createWorkerProgressResponse(id: string, progress: WorkerProgress): EnhancedWorkerMessage {
  return {
    id,
    type: 'progress',
    progress
  };
}