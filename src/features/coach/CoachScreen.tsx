import React, { useCallback, useRef, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { Badge, Button, Card, Chip, Row, Spacer, Txt } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { MoneyInput } from '@/components/MoneyInput';
import { buildCoachContext } from '@/domain/coach/context';
import { dailyAdvice } from '@/domain/coach/engine';
import { QUESTIONS, answer, type Answer, type QuestionId } from '@/domain/coach/answers';
import { byCategory } from '@/db/repositories/stats';
import { monthRange } from '@/utils/date';
import { keypadToCents, money, toCents } from '@/utils/money';
import type { CoachContext } from '@/domain/coach/types';
import type { RootNav } from '@/app/navigation/types';

interface Turn {
  id: number;
  question: string;
  answer: Answer;
}

/**
 * EL COACH, como pestaña propia.
 *
 * Antes vivia solo dentro de un modal al registrar un gasto, donde era
 * facil perderselo. Aqui es un sitio al que se entra a preguntar, con
 * respuestas calculadas localmente sobre los datos reales.
 */
export function CoachScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<RootNav>();
  const { refresh } = useAppStore();

  const [ctx, setCtx] = useState<CoachContext | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState<QuestionId | null>(null);
  const [amount, setAmount] = useState(0);
  const [topCategory, setTopCategory] = useState<{ name: string; total: number } | null>(
    null,
  );
  const scrollRef = useRef<ScrollView>(null);
  const nextId = useRef(1);

  const load = useCallback(async () => {
    const c = await buildCoachContext();
    setCtx(c);
    const m = monthRange();
    const cats = await byCategory(m.from, m.to, 1);
    setTopCategory(cats[0] ? { name: cats[0].name, total: cats[0].total } : null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function preguntar(id: QuestionId, label: string, monto = 0) {
    if (!ctx) return;
    Haptics.selectionAsync().catch(() => undefined);
    const a = answer(ctx, id, monto, { topCategory });
    setTurns((prev) => [
      ...prev,
      {
        id: nextId.current++,
        question: monto > 0 ? `${label.replace('...', '')} ${money(monto)}?` : label,
        answer: a,
      },
    ]);
    setPending(null);
    setAmount(0);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  }

  function onChip(id: QuestionId, label: string, needsAmount?: boolean) {
    if (needsAmount) {
      setPending(id);
      return;
    }
    preguntar(id, label);
  }

  const advice = ctx ? dailyAdvice(ctx) : null;
  const pendingQ = QUESTIONS.find((q) => q.id === pending);
  const montoC = amount;

  const toneColor = (tone: Answer['tone']) =>
    tone === 'danger' ? 'danger' : tone === 'warn' ? 'warn' : tone === 'ok' ? 'primary' : 'info';

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + t.space(2) }}>
      <View style={{ paddingHorizontal: t.space(5) }}>
        <Row justify="space-between">
          <Txt variant="h2">Coach</Txt>
          {turns.length ? (
            <Button
              label="Limpiar"
              tone="ghost"
              size="sm"
              onPress={() => setTurns([])}
            />
          ) : null}
        </Row>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: t.space(5),
          paddingTop: t.space(4),
          paddingBottom: t.space(6),
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ESTADO ACTUAL */}
        {ctx ? (
          <Card tone={ctx.availableReal < 0 ? 'danger' : 'primary'}>
            <Txt variant="tiny" faint weight="700">
              LIBRE DE VERDAD
            </Txt>
            <Spacer h={1} />
            <Txt variant="h1" numberOfLines={1}>
              {money(ctx.availableReal)}
            </Txt>
            <Spacer h={2} />
            <Txt variant="tiny" faint>
              Saldo {money(ctx.totalBalance)} menos {money(ctx.fixedPendingTotal)} de
              gastos fijos pendientes y {money(ctx.committedTotal)} de cuotas.
            </Txt>
          </Card>
        ) : null}

        {/* ALERTA DEL DIA */}
        {advice ? (
          <>
            <Spacer h={3} />
            <Card
              tone={
                advice.severity === 'block'
                  ? 'danger'
                  : advice.severity === 'warn'
                    ? 'warn'
                    : 'info'
              }
            >
              <Row justify="space-between">
                <Txt variant="tiny" faint weight="700">
                  LO MAS URGENTE
                </Txt>
                {advice.severity !== 'info' ? (
                  <Badge
                    label={advice.severity === 'block' ? 'urgente' : 'ojo'}
                    tone={advice.severity === 'block' ? 'danger' : 'warn'}
                  />
                ) : null}
              </Row>
              <Spacer h={2} />
              <Txt variant="h3">{advice.title}</Txt>
              <Spacer h={1.5} />
              <Txt variant="small" muted>
                {advice.message}
              </Txt>
            </Card>
          </>
        ) : null}

        {/* CONVERSACION */}
        {turns.map((turn) => (
          <View key={turn.id}>
            {/* Pregunta, alineada a la derecha */}
            <Spacer h={4} />
            <View style={{ alignItems: 'flex-end' }}>
              <View
                style={{
                  backgroundColor: t.primary,
                  borderRadius: t.radius.lg,
                  borderBottomRightRadius: 4,
                  paddingHorizontal: t.space(4),
                  paddingVertical: t.space(2.5),
                  maxWidth: '85%',
                }}
              >
                <Txt variant="small" color="#04120C" weight="700">
                  {turn.question}
                </Txt>
              </View>
            </View>

            {/* Respuesta */}
            <Spacer h={2} />
            <Card tone={toneColor(turn.answer.tone)}>
              <Txt variant="small">{turn.answer.text}</Txt>
              {turn.answer.figures?.length ? (
                <>
                  <Spacer h={3} />
                  {turn.answer.figures.map((f) => (
                    <View key={f.label}>
                      <Row justify="space-between" gap={2}>
                        <Txt variant="tiny" faint style={{ flex: 1 }} numberOfLines={1}>
                          {f.label}
                        </Txt>
                        <Txt variant="small" weight="700" numberOfLines={1}>
                          {f.value}
                        </Txt>
                      </Row>
                      <Spacer h={1.5} />
                    </View>
                  ))}
                </>
              ) : null}
            </Card>
          </View>
        ))}

        {!turns.length ? (
          <>
            <Spacer h={4} />
            <Txt variant="tiny" faint align="center">
              Preguntame algo. Las respuestas salen de tus datos, aqui en el
              telefono: ninguna cifra es inventada y nada sale de el.
            </Txt>
          </>
        ) : null}
      </ScrollView>

      {/* ENTRADA DE MONTO (cuando la pregunta lo necesita) */}
      {pendingQ ? (
        <View style={{ paddingHorizontal: t.space(5), paddingBottom: t.space(2) }}>
          <Card tone="alt">
            <Txt variant="tiny" faint weight="700">
              {pendingQ.label.toUpperCase()}
            </Txt>
            <Spacer h={2} />
            <MoneyInput
              value={amount}
              onChange={setAmount}
              size="lg"
              autoFocus
              placeholder="Escribe el monto"
            />
          </Card>
          <Spacer h={2} />
          <Row gap={2}>
            <Button
              label={`Preguntar por ${money(montoC)}`}
              style={{ flex: 1 }}
              disabled={montoC <= 0}
              onPress={() => preguntar(pendingQ.id, pendingQ.label, montoC)}
            />
            <Button
              label="Cancelar"
              tone="ghost"
              onPress={() => {
                setPending(null);
                setAmount(0);
              }}
            />
          </Row>
        </View>
      ) : null}

      {/* PREGUNTAS SUGERIDAS, SIEMPRE ABAJO */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: t.border,
          backgroundColor: t.bgElevated,
          paddingVertical: t.space(3),
          paddingBottom: insets.bottom > 0 ? t.space(2) : t.space(3),
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: t.space(5), gap: t.space(2) }}
        >
          {QUESTIONS.map((q) => (
            <Chip
              key={q.id}
              label={q.label}
              active={pending === q.id}
              onPress={() => onChip(q.id, q.label, q.needsAmount)}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
