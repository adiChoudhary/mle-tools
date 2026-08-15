import { describe, it, expect } from 'vitest';
import { checkMemoryLimit, estimateMemoryUsage, exceedsMemoryLimit } from '../memory';
import { MEMORY_LIMITS } from '../constants';

describe('Memory Limit Testing', () => {
  describe('checkMemoryLimit', () => {
    it('should allow small strings', () => {
      expect(checkMemoryLimit('hello world')).toBe(true);
    });

    it('should allow 1MB string', () => {
      const oneMB = 'a'.repeat(1024 * 1024);
      expect(checkMemoryLimit(oneMB)).toBe(true);
    });

    it('should allow 10MB string (20MB in UTF-16)', () => {
      const tenMB = 'a'.repeat(10 * 1024 * 1024);
      expect(checkMemoryLimit(tenMB)).toBe(true);
    });

    it('should allow 24MB string (48MB in UTF-16, below 50MB limit)', () => {
      const twentyFourMB = 'a'.repeat(24 * 1024 * 1024);
      expect(checkMemoryLimit(twentyFourMB)).toBe(true);
    });

    it('should reject 26MB string (52MB in UTF-16, above 50MB limit)', () => {
      const twentySixMB = 'a'.repeat(26 * 1024 * 1024);
      expect(checkMemoryLimit(twentySixMB)).toBe(false);
    });

    it('should handle empty string', () => {
      expect(checkMemoryLimit('')).toBe(true);
    });
  });

  describe('estimateMemoryUsage', () => {
    it('should estimate string memory (UTF-16: 2 bytes per char)', () => {
      expect(estimateMemoryUsage('hello')).toBe(10);
    });

    it('should estimate ArrayBuffer memory', () => {
      const buffer = new ArrayBuffer(100);
      expect(estimateMemoryUsage(buffer)).toBe(100);
    });

    it('should return 0 for unknown types', () => {
      expect(estimateMemoryUsage(null as any)).toBe(0);
      expect(estimateMemoryUsage(undefined as any)).toBe(0);
    });
  });

  describe('exceedsMemoryLimit', () => {
    it('should return false for small data', () => {
      expect(exceedsMemoryLimit('hello')).toBe(false);
    });

    it('should return true for data exceeding 50MB (26MB string = 52MB UTF-16)', () => {
      const large = 'a'.repeat(26 * 1024 * 1024);
      expect(exceedsMemoryLimit(large)).toBe(true);
    });
  });

  describe('MEMORY_LIMITS constants', () => {
    it('should define WORKER_THRESHOLD (10MB)', () => {
      expect(MEMORY_LIMITS.WORKER_THRESHOLD).toBe(10 * 1024 * 1024);
    });

    it('should define MAX_FILE_SIZE (50MB)', () => {
      expect(MEMORY_LIMITS.MAX_FILE_SIZE).toBe(50 * 1024 * 1024);
    });

    it('should define LOADING_DELAY (500ms)', () => {
      expect(MEMORY_LIMITS.LOADING_DELAY).toBe(500);
    });
  });
});
