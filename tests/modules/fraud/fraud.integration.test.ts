// ============================================================
// Fraud Routes Integration Tests
// Full HTTP tests via Hono app.request()
// ============================================================

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { zValidator } from '@hono/zod-validator';

// Mock config BEFORE any app import
vi.mock('../../../src/config/env.js', () => ({
  config: {
    steadfast: { email: 'test@test.com', password: 'testpass' },
    pathao: { username: 'test@test.com', password: 'testpass' },
    redx: { phone: '01712345678', password: 'testpass' },
    paperfly: { username: 'testuser', password: 'testpass' },
    carrybee: { phone: '01712345678', password: 'testpass' },
  },
}));

// Mock all services to avoid real HTTP calls
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
import { phoneParamSchema, courierParamSchema } from '../../../src/modules/fraud/schemas/fraud.schema.js';
import { checkAllCouriers, checkSingleCourier } from '../../../src/modules/fraud/controllers/fraud.controller.js';
import { healthCheck } from '../../../src/modules/health/controllers/health.controller.js';
import { successResponse, errorResponse } from '../../../src/shared/response/response.js';
import { ZodError } from 'zod';

// Build a minimal app for integration testing
function createTestApp() {
  const app = new Hono();
  app.use('*', cors());

  // Fraud routes
  app.get(
    '/check/:phone',
    zValidator('param', phoneParamSchema, (result, c) => {
      if (!result.success) {
        return c.json(errorResponse('Invalid phone number', result.error.issues), 400);
      }
    }),
    async (c) => {
      try {
        const { phone } = c.req.valid('param');
        const report = await checkAllCouriers(phone);
        return c.json(successResponse(report));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return c.json(errorResponse(message), 500);
      }
    },
  );

  app.get(
    '/check/:phone/:courier',
    zValidator('param', courierParamSchema, (result, c) => {
      if (!result.success) {
        return c.json(errorResponse('Invalid parameters', result.error.issues), 400);
      }
    }),
    async (c) => {
      try {
        const { phone, courier } = c.req.valid('param');
        const result = await checkSingleCourier(phone, courier);
        return c.json(successResponse(result));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return c.json(errorResponse(message), 500);
      }
    },
  );

  // Health route
  app.get('/health', (c) => {
    return c.json(successResponse(healthCheck()));
  });

  // 404 fallback
  app.notFound((c) => {
    return c.json(errorResponse(`Route ${c.req.method} ${c.req.path} not found`), 404);
  });

  // Global error handler
  app.onError((err, c) => {
    if (err instanceof ZodError) {
      return c.json(errorResponse('Validation failed', err.errors), 400);
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    return c.json(errorResponse(message), 500);
  });

  return app;
}

let app: ReturnType<typeof createTestApp>;

beforeEach(() => {
  vi.clearAllMocks();
  mockGetDeliveryStats.mockResolvedValue({
    success: 5,
    cancel: 1,
    total: 6,
    success_ratio: 83.33,
  });
  app = createTestApp();
});

describe('GET /check/:phone', () => {
  it('should return 200 with fraud report for valid phone', async () => {
    const res = await app.request('/check/01712345678');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.steadfast).toBeDefined();
    expect(body.data.pathao).toBeDefined();
    expect(body.data.redx).toBeDefined();
    expect(body.data.paperfly).toBeDefined();
    expect(body.data.carrybee).toBeDefined();
    expect(body.data.aggregate).toBeDefined();
  });

  it('should return 400 for invalid phone number', async () => {
    const res = await app.request('/check/invalid');
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('should return 200 for phone with +880 prefix (normalized server-side)', async () => {
    const res = await app.request('/check/+8801712345678');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('should return 400 for too short phone', async () => {
    const res = await app.request('/check/017123');
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });
});

describe('GET /check/:phone/:courier', () => {
  it('should return 200 for valid single courier check', async () => {
    const res = await app.request('/check/01712345678/pathao');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.courier).toBe('pathao');
    expect(body.data.phone).toBe('01712345678');
    expect(body.data.result).toBeDefined();
  });

  it('should return 400 for invalid courier name', async () => {
    const res = await app.request('/check/01712345678/unknown');
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('should accept all valid courier names', async () => {
    const couriers = ['steadfast', 'pathao', 'redx', 'paperfly', 'carrybee'];
    for (const courier of couriers) {
      const res = await app.request(`/check/01712345678/${courier}`);
      expect(res.status).toBe(200);
    }
  });
});

describe('GET /health', () => {
  it('should return 200 with health status', async () => {
    const res = await app.request('/health');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ok');
    expect(body.data.version).toBe('1.0.0');
  });
});

describe('404 handling', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await app.request('/unknown');
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
  });
});
