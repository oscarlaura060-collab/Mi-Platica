import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { Button, Card, Chip, Row, Screen, Spacer, Txt } from '@/components/ui';
import { MoneyInput } from '@/components/MoneyInput';
import {
  createInvestment,
  getInvestment,
  updateInvestment,
} from '@/db/repositories/investments';
import { useAppStore } from '@/store/useAppStore';
import { futureValue, netAnnualRateBp } from '@/domain/invest/projection';
import { money, toCents } from '@/utils/money';
import { dayKey } from '@/utils/date';
import type { InvestmentKind } from '@/db/types';
import type { RootNav, RootStackParamList } from '@/app/navigation/types';

/** Presets con tasas tipicas del mercado colombiano, editables. */
const KINDS: {
  key: InvestmentKind;
  label: string;
  rate: string;
  liquidity: 'immediate' | 'term';
  risk: 'low' | 'medium' | 'high';
  color: string;
}[] = [
  { key: 'savings', label: 'Cuenta de ahorro', rate: '2', liquidity: 'immediate', risk: 'low', color: '#38BDF8' },
  { key: 'cdt', label: 'CDT', rate: '9.5', liquidity: 'term', risk: 'low', color: '#6366F1' },
  { key: 'fund', label: 'Fondo de inversion', rate: '8', liquidity: 'immediate', risk: 'medium', color: '#8B5CF6' },
  { key: 'stocks', label: 'Acciones', rate: '12', liquidity: 'immediate', risk: 'high', color: '#F59E0B' },
  { key: 'crypto', label: 'Cripto', rate: '15', liquidity: 'immediate', risk: 'high', color: '#F97316' },
  { key: 'real_estate', label: 'Finca raiz', rate: '7', liquidity: 'term', risk: 'medium', color: '#22C55E' },
  { key: 'other', label: 'Otro', rate: '0', liquidity: 'immediate', risk: 'low', color: '#64748B' },
];

export function InvestmentFormScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<RootNav>();
  const route = useRoute<RouteProp<RootStackParamList, 'InvestmentForm'>>();
  const editingId = route.params?.investmentId;
  const { refresh, accounts } = useAppStore();

  const [name, setName] = useState('');
  const [issuer, setIssuer] = useState('');
  const [kind, setKind] = useState<InvestmentKind>('savings');
  const [rate, setRate] = useState('2');
  const [fee, setFee] = useState('0');
  const [initial, setInitial] = useState(0);
  const [monthly, setMonthly] = useState(0);
  const [liquidity, setLiquidity] = useState<'immediate' | 'term'>('immediate');
  const [risk, setRisk] = useState<'low' | 'medium' | 'high'>('low');
  const [accountId, setAccountId] = useState<number | null>(null);
  const [color, setColor] = useState('#38BDF8');

  useEffect(() => {
    if (!editingId) return;
    getInvestment(editingId).then((i) => {
      if (!i) return;
      setName(i.name);
      setIssuer(i.issuer ?? '');
      setKind(i.kind);
      setRate(String(i.annual_rate_bp / 100));
      setFee(String(i.fee_rate_bp / 100));
      setInitial(i.initial_amount);
      setMonthly(i.monthly_target);
      setLiquidity(i.liquidity);
      setRisk(i.risk);
      setAccountId(i.account_id);
      setColor(i.color);
    });
  }, [editingId]);

  function pickKind(k: InvestmentKind) {
    const preset = KINDS.find((x) => x.key === k);
    if (!preset) return;
    setKind(k);
    setLiquidity(preset.liquidity);
    setRisk(preset.risk);
    setColor(preset.color);
    if (!editingId) {
      setRate(preset.rate);
      if (!name || KINDS.some((x) => x.label === name)) setName(preset.label);
    }
  }

  const rateBp = Math.round(Number((rate || '0').replace(',', '.')) * 100);
  const feeBp = Math.round(Number((fee || '0').replace(',', '.')) * 100);
  const netBp = netAnnualRateBp(rateBp, feeBp);
  const initialC = initial;
  const monthlyC = monthly;

  const sim = useMemo(
    () => ({
      y1: futureValue(initialC, monthlyC, netBp, 12),
      y10: futureValue(initialC, monthlyC, netBp, 120),
      aportado10: initialC + monthlyC * 120,
    }),
    [initialC, monthlyC, netBp],
  );

  async function save() {
    if (!name.trim()) return;
    const payload = {
      name,
      kind,
      issuer: issuer || null,
      annual_rate_bp: rateBp,
      fee_rate_bp: feeBp,
      liquidity,
      risk,
      initial_amount: initialC,
      monthly_target: monthlyC,
      account_id: accountId,
      start_date: dayKey(),
      color,
    };
    if (editingId) await updateInvestment(editingId, payload);
    else await createInvestment(payload);
    await refresh();
    nav.goBack();
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + t.space(2) }}>
      <Screen>
        <Row justify="space-between">
          <Txt variant="h2">{editingId ? 'Editar ahorro' : 'Nuevo ahorro'}</Txt>
          <Pressable onPress={() => nav.goBack()} hitSlop={12}>
            <Txt variant="body" muted>
              Cerrar
            </Txt>
          </Pressable>
        </Row>

        <Spacer h={5} />
        <Txt variant="tiny" faint weight="700">
          TIPO
        </Txt>
        <Spacer h={2} />
        <Row gap={2} style={{ flexWrap: 'wrap' }}>
          {KINDS.map((k) => (
            <Chip
              key={k.key}
              label={k.label}
              color={k.color}
              active={kind === k.key}
              onPress={() => pickKind(k.key)}
            />
          ))}
        </Row>

        <Spacer h={4} />
        <Field label="NOMBRE">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ej: CDT Bancolombia 12 meses"
            placeholderTextColor={t.textFaint}
            style={{ color: t.text, fontSize: 16 }}
          />
        </Field>

        <Spacer h={3} />
        <Field label="ENTIDAD (OPCIONAL)">
          <TextInput
            value={issuer}
            onChangeText={setIssuer}
            placeholder="Bancolombia, Nu, Tyba..."
            placeholderTextColor={t.textFaint}
            style={{ color: t.text, fontSize: 16 }}
          />
        </Field>

        <Spacer h={3} />
        <Row gap={3}>
          <View style={{ flex: 1 }}>
            <Field label="RENTABILIDAD % E.A.">
              <TextInput
                value={rate}
                onChangeText={setRate}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={t.textFaint}
                style={{ color: t.text, fontSize: 18 }}
              />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="COMISION + IMPUESTO %">
              <TextInput
                value={fee}
                onChangeText={setFee}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={t.textFaint}
                style={{ color: t.text, fontSize: 18 }}
              />
            </Field>
          </View>
        </Row>
        <Spacer h={1.5} />
        <Txt variant="tiny" faint>
          Rentabilidad neta: {(netBp / 100).toFixed(2)}% efectivo anual. Es la
          cifra que se compara contra tus deudas.
        </Txt>

        <Spacer h={3} />
        <Row gap={3}>
          <View style={{ flex: 1 }}>
            <Txt variant="tiny" faint weight="700">
              SALDO ACTUAL
            </Txt>
            <Spacer h={1.5} />
            <MoneyInput value={initial} onChange={setInitial} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="tiny" faint weight="700">
              APORTE MENSUAL
            </Txt>
            <Spacer h={1.5} />
            <MoneyInput value={monthly} onChange={setMonthly} />
          </View>
        </Row>

        <Spacer h={4} />
        <Txt variant="tiny" faint weight="700">
          DISPONIBILIDAD
        </Txt>
        <Spacer h={2} />
        <Row gap={2}>
          <Chip
            label="Puedo sacarla hoy"
            active={liquidity === 'immediate'}
            onPress={() => setLiquidity('immediate')}
          />
          <Chip
            label="Esta amarrada"
            active={liquidity === 'term'}
            onPress={() => setLiquidity('term')}
          />
        </Row>
        <Spacer h={1.5} />
        <Txt variant="tiny" faint>
          Solo el dinero disponible hoy cuenta como colchon de emergencia.
        </Txt>

        <Spacer h={4} />
        <Txt variant="tiny" faint weight="700">
          RIESGO
        </Txt>
        <Spacer h={2} />
        <Row gap={2}>
          {(
            [
              ['low', 'Bajo'],
              ['medium', 'Medio'],
              ['high', 'Alto'],
            ] as ['low' | 'medium' | 'high', string][]
          ).map(([k, l]) => (
            <Chip key={k} label={l} active={risk === k} onPress={() => setRisk(k)} />
          ))}
        </Row>

        {accounts.length ? (
          <>
            <Spacer h={4} />
            <Txt variant="tiny" faint weight="700">
              CUENTA DESDE LA QUE APORTAS
            </Txt>
            <Spacer h={2} />
            <Row gap={2} style={{ flexWrap: 'wrap' }}>
              {accounts.map((a) => (
                <Chip
                  key={a.id}
                  label={a.name}
                  color={a.color}
                  active={accountId === a.id}
                  onPress={() => setAccountId(a.id)}
                />
              ))}
            </Row>
          </>
        ) : null}

        {/* SIMULACION */}
        <Spacer h={5} />
        <Card tone="primary">
          <Txt variant="tiny" faint weight="700">
            SIMULACION
          </Txt>
          <Spacer h={2} />
          <Row justify="space-between">
            <Txt variant="small" muted>
              En 1 año
            </Txt>
            <Txt variant="body" weight="700">
              {money(sim.y1)}
            </Txt>
          </Row>
          <Spacer h={1.5} />
          <Row justify="space-between">
            <Txt variant="small" muted>
              En 10 años
            </Txt>
            <Txt variant="body" weight="700">
              {money(sim.y10)}
            </Txt>
          </Row>
          <Spacer h={1.5} />
          <Row justify="space-between">
            <Txt variant="small" muted>
              De eso, interes
            </Txt>
            <Txt variant="body" color={t.primary} weight="700">
              {money(Math.max(sim.y10 - sim.aportado10, 0))}
            </Txt>
          </Row>
        </Card>

        <Spacer h={6} />
        <Button label="Guardar" onPress={save} disabled={!name.trim()} size="lg" />
      </Screen>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View>
      <Txt variant="tiny" faint weight="700">
        {label}
      </Txt>
      <Spacer h={1.5} />
      <Card tone="alt" style={{ paddingVertical: t.space(3) }}>
        {children}
      </Card>
    </View>
  );
}
