// ============================================================
// Validator Tests
// Tests for checkBdMobile(), bdMobileSchema, normalizeBdPhone, sanitizeString
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  checkBdMobile,
  bdMobileSchema,
  normalizeBdPhone,
  stripToDigits,
  sanitizeString,
} from '../../src/shared/validator/validator.js';

// ── stripToDigits ─────────────────────────────────────────

describe('stripToDigits()', () => {
  it('should remove all non-digit characters', () => {
    expect(stripToDigits('abc123def456')).toBe('123456');
  });

  it('should handle empty string', () => {
    expect(stripToDigits('')).toBe('');
  });

  it('should keep pure digits unchanged', () => {
    expect(stripToDigits('01712345678')).toBe('01712345678');
  });
});

// ── normalizeBdPhone ──────────────────────────────────────

describe('normalizeBdPhone()', () => {
  it('should strip +880 prefix', () => {
    expect(normalizeBdPhone('+8801712345678')).toBe('01712345678');
  });

  it('should strip 880 prefix (no +)', () => {
    expect(normalizeBdPhone('8801712345678')).toBe('01712345678');
  });

  it('should strip spaces and dashes', () => {
    expect(normalizeBdPhone('+880 171-234 5678')).toBe('01712345678');
  });

  it('should strip parentheses and dots', () => {
    expect(normalizeBdPhone('(017)123.45678')).toBe('01712345678');
  });

  it('should handle already-clean input', () => {
    expect(normalizeBdPhone('01712345678')).toBe('01712345678');
  });

  it('should strip XSS payload and extract digits (invalid result rejected by schema)', () => {
    // <script>alert(1)</script> → digits: 1 → result: 101712345678 (12 digits, invalid)
    expect(normalizeBdPhone('<script>alert(1)</script>01712345678')).toBe('101712345678');
  });

  it('should strip SQL injection payload', () => {
    expect(normalizeBdPhone("'; DROP TABLE users; --01712345678")).toBe('01712345678');
  });

  it('should strip HTML img tag with event handler (invalid result rejected by schema)', () => {
    // <img onerror=alert(1) src=x> → digits: 1 → result: 101712345678 (12 digits, invalid)
    expect(normalizeBdPhone('<img onerror=alert(1) src=x>01712345678')).toBe('101712345678');
  });

  it('should return single digit for pure non-numeric input with one number', () => {
    // <script>alert(1)</script> → stripToDigits → "1" (the 1 in alert(1))
    expect(normalizeBdPhone('<script>alert(1)</script>')).toBe('1');
  });

  it('should handle mixed XSS + phone with 880 prefix', () => {
    // <b>880</b>1712345678 → stripToDigits → 8801712345678 → slice → 1712345678 → prepend 0 → 01712345678
    expect(normalizeBdPhone('<b>880</b>1712345678')).toBe('01712345678');
  });
});

// ── sanitizeString ────────────────────────────────────────

describe('sanitizeString()', () => {
  it('should strip HTML tags', () => {
    expect(sanitizeString('<script>alert(1)</script>')).toBe('alert(1)');
  });

  it('should strip quotes', () => {
    expect(sanitizeString("test\"'value")).toBe('testvalue');
  });

  it('should trim whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });

  it('should strip img onerror tag', () => {
    expect(sanitizeString('<img onerror=alert(1) src=x>')).toBe('');
  });

  it('should pass through clean strings', () => {
    expect(sanitizeString('steadfast')).toBe('steadfast');
  });
});

// ── bdMobileSchema ────────────────────────────────────────

describe('bdMobileSchema', () => {
  describe('valid phone numbers', () => {
    it('should accept 01712345678', () => {
      expect(bdMobileSchema.parse('01712345678')).toBe('01712345678');
    });

    it('should accept 01876543219', () => {
      expect(bdMobileSchema.parse('01876543219')).toBe('01876543219');
    });

    it('should accept 01312345678', () => {
      expect(bdMobileSchema.parse('01312345678')).toBe('01312345678');
    });

    it('should accept 01912345678', () => {
      expect(bdMobileSchema.parse('01912345678')).toBe('01912345678');
    });

    it('should accept 01512345678', () => {
      expect(bdMobileSchema.parse('01512345678')).toBe('01512345678');
    });

    it('should accept +880 prefix and normalize to 01712345678', () => {
      expect(bdMobileSchema.parse('+8801712345678')).toBe('01712345678');
    });

    it('should accept 880 prefix (no +) and normalize', () => {
      expect(bdMobileSchema.parse('8801712345678')).toBe('01712345678');
    });

    it('should accept formatted number: +880 171-234 5678', () => {
      expect(bdMobileSchema.parse('+880 171-234 5678')).toBe('01712345678');
    });

    it('should accept number with spaces: 017 1234 5678', () => {
      expect(bdMobileSchema.parse('017 1234 5678')).toBe('01712345678');
    });

    it('should accept number with dashes: 017-1234-5678', () => {
      expect(bdMobileSchema.parse('017-1234-5678')).toBe('01712345678');
    });

    it('should accept number with parentheses: (017)12345678', () => {
      expect(bdMobileSchema.parse('(017)12345678')).toBe('01712345678');
    });
  });

  describe('invalid phone numbers', () => {
    it('should reject 1234567890 (wrong format)', () => {
      expect(() => bdMobileSchema.parse('1234567890')).toThrow();
    });

    it('should reject 02171234567 (starts with 02)', () => {
      expect(() => bdMobileSchema.parse('02171234567')).toThrow();
    });

    it('should reject 012345678 (too short)', () => {
      expect(() => bdMobileSchema.parse('012345678')).toThrow();
    });

    it('should reject 017123456789 (too long)', () => {
      expect(() => bdMobileSchema.parse('017123456789')).toThrow();
    });

    it('should reject empty string', () => {
      expect(() => bdMobileSchema.parse('')).toThrow();
    });

    it('should reject 01012345678 (starts with 010)', () => {
      expect(() => bdMobileSchema.parse('01012345678')).toThrow();
    });

    it('should reject 01112345678 (starts with 011)', () => {
      expect(() => bdMobileSchema.parse('01112345678')).toThrow();
    });

    it('should reject 01212345678 (starts with 012)', () => {
      expect(() => bdMobileSchema.parse('01212345678')).toThrow();
    });

    it('should reject pure XSS payload with no digits', () => {
      expect(() => bdMobileSchema.parse('<script>alert(1)</script>')).toThrow();
    });

    it('should reject SQL injection with no valid digits', () => {
      expect(() => bdMobileSchema.parse("'; DROP TABLE--")).toThrow();
    });

    it('should reject oversized input (over 20 chars)', () => {
      expect(() => bdMobileSchema.parse('0'.repeat(21))).toThrow();
    });
  });
});

// ── checkBdMobile() ──────────────────────────────────────

describe('checkBdMobile()', () => {
  it('should not throw for valid phone', () => {
    expect(() => checkBdMobile('01712345678')).not.toThrow();
  });

  it('should throw for invalid phone', () => {
    expect(() => checkBdMobile('invalid')).toThrow();
  });

  it('should accept +880 prefix (normalizes)', () => {
    expect(() => checkBdMobile('+8801712345678')).not.toThrow();
  });

  it('should accept formatted input', () => {
    expect(() => checkBdMobile('+880 171-234 5678')).not.toThrow();
  });

  it('should reject XSS payload', () => {
    expect(() => checkBdMobile('<script>alert(1)</script>')).toThrow();
  });
});
