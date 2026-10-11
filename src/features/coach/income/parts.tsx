import React from 'react';
import { Animated, Easing, Image, Pressable, Text, View } from 'react-native';
import { Check, ChevronRight } from 'lucide-react-native';
import { BRAND, radius, space } from '@/theme/tokens';
import { money } from '@/utils/money';
import type { IncomeCoachStep } from '@/domain/coach/incomePlan';

/**
 * PIEZAS DEL COACH DE INGRESOS
 *
 * Este flujo se pinta SIEMPRE claro, siga el telefono el tema que siga.
 * No es un descuido: es un recorrido corto y guiado de cinco pantallas,
 * aprobado asi en el diseño, y cambiarle los colores a la mitad lo
 * volveria otra cosa. El resto de la app si respeta el tema.
 */
export const C = {
  header: BRAND.navy,
  fondo: BRAND.offWhite,
  tarjeta: BRAND.white,
  borde: BRAND.borderLight,
  texto: BRAND.ink,
  textoSuave: BRAND.mutedDark,
  cta: BRAND.yellow,
  ctaTexto: BRAND.navy,
} as const;

export const PASOS: IncomeCoachStep[] = [
  'recommendation',
  'selection',
  'accounts',
  'review',
  'applied',
];

export const TITULO_PASO: Record<IncomeCoachStep, string> = {
  recommendation: 'Tu coach',
  selection: '¿Qué quieres aplicar?',
  accounts: '¿Desde dónde y hacia dónde?',
  review: 'Revisa tu plan',
  applied: 'Mi Platica',
};

/** El simbolo de la marca, pequeño, en la esquina del header. */
export function Simbolo({ size = 30 }: { size?: number }) {
  return (
    <Image
      source={require('../../../../assets/symbol.png')}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessible={false}
    />
  );
}

/** Tarjeta blanca con borde suave, el contenedor de todo el flujo. */
export function Panel({
  children,
  tono = 'blanco',
  style,
}: {
  children: React.ReactNode;
  tono?: 'blanco' | 'turquesa' | 'amarillo' | 'coral';
  style?: object;
}) {
  const fondo = {
    blanco: C.tarjeta,
    turquesa: BRAND.paleTurquoise,
    amarillo: BRAND.paleYellow,
    coral: BRAND.paleCoral,
  }[tono];
  const borde = {
    blanco: C.borde,
    turquesa: BRAND.turquoise + '44',
    amarillo: BRAND.yellow + '66',
    coral: BRAND.coral + '44',
  }[tono];

  return (
    <View
      style={[
        {
          backgroundColor: fondo,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: borde,
          padding: space(4),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Texto del flujo. No usa el tema: los colores son los del diseño. */
export function T({
  children,
  size = 15,
  weight = '500',
  color = C.texto,
  align,
  lines,
  style,
  a11y,
  header,
}: {
  children: React.ReactNode;
  size?: number;
  weight?: '400' | '500' | '600' | '700' | '800';
  color?: string;
  align?: 'left' | 'center' | 'right';
  lines?: number;
  style?: object;
  a11y?: string;
  header?: boolean;
}) {
  return (
    <Text
      numberOfLines={lines}
      accessibilityLabel={a11y}
      accessibilityRole={header ? 'header' : undefined}
      style={[{ color, fontSize: size, fontWeight: weight, textAlign: align }, style]}
    >
      {children}
    </Text>
  );
}

/** Boton pastilla amarillo: el CTA principal de todos los pasos. */
export function BotonCTA({
  label,
  onPress,
  disabled,
  tono = 'solido',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tono?: 'solido' | 'contorno';
}) {
  const solido = tono === 'solido';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => ({
        minHeight: 54,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.pill,
        backgroundColor: solido ? C.cta : 'transparent',
        borderWidth: solido ? 0 : 1.5,
        borderColor: C.borde,
        opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
      })}
    >
      <T size={16} weight="800" color={solido ? C.ctaTexto : C.texto}>
        {label}
      </T>
    </Pressable>
  );
}

/**
 * Indicador de paso.
 *
 * Los pasos ya hechos llevan un color distinto Y mas corto; el actual es
 * el mas largo. El estado nunca depende solo del color: el lector de
 * pantalla recibe "Paso N de 5" con su nombre.
 */
export function ProgresoPasos({ paso }: { paso: IncomeCoachStep }) {
  const i = PASOS.indexOf(paso);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Paso ${i + 1} de ${PASOS.length}: ${TITULO_PASO[paso]}`}
      style={{ flexDirection: 'row', gap: space(1.5), alignItems: 'center' }}
    >
      {PASOS.map((p, n) => (
        <View
          key={p}
          style={{
            height: 5,
            flex: n === i ? 2 : 1,
            borderRadius: 3,
            backgroundColor:
              n < i ? BRAND.turquoiseDark : n === i ? BRAND.turquoise : BRAND.borderDark,
          }}
        />
      ))}
    </View>
  );
}

/** Cuadro redondeado con el icono de la bolsa, como en el diseño. */
export function IconoBolsa({
  Icon,
  color,
  size = 46,
}: {
  Icon: typeof Check;
  color: string;
  size?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 14,
        backgroundColor: color + '24',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon size={size * 0.47} color={color} strokeWidth={2.2} />
    </View>
  );
}

/** Fila: icono, titulo, subtitulo, monto y (opcional) chevron. */
export function FilaDestino({
  Icon,
  color,
  titulo,
  subtitulo,
  monto,
  onPress,
  a11y,
  punto,
  borde = true,
}: {
  Icon: typeof Check;
  color: string;
  titulo: string;
  subtitulo?: string | null;
  monto: number;
  onPress?: () => void;
  a11y?: string;
  /** Punto de color a la derecha, como en la pantalla final. */
  punto?: boolean;
  borde?: boolean;
}) {
  const Comp: React.ElementType = onPress ? Pressable : View;
  return (
    <Comp
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={
        a11y ?? `${titulo}${subtitulo ? `, ${subtitulo}` : ''}, ${money(monto)}`
      }
      style={({ pressed }: { pressed?: boolean } = {}) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space(3),
        minHeight: 64,
        paddingVertical: space(2.5),
        borderBottomWidth: borde ? 1 : 0,
        borderBottomColor: C.borde,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <IconoBolsa Icon={Icon} color={color} size={42} />

      <View style={{ flex: 1, minWidth: 0 }}>
        <T size={15} weight="700" lines={1}>
          {titulo}
        </T>
        {subtitulo ? (
          <T size={13} weight="500" color={C.textoSuave} lines={1}>
            {subtitulo}
          </T>
        ) : null}
      </View>

      {/* El monto nunca se trunca: es el dato que importa. */}
      <T size={15} weight="800" lines={1}>
        {money(monto)}
      </T>

      {punto ? (
        <View
          style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: color }}
        />
      ) : null}
      {onPress ? (
        <ChevronRight size={20} color={C.textoSuave} strokeWidth={2.4} />
      ) : null}
    </Comp>
  );
}

/** Casilla cuadrada. Marcada = relleno de color con check negro. */
export function Casilla({ marcada, color }: { marcada: boolean; color: string }) {
  return (
    <View
      style={{
        width: 26,
        height: 26,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: marcada ? color : BRAND.borderLight,
        backgroundColor: marcada ? color : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {marcada ? <Check size={17} color={BRAND.navy} strokeWidth={3.4} /> : null}
    </View>
  );
}

/** Barra que crece desde cero al entrar. */
export function BarraProporcion({
  porcentaje,
  color,
  animar,
}: {
  porcentaje: number;
  color: string;
  animar: boolean;
}) {
  const v = React.useRef(new Animated.Value(animar ? 0 : 1)).current;

  React.useEffect(() => {
    if (!animar) {
      v.setValue(1);
      return;
    }
    Animated.timing(v, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      // El ancho en % no puede ir por el hilo nativo.
      useNativeDriver: false,
    }).start();
  }, [animar, v]);

  return (
    <View
      style={{
        height: 6,
        borderRadius: 3,
        backgroundColor: BRAND.borderLight,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={{
          width: v.interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', `${Math.max(0, Math.min(100, porcentaje))}%`],
          }),
          height: '100%',
          borderRadius: 3,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

/** Aviso con icono (i). Amarillo para la nota de aplicar, turquesa para informar. */
export function Aviso({
  texto,
  tono = 'turquesa',
}: {
  texto: string;
  tono?: 'turquesa' | 'amarillo';
}) {
  const amarillo = tono === 'amarillo';
  return (
    <Panel tono={amarillo ? 'amarillo' : 'turquesa'} style={{ padding: space(3.5) }}>
      <View style={{ flexDirection: 'row', gap: space(2.5), alignItems: 'flex-start' }}>
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: amarillo ? BRAND.yellow : BRAND.turquoise,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <T size={13} weight="800" color={BRAND.navy}>
            i
          </T>
        </View>
        <T size={13.5} weight="500" style={{ flex: 1, lineHeight: 19 }}>
          {texto}
        </T>
      </View>
    </Panel>
  );
}

const ESTRELLAS = [
  { x: -92, y: -14, d: 9, c: BRAND.yellow, t: 0 },
  { x: 84, y: -34, d: 7, c: BRAND.turquoise, t: 90 },
  { x: -62, y: -70, d: 6, c: BRAND.turquoise, t: 170 },
  { x: 66, y: 46, d: 8, c: BRAND.yellow, t: 60 },
  { x: -78, y: 54, d: 6, c: BRAND.coral, t: 220 },
  { x: 98, y: 16, d: 5, c: BRAND.yellow, t: 140 },
  { x: -30, y: -92, d: 5, c: BRAND.yellow, t: 200 },
  { x: 34, y: 84, d: 6, c: BRAND.turquoise, t: 260 },
];

/**
 * El check final con las estrellitas.
 *
 * Es el unico momento del flujo que celebra algo, y dura poco: el circulo
 * entra con una escala corta y las estrellas aparecen alrededor una tras
 * otra y se quedan quietas. Nada se repite en bucle, nada retrasa la
 * confirmacion (el plan YA se guardo antes de llegar aqui) y si el
 * telefono pide reducir movimiento se dibuja todo quieto.
 */
export function CheckConEstrellas({ reduceMotion }: { reduceMotion: boolean }) {
  const circulo = React.useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const estrellas = React.useRef(
    ESTRELLAS.map(() => new Animated.Value(reduceMotion ? 1 : 0)),
  ).current;

  React.useEffect(() => {
    if (reduceMotion) return;
    Animated.sequence([
      Animated.spring(circulo, {
        toValue: 1,
        friction: 6,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.stagger(
        45,
        estrellas.map((e) =>
          Animated.spring(e, {
            toValue: 1,
            friction: 5,
            tension: 120,
            useNativeDriver: true,
          }),
        ),
      ),
    ]).start();
  }, [circulo, estrellas, reduceMotion]);

  return (
    <View
      style={{ width: 240, height: 200, alignItems: 'center', justifyContent: 'center' }}
      accessible
      accessibilityLabel="Listo"
    >
      {ESTRELLAS.map((e, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            transform: [
              { translateX: e.x },
              { translateY: e.y },
              { scale: estrellas[i] },
              {
                rotate: estrellas[i].interpolate({
                  inputRange: [0, 1],
                  outputRange: [`${e.t - 60}deg`, `${e.t}deg`],
                }),
              },
            ],
            opacity: estrellas[i],
          }}
        >
          <Estrella size={e.d * 2.6} color={e.c} />
        </Animated.View>
      ))}

      <Animated.View
        style={{
          width: 104,
          height: 104,
          borderRadius: 52,
          backgroundColor: BRAND.paleTurquoise,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: circulo }],
        }}
      >
        <Check size={52} color={BRAND.turquoiseDark} strokeWidth={3.2} />
      </Animated.View>
    </View>
  );
}

/**
 * Estrella de cuatro puntas hecha con dos rombos cruzados.
 *
 * Se dibuja con Views y no con SVG para no montar otra dependencia en el
 * arbol por ocho adornos que aparecen una sola vez.
 */
function Estrella({ size, color }: { size: number; color: string }) {
  const brazo = {
    position: 'absolute' as const,
    width: size,
    height: size,
    backgroundColor: color,
    borderRadius: size * 0.22,
  };
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[brazo, { transform: [{ rotate: '45deg' }, { scaleX: 0.34 }] }]} />
      <View style={[brazo, { transform: [{ rotate: '45deg' }, { scaleY: 0.34 }] }]} />
    </View>
  );
}
