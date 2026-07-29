// ============================================================
// Structured Logger (Pino)
// Root logger with broad PII redaction; module-namespaced children
// for service-layer logging.
//
// INFO/DEBUG logging must NEVER include phone numbers, passwords,
// tokens, or raw upstream error messages. Those values live only
// in ERROR-level logs and only on the server.
// ============================================================

import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  redact: {
    paths: [
      // HTTP headers
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["set-cookie"]',
      'res.headers["set-cookie"]',
      // Common PII fields — both top-level and nested
      'phone',
      '*.phone',
      'phoneNumber',
      '*.phoneNumber',
      'password',
      '*.password',
      'token',
      '*.token',
      'accessToken',
      '*.accessToken',
      'businessId',
      '*.businessId',
      'csrfToken',
      '*.csrfToken',
      'session',
      '*.session',
      'cookies',
      '*.cookies',
      // Upstream response bodies — may leak customer PII
      'data',
      '*.data',
    ],
    censor: '[redacted]',
  },
});

/** Create a module-namespaced child logger. */
export function createModuleLogger(module: string) {
  return logger.child({ module });
}

/** Backwards-compatible per-request logger accessor. */
export function getRequestLogger(_c: unknown) {
  return logger;
}
