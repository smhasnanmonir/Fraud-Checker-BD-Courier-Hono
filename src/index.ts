// ============================================================
// Application Entry Point
// Starts the Hono server.
// ============================================================

import { serve } from '@hono/node-server';
import { app } from './app.js';
import { logger } from './shared/logger/logger.js';

const PORT = Number(process.env.PORT) || 3000;

logger.info('Starting Fraud Checker BD Courier API v1...');

serve(
  {
    fetch: app.fetch,
    port: PORT,
  },
  (info: { port: number }) => {
    logger.info(`🚀 Fraud Checker API running on http://localhost:${info.port}`);
    logger.info('   GET  /api/v1/fraud-reports/:phone[?couriers=...]');
    logger.info('   GET  /api/v1/couriers/:courier/fraud-reports/:phone');
    logger.info('   GET  /api/v1/health/live');
    logger.info('   GET  /api/v1/health/ready');
  },
);
