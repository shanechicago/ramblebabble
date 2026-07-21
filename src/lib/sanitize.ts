// Hard enforcement of the non-negotiable output rules: no em/en dashes, no
// emojis. The model is instructed to follow these, but instructions are not
// reliable enough for a mandatory rule, so we guarantee it in code on every
// output before it reaches the user.

// Emoji and emoji-style symbol ranges (pictographs, dingbats, sparkles,
// arrows, flags, variation selectors).
const EMOJI =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}\u{FE00}-\u{FE0F}]/gu;

export function stripBanned(text: string): string {
  if (!text) return text;
  return text
    .replace(/\s*[—–]\s*/g, ", ") // em/en dashes -> comma
    .replace(EMOJI, "") // emojis -> gone
    .replace(/[ \t]{2,}/g, " ") // collapse doubled spaces
    .replace(/ +([,.;:!?])/g, "$1") // tidy space before punctuation
    .trim();
}

export function stripBannedList(items: string[]): string[] {
  return items.map(stripBanned).filter(Boolean);
}

// ----- Product-name leak protection -----
// The product name must NEVER appear in a babble whose source transcript never
// mentioned it: a user describing an app that happens to share our features must
// not get "RambleBabble" put in their mouth. Like the dash/emoji rules, this is a
// must-never guarantee the model cannot be trusted with, so we enforce it in code
// on every output. If the speaker DID name the product, their wording is left
// exactly as-is.

// The two-word name in ANY spacing or casing, as it might surface in model
// output: "RambleBabble", "Ramble Babble", "ramble  babble", "ramble\nbabble".
const PRODUCT_NAME = /ramble\s*babble/gi;

// The speaker named the product themselves if their transcript contains the name
// with spaces and case ignored ("ramblebabble" or "ramble babble").
function transcriptNamedProduct(transcript: string): boolean {
  return /ramblebabble/i.test((transcript || "").replace(/\s+/g, ""));
}

/**
 * Neutralize every occurrence of the product name in one output string, UNLESS
 * the speaker's own transcript named it (then the text is returned untouched).
 * Guarantees the brand name can never be introduced into a babble that did not
 * ask for it, no matter what the model produced.
 */
export function stripProductLeak(text: string, transcript: string): string {
  if (!text) return text;
  if (transcriptNamedProduct(transcript)) return text;
  return text
    .replace(PRODUCT_NAME, "the app") // brand name -> neutral term
    .replace(/\bthe app(?:\s+the app)+\b/gi, "the app") // collapse "the app the app"
    .replace(/(^|[.!?]\s+|\n\s*)the app\b/g, (_m, lead) => `${lead}The app`); // recapitalize at a sentence start
}

/** The same guarantee across a list of outputs (keyPoints / followUps). */
export function stripProductLeakList(
  items: string[],
  transcript: string,
): string[] {
  return items.map((s) => stripProductLeak(s, transcript)).filter(Boolean);
}

// Outputs are plain text meant to be pasted into Word/email/texts, so any
// Markdown the model leaks (### headings, **bold**, etc.) must be flattened.
// Standalone "#hashtag" (no space) is left alone so social-post hashtags survive.
export function stripMarkdown(text: string): string {
  if (!text) return text;
  return text
    .replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, "") // "### Heading" -> "Heading"
    .replace(/^[ \t]{0,3}>[ \t]?/gm, "") // "> quote" -> "quote"
    .replace(/^([ \t]*)\*[ \t]+/gm, "$1- ") // "* bullet" -> "- bullet"
    .replace(/^\s*([-*_])(?:\s*\1){2,}\s*$/gm, "") // "---"/"***" rules -> gone
    .replace(/\*\*([^*\n]+?)\*\*/g, "$1") // **bold** -> bold
    .replace(/__([^_\n]+?)__/g, "$1") // __bold__ -> bold
    .replace(/`([^`\n]+?)`/g, "$1"); // `code` -> code
}
