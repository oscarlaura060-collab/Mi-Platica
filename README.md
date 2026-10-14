# Mi Platica — salud financiera y recuperación de deudas (100% local)

App móvil React Native (Expo) **offline y privada**: no hay backend, no hay cuenta,
no hay analítica. Todo vive en un SQLite dentro del almacenamiento privado de la app
y las notificaciones son locales (`expo-notifications` con triggers de calendario).

## Decisiones de arquitectura

| Decisión | Por qué |
|---|---|
| **Dinero en enteros (centavos)** | Cero errores de punto flotante en saldos y amortizaciones. |
| **Saldos derivados por vistas SQL** (`v_account_balances`) | El saldo nunca se denormaliza: siempre es `inicial + ingresos − egresos`. Imposible que se desincronice. |
| **Libro único de transacciones** | Gastos, ingresos, traslados y abonos en una sola tabla con `type` discriminante: una consulta sirve para todo. |
| **Coach como funciones puras** | `evaluateExpense`/`allocateIncome` reciben un snapshot y devuelven veredicto. Testeable sin BD, instantáneo y auditable. |
| **Reglas del coach en tabla** (`coach_rules`) | El usuario enciende/apaga reglas y ajusta parámetros desde Ajustes, sin releases. |
| **Tasa en basis points** (1,5 % → `150`) | Enteros también en las tasas. |
| **Borrado lógico** (`deleted_at`) | Permite "Deshacer" sin romper el histórico. |
| **Notificaciones reconciliadas al arrancar** (`resyncAll`) | El SO pierde lo programado tras reinicios/actualizaciones. |

## Estructura

```
FinZen/
├── App.tsx                      # Providers + bootstrap
├── app.json                     # Expo; INTERNET bloqueado en Android
├── src/
│   ├── app/navigation/          # Stack + Tabs, deep-link de notificaciones
│   ├── db/
│   │   ├── migrations.ts        # Esquema completo + seed (versionado por user_version)
│   │   ├── index.ts             # openDb/all/one/run/tx, wipeAllData
│   │   ├── types.ts
│   │   └── repositories/        # accounts, categories, transactions, debts, stats, settings
│   ├── domain/
│   │   ├── coach/               # engine (reglas), context (snapshot), types
│   │   └── debt/amortization.ts # cuota francesa, plazos, impacto de abono extra, priorización
│   ├── features/                # home, quickadd, accounts, debts, dashboard, settings
│   ├── components/              # ui, Keypad, CoachSheet, charts, lists
│   ├── notifications/           # recordatorios locales + resync
│   ├── store/useAppStore.ts     # zustand
│   ├── theme/                   # paleta oscura/clara + presets de bancos CO
│   └── utils/                   # money, date
```

## Base de datos

9 tablas + 3 vistas: `accounts`, `categories`, `debts`, `goals`, `transactions`,
`debt_payments`, `reminders`, `coach_rules`, `settings`; vistas
`v_account_balances`, `v_debt_progress`, `v_daily_expense`.
El esquema comentado está en [`src/db/migrations.ts`](src/db/migrations.ts).

## Coach financiero (reglas)

Antes de guardar un gasto se evalúan, en orden de severidad:

1. `INSUFFICIENT_FUNDS` — *bloquea*: el gasto supera el saldo de la cuenta.
2. `COMMITMENTS_AT_RISK` — *bloquea*: te deja sin plata para las cuotas de los
   próximos 15 días → **"No puedes gastar en esto, mejor guárdalo para tu cuota"**.
3. `BUFFER_BREACH` — *advierte*: rompe el colchón de emergencia.
4. `BUDGET_EXCEEDED` — *advierte*: pasa el tope mensual de la categoría.
5. `NON_ESSENTIAL_SPIKE` — *advierte*: hoy vas 1,8× sobre tu promedio en algo no esencial.
6. `DEBT_OVERDUE` — *advierte*: hay cuota vencida sin registrar.
7. `BIG_TICKET` — *informa*: el gasto es ≥25 % de tu saldo.

Los gastos marcados **esenciales** bajan automáticamente de severidad. El coach
nunca impide registrar: si ignoras un bloqueo se guarda `coach_override = 1`.

Al registrar un **ingreso**, `allocateIncome` reparte: primero blinda las cuotas
próximas, luego aplica tu split (50 % deudas / 20 % ahorro / 30 % libre por defecto)
y dirige la parte de deudas con **avalancha** (mayor tasa) o **bola de nieve**
(menor saldo), encadenando el excedente a la siguiente deuda.

## Ahorro e inversión a largo plazo

Tabla `investments` + vista `v_investment_progress`. Cada vehículo (cuenta de
ahorro, CDT, fondo, acciones…) guarda su **rentabilidad E.A. esperada**, sus
**comisiones/impuestos**, su **liquidez** y su **riesgo**.

[`domain/invest/projection.ts`](src/domain/invest/projection.ts) convierte entre
tasas (mensual ↔ efectiva anual), calcula rentabilidad **neta** y **real**
(descontando inflación) y proyecta valor futuro con aportes mensuales.

[`domain/invest/decision.ts`](src/domain/invest/decision.ts) responde la pregunta
que importa: **¿ahorro o pago deuda?** Es un arbitraje de tasas —abonar a una
deuda al 26 % E.A. es una rentabilidad garantizada del 26 %, libre de impuestos—
con tres excepciones que respeta: el colchón de emergencia va primero, las
cuotas próximas se separan, y un CDT a término **no** cuenta como colchón aunque
rente más. Devuelve un plan con montos concretos que la app puede ejecutar.

La pestaña **Ahorro** muestra patrimonio neto (tienes − debes), estado del
colchón y la proyección a 1/5/10/20 años separando *lo que pusiste tú* de *lo
que puso el interés compuesto*.

## Compilar la APK (Android)

```bash
.\build-apk.ps1
```

Requisitos ya resueltos en este repo:

| Problema | Solución aplicada |
|---|---|
| El JDK de Android Studio es Java 25 y Gradle 8.14 solo soporta hasta Java 24 | JDK 17 portable en `tools/jdk17` |
| El linker del NDK falla con espacios en la ruta del SDK (`C:\Users\Oscar Mora\…`) | Junction `C:\Android\Sdk` → SDK real, sin duplicar datos |
| `babel-preset-expo@57` con Expo SDK 54 → Hermes rechaza campos privados `#` | Versión fijada con `npx expo install babel-preset-expo` |
| Gradle escribe avisos por stderr y PowerShell los vuelve error terminante | `$ErrorActionPreference = 'Continue'` |
| OneDrive intercepta cada lectura y vuelve el build inviable | Se compila en `C:\dev\FinZen` |

Instalar en el celular por USB:

```bash
.\instalar-en-celular.ps1
```

## Pendientes conscientes (siguiente iteración)

- Onboarding de 3 pasos (crear cuenta, deudas, colchón) — hoy se entra al panel vacío.
- Metas de ahorro con fecha objetivo: la tabla `goals` ya existe, falta la pantalla.
- Export/import de respaldo cifrado (`expo-file-system` + `expo-sharing` ya en deps).
- Tests de `engine.ts`, `amortization.ts` y `decision.ts` (puras: ideales para Jest).
- Firma con keystore propio: hoy la APK va firmada con la clave de depuración,
  suficiente para uso personal pero no para publicar en Play Store.
