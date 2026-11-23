import { describe, it, expect } from 'vitest';
import { shellTool } from '@/tool/notepad-state';
import { timestampTool } from '@/tool/tool-definition';
import type { ToolState } from '@/tool/types';

describe('shell tool logic', () => {
  it('initializes with empty inputs', () => {
    expect(shellTool.initialState.timestampInput).toBe('');
    expect(shellTool.initialState.dateInput).toBe('');
    expect(shellTool.initialState.liveNow).toBe(false);
  });

  it('updates state immutably', () => {
    const state = { ...shellTool.initialState, timestampInput: '42' };
    expect(state.timestampInput).toBe('42');
    expect(shellTool.initialState.timestampInput).toBe('');
  });
});

describe('shell deserialize (lenient)', () => {
  it('accepts a valid payload and fills defaults', () => {
    const result = shellTool.deserialize({
      mode: 'timestamp-to-date',
      timestampInput: '10',
      dateInput: '2020-01-01 00:00',
      timezone: 'Nowhere/Now',
      liveNow: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.timezone).toBe('Nowhere/Now'); // lenient: non-empty strings are kept
      expect(result.data.timestampInput).toBe('10');
      expect(result.data.liveNow).toBe(true);
    }
  });

  it('rejects null data', () => {
    expect(shellTool.deserialize(null).success).toBe(false);
  });

  it('rejects non-object data', () => {
    expect(shellTool.deserialize('string').success).toBe(false);
  });

  it('rejects object without required fields', () => {
    expect(shellTool.deserialize({ title: 'No content' }).success).toBe(false);
  });

  it('rejects object with non-string fields', () => {
    expect(shellTool.deserialize({ mode: 'x', timestampInput: 123, dateInput: '' }).success).toBe(
      false
    );
  });

  it('round-trips state through serialize/deserialize', () => {
    const state: ToolState = {
      mode: 'date-to-timestamp',
      timestampInput: '1',
      dateInput: '2024-05-05 05:05',
      timezone: 'Asia/Tokyo',
      liveNow: false,
      output: 'x',
      error: null,
    };
    const json = shellTool.serialize(state);
    expect(() => JSON.parse(json)).not.toThrow();
    const result = shellTool.deserialize(JSON.parse(json));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual(state);
  });

  it('keeps strict tool def and lenient shell def in sync on exporters', () => {
    expect(timestampTool.exporters).toHaveLength(4);
    expect(shellTool.exporters).toHaveLength(4);
  });
});
