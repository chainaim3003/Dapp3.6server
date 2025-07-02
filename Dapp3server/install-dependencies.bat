@echo off
echo ============================================
echo ZK-PRET Quick Fix - Install Missing Dependencies
echo ============================================
echo.

echo Installing server dependencies...
cd /d "C:\CHAINAIM3003\mcp-servers\Dapp3.6server\Dapp3server"
echo Current directory: %CD%

if not exist "package.json" (
    echo ❌ Error: package.json not found!
    echo Please make sure you're in the correct directory.
    pause
    exit /b 1
)

echo Installing: express cors ws
call npm install express cors ws

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Installation failed! Trying alternative method...
    echo.
    call npm install --save express@4.18.2 cors@2.8.5 ws@8.18.2
)

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Dependencies installed successfully!
    echo.
    echo Testing server startup...
    timeout /t 2 /nobreak >nul
    echo.
    echo Ready to start! Run this command to start the server:
    echo npm run local
    echo.
    echo Or double-click: start-server.bat
) else (
    echo.
    echo ❌ Installation still failed!
    echo.
    echo Manual installation steps:
    echo 1. Open Command Prompt as Administrator
    echo 2. cd "C:\CHAINAIM3003\mcp-servers\Dapp3.6server\Dapp3server"
    echo 3. npm install express cors ws
    echo.
)

echo.
pause