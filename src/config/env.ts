// ============================================================
// Environment Configuration
// Validates all env vars at startup using Zod
// Replaces PHP: config/fraud-checker-bd-courier.php + env()
// ============================================================

import { z } from 'zod';
import dotenv from 'dotenv';
import type { AppConfig } from '../types/index.js';

dotenv.config();

const envSchema = z.object({
  // Steadfast
  STEADFAST_USER: z.string().min(1, 'STEADFAST_USER is required'),
  STEADFAST_PASSWORD: z.string().min(1, 'STEADFAST_PASSWORD is required'),

  // Pathao
  PATHAO_USER: z.string().min(1, 'PATHAO_USER is required'),
  PATHAO_PASSWORD: z.string().min(1, 'PATHAO_PASSWORD is required'),

  // RedX
  REDX_PHONE: z
    .string()
    .regex(/^01[3-9]\d{8}$/, 'REDX_PHONE must be a valid BD mobile (01XXXXXXXXX)'),
  REDX_PASSWORD: z.string().min(1, 'REDX_PASSWORD is required'),

  // Paperfly
  PAPERFLY_USER: z.string().min(1, 'PAPERFLY_USER is required'),
  PAPERFLY_PASSWORD: z.string().min(1, 'PAPERFLY_PASSWORD is required'),

  // Carrybee
  CARRYBEE_PHONE: z
    .string()
    .regex(/^01[3-9]\d{8}$/, 'CARRYBEE_PHONE must be a valid BD mobile (01XXXXXXXXX)'),
  CARRYBEE_PASSWORD: z.string().min(1, 'CARRYBEE_PASSWORD is required'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const formatted = parsed.error.flatten().fieldErrors;
  console.error('❌ Invalid or missing environment variables:');
  for (const [key, msgs] of Object.entries(formatted)) {
    console.error(`   ${key}: ${msgs?.join(', ')}`);
  }
  process.exit(1);
}

/** Typed, validated application configuration */
export const config: AppConfig = {
  steadfast: {
    email: parsed.data.STEADFAST_USER,
    password: parsed.data.STEADFAST_PASSWORD,
  },
  pathao: {
    username: parsed.data.PATHAO_USER,
    password: parsed.data.PATHAO_PASSWORD,
  },
  redx: {
    phone: parsed.data.REDX_PHONE,
    password: parsed.data.REDX_PASSWORD,
  },
  paperfly: {
    username: parsed.data.PAPERFLY_USER,
    password: parsed.data.PAPERFLY_PASSWORD,
  },
  carrybee: {
    phone: parsed.data.CARRYBEE_PHONE,
    password: parsed.data.CARRYBEE_PASSWORD,
  },
} as const;
