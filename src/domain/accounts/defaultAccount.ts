/** Respeta una cuenta pedida por la navegación; si falta, usa la principal. */
export function defaultAccountId(
  requestedId: number | undefined,
  accounts: { id: number; archived?: 0 | 1 }[],
  primaryId: number | null,
): number | null {
  const active = accounts.filter((account) => account.archived !== 1);
  if (requestedId !== undefined && active.some((account) => account.id === requestedId)) {
    return requestedId;
  }
  if (primaryId !== null && active.some((account) => account.id === primaryId)) {
    return primaryId;
  }
  return active[0]?.id ?? null;
}
