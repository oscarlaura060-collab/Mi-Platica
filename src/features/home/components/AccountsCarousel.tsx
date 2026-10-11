import React from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import {
  ChevronRight,
  CreditCard,
  Landmark,
  PiggyBank,
  Wallet,
  Banknote,
} from 'lucide-react-native';
import { BRAND, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme';
import { Button, Txt } from '@/components/ui';
import { Skeleton } from '@/components/Skeleton';
import { money } from '@/utils/money';
import type { AccountBalance } from '@/db/types';

/** Los colores rotan para que el carrusel se lea de un vistazo. */
const FONDOS = [BRAND.turquoise, BRAND.yellow, BRAND.coral] as const;

const ICONOS = {
  bank: Landmark,
  wallet: Wallet,
  cash: Banknote,
  credit_card: CreditCard,
  savings: PiggyBank,
  other: Wallet,
} as const;

function SectionHeader({ onSeeAll }: { onSeeAll: () => void }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Txt variant="h3" color={BRAND.white} weight="800">
        Mis cuentas
      </Txt>
      <Pressable
        onPress={onSeeAll}
        accessibilityRole="button"
        accessibilityLabel="Ver todas las cuentas"
        hitSlop={10}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 2,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Txt variant="small" color={BRAND.mutedLight} weight="600">
          Ver todas
        </Txt>
        <ChevronRight size={16} color={BRAND.mutedLight} strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

function AccountCard({
  account,
  bg,
  width,
  onPress,
  isPrimary,
}: {
  account: AccountBalance;
  bg: string;
  width: number;
  onPress: () => void;
  isPrimary: boolean;
}) {
  const t = useTheme();
  const Icon = ICONOS[account.type] ?? Wallet;
  const esTarjeta = account.type === 'credit_card';
  // En una tarjeta de credito el saldo es deuda: se muestra lo que debe.
  const valor = esTarjeta ? Math.max(-account.balance, 0) : account.balance;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        `${account.name}, ${esTarjeta ? 'debes' : 'saldo'} ${money(valor)}` +
        (isPrimary ? ', cuenta principal' : '')
      }
      style={({ pressed }) => ({
        width,
        backgroundColor: bg,
        borderRadius: radius.lg,
        padding: space(4),
        opacity: pressed ? 0.9 : 1,
        transform: pressed && !t.reduceMotion ? [{ scale: 0.985 }] : undefined,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(3) }}>
        {/* Cuadro del icono: contrasta con el fondo de color de la tarjeta */}
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: 'rgba(7,26,42,0.12)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={22} color={BRAND.navy} strokeWidth={2.2} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt variant="body" color={BRAND.navy} weight="700" numberOfLines={1}>
            {account.name}
          </Txt>
          <Txt
            variant="h3"
            color={BRAND.navy}
            weight="800"
            numberOfLines={1}
            style={{ fontSize: 22 }}
          >
            {money(valor)}
          </Txt>
          {isPrimary ? (
            <Txt variant="small" color="rgba(7,26,42,0.62)" weight="600">
              Cuenta principal
            </Txt>
          ) : esTarjeta ? (
            <Txt variant="small" color="rgba(7,26,42,0.62)" weight="600">
              Lo que debes
            </Txt>
          ) : null}
        </View>

        <ChevronRight size={22} color="rgba(7,26,42,0.55)" strokeWidth={2.5} />
      </View>
    </Pressable>
  );
}

/**
 * Carrusel horizontal de cuentas.
 *
 * El ancho de tarjeta deja ver un trozo de la siguiente: es la pista de
 * que se puede deslizar, sin necesidad de puntos ni flechas.
 */
export function AccountsCarousel({
  accounts,
  primaryId,
  loading,
  onSeeAll,
  onOpen,
  onCreate,
}: {
  accounts: AccountBalance[];
  primaryId: number | null;
  loading?: boolean;
  onSeeAll: () => void;
  onOpen: (a: AccountBalance) => void;
  onCreate: () => void;
}) {
  const { width } = useWindowDimensions();
  const margen = space(5);
  // 78% del ancho util deja asomar la siguiente tarjeta.
  const anchoTarjeta = Math.min((width - margen * 2) * 0.86, 330);

  return (
    <View>
      <SectionHeader onSeeAll={onSeeAll} />
      <View style={{ height: space(3) }} />

      {loading ? (
        <View style={{ flexDirection: 'row', gap: space(3) }}>
          <Skeleton width={anchoTarjeta} height={96} radius={radius.lg} onDark />
          <Skeleton width={anchoTarjeta * 0.5} height={96} radius={radius.lg} onDark />
        </View>
      ) : accounts.length === 0 ? (
        <View
          style={{
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: BRAND.borderDark,
            padding: space(5),
            alignItems: 'center',
          }}
        >
          <Txt variant="body" color={BRAND.white} weight="700" align="center">
            Aun no tienes cuentas
          </Txt>
          <View style={{ height: space(1.5) }} />
          <Txt variant="small" color={BRAND.mutedLight} align="center">
            Agrega Nequi, Daviplata, efectivo o la que uses.
          </Txt>
          <View style={{ height: space(3.5) }} />
          <Button label="Agregar cuenta" size="sm" onPress={onCreate} />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={anchoTarjeta + space(3)}
          snapToAlignment="start"
          // El carrusel se sale del margen para que la tarjeta cortada
          // llegue hasta el borde de la pantalla.
          style={{ marginHorizontal: -margen }}
          contentContainerStyle={{
            paddingHorizontal: margen,
            gap: space(3),
          }}
        >
          {accounts.map((a, i) => (
            <AccountCard
              key={a.id}
              account={a}
              bg={FONDOS[i % FONDOS.length]}
              width={anchoTarjeta}
              isPrimary={a.id === primaryId}
              onPress={() => onOpen(a)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
