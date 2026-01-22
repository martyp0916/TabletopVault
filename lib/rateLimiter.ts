/**
 * Client-Side Rate Limiting Utility
 *
 * Provides throttling and rate limiting for API calls to:
 * 1. Prevent accidental excessive requests from the client
 * 2. Provide better UX by showing rate limit warnings before hitting server limits
 * 3. Protect against runaway loops or bugs that could hammer the API
 *
 * SECURITY NOTE: True rate limiting must be implemented server-side (Supabase RLS + edge functions).
 * This client-side implementation is a defense-in-depth measure only.
 *
 * OWASP: This helps mitigate A04:2021 - Insecure Design by adding client-side protections.
 */

// =============================================================================
// TYPES
// =============================================================================

interface RateLimitEntry {
  count: number;
  firstRequest: number;
  lastRequest: number;
}

interface RateLimitConfig {
  // Maximum number of requests allowed in the window
  maxRequests: number;
  // Time window in milliseconds
  windowMs: number;
  // Minimum time between requests in milliseconds (throttle)
  minIntervalMs?: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfterMs?: number;
  error?: string;
}

// =============================================================================
// RATE LIMIT CONFIGURATIONS - Sensible defaults for different operations
// =============================================================================

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Authentication - Strict limits to prevent brute force
  'auth:signIn': {
    maxRequests: 5,
    windowMs: 60 * 1000,        // 5 attempts per minute
    minIntervalMs: 1000,         // 1 second between attempts
  },
  'auth:signUp': {
    maxRequests: 3,
    windowMs: 60 * 1000,        // 3 signups per minute
    minIntervalMs: 2000,         // 2 seconds between attempts
  },
  'auth:passwordReset': {
    maxRequests: 3,
    windowMs: 5 * 60 * 1000,    // 3 resets per 5 minutes
    minIntervalMs: 5000,
  },

  // Data mutations - Moderate limits
  'data:create': {
    maxRequests: 30,
    windowMs: 60 * 1000,        // 30 creates per minute
    minIntervalMs: 500,
  },
  'data:update': {
    maxRequests: 60,
    windowMs: 60 * 1000,        // 60 updates per minute
    minIntervalMs: 200,
  },
  'data:delete': {
    maxRequests: 20,
    windowMs: 60 * 1000,        // 20 deletes per minute
    minIntervalMs: 500,
  },

  // File uploads - Stricter limits due to resource usage
  'storage:upload': {
    maxRequests: 10,
    windowMs: 60 * 1000,        // 10 uploads per minute
    minIntervalMs: 1000,
  },

  // Search/queries - Higher limits for read operations
  'data:read': {
    maxRequests: 100,
    windowMs: 60 * 1000,        // 100 reads per minute
    minIntervalMs: 100,
  },
  'data:search': {
    maxRequests: 30,
    windowMs: 60 * 1000,        // 30 searches per minute
    minIntervalMs: 300,
  },

  // Default fallback
  'default': {
    maxRequests: 60,
    windowMs: 60 * 1000,
    minIntervalMs: 200,
  },
} as const;

// =============================================================================
// RATE LIMITER CLASS
// =============================================================================

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();

  /**
   * Check if a request should be allowed based on rate limits
   *
   * @param key - Unique identifier for the rate limit bucket (e.g., 'auth:signIn:user@email.com')
   * @param configName - Name of the rate limit config to use (e.g., 'auth:signIn')
   * @returns RateLimitResult indicating if request is allowed
   */
  check(key: string, configName: string = 'default'): RateLimitResult {
    const config = RATE_LIMITS[configName] || RATE_LIMITS['default'];
    const now = Date.now();

    let entry = this.limits.get(key);

    // Clean up old entries and create new one if needed
    if (!entry || now - entry.firstRequest >= config.windowMs) {
      entry = {
        count: 0,
        firstRequest: now,
        lastRequest: 0,
      };
      this.limits.set(key, entry);
    }

    // Check throttle (minimum interval between requests)
    if (config.minIntervalMs && entry.lastRequest > 0) {
      const timeSinceLastRequest = now - entry.lastRequest;
      if (timeSinceLastRequest < config.minIntervalMs) {
        return {
          allowed: false,
          remaining: config.maxRequests - entry.count,
          resetTime: entry.firstRequest + config.windowMs,
          retryAfterMs: config.minIntervalMs - timeSinceLastRequest,
          error: `Please wait ${Math.ceil((config.minIntervalMs - timeSinceLastRequest) / 1000)} seconds before trying again`,
        };
      }
    }

    // Check rate limit
    if (entry.count >= config.maxRequests) {
      const resetTime = entry.firstRequest + config.windowMs;
      const retryAfterMs = resetTime - now;

      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfterMs,
        error: `Too many requests. Please try again in ${Math.ceil(retryAfterMs / 1000)} seconds`,
      };
    }

    // Allow the request
    entry.count++;
    entry.lastRequest = now;

    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.firstRequest + config.windowMs,
    };
  }

  /**
   * Execute a function with rate limiting
   * Returns a graceful error if rate limited
   */
  async execute<T>(
    key: string,
    configName: string,
    fn: () => Promise<T>
  ): Promise<{ data: T | null; error: Error | null; rateLimited: boolean }> {
    const result = this.check(key, configName);

    if (!result.allowed) {
      return {
        data: null,
        error: new RateLimitError(result.error || 'Rate limit exceeded', result.retryAfterMs),
        rateLimited: true,
      };
    }

    try {
      const data = await fn();
      return { data, error: null, rateLimited: false };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
        rateLimited: false,
      };
    }
  }

  /**
   * Clear rate limit for a specific key
   * Useful after successful operations that should reset the limit
   */
  clear(key: string): void {
    this.limits.delete(key);
  }

  /**
   * Clear all rate limits
   * Useful for testing or after logout
   */
  clearAll(): void {
    this.limits.clear();
  }

  /**
   * Get remaining requests for a key
   */
  getRemaining(key: string, configName: string = 'default'): number {
    const config = RATE_LIMITS[configName] || RATE_LIMITS['default'];
    const entry = this.limits.get(key);

    if (!entry || Date.now() - entry.firstRequest >= config.windowMs) {
      return config.maxRequests;
    }

    return Math.max(0, config.maxRequests - entry.count);
  }
}

// =============================================================================
// CUSTOM ERROR CLASS
// =============================================================================

export class RateLimitError extends Error {
  public readonly retryAfterMs?: number;
  public readonly isRateLimitError = true;

  constructor(message: string, retryAfterMs?: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Type guard to check if an error is a rate limit error
 */
export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError || (
    error instanceof Error &&
    'isRateLimitError' in error &&
    (error as any).isRateLimitError === true
  );
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const rateLimiter = new RateLimiter();

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create a rate-limited version of a function
 * Useful for wrapping API calls
 */
export function withRateLimit<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string,
  configName: string
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const key = keyGenerator(...args);
    const check = rateLimiter.check(key, configName);

    if (!check.allowed) {
      throw new RateLimitError(check.error || 'Rate limit exceeded', check.retryAfterMs);
    }

    return fn(...args);
  };
}

/**
 * Debounce function - delays execution until after wait period of inactivity
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, waitMs);
  };
}

/**
 * Throttle function - ensures function is called at most once per wait period
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= waitMs) {
      lastCall = now;
      fn(...args);
    } else if (!timeoutId) {
      // Schedule a call for when the throttle period ends
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        fn(...args);
      }, waitMs - timeSinceLastCall);
    }
  };
}

// =============================================================================
// HELPER FOR GENERATING RATE LIMIT KEYS
// =============================================================================

/**
 * Generate a rate limit key based on operation and identifier
 */
export function getRateLimitKey(operation: string, identifier?: string): string {
  if (identifier) {
    return `${operation}:${identifier}`;
  }
  return operation;
}
