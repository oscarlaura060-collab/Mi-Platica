import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme';
import {
  Badge,
  Button,
  Card,
  Chip,
  Row,
  Screen,
  SectionTitle,
  Spacer,
  Txt,
} from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { listCoachRules, setCoachRule } from '@/db/repositories/settings';
import {
  cancelReminder,
  ensurePermission,
  listReminders,
  scheduleDailyLog,
  scheduleWeeklyReview,
  scheduleDailyMotivation,
  cancelDailyMotivation,
} from '@/notifications';
import { wipeAllData } from '@/db';
import { money } from '@/utils/money';
import { MoneyInput } from '@/components/MoneyInput';
import { TimePickerField, formatHour } from '@/components/TimePickerField';
import type { CoachRuleRow, Reminder } from '@/db/types';
import type { RootNav } from '@/app/navigation/types';

const RULE_LABELS: Record<string, { title: string; desc: string }> = {
  INSUFFICIENT_FUNDS: {
    title: 'Fondos insuficientes',
    desc: 'Avisa si el gasto supera el saldo de la cuenta elegida.',
  },
  COMMITMENTS_AT_RISK: {
    title: 'Cuotas en riesgo',
    desc: 'Avisa si el gasto te deja sin plata para las cuotas proximas.',
  },
  BUFFER_BREACH: {
    title: 'Colchon de emergencia',
    desc: 'Avisa cuando un gasto te haga bajar del colchon.',
  },
  BUDGET_EXCEEDED: {
    title: 'Tope de categoria',
    desc: 'Avisa al pasar el presupuesto mensual de una categoria.',
  },
  NON_ESSENTIAL_SPIKE: {
    title: 'Pico de gasto',
    desc: 'Avisa si hoy gastas muy por encima de tu promedio en algo no esencial.',
  },
  DEBT_OVERDUE: {
    title: 'Cuota vencida',
    desc: 'Bloquea gastos no esenciales mientras tengas mora.',
  },
  BIG_TICKET: {
    title: 'Compra grande',
    desc: 'Informa cuando el gasto sea una tajada grande de tu saldo.',
  },
};

export function SettingsScreen() {
  const nav = useNavigation<RootNav>();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, saveSetting, themePref, setTheme, refresh, detectedPending } =
    useAppStore();

  const [rules, setRules] = useState<CoachRuleRow[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [bufferCents, setBufferCents] = useState(0);
  const [splitDebt, setSplitDebt] = useState('50');
  const [splitSave, setSplitSave] = useState('20');
  const [nombre, setNombre] = useState('');
  const [basicos, setBasicos] = useState(0);
  const [motivHora, setMotivHora] = useState(9);
  const [motivMin, setMotivMin] = useState(0);
  const [motivInterval, setMotivInterval] = useState(2);

  const load = useCallback(async () => {
    const [r, rem] = await Promise.all([listCoachRules(), listReminders()]);
    setRules(r);
    setReminders(rem);
  }, []);

  useEffect(() => {
    load();
    setBufferCents(Number(settings.emergency_buffer ?? 0));
    setSplitDebt(settings.income_split_debt ?? '50');
    setSplitSave(settings.income_split_save ?? '20');
    setNombre(settings.user_name ?? '');
    setBasicos(Number(settings.basic_needs_reserve ?? 0));
    setMotivHora(Number(settings.daily_motivation_hour ?? 9));
    setMotivInterval(Number(settings.daily_motivation_interval_hours ?? 2));
  }, [load, settings]);

  async function toggleRule(code: string, enabled: boolean) {
    await setCoachRule(code, { enabled: enabled ? 1 : 0 });
    await load();
    await refresh();
  }

  async function saveSplit() {
    const d = Math.min(100, Math.max(0, Number(splitDebt) || 0));
    const s = Math.min(100 - d, Math.max(0, Number(splitSave) || 0));
    await saveSetting('income_split_debt', String(d));
    await saveSetting('income_split_save', String(s));
    await saveSetting('income_split_free', String(100 - d - s));
    Alert.alert('Guardado', `Deudas ${d}% · Ahorro ${s}% · Libre ${100 - d - s}%`);
  }

  const dailyOn = reminders.some((r) => r.kind === 'daily_log');
  const weeklyOn = reminders.some((r) => r.kind === 'weekly_review');
  const motivacionOn = reminders.some((r) => r.kind === 'motivation');

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + t.space(2) }}>
      <Screen>
        <Txt variant="h2">Ajustes</Txt>

        {/* TU NOMBRE */}
        <Spacer h={5} />
        <SectionTitle title="Tu nombre" />
        <Card tone="alt">
          <TextInput
            value={nombre}
            onChangeText={setNombre}
            placeholder="¿Como te llamas?"
            placeholderTextColor={t.textFaint}
            maxLength={30}
            style={{ color: t.text, fontSize: 18, fontWeight: '600' }}
          />
        </Card>
        <Spacer h={2} />
        <Row gap={2}>
          <Button
            label="Guardar nombre"
            tone="neutral"
            size="sm"
            style={{ flex: 1 }}
            onPress={async () => {
              await saveSetting('user_name', nombre.trim());
              Alert.alert(
                nombre.trim() ? `Listo, ${nombre.trim()}` : 'Nombre borrado',
                nombre.trim() ? 'Te saludare con tu nombre.' : undefined,
              );
            }}
          />
        </Row>

        {/* CONFIGURACION DE LA APP */}
        <Spacer h={6} />
        <SectionTitle title="Configuracion" />
        <Card onPress={() => nav.navigate('Profile')}>
          <Row justify="space-between">
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Txt variant="body" weight="700">
                Perfil
              </Txt>
              <Txt variant="tiny" muted>
                Nombre, prioridad financiera y configuración personal
              </Txt>
            </View>
            <Txt variant="h3" muted>
              {'>'}
            </Txt>
          </Row>
        </Card>
        <Spacer h={2.5} />
        <Card onPress={() => nav.navigate('FixedExpenses')}>
          <Row justify="space-between">
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Txt variant="body" weight="700">
                Gastos fijos
              </Txt>
              <Txt variant="tiny" muted>
                Arriendo, servicios, suscripciones y sus fechas
              </Txt>
            </View>
            <Txt variant="h3" muted>
              {'>'}
            </Txt>
          </Row>
        </Card>
        <Spacer h={2.5} />
        <Card onPress={() => nav.navigate('FixedIncomes')}>
          <Row justify="space-between">
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Txt variant="body" weight="700">
                Ingresos fijos
              </Txt>
              <Txt variant="tiny" muted>
                Salario y otros ingresos, con su frecuencia
              </Txt>
            </View>
            <Txt variant="h3" muted>
              {'>'}
            </Txt>
          </Row>
        </Card>
        <Spacer h={2.5} />
        <Card onPress={() => nav.navigate('Detected')}>
          <Row justify="space-between">
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Row gap={2}>
                <Txt variant="body" weight="700">
                  Deteccion del banco
                </Txt>
                {detectedPending > 0 ? (
                  <Badge label={String(detectedPending)} tone="warn" />
                ) : null}
              </Row>
              <Txt variant="tiny" muted>
                Leer notificaciones para sugerir movimientos
              </Txt>
            </View>
            <Txt variant="h3" muted>
              {'>'}
            </Txt>
          </Row>
        </Card>

        {/* GASTOS BASICOS */}
        <Spacer h={6} />
        <SectionTitle title="Tus gastos basicos al mes" />
        <Card tone="alt">
          <MoneyInput
            value={basicos}
            onChange={setBasicos}
            helper="Comida, transporte y lo minimo para vivir. Se usa para no sugerirte un ahorro que te deje sin plata."
          />
        </Card>
        <Spacer h={2} />
        <Button
          label="Guardar"
          tone="neutral"
          size="sm"
          onPress={async () => {
            await saveSetting('basic_needs_reserve', String(basicos));
            await refresh();
          }}
        />

        <Spacer h={6} />
        <SectionTitle title="Apariencia" />
        <Row gap={2}>
          {(['dark', 'light', 'system'] as const).map((k) => (
            <Chip
              key={k}
              label={k === 'dark' ? 'Oscuro' : k === 'light' ? 'Claro' : 'Sistema'}
              active={themePref === k}
              onPress={() => setTheme(k)}
            />
          ))}
        </Row>

        {/* COACH */}
        <Spacer h={6} />
        <SectionTitle title="Coach financiero" />
        <Card tone="alt">
          <Txt variant="small" muted>
            El coach evalua cada gasto antes de guardarlo con reglas locales. Puedes
            apagar las que no quieras.
          </Txt>
        </Card>
        <Spacer h={3} />
        {rules.map((r) => (
          <Card key={r.code} style={{ marginBottom: t.space(2.5) }}>
            <Row justify="space-between">
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Row gap={2}>
                  <Txt variant="body">{RULE_LABELS[r.code]?.title ?? r.code}</Txt>
                  <Badge
                    label={r.severity === 'block' ? 'bloquea' : r.severity === 'warn' ? 'advierte' : 'informa'}
                    tone={r.severity === 'block' ? 'danger' : r.severity === 'warn' ? 'warn' : 'info'}
                  />
                </Row>
                <Spacer h={1} />
                <Txt variant="tiny" faint>
                  {RULE_LABELS[r.code]?.desc ?? ''}
                </Txt>
              </View>
              <Switch
                value={r.enabled === 1}
                onValueChange={(v) => toggleRule(r.code, v)}
                trackColor={{ true: t.primary, false: t.border }}
              />
            </Row>
          </Card>
        ))}

        {/* COLCHON */}
        <Spacer h={5} />
        <SectionTitle title="Colchon de emergencia" />
        <Card tone="alt">
          <MoneyInput value={bufferCents} onChange={setBufferCents} />
        </Card>
        <Spacer h={2} />
        <Button
          label={`Guardar ${money(bufferCents)}`}
          tone="neutral"
          size="sm"
          onPress={async () => {
            await saveSetting('emergency_buffer', String(bufferCents));
            await refresh();
          }}
        />

        {/* REPARTO DE INGRESOS */}
        <Spacer h={6} />
        <SectionTitle title="Reparto automatico de ingresos" />
        <Row gap={3}>
          <View style={{ flex: 1 }}>
            <Txt variant="tiny" faint weight="700">
              % A DEUDAS
            </Txt>
            <Spacer h={1.5} />
            <Card tone="alt">
              <TextInput
                value={splitDebt}
                onChangeText={setSplitDebt}
                keyboardType="number-pad"
                style={{ color: t.text, fontSize: 18 }}
              />
            </Card>
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="tiny" faint weight="700">
              % A AHORRO
            </Txt>
            <Spacer h={1.5} />
            <Card tone="alt">
              <TextInput
                value={splitSave}
                onChangeText={setSplitSave}
                keyboardType="number-pad"
                style={{ color: t.text, fontSize: 18 }}
              />
            </Card>
          </View>
        </Row>
        <Spacer h={2} />
        <Txt variant="tiny" faint>
          Libre para gastar: {100 - (Number(splitDebt) || 0) - (Number(splitSave) || 0)}%
        </Txt>
        <Spacer h={2} />
        <Button label="Guardar reparto" tone="neutral" size="sm" onPress={saveSplit} />

        {/* NOTIFICACIONES */}
        <Spacer h={6} />
        <SectionTitle title="Recordatorios locales" />
        <Card>
          <Row justify="space-between">
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Txt variant="body">Registro diario</Txt>
              <Txt variant="tiny" faint>
                Todos los dias a las {settings.daily_reminder_hour ?? 20}:00
              </Txt>
            </View>
            <Switch
              value={dailyOn}
              trackColor={{ true: t.primary, false: t.border }}
              onValueChange={async (v) => {
                if (v) {
                  const ok = await ensurePermission();
                  if (!ok) return Alert.alert('Activa las notificaciones del sistema');
                  await scheduleDailyLog(Number(settings.daily_reminder_hour ?? 20));
                } else {
                  const r = reminders.find((x) => x.kind === 'daily_log');
                  if (r) await cancelReminder(r.id);
                }
                await load();
              }}
            />
          </Row>
        </Card>
        {/* MOTIVACION DIARIA */}
        <Spacer h={2.5} />
        <Card>
          <Row justify="space-between">
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Txt variant="body">Mensaje motivador diario</Txt>
              <Txt variant="tiny" faint>
                Un recordatorio corto con el avance real de tus metas.
              </Txt>
            </View>
            <Switch
              value={motivacionOn}
              trackColor={{ true: t.primary, false: t.border }}
              onValueChange={async (v) => {
                if (v) {
                  const ok = await ensurePermission();
                  if (!ok) {
                    return Alert.alert(
                      'Permiso necesario',
                      'Activa las notificaciones del sistema para recibir los recordatorios.',
                    );
                  }
                  const n = await scheduleDailyMotivation(motivHora, motivMin, motivInterval);
                  await load();
                  Alert.alert(
                    'Listo',
                    `Te escribiré cada ${motivInterval} h desde las ${formatHour(motivHora, motivMin)} y hasta las 9:00 p. m. ` +
                      `Quedaron programados ${n} avisos para las próximas 48 horas.`,
                  );
                } else {
                  await cancelDailyMotivation();
                  await load();
                }
              }}
            />
          </Row>

          {motivacionOn ? (
            <>
              <Spacer h={3} />
              <Txt variant="small">Frecuencia</Txt>
              <Spacer h={1.5} />
              <Row gap={2}>
                {[1, 2, 4].map((hours) => (
                  <Chip
                    key={hours}
                    label={`Cada ${hours} h`}
                    active={motivInterval === hours}
                    onPress={async () => {
                      setMotivInterval(hours);
                      await saveSetting('daily_motivation_interval_hours', String(hours));
                      await scheduleDailyMotivation(motivHora, motivMin, hours);
                      await load();
                    }}
                  />
                ))}
              </Row>
              <Spacer h={1.5} />
              <Txt variant="tiny" faint>
                Sugerencia: cada 2 o 4 horas suele ser más llevadero. Puedes elegir cada hora o desactivar los avisos cuando quieras. No se envían entre las 9:00 p. m. y las 7:00 a. m.
              </Txt>
              <Spacer h={2} />
              <TimePickerField
                hour={motivHora}
                minute={motivMin}
                label="Hora de inicio"
                onChange={async (h, m) => {
                  if (h < 7 || h > 20) {
                    return Alert.alert(
                      'Elige una hora diurna',
                      'Los mensajes se envían entre las 7:00 a. m. y las 9:00 p. m.',
                    );
                  }
                  setMotivHora(h);
                  setMotivMin(m);
                  await saveSetting('daily_motivation_hour', String(h));
                  // Reprogramar cancela la tanda anterior: nunca llegan
                  // dos avisos el mismo dia.
                  await scheduleDailyMotivation(h, m, motivInterval);
                  await load();
                }}
              />
              <Spacer h={2} />
              <Txt variant="tiny" faint>
                Los mensajes varian entre animo, reflexion y claridad, y usan
                el progreso real de tus metas. Si no has avanzado, te invitan a
                retomar: nunca te hacen sentir mal.
              </Txt>
            </>
          ) : null}
        </Card>

        <Spacer h={2.5} />
        <Card>
          <Row justify="space-between">
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Txt variant="body">Revision semanal</Txt>
              <Txt variant="tiny" faint>
                Lunes 7:00 pm, resumen y ajuste del plan.
              </Txt>
            </View>
            <Switch
              value={weeklyOn}
              trackColor={{ true: t.primary, false: t.border }}
              onValueChange={async (v) => {
                if (v) {
                  const ok = await ensurePermission();
                  if (!ok) return;
                  await scheduleWeeklyReview(2, 19);
                } else {
                  const r = reminders.find((x) => x.kind === 'weekly_review');
                  if (r) await cancelReminder(r.id);
                }
                await load();
              }}
            />
          </Row>
        </Card>
        {reminders.filter((r) => r.kind === 'debt_due').length ? (
          <>
            <Spacer h={2.5} />
            <Card tone="alt">
              <Txt variant="tiny" faint weight="700">
                AVISOS DE CUOTA ACTIVOS
              </Txt>
              <Spacer h={2} />
              {reminders
                .filter((r) => r.kind === 'debt_due')
                .map((r) => (
                  <Txt key={r.id} variant="tiny" muted>
                    · {r.title}
                  </Txt>
                ))}
            </Card>
          </>
        ) : null}

        {/* PRIVACIDAD */}
        <Spacer h={6} />
        <SectionTitle title="Privacidad" />
        <Card tone="primary">
          <Txt variant="body">Todo vive en tu telefono</Txt>
          <Spacer h={2} />
          <Txt variant="small" muted>
            No hay cuenta, no hay servidor, no hay analitica. La base de datos SQLite
            esta en el almacenamiento privado de la app y las notificaciones son
            locales. Si borras la app, se borran los datos.
          </Txt>
        </Card>

        <Spacer h={4} />
        <Button
          label="Borrar todos mis datos"
          tone="danger"
          onPress={() =>
            Alert.alert(
              'Borrar todo',
              'Se eliminan cuentas, movimientos, ingresos y gastos fijos, deudas, inversiones y metas. No se puede deshacer.',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Borrar',
                  style: 'destructive',
                  onPress: async () => {
                    await wipeAllData();
                    await refresh();
                    Alert.alert('Listo', 'Datos eliminados.');
                  },
                },
              ],
            )
          }
        />
      </Screen>
    </View>
  );
}
