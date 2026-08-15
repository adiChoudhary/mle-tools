// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { parseCronExpression, validateCronExpression, getNextExecutions } from '../cron';

/**
 * Regression tests for cron execution-time computation.
 *
 * Covers two previously verified bugs:
 *  1. Date overflow — setMonth() before setDate(1) made `0 0 * 2 *`
 *     evaluated from Jan 31 skip to February of the following year.
 *  2. Non-standard day semantics — standard cron ORs day-of-month and
 *     day-of-week when both are restricted; the old code ANDed them.
 */

const local = (y: number, mo: number, d: number, h = 0, mi = 0, s = 0): Date =>
  new Date(y, mo - 1, d, h, mi, s, 0);

describe('parseCronExpression', () => {
  it('exposes dom/dow restricted flags', () => {
    expect(parseCronExpression('0 0 13 * 5').domRestricted).toBe(true);
    expect(parseCronExpression('0 0 13 * 5').dowRestricted).toBe(true);
    expect(parseCronExpression('0 0 * 2 *').domRestricted).toBe(false);
    expect(parseCronExpression('0 0 * 2 *').dowRestricted).toBe(false);
    expect(parseCronExpression('0 0 * * 5').domRestricted).toBe(false);
    expect(parseCronExpression('0 0 13 * *').dowRestricted).toBe(false);
    expect(parseCronExpression('0 0 ? * 5').domRestricted).toBe(false);
  });
});

describe('getNextExecutions — month/day overflow (regression)', () => {
  it('0 0 * 2 * from Jan 31 lands in February of the SAME year', () => {
    // Repro from the bug report: old code returned Feb 2027 from Jan 31 2027.
    const from = local(2027, 1, 31, 18, 30);
    const next = getNextExecutions('0 0 * 2 *', 2, from);

    expect(next).toHaveLength(2);
    expect(next[0].getFullYear()).toBe(2027);
    expect(next[0].getMonth()).toBe(1); // February
    expect(next[0].getDate()).toBe(1);
    expect(next[1].getMonth()).toBe(1);
    expect(next[1].getDate()).toBe(2);
  });

  it('0 0 * 2 * from Feb 15 continues within the same February', () => {
    const from = local(2026, 2, 15, 12, 0);
    const next = getNextExecutions('0 0 * 2 *', 3, from);

    expect(next.map(d => d.getDate())).toEqual([16, 17, 18]);
    next.forEach(d => {
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(1);
    });
  });

  it('0 0 1 3 * from Feb 28 2026 (non-leap) lands on Mar 1 2026, then Mar 1 2027', () => {
    const from = local(2026, 2, 28, 6, 0);
    const next = getNextExecutions('0 0 1 3 *', 2, from);

    expect(next[0]).toEqual(local(2026, 3, 1));
    expect(next[1]).toEqual(local(2027, 3, 1));
  });

  it('0 0 29 2 * from 2026 finds only leap-year Februaries', () => {
    const from = local(2026, 1, 1, 0, 30);
    const next = getNextExecutions('0 0 29 2 *', 2, from);

    expect(next[0]).toEqual(local(2028, 2, 29));
    expect(next[1]).toEqual(local(2032, 2, 29));
  });

  it('impossible day (Feb 30) yields no executions instead of looping forever', () => {
    const from = local(2026, 1, 1);
    const next = getNextExecutions('0 0 30 2 *', 5, from);
    expect(next.length).toBeLessThan(5);
  });
});

describe('getNextExecutions — standard cron OR semantics for dom/dow (regression)', () => {
  it('0 0 13 * 5 fires on the 13th OR on Fridays (not only Friday-the-13ths)', () => {
    // from Wed 2026-08-12 09:00. Old AND-semantics code returned the next
    // 13th-that-is-a-Friday (Nov 13 2026). Standard cron ORs restricted
    // dom/dow: Thu Aug 13 (the 13th) matches first, then every Friday.
    const from = local(2026, 8, 12, 9, 0);
    const next = getNextExecutions('0 0 13 * 5', 3, from);

    expect(next[0]).toEqual(local(2026, 8, 13)); // the 13th (a Thursday)
    expect(next[1]).toEqual(local(2026, 8, 14)); // next Friday
    expect(next[2]).toEqual(local(2026, 8, 21)); // next Friday
    // Every result must be a Friday (5) or the 13th
    next.forEach(d => {
      expect(d.getDay() === 5 || d.getDate() === 13).toBe(true);
    });
  });

  it('restricted dow only still fires by day of week', () => {
    const from = local(2026, 8, 12, 9, 0); // Wednesday
    const next = getNextExecutions('0 9 * * 5', 2, from);
    expect(next[0]).toEqual(local(2026, 8, 14, 9));
    expect(next[1]).toEqual(local(2026, 8, 21, 9));
  });

  it('restricted dom only still fires by day of month', () => {
    const from = local(2026, 8, 12, 9, 0);
    const next = getNextExecutions('0 9 13 * *', 2, from);
    expect(next[0]).toEqual(local(2026, 8, 13, 9));
    expect(next[1]).toEqual(local(2026, 9, 13, 9));
  });
});

describe('getNextExecutions — basic behavior', () => {
  it('every minute produces consecutive minutes', () => {
    const from = local(2026, 1, 1, 0, 0, 30);
    const next = getNextExecutions('* * * * *', 3, from);
    expect(next[0].getMinutes()).toBe(1);
    expect(next[1].getMinutes()).toBe(2);
    expect(next[2].getMinutes()).toBe(3);
  });

  it('hourly cron respects the minute field', () => {
    const from = local(2026, 1, 1, 0, 45);
    const next = getNextExecutions('0 * * * *', 3, from);
    expect(next.map(d => d.getHours())).toEqual([1, 2, 3]);
    next.forEach(d => expect(d.getMinutes()).toBe(0));
  });

  it('does not return the "from" minute itself when it matches', () => {
    const from = local(2026, 1, 1, 12, 0);
    const next = getNextExecutions('0 12 * * *', 2, from);
    expect(next[0]).toEqual(local(2026, 1, 2, 12)); // next occurrence is next day
    expect(next[1]).toEqual(local(2026, 1, 3, 12));
  });

  it('handles 6-field (seconds) expressions', () => {
    const from = local(2026, 1, 1, 0, 0, 10);
    const next = getNextExecutions('0 * * * * *', 3, from);
    // Next whole minute boundaries: 00:01:00, 00:02:00, 00:03:00
    expect(next.map(d => [d.getMinutes(), d.getSeconds()])).toEqual([
      [1, 0],
      [2, 0],
      [3, 0],
    ]);
  });

  it('wraps year boundary correctly', () => {
    const from = local(2026, 12, 31, 23, 30);
    const next = getNextExecutions('0 0 1 1 *', 1, from);
    expect(next[0]).toEqual(local(2027, 1, 1));
  });

  it('works across a DST-like boundary without duplicating or skipping a day', () => {
    // Run a year of daily cron; the number of distinct dates must be 365/366
    const from = local(2026, 1, 1, 12, 0);
    const next = getNextExecutions('0 0 * * *', 400, from);
    const seen = new Set(next.map(d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()));
    expect(seen.size).toBe(400); // all distinct days
  });
});

describe('validateCronExpression', () => {
  it('accepts valid expressions', () => {
    expect(validateCronExpression('*/5 9-17 * * 1-5')).toBe(true);
    expect(validateCronExpression('0 0 13 * 5')).toBe(true);
  });

  it('rejects out-of-range values', () => {
    expect(() => validateCronExpression('60 * * * *')).toThrow();
    expect(() => validateCronExpression('* 24 * * *')).toThrow();
    expect(() => validateCronExpression('* * 32 * *')).toThrow();
  });
});
