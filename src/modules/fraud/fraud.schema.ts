// ============================================================
// Fraud Module — Zod Schemas
// Replaces PHP: implicit validation in CourierDataValidator
// ============================================================

import { z } from 'zod';
import { bdMobileSchema } from '../../shared/validator.js';
import { COURIER_NAMES } from '../../types/index.js';

// ── Request Schemas ──────────────────────────────────────

/** Route params: /check/:phone */
export const phoneParamSchema = z.object({
  phone: bdMobileSchema,
});

/** Route params: /check/:phone/:courier */
export const courierParamSchema = z.object({
  phone: bdMobileSchema,
  courier: z.enum(COURIER_NAMES as unknown as [string, ...string[]]),
});

// ── Response Schemas ─────────────────────────────────────

/** Single courier delivery stats */
export const deliveryStatsSchema = z.object({
  success: z.number(),
  cancel: z.number(),
  total: z.number(),
  success_ratio: z.number(),
});

/** Single courier result (may include error) */
export const deliveryResultSchema = z.object({
  success: z.number(),
  cancel: z.number(),
  total: z.number(),
  success_ratio: z.number(),
  error: z.string().optional(),
  status: z.number().optional(),
  message: z.string().optional(),
});

/** Aggregate stats across all couriers */
export const aggregateStatsSchema = z.object({
  total_success: z.number(),
  total_cancel: z.number(),
  total_deliveries: z.number(),
  success_ratio: z.number(),
  cancel_ratio: z.number(),
});

/** Full fraud report */
export const fraudReportSchema = z.object({
  steadfast: deliveryResultSchema.nullable(),
  pathao: deliveryResultSchema.nullable(),
  redx: deliveryResultSchema.nullable(),
  paperfly: deliveryResultSchema.nullable(),
  carrybee: deliveryResultSchema.nullable(),
  aggregate: aggregateStatsSchema,
});

// ── Inferred Types ───────────────────────────────────────

export type PhoneParam = z.infer<typeof phoneParamSchema>;
export type CourierParam = z.infer<typeof courierParamSchema>;
export type DeliveryStatsSchema = z.infer<typeof deliveryStatsSchema>;
export type DeliveryResultSchema = z.infer<typeof deliveryResultSchema>;
export type AggregateStatsSchema = z.infer<typeof aggregateStatsSchema>;
export type FraudReportSchema = z.infer<typeof fraudReportSchema>;
