import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { RATE_LIMIT_PER_HOUR, RATE_LIMIT_PER_MINUTE } from "./config";

// Per-IP abuse protection for the two paid endpoints (transcribe + cleanup).
// Uses Upstash Redis so the counters survive across Vercel's stateless
// serverless invocations. An in-memory counter would reset on every cold start
// and protect nothing, which is why the standard serverless choice is Upstash.
//
// Fail-open by design: if the Upstash env vars are missing (local dev) or Redis
// errors at runtime, we log and ALLOW the request. PRODUCTION REQUIRES the env
// vars UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN. Without them there
// is no rate limiting.

let hourly: Ratelimit | null = null;
let burst: Ratelimit | null = null;
let initialized = false;

function init() {
  if (initialized) return;
  initialized = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.warn(
      "[ratelimit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set. " +
        "Rate limiting is DISABLED (fail-open) so local dev still works. " +
        "PRODUCTION REQUIRES these env vars.",
    );
    return;
  }

  const redis = new Redis({ url, token });
  hourly = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMIT_PER_HOUR, "1 h"),
    prefix: "rb:rl:hour",
    analytics: false,
  });
  burst = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMIT_PER_MINUTE, "1 m"),
    prefix: "rb:rl:min",
    analytics: false,
  });
}

/** Client IP from x-forwarded-for (first entry), with safe fallbacks. */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp && realIp.trim()) return realIp.trim();
  return "unknown";
}

/**
 * Enforce BOTH the burst (per-minute) and hourly limits for this IP. Returns
 * { allowed: false } only when a limit is actually exceeded; missing config or
 * any infrastructure error fails OPEN (allowed: true) so real users are never
 * blocked by our own outage.
 */
export async function checkRateLimit(ip: string): Promise<{ allowed: boolean }> {
  init();
  if (!hourly || !burst) return { allowed: true };
  try {
    const [b, h] = await Promise.all([burst.limit(ip), hourly.limit(ip)]);
    return { allowed: b.success && h.success };
  } catch (err) {
    console.error("[ratelimit] check failed, allowing request:", err);
    return { allowed: true };
  }
}
