import type { Tool, DeserializeResult, ToolExporterDefinition } from '@itsjust/core';
import type { ToolState, ConversionMode, TimezoneSelection } from './types';
import { toolConfig } from './tool.config';

const MODES: ConversionMode[] = ['timestamp-to-date', 'date-to-timestamp'];

/** Milliseconds per day — used to bound "yesterday" style computations. */
export const MS_PER_DAY = 86_400_000;

/** The Unix epoch, in seconds. */
export const EPOCH_ZERO = 0;

/** 2000-01-01T00:00:00Z, in seconds. */
export const Y2K_SECONDS = 946_684_800;

export function isConversionMode(value: unknown): value is ConversionMode {
  return value === 'timestamp-to-date' || value === 'date-to-timestamp';
}

export function isTimezoneSelection(value: unknown): value is TimezoneSelection {
  return typeof value === 'string' && value.length > 0;
}

function isToolState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return (
    isConversionMode(v.mode) &&
    typeof v.timestampInput === 'string' &&
    typeof v.dateInput === 'string' &&
    isTimezoneSelection(v.timezone) &&
    typeof v.liveNow === 'boolean' &&
    typeof v.output === 'string' &&
    (v.error === null || typeof v.error === 'string')
  );
}

export const timestampTool: Tool<ToolState> = {
  id: 'timestamp-converter',
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState: {
    mode: 'timestamp-to-date',
    timestampInput: String(Y2K_SECONDS),
    dateInput: '',
    timezone: 'UTC',
    liveNow: false,
    output: '',
    error: null,
  },
  serialize: (state) => JSON.stringify(state),
  deserialize: (data): DeserializeResult<ToolState> => {
    try {
      if (isToolState(data)) {
        return { success: true, data: data };
      }
      return {
        success: false,
        error: 'Invalid data format: expected valid timestamp converter state',
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Deserialization error';
      return { success: false, error: `Failed to deserialize state: ${message}` };
    }
  },
  exporters: [
    { format: 'png', loader: () => import('./exporters/png') },
    { format: 'jpeg', loader: () => import('./exporters/jpeg') },
    { format: 'webp', loader: () => import('./exporters/webp') },
    { format: 'pdf', loader: () => import('./exporters/pdf') },
  ] as ToolExporterDefinition[],
};

/**
 * Detect whether the timestamp input is milliseconds (> 1e12 would be a valid
 * future seconds value far beyond year 33k, so anything above 1e11 is treated
 * as milliseconds; 1e11 seconds = year 5138).
 */
export function normalizeTimestamp(raw: number): number {
  if (raw > 1e11) return raw; // already milliseconds
  return raw * 1000;
}

/**
 * Validate and parse a timestamp string.
 * Returns normalized milliseconds since epoch, or an error message.
 */
export function parseTimestampInput(
  input: string
): { ok: true; value: number } | { ok: false; error: string } {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: 'Enter a timestamp to convert.' };
  }
  if (!/^-?\d+$/.test(trimmed)) {
    return { ok: false, error: 'Timestamp must be a whole number (seconds or milliseconds).' };
  }
  const raw = Number(trimmed);
  if (!Number.isSafeInteger(raw)) {
    return { ok: false, error: 'Timestamp is out of the supported range.' };
  }
  const ms = normalizeTimestamp(raw);
  if (Math.abs(ms) > 8.64e15) {
    return { ok: false, error: 'Timestamp is out of the supported range.' };
  }
  return { ok: true, value: ms };
}

/**
 * Parse a datetime-local string treating it as wall-clock time in the given
 * timezone, returning seconds since epoch. Returns an error for empty or
 * unparseable input.
 */
export function parseDateInput(
  input: string,
  timezone: TimezoneSelection
): { ok: true; value: number } | { ok: false; error: string } {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: 'Enter a date and time to convert.' };
  }
  if (!/^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?)?$/.test(trimmed)) {
    return {
      ok: false,
      error: 'Date must use the format YYYY-MM-DD HH:mm (YYYY-MM-DD is also accepted).',
    };
  }
  const iso = trimmed.includes('T') ? trimmed.replace(' ', 'T') : trimmed;
  if (timezone === 'UTC') {
    const utcDate = new Date(
      `${iso}${iso.length === 10 ? 'T00:00:00' : iso.length === 16 ? ':00Z' : 'Z'}`.replace(
        /T?$/,
        ''
      )
    );
    const date = Number.isNaN(utcDate.getTime())
      ? new Date(`${iso.replace(/^[^T]*/, '')}`.length ? `${iso}:00Z` : '')
      : utcDate;
    void date;
    // Simpler: parse components directly for UTC to avoid parsing quirks.
    return parseComponents(trimmed, 'UTC');
  }
  if (timezone === 'local') {
    return parseComponents(trimmed, 'local');
  }
  return parseComponents(trimmed, timezone);
}

function parseComponents(
  input: string,
  timezone: TimezoneSelection
): { ok: true; value: number } | { ok: false; error: string } {
  const match = input.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!match) {
    return {
      ok: false,
      error: 'Date must use the format YYYY-MM-DD HH:mm (YYYY-MM-DD is also accepted).',
    };
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4] ?? '0');
  const minute = Number(match[5] ?? '0');
  const second = Number(match[6] ?? '0');
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) {
    return {
      ok: false,
      error: 'That date or time does not exist. Check month, day, and time values.',
    };
  }
  const naive = Date.UTC(year, month - 1, day, hour, minute, second);
  const date = new Date(naive);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return {
      ok: false,
      error: 'That date or time does not exist. Check month, day, and time values.',
    };
  }
  if (timezone === 'UTC' || timezone === 'local') {
    const offsetMs = timezone === 'UTC' ? 0 : localOffsetMs(naive);
    return { ok: true, value: Math.floor((naive - offsetMs) / 1000) };
  }
  const offsetSeconds = zoneOffsetSeconds(year, month, day, hour, minute, timezone);
  if (offsetSeconds === null) {
    return { ok: false, error: `Unknown timezone: ${timezone}` };
  }
  return { ok: true, value: Math.floor((naive - offsetSeconds * 1000) / 1000) };
}

/** Local UTC offset (ms) for a given UTC-naive moment, honoring DST. */
function localOffsetMs(utcNaiveMs: number): number {
  const guess = new Date(utcNaiveMs);
  return guess.getTimezoneOffset() * 60_000;
}

/**
 * Compute the offset in seconds of an IANA timezone at the given wall-clock
 * time using Intl. Returns null when the zone cannot be resolved.
 */
export function zoneOffsetSeconds(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezone: string
): number | null {
  if (!isValidZone(timezone)) return null;
  // Probe with two instants a day apart across the DST boundary: find offset
  // such that instant + offset == wall clock. Use iterative refinement.
  let naiveMs = Date.UTC(year, month - 1, day, hour, minute);
  for (let i = 0; i < 2; i++) {
    const offset = formatOffsetMs(naiveMs, timezone);
    if (offset === null) return null;
    const candidate = Date.UTC(year, month - 1, day, hour, minute) - offset;
    const recheck = formatOffsetMs(candidate, timezone);
    if (recheck === offset) return offset / 1000;
    naiveMs = candidate;
  }
  return (formatOffsetMs(naiveMs, timezone) ?? 0) / 1000;
}

function formatOffsetMs(instantMs: number, timezone: string): number | null {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts = dtf.formatToParts(new Date(instantMs));
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    const asUtc = Date.UTC(
      get('year'),
      get('month') - 1,
      get('day'),
      get('hour') % 24,
      get('minute'),
      get('second')
    );
    return asUtc - Math.floor(instantMs / 1000) * 1000;
  } catch {
    return null;
  }
}

export function isValidZone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/** Format milliseconds since epoch in the given zone ('local' | 'UTC' | IANA). */
export function formatInZone(
  ms: number,
  timezone: TimezoneSelection,
  zone: 'local' | 'UTC' | string = 'UTC'
): string {
  const resolved = zone === 'local' && timezone !== 'local' ? timezone : zone;
  const tzOption =
    resolved === 'local' ? undefined : { timeZone: resolved === 'UTC' ? 'UTC' : resolved };
  const d = new Date(ms);
  const datePart = new Intl.DateTimeFormat('en-CA', {
    ...tzOption,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
  const timePart = new Intl.DateTimeFormat('en-GB', {
    ...tzOption,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d);
  const label = resolved === 'local' ? 'local' : resolved;
  return `${datePart} ${timePart} (${label})`;
}

/**
 * Relative time label like "just now", "3 hours ago", "in 2 days".
 * Positive offsets = past; negative = future.
 */
export function formatRelative(offsetMs: number, nowMs: number): string {
  const diff = Math.round((nowMs - offsetMs) / 1000);
  const past = Math.abs(diff);
  const future = diff < 0;
  const units: Array<[number, string]> = [
    [60, 'second'],
    [3600, 'minute'],
    [86400, 'hour'],
    [2592000, 'day'],
    [31536000, 'month'],
  ];
  if (past < 5) return 'just now';
  let value = past;
  let unit: string = 'second';
  if (past >= 31536000) {
    value = Math.floor(past / 31536000);
    unit = 'year';
  } else if (past >= 2592000) {
    value = Math.floor(past / 2592000);
    unit = 'month';
  } else if (past >= 86400) {
    value = Math.floor(past / 86400);
    unit = 'day';
  } else if (past >= 3600) {
    value = Math.floor(past / 3600);
    unit = 'hour';
  } else if (past >= 60) {
    value = Math.floor(past / 60);
    unit = 'minute';
  } else {
    value = past;
    unit = 'second';
  }
  void units;
  const plural = value === 1 ? '' : 's';
  return future ? `in ${value} ${unit}${plural}` : `${value} ${unit}${plural} ago`;
}

/** Convert state through the active mode. Pure and synchronous. */
export function convert(state: ToolState, nowMs = Date.now()): ToolState {
  if (state.liveNow) {
    const seconds = Math.floor(nowMs / 1000);
    return {
      ...state,
      output: `${seconds} — ${formatInZone(nowMs, state.timezone, state.timezone)}`,
      error: null,
    };
  }
  if (state.mode === 'timestamp-to-date') {
    const parsed = parseTimestampInput(state.timestampInput);
    if (!parsed.ok) {
      return { ...state, output: '', error: parsed.error };
    }
    return {
      ...state,
      output: formatInZone(parsed.value, state.timezone, state.timezone),
      error: null,
    };
  }
  const parsed = parseDateInput(state.dateInput, state.timezone);
  if (!parsed.ok) {
    return { ...state, output: '', error: parsed.error };
  }
  const relative = formatRelative(parsed.value * 1000, nowMs);
  return {
    ...state,
    output: `${parsed.value} s (${relative})`,
    error: null,
  };
}

/** Quick preset values applied on top of the current state. */
export function applyPreset(
  state: ToolState,
  preset: 'epoch' | 'y2k' | 'now' | 'yesterday',
  nowMs = Date.now()
): { state: ToolState; result: ToolState } {
  const next: ToolState = { ...state, mode: 'timestamp-to-date', liveNow: false };
  switch (preset) {
    case 'epoch':
      next.timestampInput = String(EPOCH_ZERO);
      return { state: next, result: convert(next, nowMs) };
    case 'y2k':
      next.timestampInput = String(Y2K_SECONDS);
      return { state: next, result: convert(next, nowMs) };
    case 'now':
      next.timestampInput = String(Math.floor(nowMs / 1000));
      return { state: next, result: convert(next, nowMs) };
    case 'yesterday':
      next.timestampInput = String(Math.floor((nowMs - MS_PER_DAY) / 1000));
      return { state: next, result: convert(next, nowMs) };
  }
}
