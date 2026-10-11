/**
 * TOKENS DE MARCA — Mi Platica
 *
 * Fuente de verdad de color. Estos son los valores aprobados en el
 * prompt maestro; el tema (claro/oscuro) se deriva de aqui, nunca al
 * reves. Ninguna pantalla debe escribir un color a mano.
 */
export const BRAND = {
  navy: '#071A2A', // fondo principal y header
  navySoft: '#0D2A3D', // variacion secundaria del fondo
  turquoise: '#14C4D4', // accion primaria, saldo positivo, activo
  turquoiseDark: '#0A8F9C', // estados secundarios
  yellow: '#FFD447', // Coach, destacados, CTA recomendada
  coral: '#FF6F61', // gastos, alertas, preocupacion
  plum: '#32262F',
  offWhite: '#F8F8F3', // panel inferior claro
  white: '#FFFFFF',
  ink: '#17222B', // texto principal sobre claro
  mutedLight: '#9EB5C5', // texto secundario sobre oscuro
  mutedDark: '#7D8990', // texto secundario sobre claro
  borderDark: '#1C465C', // separadores sobre navy
  borderLight: '#E6E7E2', // separadores sobre off-white
  paleCoral: '#FFF0ED',
  paleTurquoise: '#E5FAFC',
  paleYellow: '#FFF8D9',
} as const;

/**
 * Escala de espaciado: multiplos de 4.
 *   space(5) = 20px  -> margen lateral de pantalla
 */
export const space = (n: number) => n * 4;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24, // tarjetas de cuenta
  xl: 30, // tarjetas grandes
  sheet: 34, // esquinas superiores del panel claro
  pill: 999,
} as const;

export const font = {
  h1: 34,
  h2: 24,
  h3: 18,
  body: 15,
  small: 13,
  tiny: 11,
  /** El saldo del Inicio: la cifra protagonista. */
  hero: 46,
} as const;
