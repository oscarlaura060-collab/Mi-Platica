# ============================================================
#  FinZen - Compilar e instalar en el celular
#  Uso:  .\compilar-e-instalar.ps1
#        .\compilar-e-instalar.ps1 -SoloInstalar   (no recompila)
#        .\compilar-e-instalar.ps1 -SoloCompilar   (no instala)
# ============================================================
param(
  [switch]$SoloInstalar,
  [switch]$SoloCompilar
)

# OJO: Gradle escribe avisos por stderr y con 'Stop' PowerShell los
# convierte en error terminante, matando el build a mitad de camino.
$ErrorActionPreference = 'Continue'

$fuente  = $PSScriptRoot                 # donde editas el codigo
$trabajo = 'C:\dev\FinZen'               # donde se compila (fuera de OneDrive)
$adb     = 'C:\Android\Sdk\platform-tools\adb.exe'
if (-not (Test-Path $adb)) {
  $adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
}

function Titulo($texto) {
  Write-Host ''
  Write-Host "=== $texto ===" -ForegroundColor Cyan
}

# ------------------------------------------------------------
# 1. COMPILAR
# ------------------------------------------------------------
if (-not $SoloInstalar) {

  Titulo 'Sincronizando el codigo'
  # OneDrive intercepta cada lectura y vuelve el build inviable, por eso
  # se compila en C:\dev\FinZen. Aqui se copia solo el codigo fuente:
  # node_modules, android y tools se quedan como estan.
  if (-not (Test-Path $trabajo)) {
    Write-Host "No existe $trabajo." -ForegroundColor Red
    Write-Host 'Es la copia de trabajo donde se compila. Pide ayuda para recrearla.'
    exit 1
  }
  # OJO: /XD con nombres sueltos excluye TODA carpeta con ese nombre en
  # cualquier nivel, y eso se comia modules\notification-reader\android.
  # Con rutas absolutas se excluye solo la carpeta exacta.
  robocopy $fuente $trabajo /E `
    /XD "$fuente\node_modules" "$fuente\android" "$fuente\.expo" "$fuente\tools" `
    /NFL /NDL /NJH /NJS /NP | Out-Null
  Write-Host 'Codigo sincronizado.' -ForegroundColor Green

  Titulo 'Revisando tipos'
  Push-Location $trabajo
  & npx tsc --noEmit
  $tipos = $LASTEXITCODE
  Pop-Location
  if ($tipos -ne 0) {
    Write-Host ''
    Write-Host 'Hay errores de TypeScript (arriba). No se compila.' -ForegroundColor Red
    exit 1
  }
  Write-Host 'Tipos OK.' -ForegroundColor Green

  Titulo 'Compilando la APK (puede tardar varios minutos)'
  & (Join-Path $trabajo 'build-apk.ps1')
  if ($LASTEXITCODE -ne 0) {
    Write-Host ''
    Write-Host "El build fallo. Revisa el log: $trabajo\build.log" -ForegroundColor Red
    exit 1
  }

  # Deja una copia junto al codigo, para tenerla a mano.
  Copy-Item (Join-Path $trabajo 'MiPlatica.apk') (Join-Path $fuente 'MiPlatica.apk') -Force
}

if ($SoloCompilar) {
  Write-Host ''
  Write-Host "Listo. APK en: $fuente\MiPlatica.apk" -ForegroundColor Green
  exit 0
}

# ------------------------------------------------------------
# 2. INSTALAR
# ------------------------------------------------------------
Titulo 'Instalando en el celular'

$apk = Join-Path $trabajo 'MiPlatica.apk'
if (-not (Test-Path $apk)) { $apk = Join-Path $fuente 'MiPlatica.apk' }
if (-not (Test-Path $apk)) {
  Write-Host 'No encuentro MiPlatica.apk. Corre el script sin -SoloInstalar.' -ForegroundColor Red
  exit 1
}

if (-not (Test-Path $adb)) {
  Write-Host 'No encuentro adb.exe (Android SDK).' -ForegroundColor Red
  exit 1
}

Write-Host 'Conecta el cable y acepta el aviso del telefono si aparece...'
& $adb start-server | Out-Null

$listo = $false
for ($i = 0; $i -lt 45; $i++) {
  $salida = & $adb devices
  if ($salida -match "`tdevice$") { $listo = $true; break }
  if ($salida -match "`tunauthorized$") {
    Write-Host 'El celular aparece NO AUTORIZADO: toca "Permitir" en su pantalla.' -ForegroundColor Yellow
  }
  Start-Sleep -Seconds 2
}

if (-not $listo) {
  Write-Host ''
  Write-Host 'No detecte el celular. Revisa:' -ForegroundColor Red
  Write-Host '  1. Depuracion por USB activada (Opciones de desarrollador)'
  Write-Host '  2. Cable de DATOS, no solo de carga'
  Write-Host '  3. Modo USB en "Transferencia de archivos (MTP)"'
  Write-Host '  4. Acepta el aviso "Permitir depuracion USB" del telefono'
  Write-Host ''
  Write-Host "Alternativa: copia este archivo al celular e instalalo ahi:"
  Write-Host "  $apk"
  exit 1
}

& $adb devices -l
$salida = & $adb install -r $apk 2>&1
$salida | ForEach-Object { Write-Host $_ }

if ($salida -match 'Success') {
  Write-Host ''
  Write-Host 'LISTO. Abre FinZen en el celular.' -ForegroundColor Green
} elseif ($salida -match 'INSTALL_FAILED_UPDATE_INCOMPATIBLE') {
  Write-Host ''
  Write-Host 'La version instalada se firmo con otra clave.' -ForegroundColor Yellow
  Write-Host 'Desinstalala primero (OJO: se borran los datos de la app):'
  Write-Host '  adb uninstall com.finzen.app'
} else {
  Write-Host ''
  Write-Host 'La instalacion fallo. Mira el mensaje de arriba.' -ForegroundColor Red
}
