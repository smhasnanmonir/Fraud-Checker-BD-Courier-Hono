// ============================================================
// Pathao Courier Service
// Replaces PHP: src/Services/PathaoService.php
//
// Auth flow: Simple REST token login
// 1. POST /api/v1/login → get access_token
// 2. POST /api/v1/user/success → get delivery stats for phone
// ============================================================

import type { DeliveryResult } from '../../../../types/index.js';
import { httpRequest } from '../../../../shared/http.js';
import { config } from '../../../../config/index.js';
import { BaseCourierService } from '../base/base-courier.service.js';

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

  /**
   * Fetch delivery statistics from Pathao for the given phone number.
   * Simple two-step: login → query success endpoint.
   */
  async getDeliveryStats(phoneNumber: string): Promise<DeliveryResult> {
    try {
      // Step 1: Authenticate
      const loginResponse = await httpRequest('https://merchant.pathao.com/api/v1/login', {
        method: 'POST',
        body: {
          username: this.username,
          password: this.password,
        },
      });

      if (!loginResponse.ok) {
        return this.handleError('Login', new Error(`Pathao login failed with status ${loginResponse.status}`));
      }

      const loginData = loginResponse.json<PathaoLoginResponse>();
      const accessToken = (loginData.access_token ?? '').trim();

      if (!accessToken) {
        return this.handleError('Login', new Error('No access token received from Pathao'));
      }

      // Step 2: Fetch customer delivery stats
      const successResponse = await httpRequest('https://merchant.pathao.com/api/v1/user/success', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: { phone: phoneNumber },
      });

      if (!successResponse.ok) {
        return this.handleError('Fetch stats', new Error(`Pathao API returned ${successResponse.status}`));
      }

      const data = successResponse.json<PathaoSuccessResponse>();
      const customer = data.data?.customer;

      const success = Number(customer?.successful_delivery) || 0;
      const total = Number(customer?.total_delivery) || 0;
      const cancel = Math.max(0, total - success);
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
