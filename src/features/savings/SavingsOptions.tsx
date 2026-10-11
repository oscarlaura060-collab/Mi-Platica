import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme';
import { Badge, Button, Card, Chip, Row, Spacer, Txt } from '@/components/ui';
import { MoneyInput } from '@/components/MoneyInput';
import { money } from '@/utils/money';
import { format } from '@/utils/date';
import { es } from 'date-fns/locale';
import { FREQUENCY_LABEL, type Frequency } from '@/domain/savings/plan';
import type { OptionsResult, SavingsOption } from '@/domain/savings/options';

const fecha = (d: Date | null) =>
  d ? format(d, "d 'de' LLLL 'de' yyyy", { locale: es }) : '—';

/** "8 quincenas (4 meses)" */
function duracion(periods: number | null, freq: Frequency): string {
  if (periods === null) return 'nunca con ese aporte';
  if (periods === 0) return 'ya mismo';
  const etiqueta = FREQUENCY_LABEL[freq];
  const plural = periods === 1 ? etiqueta : `${etiqueta}s`;
  const meses = freq === 'biweekly' ? Math.round(periods / 2) : periods;
  const extra =
    freq === 'biweekly' && meses >= 1 ? ` (unos ${meses} ${meses === 1 ? 'mes' : 'meses'})` : '';
  return `${periods} ${plural}${extra}`;
}

/**
 * Las cuatro formas de llegar a la meta, para comparar de un vistazo.
 * El usuario escoge una y puede ajustar el aporte antes de guardar.
 */
export function SavingsOptions({
  result,
  remaining,
  frequency,
  selected,
  customAmount,
  onSelect,
  onCustomAmount,
  onUseSuggestedDate,
}: {
  result: OptionsResult;
  remaining: number;
  frequency: Frequency;
  selected: SavingsOption['kind'] | null;
  customAmount: number;
  onSelect: (o: SavingsOption) => void;
  onCustomAmount: (cents: number) => void;
  onUseSuggestedDate: (date: Date) => void;
}) {
  const t = useTheme();
  const etiqueta = FREQUENCY_LABEL[frequency];

  // --- Sin margen -----------------------------------------------------
  // Antes aqui se cortaba la pantalla: se mostraba un aviso y ni una sola
  // opcion que tocar. Ahora el aviso explica la situacion y DEBAJO siguen
  // las opciones chicas y el monto a mano, porque ahorrar poco sigue
  // siendo ahorrar.
  const sinMargen = result.safePerPeriod <= 0;
  const elegida = result.options.find((o) => o.kind === selected);

  return (
    <View>
      <Txt variant="tiny" faint weight="700">
        ELIGE COMO QUIERES LLEGAR
      </Txt>
      <Spacer h={1.5} />
      <Txt variant="tiny" faint>
        Calculado con tus ingresos, gastos fijos y deudas. Te faltan{' '}
        {money(remaining)}.
      </Txt>
      <Spacer h={3} />

      {sinMargen ? (
        <>
          <Card tone="warn">
            <Txt variant="body" weight="700">
              Vas justo este mes
            </Txt>
            <Spacer h={1.5} />
            <Txt variant="small" muted>
              {result.missing.length
                ? `Con lo que se de ti no me sobra margen para calcular un aporte holgado. Si registras ${result.missing.join(', ')} te propongo uno mejor. Mientras tanto, arranca con poco:`
                : 'Entre tus gastos fijos y tus deudas no queda margen libre. Eso no quiere decir que no puedas ahorrar: quiere decir que toca arrancar pequeno.'}
            </Txt>
          </Card>
          <Spacer h={3} />
        </>
      ) : null}

      {result.options.map((o) => {
        const activa = selected === o.kind;
        const destacada = result.highlight === o.kind;
        const imposible = o.kind === 'target' && !o.feasible;

        return (
          <Card
            key={o.kind}
            tone={activa ? 'primary' : imposible ? 'warn' : 'default'}
            style={{ marginBottom: t.space(2.5) }}
            onPress={() => onSelect(o)}
          >
            <Row justify="space-between" align="flex-start" gap={2}>
              <Row gap={2} style={{ flex: 1 }}>
                {/* Marca de seleccion */}
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: activa ? t.primary : t.border,
                    backgroundColor: activa ? t.primary : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 2,
                  }}
                >
                  {activa ? (
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: t.onPrimary,
                      }}
                    />
                  ) : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Row gap={2} align="center" style={{ flexWrap: 'wrap' }}>
                    <Txt variant="body" weight="700">
                      {o.title}
                    </Txt>
                    {destacada ? <Badge label="sugerida" tone="ok" /> : null}
                    {imposible ? <Badge label="apretado" tone="warn" /> : null}
                  </Row>
                </View>
              </Row>
              <View style={{ alignItems: 'flex-end' }}>
                <Txt variant="h3" numberOfLines={1}>
                  {money(o.amount)}
                </Txt>
                <Txt variant="tiny" faint>
                  por {etiqueta}
                </Txt>
              </View>
            </Row>

            <Spacer h={2.5} />
            <Row justify="space-between" gap={2}>
              <View style={{ flex: 1 }}>
                <Txt variant="tiny" faint>
                  Tiempo
                </Txt>
                <Txt variant="small" numberOfLines={1}>
                  {duracion(o.periods, frequency)}
                </Txt>
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="tiny" faint>
                  {o.kind === 'target' ? 'Tu fecha' : 'Llegarias el'}
                </Txt>
                <Txt variant="small" numberOfLines={1}>
                  {o.endDate
                    ? format(o.endDate, "d 'de' LLL yyyy", { locale: es })
                    : '—'}
                </Txt>
              </View>
            </Row>

            <Spacer h={2} />
            <Txt variant="tiny" faint>
              {o.reason}
            </Txt>

            {o.feasible && o.leftAfter > 0 ? (
              <>
                <Spacer h={1.5} />
                <Txt variant="tiny" color={t.primary}>
                  Te quedarian {money(o.leftAfter)} libres cada {etiqueta}.
                </Txt>
              </>
            ) : null}
          </Card>
        );
      })}

      {/* Fecha alternativa cuando la elegida no da */}
      {result.suggestedDate ? (
        <>
          <Card tone="info">
            <Txt variant="body" weight="700">
              Una fecha mas realista
            </Txt>
            <Spacer h={1.5} />
            <Txt variant="small" muted>
              Aportando lo maximo que puedes sin quedarte corto (
              {money(result.safePerPeriod)} por {etiqueta}), llegarias el{' '}
              {fecha(result.suggestedDate)}.
            </Txt>
            <Spacer h={2} />
            <Txt variant="tiny" faint>
              Tu meta no cambia: solo se moveria la fecha, y solo si tu lo
              decides.
            </Txt>
            <Spacer h={3} />
            <Button
              label="Usar esta fecha"
              tone="neutral"
              size="sm"
              onPress={() => onUseSuggestedDate(result.suggestedDate!)}
            />
          </Card>
          <Spacer h={3} />
        </>
      ) : null}

      {/* Monto a mano. Siempre disponible y sin minimo: si la persona
          quiere poner 2.000 por quincena, esa es su decision, no un error
          que la app deba corregir. Antes solo aparecia despues de elegir
          una opcion, asi que sin opciones no habia forma de escribir nada. */}
      <Card tone="alt">
        <Txt variant="tiny" faint weight="700">
          {elegida ? 'AJUSTA EL APORTE SI QUIERES' : 'O ESCRIBE CUANTO QUIERES APORTAR'}
        </Txt>
        <Spacer h={2} />
        <MoneyInput
          value={customAmount}
          onChange={onCustomAmount}
          helper={
            customAmount <= 0
              ? `Lo que puedas, cada ${etiqueta}. No hay monto minimo.`
              : !sinMargen && customAmount > result.safePerPeriod
                ? `Ojo: es mas de los ${money(result.safePerPeriod)} que te sobran cada ${etiqueta}.`
                : `Llegarias en ${duracion(Math.ceil(remaining / customAmount), frequency)}.`
          }
        />
      </Card>

      {result.isEstimate ? (
        <>
          <Spacer h={2} />
          <Txt variant="tiny" faint>
            Tus gastos basicos son una ESTIMACION segun tu promedio. Para
            afinarlo, escribe el valor real en Ajustes.
          </Txt>
        </>
      ) : null}
    </View>
  );
}
