// Provider abstraction. The rest of the app (API routes, UI) depends only on
// these interfaces — never on a concrete vendor SDK. Add a new provider by
// implementing AIProvider and wiring it in ./index.ts.

import type { GlossaryEntry } from "../glossary";

export interface TranscribeInput {
  /** Raw audio bytes captured from the browser. */
  audio: Buffer;
  /** Original filename (extension matters to some STT APIs). */
  filename: string;
  /** MIME type of the audio, e.g. "audio/webm". */
  mimeType: string;
  /**
   * Legacy: a flat comma-separated spelling list. Kept so older clients keep
   * working; prefer `glossary`, which is what the app sends now.
   */
  vocabulary?: string;
  /** The speaker's own terms. Their WORDS bias the transcription up front. */
  glossary?: GlossaryEntry[];
}

export interface CleanupInput {
  /** The raw transcript or pasted text to transform. */
  transcript: string;
  /** Instruction describing the desired output format. */
  outputInstruction: string;
  /** Instruction describing the desired tone (register). */
  toneInstruction?: string;
  /** Optional dialect/accent instruction (how it should sound). */
  accentInstruction?: string;
  /** Optional persona/character instruction (who is saying it). */
  personaInstruction?: string;
  /** Optional target language for the output, e.g. "Spanish". */
  targetLanguage?: string;
  /**
   * Legacy: a flat comma-separated list of terms to preserve exactly. Kept for
   * backward compatibility; it is read only when `glossary` is absent.
   */
  vocabulary?: string;
  /**
   * The speaker's own terms, each an exact spelling plus optionally what it
   * means, so the model can tell their term from the ordinary word it sounds
   * like.
   */
  glossary?: GlossaryEntry[];
  /** "work" = practical/useful output, "fun" = playful output. */
  kind: "work" | "fun";
  /** When true, strip profanity from the output but keep the speaker's anger. */
  cleanProfanity?: boolean;
  /** Optional extra instruction, e.g. "make it wilder" or "make it shorter". */
  modifier?: string;
}

export interface CleanupResult {
  cleaned: string;
  /** Key points — empty for fun outputs or when not useful. */
  keyPoints: string[];
  /** Suggested next steps/replies for practical outputs. Empty for fun. */
  followUps: string[];
}

export interface AIProvider {
  readonly name: string;
  transcribe(input: TranscribeInput): Promise<string>;
  cleanup(input: CleanupInput): Promise<CleanupResult>;
}
