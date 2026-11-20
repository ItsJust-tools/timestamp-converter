'use client';

import React from 'react';
import type { ToolState } from '../types';
import { applyPreset } from '../tool-definition';

interface ToolbarProps {
  state: ToolState;
  onChange: (state: ToolState) => void;
  onClear: () => void;
}

const PRESETS: Array<{ id: 'epoch' | 'y2k' | 'now' | 'yesterday'; label: string }> = [
  { id: 'epoch', label: 'Epoch 0' },
  { id: 'y2k', label: 'Y2K' },
  { id: 'now', label: 'Now' },
  { id: 'yesterday', label: 'Yesterday' },
];

export const Toolbar: React.FC<ToolbarProps> = ({ state, onChange, onClear }) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-2" data-testid="preset-buttons">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onChange(applyPreset(state, preset.id).result)}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            {preset.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onClear}
        className="px-3 py-1.5 text-xs font-medium rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
      >
        Clear
      </button>
    </div>
  );
};
