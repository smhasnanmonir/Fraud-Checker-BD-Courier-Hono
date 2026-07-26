// ============================================================
// Fraud Module — Data Transfer Objects
// Controls what gets exposed in API responses
// ============================================================

import type { DeliveryResult, AggregateStats } from '../../../types/index.js';

/**
 * DTO for a single courier's delivery result.
 * In the PHP version, this is returned directly from each service.
 */
export interface CourierResultDto {
  readonly courier: string;
  readonly success: number;
  readonly cancel: number;
  readonly total: number;
  readonly success_ratio: number;
  readonly error?: string;
}

/**
 * DTO for the full fraud check report.
 * Wraps individual courier results + aggregate stats.
 */
export interface FraudReportDto {
  readonly steadfast: DeliveryResult | null;
  readonly pathao: DeliveryResult | null;
  readonly redx: DeliveryResult | null;
  readonly paperfly: DeliveryResult | null;
  readonly carrybee: DeliveryResult | null;
  readonly aggregate: AggregateStats;
}

/**
 * DTO for a single courier check response.
 */
export interface SingleCourierCheckDto {
  readonly courier: string;
  readonly phone: string;
  readonly result: DeliveryResult | null;
}
