// ============================================================
// In-Memory TTL Cache
// Replaces PHP: Cache::get(), Cache::put(), Cache::remember()
// ============================================================

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();

  /** Get a cached value. Returns null if missing or expired. */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  /** Store a value with a TTL in milliseconds. */
  set<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Cache-aside pattern: return cached value or call factory, cache, and return.
   * Replaces PHP: Cache::remember($key, $minutes, function () { ... })
   */
  async remember<T>(key: string, ttlMs: number, factory: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;
    const data = await factory();
    this.set(key, data, ttlMs);
    return data;
  }

  /** Manually evict a key. */
  delete(key: string): void {
    this.store.delete(key);
  }

  /** Clear all entries. Useful for tests. */
  clear(): void {
    this.store.clear();
  }
}

/** Shared cache instance */
export const cache = new MemoryCache();
