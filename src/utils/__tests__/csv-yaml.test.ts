import { describe, it, expect } from 'vitest';
import {
  csvToJson,
  jsonToCsv,
  yamlToJson,
  jsonToYaml,
} from '../csv-yaml';

/* ------------------------------------------------------------------ */
/*  CSV → JSON                                                         */
/* ------------------------------------------------------------------ */

describe('csvToJson', () => {
  it('converts simple CSV to JSON array', () => {
    const csv = 'name,age,city\nAlice,30,New York\nBob,25,London';
    const result = csvToJson(csv);

    const parsed = JSON.parse(result.result);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual({ name: 'Alice', age: 30, city: 'New York' });
    expect(parsed[1]).toEqual({ name: 'Bob', age: 25, city: 'London' });
    expect(result.rowCount).toBe(2);
    expect(result.columnCount).toBe(3);
  });

  it('handles quoted fields with commas', () => {
    const csv = '"name","description"\n"Alice","Loves cats, dogs"\n"Bob","Said ""hello"""';
    const result = csvToJson(csv);

    const parsed = JSON.parse(result.result);
    expect(parsed[0].description).toBe('Loves cats, dogs');
  });

  it('handles escaped commas inside quoted fields', () => {
    const csv = 'field1,field2\n"hello, world",42';
    const result = csvToJson(csv);

    const parsed = JSON.parse(result.result);
    expect(parsed[0].field1).toBe('hello, world');
  });

  it('handles custom delimiter (semicolon)', () => {
    const csv = 'name;age;city\nAlice;30;New York';
    const result = csvToJson(csv, { delimiter: ';' });

    const parsed = JSON.parse(result.result);
    expect(parsed[0]).toEqual({ name: 'Alice', age: 30, city: 'New York' });
  });

  it('handles custom delimiter (tab)', () => {
    const csv = 'name\tage\tcity\nAlice\t30\tNew York';
    const result = csvToJson(csv, { delimiter: '\t' });

    const parsed = JSON.parse(result.result);
    expect(parsed[0]).toEqual({ name: 'Alice', age: 30, city: 'New York' });
  });

  it('handles custom delimiter (pipe)', () => {
    const csv = 'name|age|city\nAlice|30|New York';
    const result = csvToJson(csv, { delimiter: '|' });

    const parsed = JSON.parse(result.result);
    expect(parsed[0]).toEqual({ name: 'Alice', age: 30, city: 'New York' });
  });

  it('auto-detects semicolon delimiter', () => {
    const csv = 'name;age\nAlice;30';
    const result = csvToJson(csv);

    const parsed = JSON.parse(result.result);
    expect(parsed[0]).toEqual({ name: 'Alice', age: 30 });
  });

  it('auto-detects tab delimiter', () => {
    const csv = 'name\tage\nAlice\t30';
    const result = csvToJson(csv);

    const parsed = JSON.parse(result.result);
    expect(parsed[0]).toEqual({ name: 'Alice', age: 30 });
  });

  it('auto-detects pipe delimiter', () => {
    const csv = 'name|age\nAlice|30';
    const result = csvToJson(csv);

    const parsed = JSON.parse(result.result);
    expect(parsed[0]).toEqual({ name: 'Alice', age: 30 });
  });

  it('uses custom headers when provided', () => {
    const csv = 'Alice,30,New York\nBob,25,London';
    const result = csvToJson(csv, {
      headers: ['name', 'age', 'city'],
    });

    const parsed = JSON.parse(result.result);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual({ name: 'Alice', age: 30, city: 'New York' });
  });

  it('skips empty lines by default', () => {
    const csv = 'name,age\nAlice,30\n\nBob,25\n\n';
    const result = csvToJson(csv);

    const parsed = JSON.parse(result.result);
    expect(parsed).toHaveLength(2);
  });

  it('handles newlines inside quoted fields', () => {
    const csv = 'name,bio\nAlice,"Line 1\nLine 2"\nBob,"Simple"';
    const result = csvToJson(csv);

    const parsed = JSON.parse(result.result);
    expect(parsed[0].bio).toBe('Line 1\nLine 2');
  });

  it('converts numeric values with dynamicTyping', () => {
    const csv = 'name,score,ratio\nAlice,100,0.95';
    const result = csvToJson(csv);

    const parsed = JSON.parse(result.result);
    expect(typeof parsed[0].score).toBe('number');
    expect(typeof parsed[0].ratio).toBe('number');
    expect(parsed[0].score).toBe(100);
    expect(parsed[0].ratio).toBe(0.95);
  });

  it('returns metadata with headers', () => {
    const csv = 'name,age\nAlice,30';
    const result = csvToJson(csv);

    expect(result.metadata).toBeDefined();
    expect(result.metadata.headers).toEqual(['name', 'age']);
  });

  it('handles rows with more columns than headers', () => {
    const csv = 'a,b\n1,2,3,4';
    const result = csvToJson(csv);

    const parsed = JSON.parse(result.result);
    expect(parsed[0]).toEqual({ a: 1, b: 2, column_2: 3, column_3: 4 });
  });

  it('handles rows with fewer columns than headers', () => {
    const csv = 'a,b,c\n1';
    const result = csvToJson(csv);

    const parsed = JSON.parse(result.result);
    expect(parsed[0].a).toBe(1);
    expect(parsed[0].b).toBeUndefined();
    expect(parsed[0].c).toBeUndefined();
  });

  it('throws on empty input', () => {
    expect(() => csvToJson('')).toThrow('CSV input is empty');
    expect(() => csvToJson('   ')).toThrow('CSV input is empty');
  });

  it('throws on completely blank CSV', () => {
    expect(() => csvToJson('\n\n')).toThrow();
  });
});

/* ------------------------------------------------------------------ */
/*  JSON → CSV                                                         */
/* ------------------------------------------------------------------ */

describe('jsonToCsv', () => {
  it('converts JSON array to CSV', () => {
    const json = JSON.stringify([
      { name: 'Alice', age: 30, city: 'New York' },
      { name: 'Bob', age: 25, city: 'London' },
    ]);
    const result = jsonToCsv(json);

    expect(result.rowCount).toBe(2);
    expect(result.columnCount).toBe(3);
    // Verify CSV structure
    const lines = result.result.trim().split('\n');
    expect(lines[0]).toContain('name');
    expect(lines[0]).toContain('age');
    expect(lines[0]).toContain('city');
  });

  it('handles values with commas (auto-quotes)', () => {
    const json = JSON.stringify([
      { name: 'Alice', address: '123 Main St, Apt 4' },
    ]);
    const result = jsonToCsv(json);

    // The address with a comma should be quoted in CSV
    expect(result.result).toContain('"123 Main St, Apt 4"');
  });

  it('handles values with newlines (auto-quotes)', () => {
    const json = JSON.stringify([
      { name: 'Alice', bio: 'Line 1\nLine 2' },
    ]);
    const result = jsonToCsv(json);

    // Newlines in CSV require quoting
    expect(result.result).toContain('"Line 1\nLine 2"');
  });

  it('handles empty string values', () => {
    const json = JSON.stringify([{ name: 'Alice', note: '' }]);
    const result = jsonToCsv(json);

    expect(result.result).toBeDefined();
  });

  it('uses custom delimiter', () => {
    const json = JSON.stringify([{ a: 1, b: 2 }]);
    const result = jsonToCsv(json, { delimiter: ';' });

    // PapaParse uses \r\n line endings - normalize for comparison
    const lines = result.result.replace(/\r\n/g, '\n').trim().split('\n');
    expect(lines[0]).toBe('a;b');
    expect(lines[1]).toBe('1;2');
  });

  it('handles mixed key sets across rows', () => {
    const json = JSON.stringify([
      { name: 'Alice', age: 30 },
      { name: 'Bob', city: 'London' },
    ]);
    const result = jsonToCsv(json);

    // Should have all keys as columns
    expect(result.columnCount).toBe(3);
    const lines = result.result.trim().split('\n');
    expect(lines[0]).toContain('name');
    expect(lines[0]).toContain('age');
    expect(lines[0]).toContain('city');
  });

  it('throws on empty input', () => {
    expect(() => jsonToCsv('')).toThrow('JSON input is empty');
    expect(() => jsonToCsv('   ')).toThrow('JSON input is empty');
  });

  it('throws on invalid JSON', () => {
    expect(() => jsonToCsv('{ not valid json }')).toThrow('Invalid JSON');
  });

  it('throws on non-array JSON', () => {
    expect(() => jsonToCsv('{"name": "Alice"}')).toThrow(
      'must be a non-empty array'
    );
  });

  it('throws on empty array', () => {
    expect(() => jsonToCsv('[]')).toThrow('must be a non-empty array');
  });
});

/* ------------------------------------------------------------------ */
/*  YAML → JSON                                                        */
/* ------------------------------------------------------------------ */

describe('yamlToJson', () => {
  it('converts simple YAML to JSON', () => {
    const yamlInput = 'name: Alice\nage: 30\ncity: New York';
    const result = yamlToJson(yamlInput);

    const parsed = JSON.parse(result.result);
    expect(parsed).toEqual({ name: 'Alice', age: 30, city: 'New York' });
  });

  it('converts nested YAML objects to JSON', () => {
    const yamlInput = `
name: Alice
address:
  street: "123 Main St"
  city: New York
  zip: "10001"
`.trim();
    const result = yamlToJson(yamlInput);

    const parsed = JSON.parse(result.result);
    expect(parsed.address.street).toBe('123 Main St');
    expect(parsed.address.city).toBe('New York');
  });

  it('converts YAML lists to JSON arrays', () => {
    const yamlInput = `
fruits:
  - apple
  - banana
  - cherry
`;
    const result = yamlToJson(yamlInput);

    const parsed = JSON.parse(result.result);
    expect(parsed.fruits).toEqual(['apple', 'banana', 'cherry']);
  });

  it('converts YAML boolean values correctly', () => {
    const yamlInput = `active: true\ndeleted: false`;
    const result = yamlToJson(yamlInput);

    const parsed = JSON.parse(result.result);
    expect(parsed.active).toBe(true);
    expect(parsed.deleted).toBe(false);
  });

  it('converts YAML null values correctly', () => {
    const yamlInput = `name: Alice\nmiddle: null`;
    const result = yamlToJson(yamlInput);

    const parsed = JSON.parse(result.result);
    expect(parsed.middle).toBeNull();
  });

  it('handles YAML with quoted strings', () => {
    const yamlInput = `name: "Alice"\nage: "30"`;
    const result = yamlToJson(yamlInput);

    const parsed = JSON.parse(result.result);
    expect(parsed.name).toBe('Alice');
    // Quoted "30" should remain a string
    expect(typeof parsed.age).toBe('string');
  });

  it('handles complex YAML structures', () => {
    const yamlInput = `
users:
  - name: Alice
    age: 30
    skills:
      - JavaScript
      - Python
  - name: Bob
    age: 25
    skills:
      - Rust
      - Go
`;
    const result = yamlToJson(yamlInput);

    const parsed = JSON.parse(result.result);
    expect(parsed.users).toHaveLength(2);
    expect(parsed.users[0].skills).toContain('JavaScript');
  });

  it('throws on empty input', () => {
    expect(() => yamlToJson('')).toThrow('YAML input is empty');
    expect(() => yamlToJson('   ')).toThrow('YAML input is empty');
  });

  it('throws on invalid YAML', () => {
    expect(() =>
      yamlToJson('key: value\n  bad indent: here\n    extra: bad')
    ).toThrow();
  });

  it('throws on completely empty YAML document', () => {
    expect(() => yamlToJson('---\n...')).toThrow('contains no data');
  });
});

/* ------------------------------------------------------------------ */
/*  JSON → YAML                                                        */
/* ------------------------------------------------------------------ */

describe('jsonToYaml', () => {
  it('converts simple JSON object to YAML', () => {
    const json = JSON.stringify({ name: 'Alice', age: 30 });
    const result = jsonToYaml(json);

    expect(result.result).toContain('name');
    expect(result.result).toContain('Alice');
    expect(result.result).toContain('age');
    expect(result.result).toContain('30');
  });

  it('converts nested JSON to nested YAML', () => {
    const json = JSON.stringify({
      user: { name: 'Alice', address: { city: 'New York' } },
    });
    const result = jsonToYaml(json);

    expect(result.result).toContain('user:');
    expect(result.result).toContain('city');
  });

  it('converts JSON arrays to YAML lists', () => {
    const json = JSON.stringify({ fruits: ['apple', 'banana', 'cherry'] });
    const result = jsonToYaml(json);

    expect(result.result).toContain('- apple');
    expect(result.result).toContain('- banana');
  });

  it('uses custom indent', () => {
    const json = JSON.stringify({
      user: { name: 'Alice' },
    });
    const result = jsonToYaml(json, { indent: 4 });

    // Should use 4 spaces for nesting
    expect(result.result).toContain('    name:');
  });

  it('avoids YAML anchors and aliases (noRefs)', () => {
    const shared = { name: 'Alice' };
    const json = JSON.stringify({ user1: shared, user2: shared });
    const result = jsonToYaml(json);

    // Should not contain & or * (YAML anchors/aliases)
    expect(result.result).not.toMatch(/[&*]\s*\w+/);
  });

  it('handles boolean JSON values', () => {
    const json = JSON.stringify({ active: true, deleted: false });
    const result = jsonToYaml(json);

    expect(result.result).toContain('true');
    expect(result.result).toContain('false');
  });

  it('handles null JSON values', () => {
    const json = JSON.stringify({ name: 'Alice', middle: null });
    const result = jsonToYaml(json);

    expect(result.result).toContain('null');
  });

  it('handles JSON arrays of objects', () => {
    const json = JSON.stringify([
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ]);
    const result = jsonToYaml(json);

    expect(result.result).toContain('- name:');
  });

  it('throws on empty input', () => {
    expect(() => jsonToYaml('')).toThrow('JSON input is empty');
    expect(() => jsonToYaml('   ')).toThrow('JSON input is empty');
  });

  it('throws on invalid JSON', () => {
    expect(() => jsonToYaml('{ bad yaml }')).toThrow('Invalid JSON');
  });
});

/* ------------------------------------------------------------------ */
/*  Edge cases and integration                                         */
/* ------------------------------------------------------------------ */

describe('edge cases', () => {
  it('handles CSV with only headers and no data rows', () => {
    expect(() => csvToJson('name,age,city')).toThrow('No data rows');
  });

  it('handles CSV with single data row', () => {
    const csv = 'name,age\nAlice,30';
    const result = csvToJson(csv);
    const parsed = JSON.parse(result.result);
    expect(parsed).toHaveLength(1);
  });

  it('round-trips CSV → JSON → CSV with consistent data', () => {
    const csv = 'name,age\nAlice,30\nBob,25';
    const csvToJsonResult = csvToJson(csv);
    const jsonToCsvResult = jsonToCsv(csvToJsonResult.result);

    // The resulting CSV should have the same data
    const reParsed = csvToJson(jsonToCsvResult.result);
    const original = JSON.parse(csvToJsonResult.result);
    const roundTrip = JSON.parse(reParsed.result);

    expect(original).toEqual(roundTrip);
  });

  it('round-trips JSON → YAML → JSON with consistent data', () => {
    const json = JSON.stringify({
      name: 'Alice',
      age: 30,
      active: true,
      skills: ['JavaScript', 'Python'],
    });
    const jsonToYamlResult = jsonToYaml(json);
    const yamlToJsonResult = yamlToJson(jsonToYamlResult.result);

    const original = JSON.parse(json);
    const roundTrip = JSON.parse(yamlToJsonResult.result);

    expect(original).toEqual(roundTrip);
  });

  it('handles CSV with unicode content', () => {
    const csv = 'name,city\nJosé,São Paulo\n田中,Tokyo\nأحمد,Cairo';
    const result = csvToJson(csv);
    const parsed = JSON.parse(result.result);

    expect(parsed[0].name).toBe('José');
    expect(parsed[1].name).toBe('田中');
    expect(parsed[2].name).toBe('أحمد');
  });

  it('handles YAML with unicode content', () => {
    const yamlInput = 'name: José\ncity: São Paulo';
    const result = yamlToJson(yamlInput);
    const parsed = JSON.parse(result.result);

    expect(parsed.name).toBe('José');
    expect(parsed.city).toBe('São Paulo');
  });

  it('handles CSV with blank values', () => {
    const csv = 'name,age,city\nAlice,,New York\nBob,25,';
    const result = csvToJson(csv);
    const parsed = JSON.parse(result.result);

    // dynamicTyping converts empty to null; PapaParse sets undefined for missing fields
    expect(parsed[0].age).toBeNull();
    expect(parsed[1].city).toBeNull();
  });
});
