import { MEMORY_LIMITS } from './constants';
import { MemoryError } from './errors';

/**
 * Estimates the memory usage of data in bytes
 */
export function estimateMemoryUsage(data: string | ArrayBuffer | File): number {
  if (typeof data === 'string') {
    // JavaScript strings are UTF-16, so each character is 2 bytes
    return data.length * 2;
  }

  if (data instanceof ArrayBuffer) {
    return data.byteLength;
  }

  if (data instanceof File) {
    return data.size;
  }

  return 0;
}

/**
 * Checks if data size exceeds the maximum allowed limit
 */
export function exceedsMemoryLimit(data: string | ArrayBuffer | File): boolean {
  const size = estimateMemoryUsage(data);
  return size > MEMORY_LIMITS.MAX_FILE_SIZE;
}

/**
 * Checks if data is within the maximum allowed limit (inverse of exceedsMemoryLimit)
 */
export function checkMemoryLimit(data: string | ArrayBuffer | File): boolean {
  return !exceedsMemoryLimit(data);
}

/**
 * Determines if processing should be moved to a Web Worker
 */
export function shouldUseWorker(data: string | ArrayBuffer | File): boolean {
  const size = estimateMemoryUsage(data);
  return size > MEMORY_LIMITS.WORKER_THRESHOLD;
}

/**
 * Formats bytes into human-readable format
 */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

/**
 * Creates a memory usage error message
 */
export function createMemoryError(actualSize: number): string {
  return `File size (${formatBytes(actualSize)}) exceeds the maximum limit of ${formatBytes(MEMORY_LIMITS.MAX_FILE_SIZE)}. For privacy and performance, we process files up to ${formatBytes(MEMORY_LIMITS.MAX_FILE_SIZE)} locally in your browser.`;
}/**

* Memory limit enforcement utility - throws error if exceeds 50MB hard limit
 */
export function enforceMemoryLimit(data: string | ArrayBuffer | File): void {
  const size = estimateMemoryUsage(data);

  if (size > MEMORY_LIMITS.MAX_FILE_SIZE) {
    throw new MemoryError(
      createMemoryError(size),
      {
        actualSize: size,
        maxSize: MEMORY_LIMITS.MAX_FILE_SIZE,
        formattedActual: formatBytes(size),
        formattedMax: formatBytes(MEMORY_LIMITS.MAX_FILE_SIZE)
      }
    );
  }
}