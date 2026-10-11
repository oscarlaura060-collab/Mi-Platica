import React, { useEffect, useState } from 'react';
import { Pressable, Switch, TextInput, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BRAND } from '@/theme';
import { Button, Card, Chip, Row, Screen, Spacer, Txt } from '@/components/ui';
import { MoneyInput } from '@/components/MoneyInput';
import { DayOfMonthField } from '@/components/DayOfMonthField';
import {
  createFixedIncome,
  getFixedIncome,
  updateFixedIncome,
  type FixedIncome,
} from '@/db/repositories/fixedIncomes';
import { listCategories } from '@/db/repositories/categories';
import { useAppStore } from '@/store/useAppStore';
import { money } from '@/utils/money';
import type { Category } from '@/db/types';
import type { RootNav, RootStackParamList } from '@/app/navigation/types';

type Freq = FixedIncome['frequency'];

const FRECUENCIAS: { key: Freq; label: string; porMes: number }[] = [
  { key: 'weekly', label: 'Semanal', porMes: 4 },
  { key: 'biweekly', label: 'Quincenal', porMes: 2 },
  { key: 'monthly', label: 'Mensual', porMes: 1 },
];

const PRESETS = [
  { name: 'Salario', emoji: 'S', color: BRAND.turquoise },
  { name: 'Freelance', emoji: 'F', color: '#8B9BF5' },
  { name: 'Arriendo que recibo', emoji: 'A', color: '#16A34A' },
  { name: 'Mesada', emoji: 'M', color: BRAND.yellow },
  { name: 'Pension', emoji: 'P', color: '#64748B' },
];

export function FixedIncomeFormScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<RootNav>();
  const route = useRoute<RouteProp<RootStackParamList, 'FixedIncomeForm'>>();
  const editingId = route.params?.fixedIncomeId;
  const { accounts, refresh } = useAppStore();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState(0);
  const [frequency, setFrequency] = useState<Freq>('monthly');
  const [payDay, setPayDay] = useState(30);
  const [payDay2, setPayDay2] = useState<number | null>(null);
  const [reliable, setReliable] = useState(true);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const [color, setColor] = useState<string>(BRAND.turquoise);
  const [emoji, setEmoji] = useState('*');

  useEffect(() => {
    listCategories('income').then(setCats);
  }, []);

  useEffect(() => {
    if (!editingId) return;
    getFixedIncome(editingId).then((f) => {
      if (!f) return;
      setName(f.name);
      setAmount(f.amount);
      setFrequency(f.frequency);
      setPayDay(f.pay_day);
      setPayDay2(f.pay_day_2);
      setReliable(f.is_reliable === 1);
      setAccountId(f.account_id);
      setCategoryId(f.category_id);
      setColor(f.color);
      setEmoji(f.emoji);
    });
  }, [editingId]);

  // Al pasar a quincenal se proponen los dias tipicos en Colombia (15 y 30).
  function cambiarFrecuencia(f: Freq) {
    setFrequency(f);
    if (f === 'biweekly' && payDay2 === null) {
      setPayDay(15);
      setPayDay2(30);
    }
    if (f !== 'biweekly') setPayDay2(null);
  }

  const porMes = FRECUENCIAS.find((f) => f.key === frequency)?.porMes ?? 1;
  const totalMensual = amount * porMes;

  async function save() {
    if (!name.trim() || amount <= 0) return;
    const payload = {
      name,
      amount,
      frequency,
      pay_day: payDay,
      pay_day_2: frequency === 'biweekly' ? payDay2 : null,
      is_reliable: (reliable ? 1 : 0) as 0 | 1,
      account_id: accountId,
      category_id: categoryId,
      color,
      emoji,
    };
    if (editingId) await updateFixedIncome(editingId, payload);
    else await createFixedIncome(payload);
    await refresh();
    nav.goBack();
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + t.space(2) }}>
      <Screen>
        <Row justify="space-between">
          <Txt variant="h2">
            {editingId ? 'Editar ingreso' : 'Nuevo ingreso fijo'}
          </Txt>
          <Pressable onPress={() => nav.goBack()} hitSlop={12}>
            <Txt variant="body" muted>
              Cerrar
            </Txt>
          </Pressable>
        </Row>

        {!editingId ? (
          <>
            <Spacer h={5} />
            <Txt variant="tiny" faint weight="700">
              ¿QUE ES?
            </Txt>
            <Spacer h={2} />
            <Row gap={2} style={{ flexWrap: 'wrap' }}>
              {PRESETS.map((p) => (
                <Chip
                  key={p.name}
                  label={p.name}
                  color={p.color}
                  active={name === p.name}
                  onPress={() => {
                    setName(p.name);
                    setColor(p.color);
                    setEmoji(p.emoji);
                  }}
                />
              ))}
            </Row>
          </>
        ) : null}

        <Spacer h={4} />
        <Txt variant="tiny" faint weight="700">
          NOMBRE
        </Txt>
        <Spacer h={1.5} />
        <Card tone="alt" style={{ paddingVertical: t.space(3) }}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ej: Salario"
            placeholderTextColor={t.textFaint}
            style={{ color: t.text, fontSize: 16 }}
          />
        </Card>

        <Spacer h={4} />
        <Txt variant="tiny" faint weight="700">
          ¿CUANTO RECIBES CADA VEZ?
        </Txt>
        <Spacer h={2} />
        <MoneyInput value={amount} onChange={setAmount} size="lg" />

        {/* FRECUENCIA */}
        <Spacer h={4} />
        <Txt variant="tiny" faint weight="700">
          ¿CADA CUANTO TE PAGAN?
        </Txt>
        <Spacer h={2} />
        <Row gap={2}>
          {FRECUENCIAS.map((f) => (
            <Chip
              key={f.key}
              label={f.label}
              active={frequency === f.key}
              onPress={() => cambiarFrecuencia(f.key)}
            />
          ))}
        </Row>
        {amount > 0 ? (
          <>
            <Spacer h={2} />
            <Txt variant="tiny" faint>
              Equivale a {money(totalMensual)} al mes.
            </Txt>
          </>
        ) : null}

        {/* FECHAS */}
        <Spacer h={4} />
        <Txt variant="tiny" faint weight="700">
          {frequency === 'biweekly' ? 'DIAS DE PAGO' : 'DIA DE PAGO'}
        </Txt>
        <Spacer h={2} />
        <DayOfMonthField
          value={payDay}
          onChange={setPayDay}
          label={frequency === 'biweekly' ? 'Primer pago' : 'Dia del mes'}
        />
        {frequency === 'biweekly' ? (
          <>
            <Spacer h={2.5} />
            <DayOfMonthField
              value={payDay2 ?? 30}
              onChange={setPayDay2}
              label="Segundo pago"
            />
          </>
        ) : null}
        {frequency === 'weekly' ? (
          <>
            <Spacer h={2} />
            <Txt variant="tiny" faint>
              Para pagos semanales se usa este dia como referencia del mes.
            </Txt>
          </>
        ) : null}

        {accounts.length ? (
          <>
            <Spacer h={4} />
            <Txt variant="tiny" faint weight="700">
              ¿A QUE CUENTA LLEGA?
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

        {cats.length ? (
          <>
            <Spacer h={4} />
            <Txt variant="tiny" faint weight="700">
              CATEGORIA
            </Txt>
            <Spacer h={2} />
            <Row gap={2} style={{ flexWrap: 'wrap' }}>
              {cats.map((c) => (
                <Chip
                  key={c.id}
                  label={c.name}
                  emoji={c.emoji}
                  color={c.color}
                  active={categoryId === c.id}
                  onPress={() => setCategoryId(c.id)}
                />
              ))}
            </Row>
          </>
        ) : null}

        <Spacer h={4} />
        <Card>
          <Row justify="space-between">
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Txt variant="body">Es seguro que llega</Txt>
              <Txt variant="tiny" faint>
                Apagalo si es variable (freelance, ventas). Los variables no
                se cuentan para planear ahorros.
              </Txt>
            </View>
            <Switch
              value={reliable}
              onValueChange={setReliable}
              trackColor={{ true: t.primary, false: t.border }}
            />
          </Row>
        </Card>

        <Spacer h={6} />
        <Button
          label="Guardar ingreso fijo"
          onPress={save}
          disabled={!name.trim() || amount <= 0}
          size="lg"
        />
      </Screen>
    </View>
  );
}
