import React from 'react';
import { Pressable, View } from 'react-native';
import { ArrowDownToLine, ArrowUp, ShieldCheck } from 'lucide-react-native';
import { BRAND, font, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme';
import { Txt } from '@/components/ui';
import { Skeleton } from '@/components/Skeleton';
import { money } from '@/utils/money';

/**
 * HÉROE: OLA FINANCIERA (Stitch v4)
 *
 * Foco visual número 1: cuánta plata hay libre después de compromisos
 * y el siguiente paso inmediato (+ Ingreso / - Gasto).
 */
export function BalanceSummary({
  amount,
  loading,
  caption = 'Después de compromisos',
  accountName,
  commitmentsCovered = true,
  commitmentsAmount,
  onIncome,
  onExpense,
}: {
  amount: number;
  loading?: boolean;
  caption?: string;
  accountName?: string | null;
  commitmentsCovered?: boolean;
  commitmentsAmount?: number;
  onIncome?: () => void;
  onExpense?: () => void;
}) {
  const t = useTheme();
  const negativo = amount < 0;

  const texto = money(amount);
  const size =
    texto.length > 14
      ? font.h1
      : texto.length > 11
        ? font.displayCurrencyMobile
        : font.displayCurrency;

  return (
    <View
      style={{
        backgroundColor: BRAND.surfaceContainerLow,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: BRAND.borderDark,
        padding: space(5),
        overflow: 'hidden',
      }}
    >
      {/* 1. Header del Hero: Etiqueta + Badge de Estado */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Txt
          variant="tiny"
          color={BRAND.turquoise}
          weight="800"
          style={{ letterSpacing: 0.8 }}
        >
          {accountName ? `DISPONIBLE EN ${accountName.toUpperCase()}` : 'SALDO DISPONIBLE'}
        </Txt>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingHorizontal: space(2.5),
            paddingVertical: space(1),
            borderRadius: radius.pill,
            backgroundColor: 'rgba(20, 196, 212, 0.12)',
            borderWidth: 1,
            borderColor: 'rgba(20, 196, 212, 0.25)',
          }}
        >
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: BRAND.turquoise,
            }}
          />
          <Txt variant="tiny" color={BRAND.turquoise} weight="700">
            Al día
          </Txt>
        </View>
      </View>

      <View style={{ height: space(2.5) }} />

      {/* 2. Cifra Protagonista */}
      {loading ? (
        <Skeleton width="75%" height={size * 1.1} radius={12} onDark />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space(1.5) }}>
          <Txt
            color={negativo ? BRAND.coral : BRAND.white}
            weight="800"
            numberOfLines={1}
            accessibilityLabel={`${caption}, ${texto}`}
            style={{ fontSize: size, letterSpacing: -1, lineHeight: size * 1.15 }}
          >
            {texto}
          </Txt>
          <Txt variant="h3" color={BRAND.mutedLight} weight="700">
            COP
          </Txt>
        </View>
      )}

      <View style={{ height: space(1) }} />

      {/* Subtítulo tranquilizador y sin culpa */}
      <Txt variant="small" color={BRAND.mutedLight} weight="500">
        {caption}
      </Txt>

      {/* 3. Mini Badge de Compromisos */}
      {commitmentsAmount !== undefined && commitmentsAmount > 0 ? (
        <View
          style={{
            marginTop: space(3),
            flexDirection: 'row',
            alignItems: 'center',
            gap: space(2),
            backgroundColor: 'rgba(15, 33, 49, 0.85)',
            paddingVertical: space(1.5),
            paddingHorizontal: space(3),
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: 'rgba(28, 70, 92, 0.6)',
            alignSelf: 'flex-start',
          }}
        >
          <ShieldCheck size={16} color={BRAND.turquoise} strokeWidth={2.4} />
          <Txt variant="tiny" color={BRAND.mutedLight} weight="600">
            Compromisos del mes:{' '}
            <Txt variant="tiny" color={BRAND.white} weight="700">
              {commitmentsCovered ? '100% cubiertos' : 'Pendientes'} ({money(commitmentsAmount)} COP)
            </Txt>
          </Txt>
        </View>
      ) : null}

      {/* 4. Siguiente paso claro: Botones gemelos táctiles */}
      {onIncome && onExpense ? (
        <View
          style={{
            flexDirection: 'row',
            gap: space(3),
            marginTop: space(5),
            paddingTop: space(2),
          }}
        >
          <Pressable
            onPress={onIncome}
            accessibilityRole="button"
            accessibilityLabel="Registrar ingreso"
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 48,
              height: 48,
              borderRadius: radius.pill,
              backgroundColor: BRAND.turquoise,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: space(2),
              opacity: pressed ? 0.85 : 1,
              transform: pressed && !t.reduceMotion ? [{ scale: 0.98 }] : undefined,
            })}
          >
            <ArrowDownToLine size={19} color={BRAND.navy} strokeWidth={2.5} />
            <Txt variant="body" color={BRAND.navy} weight="800">
              Ingreso
            </Txt>
          </Pressable>

          <Pressable
            onPress={onExpense}
            accessibilityRole="button"
            accessibilityLabel="Registrar gasto"
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 48,
              height: 48,
              borderRadius: radius.pill,
              backgroundColor: BRAND.surfaceContainerHigh,
              borderWidth: 1,
              borderColor: BRAND.borderDark,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: space(2),
              opacity: pressed ? 0.85 : 1,
              transform: pressed && !t.reduceMotion ? [{ scale: 0.98 }] : undefined,
            })}
          >
            <ArrowUp size={19} color={BRAND.coral} strokeWidth={2.5} />
            <Txt variant="body" color={BRAND.white} weight="800">
              Gasto
            </Txt>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
