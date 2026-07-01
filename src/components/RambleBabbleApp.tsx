"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  onRequestAuth,
  reopen,
}: {
  userId: string | null;
  userEmail: string;
  onOpenHistory: () => void;
  onSignOut: () => void;
  onRequestAuth: (mode: "signin" | "signup") => void;
  reopen: SavedRamble | null;
}) {
  // Try-first: anyone can ramble + babble without an account. After a few free
  // Babbles we gate on signup (the hook comes before the ask). Saving always
  // needs an account.
  // BETA: the hard gate is OFF while friends are testing, nobody (signed in or
  // not) gets blocked. Flip GATE_LIVE to true when the testing week ends. The
  // soft "create a free account to save" nudge still shows, so we keep
  // capturing signups without walling anyone.
  const GATE_LIVE = false;
  const FREE_BABBLES = 3;
  const [theme, setTheme] = useState<Theme>("night");
  const t = THEMES[theme];

  // Display name + initial for the account avatar (from the signed-in user).
  const accountName = (userEmail || "").split("@")[0] || "you";
  const accountInitial = (accountName[0] || "Y").toUpperCase();

  const [inputText, setInputText] = useState(reopen?.transcript ?? "");
  const [outputType, setOutputType] = useState(reopen?.output_type ?? "note");
  const [tone, setTone] = useState(reopen?.tone ?? "");
  const [vocabulary, setVocabulary] = useState("");
  const [accent, setAccent] = useState("");
  const [persona, setPersona] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("");
  const [customInstruction, setCustomInstruction] = useState("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  // Mobile: the whole options console collapses behind one tap so the ramble
  // gets the screen. Desktop/iPad keep it always-open (there's room).
  const [showOptions, setShowOptions] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  // ONE thing at a time, full screen: "compose" (ramble + options) or "result"
  // (the Babble, full width, with room to read it all). Babble it -> result;
  // a Back button returns to compose. Kills the cramped two-panel scroll mess.
  const [view, setView] = useState<"compose" | "result">(
    reopen?.cleaned ? "result" : "compose",
  );
  const [rambleCopied, setRambleCopied] = useState(false);
  const copyRamble = useCallback(() => {
    if (!inputText.trim()) return;
    void navigator.clipboard?.writeText(inputText);
    setRambleCopied(true);
    setTimeout(() => setRambleCopied(false), 1300);
  }, [inputText]);

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

  // Auto-dismiss the error toast after a few seconds.
  useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(id);
  }, [error]);

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
      // Try-first gate: let anonymous visitors babble a few times for free, then
      // ask them to create an account (the hook comes before the ask). "Try
      // again" on an existing result never counts against the free quota.
      if (GATE_LIVE && !userId && !modifier) {
        const used =
          typeof window !== "undefined"
            ? parseInt(window.localStorage.getItem("rb_free_used") || "0", 10)
            : 0;
        if (used >= FREE_BABBLES) {
          onRequestAuth("signup");
          return;
        }
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
        setFollowOpen(true);
        startReveal(out);
        setView("result");
        // Anonymous try-first: count this free Babble (so we can gate after a
        // few). Logged-in users save to their archive instead.
        if (!userId && !modifier && typeof window !== "undefined") {
          const used = parseInt(
            window.localStorage.getItem("rb_free_used") || "0",
            10,
          );
          window.localStorage.setItem("rb_free_used", String(used + 1));
        }
        if (!modifier && userId) {
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
    setView("compose");
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
    outputType === "custom" ? "Something else" : selectedStyle?.label,
    selectedTone?.label,
    selectedPersona?.label,
    selectedAccent?.label,
    targetLanguage,
  ]
    .filter(Boolean)
    .join("  ·  ");

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
      {/* Always-visible error toast (fixed, so you see it no matter where you
          are on the page or how small the screen). Tap to dismiss. */}
      {error && (
        <button
          onClick={() => setError(null)}
          role="alert"
          className="rb-rise fixed bottom-6 left-1/2 z-[90] flex max-w-[92vw] -translate-x-1/2 items-center gap-2 px-5 py-3.5 text-left text-[14px] font-bold text-white"
          style={{
            background: "#ff3b30",
            boxShadow: "0 16px 40px -10px rgba(255,59,48,0.6)",
          }}
        >
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[13px]"
            style={{ background: "rgba(255,255,255,0.25)" }}
          >
            !
          </span>
          {error}
        </button>
      )}

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
        <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:px-8">
          <Wordmark color={t.cInk} />
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {navBtn("Home", true, () => {})}
            {navBtn("My Rambles", false, onOpenHistory)}
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
              {userId ? (
                <button
                  onClick={() => setAccountOpen((o) => !o)}
                  title={`Account (${accountName})`}
                  className="font-mono-label flex h-8 w-8 items-center justify-center text-[13px] font-bold text-white transition active:translate-y-px"
                  style={{ background: ACCENT }}
                >
                  {accountInitial}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onRequestAuth("signin")}
                    className="font-mono-label whitespace-nowrap px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] transition active:translate-y-px"
                    style={{ background: "rgba(243,245,247,0.14)", color: t.cInk }}
                  >
                    Sign in
                  </button>
                  <button
                    onClick={() => onRequestAuth("signup")}
                    className="font-mono-label whitespace-nowrap px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition hover:brightness-110 active:translate-y-px"
                    style={{
                      backgroundImage: GRADIENT,
                      boxShadow: "0 8px 20px -8px rgba(123,92,255,0.85)",
                    }}
                  >
                    Create account
                  </button>
                </div>
              )}
              {userId && accountOpen && (
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

        <div className="px-4 pb-3 sm:px-8">
          {/* Title — "Ramble" is the brand, so it wears the brand gradient. */}
          <div className="mb-2.5 flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
            <div className="flex items-center gap-2.5">
              <h1
                className="font-bric font-extrabold leading-none"
                style={{
                  fontSize: "clamp(26px,2.4vw,36px)",
                  letterSpacing: "-0.03em",
                }}
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
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                aria-label="How the style options work"
                title="How the style options work"
                className="font-mono-label flex h-6 w-6 shrink-0 items-center justify-center text-[13px] font-bold transition hover:brightness-110"
                style={{ background: ACCENT, color: "#fff", borderRadius: 999 }}
              >
                ?
              </button>
            </div>
            {view === "compose" && (
              <p
                className="font-mono-label hidden max-w-xl text-[11px] uppercase leading-[1.6] tracking-[0.08em] sm:block"
                style={{ color: t.cDim }}
              >
                Record or paste your ramble, pick a format (try &ldquo;Clean
                &amp; Concise&rdquo;), then hit Babble it. Tone, character,
                accent, language are optional.
              </p>
            )}
          </div>

          {helpOpen && (
            <div
              className="fixed inset-0 z-[70] flex items-center justify-center p-4"
              onClick={() => setHelpOpen(false)}
            >
              <div
                className="absolute inset-0"
                style={{ background: "rgba(0,0,0,0.55)" }}
              />
              <div
                onClick={(e) => e.stopPropagation()}
                className="relative z-[71] w-full max-w-[440px] p-5"
                style={{
                  background: t.panel,
                  border: `1px solid ${t.lineStrong}`,
                  boxShadow: "0 24px 60px -16px rgba(0,0,0,0.6)",
                }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className="font-mono-label text-[12px] font-bold uppercase tracking-[0.14em]"
                    style={{ color: ACCENT }}
                  >
                    How to shape your Babble
                  </span>
                  <button
                    onClick={() => setHelpOpen(false)}
                    className="font-mono-label text-[11px] font-bold uppercase tracking-[0.12em]"
                    style={{ color: ACCENT }}
                  >
                    Close
                  </button>
                </div>
                <ul className="space-y-2 text-[14px] leading-[1.5]" style={{ color: t.ink }}>
                  <li>
                    <b>Format</b> is what it becomes, an email, a text, a poem, a
                    rap. (This one is required.)
                  </li>
                  <li>
                    <b>Tone</b> is the vibe, casual, confident, spicy.
                  </li>
                  <li>
                    <b>Character</b> is who is saying it, a pirate, a drama
                    queen, a conspiracy theorist.
                  </li>
                  <li>
                    <b>Accent</b> is how it sounds, Southern, British, New
                    Yorker.
                  </li>
                  <li>
                    <b>Language</b> translates the whole thing.
                  </li>
                  <li>
                    <b>Keep these spellings</b> locks names or words so the app
                    never changes them.
                  </li>
                </ul>
                <p className="mt-3 text-[13px]" style={{ color: t.inkDim }}>
                  Only Format is required. Mix and match the rest, or stack
                  several for something wild.
                </p>
              </div>
            </div>
          )}

          {view === "compose" && (
            <>
          {/* Collapse the entire control panel behind one tap ("Style your
              Babble") on EVERY screen (default folded), so the ramble box owns
              the workspace. Users open it to change Format/Tone/etc, then fold. */}
          <button
            type="button"
            onClick={() => setShowOptions((o) => !o)}
            className="flex w-full items-center justify-between gap-3 px-3.5 py-3"
            style={{ border: `1px solid ${t.lineStrong}`, background: t.control }}
          >
            <span className="flex min-w-0 flex-col items-start gap-0.5 text-left">
              <span
                className="font-mono-label text-[10px] uppercase tracking-[0.16em]"
                style={{ color: t.inkDim }}
              >
                Style your Babble
              </span>
              <span
                className="max-w-[64vw] truncate text-[15px] font-bold"
                style={{ color: t.ink }}
              >
                {[
                  outputType === "custom"
                    ? "Something else"
                    : (selectedStyle?.label ?? "Clean & Concise"),
                  selectedTone?.label,
                  selectedPersona?.label,
                  selectedAccent?.label,
                  targetLanguage,
                ]
                  .filter(Boolean)
                  .join("  ·  ")}
              </span>
            </span>
            <span
              className="font-mono-label shrink-0 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white"
              style={{ backgroundImage: GRADIENT }}
            >
              {showOptions ? "Done" : "Change"}
            </span>
          </button>

          {/* Flattened control console — its own mist-gray surface, distinct
              from the Ramble/Babble boxes, with a brand-gradient edge for life. */}
          <div
            className={showOptions ? "" : "hidden"}
            style={{ border: `1px solid ${t.lineStrong}`, background: t.control }}
          >
            <div style={{ height: 3, backgroundImage: GRADIENT }} />
            <div
              className="grid grid-cols-2 gap-px lg:grid-cols-5"
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
                  label="Clean & Concise"
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
            </Selector>

              {/* LANGUAGE — its own axis now, not buried under Accent. Accent =
                  English spoken with an accent. Language = output written in that
                  language. Full width on phones so there's no broken empty cell. */}
              <Selector
                t={t}
                optional
                className="col-span-2 lg:col-span-1"
                index="05"
                label="Language"
                value={targetLanguage}
                placeholder="Same as input"
                open={openDropdown === "language"}
                onToggle={() =>
                  setOpenDropdown((d) => (d === "language" ? null : "language"))
                }
              >
                <OptionRow
                  t={t}
                  label="Same as input (no translation)"
                  active={!targetLanguage}
                  onClick={() => {
                    setTargetLanguage("");
                    setOpenDropdown(null);
                  }}
                />
                <div
                  className="font-mono-label px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: ACCENT }}
                >
                  Translate the output to
                </div>
                {LANGUAGES.map((l) => (
                  <OptionRow
                    t={t}
                    key={l}
                    label={l}
                    active={targetLanguage === l}
                    onClick={() => {
                      setTargetLanguage(l);
                      setOpenDropdown(null);
                    }}
                  />
                ))}
              </Selector>
            </div>

            {outputType === "custom" && (
              <input
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value)}
                placeholder="Turn it into... e.g. a wedding toast, a recipe"
                className="w-full bg-transparent px-3 py-2.5 text-[16px] outline-none"
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
              className="px-3 py-2.5"
              style={{ background: t.panel, borderTop: `1px solid ${t.lineStrong}` }}
            >
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="font-mono-label text-[11px] uppercase tracking-[0.12em]"
                  style={{ color: t.ink }}
                >
                  06 Keep these spellings{" "}
                  <span className="font-bold" style={{ color: ACCENT }}>
                    · optional
                  </span>
                </span>
                <input
                  value={vocabulary}
                  onChange={(e) => setVocabulary(e.target.value)}
                  placeholder="e.g. Siobhan, Kuvvi, Dr. Achebe, ProTools"
                  className="min-w-[220px] flex-1 bg-transparent px-2 py-1 text-[16px] outline-none"
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
              <p className="mt-1.5 text-[12px]" style={{ color: t.inkDim }}>
                Type any names, brands, or unusual words you want spelled exactly
                this way, so the app keeps them word-for-word and never
                &ldquo;corrects&rdquo; them. Leave blank if you don&rsquo;t have any.
              </p>
            </div>
          </div>
            </>
          )}
        </div>
      </div>

      <main
        className="relative z-10 mx-auto w-full px-4 pb-12 pt-5 sm:px-8"
        style={{ maxWidth: 1760 }}
      >
        {/* Two panels. Record is the action on the Ramble box (left); Babble it
            mirrors it on the Babble box (right). Output gets the most room. */}
        <div className="grid gap-4">
          {/* COMPOSE view: the ramble input, full width. */}
          {view === "compose" && (
          <section
            className="relative flex min-h-[60vh] flex-col"
            style={{ background: t.panel, border: `1px solid ${t.lineStrong}` }}
          >
            <div
              className="sticky z-10 flex flex-col gap-2 px-3 py-2.5 sm:px-4"
              style={{
                top: topH,
                minHeight: 60,
                background: t.panel2,
                borderBottom: `1px solid ${t.lineStrong}`,
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="font-mono-label text-[12px] font-bold"
                  style={{ color: ACCENT }}
                >
                  07
                </span>
                <button
                  onClick={recording ? handleStop : handleStart}
                  disabled={transcribing}
                  className="font-mono-label flex flex-1 items-center justify-center gap-2.5 whitespace-nowrap px-4 py-2.5 text-[13px] font-bold uppercase tracking-[0.12em] transition active:translate-y-px disabled:opacity-60 sm:px-5"
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
                  {transcribing ? (
                    <span
                      className="rb-spin inline-block h-3.5 w-3.5 rounded-full border-2"
                      style={{
                        borderColor: "rgba(255,255,255,0.35)",
                        borderTopColor: "#fff",
                      }}
                    />
                  ) : (
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
                  )}
                  {transcribing
                    ? `${loadingWord}…`
                    : recording
                      ? "Stop"
                      : "Record a ramble"}
                </button>
                <button
                  onClick={() => runCleanup()}
                  disabled={cleaning || !inputText.trim()}
                  className="font-mono-label flex flex-1 items-center justify-center gap-2 whitespace-nowrap px-4 py-2.5 text-[13px] font-bold uppercase tracking-[0.12em] text-white transition hover:brightness-110 active:translate-y-px disabled:opacity-45 disabled:saturate-50 sm:px-5"
                  style={{
                    backgroundImage: GRADIENT,
                    boxShadow: "0 10px 26px -10px rgba(123,92,255,0.8)",
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
                      {loadingWord}&hellip;
                    </>
                  ) : (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" />
                      </svg>
                      Babble it
                      <span aria-hidden>&rarr;</span>
                    </>
                  )}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={pasteIn}
                  className="font-mono-label flex flex-1 justify-center whitespace-nowrap px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.1em] transition active:translate-y-px"
                  style={{ background: t.ink, color: t.panel }}
                >
                  Paste a ramble
                </button>
                <button
                  onClick={copyRamble}
                  disabled={!inputText.trim()}
                  className="font-mono-label flex flex-1 justify-center whitespace-nowrap px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.1em] transition active:translate-y-px disabled:opacity-40"
                  style={{
                    background: rambleCopied ? ACCENT : t.ink,
                    color: rambleCopied ? "#fff" : t.panel,
                  }}
                >
                  {rambleCopied ? "Copied" : "Copy"}
                </button>
                <button
                  onClick={() => {
                    if (recorder.status === "recording") recorder.cancel();
                    setInputText("");
                    setError(null);
                    setLimitNotice(null);
                  }}
                  disabled={!inputText}
                  className="font-mono-label flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.1em] transition active:translate-y-px disabled:opacity-40"
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
          )}

          {/* RESULT view: the Babble on its own, full width, with room to read
              everything (key points, follow-ups) and a Back button to edit. */}
          {view === "result" && (
          <div className="flex" style={{ backgroundImage: GRADIENT, padding: 2 }}>
            <section
              className="flex min-h-[60vh] flex-1 flex-col"
              style={{ background: "#f5f3fb" }}
            >
            <div
              className="sticky z-10 flex flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4"
              style={{
                top: topH,
                minHeight: 60,
                background: "#e7e4f6",
                borderBottom: `1px solid ${t.lineStrong}`,
              }}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="font-mono-label text-[12px] font-bold"
                  style={{ color: ACCENT }}
                >
                  08
                </span>
                <span
                  className="rb-babbleit font-babble inline-block bg-clip-text text-transparent"
                  style={{
                    backgroundImage: GRADIENT,
                    fontSize: 28,
                    lineHeight: 1.15,
                  }}
                >
                  Your Babble
                </span>
                {cleaning ? (
                  <span
                    className="rb-procpulse font-mono-label flex items-center gap-2 px-3 py-1.5 text-[12px] font-bold uppercase tracking-[0.12em]"
                    style={{ background: "rgba(123,92,255,0.16)", color: ACCENT }}
                  >
                    <span
                      className="rb-spin inline-block h-3.5 w-3.5 rounded-full border-2"
                      style={{
                        borderColor: "rgba(123,92,255,0.3)",
                        borderTopColor: ACCENT,
                      }}
                    />
                    {loadingWord}&hellip;
                  </span>
                ) : null}
              </div>
              {/* Edit (back, keeps the ramble) on the left, Copy (rightmost) on
                  the right, all on one compact row. */}
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => setView("compose")}
                  title="Edit this ramble"
                  className="font-mono-label flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] transition hover:brightness-110 active:translate-y-px"
                  style={{ background: t.ink, color: "#f5f3fb" }}
                >
                  <span aria-hidden style={{ fontSize: 13 }}>
                    &larr;
                  </span>{" "}
                  Edit
                </button>
                <button
                  onClick={handleCopy}
                  disabled={!cleaned || revealing}
                  className="font-mono-label flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2 text-[12px] font-bold uppercase tracking-[0.12em] text-white transition hover:brightness-110 active:translate-y-px disabled:opacity-40"
                  style={{
                    backgroundImage: GRADIENT,
                    boxShadow: "0 8px 22px -8px rgba(123,92,255,0.9)",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                    <rect x="9" y="9" width="11" height="11" rx="1.5" />
                    <path d="M5 15V5a1 1 0 011-1h9" />
                  </svg>
                  {copyLabel}
                </button>
              </div>
            </div>

            {/* The criteria that shaped this Babble, visible on every screen so
                you (and anyone you show) can see exactly what was applied. */}
            {hasResult && !cleaning && metaLabel && (
              <div
                className="flex flex-wrap items-center gap-x-2 gap-y-0.5 px-4 py-2"
                style={{
                  background: "rgba(123,92,255,0.08)",
                  borderBottom: `1px solid ${t.line}`,
                }}
              >
                <span
                  className="font-mono-label text-[10px] uppercase tracking-[0.14em]"
                  style={{ color: t.inkDim }}
                >
                  Styled as
                </span>
                <span className="text-[13px] font-bold" style={{ color: t.ink }}>
                  {metaLabel}
                </span>
              </div>
            )}

            <div className="flex-1 p-5">
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
                  <p
                    className="font-mono-label mt-4 max-w-xs text-[11px] uppercase tracking-[0.14em]"
                    style={{ color: t.inkFaint }}
                  >
                    Record or paste your ramble, then tap{" "}
                    <span style={{ color: ACCENT }}>Babble it</span> under it.
                  </p>
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

            {!userId && hasResult && !revealing && (
              <div
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                style={{
                  background: "rgba(123,92,255,0.12)",
                  borderTop: `1px solid rgba(123,92,255,0.35)`,
                }}
              >
                <span
                  className="text-[14px] font-semibold"
                  style={{ color: t.ink }}
                >
                  Love it? Create a free account to save your Babbles and keep
                  going.
                </span>
                <button
                  onClick={() => onRequestAuth("signup")}
                  className="font-mono-label whitespace-nowrap px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition hover:brightness-110 active:translate-y-px"
                  style={{
                    backgroundImage: GRADIENT,
                    boxShadow: "0 8px 20px -8px rgba(123,92,255,0.85)",
                  }}
                >
                  Create account
                </button>
              </div>
            )}

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
                  New ramble
                </ActionBtn>
              </div>
            )}
            </section>
          </div>
          )}
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
    <div
      className="flex items-center gap-2 text-[19px] sm:gap-2.5 sm:text-[24px]"
      style={{ color }}
    >
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
  className,
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
  className?: string;
}) {
  const set = !!value;
  return (
    <div
      className={`relative flex flex-col ${className ?? ""}`}
      style={{ background: t.control }}
    >
      <button
        onClick={onToggle}
        className="flex w-full flex-1 items-center justify-between gap-2 px-3.5 py-2.5 text-left transition"
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
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
            role="dialog"
            aria-modal="true"
          >
            {/* backdrop: dims the page and catches outside taps; touch-action
                none so dragging it never scrolls the page underneath */}
            <div
              className="absolute inset-0"
              style={{ background: "rgba(0,0,0,0.55)", touchAction: "none" }}
              onClick={onToggle}
            />
            {/* the sheet itself is position:fixed (via the portal), so it is NOT
                trapped inside the sticky console and scrolls reliably on touch */}
            <div
              className="relative z-[61] flex max-h-[85vh] w-full flex-col overflow-hidden sm:w-[460px] sm:max-h-[80vh] sm:rounded-xl"
              style={{
                background: t.panel,
                border: `1px solid ${t.lineStrong}`,
                boxShadow: "0 -8px 60px -10px rgba(0,0,0,0.6)",
              }}
            >
              <div
                className="flex shrink-0 items-center justify-between px-4 py-3"
                style={{ borderBottom: `1px solid ${t.line}`, background: t.control }}
              >
                <span
                  className="font-mono-label text-[11px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: t.ink }}
                >
                  {index} {label}
                </span>
                <button
                  onClick={onToggle}
                  className="font-mono-label px-2 py-1 text-[11px] font-bold uppercase tracking-[0.12em]"
                  style={{ color: ACCENT }}
                  aria-label="Close"
                >
                  Close
                </button>
              </div>
              <div
                className="overflow-y-auto overscroll-contain"
                style={{
                  overscrollBehavior: "contain",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                {children}
              </div>
            </div>
          </div>,
          document.body,
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
          {g.label && (
            <div
              className="font-mono-label px-3 pb-1 pt-2.5 text-[10px] uppercase tracking-[0.16em]"
              style={{ color: t.inkFaint }}
            >
              {g.label}
            </div>
          )}
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
    <div
      className="rb-rise mt-5 overflow-hidden"
      style={{ border: `1.5px solid rgba(123,92,255,0.32)` }}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 transition"
        style={{
          background: open ? "rgba(123,92,255,0.13)" : "rgba(123,92,255,0.07)",
        }}
      >
        <span
          className="font-mono-label flex items-center gap-2.5 text-[12px] font-bold uppercase tracking-[0.14em]"
          style={{ color: ACCENT }}
        >
          <span
            aria-hidden
            style={{
              width: 7,
              height: 7,
              borderRadius: 999,
              background: ACCENT,
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
          stroke={ACCENT}
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
      className="font-mono-label flex-1 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] transition hover:brightness-125 disabled:opacity-50"
      style={{ background: t.ink, color: t.panel }}
    >
      {children}
    </button>
  );
}
