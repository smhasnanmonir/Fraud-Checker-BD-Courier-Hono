// ============================================================
// App Setup
// Mounts every route under /api/v1 for forward compatibility.
// Order matters: secure headers → CORS → rate limit → body limit → timeout → request-id → logging.
// ============================================================

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { bodyLimit } from 'hono/body-limit';
import { rateLimiter } from 'hono-rate-limiter';
import { requestTimeout } from './middleware/timeout.js';
import { requestLogger } from './middleware/pino-logger.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { errorHandler } from './middleware/error-handler.js';
import { fraudRoutes, fraudSingleRoutes } from './modules/fraud/index.js';
import healthRoutes from './modules/health/routes/health.routes.js';
import { config } from './config/index.js';
import { errorResponse } from './shared/response/response.js';
import type { AppVariables } from './types/index.js';

const app = new Hono<{ Variables: AppVariables }>();

// ── Security Middleware ─────────────────────────────────────

// 1. Security headers
app.use('*', secureHeaders());

// 2. CORS — restricted origins in prod, * in dev
app.use(
  '*',
  cors({
    origin: [...config.allowedOrigins],
    allowMethods: ['GET', 'HEAD', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposeHeaders: ['X-Request-Id', 'ETag', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
    maxAge: 86400,
    credentials: false,
  }),
);

// 3. Rate limiting — sets draft-6 RateLimit-* headers + 429 with Retry-After
app.use(
  '*',
  rateLimiter({
    windowMs: 60 * 1000,
    limit: config.rateLimitPerMinute,
    standardHeaders: 'draft-6',
    keyGenerator: (c) => {
      const forwarded = c.req.header('x-forwarded-for');
      if (forwarded) return forwarded.split(',')[0]!.trim();
      const realIp = c.req.header('x-real-ip');
      return realIp ?? 'anonymous';
    },
    message: {
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please try again later.',
      },
    },
    statusCode: 429,
  }),
);

// 4. Body size limit (tightened — GET-only API; bodies are never expected)
app.use(
  '*',
  bodyLimit({
    maxSize: 4 * 1024, // 4kb
    onError: (c) =>
      c.json(
        errorResponse('Request body too large', {
          code: 'PAYLOAD_TOO_LARGE',
          requestId: c.get('requestId'),
        }),
        413,
      ),
  }),
);

// 5. Request timeout (10s — tighter for user-facing COD checks)
app.use('*', requestTimeout(10_000));

// 6. Request-id + correlation logger (must run early so logs include it)
app.use('*', requestIdMiddleware);

// 7. Standard access log
app.use('*', honoLogger());
app.use('*', requestLogger);

// ── Error Handler ───────────────────────────────────────────
app.onError(errorHandler);

// ── Routes ──────────────────────────────────────────────────
app.route('/api/v1/fraud-reports', fraudRoutes);
app.route('/api/v1/couriers/:courier/fraud-reports', fraudSingleRoutes);
app.route('/api/v1', healthRoutes);

// ── 404 fallback (generic, no path reflection) ──────────────
app.notFound((c) => {
  return c.json(
    errorResponse('Resource not found', {
      code: 'NOT_FOUND',
      requestId: c.get('requestId'),
    }),
    404,
  );
});

export { app };
