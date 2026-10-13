import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { Bell, Moon, Settings, Sun } from 'lucide-react-native';
import { BRAND, space } from '@/theme/tokens';
import { useTheme } from '@/theme';
import { Txt } from '@/components/ui';

/** El simbolo de la marca, pequeño. Nunca el wordmark en esta pantalla. */
function BrandMark() {
  return (
    <Image
      source={require('../../../../assets/symbol.png')}
      style={{ width: 42, height: 42 }}
      resizeMode="contain"
      accessibilityLabel="Mi Platica"
    />
  );
}

/** Boton circular del header. Area tactil >= 48x48 con hitSlop. */
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
      hitSlop={10}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? 'rgba(255,255,255,0.08)' : 'transparent',
        opacity: pressed ? 0.75 : 1,
      })}
    >
      {children}
      {badge ? (
        <View
          accessibilityElementsHidden
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 9,
            height: 9,
            borderRadius: 4.5,
            backgroundColor: BRAND.coral,
            borderWidth: 1.5,
            borderColor: BRAND.navy,
          }}
        />
      ) : null}
    </Pressable>
  );
}

/**
 * Fila superior: quien usa la app, cambio de tema y accesos rápidos.
 */
export function HomeHeader({
  greeting,
  name,
  hasAlerts,
  onNotifications,
  onSettings,
  onToggleTheme,
  isDark,
}: {
  greeting: string;
  name: string;
  hasAlerts: boolean;
  onNotifications: () => void;
  onSettings: () => void;
  onToggleTheme?: () => void;
  isDark?: boolean;
}) {
  const t = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space(2.5),
      }}
    >
      <BrandMark />

      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt variant="tiny" color={BRAND.mutedLight} weight="600" style={{ letterSpacing: 0.3 }}>
          {greeting.toUpperCase()}
        </Txt>
        <Txt variant="h2" color={BRAND.onSurface} weight="800" numberOfLines={1}>
          {name}
        </Txt>
      </View>

      {onToggleTheme ? (
        <HeaderButton
          onPress={onToggleTheme}
          label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {isDark ? (
            <Sun size={22} color={BRAND.yellow} strokeWidth={2.2} />
          ) : (
            <Moon size={22} color={BRAND.onSurface} strokeWidth={2.2} />
          )}
        </HeaderButton>
      ) : null}

      <HeaderButton
        onPress={onNotifications}
        label={
          hasAlerts
            ? 'Notificaciones, tienes avisos pendientes'
            : 'Notificaciones'
        }
        badge={hasAlerts}
      >
        <Bell size={22} color={BRAND.onSurface} strokeWidth={2.2} />
      </HeaderButton>

      <HeaderButton onPress={onSettings} label="Ajustes">
        <Settings size={22} color={BRAND.onSurface} strokeWidth={2.2} />
      </HeaderButton>
    </View>
  );
}
