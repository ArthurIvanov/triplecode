import type { Preview } from '@storybook/react';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '../media/tokens.css';
import '../media/workbench.css';

const preview: Preview = {
  decorators: [
    Story => (
      <div className="monaco-workbench" style={{ minHeight: '100vh', background: 'var(--vscode-editor-background)' }}>
        <Story />
      </div>
    )
  ],
  parameters: {
    layout: 'fullscreen'
  }
};

export default preview;
