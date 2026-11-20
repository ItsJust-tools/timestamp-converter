'use client';

import React, { useEffect, useState } from 'react';
import type { ToolState, ConversionMode, TimezoneSelection } from '../types';
import { convert } from '../tool-definition';

const TIMEZONES: Array<{ value: TimezoneSelection; label: string }> = [
  { value: 'local', label: 'Local' },
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'New York' },
  { value: 'America/Los_Angeles', label: 'Los Angeles' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Australia/Sydney', label: 'Sydney' },
];

interface CanvasProps {
  state: ToolState;
  onChange: (state: ToolState) => void;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <button
      type="button"
      data-testid="copy-button"
      onClick={() => {
        void navigator.clipboard?.writeText(value);
        setCopied(true);
      }}
      className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function useNow(live: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [live]);
  return now;
}

export const Canvas: React.FC<CanvasProps> = ({ state, onChange }) => {
  const now = useNow(state.liveNow);
  const view = state.liveNow || state.output ? convert(state, now) : state;
  const seconds = Math.floor(now / 1000);

  const setMode = (mode: ConversionMode) => onChange({ ...state, mode });
  const setZone = (timezone: TimezoneSelection) => onChange({ ...state, timezone });

  return (
    <div className="grid grid-cols-1 gap-4 p-4 overflow-auto" data-testid="timestamp-canvas">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-testid="mode-ts-to-date"
          onClick={() => setMode('timestamp-to-date')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md ${
            state.mode === 'timestamp-to-date'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
          }`}
        >
          Timestamp → Date
        </button>
        <button
          type="button"
          data-testid="mode-date-to-ts"
          onClick={() => setMode('date-to-timestamp')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md ${
            state.mode === 'date-to-timestamp'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
          }`}
        >
          Date → Timestamp
        </button>
        <label className="ml-auto flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            data-testid="live-now-toggle"
            checked={state.liveNow}
            onChange={(e) => onChange({ ...state, liveNow: e.target.checked })}
          />
          Live now
        </label>
        <select
          aria-label="Timezone"
          data-testid="timezone-select"
          value={state.timezone}
          onChange={(e) => setZone(e.target.value as TimezoneSelection)}
          className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>

      {state.liveNow ? (
        <div className="rounded-md border border-indigo-300 dark:border-indigo-700 p-4" data-testid="live-now-panel">
          <div className="text-xs uppercase tracking-wider text-gray-500">Current Unix timestamp</div>
          <div className="text-3xl font-mono font-semibold">{seconds}</div>
          <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">{view.output.split('—')[1]}</div>
          <div className="mt-2">
            <CopyButton value={String(seconds)} />
          </div>
        </div>
      ) : state.mode === 'timestamp-to-date' ? (
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider mb-1">Unix timestamp</label>
          <input
            type="text"
            data-testid="timestamp-input"
            value={state.timestampInput}
            onChange={(e) => onChange({ ...state, timestampInput: e.target.value })}
            placeholder="e.g. 1700000000"
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="mt-3">
            <label className="block text-xs font-medium uppercase tracking-wider mb-1">Result</label>
            <div className="flex items-center justify-between gap-2 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3">
              <span className="font-mono text-sm" data-testid="timestamp-output">
                {view.output || '—'}
              </span>
              {view.output && <CopyButton value={view.output} />}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider mb-1">Date and time</label>
          <input
            type="text"
            data-testid="date-input"
            value={state.dateInput}
            onChange={(e) => onChange({ ...state, dateInput: e.target.value })}
            placeholder="YYYY-MM-DD HH:mm"
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="mt-3">
            <label className="block text-xs font-medium uppercase tracking-wider mb-1">Result</label>
            <div className="flex items-center justify-between gap-2 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3">
              <span className="font-mono text-sm" data-testid="date-output">
                {view.output || '—'}
              </span>
              {view.output && <CopyButton value={view.output} />}
            </div>
          </div>
        </div>
      )}

      {view.error && (
        <div
          role="alert"
          data-testid="error-message"
          className="bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-3 py-2 rounded text-xs"
        >
          {view.error}
        </div>
      )}
    </div>
  );
};
