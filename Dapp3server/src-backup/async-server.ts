import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './utils/logger.js';
import { zkToolExecutor } from './services/zkToolExecutor.js';

// Simple UUID generator for jobs
function generateJobId() {
  return 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

interface Job {
  id: string;
  toolName: string;
  parameters: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  result?: any;
  error?: string;
  progress?: number;
}

class AsyncJobManager {
  private jobs = new Map<string, Job>();
  private wss: WebSocketServer;
  private isAsyncEnabled: boolean;

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.isAsyncEnabled = process.env.ENABLE_ASYNC_JOBS === 'true';
    logger.info(`Async job management ${this.isAsyncEnabled ? 'enabled' : 'disabled'}`);
  }

  async startJob(jobId: string, toolName: string, parameters: any): Promise<Job> {
    const job: Job = {
      id: jobId,
      toolName,
      parameters,
      status: 'pending',
      startTime: new Date()
    };

    this.jobs.set(jobId, job);
    this.broadcastJobUpdate(job);

    // Start processing in background
    this.processJob(job);

    return job;
  }

  private async processJob(job: Job) {
    try {
      job.status = 'running';
      job.progress = 0;
      this.broadcastJobUpdate(job);

      logger.info(`Starting async job ${job.id}: ${job.toolName}`);

      // Initial setup progress
      job.progress = 10;
      this.broadcastJobUpdate(job);

      // Execute the actual tool with real-time progress
      const startTime = Date.now();
      const result = await zkToolExecutor.executeTool(job.toolName, job.parameters);
      const executionTime = Date.now() - startTime;

      job.status = 'completed';
      job.result = {
        ...result,
        executionTimeMs: executionTime,
        jobId: job.id,
        completedAt: new Date().toISOString(),
        mode: 'async-http-server'
      };
      job.endTime = new Date();
      job.progress = 100;

      logger.info(`Async job ${job.id} completed successfully in ${executionTime}ms`);

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.endTime = new Date();

      logger.error(`Async job ${job.id} failed:`, error);
    }

    this.broadcastJobUpdate(job);
  }

  private broadcastJobUpdate(job: Job) {
    const message = JSON.stringify({
      type: 'job_update',
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      result: job.result,
      error: job.error,
      timestamp: new Date().toISOString(),
      server: 'zk-pret-http-server-async'
    });

    this.wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
  }

  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  getAllJobs(): Job[] {
    return Array.from(this.jobs.values());
  }

  getActiveJobs(): Job[] {
    return Array.from(this.jobs.values()).filter(job =>
      job.status === 'pending' || job.status === 'running'
    );
  }

  clearCompletedJobs() {
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.status === 'completed' || job.status === 'failed') {
        this.jobs.delete(jobId);
      }
    }
  }
}

const app = express();
const server = createServer(app);

// WebSocket server setup
const wss = new WebSocketServer({ server });
const jobManager = new AsyncJobManager(wss);

const ZK_PRET_HTTP_SERVER_PORT = parseInt(process.env.ZK_PRET_HTTP_SERVER_PORT || '3001', 10);
const ZK_PRET_HTTP_SERVER_HOST = process.env.ZK_PRET_HTTP_SERVER_HOST || 'localhost';

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
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

// WebSocket connection handling
wss.on('connection', (ws) => {
  logger.info('New WebSocket connection established');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      logger.info('WebSocket message received:', data);
    } catch (error) {
      logger.error('Invalid WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    logger.info('WebSocket connection closed');
  });

  // Send initial connection message
  ws.send(JSON.stringify({
    type: 'connection',
    status: 'connected',
    server: 'zk-pret-http-server-async',
    timestamp: new Date().toISOString()
  }));
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
      mode: 'async',
      services: {
        zkExecutor: executorHealth.connected,
        asyncJobs: process.env.ENABLE_ASYNC_JOBS === 'true',
        websockets: wss.clients.size > 0,
        stdioPath: executorHealth.status?.path
      },
      activeJobs: jobManager.getActiveJobs().length,
      websocketConnections: wss.clients.size,
      executorStatus: executorHealth.status
    });
  } catch (error) {
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
      mode: 'async',
      asyncEnabled: process.env.ENABLE_ASYNC_JOBS === 'true'
    });
  } catch (error) {
    logger.error('Failed to list tools', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      success: false,
      error: 'Failed to list tools',
      timestamp: new Date().toISOString()
    });
  }
});

// Execute tool (synchronous - same as sync server)
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
      mode: 'sync-on-async-server'
    });

    const result = await zkToolExecutor.executeTool(toolName, parameters || {});
    const totalTime = Date.now() - startTime;

    logger.info('Tool execution completed', {
      toolName,
      success: result.success,
      executionTime: result.executionTime,
      totalTime: `${totalTime}ms`,
      mode: 'sync-on-async-server'
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
      mode: 'sync-on-async-server'
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;

    logger.error('Tool execution failed', {
      toolName: req.body?.toolName,
      error: error instanceof Error ? error.message : String(error),
      totalTime: `${totalTime}ms`,
      mode: 'sync-on-async-server'
    });

    return res.status(500).json({
      success: false,
      toolName: req.body?.toolName,
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTime: '0ms',
      totalTime: `${totalTime}ms`,
      timestamp: new Date().toISOString(),
      server: 'zk-pret-http-server',
      mode: 'sync-on-async-server'
    });
  }
});

// Async job management endpoints
app.post('/api/v1/jobs/start', async (req, res) => {
  if (process.env.ENABLE_ASYNC_JOBS !== 'true') {
    return res.status(400).json({
      success: false,
      error: 'Async jobs are disabled',
      message: 'Set ENABLE_ASYNC_JOBS=true to use async execution',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const { jobId, toolName, parameters } = req.body;

    if (!toolName) {
      return res.status(400).json({
        success: false,
        error: 'toolName is required',
        timestamp: new Date().toISOString()
      });
    }

    const actualJobId = jobId || generateJobId();

    const job = await jobManager.startJob(actualJobId, toolName, parameters || {});

    return res.json({
      success: true,
      jobId: job.id,
      status: job.status,
      toolName: job.toolName,
      timestamp: job.startTime.toISOString(),
      message: 'Async job started successfully',
      server: 'zk-pret-http-server',
      mode: 'async'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to start async job',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/jobs/:jobId', (req, res) => {
  const job = jobManager.getJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'Job not found',
      jobId: req.params.jobId,
      timestamp: new Date().toISOString()
    });
  }

  return res.json({
    success: true,
    job,
    timestamp: new Date().toISOString(),
    server: 'zk-pret-http-server',
    mode: 'async'
  });
});

app.get('/api/v1/jobs', (req, res) => {
  const jobs = jobManager.getAllJobs();
  res.json({
    success: true,
    jobs,
    total: jobs.length,
    active: jobManager.getActiveJobs().length,
    timestamp: new Date().toISOString(),
    server: 'zk-pret-http-server',
    mode: 'async'
  });
});

app.delete('/api/v1/jobs/completed', (req, res) => {
  jobManager.clearCompletedJobs();
  res.json({
    success: true,
    message: 'Completed jobs cleared',
    timestamp: new Date().toISOString(),
    server: 'zk-pret-http-server',
    mode: 'async'
  });
});

// Server status endpoint
app.get('/api/v1/status', async (req, res) => {
  try {
    const executorHealth = await zkToolExecutor.healthCheck();

    res.json({
      server: 'zk-pret-http-server',
      version: '1.0.0',
      mode: 'async',
      status: executorHealth.connected ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      port: ZK_PRET_HTTP_SERVER_PORT,
      host: ZK_PRET_HTTP_SERVER_HOST,
      features: {
        syncExecution: true,
        asyncExecution: process.env.ENABLE_ASYNC_JOBS === 'true',
        realTimeResults: true,
        batchOperations: true,
        websockets: true,
        jobManagement: true
      },
      executor: {
        connected: executorHealth.connected,
        status: executorHealth.status
      },
      jobs: {
        total: jobManager.getAllJobs().length,
        active: jobManager.getActiveJobs().length
      },
      websockets: {
        connections: wss.clients.size,
        enabled: true
      }
    });
  } catch (error) {
    res.status(500).json({
      server: 'zk-pret-http-server',
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
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
app.use((req: express.Request, res: express.Response) => {
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
      logger.info(`🚀 ZK-PRET HTTP Server (Async) started successfully`);
      logger.info(`📡 Server URL: http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}`);
      logger.info(`🔄 Mode: Asynchronous (with sync support)`);
      logger.info(`📡 WebSocket URL: ws://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}`);
      logger.info(`⚡ Features: Same tools as STDIO mode but via HTTP API + Async jobs`);
      logger.info(`🎯 Ready to process ZK-PRET tool requests`);

      console.log('\n=== ZK-PRET HTTP SERVER (ASYNC) ENDPOINTS ===');
      console.log(`GET  http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/health`);
      console.log(`GET  http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/tools`);
      console.log(`POST http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/tools/execute`);
      console.log(`POST http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/jobs/start`);
      console.log(`GET  http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/jobs/:jobId`);
      console.log(`GET  http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/jobs`);
      console.log(`DEL  http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/jobs/completed`);
      console.log(`GET  http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/status`);
      console.log(`WS   ws://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT} (real-time job updates)`);
      console.log('=====================================\n');
    });
  } catch (error) {
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