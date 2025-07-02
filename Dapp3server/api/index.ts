import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Health check endpoint
  if (req.url === '/api/health' || req.url === '/health') {
    return res.status(200).json({
      status: 'healthy',
      service: 'zk-pret-http-server',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      mode: 'vercel-serverless',
      endpoints: [
        '/api/health',
        '/api/v1/tools',
        '/api/v1/status'
      ]
    });
  }

  // Status endpoint
  if (req.url === '/api/v1/status' || req.url === '/status') {
    return res.status(200).json({
      server: 'zk-pret-http-server',
      version: '1.0.0',
      mode: 'vercel-serverless',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      features: {
        health: true,
        status: true,
        proxy: true
      }
    });
  }

  // Tools list endpoint
  if (req.url === '/api/v1/tools') {
    return res.status(200).json({
      success: true,
      tools: [
        'get-GLEIF-verification-with-sign',
        'get-Corporate-Registration-verification-with-sign',
        'get-EXIM-verification-with-sign'
      ],
      count: 3,
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
    endpoints: [
      '/api/health',
      '/api/v1/status',
      '/api/v1/tools'
    ]
  });
}