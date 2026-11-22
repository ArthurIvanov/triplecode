import { useState } from 'react';
import { ActionButton, type ActionButtonSize, type ActionButtonState, type ActionButtonVariant } from './action-button';

const actionButtonSizes = ['large', 'base', 'small'] as const;
const actionButtonVariants = ['ghost', 'filled'] as const;
const actionButtonStates = ['enabled', 'hover', 'active', 'focus', 'disabled'] as const;

// Figma exports a separate SVG for each size and color of the sample X instance.
const actionButtonSampleIcons: Record<ActionButtonVariant, Record<ActionButtonSize, Record<ActionButtonState, number>>> = {
  ghost: {
    large: { enabled: 14, hover: 13, active: 14, focus: 13, disabled: 7 },
    base: { enabled: 12, hover: 12, active: 12, focus: 12, disabled: 3 },
    small: { enabled: 11, hover: 11, active: 11, focus: 11, disabled: 0 }
  },
  filled: {
    large: { enabled: 8, hover: 10, active: 9, focus: 8, disabled: 7 },
    base: { enabled: 5, hover: 6, active: 5, focus: 4, disabled: 3 },
    small: { enabled: 1, hover: 2, active: 1, focus: 1, disabled: 0 }
  }
};

export function ActionButtonPreview({ media = '' }: { media?: string }) {
  const [pressed, setPressed] = useState(false);

  return <section className="action-button-preview">
    <h3><a href="https://www.figma.com/design/H0WMYGGclEWe3lbjUabY3h/Triplecode-app?node-id=181-1367">ActionButton</a></h3>
    <ActionButton rounding="full" start={false} text="Toggle action" aria-pressed={pressed} onClick={() => setPressed(!pressed)} />
    {[false, true].map(iconOnly => (
      <div className="action-button-matrix-scroll" key={String(iconOnly)}>
        <table className="action-button-matrix">
          <caption>{iconOnly ? 'Icon only' : 'Icon and label'}</caption>
          <thead>
            <tr>
              <th scope="col">State</th>
              {(['default', 'full'] as const).flatMap(rounding =>
                actionButtonVariants.map(variant => <th key={`${rounding}-${variant}`} scope="colgroup" colSpan={3}>{variant} · {rounding}</th>)
              )}
            </tr>
          </thead>
          <tbody>
            {actionButtonStates.map(state => <tr key={state}>
              <th scope="row">{state}</th>
              {(['default', 'full'] as const).flatMap(rounding =>
                actionButtonVariants.flatMap(variant => actionButtonSizes.map(size => {
                  const reference = actionButtonSampleIcons[variant][size][state];
                  const icon = <img src={`${media}/figma-assets/action-button/x${reference ? `-${reference}` : ''}.svg`} alt="" />;
                  const props = { icon, rounding, size, state, variant, tabIndex: -1 };
                  const label = `${variant}, ${rounding}, ${size}, ${state}`;
                  return <td key={`${rounding}-${variant}-${size}`}>
                    {iconOnly
                      ? <ActionButton {...props} iconOnly aria-label={label} />
                      : <ActionButton {...props} aria-label={`Action, ${label}`} />}
                  </td>;
                }))
              )}
            </tr>)}
          </tbody>
        </table>
      </div>
    ))}
  </section>;
}
