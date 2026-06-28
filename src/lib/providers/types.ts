// Provider abstraction. The rest of the app (API routes, UI) depends only on
// these interfaces — never on a concrete vendor SDK. Add a new provider by
// implementing AIProvider and wiring it in ./index.ts.

export interface TranscribeInput {
  /** Raw audio bytes captured from the browser. */
  audio: Buffer;
  /** Original filename (extension matters to some STT APIs). */
  filename: string;
  /** MIME type of the audio, e.g. "audio/webm". */
  mimeType: string;
  /** Optional vocabulary to bias the transcription (brand names, jargon). */
  vocabulary?: string;
}

export interface CleanupInput {
  /** The raw transcript or pasted text to transform. */
  transcript: string;
  /** Instruction describing the desired output format. */
  outputInstruction: string;
  /** Instruction describing the desired tone. */
  toneInstruction: string;
  /** Optional terms to preserve or correct exactly. */
  vocabulary?: string;
  /** "work" = practical/useful output, "fun" = playful output. */
  kind: "work" | "fun";
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
