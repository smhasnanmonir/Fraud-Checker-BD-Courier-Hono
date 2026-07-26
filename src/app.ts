// ============================================================
// App Setup
// Configures Hono with middleware and mounts all routes
// ============================================================

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { requestLogger } from './middleware/pino-logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { fraudRoutes } from './modules/fraud/index.js';
import { healthRoutes } from './modules/health/index.js';

const app = new Hono();

// ── Global Middleware ────────────────────────────────────
app.use('*', cors());
app.use('*', honoLogger());
app.use('*', requestLogger);
app.onError(errorHandler);

// ── Routes ───────────────────────────────────────────────
app.route('/', fraudRoutes);
app.route('/', healthRoutes);

// ── 404 Fallback ─────────────────────────────────────────
app.notFound((c) => {
  return c.json(
    {
      success: false,
      message: `Route ${c.req.method} ${c.req.path} not found`,
    },
    404,
  );
});

export { app };
