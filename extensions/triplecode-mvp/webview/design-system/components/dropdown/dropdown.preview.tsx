import type { ReactNode } from 'react';
import { ActionButton, ActionButtonIcon } from '../action-button';
import { Dropdown, DropdownItem, type DropdownItemSize, type DropdownPlacement } from '.';

function icon(media: string, name: string, dimension = 16) {
  return <ActionButtonIcon href={`${media}/figma-assets/${name}`} dimension={dimension} />;
}

function DropdownDemoTrigger({ media, iconOnly = false, text = 'Dropdown button' }: {
  media: string;
  iconOnly?: boolean;
  text?: string;
}) {
  const start = icon(media, 'imgFolder.svg', 14);
  const end = icon(media, 'dropdown/chevron-down.svg', 14);
  if (iconOnly) {
    return <ActionButton size="base" rounding="full" variant="ghost" text={null} aria-label="Dropdown actions" start={start} />;
  }
  return <ActionButton size="base" rounding="full" variant="ghost" text={text} start={start} end={end} />;
}

function PlainTrigger({ children }: { children: ReactNode }) {
  return <button type="button" className="dropdown-preview__plain-trigger">{children}</button>;
}

export function DropdownPreview({ media = '' }: { media?: string }) {
  const placements: DropdownPlacement[] = ['bottom-left', 'bottom-center', 'bottom-right'];

  return (
    <div className="dropdown-preview">
      <div className="dropdown-preview__row">
        <Dropdown
          aria-label="File actions"
          trigger={<DropdownDemoTrigger media={media} />}
        >
          <DropdownItem type="headline" text="File" />
          <DropdownItem text="New file" start={icon(media, 'imgFiles.svg')} />
          <DropdownItem text="Clone repository" start={icon(media, 'imgGitBranch.svg')} />
          <DropdownItem text="Search" start={icon(media, 'imgSearch.svg')} selected />
          <DropdownItem type="divider" />
          <DropdownItem text="Settings" end={icon(media, 'imgX.svg', 14)} />
        </Dropdown>

        <Dropdown
          aria-label="Sizes"
          trigger={<ActionButton size="base" rounding="full" text="Small items" end={icon(media, 'dropdown/chevron-down.svg', 14)} />}
        >
          <DropdownItem size="small" text="Small size item" start={icon(media, 'imgFiles.svg', 14)} />
          <DropdownItem size="small" text="Another small item" />
        </Dropdown>

        <Dropdown
          aria-label="States"
          trigger={<DropdownDemoTrigger media={media} iconOnly />}
        >
          <DropdownItem text="Selected item" selected />
          <DropdownItem text="Disabled item" disabled />
          <DropdownItem type="divider" />
          <DropdownItem type="withChildren" text="File" start={icon(media, 'imgFolder.svg')}>
            <DropdownItem text="New file" />
            <DropdownItem text="Rename" />
            <DropdownItem type="divider" />
            <DropdownItem text="Delete" disabled />
          </DropdownItem>
          <DropdownItem text="Edit" />
        </Dropdown>
      </div>

      <div className="dropdown-preview__row">
        {placements.map(placement => (
          <Dropdown
            key={placement}
            placement={placement}
            aria-label={`Placement ${placement}`}
            trigger={<PlainTrigger>{placement}</PlainTrigger>}
          >
            <DropdownItem text={`Menu — ${placement}`} />
            <DropdownItem text="Second item" />
          </Dropdown>
        ))}
      </div>

      <DropdownItemSizesGallery media={media} />
    </div>
  );
}

function DropdownItemSizesGallery({ media }: { media: string }) {
  const sizes: DropdownItemSize[] = ['base', 'small'];
  return (
    <div className="dropdown-preview__row">
      {sizes.map(size => (
        <Dropdown
          key={size}
          aria-label={`Item size ${size}`}
          trigger={<ActionButton size="base" rounding="full" text={`${size} items`} end={icon(media, 'dropdown/chevron-down.svg', 14)} />}
        >
          <DropdownItem size={size} text={`${size} size item`} start={icon(media, 'imgFiles.svg', size === 'small' ? 14 : 16)} />
          <DropdownItem size={size} text="Another item" />
        </Dropdown>
      ))}
    </div>
  );
}
