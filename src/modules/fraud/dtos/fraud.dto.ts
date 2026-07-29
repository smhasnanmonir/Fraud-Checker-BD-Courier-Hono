import type { CourierErrorCode, CourierName } from '../../../types/index.js';

/** DTO for a single courier's delivery result (wire shape). */
export interface CourierStatsDto {
  success: number;
  cancel: number;
  total: number;
  successRatio: number;
  errorCode?: CourierErrorCode;
}

/** Full fraud report — courier results keyed by name. */
export interface FraudReportDto {
  couriers: Record<CourierName, CourierStatsDto | null>;
  aggregate: {
    totalSuccess: number;
    totalCancel: number;
    totalDeliveries: number;
    successRatio: number | null;
    cancelRatio: number | null;
  };
}

/** DTO for the single-courier check response. */
export interface SingleCourierCheckDto {
  courier: CourierName;
  phone: string;
  result: CourierStatsDto | null;
}
