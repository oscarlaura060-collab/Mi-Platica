import React, { useEffect, useState } from 'react';
import { useTheme } from '@/theme';
import { Badge, Button, Card, Row, Spacer, Txt } from './ui';
import { money } from '@/utils/money';
import type {
  AllocationPlan,
  AllocationSlice,
  CoachVerdict,
} from '@/domain/coach/types';

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
  onConfirm: (apply: AllocationSlice[]) => void;
  onAction?: (
    action: NonNullable<CoachVerdict['alerts'][number]['action']>,
  ) => void;
}) {
  const t = useTheme();
  const isBlock = verdict?.level === 'block';
  const [picked, setPicked] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (visible) setPicked({});
  }, [visible, plan]);

  if (!visible) return null;

  const applicable = (s: AllocationSlice) =>
    (s.kind === 'debt' && s.debtId !== undefined) ||
    (s.kind === 'invest' && s.investmentId !== undefined);

  const selected = (plan?.slices ?? []).filter((s, i) => picked[i] && applicable(s));
  const selectedTotal = selected.reduce((a, s) => a + s.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-lg rounded-t-3xl p-5 sm:p-6 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom border-t shadow-2xl"
        style={{
          backgroundColor: t.bgElevated,
          borderColor: t.border,
        }}
      >
        <div className="w-11 h-1 rounded-full mx-auto mb-4" style={{ backgroundColor: t.border }} />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Txt variant="h2">{plan ? 'Reparto sugerido' : 'Tu Coach dice'}</Txt>
            {verdict ? (
              <Badge
                label={isBlock ? 'Alto riesgo' : 'Atención'}
                tone={isBlock ? 'danger' : 'warn'}
              />
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-bold px-2 py-1 rounded-md cursor-pointer hover:bg-white/10"
            style={{ color: t.textMuted }}
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {verdict?.alerts.map((a) => (
            <Card
              key={a.code}
              tone={a.severity === 'block' ? 'danger' : a.severity === 'warn' ? 'warn' : 'info'}
            >
              <Txt variant="h3">{a.title}</Txt>
              <Spacer h={2} />
              <Txt variant="small" muted>
                {a.message}
              </Txt>
              {a.action && a.action.kind !== 'none' && onAction ? (
                <div className="mt-3">
                  <Button
                    label={a.action.label}
                    tone="neutral"
                    size="sm"
                    onPress={() => onAction(a.action!)}
                  />
                </div>
              ) : null}
            </Card>
          ))}

          {plan ? (
            <>
              <Card tone="primary">
                <Txt variant="h3">{plan.headline}</Txt>
              </Card>
              <Txt variant="tiny" faint>
                Marca lo que quieras aplicar ahora. Lo que dejes sin marcar queda disponible en tu cuenta.
              </Txt>

              {plan.slices.map((s, i) => {
                const puede = applicable(s);
                const on = !!picked[i];
                return (
                  <Card
                    key={`${s.kind}-${i}`}
                    tone={on ? 'primary' : 'default'}
                    onPress={
                      puede ? () => setPicked((p) => ({ ...p, [i]: !p[i] })) : undefined
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <Txt variant="body" weight="700">
                          {s.label}
                        </Txt>
                        <Txt variant="tiny" faint>
                          {s.reason}
                        </Txt>
                        {puede ? (
                          <div className="mt-2 flex items-center gap-1.5 text-xs font-bold" style={{ color: on ? t.primary : t.textFaint }}>
                            <span>{on ? '✓ Se aplicará ahora' : '○ Tocar para aplicar'}</span>
                          </div>
                        ) : null}
                      </div>
                      <Txt variant="h3" color={t.text}>
                        {money(s.amount)}
                      </Txt>
                    </div>
                  </Card>
                );
              })}
            </>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col gap-2">
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
              <p className="text-center text-xs" style={{ color: t.textFaint }}>
                {selected.length
                  ? `Lo demás (${money(plan.total - selectedTotal)}) queda disponible en tu cuenta.`
                  : 'Los $ entran a tu cuenta y tú decides después.'}
              </p>
            </>
          ) : (
            <Button
              label={isBlock ? 'Registrar de todas formas' : 'Entendido, registrar'}
              tone={isBlock ? 'danger' : 'primary'}
              onPress={() => onConfirm([])}
            />
          )}
          <Button label="Cancelar" tone="ghost" onPress={onClose} />
        </div>
      </div>
    </div>
  );
}
