// Minimal in-memory, per-IP rate limiter. Best-effort only (resets on cold
// start / per instance) — enough to blunt casual abuse of the story endpoint.

type Bucket = { count: number; resetAt: number };

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;
const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string): { allowed: boolean } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }
  if (bucket.count >= MAX_PER_WINDOW) return { allowed: false };
  bucket.count += 1;
  return { allowed: true };
}
