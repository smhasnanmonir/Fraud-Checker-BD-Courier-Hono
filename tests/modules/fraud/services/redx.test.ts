// ============================================================
// RedX Service Tests
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RedxService } from '../../../../src/modules/fraud/services/redx/redx.service.js';
import { REDX_LOGIN_RESPONSE, REDX_PARCEL_RESPONSE } from '../../../fixtures/redx.fixture.js';
import { cache } from '../../../../src/shared/cache/cache.js';

vi.mock('../../../../src/config/index.js', () => ({
  config: {
    redx: { phone: '01712345678', password: 'testpass' },
  },
}));

describe('RedxService', () => {
  let service: RedxService;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    cache.clear();
    service = new RedxService();
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
        text: () => Promise.resolve(JSON.stringify(REDX_LOGIN_RESPONSE)),
        json: () => REDX_LOGIN_RESPONSE,
        headers: new Headers(),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(REDX_PARCEL_RESPONSE)),
        json: () => REDX_PARCEL_RESPONSE,
        headers: new Headers(),
      });

    const result = await service.getDeliveryStats('01712345678');

    expect(result.success).toBe(20);
    expect(result.total).toBe(25);
    expect(result.cancel).toBe(3);
    expect(result.success_ratio).toBe(80);
    expect(result.error).toBeUndefined();
  });

  it('should use cached token on second call', async () => {
    // First call — login + fraud data
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(REDX_LOGIN_RESPONSE)),
        json: () => REDX_LOGIN_RESPONSE,
        headers: new Headers(),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(REDX_PARCEL_RESPONSE)),
        json: () => REDX_PARCEL_RESPONSE,
        headers: new Headers(),
      });

    await service.getDeliveryStats('01712345678');
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // Second call — should NOT call login again
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(REDX_PARCEL_RESPONSE)),
      json: () => REDX_PARCEL_RESPONSE,
      headers: new Headers(),
    });

    await service.getDeliveryStats('01712345678');
    // Only 1 additional call (fraud data), not 2 (login + fraud)
    expect(fetchSpy).toHaveBeenCalledTimes(3);
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
  });

  it('should evict cache on 401', async () => {
    // Prime the cache with a token
    cache.set('redx_access_token', 'expired-token', 300000);

    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
      json: () => ({}),
      headers: new Headers(),
    });

    await service.getDeliveryStats('01712345678');

    // Cache should be evicted
    expect(cache.get('redx_access_token')).toBeNull();
  });
});
