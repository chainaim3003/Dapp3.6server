@echo off
echo ============================================
echo ZK-PRET Server Setup and Startup Script
echo ============================================
echo.

echo Step 1: Installing server dependencies...
cd /d "C:\CHAINAIM3003\mcp-servers\Dapp3.6server\Dapp3server"
call npm install express cors ws

echo.
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to install dependencies!
    echo Please run manually: npm install express cors ws
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully!
echo.

echo Step 2: Starting ZK-PRET HTTP Server on port 3001...
echo 🚀 Server will handle all API requests from the UI
echo 📡 WebSocket support enabled for async jobs
echo.

start "ZK-PRET Server" cmd /k "npm run local"

echo Step 3: Waiting for server to start...
timeout /t 3 /nobreak >nul

echo.
echo ============================================
echo 🎯 SERVER STARTUP COMPLETE!
echo ============================================
echo.
echo ✅ ZK-PRET HTTP Server is running on: http://localhost:3001
echo 📊 Health Check: http://localhost:3001/api/health
echo 🛠️  Available Tools: http://localhost:3001/api/v1/tools
echo.
echo Next Steps:
echo 1. Keep this server running
echo 2. Start your UI application on port 3000
echo 3. The UI should now show "Connected" status
echo.
echo Press any key to view server logs...
pause >nul

echo Opening server logs...
start "Server Logs" cmd /k "echo Server is running in the other window && echo Check the ZK-PRET Server window for logs && echo Press Ctrl+C in that window to stop the server"