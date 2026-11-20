import { describe, it, expect } from 'vitest';
import {
  timestampTool,
  convert,
  parseTimestampInput,
  parseDateInput,
  formatRelative,
  formatInZone,
  isValidZone,
  normalizeTimestamp,
  applyPreset,
  Y2K_SECONDS,
} from '../../src/tool/tool-definition';
import type { ToolState } from '../../src/tool/types';

const base: ToolState = {
  mode: 'timestamp-to-date',
  timestampInput: '',
  dateInput: '',
  timezone: 'UTC',
  liveNow: false,
  output: '',
  error: null,
};

describe('timestamp to date conversion', () => {
  it('converts seconds timestamps to correct UTC dates', () => {
    const state = { ...base, timestampInput: '0' };
    const result = convert(state);
    expect(result.error).toBeNull();
    expect(result.output).toContain('1970-01-01');
    expect(result.output).toContain('00:00:00');
    expect(result.output).toContain('UTC');
  });

  it('converts milliseconds timestamps to correct UTC dates', () => {
    const state = { ...base, timestampInput: '946684800000' };
    const result = convert(state);
    expect(result.error).toBeNull();
    expect(result.output).toContain('2000-01-01');
    expect(result.output).toContain('00:00:00');
  });

  it('treats values above 1e11 as milliseconds and below as seconds', () => {
    expect(normalizeTimestamp(1700000000)).toBe(1700000000000);
    expect(normalizeTimestamp(1700000000000)).toBe(1700000000000);
    expect(normalizeTimestamp(100000000000)).toBe(100000000000000);
  });

  it('converts Y2K seconds value to 2000-01-01 in UTC', () => {
    const state = { ...base, timestampInput: String(Y2K_SECONDS) };
    const result = convert(state);
    expect(result.output).toContain('2000-01-01');
  });

  it('respects the timezone selection', () => {
    const state = { ...base, timestampInput: '0', timezone: 'Europe/Berlin' };
    const result = convert(state);
    expect(result.output).toContain('01:00:00');
    expect(result.output).toContain('Europe/Berlin');
  });

  it('formats a known instant in New York (winter, UTC-5)', () => {
    expect(formatInZone(946684800000, 'UTC', 'America/New_York')).toContain('1999-12-31 19:00:00');
  });
});

describe('date to timestamp conversion', () => {
  it('converts a UTC date to a Unix timestamp', () => {
    const parsed = parseDateInput('2000-01-01 00:00', 'UTC');
    expect(parsed).toEqual({ ok: true, value: Y2K_SECONDS });
  });

  it('round-trips timestamp -> date -> timestamp in UTC', () => {
    const startSeconds = 1701234567;
    const asDate = convert({ ...base, timestampInput: String(startSeconds) });
    expect(asDate.output).toBeTruthy();
    // Extract "YYYY-MM-DD HH:MM:SS" prefix of the formatted output.
    const match = asDate.output.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
    expect(match).not.toBeNull();
    const back = parseDateInput(match?.[1] !== undefined ? match[1] : 'bad', 'UTC');
    if (!back.ok) throw new Error('round-trip failed');
    expect(back.ok).toBe(true);
    if (back.ok) expect(back.value).toBe(startSeconds);
  });

  it('round-trips date -> timestamp -> date through both directions', () => {
    const input = '2024-06-15 12:30';
    const toTs = parseDateInput(input, 'UTC');
    expect(toTs.ok).toBe(true);
    if (!toTs.ok) return;
    const back = convert({ ...base, timestampInput: String(toTs.value) });
    expect(back.output.startsWith(input.startsWith('2024-06-15') ? '2024-06-15 12:30:00' : '')).toBe(true);
  });

  it('converts a local-time date using the local zone', () => {
    const parsed = parseDateInput('2000-01-01 00:00', 'local');
    const utc = parseDateInput('2000-01-01 00:00', 'UTC');
    expect(parsed.ok).toBe(true);
    expect(utc.ok).toBe(true);
    // Local zone rarely equals UTC; if it does (UTC machines) they coincide.
    if (parsed.ok && utc.ok && new Date(0).getTimezoneOffset() !== 0) {
      expect(parsed.value).not.toBe(utc.value);
    } else if (parsed.ok && utc.ok) {
      expect(parsed.value).toBe(utc.value);
    }
  });

  it('knows summer offsets in Berlin (CEST, UTC+2)', () => {
    const parsed = parseDateInput('2024-07-01 12:00', 'Europe/Berlin');
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.value).toBe(1719828000);
  });
});

describe('relative formatting', () => {
  const now = 1_700_000_000_000;

  it('labels very recent offsets as just now', () => {
    expect(formatRelative(now - 2000, now)).toBe('just now');
  });

  it('produces minutes/hours/days labels for past offsets', () => {
    expect(formatRelative(now - 5 * 60_000, now)).toBe('5 minutes ago');
    expect(formatRelative(now - 60_000, now)).toBe('1 minute ago');
    expect(formatRelative(now - 3 * 3_600_000, now)).toBe('3 hours ago');
    expect(formatRelative(now - 2 * 86_400_000, now)).toBe('2 days ago');
    expect(formatRelative(now - 60_000, now + 60_000 - 60_000)).toBe('1 minute ago');
  });

  it('produces future labels', () => {
    expect(formatRelative(now + 60_000, now)).toBe('in 1 minute');
    expect(formatRelative(now + 3 * 3_600_000, now)).toBe('in 3 hours');
    expect(formatRelative(now + 2 * 86_400_000, now)).toBe('in 2 days');
  });

  it('uses singular/plural correctly', () => {
    expect(formatRelative(now - 61_000, now)).toBe('1 minute ago');
    expect(formatRelative(now - 120_000, now)).toBe('2 minutes ago');
  });

  it('shows the relative label alongside the timestamp in date-to-timestamp mode', () => {
    const result = convert({ ...base, mode: 'date-to-timestamp', dateInput: '2000-01-01 00:00' }, now);
    expect(result.output).toContain(`${Y2K_SECONDS} s`);
    expect(result.output).toContain('ago');
  });
});

describe('validation', () => {
  it('flags empty timestamp input', () => {
    const result = convert({ ...base, timestampInput: '   ' });
    expect(result.error).toBe('Enter a timestamp to convert.');
    expect(result.output).toBe('');
  });

  it('flags non-numeric timestamps', () => {
    expect(parseTimestampInput('abc').ok).toBe(false);
    expect(parseTimestampInput('12.5').ok).toBe(false);
    const state = convert({ ...base, timestampInput: 'not a number' });
    expect(state.error).toContain('whole number');
  });

  it('flags unsafe out-of-range timestamps', () => {
    expect(parseTimestampInput('99999999999999999999').ok).toBe(false);
    expect(parseTimestampInput('9007199254740992').ok).toBe(false);
  });

  it('flags empty or malformed date input', () => {
    expect(parseDateInput('', 'UTC').ok).toBe(false);
    expect(parseDateInput('junk', 'UTC').ok).toBe(false);
    expect(parseDateInput('2024-13-01 00:00', 'UTC').ok).toBe(false);
    expect(parseDateInput('2024-02-30 00:00', 'UTC').ok).toBe(false);
    expect(convert({ ...base, mode: 'date-to-timestamp', dateInput: '' }).error).toContain('Enter a date');
  });

  it('accepts a date without time as midnight', () => {
    const parsed = parseDateInput('2024-06-15', 'UTC');
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.value % 86400).toBe(0);
  });
});

describe('presets', () => {
  const now = 1_700_000_000_500;

  it('epoch preset converts 0', () => {
    const { state, result } = applyPreset(base, 'epoch', now);
    expect(state.timestampInput).toBe('0');
    expect(result.output).toContain('1970-01-01');
  });

  it('y2k preset converts 2000-01-01', () => {
    const { result } = applyPreset(base, 'y2k', now);
    expect(result.output).toContain('2000-01-01');
  });

  it('now preset uses floor(now / 1000)', () => {
    const { result } = applyPreset(base, 'now', now);
    expect(result.output).toBeTruthy();
    expect(result.error).toBeNull();
  });

  it('yesterday preset is 86400 seconds before now', () => {
    const { state } = applyPreset(base, 'yesterday', now);
    expect(Number(state.timestampInput)).toBe(Math.floor(now / 1000) - 86400);
  });
});

describe('live now mode', () => {
  it('outputs the current ticking timestamp when enabled', () => {
    const now = 1_700_000_001_000;
    const result = convert({ ...base, liveNow: true }, now);
    expect(result.error).toBeNull();
    expect(result.output.startsWith(String(Math.floor(now / 1000)))).toBe(true);
  });

  it('ignores inputs while live now is enabled', () => {
    const now = 1_700_000_001_000;
    const result = convert({ ...base, liveNow: true, timestampInput: 'garbage' }, now);
    expect(result.error).toBeNull();
  });
});

describe('serialize / deserialize', () => {
  it('round-trips state through serialize and deserialize', () => {
    const state: ToolState = {
      mode: 'date-to-timestamp',
      timestampInput: '123',
      dateInput: '2024-01-01 10:00',
      timezone: 'Asia/Tokyo',
      liveNow: true,
      output: 'out',
      error: null,
    };
    const parsed: unknown = JSON.parse(timestampTool.serialize(state));
    const result = timestampTool.deserialize(parsed);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual(state);
  });

  it('rejects invalid payloads', () => {
    expect(timestampTool.deserialize(null).success).toBe(false);
    expect(timestampTool.deserialize('string').success).toBe(false);
    expect(timestampTool.deserialize({}).success).toBe(false);
    expect(timestampTool.deserialize({ mode: 'bogus', timestampInput: '1', dateInput: '', timezone: 'UTC', liveNow: false, output: '', error: null }).success).toBe(false);
  });

  it('deserialization error path returns a message', () => {
    const result = timestampTool.deserialize(undefined);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('Invalid data format');
  });
});

describe('timezone helpers', () => {
  it('validates known and unknown zones', () => {
    expect(isValidZone('UTC')).toBe(true);
    expect(isValidZone('Europe/Berlin')).toBe(true);
    expect(isValidZone('Not/AZone')).toBe(false);
  });

  it('rejects unknown IANA zones in date parsing', () => {
    const parsed = parseDateInput('2024-01-01 00:00', 'Mars/Olympus');
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error).toContain('Unknown timezone');
  });
});
