"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRecorder } from "./useRecorder";
import { getSupabase } from "@/lib/supabase/client";
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

const MAX_MINUTES = Math.round(MAX_RECORDING_SECONDS / 60);
const GRADIENT = "linear-gradient(95deg,#7b5cff,#ff4d9d 55%,#ff6f61)";
const ACCENT = "#7b5cff";
const GLYPHS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#%&*<>/";

const FUN_LOADING = [
  "Razzle dazzling",
  "Reticulating",
  "Lollygagging",
  "Boogeying",
  "Marinating",
  "Pontificating",
  "Wordsmithing",
  "Percolating",
  "Finessing",
  "Noodling",
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

type Theme = "mist" | "ink";
const THEMES = {
  mist: {
    canvas: "#0b0c0f",
    cInk: "#f3f5f7",
    cDim: "#9097a2",
    cLine: "rgba(243,245,247,0.13)",
    cLineStrong: "rgba(243,245,247,0.30)",
    panel: "#e9ebf0",
    panel2: "#d9dce2",
    ink: "#14161b",
    inkDim: "#565d63",
    inkFaint: "#878d93",
    line: "rgba(19,22,26,0.16)",
    lineStrong: "rgba(19,22,26,0.30)",
  },
  ink: {
    canvas: "#070809",
    cInk: "#f3f5f7",
    cDim: "#9097a2",
    cLine: "rgba(243,245,247,0.12)",
    cLineStrong: "rgba(243,245,247,0.26)",
    panel: "#16181d",
    panel2: "#1e2127",
    ink: "#eef1f3",
    inkDim: "#9097a0",
    inkFaint: "#646b72",
    line: "rgba(238,241,243,0.12)",
    lineStrong: "rgba(238,241,243,0.26)",
  },
} as const;

function formatTime(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function RambleBabbleApp({
  userId,
  onOpenHistory,
  onSignOut,
  reopen,
}: {
  userId: string;
  onOpenHistory: () => void;
  onSignOut: () => void;
  reopen: SavedRamble | null;
}) {
  const [theme, setTheme] = useState<Theme>("mist");
  const t = THEMES[theme];

  const [inputText, setInputText] = useState(reopen?.transcript ?? "");
  const [outputType, setOutputType] = useState(reopen?.output_type ?? "note");
  const [tone, setTone] = useState(reopen?.tone ?? "");
  const [vocabulary, setVocabulary] = useState("");
  const [accent, setAccent] = useState("");
  const [persona, setPersona] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("");
  const [customInstruction, setCustomInstruction] = useState("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const [cleaned, setCleaned] = useState(reopen?.cleaned ?? "");
  const [revealText, setRevealText] = useState(reopen?.cleaned ?? "");
  const [revealing, setRevealing] = useState(false);
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

  const revealRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cursor spotlight (editorial signature).
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const root = document.documentElement;
      root.style.setProperty("--mx", `${e.clientX}px`);
      root.style.setProperty("--my", `${e.clientY}px`);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    return () => {
      if (revealRef.current) clearInterval(revealRef.current);
    };
  }, []);

  const transcribeBlob = useCallback(
    async (blob: Blob | null) => {
      if (!blob || blob.size === 0) {
        setError("Nothing was recorded. Try again.");
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
        if (vocabulary.trim()) form.append("vocabulary", vocabulary.trim());
        const res = await fetch("/api/transcribe", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Transcription failed.");
        setInputText((prev) =>
          prev.trim() ? `${prev.trim()}\n\n${data.transcript}` : data.transcript,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Transcription failed.");
      } finally {
        setTranscribing(false);
      }
    },
    [vocabulary],
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
  const busy = transcribing || cleaning || recording;
  const showWarning = recording && recorder.seconds >= WARNING_AT_SECONDS;

  const selectedStyle =
    outputType === "custom"
      ? { label: "Something else" }
      : OUTPUT_TYPES.find((o) => o.id === outputType);
  const selectedTone = TONES.find((x) => x.id === tone);
  const selectedAccent = getAccent(accent);
  const selectedPersona = getPersona(persona);

  const startReveal = useCallback((final: string) => {
    if (revealRef.current) clearInterval(revealRef.current);
    setRevealing(true);
    let shown = 0;
    revealRef.current = setInterval(() => {
      shown += 6;
      if (shown >= final.length) {
        if (revealRef.current) clearInterval(revealRef.current);
        setRevealText(final);
        setRevealing(false);
        return;
      }
      let s = final.slice(0, shown);
      for (let i = shown; i < final.length; i++) {
        const c = final[i];
        s += /\s/.test(c) ? c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      setRevealText(s);
    }, 26);
  }, []);

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

  const runCleanup = useCallback(
    async (modifier?: string) => {
      if (!inputText.trim()) {
        setError("Record or paste your ramble first, then babble it.");
        return;
      }
      if (!outputType) {
        setError("Pick a format first — what should your ramble become?");
        return;
      }
      if (outputType === "custom" && !customInstruction.trim()) {
        setError("Tell us what to turn it into.");
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
            vocabulary: vocabulary.trim() || undefined,
            modifier,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Cleanup failed.");
        const out = data.cleaned || "";
        setCleaned(out);
        setKeyPoints(Array.isArray(data.keyPoints) ? data.keyPoints : []);
        setFollowUps(Array.isArray(data.followUps) ? data.followUps : []);
        setKeyOpen(true);
        setFollowOpen(false);
        startReveal(out);
        if (!modifier) {
          void getSupabase()
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
            });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Cleanup failed.");
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
      vocabulary,
      userId,
      startReveal,
    ],
  );

  const handleCopy = useCallback(async () => {
    if (!cleaned) return;
    try {
      await navigator.clipboard.writeText(cleaned);
      setCopyLabel("Copied");
      setTimeout(() => setCopyLabel("Copy"), 1600);
    } catch {
      setError("Couldn't copy.");
    }
  }, [cleaned]);

  const handleShare = useCallback(() => {
    if (!cleaned) return;
    if (navigator.share) void navigator.share({ text: cleaned }).catch(() => {});
    else void handleCopy();
  }, [cleaned, handleCopy]);

  const handleClear = useCallback(() => {
    if (recorder.status === "recording") recorder.cancel();
    setInputText("");
    setVocabulary("");
    setCustomInstruction("");
    setCleaned("");
    setRevealText("");
    setKeyPoints([]);
    setFollowUps([]);
    setError(null);
    setLimitNotice(null);
  }, [recorder]);

  const resetChoices = () => {
    setOutputType("note");
    setTone("");
    setAccent("");
    setPersona("");
    setTargetLanguage("");
    setOpenDropdown(null);
  };

  const pasteIn = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setInputText((p) => (p.trim() ? `${p.trim()}\n\n${text}` : text));
    } catch {
      setError("Couldn't read the clipboard. Paste with Ctrl+V instead.");
    }
  };

  const words = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const chars = inputText.length;
  const hasResult = !!cleaned;
  const shownOutput = revealing ? revealText : cleaned;
  const metaLabel = [
    selectedStyle?.label,
    selectedTone?.label,
    selectedPersona?.label,
    selectedAccent?.label,
  ]
    .filter(Boolean)
    .join(" / ");

  const navBtn = (label: string, active: boolean, onClick: () => void) => (
    <button
      onClick={onClick}
      className="font-mono-label text-[12px] uppercase tracking-[0.14em] transition"
      style={{ color: active ? ACCENT : t.cDim }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ background: t.canvas, color: t.cInk, minHeight: "100vh" }}>
      {/* cursor spotlight */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(440px circle at var(--mx,50%) var(--my,40%), rgba(123,92,255,0.16), transparent 64%)",
        }}
      />

      {/* Header */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-7 py-3.5 backdrop-blur"
        style={{
          borderBottom: `1px solid ${t.cLine}`,
          background:
            theme === "mist" ? "rgba(11,12,15,0.72)" : "rgba(7,8,9,0.72)",
        }}
      >
        <Wordmark color={t.cInk} />
        <div className="flex items-center gap-5">
          {navBtn("Refinery", true, () => {})}
          {navBtn("Archive", false, onOpenHistory)}
          <button
            onClick={() => setTheme((th) => (th === "mist" ? "ink" : "mist"))}
            className="font-mono-label px-3 py-1.5 text-[11px] uppercase tracking-[0.14em]"
            style={{ border: `1px solid ${t.cLineStrong}`, color: t.cDim }}
          >
            {theme === "mist" ? "Mist" : "Ink"}
          </button>
          <button
            onClick={onSignOut}
            title="Sign out"
            className="font-mono-label flex h-8 w-8 items-center justify-center text-[12px] font-bold text-white"
            style={{ background: ACCENT }}
          >
            R
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-[1240px] px-7 pb-10">
        {/* Page title */}
        <div className="flex flex-wrap items-end justify-between gap-3 pb-4 pt-7">
          <h1
            className="font-bric font-extrabold leading-[0.95]"
            style={{ fontSize: "clamp(32px,4vw,52px)", letterSpacing: "-0.04em" }}
          >
            Refine a{" "}
            <span className="font-serif-i" style={{ color: ACCENT }}>
              ramble
            </span>
          </h1>
          <p
            className="font-mono-label max-w-sm text-[11px] uppercase leading-[1.7] tracking-[0.1em]"
            style={{ color: t.cDim }}
          >
            Record on the left, babble on the right. Format is the only must-pick
            (set to Clean it up). Tone, character, accent are optional.
          </p>
        </div>

        {/* Control console — sticky so your highlighted choices stay in view
            while you scroll the ramble and the babble. */}
        <div className="sticky top-[56px] z-20 pb-4" style={{ background: t.canvas }}>
          <div
            className="p-4"
            style={{ background: t.panel, border: `1px solid ${t.lineStrong}` }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span
                className="font-mono-label text-[11px] uppercase tracking-[0.14em]"
                style={{ color: t.inkDim }}
              >
                Stack your style — a highlighted control is selected
              </span>
              <button
                onClick={resetChoices}
                className="font-mono-label text-[11px] uppercase tracking-[0.12em]"
                style={{ color: t.inkDim }}
              >
                Reset choices
              </button>
            </div>

            <div
              className="grid grid-cols-2 gap-px lg:grid-cols-4"
              style={{ background: t.lineStrong }}
            >
              <Selector
                t={t}
                index="01"
                label="Format"
                value={
                  outputType === "custom"
                    ? "Something else"
                    : (selectedStyle?.label ?? "")
                }
                placeholder="Choose a format"
                open={openDropdown === "format"}
                onToggle={() =>
                  setOpenDropdown((d) => (d === "format" ? null : "format"))
                }
              >
                <div
                  className="font-mono-label px-3 pb-1 pt-3 text-[10px] uppercase tracking-[0.18em]"
                  style={{ color: ACCENT }}
                >
                  Just refine
                </div>
                <OptionRow
                  t={t}
                  label="Clean it up"
                  active={outputType === "note"}
                  onClick={() => {
                    setOutputType("note");
                    setOpenDropdown(null);
                  }}
                />
                <GroupedOptions
                  t={t}
                  heading="Practical"
                  groups={USEFUL_GROUPS}
                  options={OUTPUT_TYPES}
                  value={outputType}
                  onPick={(id) => {
                    setOutputType(id);
                    setOpenDropdown(null);
                  }}
                />
                <GroupedOptions
                  t={t}
                  heading="Fun"
                  groups={FUN_GROUPS}
                  options={OUTPUT_TYPES}
                  value={outputType}
                  onPick={(id) => {
                    setOutputType(id);
                    setOpenDropdown(null);
                  }}
                />
                <OptionRow
                  t={t}
                  label="Something else"
                  active={outputType === "custom"}
                  onClick={() => {
                    setOutputType("custom");
                    setOpenDropdown(null);
                  }}
                />
              </Selector>

              <Selector
                t={t}
                index="02"
                label="Tone"
                optional
                value={selectedTone?.label ?? ""}
                placeholder="Choose a tone"
                open={openDropdown === "tone"}
                onToggle={() => setOpenDropdown((d) => (d === "tone" ? null : "tone"))}
              >
                <FlatOptions
                  t={t}
                  options={TONES}
                  value={tone}
                  allowNone
                  noneLabel="No set tone"
                  onPick={(id) => {
                    setTone(id);
                    setOpenDropdown(null);
                  }}
                />
              </Selector>

              <Selector
                t={t}
                index="03"
                label="Character"
                optional
                value={selectedPersona?.label ?? ""}
                placeholder="Add a character"
                open={openDropdown === "character"}
                onToggle={() =>
                  setOpenDropdown((d) => (d === "character" ? null : "character"))
                }
              >
                <FlatOptions
                  t={t}
                  options={PERSONAS}
                  value={persona}
                  allowNone
                  noneLabel="No character"
                  onPick={(id) => {
                    setPersona(id);
                    setOpenDropdown(null);
                  }}
                />
              </Selector>

              <Selector
                t={t}
                optional
              index="04"
              label="Accent"
              value={selectedAccent?.label ?? ""}
              placeholder="Add an accent"
              open={openDropdown === "accent"}
              onToggle={() =>
                setOpenDropdown((d) => (d === "accent" ? null : "accent"))
              }
            >
              <FlatOptions
                t={t}
                options={ACCENTS}
                value={accent}
                allowNone
                noneLabel="No accent"
                onPick={(id) => {
                  setAccent(id);
                  setOpenDropdown(null);
                }}
              />
              <div
                className="font-mono-label px-3 pb-2 pt-3 text-[10px] uppercase tracking-[0.16em]"
                style={{ color: t.inkFaint }}
              >
                Output language
              </div>
              <OptionRow
                t={t}
                label="Same as input"
                active={!targetLanguage}
                onClick={() => {
                  setTargetLanguage("");
                }}
              />
              {LANGUAGES.map((l) => (
                <OptionRow
                  t={t}
                  key={l}
                  label={l}
                  active={targetLanguage === l}
                  onClick={() => setTargetLanguage(l)}
                />
              ))}
            </Selector>
          </div>

          {outputType === "custom" && (
            <input
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              placeholder="Turn it into... e.g. a wedding toast, a recipe"
              className="mt-3 w-full bg-transparent px-3 py-2.5 text-[14px] outline-none"
              style={{ border: `1px solid ${ACCENT}`, color: t.ink }}
            />
          )}

            {/* Vocabulary (optional) */}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span
                className="font-mono-label text-[11px] uppercase tracking-[0.14em]"
                style={{ color: t.inkDim }}
              >
                05 Vocabulary{" "}
                <span style={{ color: t.inkFaint }}>optional</span>
              </span>
              <input
                value={vocabulary}
                onChange={(e) => setVocabulary(e.target.value)}
                placeholder="names, brands, jargon to keep right"
                className="min-w-[180px] flex-1 bg-transparent px-3 py-2 text-[14px] outline-none"
                style={{
                  borderBottom: `1px solid ${t.lineStrong}`,
                  color: t.ink,
                }}
              />
            </div>
          </div>
        </div>

        {error && (
          <p
            className="font-mono-label mb-4 px-3 py-2 text-[12px]"
            style={{ background: "rgba(200,49,47,0.12)", color: "#ff6b68" }}
          >
            {error}
          </p>
        )}

        {/* Two panels. Record is the action on the Ramble box (left); Babble it
            mirrors it on the Babble box (right). Output gets the most room. */}
        <div className="grid gap-4 lg:grid-cols-[1fr_1.25fr] lg:items-stretch">
          {/* RAMBLE (input) */}
          <section
            className="relative flex min-h-[520px] flex-col"
            style={{ background: t.panel, border: `1px solid ${t.lineStrong}` }}
          >
            <div
              className="flex items-center justify-between gap-2 px-4 py-3"
              style={{ borderBottom: `1px solid ${t.line}` }}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={recording ? handleStop : handleStart}
                  disabled={transcribing}
                  className="font-mono-label flex items-center gap-2.5 px-5 py-2.5 text-[13px] font-bold uppercase tracking-[0.12em] transition active:translate-y-px disabled:opacity-60"
                  style={
                    recording
                      ? {
                          background: "#ff3b30",
                          color: "#fff",
                          boxShadow: "0 10px 26px -10px rgba(255,59,48,0.85)",
                        }
                      : {
                          background: t.ink,
                          color: t.panel,
                          boxShadow: "0 10px 26px -12px rgba(0,0,0,0.5)",
                        }
                  }
                >
                  <span
                    className={recording ? "" : "rb-blink"}
                    style={{
                      display: "inline-block",
                      height: 11,
                      width: 11,
                      borderRadius: recording ? 2 : 999,
                      background: recording ? "#fff" : "#ff3b30",
                    }}
                  />
                  {transcribing
                    ? loadingWord
                    : recording
                      ? "Stop"
                      : "Record a ramble"}
                </button>
                <span
                  className="font-mono-label hidden text-[10px] uppercase tracking-[0.14em] sm:inline"
                  style={{ color: t.inkFaint }}
                >
                  your words in
                </span>
              </div>
              <button
                onClick={pasteIn}
                className="font-mono-label px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] transition"
                style={{ border: `1px solid ${t.lineStrong}`, color: t.ink }}
              >
                Paste
              </button>
            </div>

            <div className="relative flex-1">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Talk or paste your messy thoughts here, the texts you shouldn't send yet. That is the point."
                className="h-full min-h-[340px] w-full resize-none bg-transparent p-4 text-[17px] leading-[1.6] outline-none"
                style={{ color: t.ink }}
              />
              {recording && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-4"
                  style={{ background: t.panel }}
                >
                  <div className="flex h-12 items-end gap-1.5">
                    {[14, 30, 46, 24, 38, 18, 42].map((h, i) => (
                      <span
                        key={i}
                        className="rb-wave-bar w-1.5"
                        style={{
                          height: h,
                          background: ACCENT,
                          animationDuration: `${0.5 + (i % 4) * 0.1}s`,
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
                  <div className="flex gap-2">
                    <button
                      onClick={recorder.cancel}
                      className="font-mono-label px-4 py-2 text-[11px] uppercase tracking-[0.12em]"
                      style={{ border: `1px solid ${t.lineStrong}`, color: t.ink }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleStop}
                      className="font-mono-label px-4 py-2 text-[11px] uppercase tracking-[0.12em] text-white"
                      style={{ background: ACCENT }}
                    >
                      Stop
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div
              className="flex items-center justify-between px-4 py-2.5"
              style={{ borderTop: `1px solid ${t.line}` }}
            >
              <span
                className="font-mono-label text-[11px] uppercase tracking-[0.12em]"
                style={{ color: t.inkFaint }}
              >
                {words} words / {chars} chars
              </span>
              <button
                onClick={handleClear}
                className="font-mono-label text-[11px] uppercase tracking-[0.12em]"
                style={{ color: t.inkDim }}
              >
                Clear
              </button>
            </div>
            {limitNotice && (
              <p
                className="font-mono-label px-4 pb-3 text-[11px]"
                style={{ color: "#ff5a3c" }}
              >
                {limitNotice}
              </p>
            )}
          </section>

          {/* BABBLE (output) — the prize. Babble it is the action button here,
              mirroring Record on the Ramble box. */}
          <section
            className="flex min-h-[520px] flex-col"
            style={{ background: t.panel, border: `1px solid ${t.lineStrong}` }}
          >
            <div
              className="flex items-center justify-between gap-2 px-4 py-3"
              style={{ borderBottom: `1px solid ${t.line}` }}
            >
              <div className="flex min-w-0 items-center gap-3">
                <button
                  onClick={() => runCleanup()}
                  disabled={cleaning}
                  className="font-mono-label flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold uppercase tracking-[0.12em] text-white transition active:translate-y-px disabled:opacity-80"
                  style={{
                    backgroundImage: GRADIENT,
                    boxShadow: "0 10px 26px -10px rgba(123,92,255,0.85)",
                  }}
                >
                  {cleaning ? (
                    <>
                      <span
                        className="rb-spin inline-block h-3.5 w-3.5 rounded-full border-2"
                        style={{
                          borderColor: "rgba(255,255,255,0.4)",
                          borderTopColor: "#fff",
                        }}
                      />
                      {loadingWord}
                    </>
                  ) : (
                    <>
                      Babble it{" "}
                      <span aria-hidden>&rarr;</span>
                    </>
                  )}
                </button>
                <span
                  className="font-mono-label hidden truncate text-[10px] uppercase tracking-[0.14em] sm:inline"
                  style={{ color: t.inkFaint }}
                >
                  {hasResult ? metaLabel : "the result out"}
                </span>
              </div>
              {hasResult && !revealing && (
                <button
                  onClick={handleCopy}
                  className="font-mono-label shrink-0 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] transition"
                  style={{ background: t.ink, color: t.panel }}
                >
                  {copyLabel}
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {!hasResult && !cleaning ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <span
                    className="font-serif-i text-[80px] leading-none"
                    style={{ color: ACCENT }}
                  >
                    b
                  </span>
                  <p
                    className="mt-3 max-w-xs text-[15px]"
                    style={{ color: t.inkDim }}
                  >
                    Your refined or babbled text lands here. Stack a few choices,
                    then babble it.
                  </p>
                </div>
              ) : (
                <div>
                  <div
                    className="font-serif-i whitespace-pre-wrap text-[23px] leading-[1.5]"
                    style={{ color: t.ink }}
                  >
                    {cleaning && !shownOutput ? "" : shownOutput}
                  </div>

                  {!revealing && hasResult && keyPoints.length > 0 && (
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
                            className="flex gap-2 text-[15px]"
                            style={{ color: t.inkDim }}
                          >
                            <span
                              className="font-mono-label text-[12px]"
                              style={{ color: ACCENT }}
                            >
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            {p}
                          </li>
                        ))}
                      </ol>
                    </Collapsible>
                  )}

                  {!revealing && hasResult && followUps.length > 0 && (
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
                            className="flex items-center gap-2 py-2 text-[15px]"
                            style={{
                              color: t.ink,
                              borderTop: i ? `1px solid ${t.line}` : undefined,
                            }}
                          >
                            <span style={{ color: ACCENT }} aria-hidden>
                              &rarr;
                            </span>
                            {f}
                          </div>
                        ))}
                      </div>
                    </Collapsible>
                  )}
                </div>
              )}
            </div>

            {hasResult && !revealing && (
              <div
                className="flex flex-wrap gap-px"
                style={{ background: t.line, borderTop: `1px solid ${t.line}` }}
              >
                <ActionBtn t={t} onClick={handleCopy}>
                  {copyLabel}
                </ActionBtn>
                <ActionBtn t={t} onClick={handleShare}>
                  Share
                </ActionBtn>
                <ActionBtn t={t} onClick={() => runCleanup("again")} disabled={busy}>
                  Try again
                </ActionBtn>
                <ActionBtn t={t} onClick={handleClear}>
                  Clear
                </ActionBtn>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

type T = (typeof THEMES)[Theme];

function Wordmark({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-2 text-[24px]" style={{ color }}>
      <span className="font-bric font-extrabold" style={{ letterSpacing: "-0.02em" }}>
        Ramble
      </span>
      <span
        className="rb-shake font-babble inline-block bg-clip-text text-transparent"
        style={{ backgroundImage: GRADIENT, fontSize: "1.4em" }}
      >
        Babble
      </span>
    </div>
  );
}

function Selector({
  t,
  index,
  label,
  value,
  placeholder,
  optional,
  open,
  onToggle,
  children,
}: {
  t: T;
  index: string;
  label: string;
  value: string;
  placeholder: string;
  optional?: boolean;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const set = !!value;
  return (
    <div className="relative" style={{ background: t.panel }}>
      <button
        onClick={onToggle}
        className="flex w-full flex-col gap-1 px-3.5 py-3 text-left transition"
        style={{
          background: open
            ? "rgba(123,92,255,0.12)"
            : set
              ? "rgba(123,92,255,0.07)"
              : t.panel,
          boxShadow: set ? `inset 0 -3px 0 ${ACCENT}` : "none",
        }}
      >
        <span
          className="font-mono-label flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em]"
          style={{ color: t.inkDim }}
        >
          {index} {label}
          {set ? (
            <span style={{ color: ACCENT }} className="ml-auto font-bold">
              ● selected
            </span>
          ) : optional ? (
            <span style={{ color: t.inkFaint }} className="ml-auto">
              optional
            </span>
          ) : null}
        </span>
        <span
          className="truncate text-[18px]"
          style={{
            color: set ? t.ink : t.inkDim,
            fontWeight: set ? 600 : 400,
          }}
        >
          {value || placeholder}
        </span>
      </button>
      {open && (
        <div
          className="absolute left-0 right-0 top-full z-40 max-h-[320px] overflow-y-auto"
          style={{
            background: t.panel,
            border: `1px solid ${t.lineStrong}`,
            boxShadow: "0 24px 50px -16px rgba(0,0,0,0.6)",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function GroupedOptions({
  t,
  heading,
  groups,
  options,
  value,
  onPick,
}: {
  t: T;
  heading: string;
  groups: OptionGroup[];
  options: Option[];
  value: string;
  onPick: (id: string) => void;
}) {
  return (
    <div>
      <div
        className="font-mono-label px-3 pb-1 pt-3 text-[10px] uppercase tracking-[0.18em]"
        style={{ color: ACCENT }}
      >
        {heading}
      </div>
      {groups.flatMap((g) =>
        g.ids.map((id) => {
          const o = options.find((x) => x.id === id);
          if (!o) return null;
          return (
            <OptionRow
              t={t}
              key={id}
              label={o.label}
              active={value === id}
              onClick={() => onPick(id)}
            />
          );
        }),
      )}
    </div>
  );
}

function FlatOptions({
  t,
  options,
  value,
  onPick,
  allowNone,
  noneLabel,
}: {
  t: T;
  options: Option[];
  value: string;
  onPick: (id: string) => void;
  allowNone?: boolean;
  noneLabel?: string;
}) {
  return (
    <div>
      {allowNone && (
        <OptionRow
          t={t}
          label={noneLabel ?? "None"}
          active={!value}
          onClick={() => onPick("")}
        />
      )}
      {options.map((o) => (
        <OptionRow
          t={t}
          key={o.id}
          label={o.label}
          active={value === o.id}
          onClick={() => onPick(o.id)}
        />
      ))}
    </div>
  );
}

function OptionRow({
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
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[14px] transition hover:pl-4"
      style={{ color: active ? ACCENT : t.ink }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = t.ink;
        e.currentTarget.style.color = t.panel;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = active ? ACCENT : t.ink;
      }}
    >
      {active && (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: ACCENT }}
        />
      )}
      {label}
    </button>
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
    <div className="rb-rise mt-6" style={{ borderTop: `1px solid ${t.line}` }}>
      <button
        onClick={onToggle}
        className="font-mono-label flex w-full items-center justify-between pt-4 text-[11px] uppercase tracking-[0.16em]"
        style={{ color: t.inkDim }}
      >
        {label}
        <span aria-hidden>{open ? "^" : "v"}</span>
      </button>
      {open && children}
    </div>
  );
}

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
      className="font-mono-label flex-1 px-4 py-3 text-[11px] uppercase tracking-[0.12em] transition disabled:opacity-50"
      style={{ background: t.panel, color: t.ink }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = t.ink;
        e.currentTarget.style.color = t.panel;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = t.panel;
        e.currentTarget.style.color = t.ink;
      }}
    >
      {children}
    </button>
  );
}
