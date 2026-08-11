@echo off
REM ============================================================
REM  Distribuir Cocina en monitores - Lanzador Chrome Kiosk
REM  Lanza Chrome en modo kiosk (pantalla completa real) para
REM  cada monitor pasivo (2-8), apuntando a la App Cocina.
REM
REM  USO:
REM   1. Editar SERVIDOR y PUERTO_APP abajo segun tu red.
REM   2. Editar COCINERO_IDS con los IDs de cada cocinero
REM      (separados por espacio, en orden monitor 2..8).
REM      Dejar vacio ("") los monitores que no se usen.
REM   3. Ejecutar este .bat desde la PC de cocina (con los 8 monitores).
REM
REM  Nota: Chrome --kiosk abre fullscreen real sin barra de tareas.
REM  Para cerrar una ventana kiosk: Alt+F4.
REM ============================================================

set SERVIDOR=192.168.50.155
set PUERTO_APP=3001

REM IDs de cocinero por monitor (orden 2..8). Vacio = no abrir.
set COCINERO_2=
set COCINERO_3=
set COCINERO_4=
set COCINERO_5=
set COCINERO_6=
set COCINERO_7=
set COCINERO_8=

set BASE=http://%SERVIDOR%:%PUERTO_APP%

REM Buscar Chrome o Edge
set CHROME=
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" set "CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe"
if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" set "CHROME=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" set "CHROME=C:\Program Files\Microsoft\Edge\Application\msedge.exe"

if "%CHROME%"=="" (
  echo.
  echo [ERROR] No se encontro Chrome o Edge en esta PC.
  echo Instala Chrome o edita la ruta CHROME en este .bat.
  echo.
  pause
  exit /b 1
)

echo.
echo Cerrando ventanas kiosk previas...
taskkill /F /IM chrome.exe /FI "WINDOWTITLE eq cocina-monitor-*" >nul 2>&1

echo.
echo Abriendo monitores en modo kiosk...
echo.

if not "%COCINERO_2%"=="" (
  echo Abriendo Monitor 2 - Cocinero: %COCINERO_2%
  start "cocina-monitor-2" "%CHROME%" --kiosk --new-window "%BASE%/?monitor=2&cocineroId=%COCINERO_2%&modo=completo-fijo"
)

if not "%COCINERO_3%"=="" (
  echo Abriendo Monitor 3 - Cocinero: %COCINERO_3%
  start "cocina-monitor-3" "%CHROME%" --kiosk --new-window "%BASE%/?monitor=3&cocineroId=%COCINERO_3%&modo=completo-fijo"
)

if not "%COCINERO_4%"=="" (
  echo Abriendo Monitor 4 - Cocinero: %COCINERO_4%
  start "cocina-monitor-4" "%CHROME%" --kiosk --new-window "%BASE%/?monitor=4&cocineroId=%COCINERO_4%&modo=completo-fijo"
)

if not "%COCINERO_5%"=="" (
  echo Abriendo Monitor 5 - Cocinero: %COCINERO_5%
  start "cocina-monitor-5" "%CHROME%" --kiosk --new-window "%BASE%/?monitor=5&cocineroId=%COCINERO_5%&modo=completo-fijo"
)

if not "%COCINERO_6%"=="" (
  echo Abriendo Monitor 6 - Cocinero: %COCINERO_6%
  start "cocina-monitor-6" "%CHROME%" --kiosk --new-window "%BASE%/?monitor=6&cocineroId=%COCINERO_6%&modo=completo-fijo"
)

if not "%COCINERO_7%"=="" (
  echo Abriendo Monitor 7 - Cocinero: %COCINERO_7%
  start "cocina-monitor-7" "%CHROME%" --kiosk --new-window "%BASE%/?monitor=7&cocineroId=%COCINERO_7%&modo=completo-fijo"
)

if not "%COCINERO_8%"=="" (
  echo Abriendo Monitor 8 - Cocinero: %COCINERO_8%
  start "cocina-monitor-8" "%CHROME%" --kiosk --new-window "%BASE%/?monitor=8&cocineroId=%COCINERO_8%&modo=completo-fijo"
)

echo.
echo Listo. Monitores abiertos en modo kiosk.
echo Para cerrar una ventana: Alt+F4
echo.
pause
