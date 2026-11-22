import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../webview/stories/*.stories.tsx', '../webview/design-system/components/**/*.stories.tsx'],
  addons: [],
  framework: {
    name: '@storybook/react-vite',
    options: {}
  },
  staticDirs: ['../media']
};

export default config;
