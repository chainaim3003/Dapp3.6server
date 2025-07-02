export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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