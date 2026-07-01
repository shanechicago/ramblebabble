// Recording + upload limits for the MVP (v0).
// Everything tunable lives here — change a number, not a component.

/** Hard cap on a single recording. Recording auto-stops at this point. */
export const MAX_RECORDING_SECONDS = 3 * 60; // 3 minutes

/** When to warn the user that the cap is approaching (30s before the cap). */
export const WARNING_AT_SECONDS = MAX_RECORDING_SECONDS - 30; // 2:30

/**
 * Largest audio file we'll attempt to upload. OpenAI's transcription endpoint
 * rejects anything over 25 MB, so we guard below that and fail loudly, never
 * silently. v0 does NOT chunk audio — a too-large file is a friendly error.
 */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

// User-facing copy, kept here so limits and their messaging stay in sync.

/** Shown at WARNING_AT_SECONDS. */
export const WARNING_MESSAGE =
  "30 seconds left. Wrap this ramble or start another one after this.";

/** Shown when the recording auto-stops at the cap. */
export const LIMIT_REACHED_MESSAGE =
  "You've hit the 3-minute limit for this ramble. We stopped here so your recording doesn't fail. You can clean this one up now or start another ramble.";

/** Shown when a recording is too large to upload. */
export const TOO_LARGE_MESSAGE =
  "That recording is too large to send. Please record a shorter ramble.";

// --- Abuse protection: rate limiting the two paid endpoints (per client IP) ---
// So the app can face the public internet without anyone running up the API
// bill. Both limits below are enforced together; exceeding EITHER returns HTTP
// 429. Tunable: change the number, not the code.

/** Requests per IP per rolling hour. */
export const RATE_LIMIT_PER_HOUR = 10;

/** Short-burst cap: requests per IP per rolling minute. */
export const RATE_LIMIT_PER_MINUTE = 3;

/** Shown (HTTP 429) when either rate limit is exceeded. */
export const RATE_LIMIT_MESSAGE =
  "You're rambling fast. Give it a minute and try again.";
