# Prompt para diseñar Mi Platica

> Copia todo lo que sigue y pégalo en la IA de diseño.

---

Actúa como un **senior product designer** especializado en apps móviles de
finanzas personales. Vas a diseñar **Mi Platica**, una app colombiana que ya
existe y funciona: necesito ver cómo se vería si la diseñaras tú.

Entrégame **pantallas visuales** (mockups a 390 × 844 px, formato móvil
vertical), no código.

---

## 1. Qué es Mi Platica

Una app de finanzas personales **100% local y sin conexión**. Todos los datos
viven en el teléfono, en una base SQLite. No hay servidor, no hay cuenta de
usuario, no hay integración bancaria. La app **no mueve dinero**: registra,
organiza y aconseja.

**Para quién:** jóvenes colombianos, muchos con ingreso quincenal, deudas
pequeñas, tarjetas de crédito al tope y poca costumbre de llevar cuentas.

**Identidad:** caribeña colombiana, de forma sutil. Cercana, cálida, directa.
Nada de banco corporativo. Nada de culpa ni regaño. La app acompaña, no juzga.

**La promesa:** que en cinco segundos sepas si puedes gastar algo o no.

---

## 2. Sistema visual ya aprobado

Esto **no se cambia**. Es la identidad de la marca.

### Paleta

```
navy           #071A2A   fondo oscuro, cabeceras, estructura
navySoft       #0D2A3D   tarjetas sobre fondo oscuro
turquoise      #14C4D4   ingresos, progreso, selección activa, acciones positivas
turquoiseDark  #0A8F9C   texto turquesa sobre fondo claro
yellow         #FFD447   botones principales (CTA), ahorro, destacados
coral          #FF6F61   gastos, deuda, urgencia, alertas
plum           #32262F   tarjeta de deuda total
offWhite       #F8F8F3   panel claro de contenido
white          #FFFFFF   tarjetas sobre el panel claro
ink            #17222B   texto principal sobre claro
mutedLight     #9EB5C5   texto secundario sobre oscuro
mutedDark      #7D8990   texto secundario sobre claro
borderDark     #1C465C   bordes sobre oscuro
borderLight    #E6E7E2   bordes sobre claro
paleTurquoise  #E5FAFC   fondo de información positiva
paleYellow     #FFF8D9   fondo de recomendación o esfuerzo
paleCoral      #FFF0ED   fondo de advertencia
```

**Regla de color obligatoria:** el color nunca es la única señal. Un ingreso
lleva signo `+`, color turquesa, icono y la palabra "Ingreso". Un gasto lleva
`−`, coral, icono y "Gasto". Esto es por accesibilidad y no es negociable.

### Estructura que se repite en casi toda la app

```
┌─────────────────────────┐
│ Cabecera navy           │  título, volver, acciones
├─────────────────────────┤
│ Resumen sobre navy      │  las cifras importantes
│ Filtros / selector      │
╭─────────────────────────╮  ← esquinas superiores muy redondeadas (30-36 px)
│                         │
│  Panel offWhite         │  el contenido detallado
│  tarjetas blancas       │
│                         │
╰─────────────────────────╯
│ Barra inferior          │
└─────────────────────────┘
```

### Forma y tipografía

- Tipografía sans-serif geométrica tipo `Inter`, `Manrope` o `DM Sans`
- Títulos y montos: peso 700–800. Etiquetas: 500–600. Descripciones: 400–500
- El monto siempre es el elemento más grande de su tarjeta
- Radio de paneles: 30–36 px. Tarjetas: 18–24 px. Botones: pastilla completa
- Padding lateral: 20–24 px. Espaciado base en múltiplos de 4
- Área táctil mínima: 44 × 44 px
- Iconos lineales simples, grosor consistente (librería Lucide)
- Sin degradados intensos, sin sombras pesadas, sin efectos 3D
- Sin logo grande ni mascota grande: solo un símbolo pequeño de ola y sol

### Formato de dinero

Siempre colombiano, sin decimales: `$ 2.850.000`, `−$ 45.000`, `+$ 1.722.100`

---

## 3. Navegación

**Barra inferior de cuatro pestañas**, con un botón central flotante `+` que
abre el menú de registro:

```
Inicio  ·  Movimientos  ·  [ + ]  ·  Ahorro  ·  Perfil
```

Deudas, Análisis, Mis cuentas, Inversiones, Gastos fijos, Ingresos fijos,
Detección y Ajustes se abren **desde Perfil**, no son pestañas.

---

## 4. Todo lo que la app ya hace

Diseña sobre funciones **reales**, no inventes cifras ni comportamientos.

### Cuentas
Bancos, billeteras digitales (Nequi, Daviplata, Nu…), efectivo y tarjetas de
crédito. Catálogo de 14 bancos y 9 billeteras colombianas con buscador que
ignora tildes. Cada cuenta tiene color propio. Se pueden archivar (conserva el
historial) o eliminar (solo si no tiene movimientos). Una cuenta puede marcarse
como principal.

### Movimientos
Ingresos, gastos, traslados entre cuentas, abonos a deuda y aportes a metas.
Todo en un solo libro contable. Categorías que el usuario crea. Agrupados por
día. Filtros por tipo y periodo.

### Deudas
Préstamos, tarjetas, deudas con personas. Calcula cuota, interés y plazo.
Dos estrategias de salida: **avalancha** (primero la tasa más alta) y **bola de
nieve** (primero la más pequeña). Muestra cuándo quedas libre, calculado con
intereses reales; si una cuota no cubre ni el interés, lo dice en vez de
inventar una fecha.

### Tarjetas de crédito
Día de corte, día límite de pago, cupo, tasa. Compras diferidas a cuotas.
El saldo se guarda en negativo porque es deuda, no dinero disponible.

### Ahorro
Metas con propósito, monto objetivo, lo que ya tienes y fecha opcional.
La app propone **cuatro planes** calculados con tu capacidad real:
Recomendada, Intermedia, Flexible y la que sale de tu fecha elegida.
Ningún aporte sugerido supera lo que te falta.

### Inversiones
CDT, fondos, cuenta de ahorro, acciones. Proyección de rendimiento con tasa
efectiva anual, neta de comisiones.

### Gastos e ingresos fijos
Mensuales o quincenales. Los quincenales tienen dos vencimientos al mes que se
pagan por separado. Cuando llega la fecha de un ingreso fijo, la app pregunta
si ya lo recibiste: **no lo da por recibido solo**.

### El Coach financiero
Es el corazón de la app. Hace tres cosas:

**Antes de un gasto** evalúa con un semáforo:
- Verde "Sí, es manejable" — cabe sin desordenar nada
- Amarillo "Ojo, te puede apretar" — cabe, pero el margen queda corto
- Coral "Mejor espera" — te deja sin cubrir algo que ya debes

Siempre explica con números y **siempre deja confirmar**. En rojo pide
confirmar dos veces y dice la consecuencia completa. Nunca bloquea.

**Al recibir un ingreso** propone un reparto en tres bolsas (Compromisos,
Ahorro, Disponible), con porcentajes calculados de tus datos reales, no fijos.
El usuario elige qué aplicar y a dónde va cada parte.

**Responde preguntas** sobre tu plata con los datos del teléfono.

### Análisis
Gastos por categoría y por día, comparación entre periodos, y ciclos de pago
reales (de quincena a quincena, no del 1 al 30).

### Detección de notificaciones
Lee las notificaciones del banco y **sugiere** registrar el movimiento. Nunca
registra solo.

### Otros
Recordatorios de vencimientos, mensajes motivacionales configurables, tema
claro y oscuro, borrado total de datos.

---

## 5. Lo que ya tiene diseño v3 (NO rediseñar)

Estas diez pantallas ya están hechas y aprobadas. **Respeta su estructura**;
sirven como referencia del lenguaje visual:

1. **Inicio** — saludo, saldo disponible, tres pastillas de acción, carrusel de
   cuentas, panel de últimos movimientos, selector de ánimo
2. **Movimientos** — resumen del periodo, filtros, lista agrupada por día
3. **Deudas** — deuda total en plum, estrategia de salida, vencimientos,
   tarjetas de crédito, orden recomendado
4. **Mis cuentas** — total, cuentas activas, archivadas, hoja de acciones
5. **Agregar / editar cuenta** — tipo, buscador de entidad, saldo, color
6. **Detalle de cuenta** — identidad, métricas del mes, movimientos de esa cuenta
7. **Registrar movimiento** — selector Gasto/Ingreso, monto grande, categorías
8. **Coach de gastos** — el semáforo de tres estados
9. **Coach de ingresos** — flujo de cinco pasos para repartir
10. **Crear ahorro** — dos pasos: definir meta y comparar los cuatro planes
11. **Perfil** — patrimonio, accesos a las demás secciones

---

## 6. Lo que te toca diseñar

Estas **diecinueve pantallas** siguen con el diseño viejo y necesitan el
tratamiento v3. Esto es el encargo:

### Prioridad alta — se usan todos los días

1. **Ahorro (pestaña principal)** — vista general: patrimonio, dinero líquido,
   inversiones, fondo de emergencia, y debajo las metas con su progreso
2. **Análisis** — gráficos por categoría y por día, comparación de periodos,
   selector de ciclo de pago
3. **Detalle de meta de ahorro** — progreso, aportes, proyección, acciones
4. **Ajustes** — nombre, tema, coach, recordatorios, privacidad, borrar datos
5. **Editar movimiento** — cambiar monto, categoría, cuenta, fecha, nota

### Prioridad media — deudas y compromisos

6. **Detalle de deuda** — saldo, plan de cuotas, historial de abonos
7. **Formulario de deuda** — crear y editar, con cálculo de cuota en vivo
8. **Registrar pago de deuda** — monto, cuenta, validaciones
9. **Detalle de tarjeta de crédito** — cupo, corte, pago, compras a cuotas
10. **Gastos fijos** — lista con vencimientos y estado de pago
11. **Formulario de gasto fijo** — nombre, monto, frecuencia, días de cobro
12. **Ingresos fijos** — lista, próximo ingreso, pendientes de confirmar
13. **Formulario de ingreso fijo**

### Prioridad baja — inversiones y extras

14. **Inversiones** — lista con rendimiento proyectado
15. **Detalle de inversión** — aportes, proyección, liquidez
16. **Formulario de inversión**
17. **Coach conversacional** — preguntas y respuestas sobre tu plata
18. **Detección del banco** — movimientos detectados pendientes de confirmar
19. **Repartir ingreso (pantalla antigua)** — destinos concretos uno por uno

---

## 7. Cómo quiero que trabajes

Para **cada** pantalla entrégame:

1. **Mockup visual** a 390 × 844 px, listo para mirar
2. **Estado vacío** — qué se ve cuando no hay datos todavía
3. **Un estado de borde** — error, cargando, o el caso difícil de esa pantalla
4. Una línea explicando **qué decisión** ayuda a tomar esa pantalla

### Reglas que no se rompen

- **No inventes cifras financieras.** Si necesitas datos de ejemplo, usa valores
  colombianos realistas y márcalos como ejemplo
- **No prometas rendimientos ni resultados.** La app aconseja, no garantiza
- **No uses lenguaje de culpa.** Nada de "gastaste mal", "no puedes",
  "mala decisión". El tono es de alguien que te quiere bien y te dice la verdad
- **Nunca el color solo.** Siempre acompañado de texto, signo o icono
- **Todo en español de Colombia.** Nada de inglés ni relleno
- **Sin logos de bancos.** Usa el color de la entidad y un icono genérico
- Diseña para 390 × 844, pero que funcione hasta **360 × 800**: los montos no
  se pueden cortar nunca

### Empieza por

Las cinco de prioridad alta. Cuando las apruebe, seguimos con el resto.

---

## 8. Una advertencia honesta

Esta app ya funciona y tiene toda la lógica financiera implementada y probada.
Lo que te pido es **diseño visual**, no cambiar comportamientos. Si crees que
una pantalla debería funcionar distinto, dímelo aparte y lo hablamos — pero no
lo asumas en el mockup.

Si algo de lo que describo no te queda claro, pregúntame antes de diseñar.
