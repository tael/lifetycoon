import type { CSSProperties } from 'react';

const modules = import.meta.glob('./*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const iconMap: Record<string, string> = {};
for (const [path, url] of Object.entries(modules)) {
  const id = path.replace(/^\.\//, '').replace(/\.svg$/, '');
  iconMap[id] = url;
}

export type IconSlot =
  | 'nav-home'
  | 'nav-cashflow'
  | 'nav-bank'
  | 'nav-invest'
  | 'nav-friends'
  | 'nav-settings'
  | 'stat-happiness'
  | 'stat-health'
  | 'stat-wisdom'
  | 'stat-charisma'
  | 'asset-cash'
  | 'asset-total'
  | 'cat-job'
  | 'cat-property'
  | 'cat-stock'
  | 'cat-savings'
  | 'status-alert'
  | 'status-check'
  | 'eco-boom'
  | 'eco-slump'
  | 'rank-crown'
  | 'rank-trophy'
  | 'rank-medal'
  | 'feature-dream';

export type IconSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_PX: Record<IconSize, number> = { sm: 16, md: 24, lg: 32, xl: 48 };

interface IconProps {
  slot: IconSlot;
  size?: IconSize | number;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  fallback?: string;
}

export function Icon({ slot, size = 'md', className, style, ariaLabel, fallback }: IconProps) {
  const px = typeof size === 'number' ? size : SIZE_PX[size];
  const src = iconMap[slot];
  if (!src) {
    return (
      <span
        className={className}
        style={{ fontSize: px, lineHeight: 1, display: 'inline-block', ...style }}
        aria-label={ariaLabel}
        role={ariaLabel ? 'img' : undefined}
      >
        {fallback ?? '•'}
      </span>
    );
  }
  return (
    <img
      src={src}
      width={px}
      height={px}
      alt={ariaLabel ?? ''}
      aria-hidden={ariaLabel ? undefined : true}
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
      draggable={false}
    />
  );
}

export function hasIcon(slot: string): slot is IconSlot {
  return slot in iconMap;
}
