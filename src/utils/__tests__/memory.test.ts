import { describe, it, expect } from 'vitest';
import {
  estimateMemoryUsage,
  enforceMemoryLimit,
  exceedsMemoryLimit,
  checkMemoryLimit,
  shouldUseWorker,
  formatBytes,
  createMemoryError
} from '../memory';
import { MemoryError } from '../errors';
import { MEMORY_LIMITS } from '../constants';

describe('Memory Utilities', () => {
  describe('estimateMemoryUsage', () => {
    it('should calculate string memory usage correctly', () => {
      const testString = 'Hello World'; // 11 characters * 2 bytes = 22 bytes
      expect(estimateMemoryUsage(testString)).toBe(22);
    });

    it('should handle empty strings', () => {
      expect(estimateMemoryUsage('')).toBe(0);
    });

    it('should calculate ArrayBuffer size correctly', () => {
      const buffer = new ArrayBuffer(1024);
      expect(estimateMemoryUsage(buffer)).toBe(1024);
    });

    it('should handle File objects', () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      expect(estimateMemoryUsage(file)).toBe(file.size);
    });

    it('should return 0 for unknown types', () => {
      expect(estimateMemoryUsage(null as any)).toBe(0);
      expect(estimateMemoryUsage(undefined as any)).toBe(0);
    });
  });

  describe('enforceMemoryLimit', () => {
    it('should not throw for data within limits', () => {
      const smallString = 'small data';
      expect(() => enforceMemoryLimit(smallString)).not.toThrow();
    });

    it('should throw MemoryError for data exceeding limits', () => {
      // Create a string larger than MAX_FILE_SIZE (50MB)
      const largeString = 'x'.repeat(MEMORY_LIMITS.MAX_FILE_SIZE / 2 + 1);

      expect(() => enforceMemoryLimit(largeString)).toThrow(MemoryError);
    });

    it('should include correct error details', () => {
      const largeString = 'x'.repeat(MEMORY_LIMITS.MAX_FILE_SIZE / 2 + 1);

      try {
        enforceMemoryLimit(largeString);
        expect.fail('Should have thrown MemoryError');
      } catch (error) {
        expect(error).toBeInstanceOf(MemoryError);
        const memoryError = error as MemoryError;
        expect(memoryError.details).toBeDefined();
        expect(memoryError.details?.actualSize).toBeGreaterThan(MEMORY_LIMITS.MAX_FILE_SIZE);
        expect(memoryError.details?.maxSize).toBe(MEMORY_LIMITS.MAX_FILE_SIZE);
      }
    });
  });

  describe('exceedsMemoryLimit', () => {
    it('should return false for data within limits', () => {
      const smallString = 'small data';
      expect(exceedsMemoryLimit(smallString)).toBe(false);
    });

    it('should return true for data exceeding limits', () => {
      const largeBuffer = new ArrayBuffer(MEMORY_LIMITS.MAX_FILE_SIZE + 1);
      expect(exceedsMemoryLimit(largeBuffer)).toBe(true);
    });
  });

  describe('shouldUseWorker', () => {
    it('should return false for small data', () => {
      const smallString = 'small data';
      expect(shouldUseWorker(smallString)).toBe(false);
    });

    it('should return true for large data', () => {
      const largeBuffer = new ArrayBuffer(MEMORY_LIMITS.WORKER_THRESHOLD + 1);
      expect(shouldUseWorker(largeBuffer)).toBe(true);
    });

    it('should return false exactly at threshold', () => {
      const thresholdBuffer = new ArrayBuffer(MEMORY_LIMITS.WORKER_THRESHOLD);
      expect(shouldUseWorker(thresholdBuffer)).toBe(false);
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(512)).toBe('512 B');
      expect(formatBytes(1024)).toBe('1.00 KB');
      expect(formatBytes(1536)).toBe('1.50 KB');
      expect(formatBytes(1024 * 1024)).toBe('1.00 MB');
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB');
    });

    it('should handle large numbers', () => {
      expect(formatBytes(1024 * 1024 * 1024 * 2)).toBe('2.00 GB');
    });

    it('should handle decimal precision', () => {
      expect(formatBytes(1536)).toBe('1.50 KB'); // 1.5 * 1024
      expect(formatBytes(2560)).toBe('2.50 KB'); // 2.5 * 1024
    });
  });

  describe('createMemoryError', () => {
    it('should create descriptive error message', () => {
      const size = MEMORY_LIMITS.MAX_FILE_SIZE + 1024;
      const message = createMemoryError(size);

      expect(message).toContain('exceeds the maximum limit');
      expect(message).toContain('privacy and performance');
      expect(message).toContain(formatBytes(size));
      expect(message).toContain(formatBytes(MEMORY_LIMITS.MAX_FILE_SIZE));
    });
  });

  describe('checkMemoryLimit', () => {
    it('should return true for data within limits', () => {
      expect(checkMemoryLimit('small data')).toBe(true);
    });

    it('should return false for data exceeding limits', () => {
      const largeBuffer = new ArrayBuffer(MEMORY_LIMITS.MAX_FILE_SIZE + 1);
      expect(checkMemoryLimit(largeBuffer)).toBe(false);
    });

    it('should be the inverse of exceedsMemoryLimit', () => {
      expect(checkMemoryLimit('test')).toBe(!exceedsMemoryLimit('test'));
    });
  });
});