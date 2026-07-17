import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/lib/providers";
import { getOutputType, getTone, getAccent, getPersona } from "@/lib/options";
import { stripBanned, stripBannedList, stripMarkdown } from "@/lib/sanitize";
import { resolveGlossary } from "@/lib/glossary";
import { RATE_LIMIT_MESSAGE } from "@/lib/config";
import { getClientIp, checkRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const MAX_CHARS = 20000;

export async function POST(req: NextRequest) {
  const { allowed } = await checkRateLimit(getClientIp(req));
  if (!allowed) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  try {
    const body = (await req.json()) as {
      transcript?: string;
      outputType?: string;
      customInstruction?: string;
      tone?: string;
      accent?: string;
      persona?: string;
      targetLanguage?: string;
      // "Your words": the speaker's own terms. Typed as unknown because it is
      // untrusted client input; resolveGlossary validates and caps it.
      glossary?: unknown;
      // Legacy flat spelling list, still accepted from older clients.
      vocabulary?: string;
      cleanProfanity?: boolean;
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
        { error: "That's a lot of text, please trim it down a bit." },
        { status: 413 },
      );
    }

    // The four optional voice axes. Any combination is allowed; an accent or a
    // persona makes the whole thing playful ("fun").
    const tone = body.tone ? getTone(body.tone) : undefined;
    const accent = body.accent ? getAccent(body.accent) : undefined;
    const persona = body.persona ? getPersona(body.persona) : undefined;
    const hasCharacter = !!accent || !!persona;

    // Resolve the output format. "custom" lets the user type their own target.
    let outputInstruction: string;
    let formatIsFun = false;
    if (body.outputType === "custom") {
      const custom = (body.customInstruction || "").trim();
      if (!custom) {
        return NextResponse.json(
          { error: "Tell us what to turn it into." },
          { status: 400 },
        );
      }
      outputInstruction = `Rewrite this as: ${custom}. Produce exactly that, formatted appropriately.`;
    } else {
      const outputType = getOutputType(body.outputType || "");
      if (!outputType) {
        return NextResponse.json(
          { error: "Invalid output type." },
          { status: 400 },
        );
      }
      outputInstruction = outputType.instruction;
      formatIsFun = outputType.group === "fun";
    }

    // Spicy / expressive tones (flirty, sultry, naughty, dramatic, ...) are
    // creative work too: route them through the high-variance "fun" path so
    // they get real heat and the FUN MODE license, not the tame work register.
    const EXPRESSIVE_TONES = new Set([
      "flirty",
      "romantic",
      "seductive",
      "sultry",
      "steamy",
      "naughty",
      "dramatic",
    ]);
    const toneIsExpressive = !!body.tone && EXPRESSIVE_TONES.has(body.tone);
    const kind: "work" | "fun" =
      formatIsFun || hasCharacter || toneIsExpressive ? "fun" : "work";

    // Structured entries win. A request carrying only the legacy flat
    // vocabulary string (an old client, a saved ramble) is split on commas
    // into meaning-less entries, so it keeps working exactly as before.
    // Malformed input never throws here: it resolves to an empty glossary.
    const glossary = resolveGlossary(body.glossary, body.vocabulary);

    const provider = getProvider();
    const result = await provider.cleanup({
      transcript,
      outputInstruction,
      toneInstruction: tone?.instruction,
      accentInstruction: accent?.instruction,
      personaInstruction: persona?.instruction,
      targetLanguage: body.targetLanguage?.trim() || undefined,
      glossary,
      kind,
      cleanProfanity: body.cleanProfanity === true,
      modifier: typeof body.modifier === "string" ? body.modifier : undefined,
    });

    // Hard-enforce the non-negotiable rules (no em dashes, no emojis, no
    // leaked Markdown) before anything reaches the user.
    return NextResponse.json({
      cleaned: stripBanned(stripMarkdown(result.cleaned)),
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
