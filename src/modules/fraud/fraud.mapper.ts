// ============================================================
// Fraud Module — Mapper
// Transforms raw service results into DTOs
// ============================================================

import type { DeliveryResult, FraudReport, CourierName } from '../../types/index.js';
import type { FraudReportDto, SingleCourierCheckDto, CourierResultDto } from './fraud.dto.js';

/**
 * Map raw service DeliveryResult to API-facing CourierResultDto.
 */
export function toCourierResultDto(courier: CourierName, result: DeliveryResult | null): CourierResultDto {
  if (!result) {
    return {
      courier,
      success: 0,
      cancel: 0,
      total: 0,
      success_ratio: 0,
      error: 'Service unavailable',
    };
  }

  return {
    courier,
    success: result.success,
    cancel: result.cancel,
    total: result.total,
    success_ratio: result.success_ratio,
    ...(result.error ? { error: result.error } : {}),
  };
}

/**
 * Map raw FraudReport from service to FraudReportDto for API response.
 * The shapes are identical — this exists as a deliberate transformation boundary.
 */
export function toFraudReportDto(report: FraudReport): FraudReportDto {
  return {
    steadfast: report.steadfast,
    pathao: report.pathao,
    redx: report.redx,
    paperfly: report.paperfly,
    carrybee: report.carrybee,
    aggregate: report.aggregate,
  };
}

/**
 * Map a single courier check result to its DTO.
 */
export function toSingleCourierCheckDto(
  courier: CourierName,
  phone: string,
  result: DeliveryResult | null,
): SingleCourierCheckDto {
  return {
    courier,
    phone,
    result,
  };
}
