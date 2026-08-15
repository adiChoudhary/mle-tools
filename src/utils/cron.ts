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
  let domField, dowField;

  if (parts.length === 6) {
    [second, minute, hour, domField, month, dowField] = parts;
    second = parseField(second, 0, 59, 'seconds');
  } else {
    [minute, hour, domField, month, dowField] = parts;
  }

  // Quartz-style '?' wildcard: means "no specific value" for dom/dow
  if (domField === '?') domField = '*';
  if (dowField === '?') dowField = '*';

  minute = parseField(minute, 0, 59, 'minutes');
  hour = parseField(hour, 0, 23, 'hours');
  dom = parseField(domField, 1, 31, 'day of month');
  month = parseField(month, 1, 12, 'months');
  dow = parseField(dowField, 0, 7, 'day of week'); // 0 and 7 both mean Sunday

  // Standard cron: dom/dow are OR-ed only when both are restricted
  const domRestricted = domField !== '*' && domField !== '?';
  const dowRestricted = dowField !== '*' && dowField !== '?';

  // Normalize: 7 -> 0 for Sunday
  if (dow.includes(7)) {
    const idx = dow.indexOf(7);
    dow.splice(idx, 1);
    if (!dow.includes(0)) dow.push(0);
    dow.sort((a, b) => a - b);
  }

  return { minute, hour, dom, month, dow, second, hasSeconds: parts.length === 6, domRestricted, dowRestricted };
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
 * Calculate the next N execution times from a cron expression.
 *
 * Uses standard cron day semantics: when BOTH day-of-month and day-of-week
 * are restricted, a day matches if EITHER field matches (OR, not AND).
 *
 * All date arithmetic is overflow-safe: the day is reset to 1 before any
 * explicit month change, so e.g. Jan 31 -> Feb never lands on March 2/3;
 * day increments use setDate(day+1), which JS Date rolls over correctly.
 */
export function getNextExecutions(expr, count = 5, from = new Date()) {
  const parsed = parseCronExpression(expr);
  const results = [];

  // Start from the next minute (or next second if 6-field)
  const hasSeconds = parsed.hasSeconds;
  const candidate = new Date(from.getTime());

  // Move to the next boundary
  if (hasSeconds) {
    candidate.setMilliseconds(0);
    candidate.setSeconds(candidate.getSeconds() + 1);
  } else {
    candidate.setSeconds(0);
    candidate.setMilliseconds(0);
    candidate.setMinutes(candidate.getMinutes() + 1);
  }

  // Standard cron: dom/dow are OR-ed when both are restricted
  const dayMatches = (d) => {
    const domOk = parsed.dom.includes(d.getDate());
    const dowOk = parsed.dow.includes(d.getDay());
    if (parsed.domRestricted && parsed.dowRestricted) return domOk || dowOk;
    if (parsed.domRestricted) return domOk;
    if (parsed.dowRestricted) return dowOk;
    return true;
  };

  // Advance to the start of the next day. setDate(N+1) is overflow-safe:
  // JS Date rolls Jan 31 + 1 onto Feb 1 (and leap years correctly).
  // (Only explicit month changes need the day reset to 1 first.)
  const advanceToNextDay = () => {
    candidate.setDate(candidate.getDate() + 1);
    candidate.setHours(0, 0, 0, 0);
  };

  // Safety limit to prevent infinite loops (~5 years of minutes)
  const maxIterations = 366 * 5 * 24 * 60;
  let iterations = 0;

  while (results.length < count && iterations < maxIterations) {
    iterations++;

    // Check month (advance month-by-month; day reset to 1 first — safe)
    const month = candidate.getMonth() + 1;
    if (!parsed.month.includes(month)) {
      candidate.setDate(1);
      candidate.setMonth(candidate.getMonth() + 1);
      candidate.setHours(0, 0, 0, 0);
      continue;
    }

    // Check day (dom/dow with standard OR semantics)
    if (!dayMatches(candidate)) {
      advanceToNextDay();
      continue;
    }

    // Check hour
    const hour = candidate.getHours();
    if (!parsed.hour.includes(hour)) {
      const nextHour = parsed.hour.find(h => h > hour);
      if (nextHour !== undefined) {
        candidate.setHours(nextHour, 0, 0, 0);
      } else {
        advanceToNextDay();
        candidate.setHours(parsed.hour[0], 0, 0, 0);
      }
      continue;
    }

    // Check minute
    const minute = candidate.getMinutes();
    if (!parsed.minute.includes(minute)) {
      const nextMinute = parsed.minute.find(m => m > minute);
      if (nextMinute !== undefined) {
        candidate.setMinutes(nextMinute, 0, 0);
      } else {
        // Roll into the next hour (setHours handles day rollover)
        candidate.setHours(candidate.getHours() + 1, parsed.minute[0], 0, 0);
      }
      continue;
    }

    // Check second (if 6-field)
    if (hasSeconds) {
      const second = candidate.getSeconds();
      if (!parsed.second.includes(second)) {
        const nextSecond = parsed.second.find(s => s > second);
        if (nextSecond !== undefined) {
          candidate.setSeconds(nextSecond, 0);
        } else {
          // Roll into the next minute (setMinutes handles hour/day rollover)
          candidate.setMinutes(candidate.getMinutes() + 1, parsed.second[0], 0);
        }
        continue;
      }
    }

    // All fields match!
    results.push(new Date(candidate.getTime()));

    // Advance to the next candidate boundary
    if (hasSeconds) {
      candidate.setSeconds(candidate.getSeconds() + 1, 0);
    } else {
      candidate.setMinutes(candidate.getMinutes() + 1, 0, 0);
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
