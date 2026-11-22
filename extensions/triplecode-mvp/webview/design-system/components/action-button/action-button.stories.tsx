import type { Meta, StoryObj } from '@storybook/react-vite';
import { ActionButton } from '.';
import { ActionButtonPreview } from './action-button.preview';
import './action-button.css';
import './action-button.preview.css';

const meta = {
  title: 'Design System/ActionButton',
  component: ActionButton,
  args: { text: 'Action' },
  parameters: { layout: 'padded' }
} satisfies Meta<typeof ActionButton>;

export default meta;

export const Playground: StoryObj<typeof meta> = {};
export const Variants: StoryObj<typeof meta> = {
  render: () => <ActionButtonPreview />,
  parameters: { controls: { disable: true } }
};
