import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({
    status: 'healthy',
    service: 'zk-pret-http-server',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    mode: 'vercel-serverless',
    method: req.method,
    url: req.url
  });
}