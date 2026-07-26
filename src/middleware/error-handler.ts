// ============================================================
// Global Error Handler Middleware
// Maps all errors to consistent JSON responses
// ============================================================

import type { ErrorHandler } from 'hono';
import { ZodError } from 'zod';
import { AppError } from '../shared/errors/errors.js';
import { errorResponse } from '../shared/response/response.js';
import { logger } from '../shared/logger/logger.js';

export const errorHandler: ErrorHandler = (err, c) => {
  // Zod validation errors → 400 (details logged, not leaked to client)
  if (err instanceof ZodError) {
    logger.warn({ errors: err.errors }, 'Validation error');
    return c.json(errorResponse('Invalid input. Please check your request parameters.'), 400);
  }

  // Custom app errors → use their status code
  if (err instanceof AppError) {
    logger.warn({ error: err.message, statusCode: err.statusCode }, 'Application error');
    return c.json(errorResponse(err.message), err.statusCode as 400);
  }

  // Unexpected errors → 500 (stack trace logged, generic message to client)
  logger.error({ error: err.message, stack: err.stack }, 'Unexpected error');
  return c.json(errorResponse('Internal server error'), 500);
};
