// ============================================================
// Health Routes
// ============================================================

import { Hono } from 'hono';
import { healthCheck } from '../controllers/health.controller.js';
import { successResponse } from '../../../shared/response.js';

const healthRoutes = new Hono();

/**
 * GET /health
 * Returns server health status.
 */
healthRoutes.get('/health', (c) => {
  return c.json(successResponse(healthCheck()));
});

export default healthRoutes;
