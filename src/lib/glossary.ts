// "Your words" — the speaker's OWN terms.
//
// A flat spelling list can't solve the real problem: a term almost always
// SOUNDS like an ordinary English word ("recruiter" vs. their app "Rekrutr").
// Spelling alone makes the model stamp the term over every look-alike. So each
// entry carries an optional MEANING, and the model uses that meaning plus the
// surrounding context to decide which one the speaker actually meant.
//
// This is the single source of truth for the shape and for the defensive
// parsing. Everything (API routes, prompt, providers, UI) goes through it.

/** One term the speaker owns: the exact spelling, plus what it is to them. */
export type GlossaryEntry = { word: string; meaning?: string };

// Caps. The glossary is user-typed and rides on every request, so it is
// bounded here rather than trusted anywhere downstream.
const MAX_ENTRIES = 50;
const MAX_WORD_CHARS = 80;
const MAX_MEANING_CHARS = 160;

function cleanField(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

/**
 * Coerce anything at all (a request body, a parsed JSON blob, UI rows) into
 * safe entries. Non-arrays, non-objects, non-strings and blank words are
 * dropped rather than thrown on: a malformed glossary must never fail a
 * ramble. An empty meaning is dropped entirely, never sent as "".
 */
export function normalizeGlossary(value: unknown): GlossaryEntry[] {
  if (!Array.isArray(value)) return [];
  const out: GlossaryEntry[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const word = cleanField((raw as { word?: unknown }).word, MAX_WORD_CHARS);
    if (!word) continue;
    const meaning = cleanField(
      (raw as { meaning?: unknown }).meaning,
      MAX_MEANING_CHARS,
    );
    out.push(meaning ? { word, meaning } : { word });
    if (out.length >= MAX_ENTRIES) break;
  }
  return out;
}

/**
 * Legacy shape: one flat, comma-separated spelling list with no meanings
 * attached. Old clients and anything saved before "Your words" still send it,
 * so it stays readable forever. Each word becomes a meaning-less entry, which
 * is still a spelling to honor.
 */
export function parseLegacyVocabulary(vocabulary: unknown): GlossaryEntry[] {
  if (typeof vocabulary !== "string") return [];
  return normalizeGlossary(vocabulary.split(",").map((word) => ({ word })));
}

/**
 * The one way to read a glossary off any input: prefer structured entries,
 * fall back to a legacy flat string. Never throws, always returns an array.
 */
export function resolveGlossary(
  glossary: unknown,
  vocabulary?: unknown,
): GlossaryEntry[] {
  const entries = normalizeGlossary(glossary);
  return entries.length ? entries : parseLegacyVocabulary(vocabulary);
}

/** Just the terms, comma joined — used to bias transcription up front. */
export function glossaryWords(entries: GlossaryEntry[]): string {
  return entries.map((entry) => entry.word).join(", ");
}

/** Tolerant JSON parse for glossaries arriving as a form-data string. */
export function parseGlossaryJson(value: unknown): GlossaryEntry[] {
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    return normalizeGlossary(JSON.parse(value));
  } catch {
    return [];
  }
}
