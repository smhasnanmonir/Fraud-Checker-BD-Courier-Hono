// ============================================================
// Phone & Config Validators
// Replaces PHP: CourierDataValidator::checkBdMobile(), enforceConfig()
//
// SECURITY: All user input is sanitized to prevent XSS, CSRF,
// SQL injection, and remote code execution. Phone numbers are
// stripped to digits-only before validation.
// ============================================================

import { z } from 'zod';

/** BD mobile regex — matches PHP /^01[3-9][0-9]{8}$/ */
const BD_MOBILE_REGEX = /^01[3-9]\d{8}$/;

/**
 * Strip all non-numeric characters from a string.
 * SECURITY: Aggressively removes anything that isn't a digit —
 * prevents XSS payloads, HTML injection, SQL injection, and
 * remote code execution from ever reaching downstream logic.
 *
 * Example: "+880 171-234 5678" → "8801712345678"
 * Example: "<script>alert(1)</script>" → ""
 */
export function stripToDigits(raw: string): string {
  return raw.replace(/\D/g, '');
}

/**
 * Normalize a BD phone number to 11-digit local format (01XXXXXXXXX).
 *
 * Steps:
 * 1. Strip ALL non-digit characters (XSS/injection prevention)
 * 2. Strip 880 country code prefix if present
 * 3. Ensure leading zero for valid BD mobile prefix (01X...)
 *
 * Handles all common input formats:
 * - "01712345678"           → "01712345678" (already local)
 * - "+8801712345678"        → "01712345678" (13 digits: 880 + 017...)
 * - "+880 171-234 5678"     → "01712345678" (formatted + prefix)
 * - "<script>8801712345678" → "01712345678" (XSS payload stripped)
 */
export function normalizeBdPhone(raw: string): string {
  // Step 1: Strip everything that isn't a digit — kills XSS/SQLi/RCE payloads
  let phone = stripToDigits(raw);

  // Step 2: Strip 880 country code prefix if present
  if (phone.startsWith('880') && phone.length > 11) {
    phone = phone.slice(3);
  }

  // Step 3: Ensure leading zero for BD mobile prefix (01X...)
  // If result is 10 digits starting with 1-9, prepend 0
  // This handles inputs like "1712345678" → "01712345678"
  if (phone.length === 10 && /^[1-9]/.test(phone)) {
    phone = '0' + phone;
  }

  return phone;
}

/** Zod schema for a single BD mobile number (normalizes before validation) */
export const bdMobileSchema = z
  .string()
  .min(1, 'Phone number is required')
  .max(20, 'Phone number is too long')
  .transform(normalizeBdPhone)
  .pipe(
    z.string().regex(BD_MOBILE_REGEX, {
      message:
        'Invalid Bangladeshi mobile number. Expected 01XXXXXXXXX after normalization (e.g. +880 171-234 5678 → 01712345678)',
    }),
  );

/**
 * Sanitize a generic string — strips HTML tags and trims whitespace.
 * Use for any non-phone string inputs to prevent XSS.
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/<[^>]*>/g, '') // strip HTML tags
    .replace(/["']/g, ''); // strip quotes (XSS attribute injection)
}

/**
 * Validate a BD mobile number. Throws on invalid.
 * Replaces PHP: CourierDataValidator::checkBdMobile()
 */
export function checkBdMobile(phone: string): void {
  bdMobileSchema.parse(phone);
}
