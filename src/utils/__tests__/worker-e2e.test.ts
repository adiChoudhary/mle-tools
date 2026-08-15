// @vitest-environment node
/**
 * End-to-end worker tests.
 *
 * Runs the REAL data-processor worker module (not a mock) through the full
 * message protocol used by WorkerPool:
 *   in:  { id, type: 'process', payload: { operation, input } }
 *   out: { id, type: 'result' | 'error', payload | error }
 *
 * Only the thread boundary is simulated: the worker module is imported with
 * a fake `self` context that captures its message listener and outbound
 * postMessage calls. This exercises the actual parsing, base64 chunking,
 * MD5/SHA hashing and protocol code that the shape-only tests skipped.
 */
import { describe, it, expect, beforeAll } from 'vitest';

interface Posted {
  id?: string;
  type?: string;
  payload?: any;
  error?: string;
  progress?: any;
}

let handler: ((event: { data: any }) => void) | null = null;
const waiters = new Map<string, (m: Posted) => void>();
const posted: Posted[] = [];

beforeAll(async () => {
  // The worker captures `self` at module scope — install the fake context
  // BEFORE the first import.
  (globalThis as any).self = {
    addEventListener: (type: string, fn: (e: { data: any }) => void) => {
      if (type === 'message') handler = fn;
    },
    postMessage: (msg: Posted) => {
      posted.push(msg);
      const w = msg.id ? waiters.get(msg.id) : undefined;
      // Only terminal messages settle a waiter
      if (w && (msg.type === 'result' || msg.type === 'error')) {
        waiters.delete(msg.id);
        w(msg);
      }
    },
  };

  await import('../../workers/data-processor.ts');
  expect(handler).not.toBeNull();
});

/**
 * Send one process message and await the terminal (result/error) response.
 */
async function run(
  operation: string,
  input: any,
  id = `test-${Math.random().toString(36).slice(2)}`
): Promise<Posted> {
  const response = new Promise<Posted>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Worker did not respond to ${operation}`)),
      15000
    );
    waiters.set(id, (m) => { clearTimeout(timer); resolve(m); });
  });
  handler!({ data: { id, type: 'process', payload: { operation, input } } });
  return response;
}

describe('data-processor worker (end-to-end)', () => {
  describe('JSON operations', () => {
    it('json_beautify pretty-prints and reports size', async () => {
      const res = await run('json_beautify', { data: '{"a":1,"b":[2,3]}', options: { indent: 2 } });
      expect(res.type).toBe('result');
      expect(res.payload.isValid).toBe(true);
      expect(res.payload.result).toBe('{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}');
      expect(res.payload.size).toBe(res.payload.result.length);
    });

    it('json_minify strips whitespace', async () => {
      const res = await run('json_minify', { data: '{\n  "a": 1\n}' });
      expect(res.type).toBe('result');
      expect(res.payload.result).toBe('{"a":1}');
    });

    it('json_parse validates without altering the input', async () => {
      const input = '{"a":1}  ';
      const res = await run('json_parse', { data: input });
      expect(res.type).toBe('result');
      expect(res.payload.isValid).toBe(true);
      expect(res.payload.result).toBe(input);
    });

    it('returns isValid:false with the parse error for invalid JSON', async () => {
      const res = await run('json_beautify', { data: '{oops' });
      expect(res.type).toBe('result');
      expect(res.payload.isValid).toBe(false);
      expect(res.payload.error).toBeTruthy();
    });
  });

  describe('CSV operations', () => {
    it('csv_to_json builds objects from the header row', async () => {
      const res = await run('csv_to_json', { data: 'name,age\nAlice,30\nBob,25' });
      expect(res.type).toBe('result');
      const parsed = JSON.parse(res.payload.result);
      expect(parsed).toEqual([
        { name: 'Alice', age: '30' },
        { name: 'Bob', age: '25' },
      ]);
      expect(res.payload.rowCount).toBe(2);
      expect(res.payload.columnCount).toBe(2);
    });

    it('csv_to_json does not coerce values (fidelity: 007 stays "007")', async () => {
      const res = await run('csv_to_json', { data: 'code,flag\n007,true' });
      const parsed = JSON.parse(res.payload.result);
      expect(parsed[0].code).toBe('007');
      expect(parsed[0].flag).toBe('true');
    });

    it('json_to_csv round-trips a JSON array', async () => {
      const json = JSON.stringify([{ a: 1, b: 'x' }, { a: 2, b: 'y' }]);
      const res = await run('json_to_csv', { data: json });
      expect(res.type).toBe('result');
      // Papa.unparse emits CRLF line endings — normalize for comparison
      expect(res.payload.result.replace(/\r\n/g, '\n').trim()).toBe('a,b\n1,x\n2,y');
    });

    it('rejects non-array JSON for json_to_csv', async () => {
      const res = await run('json_to_csv', { data: '{"a":1}' });
      expect(res.type).toBe('error');
      expect(res.error).toMatch(/non-empty array/);
    });
  });

  describe('YAML operations', () => {
    it('yaml_to_json parses YAML into pretty JSON', async () => {
      const res = await run('yaml_to_json', { data: 'name: Alice\nage: 30\n' });
      expect(res.type).toBe('result');
      expect(JSON.parse(res.payload.result)).toEqual({ name: 'Alice', age: 30 });
    });

    it('json_to_yaml dumps JSON with configured indentation', async () => {
      const res = await run('json_to_yaml', { data: '{"a":1}', options: { indent: 2 } });
      expect(res.type).toBe('result');
      expect(res.payload.result).toContain('a: 1');
    });
  });

  describe('Base64 operations', () => {
    it('encodes/decodes standard base64 (UTF-8 safe)', async () => {
      const text = 'Hello, World! äöü 你好';
      const bytes = new TextEncoder().encode(text);
      let bin = '';
      bytes.forEach((b) => (bin += String.fromCharCode(b)));
      const expected = btoa(bin);

      const enc = await run('base64_encode', { data: text });
      expect(enc.type).toBe('result');
      expect(enc.payload.result).toBe(expected);

      const dec = await run('base64_decode', { data: 'SGVsbG8sIFdvcmxkIQ==' });
      expect(dec.payload.result).toBe('Hello, World!');
    });

    it('supports the urlsafe variant (encode + decode round trip)', async () => {
      // U+FFFD ÿ U+FFFD encodes to bytes that yield both '+' and '/' in
      // standard base64 ("77+9w7/vv70="), so both substitutions are exercised.
      const text = '\uFFFD\u00FF\uFFFD';
      const bytes = new TextEncoder().encode(text);
      let bin = '';
      bytes.forEach((b) => (bin += String.fromCharCode(b)));
      const std = btoa(bin);
      expect(std).toContain('+');
      expect(std).toContain('/');

      const enc = await run('base64_encode', { data: text, variant: 'urlsafe' });
      expect(enc.payload.result).toBe(std.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''));
      expect(enc.payload.result).not.toMatch(/[+/]/);

      const dec = await run('base64_decode', { data: enc.payload.result, variant: 'urlsafe' });
      expect(dec.payload.result).toBe(text);
    });

    it('encodes multi-MB input without stack overflow (chunked btoa)', async () => {
      const big = 'a'.repeat(2 * 1024 * 1024); // 2 MB — spread-based btoa would throw
      const res = await run('base64_encode', { data: big });
      expect(res.type).toBe('result');
      expect(res.payload.result.length).toBe(Math.ceil((2 * 1024 * 1024) / 3) * 4);
      expect(res.payload.result).not.toContain('\n');
    });

    it('reports an error for invalid base64 on decode', async () => {
      const res = await run('base64_decode', { data: '!!!not-base64!!!' });
      expect(res.type).toBe('error');
      expect(res.error).toMatch(/Invalid Base64/);
    });
  });

  describe('Hash operations', () => {
    it('hash_generate MD5 (not available in WebCrypto) uses the local implementation', async () => {
      const res = await run('hash_generate', { data: 'abc', algorithm: 'MD5' });
      expect(res.type).toBe('result');
      expect(res.payload.hash).toBe('900150983cd24fb0d6963f7d28e17f72');
      expect(res.payload.inputSize).toBe(3);
    });

    it('hash_generate SHA-256 matches WebCrypto', async () => {
      const res = await run('hash_generate', { data: 'abc', algorithm: 'SHA-256' });
      expect(res.type).toBe('result');
      expect(res.payload.hash).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    });
  });

  describe('protocol', () => {
    it('errors on unknown operations', async () => {
      const res = await run('definitely_not_an_operation', { data: 'x' });
      expect(res.type).toBe('error');
      expect(res.error).toMatch(/Unsupported operation/);
    });

    it('errors on a missing payload', async () => {
      const id = 'no-payload';
      const response = new Promise<Posted>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('no response')), 5000);
        waiters.set(id, (m) => { clearTimeout(timer); resolve(m); });
      });
      handler!({ data: { id, type: 'process', payload: undefined } });
      const msg = await response;
      expect(msg.type).toBe('error');
      expect(msg.error).toMatch(/Invalid operation payload/);
    });

    it('progress messages do not settle the terminal wait (observed on the wire)', async () => {
      const before = posted.length;
      await run('json_minify', { data: '{"a":1}' });
      const wire = posted.slice(before);
      expect(wire.some((m) => m.type === 'progress')).toBe(true);
      expect(wire[wire.length - 1].type).toBe('result');
    });
  });
});
