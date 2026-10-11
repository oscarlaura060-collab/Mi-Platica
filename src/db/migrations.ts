/**
 * Esquema SQLite — 100% local. Sin red, sin sync, sin telemetria.
 *
 * Convenciones:
 *  - El dinero se guarda SIEMPRE en entero (unidades menores: centavos).
 *    COP no usa centavos en la practica, pero guardar entero evita errores
 *    de punto flotante. 1.000 COP => 100000.
 *  - Las fechas se guardan como TEXT ISO-8601 UTC y ademas se materializa
 *    `occurred_day` ("YYYY-MM-DD" en hora local) para agrupar por dia sin
 *    recalcular zonas horarias en cada consulta.
 *  - Borrado logico (`deleted_at`) en transacciones para poder deshacer.
 */

export type Migration = { version: number; name: string; sql: string };

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'core',
    sql: `
    PRAGMA foreign_keys = ON;

    ------------------------------------------------------------------
    -- CUENTAS (multicuenta modular: banco, billetera, efectivo, etc.)
    ------------------------------------------------------------------
    CREATE TABLE accounts (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      name             TEXT    NOT NULL,
      -- 'bank' | 'wallet' | 'cash' | 'credit_card' | 'savings' | 'other'
      type             TEXT    NOT NULL DEFAULT 'bank',
      -- clave libre del preset visual: bancolombia, nequi, daviplata, efectivo...
      provider_key     TEXT,
      currency         TEXT    NOT NULL DEFAULT 'COP',
      color            TEXT    NOT NULL DEFAULT '#10B981',
      emoji            TEXT,
      initial_balance  INTEGER NOT NULL DEFAULT 0,
      -- tarjetas de credito: cupo y dia de corte (opcional)
      credit_limit     INTEGER,
      statement_day    INTEGER,
      include_in_total INTEGER NOT NULL DEFAULT 1 CHECK (include_in_total IN (0,1)),
      archived         INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0,1)),
      sort_order       INTEGER NOT NULL DEFAULT 0,
      created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX idx_accounts_active ON accounts(archived, sort_order);

    ------------------------------------------------------------------
    -- CATEGORIAS
    ------------------------------------------------------------------
    CREATE TABLE categories (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      name           TEXT    NOT NULL,
      kind           TEXT    NOT NULL CHECK (kind IN ('expense','income')),
      emoji          TEXT    NOT NULL DEFAULT '*',
      color          TEXT    NOT NULL DEFAULT '#64748B',
      -- presupuesto mensual opcional (entero, centavos). NULL = sin tope
      monthly_budget INTEGER,
      -- 1 = gasto esencial (arriendo, mercado, servicios). El coach es mas
      -- permisivo con esenciales y mas estricto con los no esenciales.
      is_essential   INTEGER NOT NULL DEFAULT 0 CHECK (is_essential IN (0,1)),
      archived       INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0,1)),
      sort_order     INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX idx_categories_kind ON categories(kind, archived);

    ------------------------------------------------------------------
    -- DEUDAS
    ------------------------------------------------------------------
    CREATE TABLE debts (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      name               TEXT    NOT NULL,
      creditor           TEXT,
      -- 'credit_card' | 'loan' | 'installment' | 'person' | 'other'
      kind               TEXT    NOT NULL DEFAULT 'loan',
      -- capital inicial financiado (centavos)
      principal          INTEGER NOT NULL,
      -- tasa nominal MENSUAL en basis points (1.5% => 150) para evitar
      -- decimales. 0 = sin interes (p.e. deuda con un familiar).
      monthly_rate_bp    INTEGER NOT NULL DEFAULT 0,
      installments_total INTEGER NOT NULL DEFAULT 1,
      -- cuota pactada (centavos). Si es NULL se calcula por amortizacion.
      installment_amount INTEGER,
      due_day            INTEGER NOT NULL DEFAULT 1 CHECK (due_day BETWEEN 1 AND 31),
      start_date         TEXT    NOT NULL,
      account_id         INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
      color              TEXT    NOT NULL DEFAULT '#EF4444',
      notes              TEXT,
      status             TEXT    NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active','paid','paused')),
      created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at         TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX idx_debts_status ON debts(status, due_day);

    ------------------------------------------------------------------
    -- METAS DE AHORRO
    ------------------------------------------------------------------
    CREATE TABLE goals (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      target_amount INTEGER NOT NULL,
      target_date   TEXT,
      account_id    INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
      emoji         TEXT    NOT NULL DEFAULT 'G',
      color         TEXT    NOT NULL DEFAULT '#6366F1',
      status        TEXT    NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','done','archived')),
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    ------------------------------------------------------------------
    -- TRANSACCIONES (libro unico: ingresos, gastos, traslados, abonos)
    ------------------------------------------------------------------
    CREATE TABLE transactions (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      type           TEXT    NOT NULL
                     CHECK (type IN ('expense','income','transfer','debt_payment','goal_deposit')),
      -- SIEMPRE positivo; el signo lo define la columna "type"
      amount         INTEGER NOT NULL CHECK (amount > 0),
      account_id     INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      to_account_id  INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
      category_id    INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      debt_id        INTEGER REFERENCES debts(id) ON DELETE SET NULL,
      goal_id        INTEGER REFERENCES goals(id) ON DELETE SET NULL,
      note           TEXT,
      occurred_at    TEXT    NOT NULL,
      occurred_day   TEXT    NOT NULL,
      -- rastro del coach: que veredicto se mostro y si el usuario lo ignoro
      coach_verdict  TEXT,
      coach_override INTEGER NOT NULL DEFAULT 0 CHECK (coach_override IN (0,1)),
      created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      deleted_at     TEXT
    );
    CREATE INDEX idx_tx_day      ON transactions(occurred_day, deleted_at);
    CREATE INDEX idx_tx_account  ON transactions(account_id, deleted_at);
    CREATE INDEX idx_tx_category ON transactions(category_id, occurred_day);
    CREATE INDEX idx_tx_debt     ON transactions(debt_id, deleted_at);

    ------------------------------------------------------------------
    -- ABONOS A DEUDA (desglose capital / interes por pago)
    ------------------------------------------------------------------
    CREATE TABLE debt_payments (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      debt_id        INTEGER NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
      transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
      amount         INTEGER NOT NULL CHECK (amount > 0),
      interest_part  INTEGER NOT NULL DEFAULT 0,
      principal_part INTEGER NOT NULL DEFAULT 0,
      installment_no INTEGER,
      -- 1 = abono extraordinario a capital (no consume cuota del plan)
      is_extra       INTEGER NOT NULL DEFAULT 0 CHECK (is_extra IN (0,1)),
      paid_at        TEXT    NOT NULL,
      note           TEXT
    );
    CREATE INDEX idx_dp_debt ON debt_payments(debt_id, paid_at);

    ------------------------------------------------------------------
    -- RECORDATORIOS LOCALES
    ------------------------------------------------------------------
    CREATE TABLE reminders (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      -- 'debt_due' | 'daily_log' | 'weekly_review' | 'custom'
      kind            TEXT    NOT NULL,
      debt_id         INTEGER REFERENCES debts(id) ON DELETE CASCADE,
      title           TEXT    NOT NULL,
      body            TEXT,
      hour            INTEGER NOT NULL DEFAULT 20 CHECK (hour BETWEEN 0 AND 23),
      minute          INTEGER NOT NULL DEFAULT 0  CHECK (minute BETWEEN 0 AND 59),
      -- para 'debt_due': cuantos dias antes del vencimiento avisar
      days_before     INTEGER NOT NULL DEFAULT 2,
      -- para semanales: 1=lunes ... 7=domingo
      weekday         INTEGER,
      enabled         INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
      -- id devuelto por expo-notifications, para poder cancelar
      notification_id TEXT,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    ------------------------------------------------------------------
    -- REGLAS DEL COACH (parametrizables por el usuario)
    ------------------------------------------------------------------
    CREATE TABLE coach_rules (
      code        TEXT PRIMARY KEY,
      enabled     INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
      severity    TEXT    NOT NULL DEFAULT 'warn' CHECK (severity IN ('info','warn','block')),
      params_json TEXT    NOT NULL DEFAULT '{}'
    );

    ------------------------------------------------------------------
    -- AJUSTES (clave/valor)
    ------------------------------------------------------------------
    CREATE TABLE settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    ------------------------------------------------------------------
    -- VISTAS: saldos siempre derivados del libro (nunca denormalizados)
    ------------------------------------------------------------------
    CREATE VIEW v_account_balances AS
    SELECT
      a.id, a.name, a.type, a.provider_key, a.color, a.emoji, a.currency,
      a.include_in_total, a.archived, a.sort_order, a.credit_limit,
      a.initial_balance
        + COALESCE((SELECT SUM(t.amount) FROM transactions t
                     WHERE t.account_id = a.id AND t.deleted_at IS NULL
                       AND t.type = 'income'), 0)
        + COALESCE((SELECT SUM(t.amount) FROM transactions t
                     WHERE t.to_account_id = a.id AND t.deleted_at IS NULL
                       AND t.type = 'transfer'), 0)
        - COALESCE((SELECT SUM(t.amount) FROM transactions t
                     WHERE t.account_id = a.id AND t.deleted_at IS NULL
                       AND t.type IN ('expense','transfer','debt_payment','goal_deposit')), 0)
      AS balance
    FROM accounts a;

    CREATE VIEW v_debt_progress AS
    SELECT
      d.id, d.name, d.creditor, d.kind, d.color, d.principal,
      d.monthly_rate_bp, d.installments_total, d.installment_amount,
      d.due_day, d.start_date, d.status,
      COALESCE(SUM(p.amount), 0)          AS paid_total,
      COALESCE(SUM(p.principal_part), 0)  AS paid_principal,
      COALESCE(SUM(p.interest_part), 0)   AS paid_interest,
      MAX(d.principal - COALESCE(SUM(p.principal_part), 0), 0) AS outstanding,
      COUNT(CASE WHEN p.is_extra = 0 THEN 1 END) AS installments_paid,
      MAX(p.paid_at)                      AS last_payment_at
    FROM debts d
    LEFT JOIN debt_payments p ON p.debt_id = d.id
    GROUP BY d.id;

    CREATE VIEW v_daily_expense AS
    SELECT occurred_day AS day, SUM(amount) AS total, COUNT(*) AS n
    FROM transactions
    WHERE type = 'expense' AND deleted_at IS NULL
    GROUP BY occurred_day;
    `,
  },
  {
    version: 2,
    name: 'seed',
    sql: `
    INSERT INTO categories (name, kind, emoji, color, is_essential, sort_order) VALUES
      ('Mercado',         'expense', '\u{1F6D2}', '#22C55E', 1, 1),
      ('Arriendo',        'expense', '\u{1F3E0}', '#0EA5E9', 1, 2),
      ('Servicios',       'expense', '\u{1F4A1}', '#F59E0B', 1, 3),
      ('Transporte',      'expense', '\u{1F68C}', '#8B5CF6', 1, 4),
      ('Salud',           'expense', '\u{1F48A}', '#EF4444', 1, 5),
      ('Comida fuera',    'expense', '\u{1F354}', '#F97316', 0, 6),
      ('Entretenimiento', 'expense', '\u{1F3AC}', '#EC4899', 0, 7),
      ('Compras',         'expense', '\u{1F6CD}', '#A855F7', 0, 8),
      ('Suscripciones',   'expense', '\u{1F4FA}', '#6366F1', 0, 9),
      ('Otros',           'expense', '\u{2022}',  '#64748B', 0, 99),
      ('Salario',         'income',  '\u{1F4BC}', '#10B981', 0, 1),
      ('Freelance',       'income',  '\u{1F4BB}', '#14B8A6', 0, 2),
      ('Ventas',          'income',  '\u{1F3F7}', '#84CC16', 0, 3),
      ('Otro ingreso',    'income',  '\u{2795}',  '#64748B', 0, 99);

    INSERT INTO coach_rules (code, enabled, severity, params_json) VALUES
      ('INSUFFICIENT_FUNDS',   1, 'block', '{}'),
      ('COMMITMENTS_AT_RISK',  1, 'block', '{"horizonDays":15}'),
      ('BUFFER_BREACH',        1, 'warn',  '{}'),
      ('BUDGET_EXCEEDED',      1, 'warn',  '{}'),
      ('NON_ESSENTIAL_SPIKE',  1, 'warn',  '{"multiplier":1.8,"lookbackDays":30,"minAmount":3000000}'),
      ('DEBT_OVERDUE',         1, 'warn',  '{}'),
      ('BIG_TICKET',           1, 'info',  '{"pctOfBalance":25}');

    INSERT INTO settings (key, value) VALUES
      ('currency',            'COP'),
      ('locale',              'es-CO'),
      ('theme',               'dark'),
      ('onboarded',           '0'),
      ('debt_strategy',       'avalanche'),
      ('income_split_debt',   '50'),
      ('income_split_save',   '20'),
      ('income_split_free',   '30'),
      ('emergency_buffer',    '20000000'),
      ('daily_reminder_hour', '20');
    `,
  },
  {
    version: 3,
    name: 'investments',
    sql: `
    ------------------------------------------------------------------
    -- INVERSIONES / AHORRO A LARGO PLAZO
    -- Vehiculos donde guardas plata esperando rendimiento: cuenta de
    -- ahorro, CDT, fondo de inversion, acciones, etc.
    ------------------------------------------------------------------
    CREATE TABLE investments (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT    NOT NULL,
      -- 'savings' | 'cdt' | 'fund' | 'stocks' | 'crypto' | 'real_estate' | 'other'
      kind            TEXT    NOT NULL DEFAULT 'savings',
      issuer          TEXT,
      -- Rentabilidad EFECTIVA ANUAL esperada, en basis points (12,5% => 1250).
      -- Es una expectativa del usuario, no una promesa: la app la usa solo
      -- para comparar contra el costo de sus deudas.
      annual_rate_bp  INTEGER NOT NULL DEFAULT 0,
      -- Impuestos/comisiones anuales estimados sobre el rendimiento (bp).
      -- En Colombia: retefuente sobre rendimientos, comision de administracion.
      fee_rate_bp     INTEGER NOT NULL DEFAULT 0,
      -- 'immediate' = puedes sacarla hoy (sirve de colchon)
      -- 'term'      = esta amarrada hasta maturity_date (NO es colchon)
      liquidity       TEXT    NOT NULL DEFAULT 'immediate'
                      CHECK (liquidity IN ('immediate','term')),
      -- Riesgo percibido: afecta el consejo, no el calculo.
      risk            TEXT    NOT NULL DEFAULT 'low'
                      CHECK (risk IN ('low','medium','high')),
      initial_amount  INTEGER NOT NULL DEFAULT 0,
      -- Aporte mensual que el usuario se compromete a hacer (para proyectar).
      monthly_target  INTEGER NOT NULL DEFAULT 0,
      account_id      INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
      start_date      TEXT    NOT NULL,
      maturity_date   TEXT,
      color           TEXT    NOT NULL DEFAULT '#6366F1',
      notes           TEXT,
      status          TEXT    NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','closed')),
      created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX idx_investments_status ON investments(status, kind);

    ------------------------------------------------------------------
    -- APORTES Y RETIROS
    -- amount > 0 = aporte, amount < 0 = retiro. Se permite negativo aqui
    -- (a diferencia de transactions) porque es un movimiento de saldo.
    ------------------------------------------------------------------
    CREATE TABLE investment_moves (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      investment_id  INTEGER NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
      transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
      amount         INTEGER NOT NULL,
      -- 'deposit' | 'withdraw' | 'yield' (rendimiento reconocido por el banco)
      kind           TEXT    NOT NULL DEFAULT 'deposit'
                     CHECK (kind IN ('deposit','withdraw','yield')),
      moved_at       TEXT    NOT NULL,
      note           TEXT
    );
    CREATE INDEX idx_im_inv ON investment_moves(investment_id, moved_at);

    -- Enlaza una transaccion con la inversion a la que fue.
    ALTER TABLE transactions ADD COLUMN investment_id INTEGER
      REFERENCES investments(id) ON DELETE SET NULL;

    ------------------------------------------------------------------
    -- VISTA: saldo real de cada inversion
    ------------------------------------------------------------------
    CREATE VIEW v_investment_progress AS
    SELECT
      i.id, i.name, i.kind, i.issuer, i.annual_rate_bp, i.fee_rate_bp,
      i.liquidity, i.risk, i.initial_amount, i.monthly_target,
      i.account_id, i.start_date, i.maturity_date, i.color, i.status,
      i.initial_amount + COALESCE(SUM(m.amount), 0)            AS balance,
      COALESCE(SUM(CASE WHEN m.kind = 'deposit'  THEN m.amount END), 0) AS deposited,
      COALESCE(SUM(CASE WHEN m.kind = 'withdraw' THEN -m.amount END), 0) AS withdrawn,
      COALESCE(SUM(CASE WHEN m.kind = 'yield'    THEN m.amount END), 0) AS yields,
      MAX(m.moved_at)                                          AS last_move_at
    FROM investments i
    LEFT JOIN investment_moves m ON m.investment_id = i.id
    GROUP BY i.id;

    INSERT INTO settings (key, value) VALUES
      ('inflation_bp', '500');
    `,
  },
  {
    version: 4,
    name: 'fixed_expenses',
    sql: `
    ------------------------------------------------------------------
    -- GASTOS FIJOS
    -- Arriendo, servicios, suscripciones, colegio... Lo que SI o SI hay
    -- que pagar cada mes. Es la pieza que le faltaba al coach para saber
    -- cuanta plata esta realmente libre: no basta con mirar el saldo.
    ------------------------------------------------------------------
    CREATE TABLE fixed_expenses (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT    NOT NULL,
      amount       INTEGER NOT NULL CHECK (amount > 0),
      category_id  INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      account_id   INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
      due_day      INTEGER NOT NULL DEFAULT 1 CHECK (due_day BETWEEN 1 AND 31),
      -- 'monthly' | 'biweekly' | 'weekly' | 'yearly'
      frequency    TEXT    NOT NULL DEFAULT 'monthly'
                   CHECK (frequency IN ('monthly','biweekly','weekly','yearly')),
      -- 1 = no se puede recortar (arriendo, servicios)
      -- 0 = recortable (suscripciones, gimnasio) -> el coach lo sugiere
      is_essential INTEGER NOT NULL DEFAULT 1 CHECK (is_essential IN (0,1)),
      auto_remind  INTEGER NOT NULL DEFAULT 1 CHECK (auto_remind IN (0,1)),
      emoji        TEXT    NOT NULL DEFAULT '*',
      color        TEXT    NOT NULL DEFAULT '#0EA5E9',
      notes        TEXT,
      status       TEXT    NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','paused')),
      created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX idx_fixed_status ON fixed_expenses(status, due_day);

    ------------------------------------------------------------------
    -- PAGOS DE GASTOS FIJOS
    -- 'period' es 'YYYY-MM': asi se sabe si el del mes ya se pago sin
    -- adivinar por fechas.
    ------------------------------------------------------------------
    CREATE TABLE fixed_expense_payments (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      fixed_expense_id INTEGER NOT NULL REFERENCES fixed_expenses(id) ON DELETE CASCADE,
      transaction_id   INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
      amount           INTEGER NOT NULL,
      period           TEXT    NOT NULL,
      paid_at          TEXT    NOT NULL
    );
    CREATE UNIQUE INDEX idx_fep_period ON fixed_expense_payments(fixed_expense_id, period);

    ALTER TABLE transactions ADD COLUMN fixed_expense_id INTEGER
      REFERENCES fixed_expenses(id) ON DELETE SET NULL;

    ------------------------------------------------------------------
    -- VISTA: que falta por pagar ESTE mes
    ------------------------------------------------------------------
    CREATE VIEW v_fixed_expense_status AS
    SELECT
      f.id, f.name, f.amount, f.category_id, f.account_id, f.due_day,
      f.frequency, f.is_essential, f.auto_remind, f.emoji, f.color, f.status,
      (SELECT p.amount FROM fixed_expense_payments p
        WHERE p.fixed_expense_id = f.id
          AND p.period = strftime('%Y-%m','now','localtime')) AS paid_amount,
      CASE WHEN EXISTS (
        SELECT 1 FROM fixed_expense_payments p
         WHERE p.fixed_expense_id = f.id
           AND p.period = strftime('%Y-%m','now','localtime')
      ) THEN 1 ELSE 0 END AS paid_this_month,
      CAST(strftime('%d','now','localtime') AS INTEGER) AS today_day
    FROM fixed_expenses f;

    INSERT INTO coach_rules (code, enabled, severity, params_json) VALUES
      ('FIXED_EXPENSES_AT_RISK', 1, 'block', '{}');
    `,
  },
  {
    version: 5,
    name: 'credit_cards',
    sql: `
    ------------------------------------------------------------------
    -- TARJETAS DE CREDITO
    -- Dos fechas distintas que la gente confunde:
    --   statement_day    = dia de CORTE (cierra el extracto)
    --   payment_due_day  = dia LIMITE DE PAGO (si no pagas, hay mora)
    -- Lo comprado despues del corte se va al extracto del mes siguiente,
    -- por eso comprar justo despues del corte da el mayor plazo gratis.
    ------------------------------------------------------------------
    ALTER TABLE accounts ADD COLUMN payment_due_day INTEGER;
    -- Tasa de financiacion por defecto de la tarjeta, nominal MENSUAL en
    -- basis points (2,25% m.v. => 225). Se usa al diferir una compra.
    ALTER TABLE accounts ADD COLUMN card_rate_bp INTEGER NOT NULL DEFAULT 0;

    ------------------------------------------------------------------
    -- COMPRAS DIFERIDAS A CUOTAS
    --
    -- Importante para no contar doble: el cupo de la tarjeta ya se afecta
    -- por el valor TOTAL de la compra (asi funcionan los bancos). El plan
    -- de cuotas NO es una deuda aparte: es el desglose de como te van a
    -- cobrar esa misma plata. Por eso vive en su propia tabla y no en
    -- la tabla debts, y la "deuda total" de la app sigue siendo el saldo usado
    -- de la tarjeta, no la suma de los dos.
    ------------------------------------------------------------------
    CREATE TABLE installment_plans (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id         INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      transaction_id     INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
      description        TEXT    NOT NULL,
      principal          INTEGER NOT NULL CHECK (principal > 0),
      installments_total INTEGER NOT NULL CHECK (installments_total > 0),
      monthly_rate_bp    INTEGER NOT NULL DEFAULT 0,
      installment_amount INTEGER NOT NULL,
      installments_paid  INTEGER NOT NULL DEFAULT 0,
      first_due_date     TEXT    NOT NULL,
      status             TEXT    NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active','paid','cancelled')),
      created_at         TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX idx_plans_account ON installment_plans(account_id, status);

    ALTER TABLE transactions ADD COLUMN installment_plan_id INTEGER
      REFERENCES installment_plans(id) ON DELETE SET NULL;

    ------------------------------------------------------------------
    -- Se rehace v_account_balances para exponer tambien las fechas y la
    -- tasa de la tarjeta (las vistas de SQLite no se pueden ALTERar).
    ------------------------------------------------------------------
    DROP VIEW v_account_balances;
    CREATE VIEW v_account_balances AS
    SELECT
      a.id, a.name, a.type, a.provider_key, a.color, a.emoji, a.currency,
      a.include_in_total, a.archived, a.sort_order, a.credit_limit,
      a.statement_day, a.payment_due_day, a.card_rate_bp, a.initial_balance,
      a.initial_balance
        + COALESCE((SELECT SUM(t.amount) FROM transactions t
                     WHERE t.account_id = a.id AND t.deleted_at IS NULL
                       AND t.type = 'income'), 0)
        + COALESCE((SELECT SUM(t.amount) FROM transactions t
                     WHERE t.to_account_id = a.id AND t.deleted_at IS NULL
                       AND t.type = 'transfer'), 0)
        - COALESCE((SELECT SUM(t.amount) FROM transactions t
                     WHERE t.account_id = a.id AND t.deleted_at IS NULL
                       AND t.type IN ('expense','transfer','debt_payment','goal_deposit')), 0)
      AS balance
    FROM accounts a;

    ------------------------------------------------------------------
    -- VISTA: estado de cada tarjeta
    -- El campo used sale del libro: gastos menos pagos recibidos. Por eso, al
    -- registrar un pago (traslado hacia la tarjeta), el cupo se libera
    -- solo, sin tener que tocar ningun contador.
    ------------------------------------------------------------------
    CREATE VIEW v_credit_cards AS
    SELECT
      b.id, b.name, b.color, b.emoji, b.currency,
      a.credit_limit, a.statement_day, a.payment_due_day, a.card_rate_bp,
      a.archived,
      -b.balance                                   AS used,
      COALESCE(a.credit_limit, 0) + b.balance      AS available,
      (SELECT COALESCE(SUM(p.installment_amount), 0)
         FROM installment_plans p
        WHERE p.account_id = a.id AND p.status = 'active') AS monthly_installments,
      (SELECT COUNT(*) FROM installment_plans p
        WHERE p.account_id = a.id AND p.status = 'active') AS active_plans
    FROM accounts a
    JOIN v_account_balances b ON b.id = a.id
    WHERE a.type = 'credit_card';
    `,
  },
  {
    version: 6,
    name: 'detected_movements',
    sql: `
    ------------------------------------------------------------------
    -- MOVIMIENTOS DETECTADOS AUTOMATICAMENTE
    -- Vienen de leer las notificaciones del banco / billetera. NUNCA se
    -- convierten en transaccion solos: quedan aqui esperando que el
    -- usuario los confirme, porque los bancos cambian sus textos y un
    -- parser desactualizado ensuciaria las finanzas en silencio.
    ------------------------------------------------------------------
    CREATE TABLE detected_movements (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      notif_key      TEXT    NOT NULL UNIQUE,
      source         TEXT    NOT NULL,
      kind           TEXT    NOT NULL
                     CHECK (kind IN ('expense','income','transfer_out','unknown')),
      amount         INTEGER NOT NULL,
      merchant       TEXT,
      raw_title      TEXT,
      raw_body       TEXT,
      posted_at      INTEGER NOT NULL,
      confidence     INTEGER NOT NULL DEFAULT 0,
      status         TEXT    NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','confirmed','ignored')),
      transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
      created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX idx_detected_status ON detected_movements(status, posted_at DESC);

    INSERT INTO settings (key, value) VALUES
      ('detect_enabled', '0');
    `,
  },
  {
    version: 7,
    name: 'fixed_incomes',
    sql: `
    ------------------------------------------------------------------
    -- INGRESOS FIJOS
    -- Salario, arriendo que te pagan, mesada, pension... Lo que entra
    -- con regularidad. Sin esto el coach no sabe si "aguantas" hasta el
    -- proximo pago: con el saldo solo, cualquier gasto parece peligroso
    -- el dia 28 aunque el salario entre el 30.
    ------------------------------------------------------------------
    CREATE TABLE fixed_incomes (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT    NOT NULL,
      amount       INTEGER NOT NULL CHECK (amount > 0),
      account_id   INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
      category_id  INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      -- Dia principal de pago.
      pay_day      INTEGER NOT NULL DEFAULT 30 CHECK (pay_day BETWEEN 1 AND 31),
      -- Segundo pago para quincenales (ej. 15 y 30).
      pay_day_2    INTEGER CHECK (pay_day_2 BETWEEN 1 AND 31),
      -- 'monthly' | 'biweekly' | 'weekly' | 'yearly' | 'variable'
      frequency    TEXT    NOT NULL DEFAULT 'monthly'
                   CHECK (frequency IN ('monthly','biweekly','weekly','yearly','variable')),
      -- 1 = es seguro que llega (salario). 0 = variable (freelance).
      is_reliable  INTEGER NOT NULL DEFAULT 1 CHECK (is_reliable IN (0,1)),
      auto_remind  INTEGER NOT NULL DEFAULT 0 CHECK (auto_remind IN (0,1)),
      emoji        TEXT    NOT NULL DEFAULT '*',
      color        TEXT    NOT NULL DEFAULT '#10B981',
      notes        TEXT,
      status       TEXT    NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','paused')),
      created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX idx_fixed_inc_status ON fixed_incomes(status, pay_day);

    CREATE TABLE fixed_income_receipts (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      fixed_income_id INTEGER NOT NULL REFERENCES fixed_incomes(id) ON DELETE CASCADE,
      transaction_id  INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
      amount          INTEGER NOT NULL,
      period          TEXT    NOT NULL,
      received_at     TEXT    NOT NULL
    );
    CREATE UNIQUE INDEX idx_fir_period
      ON fixed_income_receipts(fixed_income_id, period);

    ALTER TABLE transactions ADD COLUMN fixed_income_id INTEGER
      REFERENCES fixed_incomes(id) ON DELETE SET NULL;

    CREATE VIEW v_fixed_income_status AS
    SELECT
      f.id, f.name, f.amount, f.account_id, f.category_id, f.pay_day,
      f.pay_day_2, f.frequency, f.is_reliable, f.auto_remind, f.emoji,
      f.color, f.status,
      CASE WHEN EXISTS (
        SELECT 1 FROM fixed_income_receipts r
         WHERE r.fixed_income_id = f.id
           AND r.period = strftime('%Y-%m','now','localtime')
      ) THEN 1 ELSE 0 END AS received_this_month,
      (SELECT r.amount FROM fixed_income_receipts r
        WHERE r.fixed_income_id = f.id
          AND r.period = strftime('%Y-%m','now','localtime')) AS received_amount
    FROM fixed_incomes f;
    `,
  },
  {
    version: 8,
    name: 'mi_platica',
    sql: `
    ------------------------------------------------------------------
    -- ARREGLO: SIGNO DEL SALDO DE LAS TARJETAS
    --
    -- En una tarjeta de credito el "saldo" es deuda, o sea NEGATIVO en el
    -- libro: gastar baja el saldo, pagar lo sube hacia cero. Al crear la
    -- cuenta el formulario pedia "saldo actual" y la gente escribia lo que
    -- DEBE en positivo, asi que el sistema entendia que tenia plata a
    -- favor. Resultado: registrar un pago parecia aumentar la deuda.
    --
    -- Se corrige el dato historico: toda tarjeta con saldo inicial
    -- positivo pasa a negativo. Es lo que el usuario quiso decir.
    ------------------------------------------------------------------
    UPDATE accounts
       SET initial_balance = -initial_balance
     WHERE type = 'credit_card' AND initial_balance > 0;

    ------------------------------------------------------------------
    -- METAS DE AHORRO CON PROPOSITO
    -- La tabla goals original era un esqueleto sin uso. Esta la
    -- reemplaza con lo que hace falta para acompañar una meta real.
    ------------------------------------------------------------------
    CREATE TABLE savings_goals (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      name           TEXT    NOT NULL,
      purpose        TEXT,
      target_amount  INTEGER NOT NULL CHECK (target_amount > 0),
      -- Lo que ya tenia ahorrado ANTES de usar la app.
      initial_amount INTEGER NOT NULL DEFAULT 0,
      target_date    TEXT,
      -- 'biweekly' | 'monthly'
      frequency      TEXT    NOT NULL DEFAULT 'monthly'
                     CHECK (frequency IN ('biweekly','monthly')),
      account_id     INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
      emoji          TEXT    NOT NULL DEFAULT '*',
      color          TEXT    NOT NULL DEFAULT '#1CBBCE',
      status         TEXT    NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','done','archived')),
      created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX idx_goals_status ON savings_goals(status);

    ------------------------------------------------------------------
    -- APORTES A METAS
    -- Un aporte NO es un gasto: es plata que cambia de bolsillo. Por eso
    -- la transaccion asociada es 'goal_deposit' y los reportes de gasto
    -- la excluyen; asi el avance no se cuenta dos veces.
    ------------------------------------------------------------------
    CREATE TABLE goal_contributions (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id        INTEGER NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
      transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
      amount         INTEGER NOT NULL,
      contributed_at TEXT    NOT NULL,
      note           TEXT
    );
    CREATE INDEX idx_gc_goal ON goal_contributions(goal_id, contributed_at);

    ALTER TABLE transactions ADD COLUMN savings_goal_id INTEGER
      REFERENCES savings_goals(id) ON DELETE SET NULL;

    CREATE VIEW v_goal_progress AS
    SELECT
      g.id, g.name, g.purpose, g.target_amount, g.initial_amount,
      g.target_date, g.frequency, g.account_id, g.emoji, g.color, g.status,
      g.created_at,
      g.initial_amount + COALESCE(SUM(c.amount), 0) AS saved,
      MAX(g.target_amount - g.initial_amount - COALESCE(SUM(c.amount), 0), 0)
        AS remaining,
      COUNT(c.id)      AS contributions,
      MAX(c.contributed_at) AS last_contribution_at
    FROM savings_goals g
    LEFT JOIN goal_contributions c ON c.goal_id = g.id
    GROUP BY g.id;

    ------------------------------------------------------------------
    -- AJUSTES NUEVOS
    ------------------------------------------------------------------
    INSERT INTO settings (key, value) VALUES
      ('user_name', ''),
      ('daily_motivation', '0'),
      ('daily_motivation_hour', '9'),
      ('basic_needs_reserve', '0');
    `,
  },
  {
    version: 9,
    name: 'biweekly_fixed_expenses',
    sql: `
    ------------------------------------------------------------------
    -- GASTOS FIJOS QUINCENALES
    --
    -- Un gasto quincenal vence DOS veces al mes, asi que un solo
    -- due_day no alcanza. Se agrega el segundo dia.
    --
    -- Sobre los periodos de pago: el primero sigue siendo 'YYYY-MM'
    -- (igual que antes, para no invalidar los pagos ya registrados) y
    -- el segundo es 'YYYY-MM-Q2'. Asi la quincena queda identificada
    -- sin migrar ningun dato historico.
    ------------------------------------------------------------------
    ALTER TABLE fixed_expenses ADD COLUMN due_day_2 INTEGER;

    DROP VIEW v_fixed_expense_status;
    CREATE VIEW v_fixed_expense_status AS
    WITH base AS (
      SELECT
        f.*,
        CASE
          WHEN f.frequency = 'biweekly' AND f.due_day_2 IS NOT NULL THEN 2
          ELSE 1
        END AS occurrences,
        strftime('%Y-%m','now','localtime') AS ym,
        CAST(strftime('%d','now','localtime') AS INTEGER) AS today_day
      FROM fixed_expenses f
    )
    SELECT
      b.id, b.name, b.amount, b.category_id, b.account_id,
      b.due_day, b.due_day_2, b.frequency, b.is_essential, b.auto_remind,
      b.emoji, b.color, b.status, b.occurrences, b.today_day,

      -- Lo que cuesta al mes: una o dos veces el valor de cada cobro.
      b.amount * b.occurrences AS monthly_total,

      -- Estado de cada vencimiento por separado.
      CASE WHEN EXISTS (
        SELECT 1 FROM fixed_expense_payments p
         WHERE p.fixed_expense_id = b.id AND p.period = b.ym
      ) THEN 1 ELSE 0 END AS paid_first,

      CASE WHEN EXISTS (
        SELECT 1 FROM fixed_expense_payments p
         WHERE p.fixed_expense_id = b.id AND p.period = b.ym || '-Q2'
      ) THEN 1 ELSE 0 END AS paid_second,

      -- Pagado del mes: solo cuenta como completo si cayeron los dos.
      CASE
        WHEN b.occurrences = 1 THEN
          CASE WHEN EXISTS (
            SELECT 1 FROM fixed_expense_payments p
             WHERE p.fixed_expense_id = b.id AND p.period = b.ym
          ) THEN 1 ELSE 0 END
        ELSE
          CASE WHEN EXISTS (
            SELECT 1 FROM fixed_expense_payments p
             WHERE p.fixed_expense_id = b.id AND p.period = b.ym
          ) AND EXISTS (
            SELECT 1 FROM fixed_expense_payments p
             WHERE p.fixed_expense_id = b.id AND p.period = b.ym || '-Q2'
          ) THEN 1 ELSE 0 END
      END AS paid_this_month,

      (SELECT COALESCE(SUM(p.amount), 0) FROM fixed_expense_payments p
        WHERE p.fixed_expense_id = b.id
          AND (p.period = b.ym OR p.period = b.ym || '-Q2')) AS paid_amount
    FROM base b;
    `,
  },
  {
    version: 10,
    name: 'primary_account',
    sql: `
    ------------------------------------------------------------------
    -- CUENTA PRINCIPAL
    --
    -- Es una PREFERENCIA de visualizacion, no un cambio contable: marca
    -- cual cuenta se destaca en el inicio. Los saldos siguen
    -- calculandose igual y cada cifra dice a que corresponde, para que
    -- nunca se confunda "lo que tengo en Nequi" con "lo que tengo en
    -- total".
    ------------------------------------------------------------------
    INSERT INTO settings (key, value) VALUES ('primary_account_id', '');

    -- Si solo hay una cuenta activa, esa es la principal por defecto.
    UPDATE settings
       SET value = (
         SELECT CAST(id AS TEXT) FROM accounts
          WHERE archived = 0 ORDER BY sort_order, id LIMIT 1
       )
     WHERE key = 'primary_account_id'
       AND (SELECT COUNT(*) FROM accounts WHERE archived = 0) = 1;
    `,
  },
  {
    version: 11,
    name: 'goal_plan',
    sql: `
    ------------------------------------------------------------------
    -- PLAN DE APORTE DE CADA META
    --
    -- Guarda el aporte que el usuario ESCOGIO, no uno calculado al
    -- vuelo. Asi el progreso se mide contra su propio plan, y si luego
    -- cambian sus ingresos la app puede recalcular opciones sin tocar
    -- la meta hasta que el lo autorice.
    ------------------------------------------------------------------
    ALTER TABLE savings_goals ADD COLUMN planned_contribution INTEGER NOT NULL DEFAULT 0;
    -- Que plan eligio: 'recommended' | 'intermediate' | 'flexible' | 'target'
    ALTER TABLE savings_goals ADD COLUMN plan_kind TEXT;

    DROP VIEW v_goal_progress;
    CREATE VIEW v_goal_progress AS
    SELECT
      g.id, g.name, g.purpose, g.target_amount, g.initial_amount,
      g.target_date, g.frequency, g.account_id, g.emoji, g.color, g.status,
      g.created_at, g.planned_contribution, g.plan_kind,
      g.initial_amount + COALESCE(SUM(c.amount), 0) AS saved,
      MAX(g.target_amount - g.initial_amount - COALESCE(SUM(c.amount), 0), 0)
        AS remaining,
      COUNT(c.id)      AS contributions,
      MAX(c.contributed_at) AS last_contribution_at
    FROM savings_goals g
    LEFT JOIN goal_contributions c ON c.goal_id = g.id
    GROUP BY g.id;
    `,
  },
  {
    version: 12,
    name: 'mood',
    sql: `
    ------------------------------------------------------------------
    -- ESTADO DE ANIMO DEL DIA
    --
    -- "¿Como te sientes con tu plata?" del Inicio. Se guarda con su
    -- fecha para preguntar una vez al dia y no cada vez que se abre la
    -- app. No afecta ningun calculo financiero: es contexto para el
    -- Coach y para saber si la persona esta tranquila o preocupada.
    ------------------------------------------------------------------
    INSERT INTO settings (key, value) VALUES
      ('mood_value', ''),
      ('mood_date', '');
    `,
  },
];

export const LATEST_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;
