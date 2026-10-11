@echo off
title FinZen - Solo compilar
cd /d "%~dp0"
echo.
echo  =================================================
echo   FinZen  -  Compilar la APK (sin instalar)
echo  =================================================
echo.
echo  Al terminar deja FinZen.apk en esta misma carpeta.
echo  Puedes pasarlo al celular por WhatsApp, Drive o cable.
echo.
pause
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0compilar-e-instalar.ps1" -SoloCompilar
echo.
pause
