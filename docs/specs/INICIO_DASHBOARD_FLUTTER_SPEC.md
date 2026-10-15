# Especificación técnica — Pantalla **Inicio / Dashboard v4** (Flutter)

> Documento de handoff para **Codex**. Describe *qué* construir y *con qué valores exactos*.
> No decide el stack: implementar en **Flutter + BLoC/Cubit**.

## 0. Fuente de verdad

| Fuente | Qué aporta | Nodo / archivo |
|---|---|---|
| Figma `Mi-Platica` | Estructura, jerarquía visual, estados | `node 7:957` (Dashboard oscuro), `7:702` (claro), `8:1294` (Estados: Carga / Info incompleta / Offline) |
| Implementación React en vivo | Valores exactos de tokens y componentes ya aprobados | `src/theme/tokens.ts`, `src/features/home/**` |

Figma y código **coinciden** (ambos son "Dashboard v4 — Caribe Cálido"). Donde un valor
numérico difiera, **manda `tokens.ts`**: su cabecera declara que es la fuente de verdad de color.

Viewport canónico: **390 × 844** (móvil). Margen lateral de pantalla: **16px** (`space(4)`).
Moneda: **COP**, enteros, sin decimales. Idioma: **es-CO**.

---

## 1. Anatomía de la pantalla (orden exacto, de arriba hacia abajo)

La pantalla tiene **tres zonas** apiladas en un scroll vertical único, con una barra inferior fija.

```
┌─ SafeArea ──────────────────────────────────┐
│ ZONA A — Header (fondo navy #071A2A)         │
│   [MP] Saludo / Nombre      [☀/☾] [🔔•] [⚙] │
├─ ZONA B — Cuerpo (fondo navy) ──────────────┤
│   ┌ Hero "Saldo disponible" (card) ───────┐  │
│   │ SALDO DISPONIBLE REAL        • Al día │  │
│   │ $200.000  COP                         │  │
│   │ Libre para ti después de compromisos  │  │
│   │ 🛡 Compromisos del mes: 100% cubiertos│  │
│   │ [ + Ingreso ]       [ − Gasto ]       │  │
│   └───────────────────────────────────────┘  │
│   ┌ "Mis cuentas"            Ver todas → ─┐  │
│   │  [Nequi $80.000] [Efectivo $120.000]… │  │ (carrusel horizontal)
│   └───────────────────────────────────────┘  │
│   ┌ Coach Financiero (card, acento amarillo)│ │
│   │ ☀ COACH FINANCIERO · SIN CULPA  Ver → │  │
│   │ "Vas al día con tus compromisos…"     │  │
│   └───────────────────────────────────────┘  │
├─ ZONA C — Hoja clara (porcelana #F8F8F3) ───┤  radio superior 34px
│   Últimos movimientos        Ver todos →     │
│   • Supermercado Éxito           −$45.000     │
│   • Nómina Quincena            +$1.000.000    │
│   • …                                         │
│   ┌ Coach Mood: ¿Cómo te sientes hoy? ─────┐  │
│   │ 😟 😐 🙂     [ Ver recomendaciones ]   │  │
│   └───────────────────────────────────────┘  │
├─ BottomNav fija ────────────────────────────┤
│  Inicio   Movimientos   (＋)   Ahorro  Perfil│
└─────────────────────────────────────────────┘
```

Mapa componente → widget Flutter (nombres sugeridos):

| Zona | Componente | Widget Flutter | Ref. React |
|---|---|---|---|
| A | Header | `HomeHeader` | `components/HomeHeader.tsx` |
| B | Hero saldo | `BalanceSummaryCard` | `components/BalanceSummary.tsx` |
| B | Carrusel cuentas | `AccountsCarousel` | `components/AccountsCarousel.tsx` |
| B | Consejo del coach | `CoachAdviceCard` | `components/CoachAdviceCard.tsx` |
| C | Hoja de movimientos | `RecentActivitySheet` | `components/RecentActivityPanel.tsx` |
| C | Estado de ánimo | `CoachMoodCard` | `components/CoachMoodCard.tsx` |
| — | Barra inferior | `AppBottomBar` | `app/navigation/BottomBar.tsx` |

---

## 2. Design tokens y elevación

### 2.1 Color (hex) + contraste WCAG

Clase `AppColors` (mapea 1:1 `tokens.ts`). **Nunca** escribir un color a mano en un widget.

```dart
class AppColors {
  // Fondos oscuros
  static const navy        = Color(0xFF071A2A); // fondo principal + header
  static const navySoft    = Color(0xFF0D2A3D);
  static const surfaceLow  = Color(0xFF0A1D2D); // cards sobre navy
  static const surfaceHigh = Color(0xFF1A2B3C); // botón "Gasto"
  static const borderDark  = Color(0xFF1C465C); // separadores sobre navy (1px)

  // Acentos
  static const turquoise     = Color(0xFF14C4D4); // acción primaria, saldo positivo
  static const turquoiseDark = Color(0xFF0A8F9C);
  static const yellow        = Color(0xFFFFD447); // Coach, CTA recomendada
  static const coral         = Color(0xFFFF6F61); // gastos, alertas

  // Superficie clara
  static const offWhite    = Color(0xFFF8F8F3); // hoja inferior
  static const white       = Color(0xFFFFFFFF);
  static const ink         = Color(0xFF17222B); // texto principal sobre claro
  static const borderLight = Color(0xFFE6E7E2);

  // Texto secundario
  static const mutedLight  = Color(0xFF9EB5C5); // sobre oscuro
  static const mutedDark   = Color(0xFF7D8990); // sobre claro

  // Fondos tonales de íconos/estados (claro)
  static const paleTurquoise = Color(0xFFE5FAFC);
  static const paleCoral     = Color(0xFFFFF0ED);
  static const paleYellow    = Color(0xFFFFF8D9);

  // Variantes ACCESIBLES — usar para TEXTO pequeño sobre fondo claro
  static const turquoiseAccessible = Color(0xFF0A8F9C);
  static const yellowAccessible    = Color(0xFF9E7400);
  static const coralAccessible     = Color(0xFFD93829);
  static const onSurface           = Color(0xFFD2E4FB); // texto sobre navy
}
```

**Reglas de contraste (WCAG AA ≥ 4.5:1 texto normal, AAA ≥ 7:1):**

| Texto | Fondo | Uso | Ratio aprox. | Nivel |
|---|---|---|---|---|
| `white` | `navy` | cifra del saldo, títulos | ~16:1 | AAA |
| `onSurface` #D2E4FB | `navy` | cuerpo sobre oscuro | ~13:1 | AAA |
| `mutedLight` #9EB5C5 | `navy` | subtítulos sobre oscuro | ~7.2:1 | AAA |
| `turquoise` #14C4D4 | `navy` | etiqueta "SALDO", links | ~8:1 | AAA |
| `navy` | `turquoise` | texto del botón "+ Ingreso" | ~8:1 | AAA |
| `ink` #17222B | `offWhite` | texto principal claro | ~14:1 | AAA |
| `mutedDark` #7D8990 | `offWhite` | subtítulos claros | ~4.6:1 | AA |
| **`coralAccessible`** #D93829 | `offWhite` | montos de gasto (texto) | ~5:1 | AA |
| **`yellowAccessible`** #9E7400 | `offWhite` | texto amarillo sobre claro | ~4.8:1 | AA |

> ⚠️ **Regla dura:** el amarillo `#FFD447` y el coral `#FF6F61` sirven como **fondo o ícono**,
> nunca como **texto** sobre superficie clara (fallan AA). Para texto usar las variantes `*Accessible`.
> El coral sí vale como texto sobre `navy` (cifra negativa del saldo): ratio ~5.3:1.

### 2.2 Tipografía

Escala (de `tokens.ts`, en px lógicos / `.sp`):

| Token | Tamaño | Peso | Uso |
|---|---|---|---|
| `hero` | **46** | w900 | cifra del saldo |
| `h1` | 34 | w900 | títulos de pantalla |
| `h2` | 24 | w900 | nombre en header, "Últimos movimientos" |
| `h3` | 18 | w800 | "Mis cuentas", títulos de card |
| `body` | 15 | w500 | texto de consejo, descripciones |
| `small` | 13 | w600 | subtítulos, links |
| `tiny` | 11 | w800 | etiquetas uppercase ("SALDO DISPONIBLE") |

**Fuente — DECISIÓN FIRME: Hanken Grotesk** (confirmada por el dueño del producto).
Variable, distintiva, con excelentes numerales; evita Inter/Roboto/Plus Jakarta (sobreexpuestas;
la auditoría del repo marcó `Plus Jakarta Sans` como "overused-font"). Se carga vía `google_fonts`
(`GoogleFonts.hankenGrotesk`). **Obligatorio:** (a) pesos w900 para cifras y títulos, (b) **numerales
tabulares** (`fontFeatures: [FontFeature.tabularFigures()]`) en todo monto, para que las columnas de
dinero no bailen. Para fijarla offline, añadir el `.ttf` a `assets/` y declararlo en `pubspec.yaml`.

### 2.3 Espaciado, radios

```dart
double space(num n) => n * 4.0;         // múltiplos de 4
// Margen lateral de pantalla: space(4) = 16
// Separación entre bloques de la Zona B: space(6) = 24

class AppRadius {
  static const sm   = 10.0;
  static const md   = 16.0;  // cards de cuenta, coach, mood  (rounded-2xl)
  static const lg   = 24.0;  // card del saldo                (rounded-3xl)
  static const xl   = 30.0;
  static const sheet= 34.0;  // esquinas superiores de la hoja clara
  static const pill = 999.0; // botones redondeados, badges
}
```

### 2.4 Elevación — sombras suaves + bordes 1px

La profundidad se logra con **tres recursos combinados**, no solo sombra:
1. **Salto de superficie tonal** (`surfaceLow` sobre `navy`).
2. **Borde de 1px** (`borderDark` en oscuro, `borderLight` en claro).
3. **Sombra suave** difusa, nunca dura.

```dart
class AppShadows {
  // Cards sobre navy (shadow-md)
  static const soft = [
    BoxShadow(color: Color(0x33000000), blurRadius: 14, offset: Offset(0, 6)),
  ];
  // Hero del saldo (shadow-xl)
  static const hero = [
    BoxShadow(color: Color(0x40000000), blurRadius: 24, offset: Offset(0, 10)),
  ];
  // Hoja clara inferior (shadow-2xl, proyecta hacia ARRIBA)
  static const sheet = [
    BoxShadow(color: Color(0x1F071A2A), blurRadius: 32, offset: Offset(0, -6)),
  ];
}
```
Borde estándar: `Border.all(width: 1, color: AppColors.borderDark)` (oscuro) /
`borderLight` (claro). El borde del Coach card es amarillo translúcido: `Color(0x59FFD447)` (≈35%).

### 2.5 Microinteracciones táctiles

Toda superficie tocable implementa las tres a la vez:

1. **Escala al presionar:** baja a **0.95** (botones) / **0.99** (filas de lista), con
   `AnimatedScale`/`GestureDetector`, duración **120ms**, curva `Curves.easeOut`. Vuelve a 1.0 al soltar.
2. **Ripple:** `InkWell`/`InkResponse` con `splashColor` al 8–12% del color de acento del elemento,
   `borderRadius` igual al de la card.
3. **Respuesta háptica:** `HapticFeedback.selectionClick()` en taps de navegación/selección;
   `HapticFeedback.lightImpact()` al confirmar un movimiento (Ingreso/Gasto) y al elegir estado de ánimo.

Widget reutilizable sugerido: `PressableScale({child, onTap, scale = .95, haptic = HapticKind.selection})`
que envuelve `InkWell` + `AnimatedScale` y dispara el háptico en `onTapDown`.

> **ADICIÓN RECOMENDADA — reduced motion:** si `MediaQuery.disableAnimations` (o el ajuste de
> accesibilidad del SO) está activo, desactivar la escala y los shimmer; mantener solo el ripple.

---

## 3. Especificación por componente (medidas exactas)

### 3.1 `HomeHeader` (Zona A) — fondo `navy`, padding `16` lateral, `16` top / `8` bottom
- **Logo "MP":** 40×40, radio `12` (`AppRadius.sm`+2 ≈ `xl` tile), degradado lineal
  `from turquoise → to yellow` (abajo-izq → arriba-der), texto "MP" w800 color `navy`, 18sp. Sombra `soft`.
- **Bloque central (Expanded):** saludo `tiny` w800 uppercase `mutedLight` ("Buenos días/tardes/noches"
  según hora: <12 / <18 / resto); debajo nombre `h2` w900 `onSurface`, 1 línea con `TextOverflow.ellipsis`.
- **Acciones (3 botones 40×40 circulares):** toggle tema (`☀` yellow en oscuro / `☾` onSurface en claro),
  campana (badge coral 10px arriba-der cuando `detectedPending > 0`, con anillo 2px color navy), ajustes.
  Hover/press: fondo `white @10%`, escala 0.95.

### 3.2 `BalanceSummaryCard` (Zona B, hero) — radio `24`, bg `surfaceLow`, borde 1px `borderDark`, sombra `hero`, padding `20`
Orden interno:
1. Fila: etiqueta `tiny` w900 uppercase `turquoise` — texto `"SALDO DISPONIBLE REAL"` o
   `"DISPONIBLE EN {CUENTA}"` si hay cuenta principal — + **badge "Al día"** (pill, bg
   `turquoise @12%`, borde `turquoise @25%`, punto 6px + texto `turquoise` w700 12sp).
2. **Cifra protagonista:** `hero` 46sp w900, color `white` (o `coral` si negativo) + sufijo `"COP"`
   14sp w800 `mutedLight`, alineados a la base. **Numerales tabulares.**
3. Subtítulo `body` `mutedLight`: "Libre para ti después de cubrir compromisos sagrados."
4. **Mini badge compromisos** (si `fixedMonthly > 0`): pill, bg `#0F2131 @85%`, borde `borderDark @60%`,
   ícono escudo `turquoise` 16px + texto `small` `mutedLight` con `"100% cubiertos"`/`"Pendientes"`
   y el monto en `white` w700.
5. **Botones gemelos** (`Row`, gap 12, cada uno `Expanded`, alto **48**, radio `pill`, sombra `soft`):
   - `+ Ingreso`: bg `turquoise`, texto+ícono `navy` w900 14sp (ícono `arrow_downward` 20px).
   - `− Gasto`: bg `surfaceHigh`, borde 1px `borderDark`, texto `white` w900, ícono `arrow_upward` `coral`.

### 3.3 `AccountsCarousel` (Zona B) — `ListView` horizontal, `clipBehavior: none`, physics con snap
- Cabecera: título `h3` w900 `white` "Mis cuentas" + link "Ver todas →" `small` w700 `mutedLight`.
- **Card de cuenta:** ancho **256** (`w-64`), radio `16`, bg `surfaceLow`, borde 1px `borderDark`,
  sombra `soft`, padding `16`, gap entre cards `12`. Contenido: tile de ícono 44×44 radio `12`
  (bg = color de acento @12%, borde @25%, ícono del acento 20px) + nombre `small` w700 `onSurface` +
  saldo `h3` w900 `white` (tabular) + etiqueta de rol: `"Cuenta principal"` (`turquoise`) o
  `"Cupo usado"` (`coral`) en `tiny` w800 uppercase. Trailing: chevron `mutedLight`.
  Color de acento por índice: `[turquoise, yellow, coral]` ciclado, o `account.color` si existe.
- Tarjeta de crédito: mostrar `max(-balance, 0)` como "Cupo usado".
- **Límite del carrusel (DECISIÓN):** mostrar como máximo **5 tarjetas** de cuenta. Si hay más de 5,
  la 5.ª posición se reemplaza por una **tarjeta-resumen "Ver todas (+N)"** (mismo tamaño 256×96,
  `surfaceLow`, borde `borderDark`): ícono `Icons.grid_view_rounded` en tile turquesa + texto
  "Ver todas" `small` w700 `white` y "+N cuentas" `tiny` `mutedLight`, que navega a `accounts`.
  El link "Ver todas →" del encabezado permanece siempre visible. Con ≤5 cuentas se muestran todas
  sin tarjeta-resumen. Razón: acota la carga cognitiva y el scroll horizontal sin esconder el acceso
  al listado completo.

### 3.4 `CoachAdviceCard` (Zona B) — radio `16`, bg `surfaceLow`, **borde amarillo** `0x59FFD447`, sombra `soft`, padding `16`
Fila: círculo 40×40 (bg `yellow @16%`, borde @32%, ícono sol `yellow` 20px) + columna:
etiqueta `tiny` w900 uppercase `yellow` "COACH FINANCIERO · SIN CULPA" + link "Ver plan →" `turquoise`;
debajo mensaje `body` `onSurface` (viene de `advice.message`, con fallback incluido). Toda la card es tocable → ruta `coach`.

### 3.5 `RecentActivitySheet` (Zona C) — radio superior `34`, bg `offWhite`, sombra `sheet`, padding `20`
- Cabecera: "Últimos movimientos" `h2` w900 `ink` + "Ver todos →" `small` w700 `turquoiseDark`.
- **Fila de movimiento** (máx 8): tile circular 44×44 (bg pale según tipo, ícono según categoría) +
  columna título `small` w700 `ink` / subtítulo `tiny` `mutedDark` (`"{Tipo} · {cuenta}"`) +
  monto `h3` w900 a la derecha, con signo y color:
  - ingreso → `+` color `turquoiseDark`, fondo ícono `paleTurquoise`
  - gasto → `−` color `coralAccessible`, fondo ícono `paleCoral`
  - ahorro/traslado → sin signo, color `ink`, fondo `paleYellow`
  Separador 1px `borderLight` entre filas. Fila tocable (escala 0.99, ripple).
- Íconos por categoría (sugeridos Material): mercado→`shopping_cart`, transporte→`directions_bus`,
  comida→`restaurant`, servicios/luz→`bolt`, arriendo/casa→`home`, ingreso→`south`, deuda→`credit_card`,
  meta→`savings`, otro→`north`.
- Al final, embebido con `space(6)` arriba: `CoachMoodCard`.

### 3.6 `CoachMoodCard` (Zona C, dentro de la hoja) — radio `16`, bg `navy @6%`, borde 1px `borderLight`, padding `16`
Título `small` w700 `ink` "¿Cómo te sientes hoy con tu plata?". Fila de 3 botones de ánimo
(mín **56×56**, radio `12`): `😟 Me preocupa` / `😐 Voy regular` / `🙂 Voy bien`. Seleccionado:
bg `white`, sombra `soft`, escala 1.05, muestra label en color por ánimo
(`coral` / `#B8880A` / `turquoiseDark`). A la derecha, CTA "Ver recomendaciones →" pill alto `48`,
bg `yellow`, texto `navy` w900. Pie: `small` `mutedDark` "Vamos paso a paso, tú puedes."

### 3.7 `AppBottomBar` (fija) — ver `app/navigation/BottomBar.tsx`
5 destinos: **Inicio · Movimientos · (＋ FAB central turquesa) · Ahorro · Perfil**. El FAB central
eleva con sombra `hero` y abre `quickAdd`. Ítem activo en `turquoise`, inactivos en `mutedLight`.

---

## 4. Skeleton loaders y transición (Zona de Estados — Figma `8:1294`)

### 4.1 Formas exactas del skeleton (shimmer)
Color base shimmer: sobre oscuro `white @12%`; sobre claro `navy @8%`. Animación: barrido/pulso
**1000ms**, `easeInOut`, en bucle. Usar paquete `shimmer` o un `AnimatedOpacity` 1.0↔0.4.

| Componente en carga (`loading = true`) | Forma del skeleton |
|---|---|
| **Saldo (hero)** | 1 barra: ancho **75%**, alto **48**, radio **12**, sobre oscuro |
| **Carrusel cuentas** | 2 barras alto **96**, radio **20**, anchos **75%** + **25%**, sobre oscuro |
| **Movimientos (hoja clara)** | **3 filas**, cada una: círculo **44×44** (radio 22) + 2 líneas (ancho **55%** alto **14**, y **35%** alto **11**, gap 8) + barra derecha **82×16**. Sobre claro |
| **Líneas de texto genéricas** | n líneas alto **14**, la última al **60%**, gap **10** |

### 4.2 Transición skeleton → datos **sin layout shift**
Regla de oro: **el skeleton ocupa exactamente la misma caja que el contenido real**.
- Reservar la altura del hero (la caja de 48 del skeleton ≈ la línea de 46sp de la cifra): no dejar
  que la card cambie de alto al resolver.
- Envolver cada bloque en `AnimatedSwitcher(duration: 200ms, transitionBuilder: FadeTransition)`;
  el hijo "loading" y el hijo "loaded" comparten el mismo `SizedBox`/constraints.
- No animar `height`; solo opacidad (fade cruzado). Así la hoja clara no "salta" hacia arriba/abajo.
- Orden de aparición: resolver primero Zona B (hero + cuentas), luego la hoja; nunca reordenar nodos.

### 4.3 Estados del sistema (ya presentes en el Figma — mapean al Cubit)
La pantalla `8:1294` "Estados del Coach y Sistema" define tres tarjetas que son los estados no-felices:
1. **EVALUANDO** (badge turquesa): card "Revisando tu margen con el Coach…" + chip pulsante
   "Analizando…". → estado **Loading** del consejo del coach (skeleton del `CoachAdviceCard`).
2. **DATOS INCOMPLETOS** (badge amarillo): "No tenemos tus compromisos de esta semana" + CTA amarilla
   "Configurar fechas de pago" + link "Continuar sin fechas". → variante **Loaded con aviso**
   (`infoIncomplete = true`).
3. **MODO OFFLINE** (badge coral): "No pudimos sincronizar tu saldo" + nota + botón "Entendido,
   continuar". → estado **Error/Offline** (ver §6).

---

## 5. Formato de moneda (ADICIÓN: centralizar)

El dinero vive en **enteros = centavos** (`CENTS = 100`). Formatear SIEMPRE con un único helper:

```dart
final _cop = NumberFormat.currency(locale: 'es_CO', symbol: r'$', decimalDigits: 0);
String money(int cents) => _cop.format((cents / 100).round()); // $200.000
```
Mostrar con numerales tabulares. Cifras negativas: prefijo `−` (U+2212, no guion) y color accesible.

---

## 6. Arquitectura BLoC / Cubit

### 6.1 `HomeCubit`
Orquesta la carga de la pantalla. Depende de repositorios (equivalentes a `db/repositories/*`):
`AccountsRepository`, `TransactionsRepository`, `FixedIncomesRepository`, `SettingsRepository`,
`CoachRepository`.

**Estados** (`sealed class HomeState` con `Equatable`):

| Estado | Campos | Cuándo |
|---|---|---|
| `HomeInitial` | — | antes de la primera carga |
| `HomeLoading` | — | primera carga; la UI pinta **skeletons** (§4) |
| `HomeLoaded` | `HomeData data`, `bool refreshing`, `bool infoIncomplete` | datos listos; `refreshing` para pull-to-refresh sin volver a skeleton |
| `HomeError` | `String message`, `bool isOffline` | fallo de carga; la UI muestra `ErrorState`/tarjeta offline |

```dart
class HomeData extends Equatable {
  final List<AccountBalance> accounts;
  final List<TransactionRow> recent;        // mostrar .take(8)
  final AccountBalance? primaryAccount;
  final int availableReal;                   // saldo hero (centavos)
  final int total;
  final int fixedPending;                    // compromisos pendientes
  final int fixedMonthly;                    // compromisos del mes
  final int detectedPending;                 // badge de la campana
  final CoachAdvice? advice;
  final UserSettings settings;               // userName, moodValue, moodDate, themeMode
  // ...
}
```

**Métodos públicos:**

| Método | Qué hace | Equivalente React |
|---|---|---|
| `Future<void> load()` | emite `Loading` → carga todo en paralelo → `Loaded`; `catch` → `Error` | `cargar()` |
| `Future<void> refresh()` | recarga manteniendo `Loaded(refreshing:true)` (sin skeleton) | `refresh()` + pull-to-refresh |
| `Future<void> setMood(Mood m)` | persiste ánimo del día (`mood_value` + `mood_date`), emite `Loaded` actualizado | `guardarMood()` |
| `Future<void> setTheme(ThemeMode t)` | persiste preferencia y la propaga | `setTheme()` |
| `Future<void> checkFixedIncomeDue()` | si hay ingreso fijo vencido y no pospuesto (ventana 6h), expone un prompt; al aceptar → navega `fixedIncomes` | `revisarIngresoFijo()` |

Carga en paralelo (como el store): `Future.wait([...])` sobre cuentas, total, movimientos recientes,
compromisos, cuenta principal, consejo del coach, pendientes detectados.

### 6.2 Patrón de UI
`BlocBuilder<HomeCubit, HomeState>` en la pantalla; cada componente recibe su slice. En `Loading`,
los componentes con `loading:true` pintan sus skeletons (§4) **con la misma caja** que en `Loaded`.
`refreshing:true` NO vuelve a skeleton: solo un indicador sutil (el `RefreshIndicator`).

### 6.3 Separación por capas
`presentation (widgets + HomeCubit)` → `domain (modelos, casos de uso)` → `data (repos sobre
sqflite/drift)`. Offline-first: la fuente primaria es la BD local; la red solo sincroniza.

---

## 7. Adiciones recomendadas (fuera del Figma salvo indicación)

Marcadas como **[+]**. Algunas ya aparecen en el Figma de estados y solo se formalizan.

- **[+] Empty states** (ya en código/diseño): carrusel sin cuentas → card "Aún no tienes cuentas
  registradas" + CTA "Agregar cuenta". Lista sin movimientos → "Aún no tienes movimientos" + CTA
  "Registrar movimiento". Conservarlos.
- **[+] Conexión / offline** (presente en Figma `8:1294` card coral): la app es offline-first, así que
  la falta de internet **no** debe bloquear la pantalla (los datos son locales). Mostrar solo un chip
  discreto "Sin conexión — mostrando datos locales" cuando `connectivity_plus` reporte offline, y
  degradar a `HomeError(isOffline:true)` **únicamente** si falla la BD local. Sugiero `ConnectivityCubit`
  independiente que alimenta ese chip, desacoplado de `HomeCubit`.
- **[+] Botón reintentar** (presente): `ErrorState` con CTA "Intentar de nuevo" → `cubit.load()`.
  Título "No pudimos cargar esto", mensaje "Puede ser algo pasajero.", ícono `warning_amber`.
- **[+] Pull-to-refresh:** `RefreshIndicator` en el scroll → `cubit.refresh()` (color `turquoise`).
- **[+] Tooltip aclaratorio:** ícono info 16px junto a "SALDO DISPONIBLE REAL" y a "Compromisos del
  mes". Accesible por **tap** (no solo hover) con `Tooltip(triggerMode: TooltipTriggerMode.tap)` +
  semántica. **Textos definitivos (DECISIÓN):**
  - Saldo disponible → *"Es tu saldo total menos los gastos fijos del mes que aún no pagas. Es lo que
    puedes usar con tranquilidad."*
  - Compromisos del mes → *"Tus gastos fijos del mes: arriendo, servicios, cuotas. '100% cubiertos'
    significa que ya los tienes separados o pagados."*
- **[+] Numerales tabulares** en todo monto (evita saltos de ancho en la columna de dinero).
- **[+] Reduced motion / accesibilidad:** respetar `MediaQuery.disableAnimations`; `Semantics`
  labels en los 3 botones del header y en cada fila de movimiento; objetivo táctil ≥ 48×48.
- **[+] Formato de moneda local** centralizado (§5) en vez de interpolar strings.

---

## 8. Checklist de entrega para Codex

- [ ] `AppColors`, `AppTextStyles`, `AppRadius`, `AppShadows`, `space()` creados desde §2.
- [ ] `PressableScale` (escala 0.95/0.99 + ripple + háptico) y usado en todo tocable (§2.5).
- [ ] 7 widgets de §3 con medidas exactas; `money()` centralizado (§5), numerales tabulares.
- [ ] Skeletons con **cajas idénticas** al contenido real y `AnimatedSwitcher` fade 200ms (§4).
- [ ] `HomeCubit` + `HomeState` (Initial/Loading/Loaded/Error) + `HomeData` + 5 métodos (§6).
- [ ] Estados no-felices del Figma `8:1294` cableados (Evaluando / Datos incompletos / Offline).
- [ ] Adiciones **[+]** de §7 (empty states, retry, pull-to-refresh, offline chip, tooltips, a11y).
- [ ] Contraste verificado: montos y textos amarillos sobre claro usan variantes `*Accessible`.
- [ ] Sin colores hardcodeados; todo desde `AppColors`.

> **Decisiones cerradas** (ya no son dudas):
> (a) Fuente: **Hanken Grotesk**, definitiva (§2.2).
> (b) Carrusel: **máx. 5 tarjetas**, luego tarjeta-resumen "Ver todas (+N)" (§3.3).
> (c) Tooltips: textos definitivos de saldo y compromisos (§7).
>
> Deltas que Codex debe aplicar al borrador de `/app_flutter` (commit db98119):
> fijar la fuente, implementar el tope de 5 del carrusel con la tarjeta-resumen, y poner los textos
> reales en los dos tooltips (hoy el de saldo tiene un placeholder y el de compromisos no existe aún).
