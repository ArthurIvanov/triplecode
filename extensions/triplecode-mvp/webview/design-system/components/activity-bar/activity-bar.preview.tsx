import { useState } from 'react';
import { ActionButtonIcon } from '../action-button';
import { ActivityBar, ActivityBarButton } from '.';

const views = [
  { label: 'Explorer', icon: 'imgFiles.svg' },
  { label: 'Search', icon: 'imgSearch.svg' },
  { label: 'Source Control', icon: 'imgGitBranch.svg' },
  { label: 'Extensions', icon: 'imgBox.svg' }
] as const;

export function ActivityBarPreview({ media = '' }: { media?: string }) {
  const [selected, select] = useState<typeof views[number]['label']>('Explorer');
  return (
    <ActivityBar>
      {views.map(({ label, icon }) => (
        <ActivityBarButton key={label} label={label} selected={selected === label} onClick={() => select(label)}
          icon={<ActionButtonIcon dimension={20} href={`${media}/figma-assets/activity-bar/${icon}`} />} />
      ))}
    </ActivityBar>
  );
}
