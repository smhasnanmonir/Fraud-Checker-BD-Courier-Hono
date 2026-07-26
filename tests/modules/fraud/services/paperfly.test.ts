// ============================================================
// Paperfly Service Tests
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PaperflyService } from '../../../../src/modules/fraud/services/paperfly/paperfly.service.js';
import { PAPERFLY_LOGIN_RESPONSE, PAPERFLY_SMART_CHECK_RESPONSE } from '../../../fixtures/paperfly.fixture.js';
import { cache } from '../../../../src/shared/cache.js';

vi.mock('../../../../src/config/index.js', () => ({
  config: {
    paperfly: { username: 'testuser', password: 'testpass' },
  },
}));

describe('PaperflyService', () => {
  let service: PaperflyService;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    cache.clear();
    service = new PaperflyService();
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
        text: () => Promise.resolve(JSON.stringify(PAPERFLY_LOGIN_RESPONSE)),
        json: () => PAPERFLY_LOGIN_RESPONSE,
        headers: new Headers(),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(PAPERFLY_SMART_CHECK_RESPONSE)),
        json: () => PAPERFLY_SMART_CHECK_RESPONSE,
        headers: new Headers(),
      });

    const result = await service.getDeliveryStats('01712345678');

    // 5 delivered, 1 returned, 1 cancelled = 5 success, 2 cancel, 10 total
    expect(result.success).toBe(5);
    expect(result.cancel).toBe(2);
    expect(result.total).toBe(10);
    expect(result.error).toBeUndefined();
  });

  it('should use cached token on second call', async () => {
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(PAPERFLY_LOGIN_RESPONSE)),
        json: () => PAPERFLY_LOGIN_RESPONSE,
        headers: new Headers(),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(PAPERFLY_SMART_CHECK_RESPONSE)),
        json: () => PAPERFLY_SMART_CHECK_RESPONSE,
        headers: new Headers(),
      });

    await service.getDeliveryStats('01712345678');
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(PAPERFLY_SMART_CHECK_RESPONSE)),
      json: () => PAPERFLY_SMART_CHECK_RESPONSE,
      headers: new Headers(),
    });

    await service.getDeliveryStats('01712345678');
    // Only 1 additional call (smart-check), not 2
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it('should handle login failure', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Server Error'),
      json: () => ({}),
      headers: new Headers(),
    });

    const result = await service.getDeliveryStats('01712345678');

    expect(result.error).toBeDefined();
    expect(result.success).toBe(0);
  });

  it('should handle empty records', async () => {
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(PAPERFLY_LOGIN_RESPONSE)),
        json: () => PAPERFLY_LOGIN_RESPONSE,
        headers: new Headers(),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ totalRecords: 0, records: [] })),
        json: () => ({ totalRecords: 0, records: [] }),
        headers: new Headers(),
      });

    const result = await service.getDeliveryStats('01712345678');

    expect(result.success).toBe(0);
    expect(result.cancel).toBe(0);
    expect(result.total).toBe(0);
  });
});
