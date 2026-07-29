// ============================================================
// Fraud Routes Integration Tests (v1)
// Full HTTP tests against the real Hono app.
// Verifies: routing, error shape, status codes, caching headers,
// request-id echo, partial-failure meta, 404 behaviour.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetDeliveryStats = vi.fn();

vi.mock('../../../src/config/env.js', () => ({
  config: {
    steadfast: { email: 'test@test.com', password: 'testpass' },
    pathao: { username: 'test@test.com', password: 'testpass' },
    redx: { phone: '01712345678', password: 'testpass' },
    paperfly: { username: 'testuser', password: 'testpass' },
    carrybee: { phone: '01712345678', password: 'testpass' },
    allowedOrigins: ['*'],
    rateLimitPerMinute: 1000,
  },
}));

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

import { app } from '../../../src/app.js';

describe('Integration: /api/v1', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDeliveryStats.mockResolvedValue({
      success: 5,
      cancel: 1,
      total: 6,
      successRatio: 83.33,
    });
  });

  // ─────────────────────────────────────────────────────────
  // GET /api/v1/fraud-reports/:phone
  // ─────────────────────────────────────────────────────────
  describe('GET /api/v1/fraud-reports/:phone', () => {
    it('should return 200 with success body and ETag/Cache-Control', async () => {
      const res = await app.request('/api/v1/fraud-reports/01712345678');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.couriers).toBeDefined();
      expect(body.data.aggregate).toBeDefined();
      expect(body.meta).toBeDefined();
      expect(body.meta.succeeded).toBe(5);
      expect(body.meta.partial).toBe(false);
      expect(res.headers.get('ETag')).toMatch(/^W\/"[a-f0-9]+"$/);
      expect(res.headers.get('Cache-Control')).toContain('private');
      expect(res.headers.get('X-Request-Id')).toBeTruthy();
    });

    it('should normalize +880 prefix', async () => {
      const res = await app.request('/api/v1/fraud-reports/+8801712345678');
      expect(res.status).toBe(200);
    });

    it('should return 400 with INVALID_INPUT code + field details for bad phone', async () => {
      const res = await app.request('/api/v1/fraud-reports/invalid');
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INVALID_INPUT');
      expect(body.error.details).toBeDefined();
      expect(body.error.details[0].field).toBe('phone');
      expect(body.error.requestId).toBeTruthy();
    });

    it('should return 400 for invalid query courier', async () => {
      const res = await app.request('/api/v1/fraud-reports/01712345678?couriers=unknown');
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.code).toBe('INVALID_INPUT');
    });

    it('should respect ?couriers=pathao,redx filter', async () => {
      const res = await app.request('/api/v1/fraud-reports/01712345678?couriers=pathao,redx');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.couriers.pathao).not.toBeNull();
      expect(body.data.couriers.redx).not.toBeNull();
      expect(body.data.couriers.steadfast).toBeNull();
    });

    it('should honour If-None-Match with 304', async () => {
      const first = await app.request('/api/v1/fraud-reports/01712345678');
      const etag = first.headers.get('ETag');
      expect(etag).toBeTruthy();

      const second = await app.request('/api/v1/fraud-reports/01712345678', {
        headers: { 'If-None-Match': etag! },
      });
      expect(second.status).toBe(304);
    });

    it('should echo client-provided X-Request-Id when valid', async () => {
      const res = await app.request('/api/v1/fraud-reports/01712345678', {
        headers: { 'X-Request-Id': 'my-trace-123' },
      });
      expect(res.headers.get('X-Request-Id')).toBe('my-trace-123');
    });

    it('should set partial=true when any courier returns errorCode', async () => {
      let n = 0;
      mockGetDeliveryStats.mockImplementation(async () => {
        n++;
        if (n === 3) {
          return { success: 0, cancel: 0, total: 0, successRatio: 0, errorCode: 'COURIER_TIMEOUT' };
        }
        return { success: 1, cancel: 0, total: 1, successRatio: 100 };
      });

      const res = await app.request('/api/v1/fraud-reports/01712345678');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.meta.partial).toBe(true);
      expect(body.meta.failed).toBe(1);
      expect(body.meta.failedCouriers).toContain('redx');
      expect(body.data.aggregate.successRatio).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────
  // GET /api/v1/couriers/:courier/fraud-reports/:phone
  // ─────────────────────────────────────────────────────────
  describe('GET /api/v1/couriers/:courier/fraud-reports/:phone', () => {
    it('should return 200 with the courier-specific report', async () => {
      const res = await app.request('/api/v1/couriers/pathao/fraud-reports/01712345678');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.courier).toBe('pathao');
      expect(body.data.phone).toBe('01712345678');
      expect(body.data.result).toBeDefined();
    });

    it('should return 404 with field details for unknown courier', async () => {
      const res = await app.request('/api/v1/couriers/unknown/fraud-reports/01712345678');
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error.code).toBe('NOT_FOUND');
      expect(body.error.details[0].field).toBe('courier');
    });

    it('should return 503 with COURIER_UNAVAILABLE when service errors', async () => {
      mockGetDeliveryStats.mockResolvedValue({
        success: 0,
        cancel: 0,
        total: 0,
        successRatio: 0,
        errorCode: 'COURIER_UNAVAILABLE',
      });

      const res = await app.request('/api/v1/couriers/pathao/fraud-reports/01712345678');
      const body = await res.json();

      expect(res.status).toBe(503);
      expect(body.error.code).toBe('COURIER_UNAVAILABLE');
      expect(body.error.meta.errorCode).toBe('COURIER_UNAVAILABLE');
    });

    it('should return 400 for invalid phone', async () => {
      const res = await app.request('/api/v1/couriers/pathao/fraud-reports/bad');
      expect(res.status).toBe(400);
    });
  });

  // ─────────────────────────────────────────────────────────
  // Health endpoints
  // ─────────────────────────────────────────────────────────
  describe('Health', () => {
    it('GET /api/v1/health/live returns 200', async () => {
      const res = await app.request('/api/v1/health/live');
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.data.status).toBe('ok');
      expect(res.headers.get('Cache-Control')).toBe('no-store');
    });

    it('GET /api/v1/health/ready returns 200 with dependency status', async () => {
      const res = await app.request('/api/v1/health/ready');
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.data.dependencies).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────
  // 404 + unknown routes
  // ─────────────────────────────────────────────────────────
  describe('404 handling', () => {
    it('should return 404 with NOT_FOUND code and requestId for unknown routes', async () => {
      const res = await app.request('/api/v1/does-not-exist');
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error.code).toBe('NOT_FOUND');
      expect(body.error.message).toBe('Resource not found');
      expect(body.error.requestId).toBeTruthy();
    });
  });
});
