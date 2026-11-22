import type { Preview } from '@storybook/react';
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
