// ============================================================
// Fraud Module — Mapper
// Transforms raw service DeliveryResult into the wire DTO.
// SECURITY: never leaks upstream courier strings or HTTP status;
// only the typed `errorCode` is exposed.
// ============================================================

import type { CourierErrorCode, CourierName, DeliveryResult } from '../../../types/index.js';
import type { CourierStatsDto, FraudReportDto, SingleCourierCheckDto } from '../dtos/fraud.dto.js';

/** Default code when a courier returned no data (catch-all). */
const DEFAULT_ERROR_CODE: CourierErrorCode = 'COURIER_UNAVAILABLE';

/** Map raw DeliveryResult to API-facing CourierStatsDto. */
export function toCourierStatsDto(
  _courier: CourierName,
  result: DeliveryResult | null,
): CourierStatsDto {
  if (!result) {
    return {
      success: 0,
      cancel: 0,
      total: 0,
      successRatio: 0,
      errorCode: DEFAULT_ERROR_CODE,
    };
  }
  const dto: CourierStatsDto = {
    success: result.success,
    cancel: result.cancel,
    total: result.total,
    successRatio: result.successRatio,
  };
  if (result.errorCode) dto.errorCode = result.errorCode;
  return dto;
}

/** Map internal fraud report (per-courier map + aggregate) to API DTO. */
export function toFraudReportDto(
  report: Record<CourierName, DeliveryResult | null>,
  aggregate: FraudReportDto['aggregate'],
): FraudReportDto {
  const couriers = {} as Record<CourierName, CourierStatsDto | null>;
  (Object.keys(report) as CourierName[]).forEach((name) => {
    couriers[name] = report[name] ? toCourierStatsDto(name, report[name]) : null;
  });
  return { couriers, aggregate };
}

/** Map a single courier check result to its DTO. */
export function toSingleCourierCheckDto(
  courier: CourierName,
  phone: string,
  result: DeliveryResult | null,
): SingleCourierCheckDto {
  return {
    courier,
    phone,
    result: result ? toCourierStatsDto(courier, result) : null,
  };
}
