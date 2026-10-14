import React from 'react';
import { Pressable, View } from 'react-native';
import {
  ArrowDownToLine,
  ArrowUp,
  Bus,
  ChevronRight,
  CreditCard,
  House,
  PiggyBank,
  ShoppingCart,
  Utensils,
  Zap,
} from 'lucide-react-native';
import { BRAND, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme';
import { Button, Txt } from '@/components/ui';
import { Skeleton } from '@/components/Skeleton';
import { money } from '@/utils/money';
import type { TransactionRow } from '@/db/types';

/**
 * Icono por categoria. Se busca por palabra clave del nombre porque las
 * categorias las puede crear el usuario: asi una categoria nueva llamada
 * "Mercado del barrio" igual recibe el carrito.
 */
function iconoPara(tx: TransactionRow) {
  if (tx.type === 'income') return ArrowDownToLine;
  if (tx.type === 'debt_payment') return CreditCard;
  if (tx.type === 'goal_deposit') return PiggyBank;

  const n = (tx.category_name ?? '').toLowerCase();
  if (n.includes('mercado') || n.includes('compra')) return ShoppingCart;
  if (n.includes('transporte')) return Bus;
  if (n.includes('comida') || n.includes('restaurante')) return Utensils;
  if (n.includes('servicio') || n.includes('luz')) return Zap;
  if (n.includes('arriendo') || n.includes('casa')) return House;
  return ArrowUp;
}

function tituloDe(tx: TransactionRow): string {
  if (tx.type === 'debt_payment') return tx.debt_name ?? 'Abono a deuda';
  if (tx.type === 'goal_deposit') return tx.note || 'Aporte a meta';
  if (tx.type === 'transfer') return 'Traslado';
  return tx.note || tx.category_name || (tx.type === 'income' ? 'Ingreso' : 'Gasto');
}

function subtituloDe(tx: TransactionRow): string {
  const tipo =
    tx.type === 'income'
      ? 'Ingreso'
      : tx.type === 'transfer'
        ? 'Traslado'
        : tx.type === 'debt_payment'
          ? 'Abono'
          : tx.type === 'goal_deposit'
            ? 'Ahorro'
            : 'Gasto';
  return `${tipo} · ${tx.account_name}`;
}

export function TransactionRowItem({
  tx,
  onPress,
  last,
}: {
  tx: TransactionRow;
  onPress: () => void;
  last?: boolean;
}) {
  const t = useTheme();
  const Icon = iconoPara(tx);
  const entra = tx.type === 'income';
  const neutro = tx.type === 'goal_deposit' || tx.type === 'transfer';

  // El signo acompaña al color: el color nunca es la unica señal.
  const signo = entra ? '+' : neutro ? '' : '−';
  const colorValor = entra
    ? BRAND.turquoiseDark
    : neutro
      ? BRAND.ink
      : BRAND.coral;
  const fondoIcono = entra
    ? BRAND.paleTurquoise
    : neutro
      ? BRAND.paleYellow
      : BRAND.paleCoral;
  const colorIcono = entra
    ? BRAND.turquoiseDark
    : neutro
      ? '#B8880A'
      : BRAND.coral;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${tituloDe(tx)}, ${subtituloDe(tx)}, ${signo === '+' ? 'mas' : signo === '−' ? 'menos' : ''} ${money(tx.amount)}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space(3),
        paddingVertical: space(3.5),
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: BRAND.borderLight,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: fondoIcono,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={21} color={colorIcono} strokeWidth={2.2} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt variant="body" color={BRAND.ink} weight="700" numberOfLines={1}>
          {tituloDe(tx)}
        </Txt>
        <Txt variant="small" color={BRAND.mutedDark} numberOfLines={1}>
          {subtituloDe(tx)}
        </Txt>
      </View>

      <Txt variant="h3" color={colorValor} weight="800" numberOfLines={1}>
        {signo}
        {money(tx.amount)}
      </Txt>
    </Pressable>
  );
}

/**
 * Panel claro elevado sobre el fondo navy.
 *
 * Es la unica superficie clara del Inicio en ambos temas: forma parte
 * del lenguaje visual de la marca, no del modo oscuro.
 */
export function RecentActivityPanel({
  transactions,
  loading,
  onSeeAll,
  onOpen,
  onRegister,
  children,
}: {
  transactions: TransactionRow[];
  loading?: boolean;
  onSeeAll: () => void;
  onOpen: (tx: TransactionRow) => void;
  onRegister: () => void;
  /** El coach emocional va dentro del panel, debajo de la lista. */
  children?: React.ReactNode;
}) {
  return (
    <View
      style={{
        backgroundColor: BRAND.offWhite,
        borderTopLeftRadius: radius.sheet,
        borderTopRightRadius: radius.sheet,
        paddingHorizontal: space(5),
        paddingTop: space(5),
        minHeight: 420,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Txt variant="h2" color={BRAND.ink} weight="800">
          Ultimos movimientos
        </Txt>
        <Pressable
          onPress={onSeeAll}
          accessibilityRole="button"
          accessibilityLabel="Ver todos los movimientos"
          hitSlop={10}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 2,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Txt variant="small" color={BRAND.turquoiseDark} weight="700">
            Ver todos
          </Txt>
          <ChevronRight size={16} color={BRAND.turquoiseDark} strokeWidth={2.5} />
        </Pressable>
      </View>

      <View style={{ height: space(2) }} />

      {loading ? (
        <View style={{ gap: space(4), paddingVertical: space(3) }}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space(3) }}
            >
              <Skeleton width={44} height={44} radius={22} />
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton width="55%" height={14} />
                <Skeleton width="35%" height={11} />
              </View>
              <Skeleton width={82} height={16} />
            </View>
          ))}
        </View>
      ) : transactions.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: space(8) }}>
          <Txt variant="h3" color={BRAND.ink} align="center">
            Aun no tienes movimientos
          </Txt>
          <View style={{ height: space(2) }} />
          <Txt variant="small" color={BRAND.mutedDark} align="center">
            Registra tu primer ingreso o gasto para comenzar.
          </Txt>
          <View style={{ height: space(4) }} />
          <Button label="Registrar movimiento" size="sm" onPress={onRegister} />
        </View>
      ) : (
        transactions.map((tx, i) => (
          <TransactionRowItem
            key={tx.id}
            tx={tx}
            last={i === transactions.length - 1}
            onPress={() => onOpen(tx)}
          />
        ))
      )}

      {children ? (
        <>
          <View style={{ height: space(5) }} />
          {children}
        </>
      ) : null}
    </View>
  );
}
