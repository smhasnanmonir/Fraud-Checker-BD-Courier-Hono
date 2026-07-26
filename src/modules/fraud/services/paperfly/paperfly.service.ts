// ============================================================
// Paperfly Courier Service
// Replaces PHP: src/Services/PaperflyService.php
//
// Auth flow: REST token + caching (55 min) + "Smart Check" search
// 1. POST /authentication/login_using_password.php → get token (cached)
// 2. POST /smart-check/list.php → search records by phone
// 3. Parse status strings from records array
// ============================================================

import type { DeliveryResult } from '../../../../types/index.js';
import { httpRequest } from '../../../../shared/http.js';
import { cache } from '../../../../shared/cache.js';
import { config } from '../../../../config/index.js';
import { BaseCourierService } from '../base/base-courier.service.js';

const BASE_URL = 'https://go-app.paperfly.com.bd/merchant/api/react';
const CACHE_KEY = 'paperfly_access_token';
const CACHE_TTL_MS = 55 * 60 * 1000; // 55 minutes

interface PaperflyLoginResponse {
  token?: string;
}

interface PaperflySmartCheckResponse {
  totalRecords?: number;
  records?: Array<{
    status?: string;
    parcel_status?: string;
    current_status?: string;
  }>;
}

export class PaperflyService extends BaseCourierService {
  readonly name = 'paperfly' as const;

  private readonly username: string;
  private readonly password: string;

  constructor() {
    super();
    this.username = config.paperfly.username;
    this.password = config.paperfly.password;
  }

  /**
   * Get authentication token, either from cache or by logging in.
   * Replaces PHP: Cache::remember('fraud_checker_paperfly_token', 3300, function () { ... })
   */
  private async getToken(): Promise<string> {
    return cache.remember<string>(CACHE_KEY, CACHE_TTL_MS, async () => {
      const response = await httpRequest(`${BASE_URL}/authentication/login_using_password.php`, {
        method: 'POST',
        body: {
          username: this.username,
          password: this.password,
        },
      });

      if (!response.ok) {
        throw new Error(`Paperfly login failed: ${response.text()}`);
      }

      const data = response.json<PaperflyLoginResponse>();
      if (!data.token) {
        throw new Error('No token received from Paperfly');
      }

      return data.token;
    });
  }

  /**
   * Fetch delivery statistics from Paperfly for the given phone number.
   */
  async getDeliveryStats(phoneNumber: string): Promise<DeliveryResult> {
    try {
      const token = await this.getToken();

      // Perform the Smart Check search
      const response = await httpRequest(`${BASE_URL}/smart-check/list.php`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json, text/plain, */*',
        },
        body: {
          search_text: phoneNumber,
          limit: 50,
          page: 1,
        },
      });

      if (!response.ok) {
        return this.handleError('Smart Check', new Error(`Paperfly API returned ${response.status}`));
      }

      const data = response.json<PaperflySmartCheckResponse>();
      const total = Number(data.totalRecords) || 0;
      const records = data.records ?? [];

      let success = 0;
      let cancel = 0;

      // Parse status strings from records (matches PHP status checking logic)
      for (const record of records) {
        const status = (record.status ?? record.parcel_status ?? record.current_status ?? '').toLowerCase();

        if (status.includes('delivered') || status.includes('success')) {
          success++;
        } else if (
          status.includes('return') ||
          status.includes('cancel') ||
          status.includes('fail') ||
          status.includes('returned')
        ) {
          cancel++;
        }
      }

      // Calculate ratio from parsed counts
      const parsedTotal = success + cancel;
      const successRatio = parsedTotal > 0 ? this.calculateRatio(success, parsedTotal) : 0;

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
