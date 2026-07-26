// ============================================================
// Structured Logger (Pino)
// Replaces PHP: Log::error(), Log::info()
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
});

/**
 * Create a child logger with a module prefix.
 * Usage: logger.child({ module: 'steadfast' })
 */
export function createModuleLogger(module: string) {
  return logger.child({ module });
}
