import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/lib/providers";
import { MAX_UPLOAD_BYTES, RATE_LIMIT_MESSAGE } from "@/lib/config";
import { getClientIp, checkRateLimit } from "@/lib/ratelimit";
import { stripBanned } from "@/lib/sanitize";
import { parseGlossaryJson, resolveGlossary } from "@/lib/glossary";

export const runtime = "nodejs";
// Audio is never persisted — it lives only in memory for the request.
export const dynamic = "force-dynamic";

// Whisper hallucinates stock phrases on silent or near-empty audio (it learned
// them from millions of video endings). Drop those so they never reach the user.
const SILENCE_HALLUCINATIONS = new Set([
  "you",
  "thank you",
  "thanks",
  "thank you for watching",
  "thanks for watching",
  "thank you for watching!",
  "thank you so much for watching",
  "please subscribe",
  "subscribe",
  "like and subscribe",
  "bye",
  "ご視聴ありがとうございました",
  "ご視聴ありがとうございます",
  "おやすみなさい",
  "字幕",
]);

function stripHallucinations(text: string): string {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const kept = lines.filter(
    (l) =>
      !SILENCE_HALLUCINATIONS.has(l.toLowerCase().replace(/[.!?！？。]+$/g, "")),
  );
  return kept.join("\n").trim();
}

export async function POST(req: NextRequest) {
  const { allowed } = await checkRateLimit(getClientIp(req));
  if (!allowed) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  try {
    const form = await req.formData();
    const audio = form.get("audio");
    // "Your words" rides along as JSON so the same validation covers both
    // routes; only the words are used to bias transcription. An older client
    // sending the flat "vocabulary" string still resolves to the same entries.
    const glossary = resolveGlossary(
      parseGlossaryJson(form.get("glossary")),
      form.get("vocabulary"),
    );

    if (!(audio instanceof File)) {
      return NextResponse.json(
        { error: "No audio file was provided." },
        { status: 400 },
      );
    }
    if (audio.size === 0) {
      return NextResponse.json(
        { error: "The recording was empty." },
        { status: 400 },
      );
    }
    if (audio.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          error:
            "That recording is too large to send. Please record a shorter ramble.",
        },
        { status: 413 },
      );
    }

    const buffer = Buffer.from(await audio.arrayBuffer());
    const provider = getProvider();
    const transcript = await provider.transcribe({
      audio: buffer,
      filename: audio.name || "audio.webm",
      mimeType: audio.type || "audio/webm",
      glossary,
    });

    return NextResponse.json({
      transcript: stripBanned(stripHallucinations(transcript)),
    });
  } catch (err) {
    console.error("[transcribe] error:", err);
    return NextResponse.json(
      { error: "Transcription failed. Please try again." },
      { status: 500 },
    );
  }
}
