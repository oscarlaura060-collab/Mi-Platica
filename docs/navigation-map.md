# Mapa de navegación — Mi Platica

Definido en `src/app/navigation/RootNavigator.tsx` y tipado en `types.ts`.

---

## Estructura

```
RootStack (native-stack, sin header)
│
├── Tabs (bottom-tabs)          ← pantalla raíz
│   ├── Home        "Inicio"    símbolo de la marca
│   ├── Debts       "Deudas"    glifo %
│   ├── Savings     "Ahorro"    glifo +
│   └── Dashboard   "Análisis"  glifo ~
│
├── Registro de movimientos
│   ├── QuickAdd          modal ↑   registrar gasto o ingreso
│   ├── AllocateIncome    modal ↑   repartir un ingreso recién registrado
│   └── TransactionEdit   modal ↑   editar o eliminar un movimiento
│
├── Cuentas
│   ├── Accounts                    lista y administración
│   ├── AccountForm       modal     crear o editar
│   ├── AccountDetail               movimientos de una cuenta
│   └── CreditCard                  tarjeta: cupo, fechas, cuotas
│
├── Deudas
│   ├── DebtForm          modal     crear o editar
│   ├── DebtDetail                  saldo, historial, amortización
│   └── DebtPay           modal ↑   registrar un abono
│
├── Compromisos (desde Ajustes)
│   ├── FixedExpenses               gastos fijos y sus vencimientos
│   ├── FixedExpenseForm  modal
│   ├── FixedIncomes                ingresos fijos
│   └── FixedIncomeForm   modal
│
├── Ahorro
│   ├── GoalForm          modal     crear meta y elegir plan
│   ├── GoalDetail                  progreso, aportes, proyección
│   ├── Investments                 vehículos de inversión
│   ├── InvestmentForm    modal
│   └── InvestmentDetail
│
└── Otras
    ├── Detected                    movimientos detectados del banco
    ├── Coach                       preguntas y respuestas
    └── Settings                    configuración
```

`modal ↑` = se presenta como modal con entrada desde abajo.

---

## Pestañas

Coinciden con lo definido en el prompt maestro. **No se cambian sin
aprobación**: son la columna vertebral del producto.

| Pestaña | Ruta | Archivo |
|---|---|---|
| Inicio | `Home` | `features/home/HomeScreen.tsx` |
| Deudas | `Debts` | `features/debts/DebtsScreen.tsx` |
| Ahorro | `Savings` | `features/savings/SavingsScreen.tsx` |
| Análisis | `Dashboard` | `features/dashboard/DashboardScreen.tsx` |

> El Coach **no es pestaña**: se llega desde Inicio. Se movió fuera de la
> barra para dejar las cuatro del prompt maestro.

---

## Flujos principales

### Registrar un gasto

```
Inicio → botón "- Gasto" (o FAB +)
  → QuickAdd
      · monto con teclado propio
      · cuenta y categoría
      · si la cuenta es tarjeta: diferir a cuotas
  → el Coach evalúa ANTES de guardar
      · ok    → guarda y vuelve
      · warn  → CoachSheet; el usuario confirma
      · block → CoachSheet; puede ignorar (queda `coach_override`)
```

### Registrar un ingreso

```
Inicio → botón "+ Ingreso"
  → QuickAdd
  → se registra (el dinero YA entró a la cuenta)
  → AllocateIncome (reemplaza la pantalla, no se apila)
      · destinos ejecutables con monto editable
      · nada marcado por defecto
      · "Solo registrar el ingreso" es la opción por defecto
```

### Crear una meta

```
Ahorro → "+ Nueva meta"
  → GoalForm
      · propósito, monto, lo que ya tiene, fecha opcional, frecuencia
      · cuatro opciones de plan comparables
      · resumen antes de guardar
  → GoalDetail
```

### Confirmar un movimiento detectado

```
Notificación del banco
  → Mi Platica emite "¿Quieres registrar este gasto?"
      · "Registrar" o tocar  → miplatica://detected → Detected
      · "Descartar"          → se resuelve sin abrir la app
  → Detected: elegir tipo, cuenta y categoría → confirmar
```

---

## Deep links

Esquema `miplatica://`

| Enlace | Destino |
|---|---|
| `miplatica://detected` | Movimientos detectados |
| `miplatica://settings` | Configuración |
| `miplatica://home` | Inicio |
| `miplatica://savings` | Ahorro |
| `miplatica://analisis` | Análisis |

Verificado con `adb shell am start -a android.intent.action.VIEW -d "miplatica://detected"`.

Las notificaciones propias enrutan por `data.route` (`DebtDetail`,
`QuickAdd`, `Dashboard`, `FixedExpenses`, `Detected`, `Savings`,
`GoalDetail`).

---

## Reglas de navegación

1. **Los formularios son modales.** Crear o editar nunca reemplaza la
   pantalla de origen.
2. **Las pantallas de registro entran desde abajo.** QuickAdd, DebtPay y
   AllocateIncome usan `slide_from_bottom`.
3. **La configuración no vive en las pestañas.** Gastos fijos, ingresos
   fijos y detección se llegan desde Ajustes: las pantallas principales son
   para consultar y registrar, no para configurar.
4. **AllocateIncome usa `replace`, no `navigate`.** Al volver no se debe
   caer en QuickAdd con el ingreso ya registrado.
5. **Las transiciones respetan reduced motion**: con la opción activa, la
   animación del stack es `none`.
