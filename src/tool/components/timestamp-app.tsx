'use client';

import React, { useCallback } from 'react';
import { timestampTool } from '../tool-definition';
import type { ToolState } from '../types';
import { Canvas } from './Canvas';
import { Toolbar } from './Toolbar';
import { Sidebar } from './Sidebar';

export function TimestampConverterApp() {
  const [state, setState] = React.useState<ToolState>(timestampTool.initialState);

  const handleClear = useCallback(() => {
    setState({ ...timestampTool.initialState, timestampInput: '', dateInput: '', output: '', error: null });
  }, []);

  return (
    <div className="flex h-screen flex-col" data-testid="timestamp-converter-app">
      <Toolbar state={state} onChange={setState} onClear={handleClear} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar state={state} onChange={setState} />
        <div className="flex-1 overflow-auto">
          <Canvas state={state} onChange={setState} />
        </div>
      </div>
    </div>
  );
}
