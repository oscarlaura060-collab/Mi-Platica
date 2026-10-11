import React, { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { RootNav } from './types';
import {
  ArrowDownToLine,
  ArrowUp,
  ArrowLeftRight,
  House,
  PiggyBank,
  Plus,
  Receipt,
  User,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { BRAND, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme';
import { Txt } from '@/components/ui';

const ICONOS = {
  Home: House,
  Movements: Receipt,
  Savings: PiggyBank,
  Profile: User,
} as const;

const ETIQUETAS: Record<string, string> = {
  Home: 'Inicio',
  Movements: 'Movimientos',
  Savings: 'Ahorro',
  Profile: 'Perfil',
};

/**
 * Barra inferior con el boton flotante central.
 *
 * Se escribe a mano (no `tabBarButton`) porque el boton central NO es una
 * pestaña: no navega a una quinta pantalla, abre un menu de registro. Las
 * cuatro pestañas reales se reparten dejando el hueco del centro, para
 * que el boton nunca tape una etiqueta.
 */
export function BottomBar({ state, navigation }: BottomTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const root = useNavigation<RootNav>();
  const [menu, setMenu] = useState(false);

  const fondo = t.mode === 'dark' ? t.bgElevated : BRAND.offWhite;
  const borde = t.mode === 'dark' ? t.border : BRAND.borderLight;
  const inactivo = t.mode === 'dark' ? t.textFaint : BRAND.mutedDark;

  const ir = (nombre: string, index: number) => {
    const foco = state.index === index;
    const evento = navigation.emit({
      type: 'tabPress',
      target: state.routes[index].key,
      canPreventDefault: true,
    });
    if (!foco && !evento.defaultPrevented) navigation.navigate(nombre);
  };

  const Pestana = ({ index }: { index: number }) => {
    const route = state.routes[index];
    const activo = state.index === index;
    const Icon = ICONOS[route.name as keyof typeof ICONOS] ?? House;
    const etiqueta = ETIQUETAS[route.name] ?? route.name;
    const color = activo ? BRAND.turquoise : inactivo;

    return (
      <Pressable
        onPress={() => ir(route.name, index)}
        accessibilityRole="tab"
        accessibilityState={{ selected: activo }}
        accessibilityLabel={etiqueta}
        style={({ pressed }) => ({
          flex: 1,
          minHeight: 52,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Icon size={23} color={color} strokeWidth={activo ? 2.5 : 2} />
        <Txt variant="tiny" color={color} weight={activo ? '800' : '600'}>
          {etiqueta}
        </Txt>
        {/* Subrayado: el estado activo no depende solo del color. */}
        <View
          style={{
            height: 3,
            width: activo ? 22 : 0,
            borderRadius: 2,
            backgroundColor: BRAND.turquoise,
            marginTop: 1,
          }}
        />
      </Pressable>
    );
  };

  const OpcionMenu = ({
    Icon,
    label,
    color,
    onPress,
  }: {
    Icon: typeof ArrowUp;
    label: string;
    color: string;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space(3.5),
        minHeight: 60,
        paddingHorizontal: space(4),
        borderRadius: radius.md,
        backgroundColor: pressed ? t.cardAlt : 'transparent',
      })}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: color + '26',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={22} color={color} strokeWidth={2.3} />
      </View>
      <Txt variant="body" weight="700">
        {label}
      </Txt>
    </Pressable>
  );

  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          backgroundColor: fondo,
          borderTopWidth: 1,
          borderTopColor: borde,
          paddingTop: space(2),
          paddingBottom: insets.bottom > 0 ? insets.bottom : space(2),
        }}
      >
        <Pestana index={0} />
        <Pestana index={1} />

        {/* Hueco para el boton flotante */}
        <View style={{ width: 72 }} />

        <Pestana index={2} />
        <Pestana index={3} />
      </View>

      {/* Boton flotante: sobresale sin tapar ninguna etiqueta */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: (insets.bottom > 0 ? insets.bottom : space(2)) + space(7),
          alignItems: 'center',
        }}
      >
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
              () => undefined,
            );
            setMenu(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Agregar movimiento"
          style={({ pressed }) => ({
            width: 62,
            height: 62,
            borderRadius: 31,
            backgroundColor: BRAND.turquoise,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 4,
            borderColor: fondo,
            opacity: pressed ? 0.9 : 1,
            transform: pressed && !t.reduceMotion ? [{ scale: 0.94 }] : undefined,
            ...t.shadow,
          })}
        >
          <Plus size={30} color={BRAND.navy} strokeWidth={3} />
        </Pressable>
      </View>

      {/* Menu de registro rapido */}
      <Modal
        visible={menu}
        transparent
        animationType={t.reduceMotion ? 'none' : 'fade'}
        onRequestClose={() => setMenu(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: t.overlay }}
          onPress={() => setMenu(false)}
          accessibilityLabel="Cerrar menú"
        />
        <View
          style={{
            position: 'absolute',
            left: space(4),
            right: space(4),
            bottom: insets.bottom + space(22),
            backgroundColor: t.bgElevated,
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: t.border,
            padding: space(3),
            ...t.shadow,
          }}
        >
          <OpcionMenu
            Icon={ArrowDownToLine}
            label="Registrar ingreso"
            color={BRAND.turquoise}
            onPress={() => {
              setMenu(false);
              root.navigate('QuickAdd', { type: 'income' });
            }}
          />
          <OpcionMenu
            Icon={ArrowUp}
            label="Registrar gasto"
            color={BRAND.coral}
            onPress={() => {
              setMenu(false);
              root.navigate('QuickAdd', { type: 'expense' });
            }}
          />
          <OpcionMenu
            Icon={ArrowLeftRight}
            label="Agregar transferencia"
            color={BRAND.yellow}
            onPress={() => {
              setMenu(false);
              // El traslado entre cuentas se hace desde la cuenta origen.
              root.navigate('Accounts');
            }}
          />
        </View>
      </Modal>
    </>
  );
}
