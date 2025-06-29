import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { logger } from './utils/logger.js';
import { zkToolExecutor } from './services/zkToolExecutor.js';
const app = express();
const server = createServer(app);
const ZK_PRET_HTTP_SERVER_PORT = parseInt(process.env.ZK_PRET_HTTP_SERVER_PORT || '3001', 10);
const ZK_PRET_HTTP_SERVER_HOST = process.env.ZK_PRET_HTTP_SERVER_HOST || 'localhost';
// Security middleware
app.use(helmet());
// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'), // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);
// CORS
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));
// Body parsing
app.use(express.json({ limit: process.env.MAX_REQUEST_SIZE || '10mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.MAX_REQUEST_SIZE || '10mb' }));
// Request logging
app.use((req, res, next) => {
    logger.info('HTTP Request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    next();
});
// Health check endpoint
app.get('/api/v1/health', async (req, res) => {
    try {
        const executorHealth = await zkToolExecutor.healthCheck();
        res.json({
            status: executorHealth.connected ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            server: 'zk-pret-http-server',
            version: '1.0.0',
            mode: 'sync',
            services: {
                zkExecutor: executorHealth.connected,
                stdioPath: executorHealth.status?.path
            },
            executorStatus: executorHealth.status
        });
    }
    catch (error) {
        logger.error('Health check failed', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: 'Health check failed'
        });
    }
});
// List available tools
app.get('/api/v1/tools', async (req, res) => {
    try {
        const tools = zkToolExecutor.getAvailableTools();
        res.json({
            success: true,
            tools,
            count: tools.length,
            timestamp: new Date().toISOString(),
            server: 'zk-pret-http-server',
            mode: 'sync'
        });
    }
    catch (error) {
        logger.error('Failed to list tools', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            error: 'Failed to list tools',
            timestamp: new Date().toISOString()
        });
    }
});
// Execute tool (synchronous)
app.post('/api/v1/tools/execute', async (req, res) => {
    const startTime = Date.now();
    try {
        const { toolName, parameters } = req.body;
        if (!toolName) {
            return res.status(400).json({
                success: false,
                error: 'toolName is required',
                timestamp: new Date().toISOString()
            });
        }
        logger.info('Tool execution started', {
            toolName,
            parameters: JSON.stringify(parameters),
            mode: 'sync'
        });
        const result = await zkToolExecutor.executeTool(toolName, parameters || {});
        const totalTime = Date.now() - startTime;
        logger.info('Tool execution completed', {
            toolName,
            success: result.success,
            executionTime: result.executionTime,
            totalTime: `${totalTime}ms`,
            mode: 'sync'
        });
        return res.json({
            success: result.success,
            toolName,
            parameters,
            result: result.result,
            executionTime: result.executionTime,
            totalTime: `${totalTime}ms`,
            timestamp: new Date().toISOString(),
            server: 'zk-pret-http-server',
            mode: 'sync'
        });
    }
    catch (error) {
        const totalTime = Date.now() - startTime;
        logger.error('Tool execution failed', {
            toolName: req.body?.toolName,
            error: error instanceof Error ? error.message : String(error),
            totalTime: `${totalTime}ms`,
            mode: 'sync'
        });
        return res.status(500).json({
            success: false,
            toolName: req.body?.toolName,
            error: error instanceof Error ? error.message : 'Unknown error',
            executionTime: '0ms',
            totalTime: `${totalTime}ms`,
            timestamp: new Date().toISOString(),
            server: 'zk-pret-http-server',
            mode: 'sync'
        });
    }
});
// Execute specific tool endpoints (convenience endpoints)
app.post('/api/v1/tools/gleif', async (req, res) => {
    try {
        const parameters = req.body;
        const result = await zkToolExecutor.executeTool('get-GLEIF-verification-with-sign', parameters);
        res.json({
            success: result.success,
            toolName: 'get-GLEIF-verification-with-sign',
            result: result.result,
            executionTime: result.executionTime,
            timestamp: new Date().toISOString(),
            server: 'zk-pret-http-server',
            mode: 'sync'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});
app.post('/api/v1/tools/corporate', async (req, res) => {
    try {
        const parameters = req.body;
        const result = await zkToolExecutor.executeTool('get-Corporate-Registration-verification-with-sign', parameters);
        res.json({
            success: result.success,
            toolName: 'get-Corporate-Registration-verification-with-sign',
            result: result.result,
            executionTime: result.executionTime,
            timestamp: new Date().toISOString(),
            server: 'zk-pret-http-server',
            mode: 'sync'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});
app.post('/api/v1/tools/exim', async (req, res) => {
    try {
        const parameters = req.body;
        const result = await zkToolExecutor.executeTool('get-EXIM-verification-with-sign', parameters);
        res.json({
            success: result.success,
            toolName: 'get-EXIM-verification-with-sign',
            result: result.result,
            executionTime: result.executionTime,
            timestamp: new Date().toISOString(),
            server: 'zk-pret-http-server',
            mode: 'sync'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});
// Server status endpoint
app.get('/api/v1/status', async (req, res) => {
    try {
        const executorHealth = await zkToolExecutor.healthCheck();
        res.json({
            server: 'zk-pret-http-server',
            version: '1.0.0',
            mode: 'sync',
            status: executorHealth.connected ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            port: ZK_PRET_HTTP_SERVER_PORT,
            host: ZK_PRET_HTTP_SERVER_HOST,
            features: {
                syncExecution: true,
                asyncExecution: false,
                realTimeResults: true,
                batchOperations: false
            },
            executor: {
                connected: executorHealth.connected,
                status: executorHealth.status
            }
        });
    }
    catch (error) {
        res.status(500).json({
            server: 'zk-pret-http-server',
            status: 'error',
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
        });
    }
});
// Error handling middleware
app.use((error, req, res, next) => {
    logger.error('Unhandled error', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method
    });
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
        server: 'zk-pret-http-server'
    });
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
        server: 'zk-pret-http-server'
    });
});
// Start server
const startServer = async () => {
    try {
        // Initialize ZK Tool Executor
        await zkToolExecutor.initialize();
        server.listen(ZK_PRET_HTTP_SERVER_PORT, ZK_PRET_HTTP_SERVER_HOST, () => {
            logger.info(`🚀 ZK-PRET HTTP Server started successfully`);
            logger.info(`📡 Server URL: http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}`);
            logger.info(`🔄 Mode: Synchronous (real-time execution)`);
            logger.info(`⚡ Features: Same tools as STDIO mode but via HTTP API`);
            logger.info(`🎯 Ready to process ZK-PRET tool requests`);
            console.log('\n=== ZK-PRET HTTP SERVER ENDPOINTS ===');
            console.log(`GET  http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/health`);
            console.log(`GET  http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/tools`);
            console.log(`POST http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/tools/execute`);
            console.log(`POST http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/tools/gleif`);
            console.log(`POST http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/tools/corporate`);
            console.log(`POST http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/tools/exim`);
            console.log(`GET  http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/status`);
            console.log('=====================================\n');
        });
    }
    catch (error) {
        logger.error('Failed to start HTTP server:', error);
        process.exit(1);
    }
};
// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });
});
startServer();
//# sourceMappingURL=server.js.map