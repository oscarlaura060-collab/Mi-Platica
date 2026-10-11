# Biblia de diseño — Mi Platica

> Fuente de verdad visual. Si una pantalla contradice este documento, se
> corrige la pantalla, no el documento.

---

## ⚠️ Discrepancia pendiente de resolver

El prompt maestro define una paleta que **no coincide** con la implementada.
La actual se extrajo del archivo del logo; la del prompt es la aprobada.
No se ha migrado porque es trabajo de fundaciones visuales y debe hacerse
en un solo paso.

| Token | Implementado hoy | Prompt maestro | Δ |
|---|---|---|---|
| turquoise | `#1CBBCE` | `#14C4D4` | ligeramente más saturado y claro |
| turquoiseDark | `#0E93A6` | `#0A8F9C` | casi igual |
| navy | `#16314F` | `#071A2A` | **el aprobado es mucho más oscuro** |
| yellow | `#FDD34D` | `#FFD447` | casi igual |
| coral | `#FF6B52` | `#FF6F61` | casi igual |

**Recomendación:** adoptar los del prompt maestro. El cambio grande es
`navy`, que vuelve los fondos oscuros bastante más profundos; conviene
revisar el contraste de `textMuted` y `textFaint` después de migrarlo.

**Decisión pendiente de aprobación.** Hasta entonces rige lo implementado.

---

## Paleta aprobada (objetivo)

```ts
const colors = {
  navy:          '#071A2A',  // confianza, estructura, navegación
  navySoft:      '#0D2A3D',
  turquoise:     '#14C4D4',  // progreso, claridad, acciones positivas
  turquoiseDark: '#0A8F9C',
  yellow:        '#FFD447',  // oportunidades, Coach, ahorro
  coral:         '#FF6F61',  // gastos, compromisos, atención
  plum:          '#32262F',
  offWhite:      '#F8F8F3',  // superficies de lectura
  white:         '#FFFFFF',
  ink:           '#17222B',  // textos principales
  mutedLight:    '#9EB5C5',
  mutedDark:     '#7D8990',
  borderDark:    '#1C465C',
  borderLight:   '#E6E7E2',
  paleCoral:     '#FFF0ED',
  paleTurquoise: '#E5FAFC',
  paleYellow:    '#FFF8D9',
};
```

### Reglas de color

1. **Coral no es color de relleno.** Es acento para gastos, compromisos y
   atención. Una pantalla llena de coral pierde el significado.
2. **Amarillo nunca significa peligro.** Significa meta, oportunidad, Coach.
3. **El color nunca es la única señal.** Todo estado de riesgo lleva texto
   que lo explica. Un número en rojo sin frase no comunica.
4. **Turquesa para lo positivo**: ingresos, progreso, acción principal.

### Dónde vive

`src/theme/index.tsx` exporta `BRAND` y dos paletas completas (oscura y
clara). Se consume con `useTheme()`. **No se escriben colores en las
pantallas.** Excepciones legítimas: los colores de bancos (`PROVIDERS`) y
los que el usuario elige para una meta o cuenta.

---

## Tipografía

Sistema (`System` de la plataforma). Si se cambia, usar Inter, Manrope o
DM Sans.

| Variante | Tamaño | Peso | Uso |
|---|---|---|---|
| `h1` | 34 | 800 | saldo principal, cifra protagonista |
| `h2` | 24 | 700 | título de pantalla |
| `h3` | 18 | 600 | título de tarjeta |
| `body` | 15 | 500 | texto corriente |
| `small` | 13 | 500 | secundario |
| `tiny` | 11 | 600 | etiquetas en mayúscula, pies de texto |

Reglas:

- Los montos siempre con peso fuerte (700+).
- Las etiquetas `tiny` van en MAYÚSCULA y con `faint`.
- `h1` lleva `letterSpacing: -0.8`.
- Toda cifra va con `numberOfLines={1}`: un monto partido en dos líneas
  rompe la lectura.

---

## Espaciado y forma

```ts
space: (n) => n * 4        // space(4) = 16px
radius: { sm: 10, md: 16, lg: 22, xl: 30, pill: 999 }
```

- Margen lateral de pantalla: `space(5)` = 20px.
- Separación entre tarjetas: `space(2.5)` a `space(3)`.
- Separación entre secciones: `space(6)`.
- Relleno interno de tarjeta: `space(4)`.
- Tarjetas con `radius.lg`; las destacadas (`glass`) con `radius.xl`.
- Botones con `radius.pill`.

**Nada amontonado.** Si dos elementos se tocan, falta un `Spacer`.

---

## Componentes

### Base

| Componente | Notas |
|---|---|
| `Screen` | contenedor con el margen lateral y el fondo; `scroll` por defecto |
| `Card` | `tone`: default, alt, danger, warn, info, primary. `glass` para destacadas |
| `Txt` | única forma de escribir texto; nunca `<Text>` directo |
| `Row` / `Spacer` | layout; `Row` con `gap` en unidades de `space` |
| `Button` | `tone`: primary, neutral, ghost, danger. `size`: sm, md, lg |
| `Chip` | selección entre opciones; lleva color propio opcional |
| `Badge` | etiqueta de estado; `tone`: neutral, ok, warn, danger, info |
| `ProgressBar` | animada; respeta reduced motion |
| `SectionTitle` | título de sección con acción opcional a la derecha |
| `EmptyState` | estado vacío con llamada a la acción |
| `FadeIn` | aparición de secciones al cargar |

### Entrada

| Componente | Notas |
|---|---|
| `MoneyInput` | **el único campo para dinero.** Puntos de miles en vivo, trabaja en centavos |
| `Keypad` | teclado numérico propio para registro rápido |
| `DatePickerField` | calendario propio |
| `DayOfMonthField` | día del mes recurrente (1–31) |
| `TimePickerField` | hora y minutos |

### Listas y gráficos

`AccountPill`, `TransactionItem`, `DebtCard`, `SwipeRow`, `DailyBars`,
`Donut`, `WeekdayPattern`, `TwoBars`, `MiniTrend`.

---

## Logo

- `assets/symbol.png` — solo la alcancía. Para espacios pequeños.
- `assets/logo-full.png` — alcancía + texto. Para splash y login.
- `assets/icon.png`, `adaptive-icon.png` — ícono de app.
- `assets/notification-icon.png` — **silueta blanca**. Android ignora los
  colores del ícono de notificación y lo pinta de blanco usando solo el
  canal alfa; un logo a color se vería como un cuadrado macizo.

Reglas: el logo se usa con moderación. En Inicio va pequeño junto al
saludo. **No se redibuja ni se deforma**; se regenera con
`node scripts/build-brand-assets.js`.

Eslogan: **Tu plata, más vida** · Frase: **Pequeños pasos, grandes cosas.**

---

## Iconografía

**Pendiente de decidir.** Hoy se usan glifos de texto (`%`, `+`, `~`, `>`) y
emojis en las categorías. Es la carencia más visible de cara al rediseño.

Recomendación: `lucide-react-native` (trazo lineal, coherente con la marca,
sin dependencia nativa). La decisión se toma en fundaciones visuales.

---

## Estados obligatorios

Cada pantalla importante debe resolver: normal, **cargando**, **vacío**,
**error**, deshabilitado, seleccionado y éxito.

> Hoy existe `EmptyState`; **faltan `Skeleton` y `ErrorState` reutilizables.**

---

## Accesibilidad

- Áreas táctiles ≥ 44×44 px (usar `hitSlop` cuando el elemento sea menor).
- Contraste suficiente; verificar tras migrar `navy`.
- El color nunca es la única señal.
- `reduceMotion` se lee del sistema y **todas** las animaciones lo respetan.
- Los mensajes de error van junto a su campo.

---

## Responsive

Objetivo: 390×844, 393×852, 430×932 y **360×800** (el más estrecho; es el
que rompe las cosas).

Reglas:

- Sin scroll horizontal accidental.
- Los montos con `numberOfLines={1}` y tamaño que se reduce si la cifra es
  larga (ver `QuickAddScreen`).
- Las filas de etiqueta + monto: la etiqueta con `flex: 1`, el monto con
  `numberOfLines={1}`. **Así se evitó que los números se montaran sobre el
  texto.**
- Contenido largo siempre dentro de `ScrollView`.
- Respetar `useSafeAreaInsets()`.

---

## Ejemplos correctos e incorrectos

**Texto**

```tsx
<Txt variant="h3">Saldo</Txt>              // ✅
<Text style={{ fontSize: 18 }}>Saldo</Text> // ❌ se salta el tema
```

**Dinero**

```tsx
<MoneyInput value={cents} onChange={setCents} />   // ✅
<TextInput keyboardType="number-pad" />            // ❌ sin separadores
<Txt>{money(amount)}</Txt>                         // ✅ al mostrar
```

**Color**

```tsx
<View style={{ backgroundColor: t.primary }} />      // ✅
<View style={{ backgroundColor: '#1CBBCE' }} />      // ❌ hardcodeado
```

**Fila con monto**

```tsx
// ✅ el monto nunca se monta sobre el texto
<Row justify="space-between" gap={2}>
  <Txt variant="small" style={{ flex: 1 }} numberOfLines={1}>{label}</Txt>
  <Txt variant="body" weight="700" numberOfLines={1}>{money(v)}</Txt>
</Row>
```

**Estado de riesgo**

```tsx
// ✅ color + texto
<Txt color={t.danger}>Te faltan {money(falta)} para el arriendo</Txt>
// ❌ solo color
<Txt color={t.danger}>{money(saldo)}</Txt>
```
