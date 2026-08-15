/**
 * Base error class for DevToolbox applications
 */
export class DevToolboxError extends Error {
  constructor(
    message: string,
    public code: string = 'GENERIC_ERROR',
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'DevToolboxError';
  }
}

/**
 * Memory-related errors
 */
export class MemoryError extends DevToolboxError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'MEMORY_ERROR', details);
    this.name = 'MemoryError';
  }
}

/**
 * Validation errors for user input
 */
export class ValidationError extends DevToolboxError {
  constructor(message: string, public field?: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

/**
 * Worker-related errors
 */
export class WorkerError extends DevToolboxError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'WORKER_ERROR', details);
    this.name = 'WorkerError';
  }
}

/**
 * Cryptographic operation errors
 */
export class CryptoError extends DevToolboxError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'CRYPTO_ERROR', details);
    this.name = 'CryptoError';
  }
}

/**
 * Format-specific errors
 */
export class FormatError extends DevToolboxError {
  constructor(message: string, public format: string, details?: Record<string, any>) {
    super(message, 'FORMAT_ERROR', details);
    this.name = 'FormatError';
  }
}

/**
 * Safely extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

/**
 * Creates user-friendly error messages
 */
export function createUserFriendlyError(error: unknown): string {
  const message = getErrorMessage(error);

  // Common error patterns and their user-friendly versions
  const patterns: Array<[RegExp, string]> = [
    [/unexpected token/i, 'Invalid format detected. Please check your input for syntax errors.'],
    [/network error/i, 'Network connection issue. Please check your connection and try again.'],
    [/permission denied/i, 'Permission denied. Please check if you have the necessary permissions.'],
    [/file not found/i, 'The requested file could not be found.'],
    [/quota exceeded/i, 'Storage quota exceeded. Please free up some space and try again.'],
  ];

  for (const [pattern, replacement] of patterns) {
    if (pattern.test(message)) {
      return replacement;
    }
  }

  return message;
}