# ZK-PRET HTTP Server - Vercel Deployment Guide

## Quick Deploy Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Add Vercel deployment configuration for HTTP Server"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import this repository  
   - Framework: "Other"
   - Build Command: `npm run vercel-build`
   - Output Directory: `dist`

3. **Environment Variables**
   Copy from `.env.production`:
   - NODE_ENV=production
   - ZK_PRET_HTTP_SERVER_HOST=0.0.0.0
   - CORS_ORIGIN=*
   - (Add other variables as needed)

4. **Test Endpoints**
   - `https://your-http-server.vercel.app/health`
   - `https://your-http-server.vercel.app/api/v1/gleif`

## Architecture

This HTTP Server acts as middleware and can:
- Process ZK-PRET requests
- Handle async jobs
- Provide WebSocket connections
- Integrate with Core Engine

## Notes

- Unified server configuration
- All existing functionality preserved
- Async processing enabled
- Rate limiting configured
