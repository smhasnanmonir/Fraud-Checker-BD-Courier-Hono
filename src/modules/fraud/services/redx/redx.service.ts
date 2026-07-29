// ============================================================
// RedX Courier Service
// ============================================================

import type { DeliveryResult } from '../../../../types/index.js';
import { httpRequest } from '../../../../shared/http/http.js';
import { cache } from '../../../../shared/cache/cache.js';
import { config } from '../../../../config/index.js';
import { checkBdMobile } from '../../../../shared/validator/validator.js';
import { BaseCourierService, UpstreamHttpError } from '../base/base-courier.service.js';

const CACHE_KEY = 'redx_access_token';
const CACHE_TTL_MS = 50 * 60 * 1000;

interface RedxLoginResponse {
  data?: { accessToken?: string };
}

interface RedxFraudResponse {
  data?: {
    totalParcel?: number;
    deliveredParcel?: number;
    returnedParcel?: number;
    cancelParcel?: number;
  };
}

export class RedxService extends BaseCourierService {
  readonly name = 'redx' as const;

  private readonly phone: string;
  private readonly password: string;

  constructor() {
    super();
    this.phone = config.redx.phone;
    this.password = config.redx.password;
    if (this.phone) checkBdMobile(this.phone);
  }

  private async getAccessToken(): Promise<string | null> {
    const cached = cache.get<string>(CACHE_KEY);
    if (cached) return cached;

    const response = await httpRequest('https://api.redx.com.bd/v4/auth/login', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        Accept: 'application/json, text/plain, */*',
      },
      body: { phone: `88${this.phone}`, password: this.password },
    });
    if (!response.ok) return null;
    const token = response.json<RedxLoginResponse>().data?.accessToken;
    if (token) cache.set(CACHE_KEY, token, CACHE_TTL_MS);
    return token ?? null;
  }

  async getDeliveryStats(queryPhone: string): Promise<DeliveryResult> {
    if (!this.phone || !this.password) {
      return this.handleError(new Error('RedX credentials not configured'), { context: 'Config' });
    }

    try {
      checkBdMobile(queryPhone);

      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        throw new UpstreamHttpError('Failed to obtain RedX access token', 401);
      }

      const response = await httpRequest(
        `https://api.redx.com.bd/v4.1/parcel?phone_number=${encodeURIComponent(queryPhone)}&parcel_type=all&status=`,
        {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            Accept: 'application/json, text/plain, */*',
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      if (response.status === 401) {
        cache.delete(CACHE_KEY);
        throw new UpstreamHttpError('RedX token expired', 401);
      }
      if (!response.ok) {
        throw new UpstreamHttpError(`RedX stats: ${response.status}`, response.status);
      }

      const parcelData = response.json<RedxFraudResponse>().data;
      const total = Number(parcelData?.totalParcel) || 0;
      const success = Number(parcelData?.deliveredParcel) || 0;
      const cancel =
        Number(parcelData?.returnedParcel) || Number(parcelData?.cancelParcel) || Math.max(0, total - success);
      const successRatio = this.calculateRatio(success, total);

      return { success, cancel, total, successRatio };
    } catch (error) {
      return this.handleError(error);
    }
  }
}
