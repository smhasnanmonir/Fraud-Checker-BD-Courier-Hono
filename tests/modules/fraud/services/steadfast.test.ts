// ============================================================
// Steadfast Service Tests
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SteadfastService } from '../../../../src/modules/fraud/services/steadfast/steadfast.service.js';
import {
  STEADFAST_LOGIN_PAGE_HTML,
  STEADFAST_FRAUD_RESPONSE,
  STEADFAST_LOGOUT_PAGE_HTML,
} from '../../../fixtures/steadfast.fixture.js';

vi.mock('../../../../src/config/index.js', () => ({
  config: {
    steadfast: { email: 'test@test.com', password: 'testpass' },
  },
}));

describe('SteadfastService', () => {
  let service: SteadfastService;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new SteadfastService();
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return delivery stats on success', async () => {
    // Step 1: Login page (GET)
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve(STEADFAST_LOGIN_PAGE_HTML),
      json: () => ({}),
      headers: new Headers({ 'set-cookie': 'laravel_session=abc123; path=/' }),
    });

    // Step 2: Login (POST)
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 302,
      text: () => Promise.resolve(''),
      json: () => ({}),
      headers: new Headers({ 'set-cookie': 'laravel_session=xyz789; path=/' }),
    });

    // Step 3: Fraud data
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(STEADFAST_FRAUD_RESPONSE)),
      json: () => STEADFAST_FRAUD_RESPONSE,
      headers: new Headers(),
    });

    // Step 4: Logout page
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve(STEADFAST_LOGOUT_PAGE_HTML),
      json: () => ({}),
      headers: new Headers(),
    });

    // Step 5: Logout POST
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 302,
      text: () => Promise.resolve(''),
      json: () => ({}),
      headers: new Headers(),
    });

    const result = await service.getDeliveryStats('01712345678');

    expect(result.success).toBe(3);
    expect(result.cancel).toBe(1);
    expect(result.total).toBe(4);
    expect(result.success_ratio).toBe(75);
    expect(result.error).toBeUndefined();
  });

  it('should handle CSRF token not found', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve('<html><body>No CSRF here</body></html>'),
      json: () => ({}),
      headers: new Headers(),
    });

    const result = await service.getDeliveryStats('01712345678');

    expect(result.error).toBeDefined();
    expect(result.error).toContain('CSRF');
  });

  it('should handle login failure', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve(STEADFAST_LOGIN_PAGE_HTML),
      json: () => ({}),
      headers: new Headers(),
    });

    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Invalid credentials'),
      json: () => ({}),
      headers: new Headers(),
    });

    const result = await service.getDeliveryStats('01712345678');

    expect(result.error).toBeDefined();
    expect(result.error).toContain('Login');
  });
});
