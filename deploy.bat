@echo off
setlocal enabledelayedexpansion

:menu
cls
echo ============================================
echo   SGI Inventario GAP - Menu de Despliegue
echo ============================================
echo.
echo   1. Limpiar y construir frontend
echo   2. Copiar build a public/
echo   3. Deploy a Firebase Hosting
echo   4. Commit y push a GitHub (dev)
echo   5. Pipeline completo (1 + 2 + 3 + 4)
echo   0. Salir
echo.
set /p op="Selecciona una opcion: "

if "%op%"=="0" goto :eof
if "%op%"=="1" goto :build
if "%op%"=="2" goto :copiar
if "%op%"=="3" goto :deploy
if "%op%"=="4" goto :commit
if "%op%"=="5" goto :pipeline
echo Opcion invalida. Presiona cualquier tecla...
pause >nul
goto :menu

:build
echo.
echo [1/1] Limpiando y construyendo frontend...
cd /d "%~dp0frontend"
call quasar clean
if %errorlevel% neq 0 (
    echo ERROR: quasar clean fallo.
    pause
    goto :menu
)
call quasar build
if %errorlevel% neq 0 (
    echo ERROR: quasar build fallo.
    pause
    goto :menu
)
echo Build completado exitosamente.
cd /d "%~dp0"
pause
goto :menu

:copiar
echo.
echo [2/2] Copiando build a public/...
cd /d "%~dp0"
if exist "public\*" (
    echo Limpiando public/...
    del /s /q "public\*" >nul 2>&1
    for /d %%d in ("public\*") do rd /s /q "%%d" >nul 2>&1
)
echo Copiando archivos...
xcopy /e /i /y "frontend\dist\spa\*" "public\" >nul
echo Copia completada.
pause
goto :menu

:deploy
echo.
echo [3/3] Desplegando a Firebase Hosting...
cd /d "%~dp0frontend"
call firebase deploy --only hosting
if %errorlevel% neq 0 (
    echo ERROR: firebase deploy fallo.
    pause
    goto :menu
)
echo Deploy a Firebase completado.
cd /d "%~dp0"
pause
goto :menu

:commit
echo.
for /f %%i in ('powershell -Command "Get-Date -Format yyyy-MM-dd"') do set TODAY=%%i
set /p TAREA="Descripcion de la tarea: "
echo.
echo Commit message:
echo feat: BE y FE funcional al %TODAY% - %TAREA%
echo.
set /p CONFIRM="Confirmar commit? (s/n): "
if /i not "%CONFIRM%"=="s" (
    echo Commit cancelado.
    pause
    goto :menu
)
git add .
git commit -m "feat: BE y FE funcional al %TODAY% - %TAREA%"
if %errorlevel% neq 0 (
    echo ERROR: commit fallo.
    pause
    goto :menu
)
git push origin dev
if %errorlevel% neq 0 (
    echo ERROR: push fallo.
    pause
    goto :menu
)
echo Commit y push completados.
pause
goto :menu

:pipeline
cls
echo ============================================
echo   Ejecutando pipeline completo...
echo ============================================
echo.

echo [1/4] Limpiando y construyendo frontend...
cd /d "%~dp0frontend"
call quasar clean
if %errorlevel% neq 0 (
    echo ERROR: quasar clean fallo. Abortando.
    pause
    goto :menu
)
call quasar build
if %errorlevel% neq 0 (
    echo ERROR: quasar build fallo. Abortando.
    pause
    goto :menu
)
echo Build completado.
cd /d "%~dp0"

echo.
echo [2/4] Copiando build a public/...
if exist "public\*" (
    del /s /q "public\*" >nul 2>&1
    for /d %%d in ("public\*") do rd /s /q "%%d" >nul 2>&1
)
xcopy /e /i /y "frontend\dist\spa\*" "public\" >nul
echo Copia completada.

echo.
echo [3/4] Desplegando a Firebase Hosting...
cd /d "%~dp0frontend"
call firebase deploy --only hosting
if %errorlevel% neq 0 (
    echo ERROR: firebase deploy fallo. Abortando.
    pause
    goto :menu
)
echo Deploy completado.
cd /d "%~dp0"

echo.
echo [4/4] Commit y push a GitHub...
for /f %%i in ('powershell -Command "Get-Date -Format yyyy-MM-dd"') do set TODAY=%%i
set /p TAREA="Descripcion de la tarea: "
git add .
git commit -m "feat: BE y FE funcional al %TODAY% - %TAREA%"
if %errorlevel% neq 0 (
    echo ERROR: commit fallo. Abortando.
    pause
    goto :menu
)
git push origin dev
if %errorlevel% neq 0 (
    echo ERROR: push fallo.
    pause
    goto :menu
)

echo.
echo ============================================
echo   Pipeline completado exitosamente!
echo ============================================
pause
goto :menu
