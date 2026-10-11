import { all, one, run, tx } from '../index';
import { addTransaction } from './transactions';
import {
  clearPending,
  getPending,
  isEnabled,
  isSupported,
} from '../../../modules/notification-reader';
import { parseAll } from '@/domain/detect/parser';

export interface DetectedRow {
  id: number;
  notif_key: string;
  source: string;
  kind: 'expense' | 'income' | 'transfer_out' | 'unknown';
  amount: number;
  merchant: string | null;
  raw_title: string | null;
  raw_body: string | null;
  posted_at: number;
  confidence: number;
  status: 'pending' | 'confirmed' | 'ignored';
  transaction_id: number | null;
}

/**
 * Vacia la cola del servicio nativo, interpreta cada notificacion y guarda
 * las que parezcan movimientos. Se llama al abrir la app.
 */
export async function ingestNotifications(): Promise<number> {
  if (!isSupported || !isEnabled()) return 0;

  const raw = getPending();
  if (!raw.length) return 0;

  const parsed = parseAll(raw);
  let nuevos = 0;

  await tx(async () => {
    for (const d of parsed) {
      const r = await run(
        `INSERT OR IGNORE INTO detected_movements
           (notif_key, source, kind, amount, merchant, raw_title, raw_body,
            posted_at, confidence)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          d.key,
          d.source,
          d.kind,
          d.amount,
          d.merchant,
          d.rawTitle,
          d.rawBody,
          d.postedAt,
          d.confidence,
        ],
      );
      if (r.changes > 0) nuevos++;
    }
  });

  // La cola nativa se vacia solo despues de guardar: si la app se cierra
  // a mitad, las notificaciones se vuelven a procesar en el proximo
  // arranque en vez de perderse.
  clearPending();
  return nuevos;
}

export async function listDetected(status: 'pending' | 'all' = 'pending') {
  return all<DetectedRow>(
    `SELECT * FROM detected_movements
     WHERE (? = 'all' OR status = 'pending')
     ORDER BY posted_at DESC
     LIMIT 100`,
    [status],
  );
}

export async function pendingCount(): Promise<number> {
  const r = await one<{ n: number }>(
    `SELECT COUNT(*) AS n FROM detected_movements WHERE status = 'pending'`,
  );
  return r?.n ?? 0;
}

/** El usuario acepta el movimiento: aqui si se vuelve una transaccion real. */
export async function confirmDetected(input: {
  id: number;
  accountId: number;
  categoryId?: number | null;
  amount?: number;
  kind?: 'expense' | 'income';
}) {
  const row = await one<DetectedRow>('SELECT * FROM detected_movements WHERE id = ?', [
    input.id,
  ]);
  if (!row) return;

  const tipo =
    input.kind ?? (row.kind === 'income' ? 'income' : 'expense');
  const monto = input.amount ?? row.amount;

  const txId = await addTransaction({
    type: tipo,
    amount: monto,
    accountId: input.accountId,
    categoryId: input.categoryId ?? null,
    note: row.merchant ?? row.source,
    occurredAt: new Date(row.posted_at).toISOString(),
  });

  await run(
    `UPDATE detected_movements SET status = 'confirmed', transaction_id = ? WHERE id = ?`,
    [txId, input.id],
  );
  return txId;
}

export async function ignoreDetected(id: number) {
  await run(`UPDATE detected_movements SET status = 'ignored' WHERE id = ?`, [id]);
}

export async function ignoreAllPending() {
  await run(`UPDATE detected_movements SET status = 'ignored' WHERE status = 'pending'`);
}
