// ============================================================
// Fraud Schema Tests
// Tests for Zod schemas used in fraud module
// ============================================================

import { describe, it, expect } from 'vitest';
import { phoneParamSchema, courierParamSchema, fraudReportSchema } from '../../../src/modules/fraud/fraud.schema.js';

describe('phoneParamSchema', () => {
  it('should accept valid phone', () => {
    const result = phoneParamSchema.parse({ phone: '01712345678' });
    expect(result.phone).toBe('01712345678');
  });

  it('should reject invalid phone', () => {
    expect(() => phoneParamSchema.parse({ phone: 'invalid' })).toThrow();
  });
});

describe('courierParamSchema', () => {
  it('should accept valid phone + courier', () => {
    const result = courierParamSchema.parse({
      phone: '01712345678',
      courier: 'steadfast',
    });
    expect(result.courier).toBe('steadfast');
  });

  it('should accept all courier names', () => {
    const couriers = ['steadfast', 'pathao', 'redx', 'paperfly', 'carrybee'] as const;
    for (const courier of couriers) {
      const result = courierParamSchema.parse({ phone: '01712345678', courier });
      expect(result.courier).toBe(courier);
    }
  });

  it('should reject unknown courier', () => {
    expect(() =>
      courierParamSchema.parse({ phone: '01712345678', courier: 'unknown' }),
    ).toThrow();
  });
});

describe('fraudReportSchema', () => {
  it('should accept valid fraud report', () => {
    const report = {
      steadfast: { success: 3, cancel: 1, total: 4, success_ratio: 75.0 },
      pathao: { success: 5, cancel: 2, total: 7, success_ratio: 71.43 },
      redx: { success: 20, cancel: 5, total: 25, success_ratio: 80.0 },
      paperfly: { success: 0, cancel: 0, total: 1, success_ratio: 0 },
      carrybee: { success: 10, cancel: 0, total: 10, success_ratio: 100.0 },
      aggregate: {
        total_success: 38,
        total_cancel: 8,
        total_deliveries: 47,
        success_ratio: 80.85,
        cancel_ratio: 17.02,
      },
    };
    expect(() => fraudReportSchema.parse(report)).not.toThrow();
  });

  it('should accept null courier results', () => {
    const report = {
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
    expect(() => fraudReportSchema.parse(report)).not.toThrow();
  });

  it('should accept courier with error', () => {
    const report = {
      steadfast: {
        success: 0,
        cancel: 0,
        total: 0,
        success_ratio: 0,
        error: 'Login failed',
      },
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
    expect(() => fraudReportSchema.parse(report)).not.toThrow();
  });
});
