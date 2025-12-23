import { Router } from 'express';

export const healthRouter = Router();

/**
 * GET /api/health
 * Health check endpoint
 */
healthRouter.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'diedrico-backend'
  });
});
