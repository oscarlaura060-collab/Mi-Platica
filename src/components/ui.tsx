import React from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleProp,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@/theme';

export function Screen({
  children,
  scroll = true,
  padded = true,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
}) {
  const t = useTheme();
  const style: ViewStyle = {
    flex: 1,
    backgroundColor: t.bg,
    paddingHorizontal: padded ? t.space(5) : 0,
  };
  if (!scroll) return <View style={style}>{children}</View>;
  return (
    <ScrollView
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={{
        paddingHorizontal: padded ? t.space(5) : 0,
        paddingBottom: t.space(28),
      }}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

export function Card({
  children,
  style,
  onPress,
  tone = 'default',
  glass,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  tone?: 'default' | 'alt' | 'danger' | 'warn' | 'info' | 'primary';
  /** Superficie "liquid": translucida y con borde claro. Solo para
   *  tarjetas destacadas o resumenes, nunca para formularios. */
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

  const [pressed, setPressed] = React.useState(false);
  const Comp: typeof View | typeof Pressable = onPress ? Pressable : View;

  return (
    <Comp
      onPress={onPress}
      onPressIn={onPress ? () => setPressed(true) : undefined}
      onPressOut={onPress ? () => setPressed(false) : undefined}
      style={[
        {
          backgroundColor: glass ? t.glass : bg,
          borderRadius: glass ? t.radius.xl : t.radius.lg,
          borderWidth: 1,
          borderColor: glass
            ? t.glassBorder
            : tone === 'default' || tone === 'alt'
              ? border
              : border + '55',
          padding: t.space(4),
          // Microinteraccion: la tarjeta "cede" un poco al tocarla.
          transform: pressed && !t.reduceMotion ? [{ scale: 0.985 }] : undefined,
          opacity: pressed ? 0.95 : 1,
        },
        glass || tone === 'default' ? t.shadow : null,
        style,
      ]}
    >
      {children}
    </Comp>
  );
}

/**
 * Tarjeta que aparece con un desvanecido corto al montarse. Se usa en las
 * secciones de las pantallas principales; si el telefono pide reducir
 * movimiento, aparece de una vez.
 */
export function FadeIn({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const anim = React.useRef(new Animated.Value(t.reduceMotion ? 1 : 0)).current;

  React.useEffect(() => {
    if (t.reduceMotion) {
      anim.setValue(1);
      return;
    }
    Animated.timing(anim, {
      toValue: 1,
      duration: 260,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [anim, delay, t.reduceMotion]);

  return (
    <Animated.View
      style={[
        {
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
          ],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

type TxtProps = {
  children: React.ReactNode;
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'tiny';
  muted?: boolean;
  faint?: boolean;
  color?: string;
  weight?: '400' | '500' | '600' | '700' | '800';
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  align?: 'left' | 'center' | 'right';
  /** Para que el lector de pantalla diga "menos 45 mil pesos" y no "-45.000". */
  accessibilityLabel?: string;
  accessibilityRole?: 'header' | 'text' | 'none';
};

export function Txt({
  children,
  variant = 'body',
  muted,
  faint,
  color,
  weight,
  style,
  numberOfLines,
  align,
  accessibilityLabel,
  accessibilityRole,
}: TxtProps) {
  const t = useTheme();
  const defaultWeight: Record<string, TextStyle['fontWeight']> = {
    h1: '800',
    h2: '700',
    h3: '600',
    body: '500',
    small: '500',
    tiny: '600',
  };
  return (
    <Text
      numberOfLines={numberOfLines}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      style={[
        {
          color: color ?? (faint ? t.textFaint : muted ? t.textMuted : t.text),
          fontSize: t.font[variant],
          fontWeight: weight ?? defaultWeight[variant],
          textAlign: align,
          letterSpacing: variant === 'h1' ? -0.8 : 0,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Row({
  children,
  gap = 2,
  justify = 'flex-start',
  align = 'center',
  style,
}: {
  children: React.ReactNode;
  gap?: number;
  justify?: ViewStyle['justifyContent'];
  align?: ViewStyle['alignItems'];
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: align, justifyContent: justify, gap: t.space(gap) },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Spacer({ h = 4 }: { h?: number }) {
  const t = useTheme();
  return <View style={{ height: t.space(h) }} />;
}

export function Button({
  label,
  onPress,
  tone = 'primary',
  size = 'md',
  loading,
  disabled,
  style,
}: {
  label: string;
  onPress?: () => void;
  tone?: 'primary' | 'ghost' | 'danger' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const bg = {
    primary: t.primary,
    ghost: 'transparent',
    danger: t.danger,
    neutral: t.cardAlt,
  }[tone];
  const fg = {
    primary: t.onPrimary,
    ghost: t.textMuted,
    danger: '#FFFFFF',
    neutral: t.text,
  }[tone];
  const pad = { sm: t.space(2), md: t.space(3.5), lg: t.space(4.5) }[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderRadius: t.radius.pill,
          paddingVertical: pad,
          paddingHorizontal: t.space(6),
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: tone === 'ghost' ? 1 : 0,
          borderColor: t.border,
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={{ color: fg, fontWeight: '700', fontSize: 15 }}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Chip({
  label,
  emoji,
  active,
  color,
  onPress,
}: {
  label: string;
  emoji?: string | null;
  active?: boolean;
  color?: string;
  onPress?: () => void;
}) {
  const t = useTheme();
  const accent = color ?? t.primary;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: t.space(2.5),
        paddingHorizontal: t.space(3.5),
        borderRadius: t.radius.pill,
        backgroundColor: active ? accent + '26' : t.cardAlt,
        borderWidth: 1,
        borderColor: active ? accent : t.border,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {emoji ? <Text style={{ fontSize: 14 }}>{emoji}</Text> : null}
      <Text
        style={{
          color: active ? t.text : t.textMuted,
          fontWeight: '600',
          fontSize: 13,
        }}
      >
        {label}
      </Text>
    </Pressable>
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
  const target = Math.max(0, Math.min(100, value));
  const anim = React.useRef(new Animated.Value(t.reduceMotion ? target : 0)).current;

  React.useEffect(() => {
    if (t.reduceMotion) {
      anim.setValue(target);
      return;
    }
    Animated.timing(anim, {
      toValue: target,
      duration: 480,
      easing: Easing.out(Easing.cubic),
      // El ancho en % no puede ir por el hilo nativo.
      useNativeDriver: false,
    }).start();
  }, [target, anim, t.reduceMotion]);

  return (
    <View
      style={{
        height,
        borderRadius: height,
        backgroundColor: t.mode === 'dark' ? t.cardAlt : t.border,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={{
          width: anim.interpolate({
            inputRange: [0, 100],
            outputRange: ['0%', '100%'],
          }),
          height: '100%',
          backgroundColor: color ?? t.primary,
          borderRadius: height,
        }}
      />
    </View>
  );
}

export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'danger' | 'warn' | 'ok' | 'info';
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
    <View
      style={{
        backgroundColor: bg,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: t.radius.pill,
      }}
    >
      <Text style={{ color: fg, fontSize: 11, fontWeight: '700' }}>{label}</Text>
    </View>
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
    <Row justify="space-between" style={{ marginBottom: t.space(3) }}>
      <Txt variant="h3">{title}</Txt>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10}>
          <Txt variant="small" color={t.primary}>
            {action}
          </Txt>
        </Pressable>
      ) : null}
    </Row>
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
    <Card tone="alt" style={{ alignItems: 'center', paddingVertical: t.space(8) }}>
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
        <>
          <Spacer h={4} />
          <Button label={cta} onPress={onCta} size="sm" />
        </>
      ) : null}
    </Card>
  );
}
