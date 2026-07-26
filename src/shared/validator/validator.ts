// ============================================================
// Phone & Config Validators
// Replaces PHP: CourierDataValidator::checkBdMobile(), enforceConfig()
// ============================================================

import { z } from 'zod';

/** BD mobile regex — matches PHP /^01[3-9][0-9]{8}$/ */
const BD_MOBILE_REGEX = /^01[3-9]\d{8}$/;

/** Zod schema for a single BD mobile number */
export const bdMobileSchema = z
  .string()
  .regex(BD_MOBILE_REGEX, {
    message: 'Invalid Bangladeshi mobile number. Use format: 01XXXXXXXXX (no +880 prefix)',
  });

/**
 * Validate a BD mobile number. Throws on invalid.
 * Replaces PHP: CourierDataValidator::checkBdMobile()
 */
export function checkBdMobile(phone: string): void {
  bdMobileSchema.parse(phone);
}
