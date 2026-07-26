// ============================================================
// Pathao Service Tests
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PathaoService } from '../../../../src/modules/fraud/services/pathao/pathao.service.js';
import { PATHAO_LOGIN_RESPONSE, PATHAO_SUCCESS_RESPONSE } from '../../../fixtures/pathao.fixture.js';

// Mock config
vi.mock('../../../../src/config/index.js', () => ({
  config: {
    pathao: { username: 'test@test.com', password: 'testpass' },
  },
}));

describe('PathaoService', () => {
  let service: PathaoService;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new PathaoService();
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return delivery stats on success', async () => {
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(PATHAO_LOGIN_RESPONSE)),
        json: () => PATHAO_LOGIN_RESPONSE,
        headers: new Headers(),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(PATHAO_SUCCESS_RESPONSE)),
        json: () => PATHAO_SUCCESS_RESPONSE,
        headers: new Headers(),
      });

    const result = await service.getDeliveryStats('01712345678');

    expect(result.success).toBe(5);
    expect(result.total).toBe(7);
    expect(result.cancel).toBe(2);
    expect(result.success_ratio).toBe(71.43);
    expect(result.error).toBeUndefined();
  });

  it('should handle login failure', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
      json: () => ({}),
      headers: new Headers(),
    });

    const result = await service.getDeliveryStats('01712345678');

    expect(result.error).toBeDefined();
    expect(result.success).toBe(0);
    expect(result.total).toBe(0);
  });

  it('should handle missing access token', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({})),
      json: () => ({}),
      headers: new Headers(),
    });

    const result = await service.getDeliveryStats('01712345678');

    expect(result.error).toBeDefined();
    expect(result.error).toBe('Courier service unavailable');
  });
});
