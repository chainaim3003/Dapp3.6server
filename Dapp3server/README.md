# ZK-PRET HTTP Server

A standalone HTTP server that provides API access to ZK-PRET tools. This server executes the exact same tools as your webapp's STDIO mode but exposes them via HTTP endpoints.

## 🚀 Quick Start

### Simple NPM Commands
```bash
# Start unified server (recommended)
npm run http-server

# OR just
npm start

# Development mode with auto-reload
npm run dev
```

### Windows Batch File
```bash
start-unified.bat
```

### Legacy Modes (if needed)
```bash
# Sync-only server
npm run sync-only

# Async-only server  
npm run async-only
```

## 📡 API Endpoints

### Health & Info
- `GET /api/v1/health` - Health check
- `GET /api/v1/tools` - List available tools
- `GET /api/v1/status` - Server status

### Sync Execution (Immediate Results)
- `POST /api/v1/tools/execute` - Execute any tool (sync)
- `POST /api/v1/tools/gleif` - GLEIF verification
- `POST /api/v1/tools/corporate` - Corporate registration
- `POST /api/v1/tools/exim` - EXIM verification

### Async Execution (Background Jobs)
- `POST /api/v1/tools/execute-async` - Start async job
- `GET /api/v1/jobs/:jobId` - Get job status
- `GET /api/v1/jobs` - List all jobs
- `DELETE /api/v1/jobs/completed` - Clear completed jobs
- `WS ws://localhost:3001` - WebSocket for real-time updates

## 🛠️ Available Tools

Same tools as your webapp:
- `get-GLEIF-verification-with-sign`
- `get-Corporate-Registration-verification-with-sign`
- `get-EXIM-verification-with-sign`
- `get-Composed-Compliance-verification-with-sign`
- `get-BSDI-compliance-verification`
- `get-BPI-compliance-verification`
- `get-RiskLiquidityACTUS-Verifier-Test_adv_zk`
- `get-RiskLiquidityACTUS-Verifier-Test_Basel3_Withsign`
- `get-RiskLiquidityBasel3Optim-Merkle-verification-with-sign`
- `get-RiskLiquidityAdvancedOptimMerkle-verification-with-sign`
- `get-StablecoinProofOfReservesRisk-verification-with-sign`
- All composed proof tools

## 📝 Usage Examples

### Health Check
```bash
curl http://localhost:3001/api/v1/health
```

### List Tools
```bash
curl http://localhost:3001/api/v1/tools
```

### Execute GLEIF Verification (Sync)
```bash
curl -X POST http://localhost:3001/api/v1/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "get-GLEIF-verification-with-sign",
    "parameters": {
      "companyName": "Your Company Name"
    }
  }'
```

### Start Async Job
```bash
curl -X POST http://localhost:3001/api/v1/tools/execute-async \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "get-GLEIF-verification-with-sign",
    "parameters": {
      "companyName": "Your Company Name"
    }
  }'
```

### Check Job Status
```bash
curl http://localhost:3001/api/v1/jobs/job_1234567890_abc123
```

## ⚙️ Configuration

Environment variables (`.env`):
- `ZK_PRET_HTTP_SERVER_PORT=3001` - Server port
- `ZK_PRET_STDIO_PATH=C:\path\to\zk-pret-test-v3.5` - ZK-PRET directory
- `ENABLE_ASYNC_JOBS=true` - Enable async features
- `CORS_ORIGIN=http://localhost:3000` - CORS origin

## 🔧 Development

```bash
# Development with auto-reload
npm run dev

# Build
npm run build

# Clean
npm run clean
```

## 🔗 Integration with Frontend

Your webapp can connect to this HTTP server by setting:
```env
ZK_PRET_SERVER_TYPE=http
ZK_PRET_SERVER_URL=http://localhost:3001
```

The webapp will then use HTTP API calls instead of direct STDIO execution.

## 📊 Features

- ✅ **Unified Server** - Both sync and async in one process
- ✅ **Same Execution Logic** - Identical to your webapp's STDIO mode
- ✅ **Sync & Async Support** - Choose execution mode from frontend
- ✅ **WebSocket Updates** - Real-time job progress
- ✅ **Security** - Rate limiting, CORS, helmet
- ✅ **Logging** - Comprehensive request/response logging
- ✅ **Error Handling** - Robust error management
- ✅ **Health Monitoring** - Built-in health checks

## 🚨 Important Notes

1. **ZK-PRET Path**: Update `ZK_PRET_STDIO_PATH` in `.env` to point to your ZK-PRET installation
2. **Port**: Default port is 3001 (configurable)
3. **Same Tools**: Executes exact same scripts as your webapp
4. **No Mocking**: Real backend connections and processes
5. **CORS**: Configured for localhost:3000 (your webapp)