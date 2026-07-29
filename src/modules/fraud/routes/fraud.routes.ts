// ============================================================
// Fraud Routes (v1)
// RESTful, resource-oriented, versioned under /api/v1.
//
// Mounted by app.ts at:
//   /api/v1/fraud-reports/:phone                 — phone collection
//   /api/v1/couriers/:courier/fraud-reports/:phone — courier-nested view
//
// All responses use the canonical wire format with ETag + Cache-Control.
// Errors propagate to app.onError so typed AppErrors map to correct status codes.
// ============================================================

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createHash } from 'node:crypto';
import { COURIER_NAME_TUPLE } from '../../../types/index.js';
import type { AppVariables, CourierName } from '../../../types/index.js';
import { NotFoundError, ValidationError } from '../../../shared/errors/errors.js';
import { successResponse } from '../../../shared/response/response.js';
import { getRequestLogger } from '../../../shared/logger/logger.js';
import {
  buildReportMeta,
  checkCouriers,
  checkSingleCourier,
} from '../controllers/fraud.controller.js';
import {
  fraudReportQuerySchema,
  phoneParamSchema,
} from '../schemas/fraud.schema.js';

// Cache-Control: short, private (PII — phone number in URL).
const CACHE_CONTROL = 'private, max-age=60, must-revalidate';

interface CacheCtx {
  header: (k: string, v: string) => void;
  req: { header: (k: string) => string | undefined };
  body: (b: null, s: number) => Response;
}

/** Build a weak ETag from the canonical JSON body. */
function buildEtag(body: unknown): string {
  return `W/"${createHash('sha1').update(JSON.stringify(body)).digest('hex')}"`;
}

/** Attach cache headers + honour If-None-Match. Returns 304 Response if matched. */
function applyCacheHeaders(c: CacheCtx, body: unknown): Response | null {
  const etag = buildEtag(body);
  c.header('ETag', etag);
  c.header('Cache-Control', CACHE_CONTROL);
  if (c.req.header('If-None-Match') === etag) {
    return c.body(null, 304);
  }
  return null;
}

/** Convert a Zod issues list to a ValidationError with field details. */
function throwValidationError(
  message: string,
  issues: { path: (string | number)[]; code: string; message: string }[],
): never {
  throw new ValidationError(
    message,
    issues.map((i) => ({ field: i.path.join('.') || '(root)', code: i.code, message: i.message })),
  );
}

// ────────────────────────────────────────────────────────────
// Router 1 — phone collection (mounted at /api/v1/fraud-reports)
// ────────────────────────────────────────────────────────────
const fraudReportRouter = new Hono<{ Variables: AppVariables }>();

fraudReportRouter.get(
  '/:phone',
  zValidator('param', phoneParamSchema, (result) => {
    if (!result.success) throwValidationError('Invalid phone number', result.error.issues);
  }),
  zValidator('query', fraudReportQuerySchema, (result) => {
    if (!result.success) throwValidationError('Invalid query parameters', result.error.issues);
  }),
  async (c) => {
    const { phone } = c.req.valid('param');
    const { couriers } = c.req.valid('query');
    const log = getRequestLogger(c);

    const report = await checkCouriers(phone, couriers as CourierName[] | undefined);

    const failedCouriers = Object.entries(report.couriers)
      .filter(([, v]) => v?.errorCode !== undefined)
      .map(([k]) => k);
    const succeeded = Object.values(report.couriers).filter(
      (v) => v !== null && v.errorCode === undefined,
    ).length;

    const meta = buildReportMeta(failedCouriers, succeeded);
    log.debug({ phone, meta }, 'fraud-reports ok');

    const body = successResponse(report, meta);
    const cached = applyCacheHeaders(c, body);
    if (cached) return cached;
    return c.json(body);
  },
);

fraudReportRouter.notFound(() => {
  throw new NotFoundError('Fraud report resource not found', {
    details: [
      { field: 'path', code: 'not_found', message: 'Route does not exist under /api/v1/fraud-reports' },
    ],
  });
});

// ────────────────────────────────────────────────────────────
// Router 2 — courier-nested (mounted at /api/v1/couriers/:courier/fraud-reports)
// ────────────────────────────────────────────────────────────
const singleCourierRouter = new Hono<{ Variables: AppVariables }>();

singleCourierRouter.get(
  '/:phone',
  zValidator('param', phoneParamSchema, (result) => {
    if (!result.success) throwValidationError('Invalid phone number', result.error.issues);
  }),
  async (c) => {
    const { phone } = c.req.valid('param');
    const courierParam = c.req.param('courier') as string;

    if (!(COURIER_NAME_TUPLE as readonly string[]).includes(courierParam)) {
      throw new NotFoundError(`Courier '${courierParam}' is not supported`, {
        details: [
          {
            field: 'courier',
            code: 'invalid_enum_value',
            message: `Allowed: ${COURIER_NAME_TUPLE.join(', ')}`,
          },
        ],
      });
    }

    const dto = await checkSingleCourier(phone, courierParam as CourierName);
    const meta = buildReportMeta([], 1);
    const body = successResponse(dto, meta);

    const cached = applyCacheHeaders(c, body);
    if (cached) return cached;
    return c.json(body);
  },
);

singleCourierRouter.notFound(() => {
  throw new NotFoundError('Single courier fraud report not found', {
    details: [
      { field: 'path', code: 'not_found', message: 'Route does not exist under this courier' },
    ],
  });
});

export const fraudRoutes = fraudReportRouter;
export const fraudSingleRoutes = singleCourierRouter;
export const _internal = { applyCacheHeaders, buildEtag };
