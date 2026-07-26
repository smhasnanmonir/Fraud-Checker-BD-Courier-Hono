// ============================================================
// Cookie Helper Tests
// Tests for mergeCookies()
// ============================================================

import { describe, it, expect } from 'vitest';
import { mergeCookies } from '../../src/shared/http/http.js';

describe('mergeCookies()', () => {
  it('should merge single cookie source', () => {
    const result = mergeCookies({ session: 'abc123' });
    expect(result).toBe('session=abc123');
  });

  it('should merge multiple cookie sources', () => {
    const result = mergeCookies(
      { session: 'abc123' },
      { csrf: 'token456' },
    );
    expect(result).toContain('session=abc123');
    expect(result).toContain('csrf=token456');
    expect(result).toContain('; ');
  });

  it('should handle empty sources', () => {
    const result = mergeCookies({});
    expect(result).toBe('');
  });

  it('should handle multiple empty sources', () => {
    const result = mergeCookies({}, {}, {});
    expect(result).toBe('');
  });

  it('should override duplicate keys (last wins)', () => {
    const result = mergeCookies(
      { session: 'old' },
      { session: 'new' },
    );
    expect(result).toBe('session=new');
  });
});
