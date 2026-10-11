# Compila la APK de release de FinZen y la copia a la raiz del proyecto.
#   .\build-apk.ps1
# OJO: NO usar $ErrorActionPreference = 'Stop'. Gradle escribe avisos por
# stderr (p.ej. el de NODE_ENV) y PowerShell los convierte en error
# terminante, matando el build a mitad de camino.
$ErrorActionPreference = 'Continue'
$root = $PSScriptRoot

# --- JDK 17 portable ---------------------------------------------------
# El JBR que trae Android Studio es Java 25 y Gradle 8.14 (el que exige
# React Native 0.81) solo soporta hasta Java 24.
$env:JAVA_HOME = Join-Path $root 'tools\jdk17'
if (-not (Test-Path "$env:JAVA_HOME\bin\java.exe")) {
  Write-Host "Falta el JDK 17 en $env:JAVA_HOME" -ForegroundColor Red
  Write-Host 'Descargalo de https://adoptium.net (Temurin 17, Windows x64, .zip) y extraelo ahi.'
  exit 1
}

# --- Android SDK en ruta SIN espacios ----------------------------------
# El linker del NDK falla ("undefined symbol: operator new") cuando la ruta
# del SDK tiene espacios. C:\Android\Sdk es una junction al SDK real, asi
# que no duplica nada en disco.
$real = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
if (-not (Test-Path 'C:\Android\Sdk')) {
  New-Item -ItemType Directory -Force -Path 'C:\Android' | Out-Null
  cmd /c mklink /J C:\Android\Sdk "$real" | Out-Null
}
$env:ANDROID_HOME = 'C:\Android\Sdk'
$env:ANDROID_SDK_ROOT = 'C:\Android\Sdk'
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:PATH"
Set-Content -Path (Join-Path $root 'android\local.properties') -Value 'sdk.dir=C:\\Android\\Sdk' -Encoding ascii

Write-Host "JAVA_HOME    = $env:JAVA_HOME"
Write-Host "ANDROID_HOME = $env:ANDROID_HOME"
Write-Host ''

Set-Location (Join-Path $root 'android')
& .\gradlew.bat assembleRelease 2>&1 | Tee-Object -FilePath (Join-Path $root 'build.log')
if ($LASTEXITCODE -ne 0) {
  Write-Host "`nBUILD FALLO (exit $LASTEXITCODE). Log: $root\build.log" -ForegroundColor Red
  exit $LASTEXITCODE
}

$apk = Join-Path $root 'android\app\build\outputs\apk\release\app-release.apk'
if (Test-Path $apk) {
  $dest = Join-Path $root 'MiPlatica.apk'
  Copy-Item $apk $dest -Force
  $mb = [math]::Round((Get-Item $dest).Length / 1MB, 1)
  Write-Host ''
  Write-Host "LISTO -> $dest  ($mb MB)" -ForegroundColor Green
} else {
  Write-Host "No se encontro la APK en $apk" -ForegroundColor Red
  exit 1
}
