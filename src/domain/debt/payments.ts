/** Valida pagos en centavos enteros antes de tocar saldos o historial. */
export function validatePaymentAmount(amount: number, outstanding: number): number {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error('El pago debe ser un monto mayor que cero.');
  }
  if (!Number.isSafeInteger(outstanding) || outstanding < 0) {
    throw new Error('El saldo pendiente no es válido.');
  }
  if (amount > outstanding) {
    throw new Error(`El saldo pendiente es ${outstanding}. Corrige el monto antes de registrar el pago.`);
  }
  return amount;
}
