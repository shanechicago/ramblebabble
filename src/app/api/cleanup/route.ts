import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/lib/providers";
import { getOutputType, getTone } from "@/lib/options";
import { stripBanned, stripBannedList } from "@/lib/sanitize";

export const runtime = "nodejs";

const MAX_CHARS = 20000;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      transcript?: string;
      outputType?: string;
      customInstruction?: string;
      tone?: string;
      vocabulary?: string;
      modifier?: string;
    };

    const transcript = (body.transcript || "").trim();
    if (!transcript) {
      return NextResponse.json(
        { error: "There's no text to clean up yet." },
        { status: 400 },
      );
    }
    if (transcript.length > MAX_CHARS) {
      return NextResponse.json(
        { error: "That's a lot of text — please trim it down a bit." },
        { status: 413 },
      );
    }

    const tone = getTone(body.tone || "");
    if (!tone) {
      return NextResponse.json({ error: "Invalid tone." }, { status: 400 });
    }

    // Resolve the output instruction + kind. "custom" lets the user type their
    // own target format (e.g. "a wedding toast").
    // A character voice (fun tone) makes the whole thing playful, even on a
    // serious format.
    const funTone = tone.group === "fun";
    let outputInstruction: string;
    let kind: "work" | "fun";
    if (body.outputType === "custom") {
      const custom = (body.customInstruction || "").trim();
      if (!custom) {
        return NextResponse.json(
          { error: "Tell us what to turn it into." },
          { status: 400 },
        );
      }
      outputInstruction = `Rewrite this as: ${custom}. Produce exactly that, formatted appropriately.`;
      kind = funTone ? "fun" : "work";
    } else {
      const outputType = getOutputType(body.outputType || "");
      if (!outputType) {
        return NextResponse.json(
          { error: "Invalid output type." },
          { status: 400 },
        );
      }
      outputInstruction = outputType.instruction;
      kind = outputType.group === "fun" || funTone ? "fun" : "work";
    }

    const provider = getProvider();
    const result = await provider.cleanup({
      transcript,
      outputInstruction,
      toneInstruction: tone.instruction,
      vocabulary: body.vocabulary,
      kind,
      modifier: typeof body.modifier === "string" ? body.modifier : undefined,
    });

    // Hard-enforce the non-negotiable rules (no em dashes, no emojis).
    return NextResponse.json({
      cleaned: stripBanned(result.cleaned),
      keyPoints: stripBannedList(result.keyPoints),
      followUps: stripBannedList(result.followUps),
    });
  } catch (err) {
    console.error("[cleanup] error:", err);
    return NextResponse.json(
      { error: "Cleanup failed. Please try again." },
      { status: 500 },
    );
  }
}
