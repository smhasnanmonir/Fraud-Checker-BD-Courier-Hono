// ============================================================
// Pino Logger Middleware
// Structured request logging: method, path, status, duration
// Replaces PHP: Laravel's default request logging
// ============================================================

import type { MiddlewareHandler } from 'hono';
import { logger } from '../shared/logger.js';

export const requestLogger: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  const method = c.req?.method ?? 'UNKNOWN';
  const path = c.req?.path ?? 'UNKNOWN';

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  logger.info(
    {
      method,
      path,
      status,
      duration: `${duration}ms`,
    },
    `${method} ${path} ${status} ${duration}ms`,
  );
};
