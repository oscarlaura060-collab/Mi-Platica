import { all, one, run } from '../index';
import type { CoachRuleRow } from '../types';

export async function getSetting(key: string): Promise<string | null> {
  const r = await one<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key],
  );
  return r?.value ?? null;
}

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await all<{ key: string; value: string }>('SELECT * FROM settings');
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function setSetting(key: string, value: string) {
  await run(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
}

export async function getNumberSetting(key: string, fallback: number) {
  const v = await getSetting(key);
  const n = v === null ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function listCoachRules(): Promise<CoachRuleRow[]> {
  return all<CoachRuleRow>('SELECT * FROM coach_rules');
}

export async function setCoachRule(
  code: string,
  patch: Partial<Pick<CoachRuleRow, 'enabled' | 'severity' | 'params_json'>>,
) {
  const fields: string[] = [];
  const params: (string | number)[] = [];
  for (const [k, v] of Object.entries(patch)) {
    fields.push(`${k} = ?`);
    params.push(v as string | number);
  }
  if (!fields.length) return;
  params.push(code);
  await run(`UPDATE coach_rules SET ${fields.join(', ')} WHERE code = ?`, params);
}
