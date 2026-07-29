// ============================================================
// Request ID + Correlation Middleware
// Reads X-Request-Id from the client (or generates one), echoes
// it back as a response header, and stores it on c.var so the
// error handler and route handlers can correlate logs.
// ============================================================

import type { MiddlewareHandler } from 'hono';
import { randomUUID } from 'node:crypto';
import type { AppVariables } from '../types/index.js';

const HEADER = 'x-request-id';
const VALID_ID = /^[a-zA-Z0-9._-]{1,128}$/;

export const requestIdMiddleware: MiddlewareHandler<{ Variables: AppVariables }> = async (c, next) => {
  const incoming = c.req.header(HEADER);
  const requestId = incoming && VALID_ID.test(incoming) ? incoming : randomUUID();

  c.set('requestId', requestId);
  c.header('X-Request-Id', requestId);

  await next();
};
