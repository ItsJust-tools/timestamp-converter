'use client';

import React from 'react';
import type { ToolState } from '../types';

interface SidebarProps {
  state: ToolState;
  onChange: (state: ToolState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ state, onChange }) => {
  return (
    <div
      className="p-4 space-y-6 text-sm border-r h-full overflow-y-auto"
      data-testid="timestamp-sidebar"
    >
      <div>
        <h3 className="font-medium mb-2">Format</h3>
        <label className="flex items-center justify-between text-xs">
          <span>Live now mode</span>
          <input
            type="checkbox"
            data-testid="sidebar-live-toggle"
            checked={state.liveNow}
            onChange={(e) => onChange({ ...state, liveNow: e.target.checked })}
          />
        </label>
      </div>
      <div>
        <h3 className="font-medium mb-2">Tips</h3>
        <ul className="list-disc pl-4 space-y-1 text-xs text-gray-600 dark:text-gray-400">
          <li>Timestamps above 1e11 are treated as milliseconds.</li>
          <li>Date input format: YYYY-MM-DD HH:mm.</li>
          <li>Presets fill in epoch 0, Y2K, now, and yesterday.</li>
        </ul>
      </div>
    </div>
  );
};
