import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/lib/providers";
import { MAX_UPLOAD_BYTES } from "@/lib/config";
import { stripBanned } from "@/lib/sanitize";

export const runtime = "nodejs";
// Audio is never persisted — it lives only in memory for the request.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const audio = form.get("audio");
    const vocabulary = (form.get("vocabulary") as string | null) || undefined;

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
      vocabulary,
    });

    return NextResponse.json({ transcript: stripBanned(transcript) });
  } catch (err) {
    console.error("[transcribe] error:", err);
    return NextResponse.json(
      { error: "Transcription failed. Please try again." },
      { status: 500 },
    );
  }
}
