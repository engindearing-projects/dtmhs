const windows = new Map<string, number[]>();

const LIMITS: Record<string, { max: number; windowMs: number }> = {
  anonymous: { max: 10, windowMs: 60_000 },
  verified: { max: 30, windowMs: 60_000 },
  trusted: { max: 60, windowMs: 60_000 },
  register: { max: 5, windowMs: 300_000 },
};

export function checkRateLimit(
  key: string,
  tier: string = "anonymous"
): { allowed: boolean; remaining: number } {
  const config = LIMITS[tier] || LIMITS.anonymous;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  let timestamps = windows.get(key) || [];
  timestamps = timestamps.filter((t) => t > windowStart);

  if (timestamps.length >= config.max) {
    return { allowed: false, remaining: 0 };
  }

  timestamps.push(now);
  windows.set(key, timestamps);

  return { allowed: true, remaining: config.max - timestamps.length };
}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - 300_000;
  for (const [key, timestamps] of windows) {
    const filtered = timestamps.filter((t) => t > cutoff);
    if (filtered.length === 0) windows.delete(key);
    else windows.set(key, filtered);
  }
}, 300_000);
