import type { Meta, StoryObj } from '@storybook/react-vite';
import { Accordion } from '.';
import { AccordionPreview } from './accordion.preview';
import { ActionButtonIcon } from '../action-button';
import './accordion.css';
import './accordion.preview.css';

const meta = {
  title: 'Design System/Accordion',
  component: Accordion,
  args: {
    title: 'Accordion title',
    children: <p>Nested content.</p>
  },
  parameters: { layout: 'padded' }
} satisfies Meta<typeof Accordion>;

export default meta;

export const Playground: StoryObj<typeof meta> = {
  args: { defaultExpanded: true }
};

export const Variants: StoryObj<typeof meta> = {
  render: () => <AccordionPreview />,
  parameters: { controls: { disable: true } }
};

export const WithSlots: StoryObj<typeof meta> = {
  render: () => (
    <Accordion
      title="With slots"
      defaultExpanded
      end={<ActionButtonIcon href="/figma-assets/imgFolder.svg" dimension={16} />}
    >
      <p>End slot is 32×24 in Figma.</p>
    </Accordion>
  ),
  parameters: { controls: { disable: true } }
};
