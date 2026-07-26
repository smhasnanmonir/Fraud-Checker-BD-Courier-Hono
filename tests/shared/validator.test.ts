// ============================================================
// Validator Tests
// Tests for checkBdMobile() and bdMobileSchema
// ============================================================

import { describe, it, expect } from 'vitest';
import { checkBdMobile, bdMobileSchema } from '../../src/shared/validator/validator.js';

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
  });

  describe('invalid phone numbers', () => {
    it('should reject +8801712345678 (with country code)', () => {
      expect(() => bdMobileSchema.parse('+8801712345678')).toThrow();
    });

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
  });
});

describe('checkBdMobile()', () => {
  it('should not throw for valid phone', () => {
    expect(() => checkBdMobile('01712345678')).not.toThrow();
  });

  it('should throw for invalid phone', () => {
    expect(() => checkBdMobile('invalid')).toThrow();
  });

  it('should throw for +880 prefix', () => {
    expect(() => checkBdMobile('+8801712345678')).toThrow();
  });
});
