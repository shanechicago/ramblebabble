import Anthropic from "@anthropic-ai/sdk";
import type {
  AIProvider,
  CleanupInput,
  CleanupResult,
  TranscribeInput,
} from "./types";
import { CLEANUP_SYSTEM_PROMPT, buildCleanupUserMessage } from "../prompt";

// Anthropic (Claude) implementation of the CLEANUP half of the provider
// interface. Claude is markedly stronger at humor, voice, and personas, so the
// playful "fun" outputs land much harder here. Transcription stays on OpenAI
// Whisper (see ./openai.ts) — this provider deliberately does not transcribe.
//
// Model is overridable via env so we can tune without code changes.
const CLEANUP_MODEL = process.env.ANTHROPIC_CLEANUP_MODEL || "claude-sonnet-4-6";

// A babble is short; 4096 tokens is ample headroom.
const MAX_TOKENS = 4096;

// Temperature is keyed to intent: "fun" wants wild, surprising, high-variance
// comedy; "work" wants tight, predictable, faithful prose.
const FUN_TEMPERATURE = 0.95;
const WORK_TEMPERATURE = 0.4;

// Schema-enforced JSON (Claude's equivalent of OpenAI's json_object mode).
// Guarantees the exact { cleaned, keyPoints, followUps } shape the rest of the
// app already expects — no assistant prefill needed (and prefill is rejected by
// current Claude models anyway).
const CLEANUP_SCHEMA = {
  type: "object",
  properties: {
    cleaned: { type: "string" },
    keyPoints: { type: "array", items: { type: "string" } },
    followUps: { type: "array", items: { type: "string" } },
  },
  required: ["cleaned", "keyPoints", "followUps"],
  additionalProperties: false,
};

let client: Anthropic | null = null;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set on the server.");
  }
  // Lazily create one client per server process.
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

export const anthropicProvider: AIProvider = {
  name: "anthropic",

  // Anthropic does not do speech-to-text. The registry in ./index.ts always
  // routes transcription to OpenAI Whisper, so this should never be called.
  // Fail loudly if the wiring ever regresses.
  async transcribe(_input: TranscribeInput): Promise<string> {
    throw new Error(
      "anthropicProvider.transcribe was called — transcription must use OpenAI Whisper.",
    );
  },

  async cleanup(input: CleanupInput): Promise<CleanupResult> {
    const anthropic = getClient();

    const res = await anthropic.messages.create({
      model: CLEANUP_MODEL,
      max_tokens: MAX_TOKENS,
      temperature: input.kind === "fun" ? FUN_TEMPERATURE : WORK_TEMPERATURE,
      // Reused, unchanged system prompt goes in the dedicated `system` slot.
      system: CLEANUP_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildCleanupUserMessage(input) }],
      // Force the exact JSON shape.
      output_config: {
        format: { type: "json_schema", schema: CLEANUP_SCHEMA },
      },
    });

    // With a json_schema format the first text block is valid JSON. On a rare
    // refusal it may be empty; parseCleanup handles that gracefully.
    const textBlock = res.content.find((b) => b.type === "text");
    const raw = textBlock && textBlock.type === "text" ? textBlock.text : "{}";
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
