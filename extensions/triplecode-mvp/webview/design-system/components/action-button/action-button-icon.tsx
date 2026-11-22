import { useId } from 'react';

export function ActionButtonIcon({ href, dimension = 16 }: { href: string; dimension?: number }) {
  const maskId = useId();

  return (
    <svg width={dimension} height={dimension} viewBox={`0 0 ${dimension} ${dimension}`} aria-hidden="true">
      <mask id={maskId} mask-type="alpha">
        <image href={href} width={dimension} height={dimension} />
      </mask>
      <rect width={dimension} height={dimension} fill="currentColor" mask={`url(#${maskId})`} />
    </svg>
  );
}
