// ============================================================
// Carrybee Service Tests
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CarrybeeService } from '../../../../src/modules/fraud/services/carrybee/carrybee.service.js';
import {
  CARRYBEE_CSRF_RESPONSE,
  CARRYBEE_SESSION_RESPONSE,
  CARRYBEE_FRAUD_RESPONSE,
} from '../../../fixtures/carrybee.fixture.js';
import { cache } from '../../../../src/shared/cache.js';

vi.mock('../../../../src/config/index.js', () => ({
  config: {
    carrybee: { phone: '01712345678', password: 'testpass' },
  },
}));

describe('CarrybeeService', () => {
  let service: CarrybeeService;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    cache.clear();
    service = new CarrybeeService();
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return delivery stats on success', async () => {
    // Step 1: CSRF token
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(CARRYBEE_CSRF_RESPONSE)),
      json: () => CARRYBEE_CSRF_RESPONSE,
      headers: new Headers({ 'set-cookie': 'csrf.csrf=token123; path=/' }),
    });

    // Step 2: Callback login
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve(''),
      json: () => ({}),
      headers: new Headers({ 'set-cookie': 'next-auth.session-token=session123; path=/' }),
    });

    // Step 3: Session
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(CARRYBEE_SESSION_RESPONSE)),
      json: () => CARRYBEE_SESSION_RESPONSE,
      headers: new Headers(),
    });

    // Step 4: Fraud check
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(CARRYBEE_FRAUD_RESPONSE)),
      json: () => CARRYBEE_FRAUD_RESPONSE,
      headers: new Headers(),
    });

    const result = await service.getDeliveryStats('01712345678');

    expect(result.success).toBe(10);
    expect(result.total).toBe(10);
    expect(result.cancel).toBe(0);
    expect(result.success_ratio).toBe(100);
    expect(result.error).toBeUndefined();
  });

  it('should handle CSRF failure', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Server Error'),
      json: () => ({}),
      headers: new Headers(),
    });

    const result = await service.getDeliveryStats('01712345678');

    expect(result.error).toBeDefined();
    expect(result.error).toContain('Failed to authenticate');
  });

  it('should handle 401 by evicting cache', async () => {
    // Prime cache
    cache.set('carrybee_token_data', {
      accessToken: 'expired-token',
      businessId: 'biz-123',
    }, 300000);

    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
      json: () => ({}),
      headers: new Headers(),
    });

    const result = await service.getDeliveryStats('01712345678');

    expect(result.error).toBeDefined();
    expect(cache.get('carrybee_token_data')).toBeNull();
  });

  it('should use cached token on second call', async () => {
    // Prime cache
    cache.set('carrybee_token_data', {
      accessToken: 'cached-token',
      businessId: 'biz-456',
    }, 300000);

    // Fraud check call
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(CARRYBEE_FRAUD_RESPONSE)),
      json: () => CARRYBEE_FRAUD_RESPONSE,
      headers: new Headers(),
    });

    await service.getDeliveryStats('01712345678');
    // Only 1 call (fraud check), no auth calls
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('should format phone number correctly', async () => {
    // Prime cache
    cache.set('carrybee_token_data', {
      accessToken: 'token',
      businessId: 'biz',
    }, 300000);

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(CARRYBEE_FRAUD_RESPONSE)),
      json: () => CARRYBEE_FRAUD_RESPONSE,
      headers: new Headers(),
    });

    await service.getDeliveryStats('+8801712345678');

    // Verify the URL contains formatted phone
    const calledUrl = fetchSpy.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('01712345678');
    expect(calledUrl).not.toContain('+88');
  });
});
