@echo off
echo ========================================
echo Construction de l'installateur
echo Gestion Scolarite
echo ========================================
echo.

echo [1/4] Installation des dependances...
call npm install
if %errorlevel% neq 0 (
    echo ERREUR: Echec de l'installation des dependances
    pause
    exit /b 1
)
echo OK
echo.

echo [2/4] Recompilation des modules natifs (better-sqlite3)...
call npm run rebuild
if %errorlevel% neq 0 (
    echo ERREUR: Echec de la recompilation
    pause
    exit /b 1
)
echo OK
echo.

echo [3/4] Construction du frontend...
call npm run build
if %errorlevel% neq 0 (
    echo ERREUR: Echec de la construction du frontend
    pause
    exit /b 1
)
echo OK
echo.

echo [4/4] Generation de l'installateur Windows...
call npm run electron:build:win
if %errorlevel% neq 0 (
    echo ERREUR: Echec de la generation de l'installateur
    pause
    exit /b 1
)
echo OK
echo.

echo ========================================
echo SUCCES !
echo ========================================
echo.
echo L'installateur a ete genere dans le dossier: dist_electron
echo.
echo Fichiers disponibles:
echo   - Gestion Scolarite Setup x.x.x.exe (Installateur)
echo   - Gestion Scolarite x.x.0.exe (Portable)
echo.
pause
