import Papa from 'papaparse';
import * as yaml from 'js-yaml';
import { FormatError, ValidationError } from './errors';

/**
 * CSV parsing options
 */
export interface CsvOptions {
  delimiter?: string;
  skipEmptyLines?: boolean;
  headers?: string[]; // Custom headers (overrides auto-detection)
}

/**
 * YAML conversion options
 */
export interface YamlOptions {
  indent?: number;
  lineWidth?: number;
}

/**
 * Result of a conversion operation
 */
export interface ConversionResult {
  result: string;
  rowCount?: number;
  columnCount?: number;
  metadata?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  CSV utilities                                                      */
/* ------------------------------------------------------------------ */

/**
 * Parse CSV string into an array of objects.
 * Handles escaped commas, quoted fields, newlines inside quotes,
 * and custom delimiters (auto-detected when not specified).
 */
export function csvToJson(csv: string, options: CsvOptions = {}): ConversionResult {
  if (!csv || !csv.trim()) {
    throw new ValidationError('CSV input is empty.', 'csv');
  }

  const delimiter = options.delimiter ?? autoDetectDelimiter(csv);

  const result = Papa.parse<string[]>(csv, {
    header: false,
    delimiter,
    skipEmptyLines: options.skipEmptyLines ?? true,
    cleanBlankLines: true,
    transformHeader: (h) => h.trim(),
    // No dynamicTyping: a converter must not silently coerce values
    // ("007" -> 7, "true" -> true). All CSV values stay strings.
  });

  if (result.errors.length && result.data.length === 0) {
    const msg = result.errors[0]?.message ?? 'Failed to parse CSV';
    throw new FormatError(msg, 'CSV');
  }

  if (result.data.length === 0) {
    throw new ValidationError('No data rows found in CSV.', 'csv');
  }

  // Build headers: use custom if provided, otherwise first row
  const dataRows = result.data as unknown[][];
  let headers: string[];

  if (options.headers) {
    headers = options.headers;
  } else {
    headers = dataRows[0] as string[];
  }

  const jsonObjects: Record<string, unknown>[] = [];

  if (options.headers) {
    // Custom headers: all rows are data
    for (const row of dataRows) {
      const obj: Record<string, unknown> = {};
      for (let i = 0; i < Math.max(headers.length, row.length); i++) {
        obj[headers[i] ?? `column_${i}`] = row[i];
      }
      jsonObjects.push(obj);
    }
  } else {
    // First row is headers
    for (let i = 1; i < dataRows.length; i++) {
      const row = dataRows[i] as unknown[];
      const obj: Record<string, unknown> = {};
      for (let j = 0; j < Math.max(headers.length, row.length); j++) {
        obj[headers[j] ?? `column_${j}`] = row[j];
      }
      jsonObjects.push(obj);
    }
  }

  if (jsonObjects.length === 0) {
    throw new ValidationError('No data rows found in CSV.', 'csv');
  }

  return {
    result: JSON.stringify(jsonObjects, null, 2),
    rowCount: jsonObjects.length,
    columnCount: headers.length,
    metadata: { headers },
  };
}

/**
 * Convert an array of JSON objects to CSV string.
 */
export function jsonToCsv(jsonInput: string, options: CsvOptions = {}): ConversionResult {
  if (!jsonInput || !jsonInput.trim()) {
    throw new ValidationError('JSON input is empty.', 'json');
  }

  let data: Record<string, unknown>[];
  try {
    data = JSON.parse(jsonInput);
  } catch (e) {
    throw new FormatError('Invalid JSON input.', 'JSON');
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new ValidationError('JSON input must be a non-empty array of objects.', 'json');
  }

  // Normalize: ensure all rows have the same keys
  const allKeys = Array.from(new Set(data.flatMap((row) => Object.keys(row))));

  // Convert to CSV using Papa
  const csv = Papa.unparse(data, {
    header: true, // always include headers
    columns: allKeys,
    delimiter: options.delimiter ?? ',',
  });

  return {
    result: csv,
    rowCount: data.length,
    columnCount: allKeys.length,
    metadata: { headers: allKeys },
  };
}

/* ------------------------------------------------------------------ */
/*  YAML utilities                                                     */
/* ------------------------------------------------------------------ */

/**
 * Parse YAML string and return pretty-printed JSON.
 */
export function yamlToJson(yamlInput: string): ConversionResult {
  if (!yamlInput || !yamlInput.trim()) {
    throw new ValidationError('YAML input is empty.', 'yaml');
  }

  let parsed: unknown;
  try {
    parsed = yaml.load(yamlInput);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to parse YAML';
    throw new FormatError(msg, 'YAML');
  }

  if (parsed === null || parsed === undefined) {
    throw new ValidationError('YAML input contains no data.', 'yaml');
  }

  return {
    result: JSON.stringify(parsed, null, 2),
  };
}

/**
 * Convert JSON string to YAML string.
 */
export function jsonToYaml(jsonInput: string, options: YamlOptions = {}): ConversionResult {
  if (!jsonInput || !jsonInput.trim()) {
    throw new ValidationError('JSON input is empty.', 'json');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonInput);
  } catch (e) {
    throw new FormatError('Invalid JSON input.', 'JSON');
  }

  try {
    const yamlStr = yaml.dump(parsed, {
      indent: options.indent ?? 2,
      lineWidth: options.lineWidth ?? 80,
      noRefs: true, // avoid YAML anchors/aliases for readability
      quotingType: '"', // consistent double-quote style
    });

    return {
      result: yamlStr,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to convert to YAML';
    throw new FormatError(msg, 'YAML');
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Auto-detect CSV delimiter (comma, semicolon, tab, pipe).
 */
function autoDetectDelimiter(csv: string): string {
  const firstLine = csv.split('\n')[0];
  const candidates: { char: string; count: number }[] = [
    { char: ',', count: (firstLine.match(/,/g) || []).length },
    { char: ';', count: (firstLine.match(/;/g) || []).length },
    { char: '\t', count: (firstLine.match(/\t/g) || []).length },
    { char: '|', count: (firstLine.match(/\|/g) || []).length },
  ];

  // Pick the delimiter with the most occurrences (at least 1)
  candidates.sort((a, b) => b.count - a.count);
  return candidates[0].count > 0 ? candidates[0].char : ',';
}
