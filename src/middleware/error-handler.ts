// ============================================================
// Global Error Handler Middleware
// Maps all errors to consistent JSON responses
// ============================================================

import type { ErrorHandler } from 'hono';
import { ZodError } from 'zod';
import { AppError } from '../shared/errors.js';
import { errorResponse } from '../shared/response.js';
import { logger } from '../shared/logger.js';

export const errorHandler: ErrorHandler = (err, c) => {
  // Zod validation errors → 400
  if (err instanceof ZodError) {
    logger.warn({ errors: err.errors }, 'Validation error');
    return c.json(errorResponse('Validation failed', err.errors), 400);
  }

  // Custom app errors → use their status code
  if (err instanceof AppError) {
    logger.warn({ error: err.message, statusCode: err.statusCode }, 'Application error');
    return c.json(errorResponse(err.message), err.statusCode as 400);
  }

  // Unexpected errors → 500
  logger.error({ error: err.message, stack: err.stack }, 'Unexpected error');
  return c.json(errorResponse('Internal server error'), 500);
};
