import type { Meta, StoryObj } from '@storybook/react-vite';
import { ActivityBarPreview } from './activity-bar.preview';
import '../action-button/action-button.css';
import './activity-bar.css';

const meta = {
  title: 'Design System/ActivityBar',
  component: ActivityBarPreview,
  parameters: { layout: 'padded' }
} satisfies Meta<typeof ActivityBarPreview>;

export default meta;
export const Default: StoryObj<typeof meta> = {};
