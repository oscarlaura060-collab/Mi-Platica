import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useTheme } from '@/theme';
import { Badge, Button, Card, Row, Spacer, Txt } from './ui';
import { money } from '@/utils/money';
import type {
  AllocationPlan,
  AllocationSlice,
  CoachVerdict,
} from '@/domain/coach/types';

/**
 * Hoja del COACH. Dos modos:
 *  - advertencia antes de un gasto (verdict)
 *  - sugerencia de reparto al registrar un ingreso (plan)
 *
 * Nunca impide registrar: el usuario manda. Si ignora un bloqueo, se guarda
 * `coach_override = 1` para que el dashboard pueda mostrarselo despues.
 */
export function CoachSheet({
  visible,
  verdict,
  plan,
  onClose,
  onConfirm,
  onAction,
}: {
  visible: boolean;
  verdict?: CoachVerdict | null;
  plan?: AllocationPlan | null;
  onClose: () => void;
  /**
   * `apply` son las tajadas que el usuario DECIDIO aplicar. Viene vacio
   * cuando solo quiere registrar el ingreso y repartirlo el mismo despues.
   */
  onConfirm: (apply: AllocationSlice[]) => void;
  onAction?: (
    action: NonNullable<CoachVerdict['alerts'][number]['action']>,
  ) => void;
}) {
  const t = useTheme();
  const isBlock = verdict?.level === 'block';

  // La sugerencia es eso: una sugerencia. El usuario marca que acepta.
  // Por defecto NADA viene marcado: la plata es suya y puede tener otros
  // planes que la app no conoce.
  const [picked, setPicked] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (visible) setPicked({});
  }, [visible, plan]);

  const applicable = (s: AllocationSlice) =>
    (s.kind === 'debt' && s.debtId !== undefined) ||
    (s.kind === 'invest' && s.investmentId !== undefined);

  const selected = (plan?.slices ?? []).filter((s, i) => picked[i] && applicable(s));
  const selectedTotal = selected.reduce((a, s) => a + s.amount, 0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: t.overlay }} onPress={onClose} />
      <View
        style={{
          backgroundColor: t.bgElevated,
          borderTopLeftRadius: t.radius.xl,
          borderTopRightRadius: t.radius.xl,
          paddingHorizontal: t.space(5),
          paddingTop: t.space(3),
          paddingBottom: t.space(10),
          maxHeight: '82%',
        }}
      >
        <View
          style={{
            width: 44,
            height: 4,
            borderRadius: 4,
            backgroundColor: t.border,
            alignSelf: 'center',
            marginBottom: t.space(4),
          }}
        />

        <Row gap={2}>
          <Txt variant="h2">{plan ? 'Reparto sugerido' : 'Tu coach dice'}</Txt>
          {verdict ? (
            <Badge
              label={isBlock ? 'Alto riesgo' : 'Atencion'}
              tone={isBlock ? 'danger' : 'warn'}
            />
          ) : null}
        </Row>
        <Spacer h={4} />

        <ScrollView showsVerticalScrollIndicator={false}>
          {verdict?.alerts.map((a) => (
            <Card
              key={a.code}
              tone={a.severity === 'block' ? 'danger' : a.severity === 'warn' ? 'warn' : 'info'}
              style={{ marginBottom: t.space(3) }}
            >
              <Txt variant="h3">{a.title}</Txt>
              <Spacer h={2} />
              <Txt variant="small" muted>
                {a.message}
              </Txt>
              {a.action && a.action.kind !== 'none' && onAction ? (
                <>
                  <Spacer h={3} />
                  <Button
                    label={a.action.label}
                    tone="neutral"
                    size="sm"
                    onPress={() => onAction(a.action!)}
                  />
                </>
              ) : null}
            </Card>
          ))}

          {plan ? (
            <>
              <Card tone="primary">
                <Txt variant="h3">{plan.headline}</Txt>
              </Card>
              <Spacer h={3} />
              <Txt variant="tiny" faint>
                Marca solo lo que quieras que la app haga por ti. Lo que dejes
                sin marcar queda en tu cuenta para que lo uses como quieras.
              </Txt>
              <Spacer h={3} />

              {plan.slices.map((s, i) => {
                const puede = applicable(s);
                const on = !!picked[i];
                return (
                  <Card
                    key={`${s.kind}-${i}`}
                    tone={on ? 'primary' : 'default'}
                    style={{ marginBottom: t.space(2.5) }}
                    onPress={
                      puede ? () => setPicked((p) => ({ ...p, [i]: !p[i] })) : undefined
                    }
                  >
                    {/* El monto va con numberOfLines y el texto con flex:1:
                        antes se montaba encima en pantallas angostas. */}
                    <Row gap={2} align="flex-start">
                      <View
                        style={{
                          width: 6,
                          alignSelf: 'stretch',
                          minHeight: 34,
                          borderRadius: 3,
                          backgroundColor:
                            s.kind === 'commitment'
                              ? t.danger
                              : s.kind === 'fixed'
                                ? t.violet
                                : s.kind === 'debt'
                                  ? t.warn
                                  : s.kind === 'invest' || s.kind === 'save'
                                    ? t.info
                                    : t.primary,
                        }}
                      />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Row justify="space-between" gap={2} align="flex-start">
                          <Txt variant="body" style={{ flex: 1 }} numberOfLines={2}>
                            {s.label}
                          </Txt>
                          <Txt variant="h3" numberOfLines={1}>
                            {money(s.amount)}
                          </Txt>
                        </Row>
                        <Spacer h={1} />
                        <Txt variant="tiny" faint>
                          {s.reason}
                        </Txt>

                        {puede ? (
                          <>
                            <Spacer h={2} />
                            <Row gap={2}>
                              <View
                                style={{
                                  width: 18,
                                  height: 18,
                                  borderRadius: 5,
                                  borderWidth: 2,
                                  borderColor: on ? t.primary : t.border,
                                  backgroundColor: on ? t.primary : 'transparent',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {on ? (
                                  <Txt variant="tiny" color="#04120C" weight="800">
                                    OK
                                  </Txt>
                                ) : null}
                              </View>
                              <Txt variant="tiny" color={on ? t.primary : t.textFaint}>
                                {on ? 'Se aplicara ahora' : 'Tocar para aplicarlo'}
                              </Txt>
                            </Row>
                          </>
                        ) : (
                          <>
                            <Spacer h={2} />
                            <Txt variant="tiny" faint>
                              Solo informativo: esto lo registras tu desde su
                              propia pantalla.
                            </Txt>
                          </>
                        )}
                      </View>
                    </Row>
                  </Card>
                );
              })}

              {/* PROYECCION DE LA PARTE QUE SE INVIERTE */}
              {plan.investmentOutlook ? (
                <Card tone="info">
                  <Txt variant="tiny" faint weight="700">
                    SI DEJAS QUIETOS ESOS {money(plan.investmentOutlook.amount)}
                  </Txt>
                  <Spacer h={2.5} />
                  {(
                    [
                      ['En 1 año', plan.investmentOutlook.inOneYear],
                      ['En 5 años', plan.investmentOutlook.inFiveYears],
                      ['En 10 años', plan.investmentOutlook.inTenYears],
                    ] as [string, number][]
                  ).map(([label, value]) => (
                    <View key={label}>
                      <Row justify="space-between">
                        <Txt variant="small" muted>
                          {label}
                        </Txt>
                        <Txt variant="body" weight="700">
                          {money(value)}
                        </Txt>
                      </Row>
                      <Spacer h={1.5} />
                    </View>
                  ))}
                  <Spacer h={1} />
                  <Txt variant="tiny" faint>
                    Y si repitieras este aporte todos los meses, en 10 años
                    tendrias {money(plan.investmentOutlook.monthlyInTenYears)}.
                    {plan.investmentOutlook.targetName
                      ? ` Calculado con ${plan.investmentOutlook.targetName} al ${(
                          plan.investmentOutlook.netAnnualBp / 100
                        ).toFixed(1)}% neto anual.`
                      : ` Referencia: ${(
                          plan.investmentOutlook.netAnnualBp / 100
                        ).toFixed(1)}% E.A., un CDT corriente. Registra tu vehiculo real para afinarlo.`}
                  </Txt>
                </Card>
              ) : null}
            </>
          ) : null}
        </ScrollView>

        <Spacer h={3} />
        {plan ? (
          <>
            <Button
              label={
                selected.length
                  ? `Aplicar ${money(selectedTotal)} y registrar`
                  : 'Solo registrar el ingreso'
              }
              tone="primary"
              onPress={() => onConfirm(selected)}
            />
            <Spacer h={2} />
            <Txt variant="tiny" faint align="center">
              {selected.length
                ? `Lo demas (${money(plan.total - selectedTotal)}) queda disponible en tu cuenta.`
                : 'Los $ entran a tu cuenta y tu decides despues.'}
            </Txt>
          </>
        ) : (
          <Button
            label={isBlock ? 'Registrar de todas formas' : 'Entendido, registrar'}
            tone={isBlock ? 'danger' : 'primary'}
            onPress={() => onConfirm([])}
          />
        )}
        <Spacer h={2} />
        <Button label="Cancelar" tone="ghost" onPress={onClose} />
      </View>
    </Modal>
  );
}
