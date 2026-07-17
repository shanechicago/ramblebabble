import OpenAI from "openai";
import { toFile } from "openai/uploads";
import type {
  AIProvider,
  CleanupInput,
  CleanupResult,
  TranscribeInput,
} from "./types";
import { CLEANUP_SYSTEM_PROMPT, buildCleanupUserMessage } from "../prompt";
import { glossaryWords, resolveGlossary } from "../glossary";

// OpenAI implementation of the provider interface.
// Models are overridable via env so we can tune without code changes.
const TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1";
const CLEANUP_MODEL = process.env.OPENAI_CLEANUP_MODEL || "gpt-4o-mini";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set on the server.");
  }
  // Lazily create one client per server process.
  if (!client) client = new OpenAI({ apiKey });
  return client;
}

export const openAIProvider: AIProvider = {
  name: "openai",

  async transcribe(input: TranscribeInput): Promise<string> {
    const openai = getClient();
    const file = await toFile(input.audio, input.filename, {
      type: input.mimeType,
    });

    // Bias Whisper toward the speaker's own terms up front, so the right
    // spelling lands in the transcript instead of being repaired later. Only
    // the WORDS matter here; the meanings are for the cleanup model. A legacy
    // flat vocabulary string still resolves to the same thing.
    const words = glossaryWords(
      resolveGlossary(input.glossary, input.vocabulary),
    );

    const res = await openai.audio.transcriptions.create({
      file,
      model: TRANSCRIBE_MODEL,
      // Biases the model toward these terms without storing anything.
      prompt: words || undefined,
    });

    return res.text?.trim() ?? "";
  },

  async cleanup(input: CleanupInput): Promise<CleanupResult> {
    const openai = getClient();

    const res = await openai.chat.completions.create({
      model: CLEANUP_MODEL,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: CLEANUP_SYSTEM_PROMPT },
        { role: "user", content: buildCleanupUserMessage(input) },
      ],
    });

    const raw = res.choices[0]?.message?.content ?? "{}";
    return parseCleanup(raw);
  },
};

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((p): p is string => typeof p === "string")
    .map((p) => p.trim())
    .filter(Boolean);
}

function parseCleanup(raw: string): CleanupResult {
  try {
    const parsed = JSON.parse(raw) as {
      cleaned?: unknown;
      keyPoints?: unknown;
      followUps?: unknown;
    };
    return {
      cleaned: typeof parsed.cleaned === "string" ? parsed.cleaned.trim() : "",
      keyPoints: parseStringArray(parsed.keyPoints),
      followUps: parseStringArray(parsed.followUps),
    };
  } catch {
    // If the model ever returns non-JSON, fall back to the raw text so the
    // user still gets something usable.
    return { cleaned: raw.trim(), keyPoints: [], followUps: [] };
  }
}
