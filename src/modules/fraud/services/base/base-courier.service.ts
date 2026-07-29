// ============================================================
// Base Courier Service
// Shared error handling and interface contract for all couriers.
// SECURITY: services never throw raw upstream strings to the client.
// They translate failures into a typed `errorCode` on DeliveryResult
// (or throw CourierUnavailableError when no partial data is sensible).
// ============================================================

import type { CourierErrorCode, CourierName, DeliveryResult } from '../../../../types/index.js';
import { createModuleLogger } from '../../../../shared/logger/logger.js';

export interface UpstreamContext {
  status?: number;
  context?: string;
}

export abstract class BaseCourierService {
  abstract readonly name: CourierName;

  protected logger = createModuleLogger(this.constructor.name);

  /**
   * Translate a failure into a DeliveryResult with a typed errorCode.
   * Upstream status / raw message stay in logs only.
   */
  protected handleError(error: unknown, ctx: UpstreamContext = {}): DeliveryResult {
    const status = error instanceof UpstreamHttpError ? error.status : ctx.status;
    const message = error instanceof Error ? error.message : String(error);
    const errorCode = classifyError(status, ctx.context);

    this.logger.error(
      { courier: this.name, status, code: errorCode, err: message, context: ctx.context },
      `${this.name} request failed`,
    );

    return {
      success: 0,
      cancel: 0,
      total: 0,
      successRatio: 0,
      errorCode,
    };
  }

  /** Calculate success ratio safely. */
  protected calculateRatio(success: number, total: number): number {
    return total > 0 ? Math.round((success / total) * 100 * 100) / 100 : 0;
  }
}

/** Custom error wrapper that carries the upstream HTTP status. */
export class UpstreamHttpError extends Error {
  public readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'UpstreamHttpError';
    this.status = status;
  }
}

/** Map an upstream status / context to a typed CourierErrorCode. */
export function classifyError(status?: number, context?: string): CourierErrorCode {
  if (status === 401 || status === 403) return 'COURIER_AUTH_FAILED';
  if (status === 408 || status === 504 || context?.toLowerCase().includes('timeout')) {
    return 'COURIER_TIMEOUT';
  }
  if (status === 429 || context?.toLowerCase().includes('rate')) return 'COURIER_RATE_LIMITED';
  if (context === 'Config') return 'COURIER_CONFIG_MISSING';
  return 'COURIER_UNAVAILABLE';
}
