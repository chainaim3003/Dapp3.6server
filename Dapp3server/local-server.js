// Local Development Server for ZK-PRET - Complete functionality
// Run with: npm run dev or npm run local

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'https://*.vercel.app'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// In-memory job storage (for demo)
const jobs = new Map();

// Create HTTP server and WebSocket server
const server = createServer(app);
const wss = new WebSocketServer({ 
  server,
  cors: {
    origin: ['http://localhost:3000', 'https://*.vercel.app']
  }
});

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  console.log('✅ WebSocket client connected from:', req.headers.origin || 'unknown');
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection_established',
    message: 'WebSocket connected to ZK-PRET server',
    timestamp: new Date().toISOString()
  }));
  
  ws.on('close', () => {
    console.log('🔌 WebSocket client disconnected');
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

// Broadcast job updates to all connected clients
function broadcastJobUpdate(jobData) {
  const message = JSON.stringify({
    type: 'job_update',
    ...jobData
  });
  
  const activeClients = Array.from(wss.clients).filter(client => client.readyState === 1);
  console.log(`📡 Broadcasting job update to ${activeClients.length} clients`);
  
  activeClients.forEach(client => {
    try {
      client.send(message);
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
    }
  });
}

// Health check endpoint
app.get(['/api/health', '/health', '/api/v1/health'], (req, res) => {
  res.json({
    status: 'healthy',
    service: 'zk-pret-http-server',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    mode: 'local-development',
    services: {
      zkPretServer: true,
      asyncJobs: true,
      websockets: true
    },
    websocketClients: wss.clients.size,
    activeJobs: jobs.size
  });
});

// Status endpoint
app.get('/api/v1/status', (req, res) => {
  res.json({
    server: 'zk-pret-http-server',
    version: '1.0.0',
    status: 'online',
    timestamp: new Date().toISOString(),
    services: {
      zkPretServer: true,
      asyncJobs: true,
      websockets: true
    },
    environment: 'local-development',
    activeJobs: jobs.size,
    connectedClients: wss.clients.size,
    serverUptime: process.uptime()
  });
});

// Tools list endpoint
app.get('/api/v1/tools', (req, res) => {
  res.json({
    success: true,
    tools: [
      {
        name: 'get-GLEIF-verification-with-sign',
        description: 'GLEIF Legal Entity verification with ZK proof',
        parameters: ['companyName', 'entityId', 'jurisdiction', 'typeOfNet'],
        category: 'compliance',
        estimatedTime: '2-5 seconds'
      },
      {
        name: 'get-Corporate-Registration-verification-with-sign',
        description: 'Corporate registration verification with ZK proof',
        parameters: ['companyName', 'cin', 'registrationNumber', 'jurisdiction', 'typeOfNet'],
        category: 'compliance',
        estimatedTime: '2-5 seconds'
      },
      {
        name: 'get-EXIM-verification-with-sign',
        description: 'Export-Import license verification with ZK proof',
        parameters: ['companyName', 'licenseNumber', 'tradeType', 'country', 'typeOfNet'],
        category: 'compliance',
        estimatedTime: '2-5 seconds'
      },
      {
        name: 'get-BSDI-compliance-verification',
        description: 'Business Standard Data Integrity verification',
        parameters: ['command', 'dataType', 'filePath', 'typeOfNet'],
        category: 'integrity',
        estimatedTime: '3-7 seconds'
      },
      {
        name: 'get-BPI-compliance-verification',
        description: 'Business Process Integrity verification',
        parameters: ['command', 'processType', 'expectedProcessFile', 'actualProcessFile', 'typeOfNet'],
        category: 'integrity',
        estimatedTime: '3-7 seconds'
      },
      {
        name: 'get-SCF-verification-with-sign',
        description: 'Supply Chain Finance verification with ZK proof',
        parameters: ['companyName', 'supplierName', 'invoiceAmount', 'financingType', 'typeOfNet'],
        category: 'finance',
        estimatedTime: '2-5 seconds'
      },
      {
        name: 'get-Composed-Compliance-verification-with-sign',
        description: 'Composed compliance verification with ZK proof',
        parameters: ['companyName', 'cin', 'typeOfNet'],
        category: 'composed',
        estimatedTime: '5-10 seconds'
      }
    ],
    count: 7,
    mode: 'local-development',
    timestamp: new Date().toISOString()
  });
});

// Synchronous tool execution
app.post('/api/v1/tools/execute', async (req, res) => {
  const { toolName, parameters } = req.body;
  
  console.log('🚀 Executing tool:', toolName);
  console.log('📋 Parameters:', JSON.stringify(parameters, null, 2));
  
  // Simulate realistic processing time based on tool type
  let processingTime;
  if (toolName?.includes('Composed')) {
    processingTime = Math.random() * 3000 + 4000; // 4-7 seconds for composed proofs
  } else if (toolName?.includes('BPI') || toolName?.includes('BSDI')) {
    processingTime = Math.random() * 2000 + 3000; // 3-5 seconds for integrity proofs
  } else {
    processingTime = Math.random() * 2000 + 1500; // 1.5-3.5 seconds for compliance proofs
  }
  
  // Simulate the processing delay
  await new Promise(resolve => setTimeout(resolve, processingTime));
  
  const result = generateDemoZKProofResult(toolName, parameters, processingTime);
  
  console.log('✅ Tool execution completed:', result.result.verdict);
  res.json(result);
});

// Asynchronous job start
app.post('/api/v1/jobs/start', async (req, res) => {
  const { jobId, toolName, parameters } = req.body;
  
  console.log('🎯 Starting async job:', jobId, 'for tool:', toolName);
  
  // Store job
  const job = {
    id: jobId,
    toolName,
    parameters,
    status: 'running',
    startTime: new Date(),
    progress: 0
  };
  
  jobs.set(jobId, job);
  
  // Determine job duration based on tool type
  let totalTime;
  if (toolName?.includes('Composed')) {
    totalTime = Math.random() * 4000 + 6000; // 6-10 seconds
  } else if (toolName?.includes('BPI') || toolName?.includes('BSDI')) {
    totalTime = Math.random() * 3000 + 4000; // 4-7 seconds
  } else {
    totalTime = Math.random() * 2000 + 3000; // 3-5 seconds
  }
  
  const updateInterval = 300; // Update every 300ms for smoother progress
  let currentTime = 0;
  
  const progressInterval = setInterval(() => {
    currentTime += updateInterval;
    const progress = Math.min(Math.round((currentTime / totalTime) * 100), 100);
    
    job.progress = progress;
    
    // Broadcast progress update
    broadcastJobUpdate({
      jobId: jobId,
      status: 'running',
      progress: progress
    });
    
    if (progress >= 100) {
      clearInterval(progressInterval);
      job.status = 'completed';
      job.endTime = new Date();
      job.result = generateDemoZKProofResult(toolName, parameters, totalTime).result;
      
      // Broadcast completion
      broadcastJobUpdate({
        jobId: jobId,
        status: 'completed',
        progress: 100,
        result: job.result
      });
      
      console.log('✅ Async job completed:', jobId);
    }
  }, updateInterval);
  
  res.json({ success: true, jobId, status: 'started', estimatedDuration: `${Math.round(totalTime/1000)} seconds` });
});

// Job status endpoint
app.get('/api/v1/jobs/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(job);
});

// File listing endpoints
app.get('/api/v1/bill-of-lading-files', (req, res) => {
  const demoFiles = [
    'actualBL1-VALID.json',
    'actualBL2-VALID.json',
    'actualBL3-VALID.json',
    'actualBL4-INVALID.json',
    'actualBL5-PENDING.json',
    'expectedBL1-STANDARD.json',
    'expectedBL2-STANDARD.json',
    'expectedBL3-ENHANCED.json',
    'testBL-DEMO.json',
    'sampleBL-INTEGRATION.json'
  ];
  
  console.log('📁 Serving bill of lading files list');
  
  res.json({
    success: true,
    files: demoFiles,
    count: demoFiles.length,
    path: './src/data/scf/BILLOFLADING',
    lastUpdated: new Date().toISOString()
  });
});

// Process files endpoints
app.get('/api/v1/process-files/:processType/:fileType', (req, res) => {
  const { processType, fileType } = req.params;
  
  console.log(`📁 Serving ${fileType} files for ${processType} process`);
  
  const demoFiles = {
    SCF: {
      expected: [
        'ExpectedSCF-Process-Standard.json',
        'ExpectedSCF-Process-Enhanced.json',
        'ExpectedSCF-Process-Complete.json',
        'ExpectedSCF-Process-Minimal.json'
      ],
      actual: [
        'ActualSCF-Process-Test1.json',
        'ActualSCF-Process-Test2.json',
        'ActualSCF-Process-Demo.json',
        'ActualSCF-Process-Integration.json'
      ]
    },
    DVP: {
      expected: [
        'ExpectedDVP-Process-Standard.json',
        'ExpectedDVP-Process-Enhanced.json',
        'ExpectedDVP-Process-Institutional.json'
      ],
      actual: [
        'ActualDVP-Process-Test1.json',
        'ActualDVP-Process-Demo.json',
        'ActualDVP-Process-Live.json'
      ]
    },
    STABLECOIN: {
      expected: [
        'ExpectedStablecoin-Process-Standard.json',
        'ExpectedStablecoin-Process-Enhanced.json',
        'ExpectedStablecoin-Process-Institutional.json'
      ],
      actual: [
        'ActualStablecoin-Process-Test1.json',
        'ActualStablecoin-Process-Demo.json',
        'ActualStablecoin-Process-Live.json'
      ]
    }
  };
  
  const files = demoFiles[processType]?.[fileType] || [];
  
  res.json({
    success: true,
    files: files,
    count: files.length,
    processType: processType,
    fileType: fileType,
    lastUpdated: new Date().toISOString()
  });
});

// Helper function to generate demo ZK proof results
function generateDemoZKProofResult(toolName, parameters, executionTime) {
  const proofId = `proof_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();
  
  // Base result structure
  const baseResult = {
    success: true,
    toolName: toolName,
    executionTime: `${Math.round(executionTime)}ms`,
    timestamp: timestamp,
    mode: 'local-development-simulation'
  };

  // Tool-specific demo results
  switch (toolName) {
    case 'get-GLEIF-verification-with-sign':
      return {
        ...baseResult,
        result: {
          output: `✅ GLEIF verification completed successfully for ${parameters?.companyName || 'Demo Company'}\\n🏢 Entity Status: ACTIVE\\n🌍 Jurisdiction: ${parameters?.jurisdiction || 'Unknown'}\\n🔐 ZK Proof Generated: ${proofId}`,
          status: 'VERIFIED',
          verdict: 'VALID',
          entityVerified: true,
          leiStatus: 'ACTIVE',
          jurisdictionMatch: true,
          zkProofGenerated: true,
          proofId: proofId,
          parameters: parameters
        }
      };

    case 'get-Corporate-Registration-verification-with-sign':
      return {
        ...baseResult,
        result: {
          output: `✅ Corporate registration verified successfully for ${parameters?.companyName || 'Demo Company'}\\n📋 CIN Status: ${parameters?.cin ? 'VERIFIED' : 'N/A'}\\n🏛️ Registration: VALID\\n🔐 ZK Proof Generated: ${proofId}`,
          status: 'VERIFIED',
          verdict: 'VALID',
          registrationValid: true,
          cinVerified: parameters?.cin ? true : false,
          zkProofGenerated: true,
          proofId: proofId,
          parameters: parameters
        }
      };

    case 'get-EXIM-verification-with-sign':
      return {
        ...baseResult,
        result: {
          output: `✅ EXIM license verified successfully for ${parameters?.companyName || 'Demo Company'}\\n🚢 Trade Type: ${parameters?.tradeType || 'EXPORT'}\\n🔐 ZK Proof Generated: ${proofId}`,
          status: 'VERIFIED',
          verdict: 'VALID',
          licenseValid: true,
          tradeAuthority: parameters?.tradeType || 'EXPORT',
          zkProofGenerated: true,
          proofId: proofId,
          parameters: parameters
        }
      };

    case 'get-BSDI-compliance-verification':
      return {
        ...baseResult,
        result: {
          output: `✅ Business Data Integrity verification completed\\n📄 File: ${parameters?.filePath || 'demo file'}\\n📊 Integrity Score: 98.5%\\n🔐 ZK Proof Generated: ${proofId}`,
          status: 'VERIFIED',
          verdict: 'VALID',
          dataIntegrityScore: 98.5,
          merkleRootVerified: true,
          zkProofGenerated: true,
          proofId: proofId,
          parameters: parameters
        }
      };

    case 'get-BPI-compliance-verification':
      return {
        ...baseResult,
        result: {
          output: `✅ Business Process Integrity verified\\n🔄 Process Type: ${parameters?.processType || 'SCF'}\\n📊 Match Score: 96.8%\\n🔐 ZK Proof Generated: ${proofId}`,
          status: 'VERIFIED',
          verdict: 'VALID',
          processMatch: true,
          integrityScore: 96.8,
          expectedVsActual: 'MATCHED',
          zkProofGenerated: true,
          proofId: proofId,
          parameters: parameters
        }
      };

    case 'get-SCF-verification-with-sign':
      return {
        ...baseResult,
        result: {
          output: `✅ SCF verification completed for ${parameters?.companyName || 'Demo Company'}\\n💰 Invoice Amount: $${parameters?.invoiceAmount || 'N/A'}\\n📈 Risk Score: LOW\\n🔐 ZK Proof Generated: ${proofId}`,
          status: 'VERIFIED',
          verdict: 'VALID',
          financingApproved: true,
          riskScore: 'LOW',
          invoiceAmount: parameters?.invoiceAmount || 'N/A',
          zkProofGenerated: true,
          proofId: proofId,
          parameters: parameters
        }
      };

    case 'get-Composed-Compliance-verification-with-sign':
      return {
        ...baseResult,
        result: {
          output: `✅ Composed compliance verification completed\\n🏢 Company: ${parameters?.companyName || 'Demo Company'}\\n📊 Overall Score: 94.2%\\n🔐 ZK Proof Generated: ${proofId}`,
          status: 'VERIFIED',
          verdict: 'VALID',
          overallScore: 94.2,
          componentsVerified: 3,
          totalComponents: 3,
          gleifVerified: true,
          corporateVerified: true,
          eximVerified: true,
          zkProofGenerated: true,
          proofId: proofId,
          parameters: parameters
        }
      };

    default:
      return {
        ...baseResult,
        result: {
          output: `✅ ZK Proof generated successfully for ${toolName}\\n🔐 Proof ID: ${proofId}`,
          status: 'COMPLETED',
          verdict: 'VALID',
          zkProofGenerated: true,
          proofId: proofId,
          parameters: parameters
        }
      };
  }
}

// Start server
server.listen(PORT, () => {
  console.log(`🚀 ZK-PRET HTTP Server running on port ${PORT}`);
  console.log(`📡 WebSocket server enabled`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📊 Status: http://localhost:${PORT}/api/v1/status`);
  console.log(`🛠️  Tools: http://localhost:${PORT}/api/v1/tools`);
  console.log(`⚡ Ready to process ZK proof requests!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { app, server };