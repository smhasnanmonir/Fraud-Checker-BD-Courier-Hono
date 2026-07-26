// ============================================================
// Carrybee Courier Service
// Replaces PHP: src/Services/CarrybeeService.php
//
// Auth flow: NextAuth 3-step CSRF + CookieJar (most complex)
// 1. GET /api/auth/csrf → get csrfToken
// 2. POST /api/auth/callback/login → form data with csrfToken
// 3. GET /api/auth/session → get accessToken + businessId
// 4. GET /api/v2/businesses/{id}/fraud-check/{phone} → fraud data
//
// Token + businessId cached for 55 min.
// ============================================================

import type { DeliveryResult } from '../../../../types/index.js';
import { httpRequest } from '../../../../shared/http/http.js';
import { cache } from '../../../../shared/cache/cache.js';
import { config } from '../../../../config/index.js';
import { BaseCourierService } from '../base/base-courier.service.js';

const CACHE_KEY = 'carrybee_token_data';
const CACHE_TTL_MS = 55 * 60 * 1000; // 55 minutes

interface CarrybeeTokenData {
  accessToken: string;
  businessId: string;
}

interface CarrybeeCsrfResponse {
  csrfToken?: string;
}

interface CarrybeeSessionResponse {
  accessToken?: string;
  user?: {
    selectedBusinessId?: string;
  };
}

interface CarrybeeFraudResponse {
  error?: string;
  data?: {
    total_order?: number;
    cancelled_order?: number;
    success_rate?: number;
  };
}

const COMMON_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) width/1920 height/1080',
  Accept: 'application/json',
  Referer: 'https://merchant.carrybee.com/login',
};

export class CarrybeeService extends BaseCourierService {
  readonly name = 'carrybee' as const;

  private readonly phone: string;
  private readonly password: string;

  constructor() {
    super();
    this.phone = config.carrybee.phone;
    this.password = config.carrybee.password;
  }

  /**
   * Retrieve a valid Carrybee access token via NextAuth 3-step flow.
   * Uses a shared CookieJar (manual cookie tracking) across all 3 requests.
   */
  private async getAccessTokenAndBusinessId(): Promise<CarrybeeTokenData | null> {
    // Check cache first
    const cached = cache.get<CarrybeeTokenData>(CACHE_KEY);
    if (cached?.accessToken && cached.businessId) {
      return cached;
    }

    // Shared cookie jar across 3-step auth flow
    let sessionCookies: Record<string, string> = {};

    // Step 1: Get CSRF Token
    const csrfResponse = await httpRequest('https://merchant.carrybee.com/api/auth/csrf', {
      method: 'GET',
      headers: COMMON_HEADERS,
    });

    if (!csrfResponse.ok) return null;

    const csrfData = csrfResponse.json<CarrybeeCsrfResponse>();
    if (!csrfData.csrfToken) return null;

    const csrfToken = csrfData.csrfToken;
    sessionCookies = { ...sessionCookies, ...csrfResponse.cookies };

    // Step 2: Callback Login (NextAuth expects form data)
    const loginResponse = await httpRequest('https://merchant.carrybee.com/api/auth/callback/login?', {
      method: 'POST',
      headers: COMMON_HEADERS,
      formUrlEncoded: true,
      cookies: sessionCookies,
      body: {
        phone: `+88${this.phone.replace(/^(\+88)?/, '')}`,
        password: this.password,
        csrfToken,
        callbackUrl: 'https://merchant.carrybee.com/login',
      },
    });

    if (!loginResponse.ok) return null;

    sessionCookies = { ...sessionCookies, ...loginResponse.cookies };

    // Step 3: Get Session
    const sessionResponse = await httpRequest('https://merchant.carrybee.com/api/auth/session', {
      method: 'GET',
      headers: COMMON_HEADERS,
      cookies: sessionCookies,
    });

    if (!sessionResponse.ok) return null;

    const sessionData = sessionResponse.json<CarrybeeSessionResponse>();
    const accessToken = sessionData.accessToken;
    const businessId = sessionData.user?.selectedBusinessId;

    if (!accessToken || !businessId) return null;

    const tokenData: CarrybeeTokenData = { accessToken, businessId };
    cache.set(CACHE_KEY, tokenData, CACHE_TTL_MS);

    return tokenData;
  }

  /**
   * Format phone number: strip +88/88 prefix → 01XXXXXXXXX.
   * Matches PHP: preg_replace('/^(?:\+?88)?(01[3-9]\d{8})$/', '$1', $phoneNumber)
   */
  private formatPhone(phoneNumber: string): string {
    const match = phoneNumber.match(/^(?:\+?88)?(01[3-9]\d{8})$/);
    if (match?.[1]) return match[1];
    return phoneNumber; // Fallback to original
  }

  /**
   * Fetch delivery statistics from Carrybee for the given phone number.
   */
  async getDeliveryStats(phoneNumber: string): Promise<DeliveryResult> {
    try {
      const authData = await this.getAccessTokenAndBusinessId();

      if (!authData) {
        return this.handleError('Login', new Error('Failed to authenticate with Carrybee'));
      }

      const { accessToken, businessId } = authData;
      const cleanPhone = this.formatPhone(phoneNumber);

      const response = await httpRequest(
        `https://api-merchant.carrybee.com/api/v2/businesses/${encodeURIComponent(businessId)}/fraud-check/${encodeURIComponent(cleanPhone)}`,
        {
          method: 'GET',
          headers: {
            ...COMMON_HEADERS,
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      // Handle 401 — token expired
      if (response.status === 401) {
        cache.delete(CACHE_KEY);
        return this.handleError('Auth', new Error('Carrybee access token expired or invalid'));
      }

      if (!response.ok) {
        return this.handleError('Fetch', new Error(`Carrybee API returned ${response.status}`));
      }

      const data = response.json<CarrybeeFraudResponse>();

      if (data.error) {
        return this.handleError('API Error', new Error(data.error));
      }

      const fraudData = data.data;
      const total = Number(fraudData?.total_order) || 0;
      const cancel = Number(fraudData?.cancelled_order) || 0;
      const success = Math.max(0, total - cancel);
      const successRatio = this.calculateRatio(success, total);

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
}
