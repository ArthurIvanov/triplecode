import type { ReactNode } from 'react';

export type TimelineItemStatus = 'pending' | 'running' | 'completed' | 'error';
export type TimelineItemType = 'step' | 'tool' | 'edit' | 'command' | 'message';

export type TimelineItemProps = {
  type?: TimelineItemType;
  status?: TimelineItemStatus;
  title: string;
  description?: string;
  timestamp?: number;
  icon?: ReactNode;
  children?: ReactNode;
  onClick?: () => void;
};

export function TimelineItem({
  type = 'step',
  status = 'completed',
  title,
  description,
  timestamp,
  icon,
  children,
  onClick
}: TimelineItemProps) {
  const statusClass = status === 'running' ? 'running' : status === 'error' ? 'error' : 'completed';
  const typeClass = `tc-timeline__item--${type}`;

  return (
    <div
      className={`tc-timeline__item ${typeClass} ${statusClass}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="tc-timeline__marker">
        {icon || <span className="tc-timeline__dot" />}
      </div>
      <div className="tc-timeline__content">
        <div className="tc-timeline__header">
          <span className="tc-timeline__title">{title}</span>
          {timestamp && <span className="tc-timeline__time">{new Date(timestamp).toLocaleTimeString()}</span>}
        </div>
        {description && <p className="tc-timeline__description">{description}</p>}
        {children}
      </div>
    </div>
  );
}

export function Timeline({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className ? `tc-timeline ${className}` : 'tc-timeline'}>{children}</div>;
}
