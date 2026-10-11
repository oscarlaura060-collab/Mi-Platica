import React, { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  CalendarClock,
  ChartNoAxesColumn,
  ChevronRight,
  CreditCard,
  Landmark,
  Percent,
  Settings as SettingsIcon,
  TrendingUp,
  Wallet,
} from 'lucide-react-native';
import { BRAND, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme';
import { Badge, Card, Row, Screen, SectionTitle, Spacer, Txt } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { money } from '@/utils/money';
import type { RootNav } from '@/app/navigation/types';

/**
 * PERFIL
 *
 * Perfil es una pantalla secundaria accesible desde Ajustes. La barra
 * principal conserva las cuatro áreas financieras: Inicio, Deudas, Ahorro
 * y Análisis.
 */
export function ProfileScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<RootNav>();
  const {
    settings,
    debts,
    netWorth,
    invested,
    total,
    fixedMonthly,
    detectedPending,
    refresh,
  } = useAppStore();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const nombre = (settings.user_name ?? '').trim();
  const inicial = nombre ? nombre.charAt(0).toUpperCase() : '·';
  const deudaTotal = debts.reduce((a, d) => a + d.outstanding, 0);

  const Fila = ({
    Icon,
    label,
    detail,
    color,
    badge,
    onPress,
  }: {
    Icon: typeof Wallet;
    label: string;
    detail?: string;
    color: string;
    badge?: string;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={detail ? `${label}. ${detail}` : label}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space(3.5),
        minHeight: 60,
        paddingVertical: space(2.5),
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 13,
          backgroundColor: color + '20',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={21} color={color} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Row gap={2} align="center">
          <Txt variant="body" weight="700" numberOfLines={1} style={{ flex: 1 }}>
            {label}
          </Txt>
          {badge ? <Badge label={badge} tone="warn" /> : null}
        </Row>
        {detail ? (
          <Txt variant="small" muted numberOfLines={1}>
            {detail}
          </Txt>
        ) : null}
      </View>
      <ChevronRight size={20} color={t.textFaint} strokeWidth={2.4} />
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + space(2) }}>
      <Screen>
        {/* Identidad */}
        <Row gap={3.5} align="center">
          <View
            style={{
              width: 62,
              height: 62,
              borderRadius: 31,
              backgroundColor: BRAND.turquoise,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Txt variant="h1" color={BRAND.navy} weight="800" style={{ fontSize: 28 }}>
              {inicial}
            </Txt>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt variant="h2" numberOfLines={1}>
              {nombre || 'Tu perfil'}
            </Txt>
            <Txt variant="small" muted>
              {nombre ? 'Mi Platica' : 'Pon tu nombre en Ajustes'}
            </Txt>
          </View>
          <Pressable
            onPress={() => nav.navigate('Settings')}
            accessibilityRole="button"
            accessibilityLabel="Ajustes"
            hitSlop={10}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <SettingsIcon size={24} color={t.textMuted} strokeWidth={2} />
          </Pressable>
        </Row>

        {/* Patrimonio */}
        <Spacer h={5} />
        <Card glass>
          <Txt variant="tiny" faint weight="700">
            PATRIMONIO NETO
          </Txt>
          <Spacer h={1} />
          <Txt variant="h1" numberOfLines={1} color={netWorth >= 0 ? t.text : t.danger}>
            {money(netWorth)}
          </Txt>
          <Spacer h={3} />
          <Row justify="space-between" gap={2}>
            <View style={{ flex: 1 }}>
              <Txt variant="tiny" faint>
                Tienes
              </Txt>
              <Txt variant="small" numberOfLines={1}>
                {money(total + invested)}
              </Txt>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Txt variant="tiny" faint>
                Debes
              </Txt>
              <Txt variant="small" color={t.danger} numberOfLines={1}>
                {money(deudaTotal)}
              </Txt>
            </View>
          </Row>
        </Card>

        {/* Secciones principales que ya no son pestañas */}
        <Spacer h={6} />
        <SectionTitle title="Tus finanzas" />
        <Card style={{ paddingVertical: space(1) }}>
          <Fila
            Icon={Percent}
            label="Deudas"
            color={BRAND.coral}
            detail={
              deudaTotal > 0
                ? `Debes ${money(deudaTotal)} en ${debts.length} deuda${debts.length === 1 ? '' : 's'}`
                : 'Sin deudas activas'
            }
            onPress={() => nav.navigate('Debts')}
          />
          <Fila
            Icon={ChartNoAxesColumn}
            label="Análisis"
            color={BRAND.turquoise}
            detail="Gráficos por periodo y ciclo de pago"
            onPress={() => nav.navigate('Dashboard')}
          />
          <Fila
            Icon={TrendingUp}
            label="Inversiones"
            color={BRAND.yellow}
            detail={invested > 0 ? money(invested) : 'CDT, fondos, cuenta de ahorro'}
            onPress={() => nav.navigate('Investments')}
          />
        </Card>

        {/* Cuentas y compromisos */}
        <Spacer h={5} />
        <SectionTitle title="Cuentas y compromisos" />
        <Card style={{ paddingVertical: space(1) }}>
          <Fila
            Icon={Wallet}
            label="Mis cuentas"
            color={BRAND.turquoise}
            detail={money(total)}
            onPress={() => nav.navigate('Accounts')}
          />
          <Fila
            Icon={CalendarClock}
            label="Gastos fijos"
            color={BRAND.coral}
            detail={
              fixedMonthly > 0 ? `${money(fixedMonthly)} al mes` : 'Arriendo, servicios…'
            }
            onPress={() => nav.navigate('FixedExpenses')}
          />
          <Fila
            Icon={Landmark}
            label="Ingresos fijos"
            color={BRAND.turquoise}
            detail="Salario y otros ingresos"
            onPress={() => nav.navigate('FixedIncomes')}
          />
          <Fila
            Icon={CreditCard}
            label="Detección del banco"
            color={BRAND.yellow}
            badge={detectedPending > 0 ? String(detectedPending) : undefined}
            detail="Leer notificaciones para sugerir movimientos"
            onPress={() => nav.navigate('Detected')}
          />
        </Card>

        {/* Ajustes */}
        <Spacer h={5} />
        <Card style={{ paddingVertical: space(1) }}>
          <Fila
            Icon={SettingsIcon}
            label="Ajustes"
            color={t.textMuted}
            detail="Nombre, tema, coach, recordatorios y privacidad"
            onPress={() => nav.navigate('Settings')}
          />
          <Fila
            Icon={Bell}
            label="Coach"
            color={BRAND.yellow}
            detail="Preguntas sobre tu plata"
            onPress={() => nav.navigate('Coach')}
          />
        </Card>

        <Spacer h={5} />
        <Txt variant="tiny" faint align="center">
          Mi Platica · tu plata, más vida
        </Txt>
      </Screen>
    </View>
  );
}
