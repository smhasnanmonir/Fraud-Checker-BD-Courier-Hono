// ============================================================
// Fraud Module — Zod Schemas
// Replaces PHP: implicit validation in CourierDataValidator
// All public JSON is camelCase. Phone is normalised server-side.
// ============================================================

import { z } from 'zod';
import { bdMobileSchema } from '../../../shared/validator/validator.js';
import { COURIER_NAME_TUPLE } from '../../../types/index.js';

// ── Request Schemas ──────────────────────────────────────

/** Query string for the unified fraud-report endpoint. */
export const fraudReportQuerySchema = z.object({
  couriers: z
    .string()
    .optional()
    .transform((raw) =>
      raw
        ?.split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean) ?? [],
    )
    .pipe(
      z
        .array(z.enum(COURIER_NAME_TUPLE))
        .max(COURIER_NAME_TUPLE.length)
        .optional(),
    ),
});

/** Path param: phone number. */
export const phoneParamSchema = z.object({
  phone: bdMobileSchema,
});

// ── Response Schemas ─────────────────────────────────────

/** Single courier delivery stats in API form. */
export const courierStatsSchema = z.object({
  success: z.number().int().nonnegative(),
  cancel: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  successRatio: z.number().min(0).max(100),
  /** Machine-readable error code when this courier failed. */
  errorCode: z.string().optional(),
});

/** Aggregate stats across all couriers. Ratios are `null` when data is partial. */
export const aggregateStatsSchema = z.object({
  totalSuccess: z.number().int().nonnegative(),
  totalCancel: z.number().int().nonnegative(),
  totalDeliveries: z.number().int().nonnegative(),
  successRatio: z.number().min(0).max(100).nullable(),
  cancelRatio: z.number().min(0).max(100).nullable(),
});

/** Partial-failure meta surfaced alongside the data. */
export const reportMetaSchema = z.object({
  partial: z.boolean(),
  succeeded: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  failedCouriers: z.array(z.string()),
  generatedAt: z.string(),
});

/** Full fraud report — courier results are keyed by name. */
export const fraudReportSchema = z.object({
  couriers: z.record(z.string(), courierStatsSchema.nullable()),
  aggregate: aggregateStatsSchema,
});

export const singleCourierReportSchema = z.object({
  courier: z.string(),
  phone: z.string(),
  result: courierStatsSchema.nullable(),
  meta: reportMetaSchema,
});

// ── Inferred Types ───────────────────────────────────────

export type FraudReportQuery = z.infer<typeof fraudReportQuerySchema>;
export type PhoneParam = z.infer<typeof phoneParamSchema>;
export type CourierStats = z.infer<typeof courierStatsSchema>;
export type AggregateStatsDto = z.infer<typeof aggregateStatsSchema>;
export type ReportMeta = z.infer<typeof reportMetaSchema>;
export type FraudReport = z.infer<typeof fraudReportSchema>;
export type SingleCourierReport = z.infer<typeof singleCourierReportSchema>;
