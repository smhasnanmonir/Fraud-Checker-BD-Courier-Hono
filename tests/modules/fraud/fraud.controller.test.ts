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

// Mock all services BEFORE importing controller
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

// Import controller AFTER mocks
import { checkAllCouriers, checkSingleCourier } from '../../../src/modules/fraud/controllers/fraud.controller.js';

describe('Fraud Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkAllCouriers()', () => {
    it('should aggregate stats from all couriers', async () => {
      mockGetDeliveryStats.mockResolvedValue({
        success: 5,
        cancel: 1,
        total: 6,
        success_ratio: 83.33,
      });

      const report = await checkAllCouriers('01712345678');

      expect(report.steadfast).toBeDefined();
      expect(report.pathao).toBeDefined();
      expect(report.redx).toBeDefined();
      expect(report.paperfly).toBeDefined();
      expect(report.carrybee).toBeDefined();

      // 5 couriers × 5 success each = 25 total success
      expect(report.aggregate.total_success).toBe(25);
      expect(report.aggregate.total_cancel).toBe(5);
      expect(report.aggregate.total_deliveries).toBe(30);
    });

    it('should handle partial failures gracefully', async () => {
      let callCount = 0;
      mockGetDeliveryStats.mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          // Second courier fails — return error object
          return {
            success: 0,
            cancel: 0,
            total: 0,
            success_ratio: 0,
            error: 'Service unavailable',
          };
        }
        return {
          success: 10,
          cancel: 2,
          total: 12,
          success_ratio: 83.33,
        };
      });

      const report = await checkAllCouriers('01712345678');

      // 4 successful couriers × 10 success = 40
      expect(report.aggregate.total_success).toBe(40);
      expect(report.aggregate.total_cancel).toBe(8);
    });

    it('should return zeros when all couriers fail', async () => {
      mockGetDeliveryStats.mockResolvedValue({
        success: 0,
        cancel: 0,
        total: 0,
        success_ratio: 0,
        error: 'Service unavailable',
      });

      const report = await checkAllCouriers('01712345678');

      expect(report.aggregate.total_success).toBe(0);
      expect(report.aggregate.total_cancel).toBe(0);
      expect(report.aggregate.total_deliveries).toBe(0);
      expect(report.aggregate.success_ratio).toBe(0);
      expect(report.aggregate.cancel_ratio).toBe(0);
    });
  });

  describe('checkSingleCourier()', () => {
    it('should call the correct service', async () => {
      mockGetDeliveryStats.mockResolvedValue({
        success: 5,
        cancel: 1,
        total: 6,
        success_ratio: 83.33,
      });

      const result = await checkSingleCourier('01712345678', 'pathao');

      expect(result.courier).toBe('pathao');
      expect(result.phone).toBe('01712345678');
      expect(result.result).toBeDefined();
      expect(result.result?.success).toBe(5);
    });

    it('should throw for unknown courier', async () => {
      await expect(
        checkSingleCourier('01712345678', 'unknown' as any),
      ).rejects.toThrow('Unknown courier');
    });
  });
});
