// ============================================================
// Pathao Courier Service
// ============================================================

import type { DeliveryResult } from '../../../../types/index.js';
import { httpRequest } from '../../../../shared/http/http.js';
import { config } from '../../../../config/index.js';
import { BaseCourierService, UpstreamHttpError } from '../base/base-courier.service.js';

interface PathaoLoginResponse {
  access_token?: string;
}

interface PathaoSuccessResponse {
  data?: {
    customer?: {
      successful_delivery?: number;
      total_delivery?: number;
    };
  };
}

export class PathaoService extends BaseCourierService {
  readonly name = 'pathao' as const;

  private readonly username: string;
  private readonly password: string;

  constructor() {
    super();
    this.username = config.pathao.username;
    this.password = config.pathao.password;
  }

  async getDeliveryStats(phoneNumber: string): Promise<DeliveryResult> {
    try {
      const loginResponse = await httpRequest('https://merchant.pathao.com/api/v1/login', {
        method: 'POST',
        body: { username: this.username, password: this.password },
      });
      if (!loginResponse.ok) {
        throw new UpstreamHttpError(`Pathao login failed: ${loginResponse.status}`, loginResponse.status);
      }
      const accessToken = (loginResponse.json<PathaoLoginResponse>().access_token ?? '').trim();
      if (!accessToken) throw new UpstreamHttpError('No access token from Pathao', 200);

      const successResponse = await httpRequest('https://merchant.pathao.com/api/v1/user/success', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: { phone: phoneNumber },
      });
      if (!successResponse.ok) {
        throw new UpstreamHttpError(`Pathao stats: ${successResponse.status}`, successResponse.status);
      }
      const customer = successResponse.json<PathaoSuccessResponse>().data?.customer;
      const success = Number(customer?.successful_delivery) || 0;
      const total = Number(customer?.total_delivery) || 0;
      const cancel = Math.max(0, total - success);
      const successRatio = this.calculateRatio(success, total);

      return { success, cancel, total, successRatio };
    } catch (error) {
      return this.handleError(error);
    }
  }
}
