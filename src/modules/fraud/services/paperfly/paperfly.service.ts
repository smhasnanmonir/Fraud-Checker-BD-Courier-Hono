// ============================================================
// Paperfly Courier Service
// ============================================================

import type { DeliveryResult } from '../../../../types/index.js';
import { httpRequest } from '../../../../shared/http/http.js';
import { cache } from '../../../../shared/cache/cache.js';
import { config } from '../../../../config/index.js';
import { BaseCourierService, UpstreamHttpError } from '../base/base-courier.service.js';

const BASE_URL = 'https://go-app.paperfly.com.bd/merchant/api/react';
const CACHE_KEY = 'paperfly_access_token';
const CACHE_TTL_MS = 55 * 60 * 1000;

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

  private async getToken(): Promise<string> {
    return cache.remember<string>(CACHE_KEY, CACHE_TTL_MS, async () => {
      const response = await httpRequest(`${BASE_URL}/authentication/login_using_password.php`, {
        method: 'POST',
        body: { username: this.username, password: this.password },
      });
      if (!response.ok) {
        throw new UpstreamHttpError(`Paperfly login: ${response.status}`, response.status);
      }
      const token = response.json<PaperflyLoginResponse>().token;
      if (!token) throw new UpstreamHttpError('No token from Paperfly', 200);
      return token;
    });
  }

  async getDeliveryStats(phoneNumber: string): Promise<DeliveryResult> {
    if (!this.username || !this.password) {
      return this.handleError(new Error('Paperfly credentials not configured'), { context: 'Config' });
    }

    try {
      const token = await this.getToken();
      const response = await httpRequest(`${BASE_URL}/smart-check/list.php`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json, text/plain, */*',
        },
        body: { search_text: phoneNumber, limit: 50, page: 1 },
      });
      if (!response.ok) {
        throw new UpstreamHttpError(`Paperfly smart-check: ${response.status}`, response.status);
      }

      const data = response.json<PaperflySmartCheckResponse>();
      const total = Number(data.totalRecords) || 0;
      const records = data.records ?? [];

      let success = 0;
      let cancel = 0;
      for (const record of records) {
        const status = (record.status ?? record.parcel_status ?? record.current_status ?? '').toLowerCase();
        if (status.includes('delivered') || status.includes('success')) success++;
        else if (status.includes('return') || status.includes('cancel') || status.includes('fail') || status.includes('returned')) cancel++;
      }

      const parsedTotal = success + cancel;
      const successRatio = parsedTotal > 0 ? this.calculateRatio(success, parsedTotal) : 0;
      return { success, cancel, total, successRatio };
    } catch (error) {
      return this.handleError(error);
    }
  }
}
