// Simple in-memory fixed-window rate limiter. State is per-process: it resets on
// restart and is not shared across instances, which is acceptable for the
// current single-instance deployment.

const buckets = new Map<string, { count: number; resetAt: number }>()

/** Records a hit for `key` and returns true if it is within `limit` for the current window. */
export function checkRateLimit(key: string, limit: number, windowMs: number, now: number = Date.now()): boolean {
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    pruneExpired(now)
    return true
  }
  bucket.count++
  return bucket.count <= limit
}

export function resetRateLimits() {
  buckets.clear()
}

function pruneExpired(now: number) {
  if (buckets.size < 10_000) return
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}
