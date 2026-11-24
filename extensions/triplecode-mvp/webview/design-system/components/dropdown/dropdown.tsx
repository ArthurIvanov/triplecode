import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode
} from 'react';
import { ActionButton } from '../action-button';

export type DropdownPlacement =
  | 'bottom-left' | 'bottom-center' | 'bottom-right'
  | 'top-left' | 'top-center' | 'top-right';
export type DropdownValue = { text?: string; start?: ReactNode };

type DropdownContextValue = {
  select: (value: DropdownValue) => void;
  close: () => void;
};

const DropdownContext = createContext<DropdownContextValue | null>(null);

function menuItems(list: HTMLElement): HTMLElement[] {
  return Array.from(
    list.querySelectorAll<HTMLElement>('.tc-dropdown__item[data-selectable="true"]:not([data-disabled="true"])')
  ).filter(item => item.closest('.tc-dropdown__list') === list);
}

function moveMenuFocus(list: HTMLElement, key: string): boolean {
  const items = menuItems(list);
  if (!items.length) return false;
  const index = items.indexOf(document.activeElement as HTMLElement);
  let next: HTMLElement | undefined;
  if (key === 'ArrowDown') next = items[(index + 1 + items.length) % items.length];
  else if (key === 'ArrowUp') next = items[(index - 1 + items.length) % items.length];
  else if (key === 'Home') next = items[0];
  else if (key === 'End') next = items[items.length - 1];
  else return false;
  next?.focus();
  return true;
}

export type DropdownProps = {
  /** Trigger element. Props are cloned onto it: aria-*, onClick/onKeyDown,
   *  `state="active"` while open (ActionButton), and `start`/`text` of the
   *  selected DropdownItem. The trigger must forward props to the DOM. */
  trigger: ReactElement;
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  onSelect?: (value: DropdownValue) => void;
  value?: DropdownValue;
  defaultValue?: DropdownValue;
  closeOnSelect?: boolean;
  placement?: DropdownPlacement;
  disabled?: boolean;
  minWidth?: string;
  maxWidth?: string;
  'aria-label'?: string;
  className?: string;
};

export function Dropdown({
  trigger,
  children,
  open,
  defaultOpen = false,
  onOpen,
  onClose,
  onSelect,
  value,
  defaultValue,
  closeOnSelect = true,
  placement = 'bottom-left',
  disabled = false,
  minWidth,
  maxWidth,
  'aria-label': ariaLabel,
  className
}: DropdownProps) {
  const listId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const triggerWrapRef = useRef<HTMLSpanElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [innerOpen, setInnerOpen] = useState(defaultOpen);
  const [innerValue, setInnerValue] = useState<DropdownValue | undefined>(defaultValue);
  const [actualPlacement, setActualPlacement] = useState(placement);
  const isOpen = open ?? innerOpen;
  const currentValue = value ?? innerValue;

  // Auto-flip placement when there's not enough space
  useEffect(() => {
    if (!isOpen) return;
    const list = listRef.current;
    const trigger = triggerWrapRef.current;
    if (!list || !trigger) return;

    const listRect = list.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    // Check if bottom placement has enough space
    const spaceBelow = viewportHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;

    // If placement starts with 'bottom' and there's not enough space below, flip to top
    if (placement.startsWith('bottom') && spaceBelow < listRect.height + 20 && spaceAbove > spaceBelow) {
      const flipped = placement.replace('bottom', 'top') as DropdownPlacement;
      setActualPlacement(flipped);
    }
    // If placement starts with 'top' and there's not enough space above, flip to bottom
    else if (placement.startsWith('top') && spaceAbove < listRect.height + 20 && spaceBelow > spaceAbove) {
      const flipped = placement.replace('top', 'bottom') as DropdownPlacement;
      setActualPlacement(flipped);
    } else {
      setActualPlacement(placement);
    }
  }, [isOpen, placement]);

  const setOpen = useCallback((next: boolean, restoreFocus = false) => {
    if (open === undefined) setInnerOpen(next);
    if (next) onOpen?.(); else onClose?.();
    if (!next && restoreFocus) {
      requestAnimationFrame(() => {
        const wrap = triggerWrapRef.current;
        const target = wrap?.querySelector<HTMLElement>('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        target?.focus();
      });
    }
  }, [open, onOpen, onClose]);

  const close = useCallback(() => setOpen(false, true), [setOpen]);

  const select = useCallback((next: DropdownValue) => {
    if (value === undefined) setInnerValue(next);
    onSelect?.(next);
    if (closeOnSelect) close();
  }, [value, onSelect, closeOnSelect, close]);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: globalThis.MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [isOpen, setOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const items = menuItems(listRef.current!);
    const target = items.find(item => item.dataset.selected === 'true') ?? items[0];
    target?.focus();
  }, [isOpen]);

  const onTriggerClick = (event: ReactMouseEvent<HTMLElement>) => {
    (trigger.props as Record<string, any>).onClick?.(event);
    if (event.defaultPrevented || disabled) return;
    setOpen(!isOpen);
  };

  const onTriggerKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    (trigger.props as Record<string, any>).onKeyDown?.(event);
    if (event.defaultPrevented || disabled) return;
    if (isOpen && event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen(true);
    }
  };

  const onListKeyDown = (event: ReactKeyboardEvent) => {
    const list = listRef.current;
    if (!list) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return; }
    if (event.key === 'Tab') { setOpen(false); return; }
    if (moveMenuFocus(list, event.key)) { event.preventDefault(); event.stopPropagation(); }
  };

  if (!isValidElement(trigger)) {
    throw new Error('Dropdown `trigger` must be a single React element.');
  }

  const triggerProps = trigger.props as Record<string, any>;
  const isActionButton = trigger.type === ActionButton;
  const triggerTag = typeof trigger.type === 'string' ? trigger.type : null;
  const triggerDisabled = disabled || triggerProps.disabled;
  // `start`/`text` reflection only goes to triggers that declare these props
  // (ActionButton or a compatible composite); plain DOM triggers would warn.
  const reflectsValue = isActionButton || 'text' in triggerProps || 'start' in triggerProps;

  const triggerElement = cloneElement(trigger, {
    'aria-haspopup': 'menu',
    'aria-expanded': isOpen,
    'aria-controls': listId,
    'aria-disabled': triggerDisabled || undefined,
    ...(isActionButton || triggerTag === 'button' ? { disabled: triggerDisabled } : {}),
    ...(isActionButton
      ? { state: isOpen ? 'active' : triggerProps.state }
      : { 'data-state': isOpen ? 'active' : undefined }),
    ...(reflectsValue ? {
      start: currentValue?.start ?? triggerProps.start,
      text: triggerProps.text === null ? null : currentValue?.text ?? triggerProps.text
    } : {}),
    onClick: onTriggerClick,
    onKeyDown: onTriggerKeyDown
  } as any);

  return (
    <span className={className ? `tc-dropdown ${className}` : 'tc-dropdown'} data-placement={actualPlacement} ref={rootRef}>
      <span className="tc-dropdown__trigger" ref={triggerWrapRef}>{triggerElement}</span>
      {isOpen && (
        <DropdownList
          ref={listRef}
          id={listId}
          aria-label={ariaLabel}
          style={minWidth || maxWidth ? { minWidth, maxWidth } : undefined}
          onKeyDown={onListKeyDown}
        >
          <DropdownContext.Provider value={{ select, close }}>{children}</DropdownContext.Provider>
        </DropdownList>
      )}
    </span>
  );
}

export function DropdownList({
  children,
  className,
  ...listProps
}: ComponentPropsWithRef<'div'>) {
  return (
    <div
      {...listProps}
      role="menu"
      className={className ? `tc-dropdown__list ${className}` : 'tc-dropdown__list'}
    >
      {children}
    </div>
  );
}

export type DropdownItemType = 'text' | 'headline' | 'divider' | 'withChildren';
export type DropdownItemSize = 'base' | 'small';

export type DropdownItemProps = Omit<ComponentPropsWithRef<'div'>, 'children' | 'onClick' | 'onKeyDown'> & {
  /** `text` renders a selectable row, `headline` a group label, `divider` a
   *  separator, `withChildren` a row whose `children` open a nested menu.
   *  For `withChildren`, `text` is the row label and `children` are the
   *  nested DropdownItem elements. */
  type?: DropdownItemType;
  size?: DropdownItemSize;
  selected?: boolean;
  disabled?: boolean;
  /** Visible label. For selectable items also used as the trigger `text`. */
  text?: string;
  /** Leading icon slot (`ReactNode`). */
  start?: ReactNode;
  /** Trailing slot (`ReactNode`). */
  end?: ReactNode;
  children?: ReactNode;
  onClick?: (event: ReactMouseEvent<HTMLElement>) => void;
  onKeyDown?: (event: ReactKeyboardEvent<HTMLElement>) => void;
};

export function DropdownItem({
  className,
  type = 'text',
  size = 'base',
  selected = false,
  disabled = false,
  text,
  start,
  end,
  children,
  onClick,
  onKeyDown,
  ...itemProps
}: DropdownItemProps) {
  const context = useContext(DropdownContext);
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const itemRef = useRef<any>(null);
  const subListRef = useRef<HTMLDivElement>(null);
  const cls = className ? `tc-dropdown__item ${className}` : 'tc-dropdown__item';
  const dataAttrs = {
    'data-type': type,
    'data-size': size,
    'data-selected': selected || undefined
  };

  if (type === 'divider') {
    return <div className={cls} role="separator" {...dataAttrs} {...itemProps} />;
  }

  if (type === 'headline') {
    return (
      <div className={cls} {...dataAttrs} {...itemProps}>
        {text ?? children}
      </div>
    );
  }

  const ariaDisabled = itemProps['aria-disabled'];
  const isDisabled = disabled || ariaDisabled === true || ariaDisabled === 'true';

  if (type === 'withChildren') {
    const openSubmenu = () => {
      setSubmenuOpen(true);
      requestAnimationFrame(() => {
        const first = subListRef.current && menuItems(subListRef.current)[0];
        first?.focus();
      });
    };
    const onSubKeyDown = (event: ReactKeyboardEvent) => {
      const list = subListRef.current;
      if (!list) return;
      if (event.key === 'Escape' || event.key === 'ArrowLeft') {
        event.preventDefault();
        event.stopPropagation();
        setSubmenuOpen(false);
        itemRef.current?.focus();
        return;
      }
      if (event.key === 'Tab') { setSubmenuOpen(false); return; }
      if (moveMenuFocus(list, event.key)) { event.preventDefault(); event.stopPropagation(); }
    };
    const onItemKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented || isDisabled) return;
      if (event.key === 'ArrowRight' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (submenuOpen) {
          const first = subListRef.current && menuItems(subListRef.current)[0];
          first?.focus();
        } else openSubmenu();
      } else if (event.key === 'ArrowLeft' || (event.key === 'Escape' && submenuOpen)) {
        event.preventDefault();
        event.stopPropagation();
        setSubmenuOpen(false);
      }
    };
    return (
      <div
        {...itemProps}
        ref={itemRef}
        role="menuitem"
        tabIndex={isDisabled ? undefined : -1}
        aria-haspopup="menu"
        aria-expanded={submenuOpen}
        aria-disabled={isDisabled || undefined}
        className={cls}
        {...dataAttrs}
        data-selectable={isDisabled ? undefined : 'true'}
        data-disabled={isDisabled || undefined}
        onMouseEnter={() => { if (!isDisabled) setSubmenuOpen(true); }}
        onMouseLeave={() => setSubmenuOpen(false)}
        onClick={(event) => {
          onClick?.(event);
          if (!isDisabled) setSubmenuOpen(open => !open);
        }}
        onKeyDown={onItemKeyDown}
      >
        {start != null && start !== '' && <span className="tc-dropdown__item-icon" aria-hidden="true">{start}</span>}
        <span className="tc-dropdown__item-text">{text}</span>
        <span className="tc-dropdown__item-end">
          {end ?? <span className="tc-dropdown__item-caret" aria-hidden="true" />}
        </span>
        {submenuOpen && (
          <DropdownList ref={subListRef} className="tc-dropdown__submenu" onKeyDown={onSubKeyDown}>
            {children}
          </DropdownList>
        )}
      </div>
    );
  }

  const handleClick = (event: ReactMouseEvent<HTMLElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || isDisabled || !context) return;
    context.select({ text, start });
  };

  return (
    <button
      {...(itemProps as unknown as ComponentPropsWithRef<'button'>)}
      ref={itemRef}
      type="button"
      role="menuitem"
      tabIndex={-1}
      disabled={isDisabled}
      className={cls}
      {...dataAttrs}
      data-selectable="true"
      data-disabled={isDisabled || undefined}
      onClick={handleClick}
    >
      {start != null && start !== '' && <span className="tc-dropdown__item-icon" aria-hidden="true">{start}</span>}
      <span className="tc-dropdown__item-text">{children ?? text}</span>
      {end != null && end !== '' && <span className="tc-dropdown__item-end">{end}</span>}
    </button>
  );
}
