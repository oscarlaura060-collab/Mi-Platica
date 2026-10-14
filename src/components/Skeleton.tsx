import React, { CSSProperties } from 'react';

export function Skeleton({
  width = '100%',
  height = 16,
  radius,
  style,
  className = '',
  onDark,
}: {
  width?: string | number;
  height?: number;
  radius?: number;
  style?: CSSProperties;
  className?: string;
  onDark?: boolean;
}) {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{
        width,
        height,
        borderRadius: radius ?? (typeof height === 'number' ? height / 2 : 8),
        backgroundColor: onDark ? 'rgba(255,255,255,0.12)' : 'rgba(7,26,42,0.08)',
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

export function SkeletonLines({
  lines = 3,
  onDark,
  gap = 10,
}: {
  lines?: number;
  onDark?: boolean;
  gap?: number;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          height={14}
          width={i === lines - 1 ? '60%' : '100%'}
          onDark={onDark}
        />
      ))}
    </div>
  );
}
