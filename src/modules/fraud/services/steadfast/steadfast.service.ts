// ============================================================
// Steadfast Courier Service
// Auth flow: CSRF token + cookie-based session login
// ============================================================

import type { DeliveryResult } from '../../../../types/index.js';
import { httpRequest } from '../../../../shared/http/http.js';
import { config } from '../../../../config/index.js';
import { BaseCourierService, UpstreamHttpError } from '../base/base-courier.service.js';

export class SteadfastService extends BaseCourierService {
  readonly name = 'steadfast' as const;

  private readonly email: string;
  private readonly password: string;

  constructor() {
    super();
    this.email = config.steadfast.email;
    this.password = config.steadfast.password;
  }

  async getDeliveryStats(phoneNumber: string): Promise<DeliveryResult> {
    if (!this.email || !this.password) {
      return this.handleError(new Error('Steadfast credentials not configured'), { context: 'Config' });
    }

    try {
      // Step 1: Login page → CSRF + cookies
      const loginPage = await httpRequest('https://steadfast.com.bd/login');
      if (!loginPage.ok) {
        throw new UpstreamHttpError(`Steadfast login page returned ${loginPage.status}`, loginPage.status);
      }
      const csrfMatch = loginPage.text().match(/name="_token"\s+value="([^"]+)"/);
      const csrfToken = csrfMatch?.[1];
      if (!csrfToken) throw new UpstreamHttpError('CSRF token not found on login page', 200);

      const sessionCookies = { ...loginPage.cookies };

      // Step 2: Submit credentials
      const loginResponse = await httpRequest('https://steadfast.com.bd/login', {
        method: 'POST',
        formUrlEncoded: true,
        cookies: sessionCookies,
        body: { _token: csrfToken, email: this.email, password: this.password },
      });
      if (!loginResponse.ok && loginResponse.status !== 302) {
        throw new UpstreamHttpError(`Steadfast login failed: ${loginResponse.status}`, loginResponse.status);
      }
      Object.assign(sessionCookies, loginResponse.cookies);

      // Step 3: Fetch fraud data
      const fraudResponse = await httpRequest(
        `https://steadfast.com.bd/user/frauds/check/${encodeURIComponent(phoneNumber)}`,
        { method: 'GET', cookies: sessionCookies },
      );
      if (!fraudResponse.ok) {
        throw new UpstreamHttpError(`Steadfast fraud endpoint: ${fraudResponse.status}`, fraudResponse.status);
      }

      const body = fraudResponse.json<{
        success_count?: number;
        cancel_count?: number;
        total_count?: number;
        data?: { success_count?: number; cancel_count?: number; total_count?: number };
      }>();
      const stats = body.data ?? body;
      const success = Number(stats.success_count) || 0;
      const cancel = Number(stats.cancel_count) || 0;
      const total = Number(stats.total_count) || success + cancel;
      const successRatio = this.calculateRatio(success, total);

      // Step 4: Logout (best effort — never throws).
      await this.logout(sessionCookies);

      return { success, cancel, total, successRatio };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async logout(cookies: Record<string, string>): Promise<void> {
    try {
      const logoutPage = await httpRequest('https://steadfast.com.bd/user/frauds/check', { cookies });
      if (!logoutPage.ok) return;
      const csrfMatch = logoutPage.text().match(/<meta\s+name="csrf-token"\s+content="([^"]+)"/);
      if (!csrfMatch?.[1]) return;
      const merged = { ...cookies, ...logoutPage.cookies };
      await httpRequest('https://steadfast.com.bd/logout', {
        method: 'POST',
        formUrlEncoded: true,
        cookies: merged,
        body: { _token: csrfMatch[1] },
      });
    } catch {
      /* best-effort */
    }
  }
}
