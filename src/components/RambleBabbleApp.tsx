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

// Two genuinely different modes: NIGHT (void-black chrome, bright paper panels)
// and DAY (light chrome, white paper panels). No tone-on-tone in either.
type Theme = "night" | "day";
const THEMES = {
  night: {
    canvas: "#0b0c0f",
    chrome: "rgba(11,12,15,0.94)",
    cInk: "#f3f5f7",
    cDim: "#b2b8c2",
    cLine: "rgba(243,245,247,0.16)",
    cLineStrong: "rgba(243,245,247,0.36)",
    // Output boxes = bright paper. Control deck = a cooler mist gray, distinct.
    panel: "#eef0f4",
    panel2: "#dfe2e8",
    control: "#cbd2da",
    control2: "#bcc4ce",
    ink: "#14161b",
    inkDim: "#454c55",
    inkFaint: "#6a717a",
    line: "rgba(19,22,26,0.20)",
    lineStrong: "rgba(19,22,26,0.36)",
  },
  day: {
    canvas: "#eef1f4",
    chrome: "rgba(238,241,244,0.94)",
    cInk: "#14161b",
    cDim: "#454c55",
    cLine: "rgba(19,22,26,0.16)",
    cLineStrong: "rgba(19,22,26,0.32)",
    // Boxes pure white; control deck the cool mist gray so it stands out.
    panel: "#ffffff",
    panel2: "#eceef2",
    control: "#cbd2da",
    control2: "#bcc4ce",
    ink: "#14161b",
    inkDim: "#454c55",
    inkFaint: "#6a717a",
    line: "rgba(19,22,26,0.16)",
    lineStrong: "rgba(19,22,26,0.30)",
  },
} as const;

function formatTime(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
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
  const t = THEMES[theme];

  // Display name + initial for the account avatar (from the signed-in user).
  const accountName = (userEmail || "").split("@")[0] || "you";
  const accountInitial = (accountName[0] || "Y").toUpperCase();

  const [inputText, setInputText] = useState(reopen?.transcript ?? "");
  const [outputType, setOutputType] = useState(reopen?.output_type ?? "");
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
  const [accountOpen, setAccountOpen] = useState(false);
  const [overlay, setOverlay] = useState<"settings" | "upgrade" | null>(null);

  const revealRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Measure the sticky top zone so the Ramble/Babble headers can stick right
  // below it (keeping Record / Babble it / Copy reachable while scrolling).
  const topZoneRef = useRef<HTMLDivElement>(null);
  const [topH, setTopH] = useState(0);
  useEffect(() => {
    const measure = () => {
      if (topZoneRef.current) setTopH(topZoneRef.current.offsetHeight);
    };
    measure();
    window.addEventListener("resize", measure);
    const id = setInterval(measure, 1000);
    return () => {
      window.removeEventListener("resize", measure);
      clearInterval(id);
    };
  }, []);

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
        setError("Record or paste your ramble first, then Babble it.");
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
          // The Supabase builder is lazy: it only runs when awaited / .then'd.
          // Calling .then here is what actually sends the insert.
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
    setOutputType("");
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
      className="font-mono-label text-[12px] font-bold uppercase tracking-[0.14em] transition"
      style={{ color: active ? ACCENT : t.cInk }}
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

      {/* STICKY TOP — the whole header stays put: the brand, the title, and
          your highlighted choices stay visible no matter how far you scroll. */}
      <div
        ref={topZoneRef}
        className="sticky top-0 z-30"
        style={{
          background: t.chrome,
          backdropFilter: "blur(10px)",
          borderBottom: `1px solid ${t.cLine}`,
        }}
      >
        <header className="flex items-center justify-between px-8 py-3">
          <Wordmark color={t.cInk} />
          <div className="flex items-center gap-4">
            {navBtn("Home", true, () => {})}
            {navBtn("Archive", false, onOpenHistory)}
            <button
              onClick={() => setOverlay("upgrade")}
              className="font-mono-label px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition hover:brightness-110 active:translate-y-px"
              style={{
                backgroundImage: GRADIENT,
                boxShadow: "0 8px 20px -8px rgba(123,92,255,0.85)",
              }}
            >
              Upgrade
            </button>
            {/* Day / Night as a two-icon switch: click the sun for day, the
                moon for night. No words, no which-way-does-it-go confusion. */}
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
                className="font-mono-label flex h-8 w-8 items-center justify-center text-[13px] font-bold text-white transition active:translate-y-px"
                style={{ background: ACCENT }}
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
                        className="font-mono-label flex h-7 w-7 items-center justify-center text-[12px] font-bold text-white"
                        style={{ background: ACCENT }}
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
                          className="font-mono-label block text-[9px] uppercase tracking-[0.14em]"
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
                      accent
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

        <div className="px-8 pb-3">
          {/* Title — "Ramble" is the brand, so it wears the brand gradient. */}
          <div className="mb-2.5 flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
            <h1
              className="font-bric font-extrabold leading-none"
              style={{ fontSize: "clamp(26px,2.4vw,36px)", letterSpacing: "-0.03em" }}
            >
              Refine a{" "}
              <span
                className="font-bric"
                style={{
                  backgroundImage: GRADIENT,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                Ramble
              </span>
            </h1>
            <p
              className="font-mono-label max-w-xl text-[11px] uppercase leading-[1.6] tracking-[0.08em]"
              style={{ color: t.cDim }}
            >
              Record on the left, Babble on the right. Pick a Format (try
              &ldquo;Clean it up&rdquo;). Tone, character, accent are optional.
            </p>
          </div>

          {/* Flattened control console — its own mist-gray surface, distinct
              from the Ramble/Babble boxes, with a brand-gradient edge for life. */}
          <div style={{ border: `1px solid ${t.lineStrong}`, background: t.control }}>
            <div style={{ height: 3, backgroundImage: GRADIENT }} />
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
                <GroupedOptions
                  t={t}
                  groups={TONE_GROUPS}
                  options={TONES}
                  value={tone}
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
                <GroupedOptions
                  t={t}
                  groups={PERSONA_GROUPS}
                  options={PERSONAS}
                  value={persona}
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
              <GroupedOptions
                t={t}
                groups={ACCENT_GROUPS}
                options={ACCENTS}
                value={accent}
                noneLabel="No accent"
                onPick={(id) => {
                  setAccent(id);
                  setOpenDropdown(null);
                }}
              />
              <div
                className="font-mono-label px-3 pb-1 pt-2.5 text-[10px] font-bold uppercase tracking-[0.16em]"
                style={{ color: ACCENT }}
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
                className="w-full bg-transparent px-3 py-2.5 text-[14px] outline-none"
                style={{
                  background: t.panel,
                  borderTop: `1px solid ${t.lineStrong}`,
                  borderBottom: `2px solid ${ACCENT}`,
                  color: t.ink,
                }}
              />
            )}

            {/* Keep-words + Reset — white cell, distinct from the gray selectors */}
            <div
              className="flex flex-wrap items-center gap-3 px-3 py-2.5"
              style={{ background: t.panel, borderTop: `1px solid ${t.lineStrong}` }}
            >
              <span
                className="font-mono-label text-[11px] uppercase tracking-[0.12em]"
                style={{ color: t.ink }}
              >
                05 Keep words exact{" "}
                <span className="font-bold" style={{ color: ACCENT }}>
                  · optional
                </span>
              </span>
              <input
                value={vocabulary}
                onChange={(e) => setVocabulary(e.target.value)}
                placeholder="e.g. people's names, a company or product name to spell right"
                className="min-w-[220px] flex-1 bg-transparent px-2 py-1 text-[14px] outline-none"
                style={{ color: t.ink, borderBottom: `1px solid ${t.lineStrong}` }}
              />
              <button
                onClick={resetChoices}
                className="font-mono-label flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] transition active:translate-y-px"
                style={{ background: t.ink, color: t.panel }}
              >
                <span aria-hidden>&#8635;</span> Reset choices
              </button>
            </div>
          </div>
        </div>
      </div>

      <main
        className="relative z-10 mx-auto w-full px-8 pb-12 pt-5"
        style={{ maxWidth: 1760 }}
      >
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
        <div className="grid gap-4 lg:grid-cols-[1fr_1.42fr] lg:items-stretch">
          {/* RAMBLE (input) — 06 in the numbered flow */}
          <section
            className="relative flex min-h-[540px] flex-col"
            style={{ background: t.panel, border: `1px solid ${t.lineStrong}` }}
          >
            <div
              className="sticky z-10 flex items-center justify-between gap-2 px-4 py-2"
              style={{
                top: topH,
                minHeight: 60,
                background: t.panel2,
                borderBottom: `1px solid ${t.lineStrong}`,
              }}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="font-mono-label text-[12px] font-bold"
                  style={{ color: ACCENT }}
                >
                  06
                </span>
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
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={pasteIn}
                  className="font-mono-label px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.1em] transition active:translate-y-px"
                  style={{ background: t.ink, color: t.panel }}
                >
                  Paste a ramble
                </button>
                <button
                  onClick={() => {
                    if (recorder.status === "recording") recorder.cancel();
                    setInputText("");
                    setError(null);
                    setLimitNotice(null);
                  }}
                  disabled={!inputText}
                  className="font-mono-label flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.1em] transition active:translate-y-px disabled:opacity-40"
                  style={{ background: t.ink, color: t.panel }}
                >
                  <span aria-hidden style={{ color: "#ff6b68", fontSize: 15 }}>
                    &times;
                  </span>{" "}
                  Clear
                </button>
              </div>
            </div>

            <div className="relative flex-1">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ramble in, Babble out. Spill your messiest rambles right here, the voice memos, the half-baked ideas, the texts you definitely shouldn't send yet. That's the whole point."
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

          {/* BABBLE (output) — the prize. The whole box wears the brand-gradient
              outline so it reads as the result, distinct from the Ramble box. */}
          <div className="flex" style={{ backgroundImage: GRADIENT, padding: 2 }}>
            <section
              className="flex min-h-[540px] flex-1 flex-col"
              style={{ background: "#f5f3fb" }}
            >
            <div
              className="sticky z-10 flex items-center justify-between gap-2 px-4 py-2"
              style={{
                top: topH,
                minHeight: 60,
                background: "#e7e4f6",
                borderBottom: `1px solid ${t.lineStrong}`,
              }}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="font-mono-label text-[12px] font-bold"
                  style={{ color: ACCENT }}
                >
                  07
                </span>
                <button
                  onClick={() => runCleanup()}
                  disabled={cleaning}
                  title="Babble it"
                  className="flex items-center gap-2 transition hover:brightness-110 active:translate-y-px disabled:opacity-70"
                >
                  {cleaning ? (
                    <span
                      className="font-mono-label flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.12em]"
                      style={{ color: ACCENT }}
                    >
                      <span
                        className="rb-spin inline-block h-4 w-4 rounded-full border-2"
                        style={{
                          borderColor: "rgba(123,92,255,0.35)",
                          borderTopColor: ACCENT,
                        }}
                      />
                      {loadingWord}
                    </span>
                  ) : (
                    <span
                      className="rb-babbleit font-babble inline-block bg-clip-text text-transparent"
                      style={{
                        backgroundImage: GRADIENT,
                        fontSize: 32,
                        lineHeight: 1.15,
                      }}
                    >
                      Babble it
                    </span>
                  )}
                </button>
                <span
                  className="font-mono-label hidden truncate text-[11px] font-bold uppercase tracking-[0.12em] lg:inline"
                  style={{
                    color: hasResult || inputText.trim() ? ACCENT : t.inkDim,
                  }}
                >
                  {hasResult
                    ? metaLabel
                    : inputText.trim()
                      ? "ready — tap to generate"
                      : "your Babble lands here"}
                </span>
              </div>
              <button
                onClick={handleCopy}
                disabled={!cleaned || revealing}
                className="font-mono-label shrink-0 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] transition active:translate-y-px disabled:opacity-40"
                style={{ background: t.ink, color: t.panel }}
              >
                {copyLabel}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {!hasResult && !cleaning ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <span
                    className="font-serif-i text-[64px] leading-none"
                    style={{ color: ACCENT }}
                  >
                    b
                  </span>
                  <p
                    className="mt-3 max-w-xs text-[15px]"
                    style={{ color: t.inkDim }}
                  >
                    Your cleaned-up, organized result lands right here.
                  </p>
                  {/* Unmistakable generate button so nobody hunts for it. */}
                  <button
                    onClick={() => runCleanup()}
                    disabled={cleaning}
                    className="rb-glowpulse mt-6 flex items-center gap-2.5 px-8 py-4 text-[16px] font-bold uppercase tracking-[0.1em] text-white transition hover:brightness-110 active:translate-y-px"
                    style={{
                      backgroundImage: GRADIENT,
                      boxShadow: "0 18px 44px -10px rgba(123,92,255,0.9)",
                    }}
                  >
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden
                    >
                      <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" />
                    </svg>
                    Babble it
                    <span aria-hidden>&rarr;</span>
                  </button>
                  <span
                    className="font-mono-label mt-3 text-[10px] uppercase tracking-[0.16em]"
                    style={{ color: t.inkFaint }}
                  >
                    tap to generate your result
                  </span>
                </div>
              ) : (
                <div>
                  <div
                    className="whitespace-pre-wrap text-[17px] leading-[1.7]"
                    style={{
                      color: t.ink,
                      fontFamily: '"Space Grotesk", system-ui, sans-serif',
                      maxWidth: "70ch",
                    }}
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
        </div>
      </main>

      {overlay === "settings" && (
        <Overlay t={t} title="Settings" onClose={() => setOverlay(null)}>
          <SettingRow t={t} label="Account">
            <span style={{ color: t.ink }}>You&rsquo;re signed in.</span>
          </SettingRow>
          <SettingRow t={t} label="Appearance">
            <button
              onClick={() => setTheme((th) => (th === "night" ? "day" : "night"))}
              className="font-mono-label px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em]"
              style={{ background: ACCENT, color: "#fff" }}
            >
              {theme === "night" ? "Switch to Day" : "Switch to Night"}
            </button>
          </SettingRow>
          <SettingRow t={t} label="Plan">
            <button
              onClick={() => setOverlay("upgrade")}
              className="font-mono-label px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em]"
              style={{ backgroundImage: GRADIENT, color: "#fff" }}
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
          <p className="mb-5 text-[14px]" style={{ color: t.inkDim }}>
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

type T = (typeof THEMES)[Theme];

function Wordmark({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-2.5 text-[24px]" style={{ color }}>
      <span className="font-bric font-extrabold" style={{ letterSpacing: "-0.02em" }}>
        Ramble
      </span>
      {/* Bigger and tilted (b dips low, e kicks up), still vibrating. */}
      <span
        className="inline-block"
        style={{ transform: "rotate(-7deg)", transformOrigin: "center" }}
      >
        <span
          className="rb-shake font-babble inline-block bg-clip-text text-transparent"
          style={{ backgroundImage: GRADIENT, fontSize: "1.75em" }}
        >
          Babble
        </span>
      </span>
    </div>
  );
}

function AccountItem({
  t,
  label,
  accent,
  onClick,
}: {
  t: T;
  label: string;
  accent?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="font-mono-label flex w-full items-center px-4 py-2.5 text-left text-[12px] font-bold uppercase tracking-[0.1em] transition"
      style={{ background: "transparent", color: accent ? ACCENT : t.ink }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = t.ink;
        e.currentTarget.style.color = t.panel;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = accent ? ACCENT : t.ink;
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
        <div style={{ height: 3, backgroundImage: GRADIENT }} />
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
      <div className="text-[14px]">{children}</div>
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
        border: highlight ? `2px solid ${ACCENT}` : `1px solid ${t.lineStrong}`,
      }}
    >
      <span
        className="font-mono-label text-[11px] font-bold uppercase tracking-[0.14em]"
        style={{ color: highlight ? ACCENT : t.inkDim }}
      >
        {name}
      </span>
      <span
        className="font-bric mt-1 text-[28px] font-extrabold"
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
          highlight
            ? { backgroundImage: GRADIENT, color: "#fff" }
            : { background: t.ink, color: t.panel }
        }
      >
        {cta}
      </button>
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
    <div className="relative" style={{ background: t.control }}>
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left transition"
        style={{
          background: open
            ? "rgba(123,92,255,0.18)"
            : set
              ? "rgba(123,92,255,0.12)"
              : t.control,
          boxShadow: set ? `inset 0 -3px 0 ${ACCENT}` : "none",
        }}
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span
            className="font-mono-label flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em]"
            style={{ color: t.inkDim }}
          >
            {index} {label}
            {set ? (
              <span style={{ color: ACCENT }} className="font-bold">
                · selected
              </span>
            ) : optional ? (
              <span style={{ color: t.inkDim }} className="font-bold">
                · optional
              </span>
            ) : null}
          </span>
          <span
            className="truncate text-[16px]"
            style={{
              color: set ? t.ink : t.inkDim,
              fontWeight: set ? 700 : 500,
            }}
          >
            {value || placeholder}
          </span>
        </span>
        {/* caret makes it unmistakably a menu, not a text field */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={set ? ACCENT : t.inkDim}
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
      </button>
      {open && (
        <div
          className="absolute left-0 right-0 top-full z-40 max-h-[340px] overflow-y-auto"
          style={{
            background: t.panel,
            border: `1px solid ${t.lineStrong}`,
            boxShadow: "0 24px 50px -16px rgba(0,0,0,0.55)",
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
  noneLabel,
}: {
  t: T;
  heading?: string;
  groups: OptionGroup[];
  options: Option[];
  value: string;
  onPick: (id: string) => void;
  noneLabel?: string;
}) {
  return (
    <div>
      {heading && (
        <div
          className="font-mono-label px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-[0.18em]"
          style={{ color: ACCENT }}
        >
          {heading}
        </div>
      )}
      {noneLabel && (
        <OptionRow
          t={t}
          label={noneLabel}
          active={!value}
          onClick={() => onPick("")}
        />
      )}
      {groups.map((g) => (
        <div key={g.label}>
          <div
            className="font-mono-label px-3 pb-1 pt-2.5 text-[10px] uppercase tracking-[0.16em]"
            style={{ color: t.inkFaint }}
          >
            {g.label}
          </div>
          {g.ids.map((id) => {
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
          })}
        </div>
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
