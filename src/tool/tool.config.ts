import type { ToolConfig } from '@itsjust/core';

export const toolConfig: ToolConfig = {
  id: '1795208681',
  name: 'Timestamp Converter',
  category: 'Utility',
  version: '1.0.0',
  description:
    'Convert Unix timestamps to human-readable dates and back, with timezone selection and live ticking.',
  exportFormats: ['png', 'pdf', 'json', 'jpeg', 'webp'],
  features: {
    export: true,
    autoSave: true,
    undoRedo: true,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    accent: '#3b82f6',
    accentHover: '#2563eb',
    accentSubtle: 'rgba(59, 130, 246, 0.08)',
    brand: 'Timestamp Converter',
    icon: '\u{1F557}',
  },
} as ToolConfig;

export const templateBaseVersion = '1.1.0';
export default toolConfig;
