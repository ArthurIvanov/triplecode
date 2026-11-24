import {
  useId,
  useState,
  type ComponentPropsWithRef,
  type MouseEvent as ReactMouseEvent,
  type ReactNode
} from 'react';

export type AccordionSize = 'base' | 'small';
export type AccordionState = 'enabled' | 'hover' | 'active' | 'focus' | 'disabled';

export type AccordionProps = Omit<ComponentPropsWithRef<'div'>, 'children'> & {
  /** Header label. */
  title: ReactNode;
  /** Collapsible content rendered inside the indented region. */
  children?: ReactNode;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  disabled?: boolean;
  size?: AccordionSize;
  /** Bordered container variant (Figma `border` prop; visuals unverified). */
  border?: boolean;
  /** Gallery-only state override, mirrors the Figma `state` axis. */
  state?: AccordionState;
  /** Trailing slot before the actions slot (32×24 in Figma). */
  end?: ReactNode;
  /** Interactive actions slot after `end` (24×24 in Figma). Clicks inside do
   *  not toggle the accordion. */
  actions?: ReactNode;
};

function ChevronDown() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M14.4108 6.91081C14.7362 6.58537 15.2638 6.58537 15.5892 6.91081C15.9146 7.23624 15.9146 7.76376 15.5892 8.08919L10.5892 13.0892C10.2638 13.4146 9.73624 13.4146 9.41081 13.0892L4.41081 8.08919C4.08537 7.76376 4.08537 7.23624 4.41081 6.91081C4.73624 6.58537 5.26376 6.58537 5.58919 6.91081L10 11.3216L14.4108 6.91081Z" fill="currentColor" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M6.91081 4.41081C7.23624 4.08537 7.76376 4.08537 8.08919 4.41081L13.0892 9.41081C13.4146 9.73624 13.4146 10.2638 13.0892 10.5892L8.08919 15.5892C7.76376 15.9146 7.23624 15.9146 6.91081 15.5892C6.58537 15.2638 6.58537 14.7362 6.91081 14.4108L11.3216 10L6.91081 5.58919C6.58537 5.26376 6.58537 4.73624 6.91081 4.41081Z" fill="currentColor" />
    </svg>
  );
}

export function Accordion({
  title,
  children,
  expanded,
  defaultExpanded = false,
  onExpandedChange,
  disabled = false,
  size = 'base',
  border = false,
  state = 'enabled',
  end,
  actions,
  className,
  ...rootProps
}: AccordionProps) {
  const [innerExpanded, setInnerExpanded] = useState(defaultExpanded);
  const isExpanded = expanded ?? innerExpanded;
  const triggerId = useId();
  const contentId = useId();

  const toggle = () => {
    if (disabled) return;
    const next = !isExpanded;
    if (expanded === undefined) setInnerExpanded(next);
    onExpandedChange?.(next);
  };

  const cls = className ? `tc-accordion ${className}` : 'tc-accordion';

  return (
    <div
      {...rootProps}
      className={cls}
      data-size={size}
      data-expanded={isExpanded || undefined}
      data-disabled={disabled || undefined}
      data-border={border || undefined}
      data-state={state}
    >
      <div className="tc-accordion__header">
        <button
          type="button"
          id={triggerId}
          className="tc-accordion__trigger"
          aria-expanded={isExpanded}
          aria-controls={contentId}
          disabled={disabled}
          onClick={toggle}
        >
          <span className="tc-accordion__chevron">{isExpanded ? <ChevronDown /> : <ChevronRight />}</span>
          <span className="tc-accordion__title">{title}</span>
          {end != null && end !== '' && <span className="tc-accordion__slot-end">{end}</span>}
        </button>
        {actions != null && actions !== '' && (
          <span className="tc-accordion__actions" onClick={(event: ReactMouseEvent) => event.stopPropagation()}>
            {actions}
          </span>
        )}
      </div>
      {isExpanded && (
        <div className="tc-accordion__content" id={contentId} role="region" aria-labelledby={triggerId}>
          <span className="tc-accordion__line" aria-hidden="true" />
          <div className="tc-accordion__body">{children}</div>
        </div>
      )}
    </div>
  );
}
