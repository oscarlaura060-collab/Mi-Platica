import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { Bell, Settings } from 'lucide-react-native';
import { BRAND, space } from '@/theme/tokens';
import { Txt } from '@/components/ui';

/** El simbolo de la marca, pequeño. Nunca el wordmark en esta pantalla. */
function BrandMark() {
  return (
    <Image
      source={require('../../../../assets/symbol.png')}
      style={{ width: 44, height: 44 }}
      resizeMode="contain"
      accessibilityLabel="Mi Platica"
    />
  );
}

/** Boton circular del header. Area tactil de 44x44 aunque el icono sea menor. */
function HeaderButton({
  onPress,
  label,
  children,
  badge,
}: {
  onPress: () => void;
  label: string;
  children: React.ReactNode;
  badge?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {children}
      {badge ? (
        <View
          accessibilityElementsHidden
          style={{
            position: 'absolute',
            top: 7,
            right: 7,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: BRAND.coral,
            borderWidth: 2,
            borderColor: BRAND.navy,
          }}
        />
      ) : null}
    </Pressable>
  );
}

/**
 * Fila superior: quien usa la app y los dos accesos de sistema.
 * El saludo es secundario; el nombre manda.
 */
export function HomeHeader({
  greeting,
  name,
  hasAlerts,
  onNotifications,
  onSettings,
}: {
  greeting: string;
  name: string;
  hasAlerts: boolean;
  onNotifications: () => void;
  onSettings: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space(3),
      }}
    >
      <BrandMark />

      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt variant="body" color={BRAND.mutedLight} weight="500">
          {greeting},
        </Txt>
        <Txt variant="h2" color={BRAND.white} weight="800" numberOfLines={1}>
          {name}
        </Txt>
      </View>

      <HeaderButton
        onPress={onNotifications}
        label={
          hasAlerts
            ? 'Notificaciones, tienes avisos sin revisar'
            : 'Notificaciones'
        }
        badge={hasAlerts}
      >
        <Bell size={24} color={BRAND.white} strokeWidth={2} />
      </HeaderButton>

      <HeaderButton onPress={onSettings} label="Ajustes">
        <Settings size={24} color={BRAND.white} strokeWidth={2} />
      </HeaderButton>
    </View>
  );
}
