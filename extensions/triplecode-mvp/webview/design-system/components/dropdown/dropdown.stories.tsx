import type { Meta, StoryObj } from '@storybook/react-vite';
import { Dropdown } from '.';
import { DropdownPreview } from './dropdown.preview';
import { ActionButton, ActionButtonIcon } from '../action-button';
import { DropdownItem } from '.';
import './dropdown.css';
import './dropdown.preview.css';

const meta = {
  title: 'Design System/Dropdown',
  component: Dropdown,
  args: {
    trigger: <ActionButton text="Dropdown button" />,
    children: <DropdownItem text="Item" />
  },
  parameters: { layout: 'padded' }
} satisfies Meta<typeof Dropdown>;

export default meta;

export const Playground: StoryObj<typeof meta> = {};

export const Variants: StoryObj<typeof meta> = {
  render: () => <DropdownPreview />,
  parameters: { controls: { disable: true } }
};

export const WithIcons: StoryObj<typeof meta> = {
  render: () => (
    <Dropdown
      trigger={
        <ActionButton
          text="Actions"
          start={<ActionButtonIcon href="/figma-assets/imgFolder.svg" dimension={14} />}
          end={<ActionButtonIcon href="/figma-assets/dropdown/chevron-down.svg" dimension={14} />}
        />
      }
    >
      <DropdownItem text="New file" start={<ActionButtonIcon href="/figma-assets/imgFiles.svg" dimension={16} />} />
      <DropdownItem text="Search" start={<ActionButtonIcon href="/figma-assets/imgSearch.svg" dimension={16} />} />
      <DropdownItem type="divider" />
      <DropdownItem text="Delete" disabled />
    </Dropdown>
  ),
  parameters: { controls: { disable: true } }
};
