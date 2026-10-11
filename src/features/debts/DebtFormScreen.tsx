import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Switch, TextInput, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { Button, Card, Chip, Row, Screen, Spacer, Txt } from '@/components/ui';
import { MoneyInput } from '@/components/MoneyInput';
import {
  createDebt,
  deleteDebt,
  getDebt,
  getDebtRaw,
  updateDebt,
} from '@/db/repositories/debts';
import { confirmarBorrado, confirmarSalida } from '@/components/formGuards';
import { scheduleDebtDue, ensurePermission } from '@/notifications';
import { useAppStore } from '@/store/useAppStore';
import { installmentAmount, totalInterest } from '@/domain/debt/amortization';
import { money, toCents } from '@/utils/money';
import { dayKey } from '@/utils/date';
import type { DebtKind } from '@/db/types';
import type { RootNav, RootStackParamList } from '@/app/navigation/types';

const KINDS: [DebtKind, string][] = [
  ['credit_card', 'Tarjeta'],
  ['loan', 'Prestamo'],
  ['installment', 'Cuotas'],
  ['person', 'A una persona'],
  ['other', 'Otra'],
];

/** Registro de deuda con plan de cuotas y calculo de interes/plazo en vivo. */
export function DebtFormScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<RootNav>();
  const route = useRoute<RouteProp<RootStackParamList, 'DebtForm'>>();
  const editingId = route.params?.debtId;
  const { refresh, accounts } = useAppStore();

  const [name, setName] = useState('');
  const [creditor, setCreditor] = useState('');
  const [kind, setKind] = useState<DebtKind>('loan');
  const [principal, setPrincipal] = useState(0);
  const [rate, setRate] = useState(''); // % mensual, ej "1.8"
  const [installments, setInstallments] = useState('12');
  const [dueDay, setDueDay] = useState('5');
  const [accountId, setAccountId] = useState<number | null>(null);
  const [customCuota, setCustomCuota] = useState(0);
  const [paidPrincipal, setPaidPrincipal] = useState(0);
  const [startDate, setStartDate] = useState(dayKey());
  const [remind, setRemind] = useState(true);
  // Lo que habia al abrir, para saber si hay algo sin guardar.
  const [inicial, setInicial] = useState<string | null>(null);

  useEffect(() => {
    if (!editingId) return;
    Promise.all([getDebt(editingId), getDebtRaw(editingId)]).then(([d, raw]) => {
      if (!d) return;
      setName(d.name);
      setCreditor(d.creditor ?? '');
      setKind(d.kind);
      setPrincipal(d.outstanding);
      setPaidPrincipal(d.paid_principal);
      setRate(String(d.monthly_rate_bp / 100));
      setInstallments(String(d.installments_total));
      setDueDay(String(d.due_day));
      setAccountId(raw?.account_id ?? null);
      setCustomCuota(d.installment_amount ?? 0);
      setStartDate(d.start_date);
    });
  }, [editingId]);

  const principalC = principal;
  const rateBp = Math.round(Number((rate || '0').replace(',', '.')) * 100);
  const n = Math.max(1, Number(installments) || 1);

  const calc = useMemo(() => {
    const cuota =
      customCuota > 0 ? customCuota : installmentAmount(principalC, rateBp, n);
    const interes = totalInterest(principalC, rateBp, cuota);
    return { cuota, interes, total: principalC + interes };
  }, [principalC, rateBp, n, customCuota]);

  async function save() {
    if (!name.trim() || principalC <= 0) return;
    const payload = {
      name,
      creditor: creditor || null,
      kind,
      principal: editingId ? principalC + paidPrincipal : principalC,
      monthly_rate_bp: rateBp,
      installments_total: n,
      installment_amount: calc.cuota,
      due_day: Math.min(31, Math.max(1, Number(dueDay) || 1)),
      start_date: startDate,
      account_id: accountId,
    };

    let id = editingId;
    if (editingId) await updateDebt(editingId, payload);
    else id = await createDebt(payload);

    if (remind && id) {
      const ok = await ensurePermission();
      if (ok) await scheduleDebtDue(id, { daysBefore: 2, hour: 9 });
    }

    await refresh();
    nav.goBack();
  }

  const huella = JSON.stringify([
    name.trim(),
    creditor.trim(),
    kind,
    principal,
    rate,
    installments,
    dueDay,
    accountId,
    customCuota,
  ]);

  const tocado = editingId
    ? inicial !== null && huella !== inicial
    : name.trim().length > 0 || principal > 0;

  useEffect(() => {
    if (editingId && inicial === null && name) setInicial(huella);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId, name]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + t.space(2) }}>
      <Screen>
        <Row justify="space-between">
          <Txt variant="h2">{editingId ? 'Editar deuda' : 'Nueva deuda'}</Txt>
          <Pressable
            onPress={() =>
              confirmarSalida({ haycambios: tocado, onSalir: () => nav.goBack() })
            }
            accessibilityRole="button"
            accessibilityLabel="Cancelar y salir sin guardar"
            hitSlop={12}
          >
            <Txt variant="body" muted>
              Cerrar
            </Txt>
          </Pressable>
        </Row>

        <Spacer h={5} />
        <Row gap={2} style={{ flexWrap: 'wrap' }}>
          {KINDS.map(([k, label]) => (
            <Chip key={k} label={label} active={kind === k} onPress={() => setKind(k)} />
          ))}
        </Row>

        <Spacer h={4} />
        <Field label="NOMBRE">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ej: Tarjeta Visa / Prestamo moto"
            placeholderTextColor={t.textFaint}
            style={{ color: t.text, fontSize: 16 }}
          />
        </Field>

        <Spacer h={3} />
        <Field label="ACREEDOR (OPCIONAL)">
          <TextInput
            value={creditor}
            onChangeText={setCreditor}
            placeholder="Banco, almacen, persona..."
            placeholderTextColor={t.textFaint}
            style={{ color: t.text, fontSize: 16 }}
          />
        </Field>

        <Spacer h={3} />
        <Txt variant="tiny" faint weight="700">
          MONTO DE LA DEUDA
        </Txt>
        <Spacer h={1.5} />
        <MoneyInput value={principal} onChange={setPrincipal} size="lg" />

        <Spacer h={3} />
        <Row gap={3}>
          <View style={{ flex: 1 }}>
            <Field label="TASA % MENSUAL">
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
            <Field label="N. DE CUOTAS">
              <TextInput
                value={installments}
                onChangeText={setInstallments}
                keyboardType="number-pad"
                placeholder="12"
                placeholderTextColor={t.textFaint}
                style={{ color: t.text, fontSize: 18 }}
              />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="DIA DE PAGO">
              <TextInput
                value={dueDay}
                onChangeText={setDueDay}
                keyboardType="number-pad"
                placeholder="5"
                placeholderTextColor={t.textFaint}
                style={{ color: t.text, fontSize: 18 }}
              />
            </Field>
          </View>
        </Row>

        <Spacer h={3} />
        <Txt variant="tiny" faint weight="700">
          CUOTA PACTADA (SI YA LA SABES)
        </Txt>
        <Spacer h={1.5} />
        <MoneyInput
          value={customCuota}
          onChange={setCustomCuota}
          helper={`Si la dejas en cero, se calcula sola: ${money(calc.cuota)}.`}
        />

        {/* SIMULACION EN VIVO */}
        <Spacer h={5} />
        <Card tone="warn">
          <Txt variant="tiny" faint weight="700">
            SIMULACION
          </Txt>
          <Spacer h={2} />
          <Row justify="space-between">
            <Txt variant="small" muted>
              Cuota mensual
            </Txt>
            <Txt variant="body" weight="700">
              {money(calc.cuota)}
            </Txt>
          </Row>
          <Spacer h={1.5} />
          <Row justify="space-between">
            <Txt variant="small" muted>
              Interes total
            </Txt>
            <Txt variant="body" color={t.danger} weight="700">
              {money(calc.interes)}
            </Txt>
          </Row>
          <Spacer h={1.5} />
          <Row justify="space-between">
            <Txt variant="small" muted>
              Pagaras en total
            </Txt>
            <Txt variant="body" weight="700">
              {money(calc.total)}
            </Txt>
          </Row>
        </Card>

        {accounts.length ? (
          <>
            <Spacer h={4} />
            <Txt variant="tiny" faint weight="700">
              CUENTA DESDE LA QUE PAGAS
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

        <Spacer h={4} />
        <Card>
          <Row justify="space-between">
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Txt variant="body">Recordarme la cuota</Txt>
              <Txt variant="tiny" faint>
                Notificacion local 2 dias antes, cada mes.
              </Txt>
            </View>
            <Switch
              value={remind}
              onValueChange={setRemind}
              trackColor={{ true: t.primary, false: t.border }}
            />
          </Row>
        </Card>

        <Spacer h={6} />
        <Button
          label="Guardar deuda"
          onPress={save}
          disabled={!name.trim() || principalC <= 0}
          size="lg"
        />

        {/* Eliminar borra un registro guardado; cancelar solo descarta lo
            escrito. Son botones distintos a proposito. */}
        {editingId ? (
          <>
            <Spacer h={3} />
            <Button
              label="Eliminar deuda"
              tone="ghost"
              size="lg"
              onPress={() =>
                confirmarBorrado({
                  titulo: `¿Eliminar ${name || 'esta deuda'}?`,
                  detalle:
                    'Se elimina la deuda y su plan de cuotas. Los abonos que ya ' +
                    'registraste se quedan en tu historial de movimientos.',
                  onBorrar: async () => {
                    await deleteDebt(editingId);
                    await refresh();
                    nav.goBack();
                  },
                })
              }
            />
          </>
        ) : null}
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
