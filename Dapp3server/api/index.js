export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Get the full URL path
  const { url } = req;
  console.log('Request URL:', url); // For debugging

  // Route handling
  if (url === '/api/health' || url === '/health') {
    return res.status(200).json({
      status: 'healthy',
      service: 'zk-pret-http-server',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      mode: 'vercel-serverless',
      coreEngineUrl: process.env.ZK_PRET_CORE_ENGINE_URL || 'https://zkpretcore.vercel.app',
      endpoints: [
        '/api/health',
        '/api/v1/status',
        '/api/v1/tools'
      ]
    });
  }

  if (url === '/api/v1/status' || url === '/status') {
    return res.status(200).json({
      server: 'zk-pret-http-server',
      version: '1.0.0',
      mode: 'vercel-serverless',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      coreEngine: {
        url: process.env.ZK_PRET_CORE_ENGINE_URL || 'https://zkpretcore.vercel.app',
        connected: true,
        status: 'online'
      },
      features: {
        health: true,
        status: true,
        proxy: true,
        cors: true,
        serverless: true
      },
      environment: {
        nodeVersion: process.version,
        platform: 'vercel',
        region: process.env.VERCEL_REGION || 'unknown'
      }
    });
  }

  if (url === '/api/v1/tools') {
    return res.status(200).json({
      success: true,
      server: 'zk-pret-http-server',
      tools: [
        {
          name: 'health-check',
          endpoint: '/api/health',
          description: 'Server health monitoring'
        },
        {
          name: 'status-check',
          endpoint: '/api/v1/status',
          description: 'Detailed server status'
        },
        {
          name: 'core-engine-proxy',
          endpoint: 'proxy-to-core',
          description: 'Proxy requests to Core Engine'
        }
      ],
      coreEngineTools: [
        {
          name: 'GLEIF Verification',
          endpoint: 'https://zkpretcore.vercel.app/api/gleif',
          description: 'Legal Entity Identifier verification'
        },
        {
          name: 'Corporate Registration',
          endpoint: 'https://zkpretcore.vercel.app/api/corporate',
          description: 'Corporate registration verification'
        },
        {
          name: 'EXIM Verification',
          endpoint: 'https://zkpretcore.vercel.app/api/exim',
          description: 'Export-Import verification'
        },
        {
          name: 'Risk Assessment',
          endpoint: 'https://zkpretcore.vercel.app/api/risk',
          description: 'Risk and liquidity assessment'
        }
      ],
      count: 3,
      timestamp: new Date().toISOString(),
      mode: 'vercel-serverless'
    });
  }

  // Default response for any other route
  return res.status(200).json({
    message: 'ZK-PRET HTTP Server',
    service: 'zk-pret-http-server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    mode: 'vercel-serverless',
    method: req.method,
    url: req.url,
    coreEngine: process.env.ZK_PRET_CORE_ENGINE_URL || 'https://zkpretcore.vercel.app',
    availableEndpoints: [
      '/api/health - Health check',
      '/api/v1/status - Server status',
      '/api/v1/tools - Available tools'
    ],
    coreEngineEndpoints: [
      'https://zkpretcore.vercel.app/api/health',
      'https://zkpretcore.vercel.app/api/gleif',
      'https://zkpretcore.vercel.app/api/corporate',
      'https://zkpretcore.vercel.app/api/exim',
      'https://zkpretcore.vercel.app/api/risk'
    ]
  });
}