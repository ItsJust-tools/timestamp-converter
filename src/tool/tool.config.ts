import type { ToolConfig, FeatureFlags } from '@itsjust/core';

const features: FeatureFlags = {
  export: true,
  autoSave: true,
  undoRedo: true,
  sidebar: true,
  statusBar: true,
  darkMode: true,
};

export const toolConfig: ToolConfig = {
  id: '1795208681',
  name: 'Timestamp Converter',
  category: 'Utility',
  version: '1.0.0',
  description:
    'Convert Unix timestamps to human-readable dates and back, with timezone selection and live ticking.',
  exportFormats: ['png', 'pdf', 'json', 'jpeg', 'webp'],
  features,
} as ToolConfig;

export const templateBaseVersion = '1.1.0';
export default toolConfig;
