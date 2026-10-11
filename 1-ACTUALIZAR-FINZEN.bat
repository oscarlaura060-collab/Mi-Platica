@echo off
title FinZen - Compilar e instalar
cd /d "%~dp0"
echo.
echo  ====================================================
echo   FinZen  -  Compilar la app e instalarla en el movil
echo  ====================================================
echo.
echo  Antes de empezar, en el celular:
echo    1. Opciones de desarrollador activadas
echo    2. Depuracion por USB encendida
echo    3. Cable de DATOS conectado
echo.
pause
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0compilar-e-instalar.ps1"
echo.
pause
