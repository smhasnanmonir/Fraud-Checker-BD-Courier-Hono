// ============================================================
// Timeout Middleware
// Caps request lifetime; throws TimeoutError so the global
// error handler formats the response consistently (504 + our
// canonical error body).
// ============================================================

import type { MiddlewareHandler } from 'hono';
import { TimeoutError } from '../shared/errors/errors.js';

export function requestTimeout(ms: number): MiddlewareHandler {
  return async (_c, next) => {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new TimeoutError(`Request exceeded ${ms}ms`)), ms);
    });
    try {
      await Promise.race([next(), timeout]);
    } finally {
      clearTimeout(timer);
    }
  };
}
