// ============================================================
// Courier Domain Types
// Direct translation of PHP types from the Laravel package
// ============================================================

/** Supported courier names — maps 1:1 to PHP CourierName */
export type CourierName = 'steadfast' | 'pathao' | 'redx' | 'paperfly' | 'carrybee';

/** All supported courier names as a constant array for iteration */
export const COURIER_NAMES: readonly CourierName[] = [
  'steadfast',
  'pathao',
  'redx',
  'paperfly',
  'carrybee',
] as const;

/** Tuple form for Zod enum derivation. */
export const COURIER_NAME_TUPLE = [
  'steadfast',
  'pathao',
  'redx',
  'paperfly',
  'carrybee',
] as const satisfies readonly CourierName[];

/** Core delivery stats returned by every courier service */
export interface DeliveryStats {
  success: number;
  cancel: number;
  total: number;
  successRatio: number;
}

/** Extended result that may carry error info when a courier service fails */
export interface DeliveryResult extends DeliveryStats {
  /** Set when this courier could not produce data. Maps to machine-readable code. */
  errorCode?: CourierErrorCode;
}

/** Per-courier error code exposed in API responses (no upstream message leak). */
export type CourierErrorCode =
  | 'COURIER_UNAVAILABLE'
  | 'COURIER_AUTH_FAILED'
  | 'COURIER_RATE_LIMITED'
  | 'COURIER_TIMEOUT'
  | 'COURIER_CONFIG_MISSING';

/** Aggregated stats across all couriers */
export interface AggregateStats {
  totalSuccess: number;
  totalCancel: number;
  totalDeliveries: number;
  /** null when data is partial — ratios are not meaningful across partial sets */
  successRatio: number | null;
  cancelRatio: number | null;
}

/** Full fraud report — same shape as PHP FraudCheckerBdCourierManager::check() return */
export interface FraudReport {
  steadfast: DeliveryResult | null;
  pathao: DeliveryResult | null;
  redx: DeliveryResult | null;
  paperfly: DeliveryResult | null;
  carrybee: DeliveryResult | null;
  aggregate: AggregateStats;
}

// ============================================================
// Config Types
// ============================================================

export interface SteadfastCredentials {
  readonly email: string;
  readonly password: string;
}

export interface PathaoCredentials {
  readonly username: string;
  readonly password: string;
}

export interface RedxCredentials {
  readonly phone: string;
  readonly password: string;
}

export interface PaperflyCredentials {
  readonly username: string;
  readonly password: string;
}

export interface CarrybeeCredentials {
  readonly phone: string;
  readonly password: string;
}

export interface AppConfig {
  readonly steadfast: SteadfastCredentials;
  readonly pathao: PathaoCredentials;
  readonly redx: RedxCredentials;
  readonly paperfly: PaperflyCredentials;
  readonly carrybee: CarrybeeCredentials;
  readonly allowedOrigins: readonly string[];
  readonly rateLimitPerMinute: number;
}

// ============================================================
// API Response Types (RFC-7807 inspired, not full compliance)
// ============================================================

/** Machine-readable error codes. Add to this enum, never reuse strings inline. */
export type ErrorCode =
  | 'INVALID_INPUT'
  | 'INVALID_PHONE'
  | 'INVALID_COURIER'
  | 'NOT_FOUND'
  | 'COURIER_UNAVAILABLE'
  | 'UPSTREAM_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'PAYLOAD_TOO_LARGE'
  | 'TIMEOUT'
  | 'INTERNAL_ERROR';

/** A single field-level validation issue. */
export interface FieldError {
  field: string;
  code: string;
  message: string;
}

/** Error body shared across all error responses. */
export interface ApiErrorBody {
  code: ErrorCode;
  message: string;
  details?: FieldError[];
  /** Echo of X-Request-Id for log correlation. */
  requestId?: string;
  /** Optional structured context (e.g. retry-after seconds). */
  meta?: Record<string, unknown>;
}

/** Full JSON shape for any error response. */
export interface ErrorResponse {
  success: false;
  error: ApiErrorBody;
}

/** Full JSON shape for any success response. */
export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

// ============================================================
// HTTP Helper Types
// ============================================================

export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string | Record<string, unknown>;
  cookies?: Record<string, string>;
  followRedirects?: boolean;
  formUrlEncoded?: boolean;
  timeoutMs?: number;
}

export interface HttpResponse {
  status: number;
  ok: boolean;
  data: unknown;
  json<T = unknown>(): T;
  text(): string;
  cookies: Record<string, string>;
  raw: Response;
}

// ============================================================
// Hono context bindings
// ============================================================

/** Per-request context exposed via `c.var`. */
export interface AppVariables {
  /** Unique request id (read from X-Request-Id header or generated). */
  requestId: string;
}
