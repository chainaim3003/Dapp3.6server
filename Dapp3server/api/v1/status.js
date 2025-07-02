export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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