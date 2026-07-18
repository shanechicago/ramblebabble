"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRecorder } from "./useRecorder";
import { getSupabase } from "@/lib/supabase/client";
import { BabbleWave } from "./BabbleText";
import type { SavedRamble } from "./MyRambles";
import {
  OUTPUT_TYPES,
  TONES,
  ACCENTS,
  PERSONAS,
  getAccent,
  getPersona,
  USEFUL_GROUPS,
  FUN_GROUPS,
  TONE_GROUPS,
  ACCENT_GROUPS,
  PERSONA_GROUPS,
  type Option,
  type OptionGroup,
} from "@/lib/options";
import {
  MAX_RECORDING_SECONDS,
  WARNING_AT_SECONDS,
  MAX_UPLOAD_BYTES,
  WARNING_MESSAGE,
  LIMIT_REACHED_MESSAGE,
  TOO_LARGE_MESSAGE,
} from "@/lib/config";
import type { GlossaryEntry } from "@/lib/glossary";
import { ACCENT, BUTTON_GRADIENT, ON_GRADIENT } from "@/lib/brand";

// Brand constants live in @/lib/brand. The accent is VIOLET (#7b5cff). Accent as
// TEXT/ICON never uses the raw fill: on the dark canvas it routes to
// t.accentOnCanvas, inside a light panel to t.accentOnPanel, both solved for AA.
// The primary "Babble it" wears BUTTON_GRADIENT with the near-black ON_GRADIENT
// label (white fails on the gradient and on the solid violet). No electric blue
// anywhere. Pink and coral survive only inside the brand gradient.

// The signature reveal: a full-length block of noise that resolves left to
// right into the real text. Straight from the design prototype.
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@$%&*<>/+=~";
const SCRAMBLE_STEP = 6; // characters resolved per tick
const SCRAMBLE_TICK = 26; // ms between ticks

/** One frame of the decode: everything before `p` is real, the rest is noise.
 *  Whitespace is never scrambled, so the block keeps the shape of the final
 *  text from the very first frame and nothing reflows as it resolves. */
function scrambleFrame(full: string, p: number): string {
  let out = "";
  for (let i = 0; i < full.length; i++) {
    const c = full[i];
    if (i < p) out += c;
    else if (c === " " || c === "\n") out += c;
    else out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
  }
  return out;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// The rotating set shown while babbling (and while transcribing). Verbatim from
// the brief.
const FUN_LOADING = [
  "Untangling your bullshit",
  "Finding your actual point",
  "Making you sound employed",
  "Translating from drunk",
  "Cutting three of your five tangents",
  "Putting pants on it",
  "Doing the part your brain skipped",
];
function pickLoading() {
  return FUN_LOADING[Math.floor(Math.random() * FUN_LOADING.length)];
}

const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Italian",
  "Dutch",
  "Russian",
  "Arabic",
  "Hindi",
  "Mandarin Chinese",
  "Japanese",
  "Korean",
  "Vietnamese",
  "Tagalog",
];

// ONE theme system. The real theme lives in CSS variables under data-theme
// (globals.css). This map is STATIC: every token is a CSS variable, so all the
// inline `t.token` styles below read the live per-theme value. Switching the
// theme flips the data-theme attribute, not this object.
//
// Two text scales: `cInk`/`cDim` sit on the black CANVAS; `ink`/`inkDim`/
// `inkFaint` sit inside a PANEL. In Day those two scales are near opposites.
type Theme = "night" | "day";
const t = {
  canvas: "var(--canvas)",
  chrome: "var(--chrome)",
  cInk: "var(--cInk)",
  cDim: "var(--cDim)",
  cLine: "var(--cLine)",
  cLineStrong: "var(--cLineStrong)",
  panel: "var(--panel)",
  panel2: "var(--panel2)",
  ink: "var(--ink)",
  inkDim: "var(--inkDim)",
  inkFaint: "var(--inkFaint)",
  line: "var(--line)",
  lineStrong: "var(--lineStrong)",
  accentOnPanel: "var(--accentOnPanel)",
  accentOnCanvas: "var(--accentOnCanvas)",
} as const;
type T = typeof t;

function formatTime(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// "Your words" rows. The UI always holds both fields as strings (controlled
// inputs); the wire shape drops a blank meaning entirely.
type GlossaryRow = { word: string; meaning: string };
const EMPTY_GLOSSARY: GlossaryRow[] = [{ word: "", meaning: "" }];

/** Rows -> what we send: a word is required, a blank meaning is left off. */
function toGlossaryEntries(rows: GlossaryRow[]): GlossaryEntry[] {
  const entries: GlossaryEntry[] = [];
  for (const row of rows) {
    const word = row.word.trim();
    if (!word) continue;
    const meaning = row.meaning.trim();
    entries.push(meaning ? { word, meaning } : { word });
  }
  return entries;
}

export default function RambleBabbleApp({
  userId,
  userEmail,
  onOpenHistory,
  onSignOut,
  reopen,
}: {
  userId: string;
  userEmail: string;
  onOpenHistory: () => void;
  onSignOut: () => void;
  reopen: SavedRamble | null;
}) {
  const [theme, setTheme] = useState<Theme>("night");
  useEffect(() => {
    if (typeof document !== "undefined")
      document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Display name + initial for the account avatar (from the signed-in user).
  const accountName = (userEmail || "").split("@")[0] || "you";
  const accountInitial = (accountName[0] || "Y").toUpperCase();

  const [inputText, setInputText] = useState(reopen?.transcript ?? "");
  const [outputType, setOutputType] = useState(reopen?.output_type ?? "note");
  const [tone, setTone] = useState(reopen?.tone ?? "");
  const [glossary, setGlossary] = useState<GlossaryRow[]>(EMPTY_GLOSSARY);
  const [accent, setAccent] = useState("");
  const [persona, setPersona] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("");
  const [customInstruction, setCustomInstruction] = useState("");
  // Default: keep the speaker's swearing verbatim. Toggle "Clean it up" to strip
  // the curse words while keeping the anger.
  const [cleanProfanity, setCleanProfanity] = useState(false);

  // Which numbered accordion is open. Sections 1 (format) and 2 (stack) collapse;
  // 3 (dump) and 4 (goods) are always open. Only one of 1/2 open at a time.
  const [openSection, setOpenSection] = useState<1 | 2 | null>(null);

  const [cleaned, setCleaned] = useState(reopen?.cleaned ?? "");
  // Bumped on every new result so the decode replays even when the engine hands
  // back the exact same text.
  const [revealKey, setRevealKey] = useState(0);
  const [revealText, setRevealText] = useState(reopen?.cleaned ?? "");
  const [settled, setSettled] = useState(!!reopen?.cleaned);
  const [keyPoints, setKeyPoints] = useState<string[]>(reopen?.key_points ?? []);
  const [followUps, setFollowUps] = useState<string[]>(reopen?.follow_ups ?? []);
  const [keyOpen, setKeyOpen] = useState(true);
  const [followOpen, setFollowOpen] = useState(false);

  const [transcribing, setTranscribing] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [loadingWord, setLoadingWord] = useState("Babbling");
  const [error, setError] = useState<string | null>(null);
  const [limitNotice, setLimitNotice] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState("Copy");
  const [saveLabel, setSaveLabel] = useState("Save to My Rambles");
  const [accountOpen, setAccountOpen] = useState(false);
  const [overlay, setOverlay] = useState<"settings" | "upgrade" | null>(null);

  const revealRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const goodsRef = useRef<HTMLDivElement>(null);

  // THE SCRAMBLE-DECODE. The engine's real text arrives all at once; this turns
  // it into the signature reveal: a full-length block of noise resolves left to
  // right at 6 characters every 26ms, then settles. Cleared on unmount, on
  // Clear, and before every new run, so a fast second Babble can never leave two
  // decoders fighting over one panel.
  useEffect(() => {
    const stop = () => {
      if (revealRef.current) {
        clearInterval(revealRef.current);
        revealRef.current = null;
      }
    };
    stop();

    if (!cleaned) {
      setRevealText("");
      setSettled(false);
      return;
    }
    if (prefersReducedMotion()) {
      setRevealText(cleaned);
      setSettled(true);
      return;
    }

    setSettled(false);
    setRevealText(scrambleFrame(cleaned, 0));
    let p = 0;
    revealRef.current = setInterval(() => {
      p += SCRAMBLE_STEP;
      if (p >= cleaned.length) {
        stop();
        setRevealText(cleaned);
        setSettled(true);
        return;
      }
      setRevealText(scrambleFrame(cleaned, p));
    }, SCRAMBLE_TICK);

    return stop;
  }, [cleaned, revealKey]);

  // Cursor spotlight (editorial signature), a violet halo (the accent).
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const root = document.documentElement;
      root.style.setProperty("--mx", `${e.clientX}px`);
      root.style.setProperty("--my", `${e.clientY}px`);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // Auto-dismiss the error toast after a few seconds.
  useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(id);
  }, [error]);

  // iOS Safari can restore focus to the ramble textarea from the back/forward
  // cache, popping the on-screen keyboard on load. Always land with the keyboard
  // dismissed so the controls are visible from the start.
  useEffect(() => {
    const dismissKeyboard = () => {
      const el = document.activeElement as HTMLElement | null;
      if (el && el.tagName === "TEXTAREA") el.blur();
    };
    dismissKeyboard();
    window.addEventListener("pageshow", dismissKeyboard);
    return () => window.removeEventListener("pageshow", dismissKeyboard);
  }, []);

  // The ramble box GROWS with its content instead of scrolling inside itself
  // (layout contract rule 1). Re-fit whenever the value changes from anywhere,
  // including a transcription landing or a reopened ramble, so the PAGE scrolls
  // and the textarea never shows its own scrollbar.
  const fitInput = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    // box-sizing is border-box, so add the border back or the box lands a
    // border-width short and scrollHeight stays > clientHeight.
    const borderY = el.offsetHeight - el.clientHeight;
    el.style.height = `${el.scrollHeight + borderY}px`;
  }, []);
  useEffect(() => {
    fitInput();
  }, [inputText, fitInput]);
  useEffect(() => {
    window.addEventListener("resize", fitInput);
    return () => window.removeEventListener("resize", fitInput);
  }, [fitInput]);

  const transcribeBlob = useCallback(
    async (blob: Blob | null) => {
      if (!blob || blob.size === 0) {
        setError("That was silence. Beautiful, useless silence. Make some noise this time.");
        return;
      }
      if (blob.size > MAX_UPLOAD_BYTES) {
        setError(TOO_LARGE_MESSAGE);
        return;
      }
      setLoadingWord(pickLoading());
      setTranscribing(true);
      try {
        const form = new FormData();
        const ext = blob.type.includes("mp4") ? "mp4" : "webm";
        form.append("audio", blob, `ramble.${ext}`);
        const entries = toGlossaryEntries(glossary);
        if (entries.length) form.append("glossary", JSON.stringify(entries));
        const res = await fetch("/api/transcribe", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Transcription failed.");
        setInputText((prev) =>
          prev.trim() ? `${prev.trim()}\n\n${data.transcript}` : data.transcript,
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Couldn't hear you. The mic's being dramatic, or you were. Try again.",
        );
      } finally {
        setTranscribing(false);
      }
    },
    [glossary],
  );

  const handleAutoStop = useCallback(
    (blob: Blob | null) => {
      setLimitNotice(LIMIT_REACHED_MESSAGE);
      void transcribeBlob(blob);
    },
    [transcribeBlob],
  );

  const recorder = useRecorder({ onAutoStop: handleAutoStop });

  const recording = recorder.status === "recording";
  const showWarning = recording && recorder.seconds >= WARNING_AT_SECONDS;

  const selectedStyle =
    outputType === "custom"
      ? { label: "Something else" }
      : OUTPUT_TYPES.find((o) => o.id === outputType);
  const selectedFormat = OUTPUT_TYPES.find((o) => o.id === outputType);
  const formatHint = selectedFormat?.example ?? selectedFormat?.hint;
  const selectedTone = TONES.find((x) => x.id === tone);
  const selectedAccent = getAccent(accent);
  const selectedPersona = getPersona(persona);

  const formatName =
    outputType === "custom" ? "Something else" : selectedStyle?.label ?? "";
  const stackSummary = [
    selectedTone?.label,
    selectedPersona?.label,
    selectedAccent?.label,
    targetLanguage,
  ]
    .filter(Boolean)
    .join(", ");

  const handleStart = useCallback(() => {
    setError(null);
    setLimitNotice(null);
    void recorder.start();
  }, [recorder]);

  const handleStop = useCallback(async () => {
    setError(null);
    setLimitNotice(null);
    const blob = await recorder.stop();
    await transcribeBlob(blob);
  }, [recorder, transcribeBlob]);

  const clearRamble = useCallback(() => {
    if (recorder.status === "recording") recorder.cancel();
    setInputText("");
    setError(null);
    setLimitNotice(null);
  }, [recorder]);

  const runCleanup = useCallback(
    async (modifier?: string) => {
      if (!inputText.trim()) {
        setError("There's nothing here. Say literally anything. A grocery list, a threat, I don't care.");
        return;
      }
      if (!outputType) {
        setError("Pick a format first. I'm not a mind reader, I'm barely a word reader.");
        return;
      }
      if (outputType === "custom" && !customInstruction.trim()) {
        setError("You picked 'something else' and then said nothing else. Finish the sentence.");
        return;
      }
      const selected = OUTPUT_TYPES.find((o) => o.id === outputType);
      const kind: "work" | "fun" =
        selected?.group === "fun" || !!accent || !!persona ? "fun" : "work";
      const label =
        outputType === "custom"
          ? customInstruction.trim()
          : (selected?.label ?? "");

      setError(null);
      setCopyLabel("Copy");
      setLoadingWord(pickLoading());
      setCleaning(true);
      const glossaryEntries = toGlossaryEntries(glossary);
      try {
        const res = await fetch("/api/cleanup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: inputText,
            outputType,
            customInstruction:
              outputType === "custom" ? customInstruction.trim() : undefined,
            tone,
            accent: accent || undefined,
            persona: persona || undefined,
            targetLanguage: targetLanguage || undefined,
            glossary: glossaryEntries.length ? glossaryEntries : undefined,
            cleanProfanity,
            modifier,
          }),
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(
            data.error ||
              "It broke. Could be us, could be the void. Hit it again and we'll both pretend that didn't happen.",
          );
        const out = data.cleaned || "";
        setCleaned(out);
        setKeyPoints(Array.isArray(data.keyPoints) ? data.keyPoints : []);
        setFollowUps(Array.isArray(data.followUps) ? data.followUps : []);
        setKeyOpen(true);
        setFollowOpen(true);
        setRevealKey((k) => k + 1);
        if (!modifier) {
          // The Supabase builder is lazy: .then here is what sends the insert.
          getSupabase()
            .from("rambles")
            .insert({
              user_id: userId,
              transcript: inputText,
              output_type: outputType,
              output_label: label,
              tone,
              cleaned: out,
              key_points: Array.isArray(data.keyPoints) ? data.keyPoints : [],
              follow_ups: Array.isArray(data.followUps) ? data.followUps : [],
              is_fun: kind === "fun",
            })
            .then(({ error: saveError }) => {
              if (saveError)
                console.error("[rambles] save failed:", saveError.message);
            });
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "It broke. Could be us, could be the void. Hit it again and we'll both pretend that didn't happen.",
        );
      } finally {
        setCleaning(false);
      }
    },
    [
      inputText,
      outputType,
      customInstruction,
      tone,
      accent,
      persona,
      targetLanguage,
      glossary,
      cleanProfanity,
      userId,
    ],
  );

  const handleCopy = useCallback(async () => {
    if (!cleaned) return;
    try {
      await navigator.clipboard.writeText(cleaned);
      setCopyLabel("Copied");
      setTimeout(() => setCopyLabel("Copy"), 1600);
    } catch {
      setError("Your clipboard said no. Even it has boundaries, apparently.");
    }
  }, [cleaned]);

  // Save to My Rambles: persist the CURRENT result (handy after a Regenerate,
  // which re-runs with a modifier and deliberately does not auto-save). Uses the
  // same insert shape as the auto-save in runCleanup.
  const handleSave = useCallback(() => {
    if (!cleaned) return;
    const selected = OUTPUT_TYPES.find((o) => o.id === outputType);
    const kind: "work" | "fun" =
      selected?.group === "fun" || !!accent || !!persona ? "fun" : "work";
    const label =
      outputType === "custom" ? customInstruction.trim() : (selected?.label ?? "");
    getSupabase()
      .from("rambles")
      .insert({
        user_id: userId,
        transcript: inputText,
        output_type: outputType,
        output_label: label,
        tone,
        cleaned,
        key_points: keyPoints,
        follow_ups: followUps,
        is_fun: kind === "fun",
      })
      .then(({ error: saveError }) => {
        if (saveError) {
          console.error("[rambles] save failed:", saveError.message);
          setError("Couldn't save that one. Give it another shot in a sec.");
        } else {
          setSaveLabel("Saved");
          setTimeout(() => setSaveLabel("Save to My Rambles"), 1600);
        }
      });
  }, [
    cleaned,
    outputType,
    accent,
    persona,
    customInstruction,
    userId,
    inputText,
    tone,
    keyPoints,
    followUps,
  ]);

  // New ramble: wipe the workspace and start fresh.
  const handleClear = useCallback(() => {
    if (recorder.status === "recording") recorder.cancel();
    setInputText("");
    setGlossary(EMPTY_GLOSSARY);
    setCustomInstruction("");
    setCleaned("");
    setKeyPoints([]);
    setFollowUps([]);
    setError(null);
    setLimitNotice(null);
  }, [recorder]);

  // "Your words" rows.
  const setGlossaryField = (
    index: number,
    field: keyof GlossaryRow,
    value: string,
  ) =>
    setGlossary((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  const addGlossaryRow = () =>
    setGlossary((rows) => [...rows, { word: "", meaning: "" }]);
  const removeGlossaryRow = (index: number) =>
    setGlossary((rows) =>
      rows.length > 1 ? rows.filter((_, i) => i !== index) : EMPTY_GLOSSARY,
    );
  const glossaryIsEmpty =
    glossary.length === 1 &&
    !glossary[0].word.trim() &&
    !glossary[0].meaning.trim();

  // Surprise me: randomize TONE, CHARACTER, ACCENT only (never the format).
  const surprise = () => {
    const pick = (arr: Option[]) => arr[Math.floor(Math.random() * arr.length)].id;
    setTone(pick(TONES));
    setPersona(pick(PERSONAS));
    setAccent(pick(ACCENTS));
  };

  const words = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const hasResult = !!cleaned;
  const canBabble = !!outputType && !!inputText.trim();

  // On mobile the goods sit far below the fold, so once a Babble lands, glide
  // them into view. On tablet/desktop it's already visible, so do nothing.
  useEffect(() => {
    if (!hasResult) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 768px)").matches) return;
    goodsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hasResult, cleaning]);

  const navBtn = (label: string, active: boolean, onClick: () => void) => (
    <button
      onClick={onClick}
      className="font-mono-label text-[12px] font-bold uppercase tracking-[0.14em] transition"
      style={{ color: active ? t.cInk : t.cDim }}
    >
      {label}
    </button>
  );

  // Format-picker list (Section 1). Every OUTPUT_TYPE appears exactly once:
  // "note" under Just refine, the rest under their groups, plus a custom row.
  const pickFormat = (id: string) => {
    setOutputType(id);
    setOpenSection(null);
  };

  return (
    <div style={{ background: t.canvas, color: t.cInk, minHeight: "100vh" }}>
      {/* Error toast (fixed, above the sticky bar). Tap to dismiss. */}
      {error && (
        <button
          onClick={() => setError(null)}
          role="alert"
          className="rb-rise fixed bottom-24 left-1/2 z-[90] flex max-w-[92vw] -translate-x-1/2 items-center gap-2 px-5 py-3.5 text-left text-[16px] font-bold text-white"
          style={{
            // Darkened from #ff3b30 so the white 16px bold label clears AA
            // (5.25 vs the old 3.55). Still an unmistakable error red.
            background: "#cf2a1e",
            boxShadow: "0 16px 40px -10px rgba(207,42,30,0.6)",
          }}
        >
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center text-[13px]"
            style={{ background: "rgba(255,255,255,0.25)" }}
          >
            !
          </span>
          {error}
        </button>
      )}

      {/* Film grain: the editorial signature, over everything, catching nothing. */}
      <div aria-hidden className="rb-grain" />

      {/* Cursor spotlight: a violet halo on the black canvas, tracking the mouse.
          Sits behind the content (main is z-10). */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(440px circle at var(--mx,50%) var(--my,28%), rgba(123,92,255,0.16), transparent 64%)",
        }}
      />

      {/* STICKY TOP — the whole header stays put. */}
      <div
        className="sticky top-0 z-30"
        style={{
          background: t.chrome,
          backdropFilter: "blur(10px)",
          borderBottom: `1px solid ${t.cLine}`,
        }}
      >
        <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:px-8">
          <Wordmark color={t.cInk} />
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {navBtn("Home", true, () => {
              if (typeof window !== "undefined")
                window.scrollTo({ top: 0, behavior: "smooth" });
            })}
            {navBtn("My Rambles", false, onOpenHistory)}
            <button
              onClick={() => setOverlay("upgrade")}
              className="font-mono-label px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] transition hover:brightness-110 active:translate-y-px"
              style={{
                background: "transparent",
                border: `1px solid ${t.cLineStrong}`,
                color: t.cDim,
              }}
            >
              Upgrade
            </button>
            {/* Day / Night switch. */}
            <div
              className="flex items-center overflow-hidden"
              style={{ border: `1px solid ${t.cLineStrong}` }}
            >
              <button
                onClick={() => setTheme("day")}
                aria-label="Day mode"
                title="Day mode (light)"
                className="flex h-7 w-9 items-center justify-center transition"
                style={{
                  background: theme === "day" ? "#f3f5f7" : "transparent",
                  color: theme === "day" ? "#14161b" : t.cDim,
                  borderRight: `1px solid ${t.cLineStrong}`,
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 17a5 5 0 100-10 5 5 0 000 10zm0-13a1 1 0 011 1v1a1 1 0 11-2 0V5a1 1 0 011-1zm0 14a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM4 12a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm14 0a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1zM6.3 6.3a1 1 0 011.4 0l.7.7A1 1 0 117 8.4l-.7-.7a1 1 0 010-1.4zm9.6 9.6a1 1 0 011.4 0l.7.7a1 1 0 11-1.4 1.4l-.7-.7a1 1 0 010-1.4zm1.4-9.6a1 1 0 010 1.4l-.7.7A1 1 0 0115.9 7l.7-.7a1 1 0 011.4 0zM7 15.9a1 1 0 010 1.4l-.7.7a1 1 0 01-1.4-1.4l.7-.7a1 1 0 011.4 0z" />
                </svg>
              </button>
              <button
                onClick={() => setTheme("night")}
                aria-label="Night mode"
                title="Night mode (dark)"
                className="flex h-7 w-9 items-center justify-center transition"
                style={{
                  background: theme === "night" ? "#14161b" : "transparent",
                  color: theme === "night" ? "#f3f5f7" : t.cDim,
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
                </svg>
              </button>
            </div>
            <div className="relative">
              <button
                onClick={() => setAccountOpen((o) => !o)}
                title={`Account (${accountName})`}
                className="font-mono-label flex h-8 w-8 items-center justify-center text-[13px] font-bold transition active:translate-y-px"
                style={{ background: ACCENT, color: ON_GRADIENT }}
              >
                {accountInitial}
              </button>
              {accountOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setAccountOpen(false)}
                  />
                  <div
                    className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden"
                    style={{
                      background: t.panel,
                      border: `1px solid ${t.lineStrong}`,
                      boxShadow: "0 24px 50px -16px rgba(0,0,0,0.5)",
                    }}
                  >
                    <div
                      className="flex items-center gap-2.5 px-4 py-3"
                      style={{ borderBottom: `1px solid ${t.lineStrong}` }}
                    >
                      <span
                        className="font-mono-label flex h-7 w-7 items-center justify-center text-[12px] font-bold"
                        style={{ background: t.panel2, color: t.ink }}
                      >
                        {accountInitial}
                      </span>
                      <span className="min-w-0">
                        <span
                          className="block truncate text-[13px] font-semibold"
                          style={{ color: t.ink }}
                        >
                          {accountName}
                        </span>
                        <span
                          className="font-mono-label block text-[10px] uppercase tracking-[0.14em]"
                          style={{ color: t.inkFaint }}
                        >
                          signed in
                        </span>
                      </span>
                    </div>
                    <AccountItem
                      t={t}
                      label="Settings"
                      onClick={() => {
                        setAccountOpen(false);
                        setOverlay("settings");
                      }}
                    />
                    <AccountItem
                      t={t}
                      label="Upgrade"
                      onClick={() => {
                        setAccountOpen(false);
                        setOverlay("upgrade");
                      }}
                    />
                    <div style={{ height: 1, background: t.lineStrong }} />
                    <AccountItem
                      t={t}
                      label="Log out"
                      onClick={() => {
                        setAccountOpen(false);
                        onSignOut();
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
      </div>

      <main
        className="relative z-10"
        style={{ paddingBottom: "calc(104px + env(safe-area-inset-bottom))" }}
      >
        {/* ============ MARQUEE ============ */}
        <FormatMarquee />

        <div className="mx-auto w-full max-w-[940px] px-4 sm:px-6">
          <div className="flex flex-col gap-5 pt-5">
            {/* ============ SECTION 1 — PICK A FORMAT ============ */}
            <section>
              <SectionHead
                t={t}
                num="1"
                label="Pick a format"
                collapsible
                open={openSection === 1}
                onToggle={() =>
                  setOpenSection((s) => (s === 1 ? null : 1))
                }
                right={
                  <span
                    className="truncate text-[13px]"
                    style={{ color: t.cDim, maxWidth: 200 }}
                  >
                    {formatName || "Choose one"}
                  </span>
                }
              />

              {/* Quiet helper: the chosen format's one-line hint, plus the custom
                  instruction input when "Something else" is picked. Both stay
                  reachable whether the picker is open or shut. */}
              {outputType !== "custom" && formatHint && (
                <p
                  className="mt-2.5 text-[13px] leading-[1.5]"
                  style={{ color: t.cDim }}
                >
                  {formatHint}
                </p>
              )}
              {outputType === "custom" && (
                <input
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  placeholder="Turn it into... e.g. a wedding toast, a recipe"
                  aria-label="Turn it into"
                  className="rb-hero-input mt-2.5 w-full px-3 py-2.5 text-[16px] outline-none"
                  style={
                    {
                      background: t.panel2,
                      border: `1px solid ${t.lineStrong}`,
                      color: t.ink,
                      "--rb-ph": t.inkFaint,
                    } as React.CSSProperties
                  }
                />
              )}

              {openSection === 1 && (
                <div
                  className="mt-3 flex flex-col gap-5 p-4 sm:p-5"
                  style={{
                    background: t.panel,
                    border: `1px solid ${t.lineStrong}`,
                  }}
                >
                  <FormatGroup t={t} heading="Just refine">
                    <FormatGrid>
                      <FormatRow
                        t={t}
                        label="Clean & Concise"
                        active={outputType === "note"}
                        onClick={() => pickFormat("note")}
                      />
                    </FormatGrid>
                  </FormatGroup>

                  <FormatGroup t={t} heading="Practical">
                    {USEFUL_GROUPS.map((g) => (
                      <SubGroup key={g.label} t={t} label={g.label}>
                        <FormatGrid>
                          {g.ids.map((id) => {
                            const o = OUTPUT_TYPES.find((x) => x.id === id);
                            if (!o) return null;
                            return (
                              <FormatRow
                                key={id}
                                t={t}
                                label={o.label}
                                active={outputType === id}
                                onClick={() => pickFormat(id)}
                              />
                            );
                          })}
                        </FormatGrid>
                      </SubGroup>
                    ))}
                  </FormatGroup>

                  <FormatGroup t={t} heading="Fun">
                    {FUN_GROUPS.map((g) => (
                      <SubGroup key={g.label} t={t} label={g.label}>
                        <FormatGrid>
                          {g.ids.map((id) => {
                            const o = OUTPUT_TYPES.find((x) => x.id === id);
                            if (!o) return null;
                            return (
                              <FormatRow
                                key={id}
                                t={t}
                                label={o.label}
                                active={outputType === id}
                                onClick={() => pickFormat(id)}
                              />
                            );
                          })}
                        </FormatGrid>
                      </SubGroup>
                    ))}
                  </FormatGroup>

                  <FormatGroup t={t} heading="Something else">
                    <FormatGrid>
                      <FormatRow
                        t={t}
                        label="Something else"
                        active={outputType === "custom"}
                        onClick={() => pickFormat("custom")}
                      />
                    </FormatGrid>
                  </FormatGroup>
                </div>
              )}
            </section>

            {/* ============ SECTION 2 — STACK SOME NONSENSE ============ */}
            <section>
              <SectionHead
                t={t}
                num="2"
                label="Stack some nonsense (optional)"
                collapsible
                open={openSection === 2}
                onToggle={() =>
                  setOpenSection((s) => (s === 2 ? null : 2))
                }
                right={
                  <span
                    className="truncate text-[13px]"
                    style={{ color: t.cDim, maxWidth: 200 }}
                  >
                    {stackSummary || "none"}
                  </span>
                }
              />

              {openSection === 2 && (
                <div
                  className="mt-3 flex flex-col gap-6 p-4 sm:p-5"
                  style={{
                    background: t.panel,
                    border: `1px solid ${t.lineStrong}`,
                  }}
                >
                  <Axis t={t} label="Tone">
                    <PillGroups
                      t={t}
                      groups={TONE_GROUPS}
                      options={TONES}
                      value={tone}
                      onPick={setTone}
                    />
                  </Axis>

                  <Axis t={t} label="Character">
                    <PillGroups
                      t={t}
                      groups={PERSONA_GROUPS}
                      options={PERSONAS}
                      value={persona}
                      onPick={setPersona}
                    />
                  </Axis>

                  <Axis t={t} label="Accent">
                    <PillGroups
                      t={t}
                      groups={ACCENT_GROUPS}
                      options={ACCENTS}
                      value={accent}
                      onPick={setAccent}
                    />
                  </Axis>

                  <Axis t={t} label="More">
                    {/* Language */}
                    <SubGroup t={t} label="Language">
                      <div className="flex flex-wrap gap-1.5">
                        <Pill
                          t={t}
                          label="Same as input"
                          active={!targetLanguage}
                          onClick={() => setTargetLanguage("")}
                        />
                        {LANGUAGES.map((l) => (
                          <Pill
                            t={t}
                            key={l}
                            label={l}
                            active={targetLanguage === l}
                            onClick={() =>
                              setTargetLanguage(targetLanguage === l ? "" : l)
                            }
                          />
                        ))}
                      </div>
                    </SubGroup>

                    {/* Your words */}
                    <SubGroup t={t} label="Your words">
                      <p className="mb-2 text-[12px]" style={{ color: t.inkDim }}>
                        Names, brands, or words you use that we should get right.
                        Tell us what they mean so we know when you mean them.
                      </p>
                      <div className="flex flex-col gap-2">
                        {glossary.map((row, i) => (
                          <div key={i} className="flex flex-wrap items-end gap-2">
                            <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
                              <label
                                htmlFor={`rb-word-${i}`}
                                className="font-mono-label mb-1 block text-[10px] uppercase tracking-[0.12em]"
                                style={{ color: t.inkFaint }}
                              >
                                Word
                              </label>
                              <input
                                id={`rb-word-${i}`}
                                value={row.word}
                                onChange={(e) =>
                                  setGlossaryField(i, "word", e.target.value)
                                }
                                placeholder="Niko"
                                className="rb-hero-input w-full px-3 py-2.5 text-[16px] outline-none"
                                style={
                                  {
                                    background: t.panel2,
                                    border: `1px solid ${t.lineStrong}`,
                                    color: t.ink,
                                    "--rb-ph": t.inkFaint,
                                  } as React.CSSProperties
                                }
                              />
                            </div>
                            <div className="min-w-0 flex-1 sm:basis-0 sm:flex-[1.4]">
                              <label
                                htmlFor={`rb-meaning-${i}`}
                                className="font-mono-label mb-1 block text-[10px] uppercase tracking-[0.12em]"
                                style={{ color: t.inkFaint }}
                              >
                                What it is
                              </label>
                              <input
                                id={`rb-meaning-${i}`}
                                value={row.meaning}
                                onChange={(e) =>
                                  setGlossaryField(i, "meaning", e.target.value)
                                }
                                placeholder="my dog"
                                className="rb-hero-input w-full px-3 py-2.5 text-[16px] outline-none"
                                style={
                                  {
                                    background: t.panel2,
                                    border: `1px solid ${t.lineStrong}`,
                                    color: t.ink,
                                    "--rb-ph": t.inkFaint,
                                  } as React.CSSProperties
                                }
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeGlossaryRow(i)}
                              disabled={glossaryIsEmpty}
                              aria-label={
                                row.word.trim()
                                  ? `Remove ${row.word.trim()}`
                                  : "Remove this word"
                              }
                              title="Remove"
                              className="flex h-[42px] w-[42px] shrink-0 items-center justify-center text-[16px] transition active:translate-y-px"
                              style={{
                                background: t.panel2,
                                border: `1px solid ${t.lineStrong}`,
                                color: t.inkDim,
                                opacity: glossaryIsEmpty ? 0.35 : 1,
                                cursor: glossaryIsEmpty ? "not-allowed" : "pointer",
                              }}
                            >
                              <span aria-hidden>&#215;</span>
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={addGlossaryRow}
                        className="font-mono-label mt-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] transition active:translate-y-px"
                        style={{
                          background: t.panel2,
                          border: `1px solid ${t.lineStrong}`,
                          color: t.ink,
                        }}
                      >
                        + Add another
                      </button>
                    </SubGroup>

                    {/* Profanity */}
                    <SubGroup t={t} label="Profanity">
                      <div className="flex flex-wrap gap-1.5">
                        <Pill
                          t={t}
                          label="Keep it"
                          active={!cleanProfanity}
                          onClick={() => setCleanProfanity(false)}
                        />
                        <Pill
                          t={t}
                          label="Clean it up"
                          active={cleanProfanity}
                          onClick={() => setCleanProfanity(true)}
                        />
                      </div>
                    </SubGroup>
                  </Axis>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setOpenSection(null)}
                      className="font-mono-label px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] transition active:translate-y-px"
                      style={{ background: t.ink, color: t.panel }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* ============ SECTION 3 — DUMP IT ============ */}
            <section>
              <SectionHead t={t} num="3" label="Dump it" />

              <div className="mt-3 flex flex-col gap-3">
                <div className="relative flex flex-col">
                  <textarea
                    ref={inputRef}
                    value={inputText}
                    onChange={(e) => {
                      setInputText(e.target.value);
                      fitInput();
                    }}
                    placeholder="Ramble it here. The voice memos, the half-baked ideas, the texts you shouldn't send yet."
                    className="rb-hero-input w-full resize-none p-4 text-[16px] leading-[1.6] outline-none sm:p-5 sm:text-[17px]"
                    style={
                      {
                        color: t.ink,
                        background: t.panel2,
                        minHeight: 180,
                        overflowY: "hidden",
                        border: `1px solid ${t.lineStrong}`,
                        "--rb-ph": t.inkFaint,
                      } as React.CSSProperties
                    }
                  />
                  {recording && (
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center gap-4"
                      style={{ background: t.panel2 }}
                    >
                      <div className="flex h-12 items-end gap-1.5">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <span
                            key={i}
                            className="rb-wave-bar h-full w-1.5"
                            style={{
                              background: i % 2 === 0 ? t.accentOnPanel : t.ink,
                              animationDelay: `${i * 0.12}s`,
                            }}
                          />
                        ))}
                      </div>
                      <div
                        className="font-mono-timer text-[34px] font-bold"
                        style={{ color: t.ink }}
                      >
                        {formatTime(recorder.seconds)}
                      </div>
                      {showWarning ? (
                        <p
                          className="font-mono-label text-[11px] uppercase tracking-[0.12em]"
                          style={{ color: "#ff5a3c" }}
                        >
                          {WARNING_MESSAGE}
                        </p>
                      ) : (
                        <p
                          className="font-mono-label text-[11px] uppercase tracking-[0.14em]"
                          style={{ color: t.inkDim }}
                        >
                          Listening. Tap stop when done.
                        </p>
                      )}
                      <button
                        onClick={recorder.cancel}
                        className="font-mono-label px-4 py-2 text-[11px] uppercase tracking-[0.12em]"
                        style={{ border: `1px solid ${t.lineStrong}`, color: t.ink }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  {transcribing && (
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center"
                      style={{ background: t.panel2 }}
                    >
                      <span
                        className="rb-spin inline-block h-8 w-8 rounded-full border-[3px]"
                        style={{
                          borderColor: t.lineStrong,
                          borderTopColor: t.accentOnPanel,
                        }}
                      />
                      <p
                        className="font-bric text-[17px] font-bold"
                        style={{ color: t.ink }}
                      >
                        Turning that noise into words.
                      </p>
                      <p
                        className="text-[16px] leading-[1.5]"
                        style={{ color: t.inkDim }}
                      >
                        Give us a second, you talk faster than you think.
                      </p>
                    </div>
                  )}
                </div>

                {/* Record (dominant) + word count + clear, on one row. */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {recording ? (
                    <button
                      onClick={handleStop}
                      className="font-bric flex items-center gap-2.5 px-6 py-3.5 text-[15px] font-bold transition active:translate-y-px"
                      style={{ background: ACCENT, color: ON_GRADIENT }}
                    >
                      <span
                        aria-hidden
                        style={{
                          display: "inline-block",
                          height: 12,
                          width: 12,
                          background: ON_GRADIENT,
                        }}
                      />
                      Stop
                    </button>
                  ) : transcribing ? (
                    <button
                      disabled
                      className="font-bric flex items-center gap-2.5 px-6 py-3.5 text-[15px] font-bold"
                      style={{
                        background: t.panel,
                        border: `1.5px solid ${t.lineStrong}`,
                        color: t.ink,
                        opacity: 0.8,
                      }}
                    >
                      <span
                        className="rb-spin inline-block h-3.5 w-3.5 rounded-full border-2"
                        style={{
                          borderColor: t.lineStrong,
                          borderTopColor: t.accentOnPanel,
                        }}
                      />
                      {loadingWord}&hellip;
                    </button>
                  ) : (
                    <button
                      onClick={handleStart}
                      className="font-bric flex items-center gap-2.5 px-6 py-3.5 text-[15px] font-bold transition active:translate-y-px"
                      style={{
                        background: t.panel,
                        border: `1.5px solid ${t.lineStrong}`,
                        color: t.ink,
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          display: "inline-block",
                          height: 11,
                          width: 11,
                          borderRadius: 999,
                          background: t.accentOnPanel,
                        }}
                      />
                      Record
                    </button>
                  )}

                  <div className="flex items-center gap-3">
                    <span
                      className="font-mono-label text-[11px] uppercase tracking-[0.08em]"
                      style={{ color: t.cDim }}
                    >
                      {words} words
                    </span>
                    <button
                      onClick={clearRamble}
                      disabled={!inputText}
                      className="font-mono-label flex items-center gap-1 whitespace-nowrap px-2 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] transition active:translate-y-px disabled:opacity-40"
                      style={{ background: "transparent", color: t.cDim }}
                    >
                      <span aria-hidden style={{ color: "#ff6b68", fontSize: 16 }}>
                        &times;
                      </span>{" "}
                      clear
                    </button>
                  </div>
                </div>

                {limitNotice && (
                  <p className="font-mono-label text-[11px]" style={{ color: "#ff5a3c" }}>
                    {limitNotice}
                  </p>
                )}
              </div>
            </section>

            {/* ============ SECTION 4 — THE GOODS ============ */}
            <section ref={goodsRef}>
              <SectionHead
                t={t}
                num="4"
                label="The goods"
                right={
                  hasResult && !cleaning ? (
                    <button
                      onClick={handleCopy}
                      disabled={!cleaned}
                      className="font-mono-label flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] transition active:translate-y-px disabled:opacity-40"
                      style={{
                        background: "transparent",
                        border: `1px solid ${t.cLineStrong}`,
                        color: t.cInk,
                      }}
                    >
                      {copyLabel}
                    </button>
                  ) : undefined
                }
              />

              <div
                className="mt-3 flex min-h-[280px] flex-col p-5 sm:min-h-[340px] sm:p-6"
                style={{ background: t.panel, border: `1px solid ${t.lineStrong}` }}
              >
                {cleaning && !hasResult ? (
                  <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
                    <span
                      className="font-serif-i rb-breathe text-[64px] leading-none"
                      style={{ color: t.accentOnPanel }}
                    >
                      b
                    </span>
                    <p
                      className="font-mono-label mt-4 text-[11px] uppercase tracking-[0.14em]"
                      style={{ color: t.inkDim }}
                    >
                      {loadingWord}&hellip;
                    </p>
                  </div>
                ) : !hasResult ? (
                  <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
                    <span
                      className="font-serif-i text-[64px] leading-none"
                      style={{ color: t.accentOnPanel }}
                    >
                      b
                    </span>
                    <p
                      className="mt-4 max-w-[320px] text-[16px] leading-[1.5]"
                      style={{ color: t.inkDim }}
                    >
                      Nothing here yet. Feed the machine your mess and it hands
                      back something less embarrassing to send. Or something
                      unhinged enough to get you blocked. Depends what you clicked.
                    </p>
                  </div>
                ) : (
                  <div>
                    {/* THE REVEAL. Glyph noise resolving left to right into the
                        real text. `cleaned` (never this) is what Copy reads. */}
                    <div
                      className="font-serif-i whitespace-pre-wrap"
                      style={{
                        color: t.ink,
                        fontStyle: "italic",
                        fontSize: 23,
                        lineHeight: 1.5,
                        letterSpacing: "0.005em",
                        maxWidth: "62ch",
                      }}
                    >
                      {revealText}
                    </div>

                    {settled && keyPoints.length > 0 && (
                      <Collapsible
                        t={t}
                        label="Key points"
                        open={keyOpen}
                        onToggle={() => setKeyOpen((o) => !o)}
                      >
                        <ol className="mt-2 space-y-1.5">
                          {keyPoints.map((p, i) => (
                            <li
                              key={i}
                              className="flex gap-2 text-[16px]"
                              style={{ color: t.inkDim }}
                            >
                              <span
                                className="font-mono-label text-[12px]"
                                style={{ color: t.inkDim }}
                              >
                                {String(i + 1).padStart(2, "0")}
                              </span>
                              {p}
                            </li>
                          ))}
                        </ol>
                      </Collapsible>
                    )}

                    {settled && followUps.length > 0 && (
                      <Collapsible
                        t={t}
                        label="Suggested follow ups"
                        open={followOpen}
                        onToggle={() => setFollowOpen((o) => !o)}
                      >
                        <div className="mt-1">
                          {followUps.map((f, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 py-2 text-[16px]"
                              style={{
                                color: t.inkDim,
                                borderTop: i ? `1px solid ${t.line}` : undefined,
                              }}
                            >
                              <span style={{ color: t.accentOnPanel }} aria-hidden>
                                &rarr;
                              </span>
                              {f}
                            </div>
                          ))}
                        </div>
                      </Collapsible>
                    )}

                    {/* Action row: Copy lives top-right in the header; these
                        three sit under the output, wired to their handlers. */}
                    <div
                      className="mt-5 flex flex-wrap gap-2 pt-4"
                      style={{ borderTop: `1px solid ${t.line}` }}
                    >
                      <ActionBtn
                        t={t}
                        onClick={() => runCleanup("again")}
                        disabled={cleaning}
                      >
                        Regenerate
                      </ActionBtn>
                      <ActionBtn t={t} onClick={handleSave}>
                        {saveLabel}
                      </ActionBtn>
                      <ActionBtn t={t} onClick={handleClear}>
                        New ramble
                      </ActionBtn>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Footer line, just under section 4. */}
            <p
              className="font-mono-label pt-1 text-[11px] uppercase tracking-[0.1em]"
              style={{ color: t.cDim }}
            >
              RambleBabble. Not affiliated with productivity. Probably cursed.
              Definitely cursed.
            </p>
          </div>
        </div>
      </main>

      {/* ============ STICKY BOTTOM BAR ============ */}
      <div
        className="fixed inset-x-0 bottom-0 z-30"
        style={{
          background: t.chrome,
          backdropFilter: "blur(10px)",
          borderTop: `1px solid ${t.cLine}`,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="mx-auto flex w-full max-w-[940px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <span
            className="font-mono-label min-w-0 flex-1 truncate text-[11px] uppercase tracking-[0.1em]"
            style={{ color: t.cDim }}
          >
            {formatName || "pick a format first"}
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={surprise}
              className="font-mono-label whitespace-nowrap px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] transition active:translate-y-px"
              style={{
                background: "transparent",
                border: `1px solid ${t.cLineStrong}`,
                color: t.cInk,
              }}
            >
              Surprise me
            </button>
            <button
              onClick={() => runCleanup()}
              disabled={cleaning || !canBabble}
              className="font-bric flex items-center justify-center gap-2 whitespace-nowrap px-6 py-2.5 text-[15px] font-bold transition hover:brightness-[1.08] active:translate-y-px"
              style={{
                backgroundImage: BUTTON_GRADIENT,
                color: ON_GRADIENT,
                letterSpacing: "0.01em",
                boxShadow: "0 10px 26px -12px rgba(123,92,255,0.6)",
                opacity: !cleaning && !canBabble ? 0.5 : 1,
                filter: !cleaning && !canBabble ? "saturate(0.6)" : "none",
              }}
            >
              {cleaning ? (
                <>
                  <span
                    className="rb-spin inline-block h-3.5 w-3.5 rounded-full border-2"
                    style={{
                      borderColor: "rgba(7,8,9,0.35)",
                      borderTopColor: ON_GRADIENT,
                    }}
                  />
                  {loadingWord}&hellip;
                </>
              ) : (
                <>
                  Babble it <span aria-hidden>&rarr;</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {overlay === "settings" && (
        <Overlay t={t} title="Settings" onClose={() => setOverlay(null)}>
          <SettingRow t={t} label="Account">
            <span style={{ color: t.ink }}>You&rsquo;re signed in.</span>
          </SettingRow>
          <SettingRow t={t} label="Appearance">
            <button
              onClick={() => setTheme((th) => (th === "night" ? "day" : "night"))}
              className="font-mono-label px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em]"
              style={{ background: t.ink, color: t.panel }}
            >
              {theme === "night" ? "Switch to Day" : "Switch to Night"}
            </button>
          </SettingRow>
          <SettingRow t={t} label="Plan">
            <button
              onClick={() => setOverlay("upgrade")}
              className="font-mono-label px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em]"
              style={{
                background: "transparent",
                border: `1px solid ${t.lineStrong}`,
                color: t.inkDim,
              }}
            >
              See upgrade options
            </button>
          </SettingRow>
          <SettingRow t={t} label="Session">
            <button
              onClick={onSignOut}
              className="font-mono-label px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em]"
              style={{ background: t.ink, color: t.panel }}
            >
              Log out
            </button>
          </SettingRow>
        </Overlay>
      )}

      {overlay === "upgrade" && (
        <Overlay t={t} title="Upgrade" onClose={() => setOverlay(null)}>
          <p className="mb-5 text-[16px]" style={{ color: t.inkDim }}>
            Pick how much you want to Babble. Final pricing is still being locked
            in, these are placeholders.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <PlanCard
              t={t}
              name="Free"
              price="$0"
              line="A few Babbles a month to try it out."
              cta="Current plan"
              disabled
            />
            <PlanCard
              t={t}
              name="Plus"
              price="$6/mo"
              line="Lots more Babbles for everyday use."
              cta="Choose Plus"
              highlight
            />
            <PlanCard
              t={t}
              name="Pro"
              price="$15/mo"
              line="Heavy use, longest rambles, every style."
              cta="Choose Pro"
            />
          </div>
          <p
            className="font-mono-label mt-5 text-[10px] uppercase tracking-[0.12em]"
            style={{ color: t.inkFaint }}
          >
            Checkout isn&rsquo;t wired up yet.
          </p>
        </Overlay>
      )}
    </div>
  );
}

/** The fast marquee of format names, separated by violet diamonds, edges masked.
 *  Rendered twice so the .rb-marquee -50% translate loops seamlessly. */
function FormatMarquee() {
  const items = OUTPUT_TYPES;
  const strip = (copy: number) =>
    items.map((o) => (
      <span key={`${copy}-${o.id}`} className="inline-flex items-center">
        <span
          className="font-mono-label text-[12px] uppercase tracking-[0.18em]"
          style={{ color: t.cDim }}
        >
          {o.label}
        </span>
        <span
          aria-hidden
          className="mx-3 text-[10px]"
          style={{ color: t.accentOnCanvas }}
        >
          ◆
        </span>
      </span>
    ));
  return (
    <div
      className="relative overflow-hidden py-3"
      style={{
        borderBottom: `1px solid ${t.cLine}`,
        WebkitMaskImage:
          "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
        maskImage:
          "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
      }}
      aria-hidden
    >
      <div className="rb-marquee">
        {strip(0)}
        {strip(1)}
      </div>
    </div>
  );
}

/** The numbered section header on the canvas: big violet number, Space Mono label,
 *  an optional right node, an optional caret when collapsible, and a hairline
 *  divider under the row. */
function SectionHead({
  t,
  num,
  label,
  right,
  collapsible,
  open,
  onToggle,
}: {
  t: T;
  num: string;
  label: string;
  right?: React.ReactNode;
  collapsible?: boolean;
  open?: boolean;
  onToggle?: () => void;
}) {
  const inner = (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="font-bric font-bold"
          style={{
            color: t.accentOnCanvas,
            fontSize: "clamp(30px,6vw,42px)",
            lineHeight: 1,
            letterSpacing: "-0.03em",
          }}
        >
          {num}
        </span>
        <span
          className="font-mono-label text-[13px] font-bold uppercase tracking-[0.14em]"
          style={{ color: t.cInk }}
        >
          {label}
        </span>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        {right}
        {collapsible && (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke={t.cDim}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            style={{
              flexShrink: 0,
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform 0.15s",
            }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        )}
      </div>
    </div>
  );
  return (
    <div>
      {collapsible ? (
        <button onClick={onToggle} className="w-full text-left" aria-expanded={open}>
          {inner}
        </button>
      ) : (
        inner
      )}
      <div className="mt-2.5" style={{ height: 1, background: t.cLine }} />
    </div>
  );
}

/** A top-level accent heading in the format picker (Just refine / Practical /
 *  Fun / Something else). */
function FormatGroup({
  t,
  heading,
  children,
}: {
  t: T;
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div
        className="font-mono-label text-[11px] font-bold uppercase tracking-[0.18em]"
        style={{ color: t.accentOnPanel }}
      >
        {heading}
      </div>
      {children}
    </div>
  );
}

/** A quiet sub-heading (group label) with its content below. */
function SubGroup({
  t,
  label,
  children,
}: {
  t: T;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        className="font-mono-label mb-1.5 text-[10px] uppercase tracking-[0.14em]"
        style={{ color: t.inkFaint }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

/** Tiles format rows into columns so the list stays scannable, not a mile tall. */
function FormatGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">{children}</div>
  );
}

/** One selectable format row (panel context). Active = accent border + dot. */
function FormatRow({
  t,
  label,
  active,
  onClick,
}: {
  t: T;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[14px] transition active:translate-y-px"
      style={{
        // Active is marked by the violet border, wash, weight, and dot, never by
        // an accent-coloured LABEL: violet-on-panel is 4.07:1 (below the 4.5 bar
        // for body text), so the label stays ink and reads clean in both themes.
        background: active ? "rgba(123,92,255,0.14)" : "transparent",
        border: `1px solid ${active ? t.accentOnPanel : t.line}`,
        color: t.ink,
        fontWeight: active ? 700 : 500,
      }}
    >
      {active && (
        <span
          className="h-1.5 w-1.5 shrink-0"
          style={{ background: t.accentOnPanel }}
        />
      )}
      {label}
    </button>
  );
}

/** A stack axis in Section 2: a Space Mono label with its options below. */
function Axis({
  t,
  label,
  children,
}: {
  t: T;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div
        className="font-mono-label text-[12px] font-bold uppercase tracking-[0.16em]"
        style={{ color: t.ink }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

/** Grouped pills for a single-select axis (click the active one to clear it). */
function PillGroups({
  t,
  groups,
  options,
  value,
  onPick,
}: {
  t: T;
  groups: OptionGroup[];
  options: Option[];
  value: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {groups.map((g) => (
        <SubGroup key={g.label} t={t} label={g.label}>
          <div className="flex flex-wrap gap-1.5">
            {g.ids.map((id) => {
              const o = options.find((x) => x.id === id);
              if (!o) return null;
              return (
                <Pill
                  key={id}
                  t={t}
                  label={o.label}
                  active={value === id}
                  onClick={() => onPick(value === id ? "" : id)}
                />
              );
            })}
          </div>
        </SubGroup>
      ))}
    </div>
  );
}

/** One selectable pill (panel context). Active = accent ring + accent text. */
function Pill({
  t,
  label,
  active,
  onClick,
}: {
  t: T;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 text-[13px] font-medium transition active:translate-y-px"
      style={{
        // Selection = violet ring + wash + weight, label stays ink for AA (violet
        // on the night panel is 4.07:1, below the 4.5 bar for this 13px label).
        background: active ? "rgba(123,92,255,0.14)" : "transparent",
        border: `1.5px solid ${active ? t.accentOnPanel : t.lineStrong}`,
        color: t.ink,
        fontWeight: active ? 700 : 500,
      }}
    >
      {label}
    </button>
  );
}

function Wordmark({ color }: { color: string }) {
  return (
    <div
      className="flex items-center gap-2 text-[19px] sm:gap-2.5 sm:text-[24px]"
      style={{ color }}
    >
      <span className="font-bric font-extrabold" style={{ letterSpacing: "-0.02em" }}>
        Ramble
      </span>
      <span
        className="inline-block"
        style={{ transform: "rotate(-7deg)", transformOrigin: "center" }}
      >
        <BabbleWave style={{ fontSize: "1.75em" }} />
      </span>
    </div>
  );
}

function AccountItem({
  t,
  label,
  onClick,
}: {
  t: T;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="font-mono-label flex w-full items-center px-4 py-2.5 text-left text-[12px] font-bold uppercase tracking-[0.1em] transition"
      style={{ background: "transparent", color: t.ink }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = t.ink;
        e.currentTarget.style.color = t.panel;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = t.ink;
      }}
    >
      {label}
    </button>
  );
}

function Overlay({
  t,
  title,
  onClose,
  children,
}: {
  t: T;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 pt-20"
      style={{ background: "rgba(0,0,0,0.62)", backdropFilter: "blur(3px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl"
        style={{
          background: t.panel,
          border: `1px solid ${t.lineStrong}`,
          boxShadow: "0 40px 90px -20px rgba(0,0,0,0.7)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: `1px solid ${t.lineStrong}` }}
        >
          <h2
            className="font-bric text-[24px] font-extrabold"
            style={{ color: t.ink, letterSpacing: "-0.02em" }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="font-mono-label px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em]"
            style={{ background: t.ink, color: t.panel }}
          >
            Close
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function SettingRow({
  t,
  label,
  children,
}: {
  t: T;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 py-3"
      style={{ borderBottom: `1px solid ${t.line}` }}
    >
      <span
        className="font-mono-label text-[11px] font-bold uppercase tracking-[0.14em]"
        style={{ color: t.inkDim }}
      >
        {label}
      </span>
      <div className="text-[16px]">{children}</div>
    </div>
  );
}

function PlanCard({
  t,
  name,
  price,
  line,
  cta,
  highlight,
  disabled,
}: {
  t: T;
  name: string;
  price: string;
  line: string;
  cta: string;
  highlight?: boolean;
  disabled?: boolean;
}) {
  return (
    <div
      className="flex flex-col p-4"
      style={{
        background: t.panel2,
        border: highlight
          ? `2px solid ${t.lineStrong}`
          : `1px solid ${t.lineStrong}`,
      }}
    >
      <span
        className="font-mono-label text-[11px] font-bold uppercase tracking-[0.14em]"
        style={{ color: highlight ? t.ink : t.inkDim }}
      >
        {name}
      </span>
      <span
        className="font-bric mt-1 text-[24px] font-extrabold"
        style={{ color: t.ink, letterSpacing: "-0.02em" }}
      >
        {price}
      </span>
      <span className="mt-1 flex-1 text-[13px]" style={{ color: t.inkDim }}>
        {line}
      </span>
      <button
        disabled={disabled}
        className="font-mono-label mt-4 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.1em] transition active:translate-y-px disabled:opacity-50"
        style={
          // The one primary action inside its own modal. Dark label on the violet
          // accent (near-black #070809 clears AA at 4.60 on #7b5cff; white fails).
          highlight
            ? { background: ACCENT, color: ON_GRADIENT }
            : { background: t.ink, color: t.panel }
        }
      >
        {cta}
      </button>
    </div>
  );
}

function Collapsible({
  t,
  label,
  open,
  onToggle,
  children,
}: {
  t: T;
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rb-rise mt-3 overflow-hidden"
      style={{ border: `1.5px solid ${t.line}` }}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-2.5 transition"
        style={{ background: open ? t.panel2 : "transparent" }}
      >
        <span
          className="font-mono-label flex items-center gap-2.5 text-[12px] font-bold uppercase tracking-[0.14em]"
          style={{ color: t.ink }}
        >
          <span
            aria-hidden
            style={{
              width: 7,
              height: 7,
              background: t.accentOnPanel,
              display: "inline-block",
            }}
          />
          {label}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={t.inkDim}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
}

/** A quiet secondary action (Section 4 action row). Bordered, ink label (AA on
 *  the panel), never the primary gradient. */
function ActionBtn({
  t,
  onClick,
  disabled,
  children,
}: {
  t: T;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="font-mono-label px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] transition active:translate-y-px disabled:opacity-40"
      style={{
        background: "transparent",
        border: `1px solid ${t.lineStrong}`,
        color: t.ink,
      }}
    >
      {children}
    </button>
  );
}
