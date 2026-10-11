import { all, one, run } from '../index';
import type { Category } from '../types';

export async function listCategories(kind?: 'expense' | 'income') {
  return all<Category>(
    `SELECT * FROM categories
     WHERE archived = 0 AND (? IS NULL OR kind = ?)
     ORDER BY sort_order, name`,
    [kind ?? null, kind ?? null],
  );
}

export async function getCategory(id: number) {
  return one<Category>('SELECT * FROM categories WHERE id = ?', [id]);
}

export async function createCategory(
  c: Pick<Category, 'name' | 'kind'> & Partial<Category>,
) {
  const r = await run(
    `INSERT INTO categories (name, kind, emoji, color, monthly_budget, is_essential, sort_order)
     VALUES (?,?,?,?,?,?, (SELECT COALESCE(MAX(sort_order),0)+1 FROM categories))`,
    [
      c.name.trim(),
      c.kind,
      c.emoji ?? '*',
      c.color ?? '#64748B',
      c.monthly_budget ?? null,
      c.is_essential ?? 0,
    ],
  );
  return r.lastInsertRowId as number;
}

export async function setBudget(id: number, monthlyBudgetCents: number | null) {
  await run('UPDATE categories SET monthly_budget = ? WHERE id = ?', [
    monthlyBudgetCents,
    id,
  ]);
}

/** Categorias mas usadas: alimentan el acceso de 1 toque en el registro. */
export async function topCategories(kind: 'expense' | 'income', limit = 6) {
  return all<Category & { uses: number }>(
    `SELECT c.*, COUNT(t.id) AS uses
     FROM categories c
     LEFT JOIN transactions t
       ON t.category_id = c.id AND t.deleted_at IS NULL
       AND t.occurred_day >= date('now','-60 days')
     WHERE c.archived = 0 AND c.kind = ?
     GROUP BY c.id
     ORDER BY uses DESC, c.sort_order
     LIMIT ?`,
    [kind, limit],
  );
}
