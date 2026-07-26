// ============================================================
// Steadfast Courier Service
// Replaces PHP: src/Services/SteadfastService.php
//
// Auth flow: CSRF token + cookie-based session login
// 1. GET /login → extract _token (CSRF) + cookies
// 2. POST /login → form submit with _token + cookies
// 3. GET /user/frauds/check/{phone} → get fraud data
// 4. Logout via GET + POST with CSRF
// ============================================================

import type { DeliveryResult } from '../../../../types/index.js';
import { httpRequest } from '../../../../shared/http.js';
import { config } from '../../../../config/index.js';
import { BaseCourierService } from '../base/base-courier.service.js';

export class SteadfastService extends BaseCourierService {
  readonly name = 'steadfast' as const;

  private readonly email: string;
  private readonly password: string;

  constructor() {
    super();
    this.email = config.steadfast.email;
    this.password = config.steadfast.password;
  }

  /**
   * Fetch delivery statistics from Steadfast for the given phone number.
   * Full login flow: CSRF → login → fraud check → logout.
   */
  async getDeliveryStats(phoneNumber: string): Promise<DeliveryResult> {
    try {
      // Step 1: Fetch login page to get CSRF token + initial cookies
      const loginPage = await httpRequest('https://steadfast.com.bd/login');

      if (!loginPage.ok) {
        return this.handleError('Login page fetch', new Error(`HTTP ${loginPage.status}`));
      }

      // Extract CSRF _token from HTML
      const html = loginPage.text();
      const csrfMatch = html.match(/name="_token"\s+value="([^"]+)"/);
      const csrfToken = csrfMatch?.[1];

      if (!csrfToken) {
        return this.handleError('CSRF extraction', new Error('CSRF token not found on Steadfast login page'));
      }

      const initialCookies = loginPage.cookies;

      // Step 2: Log in with CSRF token + credentials
      const loginResponse = await httpRequest('https://steadfast.com.bd/login', {
        method: 'POST',
        formUrlEncoded: true,
        cookies: initialCookies,
        body: {
          _token: csrfToken,
          email: this.email,
          password: this.password,
        },
      });

      if (!loginResponse.ok && loginResponse.status !== 302) {
        return this.handleError('Login', new Error(`Login failed with status ${loginResponse.status}`));
      }

      // Merge cookies from login response
      const sessionCookies = { ...initialCookies, ...loginResponse.cookies };

      // Step 3: Access fraud data
      const fraudResponse = await httpRequest(
        `https://steadfast.com.bd/user/frauds/check/${phoneNumber}`,
        {
          method: 'GET',
          cookies: sessionCookies,
        },
      );

      if (!fraudResponse.ok) {
        return this.handleError('Fraud data fetch', new Error(`HTTP ${fraudResponse.status}`));
      }

      // Parse fraud data — Steadfast returns JSON with success/cancel counts
      const fraudData = fraudResponse.json<{
        success_count?: number;
        cancel_count?: number;
        total_count?: number;
        data?: {
          success_count?: number;
          cancel_count?: number;
          total_count?: number;
        };
      }>();

      // Handle nested or flat response structure
      const stats = fraudData.data ?? fraudData;
      const success = Number(stats.success_count) || 0;
      const cancel = Number(stats.cancel_count) || 0;
      const total = Number(stats.total_count) || success + cancel;

      const successRatio = this.calculateRatio(success, total);

      // Step 4: Logout (best effort)
      await this.logout(sessionCookies);

      return {
        success,
        cancel,
        total,
        success_ratio: successRatio,
      };
    } catch (error) {
      return this.handleError('getDeliveryStats', error);
    }
  }

  /**
   * Logout from Steadfast session (best effort, non-blocking).
   */
  private async logout(cookies: Record<string, string>): Promise<void> {
    try {
      // Fetch logout page to get CSRF token
      const logoutPage = await httpRequest('https://steadfast.com.bd/user/frauds/check', {
        cookies,
      });

      if (!logoutPage.ok) return;

      const html = logoutPage.text();
      const csrfMatch = html.match(/<meta\s+name="csrf-token"\s+content="([^"]+)"/);
      const csrfToken = csrfMatch?.[1];

      if (!csrfToken) return;

      const logoutCookies = { ...cookies, ...logoutPage.cookies };

      await httpRequest('https://steadfast.com.bd/logout', {
        method: 'POST',
        formUrlEncoded: true,
        cookies: logoutCookies,
        body: { _token: csrfToken },
      });
    } catch {
      // Logout is best effort — ignore errors
    }
  }
}
