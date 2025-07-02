export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({
    status: 'healthy',
    service: 'zk-pret-http-server',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    mode: 'vercel-serverless',
    method: req.method,
    url: req.url,
    coreEngine: {
      url: process.env.ZK_PRET_CORE_ENGINE_URL || 'https://zkpretcore.vercel.app',
      status: 'connected'
    }
  });
}