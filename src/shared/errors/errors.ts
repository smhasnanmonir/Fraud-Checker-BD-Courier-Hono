// ============================================================
// Custom Error Classes
// Replaces PHP: InvalidArgumentException, generic Exception handling
// ============================================================

/** Base application error */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/** 400 — Validation / bad input */
export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400);
  }
}

/** 404 — Resource not found */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

/** 422 — Invalid phone number format */
export class ValidationError extends AppError {
  public readonly errors: unknown[];

  constructor(message = 'Validation failed', errors: unknown[] = []) {
    super(message, 422);
    this.errors = errors;
  }
}

/** 502 — Upstream courier API failure */
export class UpstreamError extends AppError {
  public readonly courier: string;
  public readonly upstreamStatus?: number;

  constructor(courier: string, message: string, upstreamStatus?: number) {
    super(`[${courier}] ${message}`, 502);
    this.courier = courier;
    this.upstreamStatus = upstreamStatus;
  }
}
