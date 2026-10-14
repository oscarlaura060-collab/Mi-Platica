import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { BRAND, font, radius, space } from './tokens';

export { BRAND, font, radius, space } from './tokens';

export interface Palette {
  mode: 'dark' | 'light';
  bg: string;
  bgSoft: string;
  bgElevated: string;
  card: string;
  cardAlt: string;
  glass: string;
  glassBorder: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  primary: string;
  primaryDeep: string;
  primarySoft: string;
  onPrimary: string;
  danger: string;
  dangerSoft: string;
  warn: string;
  warnSoft: string;
  info: string;
  infoSoft: string;
  violet: string;
  overlay: string;
  gradient: [string, string];
  surfaceLowest: string;
  surfaceLow: string;
  surfaceContainer: string;
  surfaceHigh: string;
  surfaceHighest: string;
  onSurface: string;
  onSurfaceVariant: string;
}

const dark: Palette = {
  mode: 'dark',
  bg: BRAND.navy,
  bgSoft: BRAND.navySoft,
  bgElevated: '#102F44',
  card: '#0F2C40',
  cardAlt: '#15394F',
  glass: 'rgba(20,196,212,0.10)',
  glassBorder: 'rgba(255,255,255,0.12)',
  border: BRAND.borderDark,
  text: '#F4FAFC',
  textMuted: BRAND.mutedLight,
  textFaint: '#6E8DA2',
  primary: BRAND.turquoise,
  primaryDeep: BRAND.turquoiseDark,
  primarySoft: 'rgba(20,196,212,0.18)',
  onPrimary: BRAND.navy,
  danger: BRAND.coral,
  dangerSoft: 'rgba(255,111,97,0.16)',
  warn: BRAND.yellow,
  warnSoft: 'rgba(255,212,71,0.16)',
  info: '#5FD0E0',
  infoSoft: 'rgba(95,208,224,0.14)',
  violet: '#8B9BF5',
  overlay: 'rgba(3,12,20,0.74)',
  gradient: [BRAND.navySoft, BRAND.navy],
  surfaceLowest: BRAND.surfaceContainerLowest,
  surfaceLow: BRAND.surfaceContainerLow,
  surfaceContainer: BRAND.surfaceContainer,
  surfaceHigh: BRAND.surfaceContainerHigh,
  surfaceHighest: BRAND.surfaceContainerHighest,
  onSurface: BRAND.onSurface,
  onSurfaceVariant: BRAND.onSurfaceVariant,
};

const light: Palette = {
  mode: 'light',
  bg: BRAND.offWhite,
  bgSoft: '#EFF1EB',
  bgElevated: BRAND.white,
  card: BRAND.white,
  cardAlt: '#F0F2EC',
  glass: 'rgba(20,196,212,0.08)',
  glassBorder: 'rgba(7,26,42,0.10)',
  border: BRAND.borderLight,
  text: BRAND.ink,
  textMuted: BRAND.mutedDark,
  textFaint: '#9AA5AC',
  primary: BRAND.turquoiseDark,
  primaryDeep: '#07707C',
  primarySoft: 'rgba(20,196,212,0.14)',
  onPrimary: BRAND.white,
  danger: '#E05445',
  dangerSoft: BRAND.paleCoral,
  warn: '#B8880A',
  warnSoft: BRAND.paleYellow,
  info: BRAND.turquoiseDark,
  infoSoft: BRAND.paleTurquoise,
  violet: '#5C6BC0',
  overlay: 'rgba(7,26,42,0.38)',
  gradient: ['#E8F4F7', BRAND.offWhite],
  surfaceLowest: '#FFFFFF',
  surfaceLow: BRAND.offWhite,
  surfaceContainer: '#FFFFFF',
  surfaceHigh: '#EFF1EB',
  surfaceHighest: '#E6E7E2',
  onSurface: BRAND.ink,
  onSurfaceVariant: BRAND.mutedDark,
};

export type Theme = Palette & {
  radius: typeof radius;
  space: typeof space;
  font: typeof font;
  reduceMotion: boolean;
};

function build(base: Palette, reduceMotion: boolean): Theme {
  return {
    ...base,
    radius,
    space,
    font,
    reduceMotion,
  };
}

const ThemeCtx = createContext<Theme>(build(dark, false));

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [systemScheme, setSystemScheme] = useState<'dark' | 'light'>('dark');
  const [reduceMotion, setReduceMotion] = useState(false);
  const pref = useAppStore((s) => s.themePref);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemScheme(darkQuery.matches ? 'dark' : 'light');

    const handleSchemeChange = (e: MediaQueryListEvent) => {
      setSystemScheme(e.matches ? 'dark' : 'light');
    };
    darkQuery.addEventListener('change', handleSchemeChange);

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(motionQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setReduceMotion(e.matches);
    };
    motionQuery.addEventListener('change', handleMotionChange);

    return () => {
      darkQuery.removeEventListener('change', handleSchemeChange);
      motionQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  const theme = useMemo(() => {
    const resolved = pref === 'system' ? systemScheme : pref;
    const active = resolved === 'light' ? light : dark;

    if (typeof document !== 'undefined') {
      if (resolved === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
        document.body.style.backgroundColor = BRAND.navy;
        document.body.style.color = '#F4FAFC';
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
        document.body.style.backgroundColor = BRAND.offWhite;
        document.body.style.color = BRAND.ink;
      }
    }

    return build(active, reduceMotion);
  }, [pref, systemScheme, reduceMotion]);

  return <ThemeCtx.Provider value={theme}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);

export const PROVIDERS: {
  key: string;
  name: string;
  color: string;
  emoji: string;
  type: 'bank' | 'wallet' | 'cash' | 'credit_card' | 'savings' | 'other';
}[] = [
  { key: 'bancolombia', name: 'Bancolombia', color: '#FDDA24', emoji: '🟡', type: 'bank' },
  { key: 'nequi', name: 'Nequi', color: '#200020', emoji: '🟣', type: 'wallet' },
  { key: 'daviplata', name: 'Daviplata', color: '#ED1C27', emoji: '🔴', type: 'wallet' },
  { key: 'davivienda', name: 'Davivienda', color: '#E1261C', emoji: '🏛️', type: 'bank' },
  { key: 'bbva', name: 'BBVA', color: '#004481', emoji: '🏦', type: 'bank' },
  { key: 'bogota', name: 'Banco de Bogotá', color: '#00447C', emoji: '🏢', type: 'bank' },
  { key: 'lulo', name: 'Lulo Bank', color: '#00D1B2', emoji: '🥑', type: 'bank' },
  { key: 'nu', name: 'Nu (Nubank)', color: '#820AD1', emoji: '💳', type: 'credit_card' },
  { key: 'efectivo', name: 'Efectivo', color: '#16A34A', emoji: '💵', type: 'cash' },
  { key: 'ahorro', name: 'Ahorro / Alcancía', color: BRAND.turquoise, emoji: '🐷', type: 'savings' },
  { key: 'otro', name: 'Otra cuenta', color: '#64748B', emoji: '💼', type: 'other' },
];
