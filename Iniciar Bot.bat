@echo off
title Lanzador de Bot Wave Barber Shop (Portable)
echo Iniciando Bot desde dispositivo portable...
echo.

:: Navegar a la carpeta server usando la ruta donde está guardado este .bat
cd /d "%~dp0server"

:: Ejecutar el servidor del bot
npm run dev

pause
