import initSqlJs, { Database } from 'sql.js';
import { MIGRATIONS } from './migrations';

const STORAGE_KEY = 'miplatica_sqlite_db_v1';
let db: Database | null = null;
let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export function persistDb(): void {
  if (!db) return;
  try {
    const data = db.export();
    // Chunks-based base64 encoding to avoid call stack limits on large buffers
    let binary = '';
    const bytes = new Uint8Array(data);
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
    }
    const base64 = btoa(binary);
    localStorage.setItem(STORAGE_KEY, base64);
  } catch (err) {
    console.warn('No se pudo guardar la base de datos en localStorage:', err);
  }
}

function debouncedPersist(): void {
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(persistDb, 250);
}

/**
 * Abre la base de datos SQLite con WebAssembly (sql.js) y ejecuta
 * todas las migraciones pendientes.
 */
export async function openDb(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs({
    locateFile: (file) => `/${file}`,
  });

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const binary = atob(saved);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      db = new SQL.Database(bytes);
    } catch (e) {
      console.warn('Error al cargar la base guardada, creando una nueva:', e);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  db.exec('PRAGMA foreign_keys = ON;');

  // Migraciones
  const row = db.exec('PRAGMA user_version;');
  let current = 0;
  if (row.length && row[0].values.length) {
    current = Number(row[0].values[0][0]) || 0;
  }

  for (const m of MIGRATIONS) {
    if (m.version <= current) continue;
    try {
      db.exec(m.sql);
      db.exec(`PRAGMA user_version = ${m.version};`);
      current = m.version;
    } catch (err) {
      console.error(`Error en migracion ${m.version} (${m.name}):`, err);
      throw err;
    }
  }

  // Si es una instalación limpia sin cuentas, sembrar datos iniciales colombianos de ejemplo
  const acctCheck = db.exec('SELECT COUNT(*) FROM accounts;');
  const acctCount = acctCheck.length ? Number(acctCheck[0].values[0][0]) : 0;
  if (acctCount === 0) {
    seedInitialData(db);
  }

  debouncedPersist();
  return db;
}

function seedInitialData(database: Database): void {
  const hoy = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  database.exec(`
    -- Cuentas colombianas
    INSERT INTO accounts (id, name, type, provider_key, currency, color, initial_balance, credit_limit, statement_day, payment_due_day, card_rate_bp, include_in_total, sort_order)
    VALUES
      (1, 'Bancolombia', 'bank', 'bancolombia', 'COP', '#FDDA24', 285000000, NULL, NULL, NULL, 0, 1, 1),
      (2, 'Nequi', 'wallet', 'nequi', 'COP', '#200020', 85000000, NULL, NULL, NULL, 0, 1, 2),
      (3, 'Efectivo', 'cash', 'efectivo', 'COP', '#16A34A', 15000000, NULL, NULL, NULL, 0, 1, 3),
      (4, 'Tarjeta Nu', 'credit_card', 'nu', 'COP', '#820AD1', -45000000, 300000000, 18, 5, 230, 0, 4);

    -- Ajuste de cuenta principal
    INSERT OR REPLACE INTO settings (key, value) VALUES ('primary_account_id', '1');
    INSERT OR REPLACE INTO settings (key, value) VALUES ('user_name', 'Carlos');

    -- Gastos fijos
    INSERT INTO fixed_expenses (name, amount, due_day, frequency, is_essential)
    VALUES
      ('Arriendo', 120000000, 5, 'monthly', 1),
      ('Servicios Públicos (EPM)', 22000000, 14, 'monthly', 1),
      ('Mercado Quincenal', 35000000, 15, 'biweekly', 1);

    -- Ingresos fijos
    INSERT INTO fixed_incomes (name, amount, pay_day, pay_day_2, frequency, is_reliable)
    VALUES
      ('Salario Quincenal', 180000000, 15, 30, 'biweekly', 1);

    -- Metas de ahorro
    INSERT INTO savings_goals (name, target_amount, initial_amount, frequency, planned_contribution, plan_kind, color, emoji)
    VALUES
      ('Fondo de Emergencia', 500000000, 150000000, 'biweekly', 25000000, 'recommended', '#14C4D4', '🛡️'),
      ('Vacaciones Caribe', 250000000, 60000000, 'biweekly', 15000000, 'recommended', '#FFD447', '🏖️');

    -- Deudas
    INSERT INTO debts (name, creditor, kind, principal, monthly_rate_bp, installments_total, installment_amount, due_day, start_date, account_id, color)
    VALUES
      ('Crédito de Libre Inversión', 'Bancolombia', 'loan', 450000000, 195, 24, 23500000, 12, '${hoy}', 1, '#FF6F61');

    -- Movimientos iniciales de ejemplo
    INSERT INTO transactions (type, amount, account_id, category_id, notes, occurred_at, occurred_day)
    VALUES
      ('income', 180000000, 1, 10, 'Pago primera quincena', '${now}', '${hoy}'),
      ('expense', 4500000, 2, 2, 'Almuerzo corriente', '${now}', '${hoy}'),
      ('expense', 1800000, 3, 4, 'Pasaje transporte', '${now}', '${hoy}'),
      ('expense', 12000000, 1, 1, 'Mercado D1', '${now}', '${hoy}');
  `);
}

export function getDb(): Database {
  if (!db) throw new Error('DB no inicializada: llama openDb() primero.');
  return db;
}

export async function all<T>(sql: string, params: (string | number | boolean | null | undefined)[] = []): Promise<T[]> {
  const conn = getDb();
  const stmt = conn.prepare(sql);
  try {
    if (params && params.length > 0) {
      stmt.bind(params.map((p) => (p === undefined ? null : p)));
    }
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as T);
    }
    return results;
  } finally {
    stmt.free();
  }
}

export async function one<T>(sql: string, params: (string | number | boolean | null | undefined)[] = []): Promise<T | null> {
  const rows = await all<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function run(
  sql: string,
  params: (string | number | boolean | null | undefined)[] = [],
): Promise<{ lastInsertRowId: number; changes: number }> {
  const conn = getDb();
  const stmt = conn.prepare(sql);
  try {
    if (params && params.length > 0) {
      stmt.bind(params.map((p) => (p === undefined ? null : p)));
    }
    stmt.step();
  } finally {
    stmt.free();
  }

  const lastIdRes = conn.exec('SELECT last_insert_rowid();');
  const lastInsertRowId = lastIdRes.length && lastIdRes[0].values.length ? Number(lastIdRes[0].values[0][0]) : 0;
  const changesRes = conn.exec('SELECT changes();');
  const changes = changesRes.length && changesRes[0].values.length ? Number(changesRes[0].values[0][0]) : 0;

  debouncedPersist();
  return { lastInsertRowId, changes };
}

export async function tx(fn: () => Promise<void>): Promise<void> {
  const conn = getDb();
  conn.exec('BEGIN TRANSACTION;');
  try {
    await fn();
    conn.exec('COMMIT;');
    debouncedPersist();
  } catch (err) {
    try {
      conn.exec('ROLLBACK;');
    } catch (_) {}
    throw err;
  }
}

export async function wipeAllData(): Promise<void> {
  await tx(async () => {
    for (const t of [
      'debt_payments',
      'fixed_expense_payments',
      'fixed_income_receipts',
      'goal_contributions',
      'investment_moves',
      'installment_plans',
      'detected_movements',
      'transactions',
      'reminders',
      'goals',
      'fixed_expenses',
      'fixed_incomes',
      'debts',
      'savings_goals',
      'investments',
      'accounts',
    ]) {
      await run(`DELETE FROM ${t};`);
    }
  });
  persistDb();
}
