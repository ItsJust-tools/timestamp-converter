import type { Tool, DeserializeResult, ToolExporterDefinition } from '@itsjust/core';
import type { ToolState } from './types';
import { toolConfig } from './tool.config';

/**
 * Standalone tool definition used by the app shell (useTool) for persistence,
 * sharing and export. Mirrors `timestampTool` from tool-definition.ts.
 */
export const shellTool: Tool<ToolState> = {
  id: 'timestamp-converter',
  name: 'Timestamp Converter',
  version: '1.0.0',
  config: toolConfig,
  initialState: {
    mode: 'timestamp-to-date',
    timestampInput: '',
    dateInput: '',
    timezone: 'UTC',
    liveNow: false,
    output: '',
    error: null,
  },
  serialize: (state) => JSON.stringify(state),
  deserialize: (data): DeserializeResult<ToolState> => {
    try {
      if (typeof data === 'object' && data !== null) {
        const v = data as Partial<ToolState>;
        if (
          typeof v.mode === 'string' &&
          typeof v.timestampInput === 'string' &&
          typeof v.dateInput === 'string'
        ) {
          return {
            success: true,
            data: {
              mode: v.mode === 'date-to-timestamp' ? 'date-to-timestamp' : 'timestamp-to-date',
              timestampInput: v.timestampInput,
              dateInput: v.dateInput,
              timezone: typeof v.timezone === 'string' && v.timezone ? v.timezone : 'UTC',
              liveNow: v.liveNow === true,
              output: typeof v.output === 'string' ? v.output : '',
              error: typeof v.error === 'string' ? v.error : null,
            },
          };
        }
      }
      return { success: false, error: 'Invalid data format: expected { mode, timestampInput, dateInput, ... }' };
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
