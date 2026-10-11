# Auditoría del proyecto — Mi Platica

Fecha: 11 de octubre de 2026 · App v2.5.0 (versionCode 11)
Estado: **base funcional completa, sin rediseño visual aplicado**

---

## 1. Framework y versiones

| Pieza | Versión |
|---|---|
| Expo SDK | 54 |
| React Native | 0.81.5 (New Architecture activada) |
| React | 19.1.0 |
| TypeScript | 5.9.2, `strict: true` |
| Base de datos | expo-sqlite 16 (API asíncrona) |
| Navegación | React Navigation 7 (native-stack + bottom-tabs) |
| Estado | zustand 5 |
| Gráficos | react-native-svg 15.12.1 |
| Fechas | date-fns 4 con locale `es` |
| Build | Gradle 8.14.3 + JDK 17 portable (`tools/jdk17`) |

**La app no tiene permiso de INTERNET.** Está bloqueado en `app.json`
(`blockedPermissions`). Todo es local: no hay backend, cuentas ni analítica.

---

## 2. Estructura de carpetas

```
FinZen/                       (la carpeta conserva el nombre antiguo)
├── App.tsx                   punto de entrada
├── index.js                  registerRootComponent
├── app.json                  Expo: nombre "Mi Platica", iconos, permisos
├── assets/                   logo en todos sus tamaños
├── modules/
│   └── notification-reader/  módulo nativo Kotlin (lector de notificaciones)
├── scripts/                  generación de assets y verificaciones
└── src/
    ├── app/navigation/       2 archivos · 323 líneas
    ├── components/          10 archivos · 2.227 líneas
    ├── db/                  15 archivos · 3.197 líneas
    ├── domain/              13 archivos · 3.010 líneas
    ├── features/            28 archivos · 9.074 líneas
    ├── notifications/        1 archivo  ·   385 líneas
    ├── store/                1 archivo  ·   176 líneas
    ├── theme/                1 archivo  ·   197 líneas
    └── utils/                2 archivos ·   163 líneas
```

**Total: ~20.400 líneas de código propio.**

La separación datos / lógica / presentación ya existe y se respeta:
`db/` no importa de `features/`, y `domain/` no importa de ninguno de los dos.

---

## 3. Punto de entrada

`index.js` → `App.tsx` → `GestureHandlerRootView` → `SafeAreaProvider` →
`ThemeProvider` → `Boot` → `RootNavigator`.

`Boot` llama a `useAppStore.bootstrap()`, que abre la base, corre las
migraciones pendientes, inicializa canales de notificación, procesa las
notificaciones capturadas mientras la app estuvo cerrada y carga el estado.
Mientras tanto muestra un indicador de carga.

---

## 4. Navegación actual

**Pestañas inferiores** (coincide con lo pedido en el prompt maestro):

```
Inicio · Deudas · Ahorro · Análisis
```

**Stack** (18 rutas): QuickAdd, AllocateIncome, TransactionEdit, Accounts,
AccountForm, AccountDetail, CreditCard, Detected, DebtForm, DebtDetail,
DebtPay, FixedExpenses, FixedExpenseForm, FixedIncomes, FixedIncomeForm,
GoalForm, GoalDetail, Investments, InvestmentForm, InvestmentDetail, Coach,
Settings.

**Deep links** activos: `miplatica://detected`, `settings`, `home`,
`savings`, `analisis`. Verificado con `adb` que abren correctamente.

Las notificaciones también enrutan por `data.route`.

---

## 5. Sistema de estilos

No hay librería de UI ni CSS-in-JS. El tema vive en `src/theme/index.tsx`
y se consume con `useTheme()`:

- `BRAND` con los 6 colores de marca.
- Dos paletas completas (`dark` y `light`) con 20 tokens cada una.
- `radius`, `space(n)`, `font`, `shadow`.
- `reduceMotion` leído de `AccessibilityInfo` del sistema.

Los componentes aplican estilos en línea tomando valores del tema. **No hay
colores hardcodeados fuera del tema**, salvo los de proveedores bancarios
(`PROVIDERS`) y los que el usuario elige por meta/cuenta.

> ⚠️ **Contradicción con el prompt maestro** — ver sección 12.

---

## 6. Gestión de estado

Un solo store de zustand (`useAppStore`, 176 líneas) con el estado derivado
que varias pantallas comparten: cuentas y saldos, total, deudas, inversiones,
patrimonio neto, fijos pendientes, disponible real, detectados pendientes,
cuenta principal, movimientos recientes, gasto de hoy, promedio, racha,
contexto del coach y consejo del día.

El resto de pantallas consulta la base directamente en su `useFocusEffect`.
Es deliberado: evita un store gigante y cada pantalla pide solo lo suyo.

---

## 7. Modelos financieros existentes

**19 tablas, 7 vistas.** Las vistas derivan los saldos; nunca se
denormalizan.

| Área | Tablas |
|---|---|
| Cuentas | `accounts` → vista `v_account_balances`, `v_credit_cards` |
| Movimientos | `transactions` (libro único con `type` discriminante) |
| Deudas | `debts`, `debt_payments` → `v_debt_progress` |
| Tarjetas | `installment_plans` (compras a cuotas) |
| Gastos fijos | `fixed_expenses`, `fixed_expense_payments` → `v_fixed_expense_status` |
| Ingresos fijos | `fixed_incomes`, `fixed_income_receipts` → `v_fixed_income_status` |
| Metas | `savings_goals`, `goal_contributions` → `v_goal_progress` |
| Inversiones | `investments`, `investment_moves` → `v_investment_progress` |
| Detección | `detected_movements` |
| Config | `settings`, `coach_rules`, `reminders` |
| Sin uso | `goals` (esqueleto de v1, reemplazada por `savings_goals`) |

**Lógica de dominio** (13 módulos, ninguno toca la base ni la UI):

- `debt/amortization.ts` — cuota francesa, plazos, impacto de abono extra, priorización avalancha/bola de nieve.
- `invest/projection.ts` — conversión de tasas, rentabilidad neta y real, valor futuro.
- `invest/decision.ts` — arbitraje ahorro vs. deuda.
- `savings/plan.ts` y `savings/options.ts` — capacidad segura de ahorro y las cuatro opciones de plan.
- `coach/engine.ts` — 8 reglas con severidad; `context.ts` arma el snapshot; `answers.ts` responde preguntas; `destinations.ts` reparte un ingreso.
- `motivation/messages.ts` — mensajes diarios con rotación de tono.
- `period/cycles.ts` — rangos y ciclos de quincena.
- `detect/parser.ts` — interpreta notificaciones bancarias.

---

## 8. Componentes reutilizables

29 exportados desde `src/components/`:

| Grupo | Componentes |
|---|---|
| Base | `Screen`, `Card` (con variante `glass`), `Txt`, `Row`, `Spacer`, `Button`, `Chip`, `Badge`, `ProgressBar`, `SectionTitle`, `EmptyState`, `FadeIn` |
| Entrada | `MoneyInput`, `Keypad`, `DatePickerField`, `DateRangeField`, `DayOfMonthField`, `TimePickerField` |
| Listas | `AccountPill`, `TransactionItem`, `DayHeader`, `DebtCard`, `SwipeRow` |
| Gráficos | `DailyBars`, `Donut`, `WeekdayPattern`, `TwoBars`, `MiniTrend` |
| Coach | `CoachSheet` |

Los selectores de fecha y hora son propios, no de librería, para no sumar
dependencias nativas (cada una obliga a recompilar).

---

## 9. Librería de íconos

**No hay.** Se usan glifos de texto (`%`, `+`, `~`, `>`), emojis en las
categorías y `react-native-svg` para los gráficos. El símbolo de la marca
(`assets/symbol.png`) se usa como ícono de la pestaña Inicio.

> Es la carencia más visible de cara al rediseño. Ver sección 13.

---

## 10. Librería de animaciones

**No hay.** Se usa `Animated` y `Easing` del core de React Native:

- `FadeIn` — aparición de tarjetas con desplazamiento corto.
- `ProgressBar` — barra animada al cambiar el valor.
- `SwipeRow` — deslizar para eliminar con `PanResponder`.
- `Card` — micro-escalado al tocar.
- Transiciones de pantalla de React Navigation.

**Todas respetan `reduceMotion`.** Reanimated se quitó a propósito en su
momento para no arrastrar una dependencia nativa que rompía el build.

---

## 11. Sistema de pruebas

No hay Jest ni testing-library. Hay **5 scripts de verificación** que corren
con Node contra el esquema SQLite real (`sql.js`) o transpilando los módulos
de dominio:

| Script | Qué cubre | Comprobaciones |
|---|---|---|
| `verify-all.mjs` | esquema completo, cuentas, tarjetas, fijos, metas, deudas, duplicados | 80 |
| `verify-savings-options.mjs` | las cuatro opciones de plan de ahorro | 31 |
| `verify-motivation.mjs` | tono, rotación y horarios de los recordatorios | 21 |
| `verify-periods.mjs` | rangos de análisis y ciclos de quincena | 21 |
| `verify-biweekly.mjs` | gastos fijos quincenales | 14 |

Todas pasan. No cubren UI.

---

## 12. Riesgos técnicos

**Alto**

1. **La paleta del prompt maestro no coincide con la implementada.** Ver tabla en `design-bible.md`. Son seis tokens distintos; migrarlos es trabajo de fundaciones visuales y debe hacerse en un solo paso, no pantalla por pantalla.
2. **Ninguna pantalla se ha verificado visualmente.** Todo está probado por cálculo. Hay riesgo real de solapamientos, textos cortados o botones fuera de pantalla que nadie ha visto.
3. **La detección bancaria no se ha probado con una notificación real.** El servicio, el receptor y el deep link están registrados y verificados; el parseo de un texto real de banco no.

**Medio**

4. **No hay librería de íconos.** El rediseño casi seguro la va a necesitar; añadirla es una decisión de arquitectura.
5. **`package.json` dice 2.0.0 y `app.json` dice 2.5.0.** Solo el de `app.json` llega al APK, pero conviene sincronizarlos.
6. **La carpeta del proyecto se llama `FinZen`** y el paquete Android es `com.finzen.app`. Cambiar el paquete obligaría a desinstalar la app y **perder los datos del usuario**; no se recomienda.
7. **No se puede renombrar la clase `FinZenNotificationListener`.** Android la identifica por nombre: cambiarla haría que el usuario pierda el permiso que ya concedió.

**Bajo**

8. Tabla `goals` sin uso (sustituida por `savings_goals`). Limpiar en una migración futura.
9. El build debe correr en `C:\dev\FinZen`; en OneDrive es inviable (OneDrive intercepta cada lectura).

---

## 13. Archivos que conviene crear

| Archivo | Para qué |
|---|---|
| `docs/data-model.md` | pendiente del set que pide el prompt |
| `docs/motion-system.md` | pendiente; hoy el motion está implícito en los componentes |
| `docs/decisions.md` | registro de decisiones; hoy viven en comentarios del código |
| `src/theme/tokens.ts` | separar tokens crudos del tema derivado, para la migración de paleta |
| `src/components/Icon.tsx` | envoltura de la librería de íconos que se elija |
| `src/components/Skeleton.tsx` | no existe un estado "cargando" reutilizable |
| `src/components/ErrorState.tsx` | no existe un estado de error reutilizable |

---

## 14. Archivos que NO se deben tocar sin aviso

| Archivo | Por qué |
|---|---|
| `src/db/migrations.ts` (migraciones 1–11) | ya corrieron en el teléfono del usuario; editarlas corrompe datos. Solo se añaden migraciones nuevas al final. |
| `modules/notification-reader/**` (nombres de clase) | renombrar hace perder el permiso concedido |
| `app.json` → `android.package` | cambiarlo obliga a desinstalar y pierde los datos |
| `src/domain/**` | son las reglas financieras verificadas; cambiarlas exige rehacer las verificaciones |
| `scripts/verify-*.mjs` | son la red de seguridad |
| `assets/*.png` | generados del logo; se regeneran con `build-brand-assets.js`, no se editan a mano |

---

## 15. Orden recomendado de desarrollo

Siguiendo las iteraciones del prompt maestro, adaptadas a que **la lógica ya
está construida y verificada**:

| # | Etapa | Alcance |
|---|---|---|
| 1 | **Fundaciones visuales** | Migrar la paleta a los tokens del prompt. Decidir e instalar la librería de íconos. Crear `Skeleton` y `ErrorState`. Revisar tipografía. Sin tocar pantallas. |
| 2 | **Navegación** | Barra inferior con íconos reales y estados activos. Headers consistentes. |
| 3 | **Inicio** | Primera pantalla contra mockup. Es la que fija el patrón para las demás. |
| 4 | **Registrar ingreso + Coach de ingreso** | QuickAdd y AllocateIncome. |
| 5 | **Registrar gasto + Coach de gasto** | QuickAdd y CoachSheet. |
| 6 | **Deudas** | Lista, detalle, abono, tarjetas. |
| 7 | **Ahorro** | Metas, opciones de plan, detalle. |
| 8 | **Análisis** | Selector de período y gráficos. |
| 9 | **Configuración y pantallas secundarias** | Ajustes, fijos, detección. |
| 10 | **Notificaciones** | Revisar textos y pruebas reales con el banco. |
| 11 | **Animaciones** | Los tres rituales de progreso del prompt. |
| 12 | **Calidad** | Estados vacío/cargando/error, accesibilidad, responsive en los 4 tamaños. |

**Etapa 0 recomendada antes de empezar: recorrer la app instalada y anotar
lo que esté roto visualmente.** Nadie la ha visto todavía.
