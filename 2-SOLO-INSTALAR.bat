@echo off
title FinZen - Solo instalar
cd /d "%~dp0"
echo.
echo  =================================================
echo   FinZen  -  Instalar la APK ya compilada
echo  =================================================
echo.
echo  No recompila nada: toma el FinZen.apk que ya existe
echo  y lo instala en el celular conectado por USB.
echo.
pause
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0compilar-e-instalar.ps1" -SoloInstalar
echo.
pause
