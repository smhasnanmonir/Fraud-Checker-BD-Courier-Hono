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

/** Core delivery stats returned by every courier service */
export interface DeliveryStats {
  success: number;
  cancel: number;
  total: number;
  success_ratio: number;
}

/** Extended result that may carry error info when a courier service fails */
export interface DeliveryResult {
  success: number;
  cancel: number;
  total: number;
  success_ratio: number;
  error?: string;
  status?: number;
  message?: string;
}

/** Aggregated stats across all couriers */
export interface AggregateStats {
  total_success: number;
  total_cancel: number;
  total_deliveries: number;
  success_ratio: number;
  cancel_ratio: number;
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
}

// ============================================================
// API Response Types
// ============================================================

export interface SuccessResponse<T> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  message: string;
  errors?: unknown[];
}

// ============================================================
// HTTP Helper Types
// ============================================================

export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  cookies?: Record<string, string>;
  followRedirects?: boolean;
  formUrlEncoded?: boolean;
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
