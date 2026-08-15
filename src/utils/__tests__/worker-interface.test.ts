import { describe, it, expect } from 'vitest';
import {
  WorkerOperation,
  validateWorkerInput,
  createWorkerErrorResponse,
  createWorkerSuccessResponse,
  createWorkerProgressResponse
} from '../worker-interface';

describe('Worker Interface Utilities', () => {
  describe('validateWorkerInput', () => {
    it('should validate JSON operation inputs', () => {
      const validInput = { data: '{"test": true}', options: { indent: 2 } };

      expect(validateWorkerInput(WorkerOperation.JSON_PARSE, validInput)).toBe(true);
      expect(validateWorkerInput(WorkerOperation.JSON_BEAUTIFY, validInput)).toBe(true);
      expect(validateWorkerInput(WorkerOperation.JSON_MINIFY, validInput)).toBe(true);
      expect(validateWorkerInput(WorkerOperation.JSON_STRINGIFY, validInput)).toBe(true);
    });

    it('should reject invalid JSON operation inputs', () => {
      expect(validateWorkerInput(WorkerOperation.JSON_PARSE, 'invalid')).toBe(false);
      expect(validateWorkerInput(WorkerOperation.JSON_PARSE, { invalidKey: 'test' })).toBe(false);
      expect(validateWorkerInput(WorkerOperation.JSON_PARSE, null)).toBe(false);
    });

    it('should validate CSV operation inputs', () => {
      const validInput = { data: 'col1,col2\nval1,val2', options: { delimiter: ',' } };

      expect(validateWorkerInput(WorkerOperation.CSV_TO_JSON, validInput)).toBe(true);
      expect(validateWorkerInput(WorkerOperation.JSON_TO_CSV, validInput)).toBe(true);
    });

    it('should validate YAML operation inputs', () => {
      const validInput = { data: 'key: value', options: {} };

      expect(validateWorkerInput(WorkerOperation.YAML_TO_JSON, validInput)).toBe(true);
      expect(validateWorkerInput(WorkerOperation.JSON_TO_YAML, validInput)).toBe(true);
    });

    it('should validate Base64 operation inputs', () => {
      expect(validateWorkerInput(WorkerOperation.BASE64_ENCODE, 'test string')).toBe(true);
      expect(validateWorkerInput(WorkerOperation.BASE64_DECODE, 'dGVzdA==')).toBe(true);

      expect(validateWorkerInput(WorkerOperation.BASE64_ENCODE, 123)).toBe(false);
      expect(validateWorkerInput(WorkerOperation.BASE64_DECODE, null)).toBe(false);
    });

    it('should validate hash operation inputs', () => {
      const validStringInput = { data: 'test string', algorithm: 'SHA-256' };
      const validBufferInput = { data: new ArrayBuffer(10), algorithm: 'MD5' };

      expect(validateWorkerInput(WorkerOperation.HASH_GENERATE, validStringInput)).toBe(true);
      expect(validateWorkerInput(WorkerOperation.HASH_GENERATE, validBufferInput)).toBe(true);

      const invalidAlgorithm = { data: 'test', algorithm: 'INVALID' };
      expect(validateWorkerInput(WorkerOperation.HASH_GENERATE, invalidAlgorithm)).toBe(false);
    });

    it('should validate encryption operation inputs', () => {
      const validInput = {
        data: 'secret data',
        key: 'encryption-key',
        algorithm: 'AES-GCM'
      };

      expect(validateWorkerInput(WorkerOperation.ENCRYPT_DATA, validInput)).toBe(true);
      expect(validateWorkerInput(WorkerOperation.DECRYPT_DATA, validInput)).toBe(true);

      const invalidAlgorithm = { ...validInput, algorithm: 'INVALID' };
      expect(validateWorkerInput(WorkerOperation.ENCRYPT_DATA, invalidAlgorithm)).toBe(false);
    });

    it('should return false for unsupported operations', () => {
      expect(validateWorkerInput('UNSUPPORTED_OP' as any, {})).toBe(false);
    });
  });

  describe('createWorkerErrorResponse', () => {
    it('should create error response with string error', () => {
      const response = createWorkerErrorResponse('test-id', 'Test error message');

      expect(response.id).toBe('test-id');
      expect(response.type).toBe('error');
      expect(response.error).toBe('Test error message');
    });

    it('should create error response with Error object', () => {
      const error = new Error('Test error');
      const response = createWorkerErrorResponse('test-id', error);

      expect(response.id).toBe('test-id');
      expect(response.type).toBe('error');
      expect(response.error).toBe('Test error');
    });
  });

  describe('createWorkerSuccessResponse', () => {
    it('should create success response with payload', () => {
      const payload = { result: 'success', data: [1, 2, 3] };
      const response = createWorkerSuccessResponse('test-id', payload);

      expect(response.id).toBe('test-id');
      expect(response.type).toBe('result');
      expect(response.payload).toEqual(payload);
    });

    it('should handle different payload types', () => {
      const stringResponse = createWorkerSuccessResponse('id1', 'string result');
      expect(stringResponse.payload).toBe('string result');

      const numberResponse = createWorkerSuccessResponse('id2', 42);
      expect(numberResponse.payload).toBe(42);

      const arrayResponse = createWorkerSuccessResponse('id3', [1, 2, 3]);
      expect(arrayResponse.payload).toEqual([1, 2, 3]);
    });
  });

  describe('createWorkerProgressResponse', () => {
    it('should create progress response with basic progress', () => {
      const progress = { percentage: 50 };
      const response = createWorkerProgressResponse('test-id', progress);

      expect(response.id).toBe('test-id');
      expect(response.type).toBe('progress');
      expect(response.progress).toEqual(progress);
    });

    it('should create progress response with detailed progress', () => {
      const progress = {
        percentage: 75,
        message: 'Processing data',
        currentStep: 'Step 3 of 4'
      };
      const response = createWorkerProgressResponse('test-id', progress);

      expect(response.id).toBe('test-id');
      expect(response.type).toBe('progress');
      expect(response.progress).toEqual(progress);
    });
  });

  describe('WorkerOperation enum', () => {
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
  });
});