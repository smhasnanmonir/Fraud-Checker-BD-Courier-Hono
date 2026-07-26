// ============================================================
// Base Courier Service
// Shared error handling and interface contract for all couriers
// ============================================================

import type { DeliveryResult, CourierName } from '../../../../types/index.js';
import { createModuleLogger } from '../../../../shared/logger/logger.js';

/**
 * Abstract base class for all courier services.
 * Implements common error handling pattern.
 * Replaces PHP: CourierServiceInterface contract
 */
export abstract class BaseCourierService {
  abstract readonly name: CourierName;

  protected logger = createModuleLogger(this.constructor.name);

  /**
   * Standard error handler for all courier services.
   * Logs the full error server-side; returns a generic error message
   * in the DeliveryResult to avoid leaking upstream API details.
   */
  protected handleError(context: string, error: unknown): DeliveryResult {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error({ context, error: message }, `${context} failed`);
    return {
      success: 0,
      cancel: 0,
      total: 0,
      success_ratio: 0,
      // SECURITY: generic message — upstream details stay in logs only
      error: 'Courier service unavailable',
    };
  }

  /**
   * Calculate success ratio safely.
   */
  protected calculateRatio(success: number, total: number): number {
    return total > 0 ? Math.round((success / total) * 100 * 100) / 100 : 0;
  }
}
