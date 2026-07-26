// ============================================================
// Application Entry Point
// Starts the Hono server
// ============================================================

import { serve } from '@hono/node-server';
import { app } from './app.js';
import { logger } from './shared/logger.js';

const PORT = Number(process.env.PORT) || 3000;

logger.info('Starting Fraud Checker BD Courier API...');

serve(
  {
    fetch: app.fetch,
    port: PORT,
  },
  (info: { port: number }) => {
    logger.info(`🚀 Fraud Checker API running on http://localhost:${info.port}`);
    logger.info(`   GET /check/:phone          — Check all couriers`);
    logger.info(`   GET /check/:phone/:courier — Check single courier`);
    logger.info(`   GET /health                — Health check`);
  },
);
