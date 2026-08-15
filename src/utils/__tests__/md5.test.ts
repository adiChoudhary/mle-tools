import { describe, it, expect } from 'vitest';
import { md5 } from '../md5';

describe('MD5 Hash Implementation', () => {
  it('should generate correct MD5 hash for string input', () => {
    // Test cases from RFC 1321
    expect(md5('')).toBe('d41d8cd98f00b204e9800998ecf8427e');
    expect(md5('a')).toBe('0cc175b9c0f1b6a831c399e269772661');
    expect(md5('abc')).toBe('900150983cd24fb0d6963f7d28e17f72');
    expect(md5('message digest')).toBe('f96b697d7cb7938d525a2f31aaf161d0');
    expect(md5('abcdefghijklmnopqrstuvwxyz')).toBe('c3fcd3d76192e4007dfb496cca67e13b');
  });

  it('should generate correct MD5 hash for known test vectors', () => {
    expect(md5('Hello, World!')).toBe('65a8e27d8879283831b664bd8b7f0ad4');
    expect(md5('The quick brown fox jumps over the lazy dog')).toBe('9e107d9d372bb6826bd81d3542a419d6');
    expect(md5('The quick brown fox jumps over the lazy dog.')).toBe('e4d909c290d0fb1ca068ffaddf22cbd0');
  });

  it('should handle empty string correctly', () => {
    const hash = md5('');
    expect(hash).toBe('d41d8cd98f00b204e9800998ecf8427e');
    expect(hash).toHaveLength(32);
  });

  it('should handle single character correctly', () => {
    expect(md5('0')).toBe('cfcd208495d565ef66e7dff9f98764da');
    expect(md5('1')).toBe('c4ca4238a0b923820dcc509a6f75849b');
  });

  it('should handle ArrayBuffer input', () => {
    const buffer = new TextEncoder().encode('test');
    const hash = md5(buffer);
    expect(hash).toBe('098f6bcd4621d373cade4e832627b4f6');
  });

  it('should handle Uint8Array input', () => {
    const uint8Array = new TextEncoder().encode('hello');
    const hash = md5(uint8Array);
    expect(hash).toBe('5d41402abc4b2a76b9719d911017c592');
  });

  it('should handle long strings correctly', () => {
    const longString = 'a'.repeat(1000);
    const hash = md5(longString);

    // MD5 should always produce 32 hex characters
    expect(hash).toHaveLength(32);
    expect(hash).toMatch(/^[0-9a-f]{32}$/);
  });

  it('should handle strings with special characters', () => {
    const specialString = '!@#$%^&*()_+-=[]{}|;\':",./<>?';
    const hash = md5(specialString);

    expect(hash).toHaveLength(32);
    expect(hash).toMatch(/^[0-9a-f]{32}$/);
  });

  it('should handle Unicode characters correctly', () => {
    const unicodeString = 'Hello 世界 🌍';
    const hash = md5(unicodeString);

    expect(hash).toHaveLength(32);
    expect(hash).toMatch(/^[0-9a-f]{32}$/);
  });

  it('should produce different hashes for different inputs', () => {
    const hash1 = md5('test1');
    const hash2 = md5('test2');

    expect(hash1).not.toBe(hash2);
    expect(hash1).toHaveLength(32);
    expect(hash2).toHaveLength(32);
  });

  it('should be deterministic (same input produces same output)', () => {
    const input = 'consistent test string';
    const hash1 = md5(input);
    const hash2 = md5(input);

    expect(hash1).toBe(hash2);
  });

  it('should handle edge case with exact block boundaries', () => {
    // MD5 processes data in 512-bit (64-byte) blocks
    // Test strings that are exactly at block boundaries
    const string55 = 'a'.repeat(55); // Just before padding
    const string56 = 'a'.repeat(56); // At padding boundary
    const string64 = 'a'.repeat(64); // Exactly one block

    const hash55 = md5(string55);
    const hash56 = md5(string56);
    const hash64 = md5(string64);

    expect(hash55).toHaveLength(32);
    expect(hash56).toHaveLength(32);
    expect(hash64).toHaveLength(32);

    // All should be different
    expect(hash55).not.toBe(hash56);
    expect(hash56).not.toBe(hash64);
    expect(hash55).not.toBe(hash64);
  });

  it('should handle binary data correctly', () => {
    // Create binary data with all possible byte values
    const binaryData = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      binaryData[i] = i;
    }

    const hash = md5(binaryData);
    expect(hash).toHaveLength(32);
    expect(hash).toMatch(/^[0-9a-f]{32}$/);
  });
});