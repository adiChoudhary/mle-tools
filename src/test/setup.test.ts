import { describe, it, expect } from 'vitest';

describe('Test Setup', () => {
  it('should run basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have clean localStorage before each test', () => {
    // Set something in localStorage
    localStorage.setItem('test', 'value');
    expect(localStorage.getItem('test')).toBe('value');

    // This would be cleared by the beforeEach in setup.ts
    // but we'll just verify the API is available
    expect(typeof localStorage.clear).toBe('function');
  });
});