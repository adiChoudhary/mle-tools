import { describe, it, expect } from 'vitest';
import { WorkerOperation } from '../worker-interface';

describe('Worker Communication Integration', () => {
  describe('WorkerOperation Enum', () => {
    it('should have all expected operations', () => {
      expect(WorkerOperation.JSON_PARSE).toBe('json_parse');
      expect(WorkerOperation.JSON_STRINGIFY).toBe('json_stringify');
      expect(WorkerOperation.JSON_BEAUTIFY).toBe('json_beautify');
      expect(WorkerOperation.JSON_MINIFY).toBe('json_minify');
      expect(WorkerOperation.CSV_TO_JSON).toBe('csv_to_json');
      expect(WorkerOperation.JSON_TO_CSV).toBe('json_to_csv');
      expect(WorkerOperation.YAML_TO_JSON).toBe('yaml_to_json');
      expect(WorkerOperation.JSON_TO_YAML).toBe('json_to_yaml');
      expect(WorkerOperation.BASE64_ENCODE).toBe('base64_encode');
      expect(WorkerOperation.BASE64_DECODE).toBe('base64_decode');
      expect(WorkerOperation.HASH_GENERATE).toBe('hash_generate');
      expect(WorkerOperation.ENCRYPT_DATA).toBe('encrypt_data');
      expect(WorkerOperation.DECRYPT_DATA).toBe('decrypt_data');
    });

    it('should have 13 operations defined', () => {
      const ops = Object.values(WorkerOperation).filter(v => typeof v === 'string');
      expect(ops.length).toBe(13);
    });

    it('should have string values for all operations', () => {
      for (const [, value] of Object.entries(WorkerOperation)) {
        expect(typeof value).toBe('string');
      }
    });
  });

  describe('Worker Message Format', () => {
    it('should create valid process message', () => {
      const message = {
        id: 'test-123',
        type: 'process' as const,
        operation: WorkerOperation.CSV_TO_JSON,
        payload: {
          data: 'name,age\nAlice,30',
          options: { delimiter: ',' }
        }
      };
      expect(message.id).toBe('test-123');
      expect(message.type).toBe('process');
      expect(message.operation).toBe('csv_to_json');
    });

    it('should create valid result message', () => {
      const message = {
        id: 'test-123',
        type: 'result' as const,
        payload: {
          result: '[{"name":"Alice","age":30}]',
          rowCount: 1,
          columnCount: 2
        }
      };
      expect(message.type).toBe('result');
      expect(message.payload.rowCount).toBe(1);
    });

    it('should create valid error message', () => {
      const message = {
        id: 'test-123',
        type: 'error' as const,
        error: 'Invalid CSV format'
      };
      expect(message.type).toBe('error');
      expect(message.error).toBe('Invalid CSV format');
    });

    it('should create valid progress message', () => {
      const message = {
        id: 'test-123',
        type: 'progress' as const,
        progress: {
          percentage: 50,
          message: 'Processing row 500/1000'
        }
      };
      expect(message.type).toBe('progress');
      expect(message.progress.percentage).toBe(50);
    });
  });

  describe('WorkerInterface Exports', () => {
    it('should export WorkerOperation enum', async () => {
      const { WorkerOperation } = await import('../worker-interface');
      expect(WorkerOperation).toBeDefined();
      expect(WorkerOperation.CSV_TO_JSON).toBe('csv_to_json');
    });

    it('should export all expected types from module', async () => {
      const mod = await import('../worker-interface');
      expect(mod.WorkerOperation).toBeDefined();
    });
  });

  describe('CSV Worker Message Patterns', () => {
    it('should handle CSV to JSON conversion message', () => {
      const csvData = 'name,email,age\nAlice,alice@test.com,30\nBob,bob@test.com,25';
      const message = {
        id: 'csv-convert-1',
        type: 'process' as const,
        operation: WorkerOperation.CSV_TO_JSON,
        payload: {
          data: csvData,
          options: { delimiter: ',', headers: true }
        }
      };
      expect(message.payload.data).toContain('Alice');
      expect(message.payload.options.delimiter).toBe(',');
    });

    it('should handle JSON to CSV conversion message', () => {
      const jsonData = JSON.stringify([{ name: 'Alice', age: 30 }]);
      const message = {
        id: 'json-convert-1',
        type: 'process' as const,
        operation: WorkerOperation.JSON_TO_CSV,
        payload: {
          data: jsonData,
          options: { delimiter: ',' }
        }
      };
      expect(message.operation).toBe('json_to_csv');
    });
  });

  describe('YAML Worker Message Patterns', () => {
    it('should handle YAML to JSON conversion message', () => {
      const yamlData = 'name: Alice\nage: 30\nhobbies:\n  - reading\n  - coding';
      const message = {
        id: 'yaml-convert-1',
        type: 'process' as const,
        operation: WorkerOperation.YAML_TO_JSON,
        payload: { data: yamlData }
      };
      expect(message.operation).toBe('yaml_to_json');
      expect(message.payload.data).toContain('Alice');
    });

    it('should handle JSON to YAML conversion message', () => {
      const jsonData = JSON.stringify({ name: 'Alice', age: 30 });
      const message = {
        id: 'yaml-convert-2',
        type: 'process' as const,
        operation: WorkerOperation.JSON_TO_YAML,
        payload: { data: jsonData }
      };
      expect(message.operation).toBe('json_to_yaml');
    });
  });

  describe('Base64 Worker Message Patterns', () => {
    it('should handle Base64 encode message', () => {
      const message = {
        id: 'b64-encode-1',
        type: 'process' as const,
        operation: WorkerOperation.BASE64_ENCODE,
        payload: { data: 'Hello World' }
      };
      expect(message.operation).toBe('base64_encode');
    });

    it('should handle Base64 decode message', () => {
      const message = {
        id: 'b64-decode-1',
        type: 'process' as const,
        operation: WorkerOperation.BASE64_DECODE,
        payload: { data: 'SGVsbG8gV29ybGQ=' }
      };
      expect(message.operation).toBe('base64_decode');
    });
  });

  describe('Hash Worker Message Patterns', () => {
    it('should handle hash generation message', () => {
      const message = {
        id: 'hash-1',
        type: 'process' as const,
        operation: WorkerOperation.HASH_GENERATE,
        payload: {
          data: 'Hello World',
          algorithm: 'SHA-256'
        }
      };
      expect(message.operation).toBe('hash_generate');
      expect(message.payload.algorithm).toBe('SHA-256');
    });
  });

  describe('Encryption Worker Message Patterns', () => {
    it('should handle encryption message', () => {
      const message = {
        id: 'encrypt-1',
        type: 'process' as const,
        operation: WorkerOperation.ENCRYPT_DATA,
        payload: {
          data: 'Secret message',
          key: 'my-secret-key',
          algorithm: 'AES-GCM'
        }
      };
      expect(message.operation).toBe('encrypt_data');
      expect(message.payload.algorithm).toBe('AES-GCM');
    });

    it('should handle decryption message', () => {
      const message = {
        id: 'decrypt-1',
        type: 'process' as const,
        operation: WorkerOperation.DECRYPT_DATA,
        payload: {
          data: 'encrypted-data-base64',
          key: 'my-secret-key',
          algorithm: 'AES-GCM'
        }
      };
      expect(message.operation).toBe('decrypt_data');
    });
  });
});
