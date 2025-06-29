@echo off
echo ===============================================
echo Starting ZK-PRET Unified HTTP Server
echo ===============================================
echo.
echo Server: http://localhost:3001
echo Mode: Unified (Sync + Async Support)
echo WebSocket: ws://localhost:3001
echo Tools: All ZK-PRET tools available
echo.
echo Features:
echo   ✅ Sync Execution:  POST /api/v1/tools/execute
echo   ✅ Async Execution: POST /api/v1/tools/execute-async
echo   ✅ Real-time Updates: WebSocket connection
echo   ✅ Job Management: Track async jobs
echo.

npm run http-server

pause
