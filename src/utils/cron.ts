/**
 * Crontab Expression Evaluator
 * Validates cron syntax and computes the next N execution times
 */

/**
 * Parse a single cron field with its allowed range
 */
function parseField(field, min, max, name) {
  const values = new Set();

  for (const part of field.split(',')) {
    // Handle step: */5, 1-30/2
    const stepMatch = part.match(/^(.+)(\/)(\d+)$/);
    if (stepMatch) {
      const [, range, , stepStr] = stepMatch;
      const step = parseInt(stepStr, 10);
      if (isNaN(step) || step <= 0) throw new Error(`Invalid step value in ${name}: ${stepStr}`);

      let start = min;
      let end = max;

      if (range === '*') {
        // */step
      } else if (range.includes('-')) {
        const [s, e] = range.split('-').map(Number);
        if (isNaN(s) || isNaN(e) || s > e) throw new Error(`Invalid range in ${name}: ${range}`);
        start = s;
        end = e;
      } else {
        const s = parseInt(range, 10);
        if (isNaN(s) || s < min || s > max) throw new Error(`Invalid value in ${name}: ${range}`);
        start = s;
        end = s;
      }

      for (let i = start; i <= end; i += step) {
        values.add(i);
      }
    } else if (part === '*') {
      for (let i = min; i <= max; i++) values.add(i);
    } else if (part.includes('-')) {
      const [s, e] = part.split('-').map(Number);
      if (isNaN(s) || isNaN(e) || s < min || e > max || s > e) {
        throw new Error(`Invalid range in ${name}: ${part}`);
      }
      for (let i = s; i <= e; i++) values.add(i);
    } else {
      const val = parseInt(part, 10);
      if (isNaN(val) || val < min || val > max) {
        throw new Error(`Invalid value in ${name}: ${part} (must be ${min}-${max})`);
      }
      values.add(val);
    }
  }

  return [...values].sort((a, b) => a - b);
}

/**
 * Parse a cron expression and return structured field values
 */
export function parseCronExpression(expr) {
  // Support both 5-field and 6-field (with seconds) cron
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5 && parts.length !== 6) {
    throw new Error('Cron expression must have 5 or 6 fields (minute, hour, day-of-month, month, day-of-week[, seconds])');
  }

  let minute, hour, dom, month, dow, second;

  if (parts.length === 6) {
    [second, minute, hour, dom, month, dow] = parts;
    second = parseField(second, 0, 59, 'seconds');
  } else {
    [minute, hour, dom, month, dow] = parts;
  }

  minute = parseField(minute, 0, 59, 'minutes');
  hour = parseField(hour, 0, 23, 'hours');
  dom = parseField(dom, 1, 31, 'day of month');
  month = parseField(month, 1, 12, 'months');
  dow = parseField(dow, 0, 7, 'day of week'); // 0 and 7 both mean Sunday

  // Normalize: 7 -> 0 for Sunday
  if (dow.includes(7)) {
    const idx = dow.indexOf(7);
    dow.splice(idx, 1);
    if (!dow.includes(0)) dow.push(0);
    dow.sort((a, b) => a - b);
  }

  return { minute, hour, dom, month, dow, hasSeconds: parts.length === 6 };
}

/**
 * Validate a cron expression (throws on error)
 */
export function validateCronExpression(expr) {
  if (!expr || !expr.trim()) {
    throw new Error('Cron expression is empty.');
  }
  parseCronExpression(expr);
  return true;
}

/**
 * Translate cron expression to human-readable description
 */
export function cronToHuman(expr) {
  const parsed = parseCronExpression(expr);
  const parts = expr.trim().split(/\s+/);
  const fields = parts.length === 6
    ? { second: parts[0], minute: parts[1], hour: parts[2], dom: parts[3], month: parts[4], dow: parts[5] }
    : { second: null, minute: parts[0], hour: parts[1], dom: parts[2], month: parts[3], dow: parts[4] };

  const descriptions = [];

  // Month
  if (fields.month !== '*') {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (parsed.month.length === 1) {
      descriptions.push(`in ${monthNames[parsed.month[0] - 1]}`);
    }
  }

  // Day of month / Day of week
  if (fields.dom !== '*' && fields.dom !== '?') {
    if (parsed.dom.length === 1) {
      descriptions.push(`on day ${parsed.dom[0]} of the month`);
    }
  }
  if (fields.dow !== '*' && fields.dow !== '?') {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    if (parsed.dow.length === 1) {
      descriptions.push(`on ${dayNames[parsed.dow[0]]}`);
    }
  }

  // Hour
  if (fields.hour !== '*') {
    if (parsed.hour.length === 1) {
      const h = parsed.hour[0];
      const timeStr = h === 0 ? 'midnight' : h <= 12 ? `${h} AM` : `${h - 12} PM`;
      descriptions.push(`at ${timeStr}`);
    } else {
      descriptions.push(`at hours ${parsed.hour.join(', ')}`);
    }
  }

  // Minute
  if (fields.minute !== '*') {
    if (parsed.minute.length === 1) {
      descriptions.push(`at minute ${parsed.minute[0]}`);
    } else {
      descriptions.push(`at minutes ${parsed.minute.join(', ')}`);
    }
  }

  // Second
  if (fields.second && fields.second !== '*') {
    if (parsed.minute.includes(0) || fields.minute === '0') {
      // Only add if not already covered
    }
    if (parsed.second.length === 1) {
      descriptions.push(`at second ${parsed.second[0]}`);
    }
  }

  if (descriptions.length === 0) {
    return 'Every minute';
  }

  return 'Every ' + descriptions.join(' ').replace(/^every every/i, 'every');
}

/**
 * Calculate the next N execution times from a cron expression
 */
export function getNextExecutions(expr, count = 5, from = new Date()) {
  const parsed = parseCronExpression(expr);
  const results = [];

  // Start from the next minute (or next second if 6-field)
  const hasSeconds = parsed.hasSeconds;
  let candidate = new Date(from);

  // Move to the next boundary
  if (hasSeconds) {
    candidate.setMilliseconds(0);
    candidate.setSeconds(candidate.getSeconds() + 1);
  } else {
    candidate.setSeconds(0);
    candidate.setMilliseconds(0);
    candidate.setMinutes(candidate.getMinutes() + 1);
  }

  // Safety limit to prevent infinite loops
  const maxIterations = 366 * 24 * 60 * (hasSeconds ? 60 : 1); // ~1 year of minutes (or seconds)
  let iterations = 0;

  while (results.length < count && iterations < maxIterations) {
    iterations++;

    const month = candidate.getMonth() + 1; // JS months are 0-indexed
    const dom = candidate.getDate();
    const dow = candidate.getDay();
    const hour = candidate.getHours();
    const minute = candidate.getMinutes();
    const second = candidate.getSeconds();

    // Check month
    if (!parsed.month.includes(month)) {
      // Skip to the next valid month
      const nextMonth = parsed.month.find(m => m > month);
      if (nextMonth !== undefined) {
        candidate.setMonth(nextMonth - 1);
        candidate.setDate(1);
      } else {
        // Wrap to next year
        candidate.setFullYear(candidate.getFullYear() + 1);
        candidate.setMonth(parsed.month[0] - 1);
        candidate.setDate(1);
      }
      candidate.setHours(0);
      candidate.setMinutes(0);
      candidate.setSeconds(0);
      continue;
    }

    // Check day of month
    if (!parsed.dom.includes(dom)) {
      candidate.setDate(dom + 1);
      candidate.setHours(0);
      candidate.setMinutes(0);
      candidate.setSeconds(0);
      continue;
    }

    // Check day of week
    if (!parsed.dow.includes(dow)) {
      candidate.setDate(dom + 1);
      candidate.setHours(0);
      candidate.setMinutes(0);
      candidate.setSeconds(0);
      continue;
    }

    // Check hour
    if (!parsed.hour.includes(hour)) {
      const nextHour = parsed.hour.find(h => h > hour);
      if (nextHour !== undefined) {
        candidate.setHours(nextHour);
      } else {
        candidate.setDate(dom + 1);
        candidate.setHours(parsed.hour[0]);
      }
      candidate.setMinutes(0);
      candidate.setSeconds(0);
      continue;
    }

    // Check minute
    if (!parsed.minute.includes(minute)) {
      const nextMinute = parsed.minute.find(m => m > minute);
      if (nextMinute !== undefined) {
        candidate.setMinutes(nextMinute);
      } else {
        // Advance to next hour
        const nextHr = parsed.hour.find(h => h > hour);
        if (nextHr !== undefined) {
          candidate.setHours(nextHr);
          candidate.setMinutes(parsed.minute[0]);
        } else {
          candidate.setDate(dom + 1);
          candidate.setHours(parsed.hour[0]);
          candidate.setMinutes(parsed.minute[0]);
        }
      }
      candidate.setSeconds(0);
      continue;
    }

    // Check second (if 6-field)
    if (hasSeconds && !parsed.second.includes(second)) {
      const nextSec = parsed.second.find(s => s > second);
      if (nextSec !== undefined) {
        candidate.setSeconds(nextSec);
      } else {
        // Advance to next minute
        const nextMin = parsed.minute.find(m => m > minute);
        if (nextMin !== undefined) {
          candidate.setMinutes(nextMin);
          candidate.setSeconds(parsed.second[0]);
        } else {
          const nextHr = parsed.hour.find(h => h > hour);
          if (nextHr !== undefined) {
            candidate.setHours(nextHr);
            candidate.setMinutes(parsed.minute[0]);
          } else {
            candidate.setDate(dom + 1);
            candidate.setHours(parsed.hour[0]);
            candidate.setMinutes(parsed.minute[0]);
          }
          candidate.setSeconds(parsed.second[0]);
        }
      }
      continue;
    }

    // All fields match!
    results.push(new Date(candidate));

    // Advance
    if (hasSeconds) {
      candidate.setSeconds(second + 1);
    } else {
      candidate.setMinutes(minute + 1);
    }
  }

  return results;
}

/**
 * Get common cron expression examples
 */
export function getCronExamples() {
  return [
    { expr: '* * * * *', desc: 'Every minute' },
    { expr: '*/5 * * * *', desc: 'Every 5 minutes' },
    { expr: '0 * * * *', desc: 'Every hour (at minute 0)' },
    { expr: '0 0 * * *', desc: 'Every day at midnight' },
    { expr: '0 9 * * 1-5', desc: 'Weekdays at 9:00 AM' },
    { expr: '0 0 1 * *', desc: '1st of every month at midnight' },
    { expr: '*/10 9-17 * * 1-5', desc: 'Every 10 min, 9AM-5PM, weekdays' },
    { expr: '0 0 1 1 *', desc: 'Jan 1st at midnight (New Year)' },
    { expr: '0 0 * * 0', desc: 'Every Sunday at midnight' },
    { expr: '0 0 30 2 *', desc: 'Feb 30th... (won\'t match - good test!)' },
  ];
}
