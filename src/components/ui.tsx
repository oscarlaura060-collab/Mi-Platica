import React, { CSSProperties } from 'react';
import { useTheme, BRAND } from '@/theme';

export function Screen({
  children,
  scroll = true,
  padded = true,
  className = '',
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  className?: string;
}) {
  const t = useTheme();
  return (
    <div
      className={`min-h-full flex-1 flex flex-col ${padded ? 'px-4 sm:px-6' : ''} ${
        scroll ? 'overflow-y-auto pb-28' : 'overflow-hidden'
      } ${className}`}
      style={{ backgroundColor: t.bg }}
    >
      {children}
    </div>
  );
}

export function Card({
  children,
  style,
  className = '',
  onPress,
  onClick,
  tone = 'default',
  glass,
}: {
  children: React.ReactNode;
  style?: CSSProperties;
  className?: string;
  onPress?: () => void;
  onClick?: () => void;
  tone?: 'default' | 'alt' | 'danger' | 'warn' | 'info' | 'primary';
  glass?: boolean;
}) {
  const t = useTheme();
  const bg = {
    default: t.card,
    alt: t.cardAlt,
    danger: t.dangerSoft,
    warn: t.warnSoft,
    info: t.infoSoft,
    primary: t.primarySoft,
  }[tone];

  const border = {
    default: t.border,
    alt: t.border,
    danger: t.danger,
    warn: t.warn,
    info: t.info,
    primary: t.primary,
  }[tone];

  const clickHandler = onPress || onClick;

  return (
    <div
      onClick={clickHandler}
      className={`rounded-2xl transition-all duration-150 p-4 ${
        clickHandler ? 'cursor-pointer active:scale-[0.99] hover:opacity-95' : ''
      } ${className}`}
      style={{
        backgroundColor: glass ? t.glass : bg,
        borderWidth: 1,
        borderColor: glass
          ? t.glassBorder
          : tone === 'default' || tone === 'alt'
            ? border
            : border + '55',
        boxShadow: glass || tone === 'default' ? '0 4px 20px -2px rgba(0, 0, 0, 0.25)' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function FadeIn({
  children,
  className = '',
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`animate-fade-in ${className}`} style={style}>
      {children}
    </div>
  );
}

type TxtProps = {
  children: React.ReactNode;
  variant?: 'hero' | 'displayCurrency' | 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'tiny';
  muted?: boolean;
  faint?: boolean;
  color?: string;
  weight?: '400' | '500' | '600' | '700' | '800';
  className?: string;
  style?: CSSProperties;
  align?: 'left' | 'center' | 'right';
  numberOfLines?: number;
  accessibilityLabel?: string;
  accessibilityRole?: string;
};

export function Txt({
  children,
  variant = 'body',
  muted,
  faint,
  color,
  weight,
  className = '',
  style,
  align = 'left',
  numberOfLines,
}: TxtProps) {
  const t = useTheme();

  const fontSizes: Record<string, string> = {
    hero: 'text-4xl sm:text-5xl font-extrabold tracking-tight',
    displayCurrency: 'text-3xl sm:text-4xl font-extrabold tracking-tight',
    h1: 'text-2xl sm:text-3xl font-extrabold tracking-tight',
    h2: 'text-xl sm:text-2xl font-bold tracking-tight',
    h3: 'text-lg font-semibold',
    body: 'text-base font-medium',
    small: 'text-sm font-medium',
    tiny: 'text-xs font-semibold',
  };

  const weights: Record<string, string> = {
    '400': 'font-normal',
    '500': 'font-medium',
    '600': 'font-semibold',
    '700': 'font-bold',
    '800': 'font-extrabold',
  };

  const textColor = color ?? (faint ? t.textFaint : muted ? t.textMuted : t.text);

  return (
    <div
      className={`${fontSizes[variant]} ${weight ? weights[weight] : ''} ${
        align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'
      } ${numberOfLines ? `line-clamp-${numberOfLines}` : ''} ${className}`}
      style={{ color: textColor, ...style }}
    >
      {children}
    </div>
  );
}

export function Row({
  children,
  gap = 2,
  justify = 'flex-start',
  align = 'center',
  className = '',
  style,
}: {
  children: React.ReactNode;
  gap?: number;
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  className?: string;
  style?: CSSProperties;
}) {
  const t = useTheme();
  return (
    <div
      className={`flex flex-row ${className}`}
      style={{
        alignItems: align,
        justifyContent: justify,
        gap: t.space(gap),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Spacer({ h = 4 }: { h?: number }) {
  const t = useTheme();
  return <div style={{ height: t.space(h) }} aria-hidden="true" />;
}

export function Button({
  label,
  onPress,
  onClick,
  tone = 'primary',
  size = 'md',
  loading,
  disabled,
  className = '',
  style,
  icon,
}: {
  label: string;
  onPress?: () => void;
  onClick?: () => void;
  tone?: 'primary' | 'ghost' | 'danger' | 'neutral' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  icon?: React.ReactNode;
}) {
  const t = useTheme();
  const bg = {
    primary: t.primary,
    accent: t.warn,
    ghost: 'transparent',
    danger: t.danger,
    neutral: t.cardAlt,
  }[tone];

  const fg = {
    primary: t.onPrimary,
    accent: '#071A2A',
    ghost: t.textMuted,
    danger: '#FFFFFF',
    neutral: t.text,
  }[tone];

  const pads = {
    sm: 'px-4 py-2 text-sm min-h-[38px]',
    md: 'px-6 py-2.5 text-base min-h-[46px]',
    lg: 'px-8 py-3.5 text-lg min-h-[54px]',
  }[size];

  const clickHandler = onPress || onClick;

  return (
    <button
      type="button"
      onClick={clickHandler}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-bold rounded-full transition-all duration-150 select-none cursor-pointer ${pads} ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'active:scale-95 hover:opacity-90'
      } ${tone === 'ghost' ? 'border' : ''} ${className}`}
      style={{
        backgroundColor: bg,
        color: fg,
        borderColor: tone === 'ghost' ? t.border : undefined,
        ...style,
      }}
    >
      {loading ? (
        <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
      ) : icon ? (
        <span className="mr-2">{icon}</span>
      ) : null}
      <span>{label}</span>
    </button>
  );
}

export function Chip({
  label,
  emoji,
  active,
  color,
  onPress,
  onClick,
  className = '',
}: {
  label: string;
  emoji?: string | null;
  active?: boolean;
  color?: string;
  onPress?: () => void;
  onClick?: () => void;
  className?: string;
}) {
  const t = useTheme();
  const accent = color ?? t.primary;
  const clickHandler = onPress || onClick;

  return (
    <button
      type="button"
      onClick={clickHandler}
      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all select-none cursor-pointer border ${
        active ? 'shadow-sm' : 'opacity-85 hover:opacity-100'
      } ${className}`}
      style={{
        backgroundColor: active ? accent + '26' : t.cardAlt,
        borderColor: active ? accent : t.border,
        color: active ? t.text : t.textMuted,
      }}
    >
      {emoji ? <span className="text-sm">{emoji}</span> : null}
      <span>{label}</span>
    </button>
  );
}

export function ProgressBar({
  value,
  color,
  height = 8,
}: {
  value: number;
  color?: string;
  height?: number;
}) {
  const t = useTheme();
  const clamped = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div
      className="w-full rounded-full overflow-hidden"
      style={{
        height,
        backgroundColor: t.mode === 'dark' ? t.cardAlt : t.border,
      }}
    >
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{
          width: `${clamped}%`,
          backgroundColor: color ?? t.primary,
        }}
      />
    </div>
  );
}

export function Badge({
  label,
  tone = 'neutral',
  className = '',
}: {
  label: string;
  tone?: 'neutral' | 'danger' | 'warn' | 'ok' | 'info';
  className?: string;
}) {
  const t = useTheme();
  const map = {
    neutral: [t.cardAlt, t.textMuted],
    danger: [t.dangerSoft, t.danger],
    warn: [t.warnSoft, t.warn],
    ok: [t.primarySoft, t.primary],
    info: [t.infoSoft, t.info],
  } as const;
  const [bg, fg] = map[tone];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${className}`}
      style={{ backgroundColor: bg, color: fg }}
    >
      {label}
    </span>
  );
}

export function SectionTitle({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const t = useTheme();
  return (
    <div className="flex items-center justify-between mb-3">
      <Txt variant="h3">{title}</Txt>
      {action ? (
        <button
          type="button"
          onClick={onAction}
          className="text-sm font-semibold hover:underline cursor-pointer"
          style={{ color: t.primary }}
        >
          {action}
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  subtitle,
  cta,
  onCta,
}: {
  title: string;
  subtitle?: string;
  cta?: string;
  onCta?: () => void;
}) {
  const t = useTheme();
  return (
    <Card tone="alt" className="text-center py-10 px-6">
      <Txt variant="h3" align="center">
        {title}
      </Txt>
      {subtitle ? (
        <>
          <Spacer h={2} />
          <Txt variant="small" muted align="center">
            {subtitle}
          </Txt>
        </>
      ) : null}
      {cta ? (
        <div className="mt-5">
          <Button label={cta} onPress={onCta} size="sm" />
        </div>
      ) : null}
    </Card>
  );
}
