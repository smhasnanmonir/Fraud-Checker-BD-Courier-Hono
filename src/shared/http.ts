// ============================================================
// HTTP Client Utility
// Replaces PHP: Laravel Http facade (Http::get, Http::post, etc.)
// Uses native fetch with typed helpers for cookie management
// ============================================================

import type { HttpRequestOptions, HttpResponse } from '../types/index.js';

/**
 * Parse all Set-Cookie headers from a Response into a Record.
 * Replaces PHP: Guzzle CookieJar → toArray() parsing
 */
function parseSetCookies(response: Response): Record<string, string> {
  const cookies: Record<string, string> = {};

  // Bun and Node 18+ support getSetCookie()
  const setCookieHeaders =
    typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [response.headers.get('set-cookie')].filter(Boolean) as string[];

  for (const header of setCookieHeaders) {
    const [pair] = header.split(';');
    if (!pair) continue;
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) continue;
    const name = pair.substring(0, eqIdx).trim();
    const value = pair.substring(eqIdx + 1).trim();
    cookies[name] = value;
  }

  return cookies;
}

/**
 * Merge multiple cookie records into a single Cookie header string.
 * Replaces PHP: Http::withCookies($cookiesArray, domain)
 */
export function mergeCookies(...sources: Record<string, string>[]): string {
  const merged = Object.assign({}, ...sources);
  return Object.entries(merged)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

/**
 * Make an HTTP request and return a typed response wrapper.
 * Replaces PHP: Http::get(), Http::post(), Http::withHeaders(), etc.
 */
export async function httpRequest(
  url: string,
  options: HttpRequestOptions = {},
): Promise<HttpResponse> {
  const {
    method = 'GET',
    headers = {},
    body,
    cookies,
    followRedirects = true,
    formUrlEncoded = false,
  } = options;

  const fetchHeaders: Record<string, string> = { ...headers };

  // Attach cookies if provided
  if (cookies && Object.keys(cookies).length > 0) {
    fetchHeaders['Cookie'] = mergeCookies(cookies);
  }

  // Set Content-Type for body
  let fetchBody: string | undefined;
  if (body !== undefined) {
    if (formUrlEncoded) {
      fetchHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
      fetchBody = new URLSearchParams(body as Record<string, string>).toString();
    } else {
      fetchHeaders['Content-Type'] = fetchHeaders['Content-Type'] ?? 'application/json';
      fetchBody = typeof body === 'string' ? body : JSON.stringify(body);
    }
  }

  const res = await fetch(url, {
    method,
    headers: fetchHeaders,
    body: fetchBody,
    redirect: followRedirects ? 'follow' : 'manual',
  });

  const textBody = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(textBody);
  } catch {
    data = textBody;
  }

  return {
    status: res.status,
    ok: res.ok,
    data,
    json: <T = unknown>() => data as T,
    text: () => textBody,
    cookies: parseSetCookies(res),
    raw: res,
  };
}
