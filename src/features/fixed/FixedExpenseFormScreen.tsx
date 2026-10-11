import React, { useEffect, useState } from 'react';
import { Pressable, Switch, TextInput, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { Badge, Button, Card, Chip, Row, Screen, Spacer, Txt } from '@/components/ui';
import { MoneyInput } from '@/components/MoneyInput';
import { DayOfMonthField } from '@/components/DayOfMonthField';
import {
  createFixedExpense,
  getFixedExpense,
  updateFixedExpense,
  deleteFixedExpense,
  type FixedFrequency,
} from '@/db/repositories/fixedExpenses';
import { listCategories } from '@/db/repositories/categories';
import { nextIncome, listFixedIncomes } from '@/db/repositories/fixedIncomes';
import { ensurePermission, scheduleFixedExpenseDue } from '@/notifications';
import { useAppStore } from '@/store/useAppStore';
import { money } from '@/utils/money';
import { nextDueDate, format } from '@/utils/date';
import { es } from 'date-fns/locale';
import {
  confirmarBorrado,
  confirmarSalida,
  detalleGastoFijo,
} from '@/components/formGuards';
import type { Category } from '@/db/types';
import type { RootNav, RootStackParamList } from '@/app/navigation/types';

/** Plantillas de los gastos fijos mas comunes, para no empezar en blanco. */
const PRESETS: {
  name: string;
  emoji: string;
  color: string;
  essential: boolean;
  freq: FixedFrequency;
}[] = [
  { name: 'Arriendo', emoji: 'A', color: '#0EA5E9', essential: true, freq: 'monthly' },
  { name: 'Servicios', emoji: 'S', color: '#F59E0B', essential: true, freq: 'monthly' },
  { name: 'Internet', emoji: 'I', color: '#6366F1', essential: true, freq: 'monthly' },
  { name: 'Celular', emoji: 'C', color: '#8B5CF6', essential: true, freq: 'monthly' },
  { name: 'Salud / EPS', emoji: 'H', color: '#EF4444', essential: true, freq: 'monthly' },
  { name: 'Mercado', emoji: 'M', color: '#22C55E', essential: true, freq: 'biweekly' },
  { name: 'Transporte', emoji: 'T', color: '#16A34A', essential: true, freq: 'biweekly' },
  { name: 'Suscripciones', emoji: 'N', color: '#EC4899', essential: false, freq: 'monthly' },
  { name: 'Gimnasio', emoji: 'G', color: '#F97316', essential: false, freq: 'monthly' },
];

const FRECUENCIAS: { key: FixedFrequency; label: string; veces: number }[] = [
  { key: 'biweekly', label: 'Quincenal', veces: 2 },
  { key: 'monthly', label: 'Mensual', veces: 1 },
];

export function FixedExpenseFormScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<RootNav>();
  const route = useRoute<RouteProp<RootStackParamList, 'FixedExpenseForm'>>();
  const editingId = route.params?.fixedExpenseId;
  const { accounts, refresh } = useAppStore();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState(0);
  const [frequency, setFrequency] = useState<FixedFrequency>('monthly');
  const [dueDay, setDueDay] = useState(1);
  const [dueDay2, setDueDay2] = useState<number | null>(null);
  const [essential, setEssential] = useState(true);
  const [remind, setRemind] = useState(true);
  const [color, setColor] = useState<string>('#0EA5E9');
  const [emoji, setEmoji] = useState('*');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cobroQuincenal, setCobroQuincenal] = useState(false);
  const [diasDeCobro, setDiasDeCobro] = useState<number[]>([]);
  // Lo que habia al abrir. Comparar contra esto dice si hay algo sin
  // guardar, sin tener que marcar cada campo a mano.
  const [inicial, setInicial] = useState<string | null>(null);

  useEffect(() => {
    listCategories('expense').then(setCategories);
    // Si al usuario le pagan por quincena, los gastos quincenales se
    // proponen alineados con sus dias de cobro.
    listFixedIncomes().then((ingresos) => {
      const quincenal = ingresos.find((i) => i.frequency === 'biweekly');
      if (quincenal) {
        setCobroQuincenal(true);
        setDiasDeCobro(
          [quincenal.pay_day, quincenal.pay_day_2].filter(
            (d): d is number => typeof d === 'number',
          ),
        );
      }
    });
  }, []);

  useEffect(() => {
    if (!editingId) return;
    getFixedExpense(editingId).then((f) => {
      if (!f) return;
      setName(f.name);
      setAmount(f.amount);
      setFrequency(f.frequency);
      setDueDay(f.due_day);
      setDueDay2(f.due_day_2);
      setEssential(f.is_essential === 1);
      setRemind(f.auto_remind === 1);
      setColor(f.color);
      setEmoji(f.emoji);
      setCategoryId(f.category_id);
      setAccountId(f.account_id);
    });
  }, [editingId]);

  function pickPreset(p: (typeof PRESETS)[number]) {
    setName(p.name);
    setColor(p.color);
    setEmoji(p.emoji);
    setEssential(p.essential);
    cambiarFrecuencia(p.freq);
    const match = categories.find((c) =>
      c.name.toLowerCase().includes(p.name.split(' ')[0].toLowerCase()),
    );
    if (match) setCategoryId(match.id);
  }

  function cambiarFrecuencia(f: FixedFrequency) {
    setFrequency(f);
    if (f === 'biweekly') {
      // Se alinea con los dias en que le entra la plata, si se saben.
      if (diasDeCobro.length >= 2) {
        setDueDay(diasDeCobro[0]);
        setDueDay2(diasDeCobro[1]);
      } else if (dueDay2 === null) {
        setDueDay(15);
        setDueDay2(30);
      }
    } else {
      setDueDay2(null);
    }
  }

  const veces = frequency === 'biweekly' ? 2 : 1;
  const totalMensual = amount * veces;

  async function save() {
    if (!name.trim() || amount <= 0) return;
    const payload = {
      name,
      amount,
      frequency,
      due_day: Math.min(31, Math.max(1, dueDay)),
      due_day_2:
        frequency === 'biweekly' && dueDay2
          ? Math.min(31, Math.max(1, dueDay2))
          : null,
      is_essential: (essential ? 1 : 0) as 0 | 1,
      auto_remind: (remind ? 1 : 0) as 0 | 1,
      color,
      emoji,
      category_id: categoryId,
      account_id: accountId,
    };

    let id = editingId;
    if (editingId) await updateFixedExpense(editingId, payload);
    else id = await createFixedExpense(payload);

    if (remind && id) {
      const ok = await ensurePermission();
      if (ok) await scheduleFixedExpenseDue(id);
    }

    await refresh();
    nav.goBack();
  }

  // Huella de los campos que el usuario puede cambiar.
  const huella = JSON.stringify([
    name.trim(),
    amount,
    frequency,
    dueDay,
    dueDay2,
    essential,
    color,
    emoji,
    categoryId,
    accountId,
  ]);

  // En una pantalla nueva, basta con que haya escrito algo. Al editar,
  // hay cambios si la huella ya no coincide con la que se cargo.
  const tocado = editingId
    ? inicial !== null && huella !== inicial
    : name.trim().length > 0 || amount > 0;

  useEffect(() => {
    if (editingId && inicial === null && name) setInicial(huella);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId, name]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + t.space(2) }}>
      <Screen>
        <Row justify="space-between">
          <Txt variant="h2">{editingId ? 'Editar gasto fijo' : 'Nuevo gasto fijo'}</Txt>
          <Pressable
            onPress={() =>
              confirmarSalida({ haycambios: tocado, onSalir: () => nav.goBack() })
            }
            accessibilityRole="button"
            accessibilityLabel="Cancelar y salir sin guardar"
            hitSlop={12}
          >
            <Txt variant="body" muted>
              Cancelar
            </Txt>
          </Pressable>
        </Row>

        {!editingId ? (
          <>
            <Spacer h={5} />
            <Txt variant="tiny" faint weight="700">
              PLANTILLAS
            </Txt>
            <Spacer h={2} />
            <Row gap={2} style={{ flexWrap: 'wrap' }}>
              {PRESETS.map((p) => (
                <Chip
                  key={p.name}
                  label={p.name}
                  color={p.color}
                  active={name === p.name}
                  onPress={() => pickPreset(p)}
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
            placeholder="Ej: Arriendo apartamento"
            placeholderTextColor={t.textFaint}
            style={{ color: t.text, fontSize: 16 }}
          />
        </Card>

        {/* FRECUENCIA */}
        <Spacer h={4} />
        <Txt variant="tiny" faint weight="700">
          ¿CADA CUANTO LO PAGAS?
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
        {cobroQuincenal && frequency === 'biweekly' ? (
          <>
            <Spacer h={2} />
            <Badge label="alineado con tus quincenas" tone="ok" />
          </>
        ) : null}

        {/* MONTO */}
        <Spacer h={4} />
        <Txt variant="tiny" faint weight="700">
          {frequency === 'biweekly' ? '¿CUANTO PAGAS CADA QUINCENA?' : 'MONTO MENSUAL'}
        </Txt>
        <Spacer h={2} />
        <MoneyInput
          value={amount}
          onChange={setAmount}
          size="lg"
          helper={
            frequency === 'biweekly'
              ? `Son ${money(totalMensual)} al mes (dos cobros) y ${money(totalMensual * 12)} al año.`
              : `${money(totalMensual)} al mes · ${money(totalMensual * 12)} al año.`
          }
        />

        {/* FECHAS */}
        <Spacer h={4} />
        <Txt variant="tiny" faint weight="700">
          {frequency === 'biweekly' ? 'FECHAS DE PAGO' : 'FECHA DE PAGO'}
        </Txt>
        <Spacer h={2} />
        <DayOfMonthField
          value={dueDay}
          onChange={setDueDay}
          label={frequency === 'biweekly' ? 'Primera quincena' : 'Dia del mes'}
        />
        {frequency === 'biweekly' ? (
          <>
            <Spacer h={2.5} />
            <DayOfMonthField
              value={dueDay2 ?? 30}
              onChange={setDueDay2}
              label="Segunda quincena"
            />
          </>
        ) : null}

        {/* RESUMEN DE CUANDO TOCA */}
        {amount > 0 ? (
          <>
            <Spacer h={3} />
            <Card glass>
              <Txt variant="tiny" faint weight="700">
                PROXIMOS COBROS
              </Txt>
              <Spacer h={2} />
              {[dueDay, frequency === 'biweekly' ? dueDay2 : null]
                .filter((d): d is number => typeof d === 'number')
                .map((d, i) => {
                  const fecha = nextDueDate(d);
                  return (
                    <View key={`${d}-${i}`}>
                      <Row justify="space-between" gap={2}>
                        <Txt variant="small" muted>
                          {format(fecha, "EEEE d 'de' LLLL", { locale: es })}
                        </Txt>
                        <Txt variant="body" weight="700" numberOfLines={1}>
                          {money(amount)}
                        </Txt>
                      </Row>
                      <Spacer h={1.5} />
                    </View>
                  );
                })}
            </Card>
          </>
        ) : null}

        {categories.length ? (
          <>
            <Spacer h={4} />
            <Txt variant="tiny" faint weight="700">
              CATEGORIA
            </Txt>
            <Spacer h={2} />
            <Row gap={2} style={{ flexWrap: 'wrap' }}>
              {categories.map((c) => (
                <Chip
                  key={c.id}
                  label={c.name}
                  emoji={c.emoji}
                  color={c.color}
                  active={c.id === categoryId}
                  onPress={() => setCategoryId(c.id)}
                />
              ))}
            </Row>
          </>
        ) : null}

        {accounts.length ? (
          <>
            <Spacer h={4} />
            <Txt variant="tiny" faint weight="700">
              CUENTA DESDE LA QUE SE PAGA
            </Txt>
            <Spacer h={2} />
            <Row gap={2} style={{ flexWrap: 'wrap' }}>
              {accounts.map((a) => (
                <Chip
                  key={a.id}
                  label={a.name}
                  color={a.color}
                  active={a.id === accountId}
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
              <Txt variant="body">Es indispensable</Txt>
              <Txt variant="tiny" faint>
                Desactivalo para suscripciones o gimnasio: el coach te los
                sugerira como primer recorte cuando andes corto.
              </Txt>
            </View>
            <Switch
              value={essential}
              onValueChange={setEssential}
              trackColor={{ true: t.primary, false: t.border }}
            />
          </Row>
        </Card>

        <Spacer h={2.5} />
        <Card>
          <Row justify="space-between">
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Txt variant="body">Recordarme</Txt>
              <Txt variant="tiny" faint>
                Aviso local 2 dias antes de cada cobro.
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
          label="Guardar gasto fijo"
          onPress={save}
          disabled={!name.trim() || amount <= 0}
          size="lg"
        />

        {/* Eliminar NO es lo mismo que cancelar: esto borra algo que ya
            estaba guardado, y por eso dice con todas sus letras que se
            va la recurrencia completa. */}
        {editingId ? (
          <>
            <Spacer h={3} />
            <Button
              label="Eliminar gasto fijo"
              tone="ghost"
              size="lg"
              onPress={() => {
                const txt = detalleGastoFijo({
                  nombre: name || 'este gasto',
                  quincenal: frequency === 'biweekly',
                });
                confirmarBorrado({
                  ...txt,
                  onBorrar: async () => {
                    await deleteFixedExpense(editingId);
                    await refresh();
                    nav.goBack();
                  },
                });
              }}
            />
          </>
        ) : null}
      </Screen>
    </View>
  );
}
