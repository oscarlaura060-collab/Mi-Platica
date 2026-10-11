import React, { createContext, useContext, useMemo } from 'react';
import { AccessibilityInfo, useColorScheme } from 'react-native';
import { useAppStore } from '@/store/useAppStore';
import { BRAND, font, radius, space } from './tokens';

export { BRAND, font, radius, space } from './tokens';

/**
 * Paletas derivadas de los tokens de marca.
 *
 * Nota sobre el Inicio: su cabecera es SIEMPRE navy y su panel de
 * movimientos SIEMPRE offWhite, en ambos temas. No es modo oscuro: es el
 * lenguaje visual de la marca (header oscuro + panel claro elevado), y
 * por eso esa pantalla usa BRAND directamente en esas dos superficies.
 */
interface Palette {
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
};

export type Theme = Palette & {
  radius: typeof radius;
  space: typeof space;
  font: typeof font;
  shadow: {
    shadowColor: string;
    shadowOpacity: number;
    shadowRadius: number;
    shadowOffset: { width: number; height: number };
    elevation: number;
  };
  /** true cuando el sistema pide reducir movimiento. */
  reduceMotion: boolean;
};

function build(base: Palette, reduceMotion: boolean): Theme {
  return {
    ...base,
    radius,
    space,
    font,
    shadow: {
      shadowColor: base.mode === 'dark' ? '#000000' : BRAND.navy,
      shadowOpacity: base.mode === 'dark' ? 0.35 : 0.08,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    reduceMotion,
  };
}

const ThemeCtx = createContext<Theme>(build(dark, false));

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const pref = useAppStore((s) => s.themePref);
  const [reduce, setReduce] = React.useState(false);

  // Si el usuario pidio reducir movimiento en su telefono, las pantallas
  // desactivan sus animaciones.
  React.useEffect(() => {
    let vivo = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => vivo && setReduce(v))
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) =>
      setReduce(v),
    );
    return () => {
      vivo = false;
      sub.remove();
    };
  }, []);

  const theme = useMemo(() => {
    const resolved = pref === 'system' ? (system ?? 'dark') : pref;
    return build(resolved === 'light' ? light : dark, reduce);
  }, [pref, system, reduce]);

  return <ThemeCtx.Provider value={theme}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);

/** Paleta de bancos/billeteras colombianas para los presets de cuenta. */
export const PROVIDERS: {
  key: string;
  name: string;
  color: string;
  emoji: string;
  type: 'bank' | 'wallet' | 'cash' | 'credit_card' | 'savings' | 'other';
}[] = [
  { key: 'bancolombia', name: 'Bancolombia', color: '#FDDA24', emoji: 'B', type: 'bank' },
  { key: 'nequi', name: 'Nequi', color: '#200020', emoji: 'N', type: 'wallet' },
  { key: 'daviplata', name: 'Daviplata', color: '#ED1C27', emoji: 'D', type: 'wallet' },
  { key: 'davivienda', name: 'Davivienda', color: '#E1261C', emoji: 'D', type: 'bank' },
  { key: 'bbva', name: 'BBVA', color: '#004481', emoji: 'B', type: 'bank' },
  { key: 'bogota', name: 'Banco de Bogota', color: '#00447C', emoji: 'B', type: 'bank' },
  { key: 'lulo', name: 'Lulo Bank', color: '#00D1B2', emoji: 'L', type: 'bank' },
  { key: 'nu', name: 'Nu', color: '#820AD1', emoji: 'N', type: 'credit_card' },
  { key: 'efectivo', name: 'Efectivo', color: '#16A34A', emoji: 'E', type: 'cash' },
  { key: 'ahorro', name: 'Ahorro / Alcancia', color: BRAND.turquoise, emoji: 'A', type: 'savings' },
  { key: 'otro', name: 'Otra cuenta', color: '#64748B', emoji: 'O', type: 'other' },
];
