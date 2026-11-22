import type { ReactNode } from 'react';
import { ActionButton } from '../action-button';

export type ActivityBarProps = {
  children: ReactNode;
  'aria-label'?: string;
};

export function ActivityBar({ children, 'aria-label': label = 'Activity Bar' }: ActivityBarProps) {
  return <div className="tc-activity-bar" role="group" aria-label={label}>{children}</div>;
}

export type ActivityBarButtonProps = {
  icon: ReactNode;
  label: string;
  selected?: boolean;
  onClick: () => void;
};

export function ActivityBarButton({ icon, label, selected = false, onClick }: ActivityBarButtonProps) {
  return (
    <ActionButton className="tc-activity-bar__button" text={null} start={icon}
      aria-label={label} aria-pressed={selected} title={label} onClick={onClick} />
  );
}
