# Handoff funcional para Claude

## Alcance

### Actualización visual importante

El paquete `docs/REFERENCIAS_VISUALES_COMPLETAS_MI_PLATICA.md` y `outputs/referencias-completas/` amplían y corrigen el alcance visual aprobado. La navegación principal prevista es **Inicio, Deudas, Ahorro y Análisis**. También deben conservarse como módulos completos Movimientos, Mis cuentas, Agregar cuenta, Configuración, Registro de ingreso/gasto, Coach y Notificaciones. Esta actualización visual no autoriza borrar ni reescribir la lógica financiera ya corregida.

Se corrigieron comportamientos financieros y de navegación puntuales. La lógica existente debe conservarse. Para la interfaz, usa las referencias visuales completas y el prompt maestro actualizado; no reduzcas el producto a Inicio/Movimientos/Ahorro/Perfil ni sustituyas componentes por imágenes. Al continuar, revisa primero este documento, `docs/progress.md`, `docs/REFERENCIAS_VISUALES_COMPLETAS_MI_PLATICA.md` y `outputs/referencias-completas/index.html`.

## Diseño aplicado en esta continuación

- La barra principal ahora es **Inicio, Deudas, Ahorro y Análisis**, como en la lámina aprobada.
- Movimientos y Perfil siguen disponibles como pantallas secundarias; Perfil se abre desde Ajustes.
- Ahorro ahora inicia con una vista general de patrimonio neto, dinero líquido, inversiones y fondo de emergencia, antes de mostrar metas y planes.
- Se conservaron los flujos existentes de edición de movimientos, cuentas, datos bancarios, ingresos fijos, Coach, inversiones, configuración y notificaciones.
- No se lanzó Expo, Metro, emulador ni la aplicación durante estos cambios.

## Archivos principales modificados

- `src/db/repositories/fixedIncomes.ts` y `src/domain/income/receiptPeriods.ts`: periodos de ingresos fijos, consulta de ingresos vencidos y confirmación de recepción sin registros duplicados.
- `src/features/home/HomeScreen.tsx` y `src/features/fixed/FixedIncomesScreen.tsx`: aviso de ingresos fijos pendientes dentro de la app y entrada al proceso existente de organización una vez confirmado.
- `src/notifications/index.ts`, `src/domain/motivation/schedule.ts` y `src/features/settings/SettingsScreen.tsx`: frecuencia de mensajes motivacionales configurable cada 1, 2 o 4 horas, en horario diurno y con cola de 48 horas.
- `src/features/quickadd/AllocateIncomeScreen.tsx`: cuenta principal como valor inicial y opción de posponer la distribución conservando el ingreso.
- `src/domain/accounts/defaultAccount.ts` y `src/features/quickadd/QuickAddScreen.tsx`: resolución de cuenta predeterminada respetando selección explícita y cuentas archivadas.
- `src/db/repositories/debts.ts`, `src/features/debts/DebtFormScreen.tsx`, `src/features/debts/DebtPayScreen.tsx` y `src/domain/debt/payments.ts`: edición de deuda conservando pagos previos y validación de abonos.
- `src/db/repositories/creditCards.ts`, `src/features/cards/CreditCardScreen.tsx` y `src/domain/coach/context.ts`: pagos de tarjeta validados e inclusión de tarjetas en compromisos sin doble conteo.
- `src/db/index.ts`: borrado de datos financieros en orden compatible con las relaciones.
- `tests/functional-fixes.mjs`: verificaciones de reglas funcionales en SQLite en memoria.

## Comportamiento de recordatorios

Los ingresos fijos vencidos se muestran como aviso al abrir Inicio y mientras la app permanece activa; “Después” pospone el aviso temporalmente y el ingreso permanece pendiente. Esta ruta es un recordatorio dentro de la app. No se ha verificado una notificación del sistema con la app cerrada ni el flujo real de permisos del dispositivo; no describir esa capacidad como implementada sin comprobarla.

## Verificaciones ejecutadas

`npm.cmd run typecheck` pasó después de aplicar el rediseño de navegación y la vista general de Ahorro. El chequeo se ejecutó sin iniciar Expo ni el emulador. `scripts/verify-all.mjs`, `scripts/verify-debts-overview.mjs` y `scripts/verify-income-coach.mjs` habían pasado en la verificación anterior, antes de esta modificación.

La prueba funcional incluye: ingreso fijo vencido y confirmación, periodos quincenales sin duplicación, posponer distribución, cuenta principal, edición de deuda con abonos previos, vencimiento y pago parcial/exacto de tarjeta, pago cero/negativo/superior al saldo, borrado financiero y frecuencias motivacionales de 1/2/4 horas sin avisos nocturnos y con horizonte acotado.

No se compiló ni se instaló APK en esta continuación. Las pruebas son automatizadas y no equivalen a validar la experiencia en el teléfono.

## Al continuar

1. **No rediseñes ni reemplaces lo aplicado:** revisa primero la lámina y las pantallas existentes.
2. Ejecuta únicamente el lanzamiento solicitado por el usuario: `npm.cmd start` o el comando equivalente de tu entorno.
3. Si detectas un error durante el lanzamiento, corrige solo errores reproducibles y conserva la navegación Inicio/Deudas/Ahorro/Análisis.
4. Informa por separado cualquier limitación que dependa del dispositivo o de permisos. No afirmes que fue probada en el teléfono si no se hizo.

La carpeta de escritorio no contiene `.git`; antes de depender de un diff o historial de Git, verifica cuál es el checkout/copia que Claude utiliza.
