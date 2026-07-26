// ============================================================
// Consistent API Response Helpers
// Ensures every response follows { success, data/message } shape
// ============================================================

import type { SuccessResponse, ErrorResponse } from '../../types/index.js';

/**
 * Build a success response.
 * Matches PHP package's structural response format.
 */
export function successResponse<T>(data: T): SuccessResponse<T> {
  return { success: true, data };
}

/**
 * Build an error response.
 */
export function errorResponse(message: string, errors?: unknown[]): ErrorResponse {
  const resp: ErrorResponse = { success: false, message };
  if (errors && errors.length > 0) {
    resp.errors = errors;
  }
  return resp;
}
