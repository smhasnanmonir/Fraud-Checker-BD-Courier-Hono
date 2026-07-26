// ============================================================
// App Setup
// Configures Hono with security middleware and mounts all routes
// ============================================================

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { bodyLimit } from 'hono/body-limit';
import { timeout } from 'hono/timeout';
import { rateLimiter } from 'hono-rate-limiter';
import { requestLogger } from './middleware/pino-logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { fraudRoutes } from './modules/fraud/index.js';
import { healthRoutes } from './modules/health/index.js';
import { config } from './config/index.js';

const app = new Hono();

// ── Security Middleware ─────────────────────────────────────
// Order matters: secure headers → CORS → rate limit → body limit → timeout → logging

// 1. Security headers (HSTS, X-Content-Type-Options, X-Frame-Options, CSP, etc.)
app.use('*', secureHeaders());

// 2. CORS — restricted to configured origins (defaults to * for dev; set ALLOWED_ORIGINS in prod)
app.use(
  '*',
  cors({
    origin: [...config.allowedOrigins],
    allowMethods: ['GET'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
    credentials: false,
  }),
);

// 3. Rate limiting — prevents DoS and courier credential abuse
app.use(
  '*',
  rateLimiter({
    windowMs: 60 * 1000, // 1 minute window
    limit: config.rateLimitPerMinute, // configurable via RATE_LIMIT_PER_MINUTE
    standardHeaders: 'draft-6',
    keyGenerator: (c) => {
      // Use client IP, falling back to anonymous
      const forwarded = c.req.header('x-forwarded-for');
      if (forwarded) return forwarded.split(',')[0]!.trim();
      const realIp = c.req.header('x-real-ip');
      return realIp ?? 'anonymous';
    },
    message: { success: false, message: 'Too many requests. Please try again later.' },
  }),
);

// 4. Body size limit — prevents oversized body DoS (100kb default)
app.use(
  '*',
  bodyLimit({
    maxSize: 100 * 1024, // 100kb — this API only uses GET, bodies shouldn't exist
    onError: (c) => c.json({ success: false, message: 'Request body too large' }, 413),
  }),
);

// 5. Request timeout — prevents slow-loris style hangs (30s)
app.use('*', timeout(30_000));

// 6. Request logging
app.use('*', honoLogger());
app.use('*', requestLogger);

// ── Error Handler ───────────────────────────────────────────
app.onError(errorHandler);

// ── Routes ──────────────────────────────────────────────────
app.route('/', fraudRoutes);
app.route('/', healthRoutes);

// ── 404 Fallback (generic — does not reflect user input) ─────
app.notFound((c) => {
  return c.json(
    {
      success: false,
      message: 'Resource not found',
    },
    404,
  );
});

export { app };
