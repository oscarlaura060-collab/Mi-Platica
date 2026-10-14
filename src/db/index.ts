import * as SQLite from 'expo-sqlite';
import { MIGRATIONS } from './migrations';

const DB_NAME = 'finzen.db';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Abre (una sola vez) la base local y corre las migraciones pendientes.
 * `user_version` de SQLite es el control de versiones: barato y atomico.
 */
export async function openDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  const conn = await SQLite.openDatabaseAsync(DB_NAME);
  db = conn;

  await conn.execAsync('PRAGMA journal_mode = WAL;');
  await conn.execAsync('PRAGMA foreign_keys = ON;');

  const row = await conn.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  let current = row?.user_version ?? 0;

  for (const m of MIGRATIONS) {
    if (m.version <= current) continue;
    await conn.withTransactionAsync(async () => {
      await conn.execAsync(m.sql);
    });
    // PRAGMA no acepta parametros ligados
    await conn.execAsync(`PRAGMA user_version = ${m.version};`);
    current = m.version;
  }

  return conn;
}

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) throw new Error('DB no inicializada: llama openDb() primero.');
  return db;
}

/** Helpers tipados y cortos para los repositorios. */
export async function all<T>(sql: string, params: SQLite.SQLiteBindValue[] = []) {
  return getDb().getAllAsync<T>(sql, params);
}

export async function one<T>(sql: string, params: SQLite.SQLiteBindValue[] = []) {
  return getDb().getFirstAsync<T>(sql, params);
}

export async function run(sql: string, params: SQLite.SQLiteBindValue[] = []) {
  return getDb().runAsync(sql, params);
}

export async function tx(fn: () => Promise<void>) {
  await getDb().withTransactionAsync(fn);
}

/** Util para pruebas / "borrar todos mis datos" desde Ajustes. */
export async function wipeAllData() {
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
}
