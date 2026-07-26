// ============================================================
// Fraud Routes
// Defines HTTP endpoints for fraud checking
// Validates all inputs with Zod before passing to controller
// ============================================================

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { phoneParamSchema, courierParamSchema } from '../fraud.schema.js';
import { checkAllCouriers, checkSingleCourier } from '../controllers/fraud.controller.js';
import { successResponse, errorResponse } from '../../../shared/response.js';
import type { CourierName } from '../../../types/index.js';

const fraudRoutes = new Hono();

/**
 * GET /check/:phone
 * Check fraud stats across ALL couriers for a phone number.
 *
 * Response: { success: true, data: FraudReport }
 */
fraudRoutes.get(
  '/check/:phone',
  zValidator('param', phoneParamSchema, (result, c) => {
    if (!result.success) {
      c.json(errorResponse('Invalid phone number', result.error.issues), 400);
    }
  }),
  async (c) => {
    try {
      const { phone } = c.req.valid('param');
      const report = await checkAllCouriers(phone);
      return c.json(successResponse(report));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal server error';
      return c.json(errorResponse(message), 500);
    }
  },
);

/**
 * GET /check/:phone/:courier
 * Check fraud stats for a SINGLE courier.
 *
 * Response: { success: true, data: SingleCourierCheckDto }
 */
fraudRoutes.get(
  '/check/:phone/:courier',
  zValidator('param', courierParamSchema, (result, c) => {
    if (!result.success) {
      c.json(errorResponse('Invalid parameters', result.error.issues), 400);
    }
  }),
  async (c) => {
    try {
      const { phone, courier } = c.req.valid('param');
      const result = await checkSingleCourier(phone, courier as CourierName);
      return c.json(successResponse(result));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal server error';
      return c.json(errorResponse(message), 500);
    }
  },
);

export default fraudRoutes;
