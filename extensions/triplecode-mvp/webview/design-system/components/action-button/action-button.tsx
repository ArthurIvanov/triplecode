import type { ComponentPropsWithoutRef, ReactNode } from 'react';

export type ActionButtonSize = 'small' | 'base' | 'large';
export type ActionButtonState = 'enabled' | 'hover' | 'active' | 'focus' | 'disabled';
export type ActionButtonVariant = 'ghost' | 'filled';
export type ActionButtonRounding = 'default' | 'full';

type ActionButtonContent =
  | { text: null; start: ReactNode; 'aria-label': string }
  | { text?: string; start?: ReactNode; 'aria-label'?: string };

export type ActionButtonProps = Omit<ComponentPropsWithoutRef<'button'>, 'children' | 'aria-label'> &
  ActionButtonContent & {
    rounding?: ActionButtonRounding;
    size?: ActionButtonSize;
    state?: ActionButtonState;
    variant?: ActionButtonVariant;
  };

export function ActionButton({
  className,
  disabled,
  rounding = 'default',
  size = 'large',
  start,
  state,
  text = 'Action',
  type = 'button',
  variant = 'ghost',
  ...buttonProps
}: ActionButtonProps) {
  const iconOnly = text === null;
  const hasStart = start != null && typeof start !== 'boolean' && start !== '';
  const isDisabled = disabled || state === 'disabled';

  return (
    <button
      {...buttonProps}
      className={className ? `tc-action-button ${className}` : 'tc-action-button'}
      type={type}
      disabled={isDisabled}
      data-variant={variant}
      data-size={size}
      data-rounding={rounding}
      data-icon-only={iconOnly}
      data-state={isDisabled ? 'disabled' : state}
    >
      {hasStart && <span className="tc-action-button__icon" aria-hidden="true">{start}</span>}
      {!iconOnly && <span>{text}</span>}
    </button>
  );
}
