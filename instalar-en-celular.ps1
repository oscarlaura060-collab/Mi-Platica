# Instala FinZen.apk en el celular conectado por USB.
#
#   1. En el celular: Ajustes > Acerca del telefono > toca 7 veces
#      "Numero de compilacion" para activar Opciones de desarrollador.
#   2. Ajustes > Opciones de desarrollador > activa "Depuracion por USB".
#   3. Conecta el cable y acepta el aviso "Permitir depuracion USB" que
#      sale en el celular.
#   4. Ejecuta este script.
$ErrorActionPreference = 'Continue'

$adb = 'C:\Android\Sdk\platform-tools\adb.exe'
if (-not (Test-Path $adb)) { $adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe' }
if (-not (Test-Path $adb)) { Write-Host 'No encuentro adb.exe' -ForegroundColor Red; exit 1 }

$apk = Join-Path $PSScriptRoot 'FinZen.apk'
if (-not (Test-Path $apk)) { Write-Host "No encuentro $apk. Corre primero build-apk.ps1" -ForegroundColor Red; exit 1 }

Write-Host 'Buscando el celular... (conecta el cable y acepta el aviso en pantalla)'
& $adb start-server | Out-Null

$found = $false
for ($i = 0; $i -lt 60; $i++) {
  $lines = & $adb devices
  if ($lines -match "`tdevice$") { $found = $true; break }
  if ($lines -match "`tunauthorized$") {
    Write-Host 'El celular aparece como NO AUTORIZADO. Mira la pantalla del telefono y toca "Permitir".' -ForegroundColor Yellow
  }
  Start-Sleep -Seconds 2
}

if (-not $found) {
  Write-Host ''
  Write-Host 'No detecte ningun celular. Revisa:' -ForegroundColor Red
  Write-Host '  - Depuracion por USB activada en Opciones de desarrollador'
  Write-Host '  - El cable debe ser de DATOS, no solo de carga'
  Write-Host '  - En el celular, modo USB en "Transferencia de archivos (MTP)"'
  Write-Host '  - Acepta el aviso "Permitir depuracion USB" del telefono'
  exit 1
}

& $adb devices -l
Write-Host ''
Write-Host 'Instalando FinZen...' -ForegroundColor Cyan
$out = & $adb install -r $apk 2>&1
$out | ForEach-Object { Write-Host $_ }

if ($out -match 'Success') {
  Write-Host ''
  Write-Host 'LISTO. Busca "FinZen" en el cajon de apps del celular.' -ForegroundColor Green
  & $adb shell monkey -p com.finzen.app -c android.intent.category.LAUNCHER 1 2>&1 | Out-Null
} else {
  Write-Host ''
  Write-Host 'La instalacion fallo. Si dice INSTALL_FAILED_UPDATE_INCOMPATIBLE,' -ForegroundColor Yellow
  Write-Host 'desinstala la version anterior:  adb uninstall com.finzen.app'
}
