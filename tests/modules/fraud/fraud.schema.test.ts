// ============================================================
// Fraud Schema Tests
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  courierStatsSchema,
  fraudReportQuerySchema,
  fraudReportSchema,
  phoneParamSchema,
  reportMetaSchema,
  singleCourierReportSchema,
} from '../../../src/modules/fraud/schemas/fraud.schema.js';

describe('phoneParamSchema', () => {
  it('should accept valid phone', () => {
    const result = phoneParamSchema.parse({ phone: '01712345678' });
    expect(result.phone).toBe('01712345678');
  });

  it('should reject invalid phone', () => {
    expect(() => phoneParamSchema.parse({ phone: 'invalid' })).toThrow();
  });
});

describe('fraudReportQuerySchema', () => {
  it('should accept missing couriers (defaults to empty array)', () => {
    const result = fraudReportQuerySchema.parse({});
    expect(result.couriers ?? []).toEqual([]);
  });

  it('should parse comma-separated courier names', () => {
    const result = fraudReportQuerySchema.parse({ couriers: 'pathao,redx' });
    expect(result.couriers).toEqual(['pathao', 'redx']);
  });

  it('should reject unknown courier', () => {
    expect(() => fraudReportQuerySchema.parse({ couriers: 'unknown' })).toThrow();
  });
});

describe('courierStatsSchema', () => {
  it('should accept valid courier stats', () => {
    const ok = courierStatsSchema.parse({
      success: 5,
      cancel: 2,
      total: 7,
      successRatio: 71.43,
    });
    expect(ok.success).toBe(5);
  });

  it('should accept errorCode', () => {
    const ok = courierStatsSchema.parse({
      success: 0,
      cancel: 0,
      total: 0,
      successRatio: 0,
      errorCode: 'COURIER_UNAVAILABLE',
    });
    expect(ok.errorCode).toBe('COURIER_UNAVAILABLE');
  });
});

describe('reportMetaSchema', () => {
  it('should accept a valid meta', () => {
    const ok = reportMetaSchema.parse({
      partial: false,
      succeeded: 5,
      failed: 0,
      failedCouriers: [],
      generatedAt: new Date().toISOString(),
    });
    expect(ok.succeeded).toBe(5);
  });
});

describe('fraudReportSchema', () => {
  it('should accept a valid fraud report with all couriers', () => {
    const report = {
      couriers: {
        steadfast: { success: 3, cancel: 1, total: 4, successRatio: 75 },
        pathao: { success: 5, cancel: 2, total: 7, successRatio: 71.43 },
        redx: { success: 20, cancel: 5, total: 25, successRatio: 80 },
        paperfly: null,
        carrybee: { success: 10, cancel: 0, total: 10, successRatio: 100 },
      },
      aggregate: {
        totalSuccess: 38,
        totalCancel: 8,
        totalDeliveries: 47,
        successRatio: 80.85,
        cancelRatio: 17.02,
      },
    };
    expect(() => fraudReportSchema.parse(report)).not.toThrow();
  });

  it('should accept aggregate with null ratios (partial data)', () => {
    const report = {
      couriers: {
        steadfast: null,
        pathao: null,
        redx: null,
        paperfly: null,
        carrybee: null,
      },
      aggregate: {
        totalSuccess: 0,
        totalCancel: 0,
        totalDeliveries: 0,
        successRatio: null,
        cancelRatio: null,
      },
    };
    expect(() => fraudReportSchema.parse(report)).not.toThrow();
  });

  it('should accept a courier with errorCode', () => {
    const report = {
      couriers: {
        steadfast: {
          success: 0,
          cancel: 0,
          total: 0,
          successRatio: 0,
          errorCode: 'COURIER_AUTH_FAILED',
        },
        pathao: null,
        redx: null,
        paperfly: null,
        carrybee: null,
      },
      aggregate: {
        totalSuccess: 0,
        totalCancel: 0,
        totalDeliveries: 0,
        successRatio: null,
        cancelRatio: null,
      },
    };
    expect(() => fraudReportSchema.parse(report)).not.toThrow();
  });
});

describe('singleCourierReportSchema', () => {
  it('should accept a valid single-courier report', () => {
    const report = {
      courier: 'pathao',
      phone: '01712345678',
      result: { success: 5, cancel: 2, total: 7, successRatio: 71.43 },
      meta: {
        partial: false,
        succeeded: 1,
        failed: 0,
        failedCouriers: [],
        generatedAt: new Date().toISOString(),
      },
    };
    expect(() => singleCourierReportSchema.parse(report)).not.toThrow();
  });
});
