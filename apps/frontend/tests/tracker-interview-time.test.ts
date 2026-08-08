import { describe, expect, it } from 'vitest';
import { dateTimeLocalToIso, toDateTimeLocalValue } from '@/components/tracker/card-detail-modal';

describe('tracker interview time conversion', () => {
  it('round-trips an ISO instant through a datetime-local value', () => {
    const original = '2026-08-08T06:30:00.000Z';
    const localValue = toDateTimeLocalValue(original);

    expect(localValue).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(dateTimeLocalToIso(localValue)).toBe(original);
  });

  it('returns an empty value for absent or invalid timestamps', () => {
    expect(toDateTimeLocalValue(null)).toBe('');
    expect(toDateTimeLocalValue('not-a-date')).toBe('');
  });
});
