import React from 'react';
import { View } from 'react-native';
import { BRAND, font, space } from '@/theme/tokens';
import { Txt } from '@/components/ui';
import { Skeleton } from '@/components/Skeleton';
import { money } from '@/utils/money';

/**
 * El foco de la pantalla: cuanta plata hay de verdad disponible.
 *
 * No es una tarjeta: va integrado en el header oscuro para que la cifra
 * respire y no compita con un borde.
 *
 * `amount` es el DISPONIBLE REAL (saldo menos compromisos), no el saldo
 * bruto. El subtitulo lo dice explicitamente para que nadie confunda las
 * dos cifras.
 */
export function BalanceSummary({
  amount,
  loading,
  caption = 'Despues de compromisos',
  accountName,
}: {
  amount: number;
  loading?: boolean;
  caption?: string;
  /** Nombre de la cuenta principal, si hay una marcada. */
  accountName?: string | null;
}) {
  const negativo = amount < 0;

  // Con cifras muy largas se reduce el tamaño antes que partir el numero
  // en dos lineas, que rompe la lectura.
  const texto = money(amount);
  const size =
    texto.length > 14 ? font.h1 : texto.length > 11 ? font.hero * 0.8 : font.hero;

  return (
    <View>
      <Txt variant="h3" color={BRAND.mutedLight} weight="500">
        {accountName ? `Disponible en ${accountName}` : 'Saldo disponible'}
      </Txt>

      <View style={{ height: space(2) }} />

      {loading ? (
        <Skeleton width="70%" height={size * 0.9} radius={12} onDark />
      ) : (
        <Txt
          color={negativo ? BRAND.coral : BRAND.white}
          weight="800"
          numberOfLines={1}
          accessibilityLabel={`${caption}, ${texto}`}
          style={{ fontSize: size, letterSpacing: -1.2, lineHeight: size * 1.1 }}
        >
          {texto}
        </Txt>
      )}

      <View style={{ height: space(1.5) }} />
      <Txt variant="body" color={BRAND.mutedLight} weight="500">
        {caption}
      </Txt>
    </View>
  );
}
