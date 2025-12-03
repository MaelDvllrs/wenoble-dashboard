@echo off
title Serveur de Domaines + ngrok
echo.
echo 🌐 Demarrage du serveur de domaines avec ngrok
echo.

REM Verifier si ngrok est installe
where ngrok >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ngrok n'est pas installe ou pas dans le PATH
    echo.
    echo Pour installer ngrok:
    echo   1. Telecharger depuis https://ngrok.com/download
    echo   2. Ou via chocolatey: choco install ngrok
    echo   3. Ou via npm: npm install -g ngrok
    echo.
    pause
    exit /b 1
)

echo ✅ ngrok detecte
echo.

REM Demarrer le serveur en arriere-plan
echo 🚀 Demarrage du serveur sur port 3003...
start "Serveur de Domaines" cmd /k "npm run dev"

REM Attendre que le serveur demarre
timeout /t 3 /nobreak >nul

REM Demarrer ngrok
echo 🌐 Exposition avec ngrok...
echo.
echo 📝 Notes:
echo   - URL ngrok affichee ci-dessous
echo   - Interface web: http://127.0.0.1:4040
echo   - Ctrl+C pour arreter
echo.

ngrok http 3003

echo.
echo 👋 Tunnel ngrok ferme
pause