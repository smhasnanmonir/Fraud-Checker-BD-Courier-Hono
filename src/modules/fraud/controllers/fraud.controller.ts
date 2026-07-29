// ============================================================
// Fraud Controller
// Orchestrates services, builds aggregate stats, surfaces partial
// failures via the meta block so the frontend can distinguish a
// "100% success" reading from "100% from 1 of 5 couriers."
// ============================================================

import type { CourierName, DeliveryResult } from '../../../types/index.js';
import { COURIER_NAMES } from '../../../types/index.js';
import { logger } from '../../../shared/logger/logger.js';
import { CourierUnavailableError } from '../../../shared/errors/errors.js';
import { toFraudReportDto, toSingleCourierCheckDto } from '../mappers/fraud.mapper.js';
import type { FraudReportDto, SingleCourierCheckDto } from '../dtos/fraud.dto.js';
import {
  CarrybeeService,
  PaperflyService,
  PathaoService,
  RedxService,
  SteadfastService,
} from '../services/index.js';

// ── Service Registry ─────────────────────────────────────
const serviceMap: Record<CourierName, () => SteadfastService | PathaoService | RedxService | PaperflyService | CarrybeeService> = {
  steadfast: () => new SteadfastService(),
  pathao: () => new PathaoService(),
  redx: () => new RedxService(),
  paperfly: () => new PaperflyService(),
  carrybee: () => new CarrybeeService(),
};

/** Check fraud stats across a subset (or all) couriers. */
export async function checkCouriers(
  phone: string,
  requested: readonly CourierName[] | undefined,
): Promise<FraudReportDto> {
  const targets = (requested && requested.length > 0 ? requested : COURIER_NAMES) as readonly CourierName[];
  logger.info({ couriers: targets, requested: requested?.length ?? 0 }, 'Starting fraud check');
  const entries = targets.map((name) => ({ name, service: serviceMap[name]() }));

  const settled = await Promise.allSettled(
    entries.map(async ({ name, service }) => ({
      name,
      result: await service.getDeliveryStats(phone),
    })),
  );

  const perCourier: Record<CourierName, DeliveryResult | null> = {
    steadfast: null,
    pathao: null,
    redx: null,
    paperfly: null,
    carrybee: null,
  };
  const failedCouriers: CourierName[] = [];
  let totalSuccess = 0;
  let totalCancel = 0;
  let usable = 0;

  settled.forEach((item, i) => {
    const entry = entries[i];
    if (!entry) return;
    const { name } = entry;
    if (item.status === 'fulfilled') {
      const { result } = item.value;
      perCourier[name] = result;
      if (result.errorCode) {
        failedCouriers.push(name);
      } else {
        totalSuccess += result.success;
        totalCancel += result.cancel;
      }
    } else {
      logger.error({ err: item.reason, courier: name }, 'Courier service threw unexpectedly');
      failedCouriers.push(name);
    }
  });

  const overallTotal = totalSuccess + totalCancel;
  const isPartial = failedCouriers.length > 0;

  // Ratios are only meaningful when every courier succeeded.
  const successRatio = isPartial || overallTotal === 0 ? null : round2((totalSuccess / overallTotal) * 100);
  const cancelRatio = isPartial || overallTotal === 0 ? null : round2((totalCancel / overallTotal) * 100);

  const aggregate: FraudReportDto['aggregate'] = {
    totalSuccess,
    totalCancel,
    totalDeliveries: overallTotal,
    successRatio,
    cancelRatio,
  };
  logger.info(
    { couriers: targets, succeeded: usable, failed: failedCouriers.length, totalDeliveries: overallTotal },
    'Fraud check completed',
  );

  return toFraudReportDto(perCourier, aggregate);
}
/**
 * Check fraud stats for a SINGLE courier. Throws CourierUnavailableError
 * when the courier cannot satisfy the request — routes propagate as 503.
 */
export async function checkSingleCourier(phone: string, courier: CourierName): Promise<SingleCourierCheckDto> {
  logger.info({ courier }, `Starting single-courier fraud check for ${courier}`);
  const factory = serviceMap[courier];
  if (!factory) throw new CourierUnavailableError(courier, `Unknown courier: ${courier}`);

  const result = await factory().getDeliveryStats(phone);

  if (result.errorCode) {
    throw new CourierUnavailableError(courier, `Courier '${courier}' could not satisfy the request`, {
      meta: { errorCode: result.errorCode },
    });
  }

  return toSingleCourierCheckDto(courier, phone, result);
}

/** Convenience for partial-failure response meta. */
export function buildReportMeta(failedCouriers: readonly string[], succeeded: number): {
  partial: boolean;
  succeeded: number;
  failed: number;
  failedCouriers: string[];
  generatedAt: string;
} {
  return {
    partial: failedCouriers.length > 0,
    succeeded,
    failed: failedCouriers.length,
    failedCouriers: [...failedCouriers],
    // Round to seconds so ETag stays stable within the same request burst.
    generatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  };
}


function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
