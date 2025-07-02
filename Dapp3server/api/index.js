export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Route based on URL path
  const { url } = req;

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
        connected: true
      },
      features: {
        health: true,
        status: true,
        proxy: true,
        cors: true
      }
    });
  }

  if (url === '/api/v1/tools') {
    return res.status(200).json({
      success: true,
      tools: [
        'health-check',
        'proxy-to-core-engine'
      ],
      coreEngineTools: [
        'get-GLEIF-verification-with-sign',
        'get-Corporate-Registration-verification-with-sign',
        'get-EXIM-verification-with-sign'
      ],
      count: 2,
      timestamp: new Date().toISOString(),
      server: 'zk-pret-http-server',
      mode: 'vercel-serverless'
    });
  }

  // Default response
  return res.status(200).json({
    message: 'ZK-PRET HTTP Server',
    service: 'zk-pret-http-server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    mode: 'vercel-serverless',
    method: req.method,
    url: req.url,
    coreEngine: process.env.ZK_PRET_CORE_ENGINE_URL || 'https://zkpretcore.vercel.app',
    endpoints: [
      '/api/health - Health check',
      '/api/v1/status - Server status',
      '/api/v1/tools - Available tools'
    ]
  });
}