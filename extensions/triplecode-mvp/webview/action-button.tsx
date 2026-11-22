import type { ComponentPropsWithoutRef, ReactNode } from 'react';

export type ActionButtonSize = 'small' | 'base' | 'large';
export type ActionButtonState = 'enabled' | 'hover' | 'active' | 'focus' | 'disabled';
export type ActionButtonVariant = 'ghost' | 'filled';
export type ActionButtonRounding = 'default' | 'full';

type ActionButtonContent =
  | { iconOnly: true; icon: ReactNode; 'aria-label': string }
  | { iconOnly?: false; icon?: ReactNode; 'aria-label'?: string };

export type ActionButtonProps = Omit<ComponentPropsWithoutRef<'button'>, 'children' | 'aria-label'> &
  ActionButtonContent & {
    rounding?: ActionButtonRounding;
    size?: ActionButtonSize;
    start?: boolean;
    state?: ActionButtonState;
    text?: string;
    variant?: ActionButtonVariant;
  };

export function ActionButton({
  className,
  disabled,
  icon,
  iconOnly = false,
  rounding = 'default',
  size = 'large',
  start = true,
  state,
  text = 'Action',
  type = 'button',
  variant = 'ghost',
  ...buttonProps
}: ActionButtonProps) {
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
      {start && icon != null && <span className="tc-action-button__icon" aria-hidden="true">{icon}</span>}
      {!iconOnly && <span>{text}</span>}
    </button>
  );
}
