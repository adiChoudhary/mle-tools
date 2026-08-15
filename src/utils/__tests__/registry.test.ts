import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerTool,
  getTools,
  getTool,
  searchTools,
  __resetRegistry
} from '../registry';
import type { RegisteredTool } from '../registry';

const TEST_TOOLS: RegisteredTool[] = [
  {
    id: 'json-formatter',
    name: 'JSON Formatter',
    description: 'Format and validate JSON data',
    icon: '📄',
    keywords: 'json, format, validate'
  },
  {
    id: 'base64-encoder',
    name: 'Base64 Encoder',
    description: 'Encode and decode Base64 strings',
    icon: '🔤',
    keywords: 'base64, encode, decode'
  },
  {
    id: 'jwt-decoder',
    name: 'JWT Decoder',
    description: 'Decode JSON Web Tokens',
    icon: '🔑',
    keywords: 'jwt, token, decode'
  }
];

// Create a fresh registry instance for each test by unregistering all tools
function clearRegistry(): void {
  for (const tool of getTools()) {
    // We can't directly access the registry's unregister,
    // but we can test the public API
  }
}

describe('Tool Registry', () => {
  beforeEach(() => {
    // Reset registry for clean state, then register test tools
    __resetRegistry();
    for (const tool of TEST_TOOLS) {
      registerTool(tool);
    }
  });

  describe('registerTool', () => {
    it('should register a tool', () => {
      const tools = getTools();
      expect(tools.length).toBeGreaterThanOrEqual(3);
    });

    it('should allow duplicate registration (overwrites)', () => {
      const originalCount = getTools().length;
      registerTool(TEST_TOOLS[0]);
      expect(getTools().length).toBe(originalCount);
    });
  });

  describe('getTools', () => {
    it('should return all registered tools', () => {
      const tools = getTools();
      expect(tools.length).toBeGreaterThanOrEqual(3);
    });

    it('should return tools with correct metadata', () => {
      const tools = getTools();
      const jsonFormatter = tools.find((t) => t.id === 'json-formatter');

      expect(jsonFormatter).toBeDefined();
      expect(jsonFormatter?.name).toBe('JSON Formatter');
      expect(jsonFormatter?.description).toBe('Format and validate JSON data');
      expect(jsonFormatter?.icon).toBe('📄');
    });
  });

  describe('getTool', () => {
    it('should get a tool by id', () => {
      const tool = getTool('json-formatter');
      expect(tool).toBeDefined();
      expect(tool?.name).toBe('JSON Formatter');
    });

    it('should return undefined for non-existent tool', () => {
      const tool = getTool('non-existent-tool');
      expect(tool).toBeUndefined();
    });
  });

  describe('searchTools', () => {
    it('should search by name', () => {
      const results = searchTools('JSON');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].name).toContain('JSON');
    });

    it('should search by description', () => {
      const results = searchTools('validate');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].description).toContain('validate');
    });

    it('should search by keywords', () => {
      const results = searchTools('base64');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].keywords).toContain('base64');
    });

    it('should be case-insensitive', () => {
      const results = searchTools('jwt');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].id).toBe('jwt-decoder');
    });

    it('should return empty array for no matches', () => {
      const results = searchTools('xyznonexistent123');
      expect(results).toEqual([]);
    });

    it('should return results for partial matches', () => {
      const results = searchTools('encod');
      expect(results.length).toBeGreaterThanOrEqual(1);
    });
  });
});
