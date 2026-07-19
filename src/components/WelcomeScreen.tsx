"use client";

import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import { BabbleWave } from "./BabbleText";

// First-run orientation. Shown once, right after a new account's first sign-in
// (gated on user_metadata.onboarded in RambleBabbleRoot), and re-openable from
// Settings. It paints entirely on the black CANVAS using only the c* / canvas /
// accentOnCanvas tokens, which are identical in Day and Night, so it renders the
// same and clears AA in both themes. The ONLY gradient on this screen is the
// RambleBabble wordmark itself; the Let's go button is solid violet.

// Copy lives in constants (not inline JSX) so the apostrophes and quotes need no
// escaping and stay verbatim. Approved copy, no em dashes.
const HEADLINE = "You talk like a hurricane. Good. That's the whole point.";

const BLOCKS: { label: string; body: string }[] = [
  {
    label: "What this is",
    body:
      "You ramble. Out loud, half asleep, three tangents deep, contradicting yourself twice with the actual point buried somewhere in the middle. RambleBabble digs out what you meant and hands it back clean, said once, like someone who has their act together. Or, if you're feeling feral, it hands it back as a country song. Your call, every time.",
  },
  {
    label: "Frame it and it lands",
    body:
      "The more you set the scene, the harder it hits. Don't just dump words. Tell it what you're doing. \"This is a text to my boss asking for Friday off.\" \"This is me apologizing to my sister, and I need to grovel.\" Frame it and the output fits. Skip the frame and you get something technically fine and completely useless.",
  },
  {
    label: "Your voice memos never get saved",
    body:
      "We do not keep your audio. Ever. The moment your voice becomes text, the recording is gone. Only the cleaned-up transcript lands in My Rambles, and only you can see it. Say whatever you need to. Nobody is keeping the tape.",
  },
  {
    label: "How to drive it",
    body:
      "Step one, pick a format. That's what it becomes: an email, a to-do list, a breakup text you'll regret. Step two is optional. Stack something on top: a tone, a character, an accent. Sultry cowboy. Passive-aggressive Shakespeare. Or leave it plain, we won't judge, much. Then hit Babble it and watch your mess turn into something you'd actually send.",
  },
];

const EMAIL_LABEL = "One thing before you're in";
const EMAIL_BODY =
  "Drop your email below. A real one. It's how we reach you when something breaks, when there's something worth your time, and how we hold your spot. Required, because a beta with no way to reach its people is just an expensive diary.";
const FOOTNOTE = "You can pull this back up any time from Settings.";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function WelcomeScreen({
  user,
  dismissible = false,
  onDone,
}: {
  user: User;
  /** True when re-opened from Settings: a Close control shows and the email
   *  is not forced (the user has already onboarded). */
  dismissible?: boolean;
  onDone: (updatedUser?: User) => void;
}) {
  // Prefill with the real email if the account has one. Username sign-ups carry
  // a synthetic "<name>@ramblebabble.app" that is not a real address, so skip it.
  const meta = (user.user_metadata ?? {}) as { contact_email?: string };
  const emailFromAuth =
    user.email && !user.email.endsWith("@ramblebabble.app") ? user.email : "";
  const [email, setEmail] = useState(meta.contact_email || emailFromAuth || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = EMAIL_RE.test(email.trim());

  const submit = async () => {
    if (!valid) {
      setError("Enter a real email so we can actually reach you.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const { data, error: upErr } = await getSupabase().auth.updateUser({
        data: { contact_email: email.trim().toLowerCase(), onboarded: true },
      });
      if (upErr) throw upErr;
      onDone(data.user ?? undefined);
    } catch {
      setSaving(false);
      setError("That didn't save. Give it another shot in a second.");
    }
  };

  return (
    <div
      data-theme="night"
      className="min-h-screen w-full"
      style={{ background: "var(--canvas)", color: "var(--cInk)" }}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-[680px] flex-col px-6 py-12 sm:px-8 sm:py-16">
        {/* Wordmark. The gradient BABBLE is the ONE allowed gradient here. */}
        <div className="mb-10 flex items-center gap-2 text-[22px] font-bold">
          <span style={{ color: "var(--cInk)" }}>Ramble</span>
          <BabbleWave />
        </div>

        {dismissible && (
          <button
            onClick={() => onDone()}
            aria-label="Close"
            className="font-mono-label mb-6 self-start text-[12px] font-bold uppercase tracking-[0.12em] transition"
            style={{ color: "var(--cDim)" }}
          >
            &larr; Back to the workspace
          </button>
        )}

        <h1 className="text-[30px] font-bold leading-[1.12] sm:text-[38px]">
          {HEADLINE}
        </h1>

        <div className="mt-9 flex flex-col gap-8">
          {BLOCKS.map((b) => (
            <section key={b.label}>
              <h2
                className="text-[16px] font-bold sm:text-[17px]"
                style={{ color: "var(--accentOnCanvas)" }}
              >
                {b.label}
              </h2>
              <p
                className="mt-2 text-[16px] leading-[1.6] sm:text-[17px]"
                style={{ color: "var(--cInk)" }}
              >
                {b.body}
              </p>
            </section>
          ))}

          {/* Email capture */}
          <section>
            <h2
              className="text-[16px] font-bold sm:text-[17px]"
              style={{ color: "var(--accentOnCanvas)" }}
            >
              {EMAIL_LABEL}
            </h2>
            <p
              className="mt-2 text-[16px] leading-[1.6] sm:text-[17px]"
              style={{ color: "var(--cInk)" }}
            >
              {EMAIL_BODY}
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
                placeholder="you@email.com"
                className="rb-welcome-input flex-1 px-4 py-3 text-[16px] outline-none"
                style={{
                  background: "transparent",
                  color: "var(--cInk)",
                  border: "1px solid var(--cLineStrong)",
                }}
              />
              <button
                onClick={submit}
                disabled={saving || (!dismissible && !valid)}
                className="whitespace-nowrap px-7 py-3 text-[15px] font-bold transition hover:brightness-[1.08] active:translate-y-px"
                style={{
                  background: "var(--accentOnCanvas)",
                  color: "#070809",
                  opacity: !saving && !dismissible && !valid ? 0.5 : 1,
                }}
              >
                {saving ? "Saving..." : dismissible ? "Save and close" : "Let's go"}
              </button>
            </div>
            {error && (
              <p className="mt-3 text-[14px]" style={{ color: "#ff5a3c" }}>
                {error}
              </p>
            )}
          </section>
        </div>

        <p
          className="mt-12 text-[13px]"
          style={{ color: "var(--cDim)" }}
        >
          {FOOTNOTE}
        </p>
      </div>
    </div>
  );
}
