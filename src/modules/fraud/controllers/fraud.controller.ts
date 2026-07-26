// ============================================================
// Fraud Controller
// Thin controller — only reads validated data, calls services, returns response
// Replaces PHP: FraudCheckerBdCourierManager::check()
// ============================================================

import type { FraudReport, DeliveryResult } from '../../../types/index.js';
import { COURIER_NAMES as ALL_COURIERS, type CourierName } from '../../../types/index.js';
import { logger } from '../../../shared/logger.js';
import { toFraudReportDto, toSingleCourierCheckDto } from '../fraud.mapper.js';
import type { FraudReportDto, SingleCourierCheckDto } from '../fraud.dto.js';
import { CarrybeeService, PaperflyService, PathaoService, RedxService, SteadfastService } from '../services/index.js';

// ── Service Registry ─────────────────────────────────────
const serviceMap = {
  steadfast: () => new SteadfastService(),
  pathao: () => new PathaoService(),
  redx: () => new RedxService(),
  paperfly: () => new PaperflyService(),
  carrybee: () => new CarrybeeService(),
} as const;

// ── Controller Functions ─────────────────────────────────

/**
 * Check fraud stats across ALL couriers for a phone number.
 * Uses Promise.allSettled for parallel execution (improvement over PHP sequential).
 *
 * PHP equivalent: FraudCheckerBdCourierManager::check($phoneNumber)
 */
export async function checkAllCouriers(phone: string): Promise<FraudReportDto> {
  logger.info({ phone }, 'Starting fraud check across all couriers');

  const entries = ALL_COURIERS.map((name) => [name, serviceMap[name]()] as const);

  const results = await Promise.allSettled(
    entries.map(async ([name, service]) => {
      const result = await service.getDeliveryStats(phone);
      return { name, result };
    }),
  );

  // Build the report (matches PHP FraudCheckerBdCourierManager structure)
  const report: FraudReport = {
    steadfast: null,
    pathao: null,
    redx: null,
    paperfly: null,
    carrybee: null,
    aggregate: {
      total_success: 0,
      total_cancel: 0,
      total_deliveries: 0,
      success_ratio: 0,
      cancel_ratio: 0,
    },
  };

  let totalSuccess = 0;
  let totalCancel = 0;

  for (const settled of results) {
    if (settled.status === 'fulfilled') {
      const { name, result } = settled.value;
      report[name] = result;

      // Aggregate stats (matches PHP: if isset($stats['success'], $stats['cancel']))
      if (
        result &&
        typeof result.success === 'number' &&
        typeof result.cancel === 'number' &&
        !result.error
      ) {
        totalSuccess += result.success;
        totalCancel += result.cancel;
      }
    } else {
      logger.error({ error: settled.reason }, 'Courier service failed unexpectedly');
    }
  }

  // Calculate aggregate ratios (matches PHP exactly)
  const overallTotal = totalSuccess + totalCancel;
  report.aggregate.total_success = totalSuccess;
  report.aggregate.total_cancel = totalCancel;
  report.aggregate.total_deliveries = overallTotal;

  if (overallTotal > 0) {
    report.aggregate.success_ratio = Math.round((totalSuccess / overallTotal) * 100 * 100) / 100;
    report.aggregate.cancel_ratio = Math.round((totalCancel / overallTotal) * 100 * 100) / 100;
  }

  logger.info(
    {
      phone,
      total_deliveries: overallTotal,
      success_ratio: report.aggregate.success_ratio,
    },
    'Fraud check completed',
  );

  return toFraudReportDto(report);
}

/**
 * Check fraud stats for a SINGLE courier.
 *
 * PHP equivalent: instantiating a single service and calling getDeliveryStats()
 */
export async function checkSingleCourier(
  phone: string,
  courier: CourierName,
): Promise<SingleCourierCheckDto> {
  logger.info({ phone, courier }, `Starting fraud check for ${courier}`);

  const serviceFactory = serviceMap[courier];
  if (!serviceFactory) {
    throw new Error(`Unknown courier: ${courier}`);
  }

  const service = serviceFactory();
  const result: DeliveryResult | null = await service.getDeliveryStats(phone);

  logger.info({ phone, courier, result }, `Fraud check completed for ${courier}`);

  return toSingleCourierCheckDto(courier, phone, result);
}
