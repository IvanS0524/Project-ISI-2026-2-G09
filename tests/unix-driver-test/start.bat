@echo off
setlocal EnableExtensions
title UniX Driver - Cartagena
cd /d "%~dp0"

echo ==============================================
echo   UniX Driver - Cartagena  (escritorio)
echo ==============================================
echo.

REM ---- 1. Node.js ----
where node >nul 2>nul
if errorlevel 1 (
  echo [X] No se encontro Node.js.
  echo     Instala Node.js 18 o superior desde https://nodejs.org
  echo     y vuelve a ejecutar este archivo.
  echo.
  pause
  exit /b 1
)
for /f "delims=" %%v in ('node -v') do set NODEV=%%v
echo [OK] Node.js %NODEV%

REM ---- 2. Archivo .env ----
if not exist ".env" (
  if exist ".env.example" (
    copy /y ".env.example" ".env" >nul
    echo [OK] Se creo .env con los valores de XAMPP ^(root / sin contrasena^).
  ) else (
    echo [X] Falta .env y .env.example
    pause
    exit /b 1
  )
)
if exist ".env" (
  for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
    if /i "%%a"=="PORT" set APPPORT=%%b
    if /i "%%a"=="DB_USER" set DBUSER=%%b
    if /i "%%a"=="DB_NAME" set DBNAME=%%b
    if /i "%%a"=="DB_PORT" set DBPORT=%%b
  )
)
if "%APPPORT%"=="" set APPPORT=3000
if "%DBPORT%"=="" set DBPORT=3306
echo [OK] Puerto de la app: %APPPORT%   ^| MySQL: puerto %DBPORT%

REM ---- 3. Dependencias ----
if not exist "node_modules\express" (
  echo [..] Instalando dependencias ^(npm install^)...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo [X] npm install fallo. Revisa tu conexion a internet.
    pause
    exit /b 1
  )
)
echo [OK] Dependencias listas

REM ---- 4. Aviso de MySQL ----
echo.
echo [i] Comprueba que en el Panel de XAMPP el modulo MySQL esta en verde.
echo [i] Si aun no has creado la base, el servidor la crea sola.
echo     Tambien puedes importar database.sql en http://localhost/phpmyadmin
echo.

REM ---- 5. Abrir el navegador y arrancar el servidor ----
echo [..] Abriendo http://localhost:%APPPORT% ...
start "" "http://localhost:%APPPORT%"
echo [..] Iniciando servidor...  ^(cierra esta ventana para detenerlo^)
echo.
node server.js
set CODIGO=%ERRORLEVEL%
echo.
if not "%CODIGO%"=="0" (
  echo [X] El servidor termino con codigo %CODIGO%.
  echo     Lee los mensajes de arriba: casi siempre es MySQL apagado
  echo     o usuario/contrasena incorrectos en .env
)
echo.
echo Servidor detenido.
pause
