// ============================================================
// Consistent API Response Helpers
// All success/error bodies flow through here so the wire format
// stays identical across modules.
// ============================================================

import type {
  ApiErrorBody,
  ErrorCode,
  ErrorResponse,
  FieldError,
  SuccessResponse,
} from '../../types/index.js';

interface ErrorOptions {
  code: ErrorCode;
  details?: FieldError[];
  requestId?: string;
  meta?: Record<string, unknown>;
}

/** Build a success response. Optionally attach `meta` for partial-failure signal etc. */
export function successResponse<T>(data: T, meta?: Record<string, unknown>): SuccessResponse<T> {
  return meta !== undefined ? { success: true, data, meta } : { success: true, data };
}

/** Build an error response with machine-readable code + optional field details. */
export function errorResponse(message: string, options: ErrorOptions): ErrorResponse {
  const body: ApiErrorBody = {
    code: options.code,
    message,
  };
  if (options.details && options.details.length > 0) body.details = options.details;
  if (options.requestId) body.requestId = options.requestId;
  if (options.meta) body.meta = options.meta;
  return { success: false, error: body };
}

/** Map a Zod issue to a frontend-friendly field error. Path joins with `.`. */
export function zodIssueToFieldError(issue: {
  path: (string | number)[];
  code: string;
  message: string;
}): FieldError {
  return {
    field: issue.path.join('.') || '(root)',
    code: issue.code,
    message: issue.message,
  };
}
