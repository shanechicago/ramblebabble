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
