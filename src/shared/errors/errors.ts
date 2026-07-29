// ============================================================
// Custom Error Classes
// Each carries a machine-readable `code` so the frontend can
// branch on intent without parsing human messages.
// ============================================================

import type { ErrorCode, FieldError } from '../../types/index.js';

interface AppErrorOptions {
  code?: ErrorCode;
  details?: FieldError[];
  meta?: Record<string, unknown>;
  cause?: unknown;
}

/** Base application error. All thrown errors should extend this. */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: ErrorCode;
  public readonly details?: FieldError[];
  public readonly meta?: Record<string, unknown>;

  constructor(message: string, statusCode = 500, options: AppErrorOptions = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = options.code ?? 'INTERNAL_ERROR';
    this.details = options.details;
    this.meta = options.meta;
    if (options.cause !== undefined) {
      // Standard ES2022 cause — surfaces in stack tools but not serialized.
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
    Error.captureStackTrace(this, this.constructor);
  }
}

/** 400 — generic bad request. Use ValidationError when there are field details. */
export class BadRequestError extends AppError {
  constructor(message = 'Bad request', options: AppErrorOptions = {}) {
    super(message, 400, { code: 'INVALID_INPUT', ...options });
  }
}

/** 400 — input failed validation. Carries per-field details. */
export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details: FieldError[] = [], options: AppErrorOptions = {}) {
    super(message, 400, { code: 'INVALID_INPUT', details, ...options });
  }
}

/** 401 — missing or invalid credentials. */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', options: AppErrorOptions = {}) {
    super(message, 401, { code: 'UNAUTHORIZED', ...options });
  }
}

/** 403 — authenticated but not permitted. */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', options: AppErrorOptions = {}) {
    super(message, 403, { code: 'FORBIDDEN', ...options });
  }
}

/** 404 — resource does not exist. */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', options: AppErrorOptions = {}) {
    super(message, 404, { code: 'NOT_FOUND', ...options });
  }
}

/** 408/504 — upstream or request timeout. */
export class TimeoutError extends AppError {
  constructor(message = 'Request timed out', options: AppErrorOptions = {}) {
    super(message, 504, { code: 'TIMEOUT', ...options });
  }
}

/** 413 — payload exceeded limit. */
export class PayloadTooLargeError extends AppError {
  constructor(message = 'Payload too large', options: AppErrorOptions = {}) {
    super(message, 413, { code: 'PAYLOAD_TOO_LARGE', ...options });
  }
}

/** 429 — rate limit hit. Carries retry-after meta when available. */
export class RateLimitedError extends AppError {
  constructor(message = 'Too many requests', options: AppErrorOptions = {}) {
    super(message, 429, { code: 'RATE_LIMITED', ...options });
  }
}

/** 502 — upstream courier API failure. */
export class UpstreamError extends AppError {
  public readonly courier?: string;

  constructor(message: string, options: AppErrorOptions & { courier?: string } = {}) {
    super(message, 502, { code: 'UPSTREAM_ERROR', ...options });
    this.courier = options.courier;
  }
}

/** 503 — a courier service could not satisfy the request. */
export class CourierUnavailableError extends AppError {
  public readonly courier?: string;

  constructor(courier: string, message = 'Courier service unavailable', options: AppErrorOptions = {}) {
    super(message, 503, { code: 'COURIER_UNAVAILABLE', ...options });
    this.courier = courier;
  }
}
