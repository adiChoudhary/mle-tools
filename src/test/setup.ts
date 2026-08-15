// Test setup file for global configurations
import { beforeEach } from 'vitest';

// Clean up between tests
beforeEach(() => {
  // Clear any localStorage/sessionStorage if used
  if (typeof window !== 'undefined') {
    window.localStorage.clear();
    window.sessionStorage.clear();
  }
});