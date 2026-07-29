// ============================================================
// Fraud Controller Tests
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock config BEFORE any import
vi.mock('../../../src/config/env.js', () => ({
  config: {
    steadfast: { email: 'test@test.com', password: 'testpass' },
    pathao: { username: 'test@test.com', password: 'testpass' },
    redx: { phone: '01712345678', password: 'testpass' },
    paperfly: { username: 'testuser', password: 'testpass' },
    carrybee: { phone: '01712345678', password: 'testpass' },
  },
}));

const mockGetDeliveryStats = vi.fn();

vi.mock('../../../src/modules/fraud/services/steadfast/steadfast.service.js', () => ({
  SteadfastService: vi.fn().mockImplementation(() => ({
    name: 'steadfast',
    getDeliveryStats: mockGetDeliveryStats,
  })),
}));

vi.mock('../../../src/modules/fraud/services/pathao/pathao.service.js', () => ({
  PathaoService: vi.fn().mockImplementation(() => ({
    name: 'pathao',
    getDeliveryStats: mockGetDeliveryStats,
  })),
}));

vi.mock('../../../src/modules/fraud/services/redx/redx.service.js', () => ({
  RedxService: vi.fn().mockImplementation(() => ({
    name: 'redx',
    getDeliveryStats: mockGetDeliveryStats,
  })),
}));

vi.mock('../../../src/modules/fraud/services/paperfly/paperfly.service.js', () => ({
  PaperflyService: vi.fn().mockImplementation(() => ({
    name: 'paperfly',
    getDeliveryStats: mockGetDeliveryStats,
  })),
}));

vi.mock('../../../src/modules/fraud/services/carrybee/carrybee.service.js', () => ({
  CarrybeeService: vi.fn().mockImplementation(() => ({
    name: 'carrybee',
    getDeliveryStats: mockGetDeliveryStats,
  })),
}));

// Import AFTER mocks
import { checkCouriers, checkSingleCourier, buildReportMeta } from '../../../src/modules/fraud/controllers/fraud.controller.js';
import { CourierUnavailableError } from '../../../src/shared/errors/errors.js';

describe('Fraud Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkCouriers()', () => {
    it('should aggregate stats from all couriers', async () => {
      mockGetDeliveryStats.mockResolvedValue({
        success: 5,
        cancel: 1,
        total: 6,
        successRatio: 83.33,
      });

      const report = await checkCouriers('01712345678', undefined);

      expect(report.couriers.steadfast).toBeDefined();
      expect(report.couriers.pathao).toBeDefined();
      expect(report.couriers.redx).toBeDefined();
      expect(report.couriers.paperfly).toBeDefined();
      expect(report.couriers.carrybee).toBeDefined();
      // 5 couriers × 5 success = 25
      expect(report.aggregate.totalSuccess).toBe(25);
      expect(report.aggregate.totalCancel).toBe(5);
      expect(report.aggregate.totalDeliveries).toBe(30);
      expect(report.aggregate.successRatio).toBe(83.33);
    });

    it('should set ratios to null on partial failure', async () => {
      let callCount = 0;
      mockGetDeliveryStats.mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          return {
            success: 0,
            cancel: 0,
            total: 0,
            successRatio: 0,
            errorCode: 'COURIER_UNAVAILABLE',
          };
        }
        return { success: 10, cancel: 2, total: 12, successRatio: 83.33 };
      });

      const report = await checkCouriers('01712345678', undefined);

      // 4 successful couriers × 10 = 40 success; ratios null because partial
      expect(report.aggregate.totalSuccess).toBe(40);
      expect(report.aggregate.totalCancel).toBe(8);
      expect(report.aggregate.successRatio).toBeNull();
      expect(report.aggregate.cancelRatio).toBeNull();
      // Second courier (pathao) failed
      expect(report.couriers.pathao?.errorCode).toBe('COURIER_UNAVAILABLE');
    });

    it('should return zero totals with null ratios when all couriers fail', async () => {
      mockGetDeliveryStats.mockResolvedValue({
        success: 0,
        cancel: 0,
        total: 0,
        successRatio: 0,
        errorCode: 'COURIER_UNAVAILABLE',
      });

      const report = await checkCouriers('01712345678', undefined);

      expect(report.aggregate.totalSuccess).toBe(0);
      expect(report.aggregate.totalCancel).toBe(0);
      expect(report.aggregate.totalDeliveries).toBe(0);
      expect(report.aggregate.successRatio).toBeNull();
      expect(report.aggregate.cancelRatio).toBeNull();
    });

    it('should respect requested courier filter', async () => {
      mockGetDeliveryStats.mockResolvedValue({ success: 3, cancel: 1, total: 4, successRatio: 75 });
      const report = await checkCouriers('01712345678', ['pathao']);
      expect(report.couriers.pathao).toBeDefined();
      // Other couriers should be null since not requested
      expect(report.couriers.steadfast).toBeNull();
    });
  });

  describe('checkSingleCourier()', () => {
    it('should return the correct courier DTO', async () => {
      mockGetDeliveryStats.mockResolvedValue({
        success: 5,
        cancel: 1,
        total: 6,
        successRatio: 83.33,
      });

      const dto = await checkSingleCourier('01712345678', 'pathao');

      expect(dto.courier).toBe('pathao');
      expect(dto.phone).toBe('01712345678');
      expect(dto.result?.success).toBe(5);
    });

    it('should throw CourierUnavailableError when service returns errorCode', async () => {
      mockGetDeliveryStats.mockResolvedValue({
        success: 0,
        cancel: 0,
        total: 0,
        successRatio: 0,
        errorCode: 'COURIER_UNAVAILABLE',
      });

      await expect(checkSingleCourier('01712345678', 'steadfast')).rejects.toBeInstanceOf(CourierUnavailableError);
    });
  });

  describe('buildReportMeta()', () => {
    it('should mark partial when any courier failed', () => {
      const meta = buildReportMeta(['pathao'], 4);
      expect(meta.partial).toBe(true);
      expect(meta.succeeded).toBe(4);
      expect(meta.failed).toBe(1);
      expect(meta.failedCouriers).toEqual(['pathao']);
    });

    it('should mark not partial when no courier failed', () => {
      const meta = buildReportMeta([], 5);
      expect(meta.partial).toBe(false);
      expect(meta.succeeded).toBe(5);
      expect(meta.failed).toBe(0);
    });

    it('should produce an ISO timestamp', () => {
      const meta = buildReportMeta([], 5);
      expect(() => new Date(meta.generatedAt).toISOString()).not.toThrow();
    });
  });
});
