import { createHash, randomUUID } from "node:crypto";

export const CONSULTATION_RATE_LIMIT_MAX = 3;
export const CONSULTATION_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

const processSalt = process.env.CONSULTATION_RATE_LIMIT_SALT || randomUUID();
const attempts = new Map<string, number[]>();

function privateKey(identifier: string) {
  return createHash("sha256").update(`${processSalt}:${identifier}`).digest("hex").slice(0, 24);
}

export function checkConsultationRateLimit(identifier: string, now = Date.now()) {
  const key = privateKey(identifier || "unknown");
  const cutoff = now - CONSULTATION_RATE_LIMIT_WINDOW_MS;
  const current = (attempts.get(key) || []).filter((timestamp) => timestamp > cutoff);

  if (current.length >= CONSULTATION_RATE_LIMIT_MAX) {
    attempts.set(key, current);
    const retryAfterMs = Math.max(1, current[0] + CONSULTATION_RATE_LIMIT_WINDOW_MS - now);
    return { allowed: false as const, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) };
  }

  current.push(now);
  attempts.set(key, current);

  if (attempts.size > 5_000) {
    for (const [storedKey, timestamps] of attempts) {
      if (timestamps.every((timestamp) => timestamp <= cutoff)) attempts.delete(storedKey);
    }
  }

  return {
    allowed: true as const,
    remaining: CONSULTATION_RATE_LIMIT_MAX - current.length,
  };
}

export function resetConsultationRateLimitForTests() {
  attempts.clear();
}
