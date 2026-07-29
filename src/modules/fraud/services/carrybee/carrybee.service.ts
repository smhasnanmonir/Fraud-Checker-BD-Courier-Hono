// ============================================================
// Carrybee Courier Service
// ============================================================

import type { DeliveryResult } from '../../../../types/index.js';
import { httpRequest } from '../../../../shared/http/http.js';
import { cache } from '../../../../shared/cache/cache.js';
import { config } from '../../../../config/index.js';
import { BaseCourierService, UpstreamHttpError } from '../base/base-courier.service.js';

const CACHE_KEY = 'carrybee_token_data';
const CACHE_TTL_MS = 55 * 60 * 1000;

interface CarrybeeTokenData {
  accessToken: string;
  businessId: string;
}

interface CarrybeeCsrfResponse {
  csrfToken?: string;
}

interface CarrybeeSessionResponse {
  accessToken?: string;
  user?: { selectedBusinessId?: string };
}

interface CarrybeeFraudResponse {
  data?: {
    total_order?: number;
    cancelled_order?: number;
  };
}

const COMMON_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
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

  private async getAccessTokenAndBusinessId(): Promise<CarrybeeTokenData | null> {
    const cached = cache.get<CarrybeeTokenData>(CACHE_KEY);
    if (cached?.accessToken && cached.businessId) return cached;

    let sessionCookies: Record<string, string> = {};

    const csrfResponse = await httpRequest('https://merchant.carrybee.com/api/auth/csrf', {
      method: 'GET',
      headers: COMMON_HEADERS,
    });
    if (!csrfResponse.ok) return null;
    const csrfToken = csrfResponse.json<CarrybeeCsrfResponse>().csrfToken;
    if (!csrfToken) return null;
    Object.assign(sessionCookies, csrfResponse.cookies);

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
    Object.assign(sessionCookies, loginResponse.cookies);

    const sessionResponse = await httpRequest('https://merchant.carrybee.com/api/auth/session', {
      method: 'GET',
      headers: COMMON_HEADERS,
      cookies: sessionCookies,
    });
    if (!sessionResponse.ok) return null;

    const session = sessionResponse.json<CarrybeeSessionResponse>();
    const accessToken = session.accessToken;
    const businessId = session.user?.selectedBusinessId;
    if (!accessToken || !businessId) return null;

    const tokenData: CarrybeeTokenData = { accessToken, businessId };
    cache.set(CACHE_KEY, tokenData, CACHE_TTL_MS);
    return tokenData;
  }

  private formatPhone(phoneNumber: string): string {
    const match = phoneNumber.match(/^(?:\+?88)?(01[3-9]\d{8})$/);
    return match?.[1] ?? phoneNumber;
  }

  async getDeliveryStats(phoneNumber: string): Promise<DeliveryResult> {
    if (!this.phone || !this.password) {
      return this.handleError(new Error('Carrybee credentials not configured'), { context: 'Config' });
    }

    try {
      const authData = await this.getAccessTokenAndBusinessId();
      if (!authData) throw new UpstreamHttpError('Carrybee authentication failed', 502);

      const { accessToken, businessId } = authData;
      const cleanPhone = this.formatPhone(phoneNumber);

      const response = await httpRequest(
        `https://api-merchant.carrybee.com/api/v2/businesses/${encodeURIComponent(businessId)}/fraud-check/${encodeURIComponent(cleanPhone)}`,
        {
          method: 'GET',
          headers: { ...COMMON_HEADERS, Authorization: `Bearer ${accessToken}` },
        },
      );
      if (response.status === 401) {
        cache.delete(CACHE_KEY);
        throw new UpstreamHttpError('Carrybee token expired', 401);
      }
      if (!response.ok) {
        throw new UpstreamHttpError(`Carrybee fraud-check: ${response.status}`, response.status);
      }

      const fraudData = response.json<CarrybeeFraudResponse>().data;
      const total = Number(fraudData?.total_order) || 0;
      const cancel = Number(fraudData?.cancelled_order) || 0;
      const success = Math.max(0, total - cancel);
      const successRatio = this.calculateRatio(success, total);

      return { success, cancel, total, successRatio };
    } catch (error) {
      return this.handleError(error);
    }
  }
}
