# Reglas financieras — Mi Platica

> Tienen prioridad sobre cualquier decisión visual. Cambiar una exige
> rehacer las verificaciones de `scripts/verify-*.mjs`.

---

## Convenciones de datos

| Regla | Detalle |
|---|---|
| **Dinero en centavos enteros** | `$1.000` se guarda como `100000`. Nunca floats en saldos. |
| **Tasas de deuda en basis points mensuales** | 1,5 % m.v. → `150` |
| **Tasas de inversión en basis points efectivos anuales** | 12,5 % E.A. → `1250` |
| **Fechas en ISO UTC** + `occurred_day` local | agrupar por día sin recalcular zonas |
| **Borrado lógico** | `deleted_at`; permite deshacer |
| **Formato de salida** | `es-CO`, pesos sin decimales: `$1.234.567` |

---

## 1. Los saldos se derivan, nunca se guardan

```
saldo = inicial
      + ingresos
      + traslados recibidos
      − (gastos + traslados enviados + abonos a deuda + aportes a metas)
```

Está en la vista `v_account_balances`. **No existe una columna `balance`
que se actualice.** Así es imposible que se desincronice.

## 2. La deuda de tarjeta se guarda negativa

El "saldo" de una tarjeta es deuda. Gastar lo baja, pagar lo sube hacia
cero.

```
used      = −balance
available = credit_limit + balance
```

Pagar la tarjeta es una **transferencia** desde una cuenta hacia ella: el
cupo se libera solo, sin contadores aparte.

> Este fue un error real en producción: el formulario pedía "saldo actual",
> el usuario escribía lo que debía en positivo y el sistema entendía que
> tenía plata a favor. La migración 8 corrige el dato histórico.

## 3. Una compra a cuotas no es una deuda aparte

El cupo se afecta por el **total** de la compra (así lo hacen los bancos).
El plan de cuotas (`installment_plans`) es el desglose de cómo te van a
cobrar esa misma plata, **no una deuda adicional**.

Por eso la deuda total = saldo usado de las tarjetas + préstamos. Los
planes no se suman.

## 4. Un abono separa capital e interés

```
interés  = min(saldo × tasa_mensual, abono)
capital  = min(abono − interés, saldo)
```

El saldo baja **solo por el capital**. Un abono extraordinario va 100 % a
capital.

## 5. Un aporte a meta no es un gasto

Sale de la cuenta (baja el saldo) pero sigue siendo del usuario. Se
registra como `goal_deposit`, y los reportes de gasto lo excluyen.

Lo mismo con los abonos a deuda (`debt_payment`): bajan lo que debes, no
son consumo.

## 6. Un gasto quincenal son dos vencimientos

Un gasto de $300.000 los días 15 y 30 **cuesta $600.000 al mes**, no
$300.000. Pagar la primera quincena no marca la segunda.

Períodos: el primer cobro usa `YYYY-MM`, el segundo `YYYY-MM-Q2`.

## 7. El número honesto es el disponible real

```
disponible real = saldo total
                − gastos fijos pendientes del mes
                − cuotas de deuda y tarjeta próximas (15 días)
```

Es lo que el coach usa para decidir si un gasto cabe.

## 8. Capacidad segura de ahorro

```
capacidad = ingresos fijos
          − gastos fijos
          − cuotas de deuda
          − necesidades básicas
```

Las necesidades básicas son las que el usuario declaró; si no declaró, se
**estima** con su promedio de gasto diario × 30 y **se marca como
estimación**.

Nunca se sugiere un aporte mayor a esa capacidad. Si la fecha que pidió
exige más, se dice con amabilidad y se propone una fecha alcanzable — pero
**la meta no se cambia sola**.

## 9. Las cuatro opciones de plan de ahorro

| Opción | Aporte | Para quién |
|---|---|---|
| Recomendada | 60 % de la capacidad | equilibrio, deja margen |
| Acelerada | 85 % de la capacidad | si los gastos son estables |
| Tranquila | 35 % de la capacidad | la más fácil de sostener |
| Tu fecha | lo que exija la fecha | puede no ser viable; se dice |

Se destaca la fecha del usuario **si es viable**; si no, la recomendada.

## 10. Ciclos de pago

Un ciclo va de un día de cobro al siguiente, **no del 1 al 30**. Si cobra
el 15 y el 30 y hoy es 5, el ciclo actual empezó el 30 del mes pasado.

Analizar del 1 al 31 mezcla dos quincenas y no dice si la plata alcanzó.

## 11. Avalancha y bola de nieve

- **Avalancha**: primero la tasa más alta. Óptimo matemático.
- **Bola de nieve**: primero el saldo más pequeño. Óptimo psicológico.

El excedente que sobra al saldar una deuda baja a la siguiente.

## 12. Ahorro vs. pagar deuda

Es un arbitraje de tasas: abonar a una deuda al 26 % E.A. es una
rentabilidad **garantizada y libre de impuestos** del 26 %.

Tres excepciones que se respetan:

1. Sin colchón de emergencia, cualquier imprevisto devuelve al
   endeudamiento. El colchón va primero.
2. La plata comprometida esta quincena se separa antes.
3. Un CDT a término **no sirve de colchón** aunque rente mejor.

## 13. Rentabilidad neta y real

- **Neta** = bruta − comisiones e impuestos. Es la única comparable contra
  una deuda.
- **Real** = `(1 + nominal) / (1 + inflación) − 1`. Un CDT al 9 % con
  inflación del 5 % **no dio 9 %: dio 3,8 %**.

---

## Las 14 reglas no negociables

1. No inventar cifras para producción.
2. Separar datos mock de datos reales.
3. Calcular con ingresos, gastos, deudas y compromisos conocidos.
4. Si falta información, decirlo.
5. No prometer que una meta se alcanzará sin datos suficientes.
6. **No cambiar una meta automáticamente.**
7. **No cambiar un plan guardado por una nueva recomendación.**
8. Permitir ajustar aporte, fecha y frecuencia.
9. No ejecutar transferencias reales.
10. No esconder una opción poco viable: explicarla con amabilidad.
11. Dejar margen para necesidades y compromisos.
12. No mostrar falsa precisión.
13. Documentar supuestos de cálculo.
14. Formatos colombianos para pesos y fechas.

---

## Supuestos documentados

| Supuesto | Valor | Dónde |
|---|---|---|
| Un mes = 30 días para proyecciones | 30 | `savings/options.ts` |
| Una quincena = 15 días | 15 | `savings/options.ts`, `period/cycles.ts` |
| Horizonte de compromisos próximos | 15 días | `coach/context.ts` |
| Inflación por defecto | 5 % E.A. | `settings.inflation_bp` |
| Reparto de ingreso por defecto | 50 % deuda / 20 % ahorro / 30 % libre | `settings` |
| Dinero "para un gusto" | 15 % de lo libre, con tope, **solo si todo está cubierto** | `coach/destinations.ts` |
| Referencia si no hay vehículo de ahorro | 9 % E.A. (CDT corriente), marcada como referencia | `coach/engine.ts` |
| Día de mes inexistente (31 en febrero) | se usa el último día del mes | `utils/date.ts` |

---

## Verificación

| Script | Comprobaciones |
|---|---|
| `verify-all.mjs` | 80 — esquema, cuentas, tarjetas, fijos, metas, deudas, duplicados |
| `verify-savings-options.mjs` | 31 — las cuatro opciones de plan |
| `verify-motivation.mjs` | 21 — tono y horarios de recordatorios |
| `verify-periods.mjs` | 21 — rangos y ciclos de quincena |
| `verify-biweekly.mjs` | 14 — gastos fijos quincenales |

```bash
cd C:\dev\FinZen; node scripts/verify-all.mjs
```

**Si se cambia una regla financiera, se actualiza su verificación en el
mismo cambio.**

---

## Capacidad de ahorro (corregido en 2.7.0)

### Un ingreso fijo vale lo que llega, no lo que dice la fila

`fixed_incomes.amount` es lo que entra CADA VEZ, no al mes. La frecuencia
decide cuántas veces:

| frequency | veces al mes |
|-----------|--------------|
| biweekly  | 2            |
| monthly   | 1            |
| weekly    | 4,345        |
| yearly    | 1/12         |
| variable  | 1            |

`monthlyIncomeTotal()` sumaba `amount` tal cual. Con un sueldo quincenal
—lo normal en Colombia— el ingreso mensual salía a la mitad, y con eso la
capacidad de ahorro daba cero. Los gastos fijos ya hacían bien esta cuenta
en `v_fixed_expense_status.monthly_total`; ahora los ingresos también.

### Lo fijo no se resta dos veces

La capacidad es:

```
capacidad = ingresos − gastos fijos − cuotas − necesidades básicas
```

Cuando la persona no ha declarado sus necesidades básicas, se estiman con
el gasto observado. Esa estimación usaba `avgDailyExpense(30)`, que suma
TODOS los gastos, incluidos los pagos de gastos fijos y las cuotas de
tarjeta que la fórmula ya resta por su lado. El arriendo se restaba dos
veces. Ahora se usa `avgDailyDiscretionaryExpense(30)`, que excluye los
movimientos con `fixed_expense_id` o `installment_plan_id`.

### Nunca se le dice a nadie que no puede ahorrar

Si la capacidad da cero o negativa, la app NO se queda sin proponer nada.
Ofrece tres aportes chicos —1%, 2,5% y 5% del ingreso mensual, redondeados
al mil y nunca por debajo de $2.000— y deja escribir cualquier monto a
mano, sin mínimo. Se marcan como no holgados (`feasible: false`) y el
motivo lo dice sin adornos, pero se pueden elegir y guardar.

La razón es de producto, no técnica: un aporte de $2.000 por quincena vale
más que una meta que nunca se creó.

---

## El plan de un ingreso (2.8.0)

### Tres bolsas, datos reales

El flujo muestra **Compromisos / Ahorro / Disponible**, pero esas bolsas
no son categorías inventadas: agrupan los destinos concretos que ya
calculaba `buildDestinations`.

| Bolsa | Qué agrupa |
|-------|-----------|
| Compromisos | gastos fijos pendientes, tarjetas, deudas |
| Ahorro | metas de ahorro e inversiones |
| Disponible | lo que sobra |

Los porcentajes **se calculan de los montos reales**, no son 60/20/20
fijos. Si alguien debe el 90% de su sueldo, la app lo dice.

Al aplicar, cada compromiso se paga contra su propia fila
(`payFixedExpense`, `payCreditCard`, `payDebt`), no contra un total
opaco. Por eso la bolsa guarda `items` con los destinos concretos.

### Redondeo de porcentajes

Redondear cada parte por separado da 33+33+33=99. `wholePercentages`
reparte el sobrante por el método del resto mayor, así que **siempre**
suman 100.

### Las metas van antes que las inversiones

Una meta tiene un propósito que la persona escribió ("viaje",
"computador"): aportarle es una decisión que ya tomó. Una inversión
genérica no compite con eso. Por eso `priority: 4` para metas y `5` para
inversiones, y la parte de ahorro se reparte primero a metas, sin pasarse
de lo que le falta a cada una.

### Disponible no genera movimiento

Si la persona deja el disponible en la cuenta donde cayó el ingreso, **no
se registra nada**: la plata ya está ahí. Inventar un movimiento sería
ensuciar el historial. Solo si elige otra cuenta se registra un traslado.

### Nada se aplica antes del paso 4

El estado del plan vive en memoria durante los pasos 1 a 3. La única
escritura a la base ocurre al confirmar en `review`. Volver atrás nunca
pierde las selecciones, y el botón se bloquea mientras guarda para que
dos toques no dupliquen pagos.

### Saldo insuficiente

Se valida **antes** de aplicar, no a mitad del proceso. "Disponible" no
cuenta como salida de la cuenta, porque no sale: por eso con un ingreso
de 2.850.000 repartido 1.710.000 + 570.000 + 570.000, un saldo de
2.280.000 alcanza.
