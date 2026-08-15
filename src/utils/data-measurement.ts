/**
 * Data size units
 */
const DECIMAL_UNITS = [
  { name: 'B', short: 'B', factor: 1 },
  { name: 'Kilobyte', short: 'KB', factor: 1e3 },
  { name: 'Megabyte', short: 'MB', factor: 1e6 },
  { name: 'Gigabyte', short: 'GB', factor: 1e9 },
  { name: 'Terabyte', short: 'TB', factor: 1e12 },
  { name: 'Petabyte', short: 'PB', factor: 1e15 },
  { name: 'Exabyte', short: 'EB', factor: 1e18 },
];

const BINARY_UNITS = [
  { name: 'Byte', short: 'B', factor: 1 },
  { name: 'Kibibyte', short: 'KiB', factor: Math.pow(2, 10) },
  { name: 'Mebibyte', short: 'MiB', factor: Math.pow(2, 20) },
  { name: 'Gibibyte', short: 'GiB', factor: Math.pow(2, 30) },
  { name: 'Tebibyte', short: 'TiB', factor: Math.pow(2, 40) },
  { name: 'Pebibyte', short: 'PiB', factor: Math.pow(2, 50) },
  { name: 'Exbibyte', short: 'EiB', factor: Math.pow(2, 60) },
];

/**
 * Convert bytes to a given unit
 */
export function convertSize(value, fromShort, toShort) {
  const from = [...DECIMAL_UNITS, ...BINARY_UNITS].find(u => u.short === fromShort);
  const to = [...DECIMAL_UNITS, ...BINARY_UNITS].find(u => u.short === toShort);
  if (!from || !to) throw new Error(`Unknown unit: ${fromShort} or ${toShort}`);
  return (value * from.factor) / to.factor;
}

/**
 * Convert all units from a given value
 */
export function convertToAllUnits(value, unitShort) {
  const unit = [...DECIMAL_UNITS, ...BINARY_UNITS].find(u => u.short === unitShort);
  if (!unit) throw new Error(`Unknown unit: ${unitShort}`);
  const bytes = value * unit.factor;

  const results = {};
  for (const u of [...DECIMAL_UNITS, ...BINARY_UNITS]) {
    results[u.short] = bytes / u.factor;
  }
  return results;
}

export { DECIMAL_UNITS, BINARY_UNITS };

/* ------------------------------------------------------------------ */
/*  Transfer rate units                                               */
/* ------------------------------------------------------------------ */

const RATE_UNITS = [
  { name: 'bps', short: 'bps', factor: 1 },
  { name: 'Kilobits/s', short: 'Kbps', factor: 1e3 },
  { name: 'Megabits/s', short: 'Mbps', factor: 1e6 },
  { name: 'Gigabits/s', short: 'Gbps', factor: 1e9 },
  { name: 'Terabits/s', short: 'Tbps', factor: 1e12 },
];

export function convertRate(value, fromShort, toShort) {
  const from = RATE_UNITS.find(u => u.short === fromShort);
  const to = RATE_UNITS.find(u => u.short === toShort);
  if (!from || !to) throw new Error(`Unknown rate unit: ${fromShort} or ${toShort}`);
  return (value * from.factor) / to.factor;
}

export function convertRateToAll(value, unitShort) {
  const unit = RATE_UNITS.find(u => u.short === unitShort);
  if (!unit) throw new Error(`Unknown rate unit: ${unitShort}`);
  const bps = value * unit.factor;
  const results = {};
  for (const u of RATE_UNITS) {
    results[u.short] = bps / u.factor;
  }
  return results;
}

/**
 * Estimate download time given a file size and transfer rate
 * Returns { seconds, humanReadable }
 */
export function estimateDownloadTime(sizeBytes, rateBps) {
  if (rateBps <= 0) throw new Error('Transfer rate must be positive.');
  // Convert bits to bytes
  const bytesPerSecond = rateBps / 8;
  const seconds = sizeBytes / bytesPerSecond;

  const absSeconds = Math.abs(seconds);
  if (absSeconds < 1) return { seconds, humanReadable: `${Math.round(seconds * 1000)}ms` };
  if (absSeconds < 60) return { seconds, humanReadable: `${seconds.toFixed(1)} seconds` };
  const minutes = seconds / 60;
  if (minutes < 60) return { seconds, humanReadable: `${minutes.toFixed(1)} minutes` };
  const hours = minutes / 60;
  if (hours < 24) return { seconds, humanReadable: `${hours.toFixed(1)} hours` };
  return { seconds, humanReadable: `${(hours / 24).toFixed(1)} days` };
}

export { RATE_UNITS };
