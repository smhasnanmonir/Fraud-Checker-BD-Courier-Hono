// ============================================================
// Cache Tests
// Tests for MemoryCache (get, set, remember, delete)
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryCache } from '../../src/shared/cache.js';

describe('MemoryCache', () => {
  let cache: MemoryCache;

  beforeEach(() => {
    cache = new MemoryCache();
  });

  describe('get() and set()', () => {
    it('should return null for missing key', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should return cached value', () => {
      cache.set('key1', 'value1', 60000);
      expect(cache.get('key1')).toBe('value1');
    });

    it('should cache objects', () => {
      const obj = { name: 'test', count: 42 };
      cache.set('obj', obj, 60000);
      expect(cache.get('obj')).toEqual(obj);
    });

    it('should return null after TTL expires', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
      cache.set('expiring', 'data', 1000); // 1 second TTL

      // Advance time past TTL
      vi.setSystemTime(new Date('2025-01-01T00:00:02Z'));

      expect(cache.get('expiring')).toBeNull();
      vi.useRealTimers();
    });

    it('should overwrite existing key', () => {
      cache.set('key', 'first', 60000);
      cache.set('key', 'second', 60000);
      expect(cache.get('key')).toBe('second');
    });
  });

  describe('remember()', () => {
    it('should call factory on cache miss', async () => {
      const factory = vi.fn().mockResolvedValue('computed');
      const result = await cache.remember('remember-key', 60000, factory);
      expect(result).toBe('computed');
      expect(factory).toHaveBeenCalledOnce();
    });

    it('should return cached value without calling factory', async () => {
      cache.set('cached-key', 'cached-value', 60000);
      const factory = vi.fn().mockResolvedValue('new-value');
      const result = await cache.remember('cached-key', 60000, factory);
      expect(result).toBe('cached-value');
      expect(factory).not.toHaveBeenCalled();
    });

    it('should cache factory result', async () => {
      const factory = vi.fn().mockResolvedValue('result');
      await cache.remember('remember-key', 60000, factory);
      const second = await cache.remember('remember-key', 60000, factory);
      expect(second).toBe('result');
      expect(factory).toHaveBeenCalledOnce();
    });
  });

  describe('delete()', () => {
    it('should remove cached entry', () => {
      cache.set('to-delete', 'data', 60000);
      expect(cache.get('to-delete')).toBe('data');
      cache.delete('to-delete');
      expect(cache.get('to-delete')).toBeNull();
    });

    it('should not throw for missing key', () => {
      expect(() => cache.delete('nonexistent')).not.toThrow();
    });
  });

  describe('clear()', () => {
    it('should remove all entries', () => {
      cache.set('a', 1, 60000);
      cache.set('b', 2, 60000);
      cache.clear();
      expect(cache.get('a')).toBeNull();
      expect(cache.get('b')).toBeNull();
    });
  });
});
