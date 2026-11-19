// Small in-memory fixed-window rate limiter keyed by string.
// State is per-process: fine for development and single-instance deployments.
// Swap for a shared store (e.g. Redis or Postgres) when running several instances.

type Window = { count: number; resetAt: number }

export type RateLimitOptions = { limit: number; windowMs: number; now?: number }

export function createRateLimiter() {
  const windows = new Map<string, Window>()

  function checkRateLimit(key: string, { limit, windowMs, now = Date.now() }: RateLimitOptions) {
    // Opportunistically drop expired windows so the map can't grow unbounded.
    if (windows.size > 10_000) {
      for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k)
    }

    const current = windows.get(key)
    if (!current || current.resetAt <= now) {
      windows.set(key, { count: 1, resetAt: now + windowMs })
      return { allowed: true }
    }

    current.count += 1
    return { allowed: current.count <= limit }
  }

  return { checkRateLimit, reset: () => windows.clear() }
}

const defaultLimiter = createRateLimiter()

export const checkRateLimit = defaultLimiter.checkRateLimit
export const resetRateLimits = defaultLimiter.reset
