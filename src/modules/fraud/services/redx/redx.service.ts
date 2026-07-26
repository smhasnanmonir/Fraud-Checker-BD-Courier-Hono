// ============================================================
// RedX Courier Service
// Replaces PHP: src/Services/RedxService.php
//
// Auth flow: REST token + in-memory caching (50 min TTL)
// 1. POST /v4/auth/login → get accessToken (cached)
// 2. GET fraud data with Bearer token
// ============================================================

import type { DeliveryResult } from '../../../../types/index.js';
import { httpRequest } from '../../../../shared/http/http.js';
import { cache } from '../../../../shared/cache/cache.js';
import { config } from '../../../../config/index.js';
import { checkBdMobile } from '../../../../shared/validator/validator.js';
import { BaseCourierService } from '../base/base-courier.service.js';

const CACHE_KEY = 'redx_access_token';
const CACHE_TTL_MS = 50 * 60 * 1000; // 50 minutes

interface RedxLoginResponse {
  data?: {
    accessToken?: string;
  };
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

    // Validate the configured phone number (matches PHP constructor behavior)
    checkBdMobile(this.phone);
  }

  /**
   * Get or create a valid RedX access token.
   * Uses in-memory cache to avoid hitting login rate limits.
   */
  private async getAccessToken(): Promise<string | null> {
    // Check cache first
    const cached = cache.get<string>(CACHE_KEY);
    if (cached) return cached;

    // Request new token
    const response = await httpRequest('https://api.redx.com.bd/v4/auth/login', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        Accept: 'application/json, text/plain, */*',
      },
      body: {
        phone: `88${this.phone}`,
        password: this.password,
      },
    });

    if (!response.ok) return null;

    const data = response.json<RedxLoginResponse>();
    const token = data.data?.accessToken;

    if (token) {
      cache.set(CACHE_KEY, token, CACHE_TTL_MS);
    }

    return token ?? null;
  }

  /**
   * Fetch delivery statistics from RedX for the given phone number.
   */
  async getDeliveryStats(queryPhone: string): Promise<DeliveryResult> {
    try {
      checkBdMobile(queryPhone);

      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        return this.handleError('Login', new Error('Failed to get access token from RedX'));
      }

      const response = await httpRequest(
        `https://api.redx.com.bd/v4.1/parcel?phone_number=${queryPhone}&parcel_type=all&status=`,
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
        // Token expired — evict cache
        cache.delete(CACHE_KEY);
        return this.handleError('Auth', new Error('RedX access token expired'));
      }

      if (!response.ok) {
        return this.handleError('Fetch', new Error(`RedX API returned ${response.status}`));
      }

      const data = response.json<RedxFraudResponse>();
      const parcelData = data.data;

      const total = Number(parcelData?.totalParcel) || 0;
      const success = Number(parcelData?.deliveredParcel) || 0;
      const cancel =
        Number(parcelData?.returnedParcel) || Number(parcelData?.cancelParcel) || Math.max(0, total - success);
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
