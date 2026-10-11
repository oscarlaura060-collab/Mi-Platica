/** Devuelve el siguiente periodo de recibo que aún no se haya confirmado. */
export function nextReceiptPeriod(
  month: string,
  frequency: string,
  hasSecondPayDay: boolean,
  receivedPeriods: string[],
): string | null {
  const periods = frequency === 'biweekly' && hasSecondPayDay
    ? [month, `${month}-Q2`]
    : [month];
  return periods.find((period) => !receivedPeriods.includes(period)) ?? null;
}
