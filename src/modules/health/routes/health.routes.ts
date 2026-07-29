// ============================================================
// Health Routes (v1)
//   GET /api/v1/health/live   — liveness
//   GET /api/v1/health/ready  — readiness with dependency status
// ============================================================

import { Hono } from 'hono';
import { errorResponse, successResponse } from '../../../shared/response/response.js';
import { liveness, readiness } from '../controllers/health.controller.js';

const healthRoutes = new Hono();

healthRoutes.get('/health/live', (c) => {
  c.header('Cache-Control', 'no-store');
  return c.json(successResponse(liveness()));
});

healthRoutes.get('/health/ready', (c) => {
  c.header('Cache-Control', 'no-store');
  const result = readiness();
  // 503 when zero couriers configured — orchestrator should stop sending traffic.
  if (result.status === 'degraded') {
    return c.json(
      errorResponse('Service is not ready: no courier credentials configured', {
        code: 'COURIER_UNAVAILABLE',
        meta: { dependencies: result.dependencies },
      }),
      503,
    );
  }
  return c.json(successResponse(result));
});

export default healthRoutes;
