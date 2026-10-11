# Principios de producto — Mi Platica

---

## Qué es

Una app que ayuda a jóvenes a manejar su plata sin sentirse juzgados ni
enfrentarse a una interfaz bancaria fría.

**No es** un banco, una hoja de cálculo, un tablero de gráficos, un sistema
que regaña ni un producto infantil.

**Es** un acompañante claro: un Coach empático, costeño y moderno, que
convierte la plata en decisiones comprensibles y celebra avances reales.

Eslogan: **Tu plata, más vida**

---

## Los seis principios

### 1. El Coach orienta, nunca impone

Propone y explica; el usuario decide. Toda recomendación es ajustable y
rechazable. **Nada se mueve sin confirmación.**

Implementado así: al registrar un ingreso, el dinero entra a la cuenta y
*después* se ofrece repartirlo, con cada destino desmarcado por defecto. El
usuario marca lo que acepta.

### 2. Ninguna cifra inventada

Si falta un dato, se dice; no se rellena con un supuesto disfrazado de
certeza. Cuando un cálculo se basa en una estimación, se marca como tal.

Ejemplo real: si el usuario no declaró sus gastos básicos, el plan de ahorro
usa su promedio de gasto y escribe *"Calculado con una ESTIMACIÓN de tus
gastos básicos"*.

### 3. El número honesto es el disponible real

El saldo de la cuenta miente: ahí todavía está el arriendo. Por eso existe
**"libre de verdad"** = saldo − gastos fijos pendientes − cuotas próximas.

Corolario: un abono a deuda y un aporte a meta **no son gastos**. Salen de
la cuenta, sí, pero uno baja lo que debes y el otro sigue siendo tuyo.
Mezclarlos con el gasto corriente haría creer que se gasta más de lo real.

### 4. Nunca culpar

Los mensajes pueden ser firmes, nunca duros. Si no hubo avance, se invita a
retomar; no se señala el fallo. Prohibido usar tristeza, vergüenza o enojo
para presionar.

Está verificado: `scripts/verify-motivation.mjs` recorre los 27 mensajes
posibles comprobando que ninguno use palabras de culpa.

### 5. Proponer, no ejecutar

Ninguna función registra un movimiento sola. La detección bancaria **sugiere**
y el usuario confirma, porque los bancos cambian sus textos sin avisar y un
parser desactualizado ensuciaría las finanzas en silencio.

Las metas **nunca** cambian solas. Si cambian los ingresos, se avisa y se
ofrece recalcular; no se modifica el plan guardado.

### 6. Privacidad por arquitectura

No hay cuenta, servidor ni analítica. El permiso de INTERNET está bloqueado
en el manifiesto. Lo que se lee de las notificaciones se queda en la misma
base local que el resto.

---

## Tono de voz

Español colombiano natural, sin exagerar lo regional.

**Así sí**

```
Tu plata ya tiene un plan.
Pequeños pasos, grandes cosas.
Te faltan $2.430.000 para tu meta.
Revisemos una opción más cómoda.
Un compromiso menos, más tranquilidad.
Te quedan $320.000. Si no los necesitas, guárdalos hasta el 30 de
noviembre para el arriendo.
```

**Así no**

```
Estás gastando demasiado.
Lo estás haciendo mal.
Debes obedecer este plan.
Tu situación es peligrosa.
Felicidades campeón.
```

### Reglas de redacción

1. **Cifra + destino + fecha.** "Vas bien" no le sirve a nadie; "Te quedan
   $320.000, guárdalos hasta el 30 para el arriendo" sí.
2. Segunda persona, cercana, sin diminutivos forzados.
3. Una idea por mensaje.
4. Si hay un número, que sea real y verificable en la app.
5. Las malas noticias se dan completas pero sin dramatizar: *"Te faltan
   $150.000 para cubrirlos"*, no *"¡Cuidado! Estás en riesgo"*.

---

## Qué responde cada sección

| Sección | Preguntas que debe responder |
|---|---|
| **Inicio** | ¿Cuánto tengo? ¿Qué compromisos vienen? ¿Cómo cambió mi plata? ¿Qué debería revisar? |
| **Deudas** | ¿Cuánto debo? ¿Qué vence pronto? ¿Qué estrategia uso? ¿Qué priorizo? |
| **Ahorro** | ¿Para qué ahorro? ¿Cuánto llevo? ¿Cuánto falta? ¿Qué plan sigo? |
| **Análisis** | ¿En qué se fue la plata? ¿Qué cambió? ¿Qué hábito mejoro? |

---

## Los tres rituales de progreso

Momentos que merecen celebración breve (sin confeti ni rebotes):

| Ritual | Emoción | Mensaje |
|---|---|---|
| Pagar un gasto fijo | alivio y control | *Compromiso cubierto · Te faltan 2 pagos este mes* |
| Recibir el sueldo | claridad y posibilidad | *Tu plata ya tiene un plan · Ver mi plan* |
| Aportar al ahorro | orgullo y progreso | *Tu meta avanzó · +$214.000 ahorrados* |

> Estado: **los tres están sin implementar.** Hoy solo hay retroalimentación
> háptica al guardar. Es trabajo de la etapa de animaciones.

---

## Decisiones que ya se tomaron y por qué

| Decisión | Razón |
|---|---|
| El dinero se guarda en centavos enteros | cero errores de punto flotante en saldos y amortizaciones |
| Los saldos se derivan con vistas SQL | imposible que se desincronicen |
| Un libro único de movimientos con `type` | una consulta sirve para todo |
| Borrado lógico (`deleted_at`) | permite deshacer sin romper el histórico |
| El coach son reglas puras, sin IA | responde al instante, sin conexión, y **nunca inventa una cifra** |
| Las reglas del coach viven en una tabla | el usuario puede apagarlas desde Ajustes |
| La deuda de tarjeta se guarda negativa | es deuda, no saldo a favor |
| Un gasto quincenal son dos vencimientos | son dos salidas de plata distintas |
| La cuenta principal es solo preferencia | no altera ningún total; las cifras nunca se mezclan |
