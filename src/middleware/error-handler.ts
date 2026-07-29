// ============================================================
// Global Error Handler
// Maps every thrown error into the canonical wire format:
//   { success: false, error: { code, message, details?, requestId, meta? } }
// Maps AppError status correctly (fixes the previous `as 400` bug),
// converts Zod issues to field-level details, handles Hono's
// HTTPException, and logs unexpected errors with stack trace.
// ============================================================

import { HTTPException } from 'hono/http-exception';
import type { ErrorHandler } from 'hono';
import { ZodError } from 'zod';
import type { ErrorCode } from '../types/index.js';
import { AppError } from '../shared/errors/errors.js';
import { errorResponse, zodIssueToFieldError } from '../shared/response/response.js';
import { getRequestLogger } from '../shared/logger/logger.js';
import type { AppVariables } from '../types/index.js';

const STATUS_PHRASES: Record<number, string> = {
  400: 'Bad request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not found',
  408: 'Request timeout',
  413: 'Payload too large',
  429: 'Too many requests',
  500: 'Internal server error',
  502: 'Bad gateway',
  503: 'Service unavailable',
  504: 'Gateway timeout',
};

export const errorHandler: ErrorHandler<{ Variables: AppVariables }> = (err, c) => {
  const log = getRequestLogger(c);
  const requestId = c.get('requestId');

  // ── 1. Hono HTTPException (thrown by c.json(..., 4xx), timeout, bodyLimit) ──
  if (err instanceof HTTPException) {
    const status = err.status;
    const message = err.message || STATUS_PHRASES[status] || 'Error';
    const retryAfter = status === 429 ? Number(c.res.headers.get('Retry-After')) : undefined;
    const meta = Number.isFinite(retryAfter) ? { retryAfter: retryAfter as number } : undefined;
    return c.json(
      errorResponse(message, {
        code: statusToCode(status),
        requestId,
        ...(meta ? { meta } : {}),
      }),
      status as 400,
    );
  }

  // ── 2. Zod validation ──
  if (err instanceof ZodError) {
    log.warn({ issues: err.issues }, 'Validation failed');
    return c.json(
      errorResponse('Invalid input. Please check your request parameters.', {
        code: 'INVALID_INPUT',
        details: err.issues.map(zodIssueToFieldError),
        requestId,
      }),
      400,
    );
  }

  // ── 3. AppError (typed domain errors) ──
  if (err instanceof AppError) {
    const level = err.statusCode >= 500 ? 'error' : 'warn';
    log[level]({ code: err.code, status: err.statusCode, msg: err.message }, 'Application error');
    return c.json(
      errorResponse(err.message, {
        code: err.code,
        requestId,
        ...(err.details ? { details: err.details } : {}),
        ...(err.meta ? { meta: err.meta } : {}),
      }),
      err.statusCode as 400,
    );
  }

  // ── 4. Anything else — internal error ──
  log.error(
    {
      err: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    },
    'Unexpected error',
  );
  return c.json(
    errorResponse('Internal server error', {
      code: 'INTERNAL_ERROR',
      requestId,
    }),
    500,
  );
};

function statusToCode(status: number): ErrorCode {
  switch (status) {
    case 400:
      return 'INVALID_INPUT';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 408:
    case 504:
      return 'TIMEOUT';
    case 413:
      return 'PAYLOAD_TOO_LARGE';
    case 429:
      return 'RATE_LIMITED';
    case 502:
      return 'UPSTREAM_ERROR';
    default:
      return status >= 500 ? 'INTERNAL_ERROR' : 'INVALID_INPUT';
  }
}
