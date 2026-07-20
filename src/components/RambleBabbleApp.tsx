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
  WARNING_AT_SECONDS,
  MAX_UPLOAD_BYTES,
  WARNING_MESSAGE,
  LIMIT_REACHED_MESSAGE,
  TOO_LARGE_MESSAGE,
} from "@/lib/config";
import type { GlossaryEntry } from "@/lib/glossary";

// The whole workspace runs on the ONE theme system in globals.css (data-theme on
// <html>). The palette is the blueprint's Option C: NIGHT is the blueprint
// verbatim, DAY is a light-panel derivation, both solved for contrast. Every
// `t.token` below is a CSS variable, so switching the theme flips data-theme,
// not this map. Solid violet is the fill for buttons/pickers; the ONE gradient
// (t.grad) is reserved for the "Babble it" primary and the "BABBLE" wordmark.

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

// The rotating set shown while babbling (and while transcribing). Kept fun, not
// crude: "bullshit" is scrubbed to "BS".
const FUN_LOADING = [
  "Untangling your BS",
  "Finding your actual point",
  "Making you sound employed",
  "Giving your fumble fingers a break",
  "Translating from drunk",
  "Putting pants on it",
  "Doing the part your brain skipped",
];

// The idle (empty) output copy. Exact wording and line breaks from the brief.
const IDLE_COPY = `Nothing here yet.

Feed the machine your mess
so it can save you from embarrassing yourself.

Or something unhinged enough to get you blocked.

Depends on what you clicked.`;

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

// Number of vertical bars in the recording "mouth" waveform. They flex to fill
// the mouth, so this count is fine on any width.
const WAVE_BARS = 40;

// ONE theme system. Every token is a CSS variable read live from globals.css.
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
  panel3: "var(--panel3)",
  ink: "var(--ink)",
  inkDim: "var(--inkDim)",
  inkFaint: "var(--inkFaint)",
  line: "var(--line)",
  lineStrong: "var(--lineStrong)",
  accentOnPanel: "var(--accentOnPanel)",
  accentOnCanvas: "var(--accentOnCanvas)",
  violet: "var(--violet)",
  violetSoft: "var(--violetSoft)",
  grad: "var(--grad)",
  btnBg: "var(--btnBg)",
  btnColor: "var(--btnColor)",
  chipBg: "var(--chipBg)",
  chipText: "var(--chipText)",
  chipBorder: "var(--chipBorder)",
} as const;

function formatTime(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Personal Glossary rows. The UI always holds both fields as strings (controlled
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

  // Which sidebar picker menu is open (one at a time). null = all closed.
  const [openPicker, setOpenPicker] = useState<string | null>(null);
  // Nested collapsible format groups inside the FORMAT menu (one at a time).
  const [openFmtGroup, setOpenFmtGroup] = useState<string | null>(null);

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
  // The rotating loading message, tracked as an index into FUN_LOADING. The
  // shuffle queue + last-index ref below guarantee no message repeats back to
  // back within a session.
  const [loadingIndex, setLoadingIndex] = useState(0);
  const loadingWord = FUN_LOADING[loadingIndex] ?? FUN_LOADING[0];
  const [error, setError] = useState<string | null>(null);
  const [limitNotice, setLimitNotice] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState("Copy");
  // Quiet confirmation that the last babble was auto-saved to My Rambles.
  const [savedNotice, setSavedNotice] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [overlay, setOverlay] = useState<"settings" | "upgrade" | null>(null);

  const revealRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const goodsRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  // Measured sticky-nav height, fed to the sticky sidebar offset and the
  // scroll-to-output target.
  const [headerH, setHeaderH] = useState(64);

  // Live-mic waveform plumbing (set up in the effect while recording).
  const waveContainerRef = useRef<HTMLDivElement>(null);

  // The shuffled bag for loading messages. nextLoading() draws from a shuffled
  // order and never returns the same index twice in a row (even across reshuffle
  // boundaries), satisfying "shuffle the pool, never repeat back to back".
  const shuffleBag = useRef<number[]>([]);
  const lastLoading = useRef<number>(-1);
  const nextLoading = useCallback(() => {
    if (shuffleBag.current.length === 0) {
      const arr = FUN_LOADING.map((_, i) => i);
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      if (arr[0] === lastLoading.current && arr.length > 1) {
        [arr[0], arr[1]] = [arr[1], arr[0]];
      }
      shuffleBag.current = arr;
    }
    const idx = shuffleBag.current.shift() as number;
    lastLoading.current = idx;
    return idx;
  }, []);

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

  // Auto-dismiss the quiet "Saved to My Rambles" confirmation.
  useEffect(() => {
    if (!savedNotice) return;
    const id = setTimeout(() => setSavedNotice(false), 2800);
    return () => clearTimeout(id);
  }, [savedNotice]);

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
    // Collapsing the box to "auto" to remeasure momentarily shrinks it, which
    // lets the browser re-anchor the scroll position and jump the page toward
    // the caret (the Enter-key jump). Capture the page scroll and restore it the
    // instant the height is set again, so typing/Enter never scrolls anything.
    const scrollY = window.scrollY;
    el.style.height = "auto";
    // box-sizing is border-box, so add the border back or the box lands a
    // border-width short and scrollHeight stays > clientHeight.
    const borderY = el.offsetHeight - el.clientHeight;
    el.style.height = `${el.scrollHeight + borderY}px`;
    if (window.scrollY !== scrollY) window.scrollTo(0, scrollY);
  }, []);
  useEffect(() => {
    fitInput();
  }, [inputText, fitInput]);
  useEffect(() => {
    window.addEventListener("resize", fitInput);
    return () => window.removeEventListener("resize", fitInput);
  }, [fitInput]);

  // Land at the very top on mount so the user always starts at the nav +
  // section 1, never mid-page (e.g. restored scroll or a reopened ramble).
  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }, []);

  // Keep the measured sticky-nav height current (it wraps to two rows on narrow
  // screens, so it is not a constant).
  useEffect(() => {
    const measure = () => setHeaderH(headerRef.current?.offsetHeight ?? 64);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Rotate the loading message every 2.5s while babbling or transcribing. Each
  // tick draws the next non-repeating message from the shuffled bag.
  useEffect(() => {
    if (!cleaning && !transcribing) return;
    const id = setInterval(() => setLoadingIndex(nextLoading()), 2500);
    return () => clearInterval(id);
  }, [cleaning, transcribing, nextLoading]);

  // Escape closes any open sidebar picker menu.
  useEffect(() => {
    if (!openPicker) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenPicker(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openPicker]);

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
      setLoadingIndex(nextLoading());
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
    [glossary, nextLoading],
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

  // Drive the recording "mouth" waveform from the REAL microphone. While
  // recording, wire an AnalyserNode onto the live MediaStream and set each bar's
  // height from the live frequency data via requestAnimationFrame: near-flat
  // when silent, taller as the speaker gets louder. Falls back to a canned
  // sine-wave animation only when the stream / AudioContext is unavailable.
  // Everything is torn down on stop / cancel / unmount.
  useEffect(() => {
    if (!recording) return;
    const container = waveContainerRef.current;
    if (!container) return;
    const bars = Array.from(container.children) as HTMLElement[];
    const MIN = 6;
    const MAX = 66;

    let raf = 0;
    let ctx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let data: Uint8Array<ArrayBuffer> | null = null;
    let live = false;

    const stream = recorder.stream;
    try {
      const AC: typeof AudioContext | undefined =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (stream && AC) {
        ctx = new AC();
        // Some browsers hand back a suspended context; resume so data flows.
        void ctx.resume();
        const source = ctx.createMediaStreamSource(stream);
        analyser = ctx.createAnalyser();
        analyser.fftSize = 128; // 64 frequency bins
        analyser.smoothingTimeConstant = 0.78;
        source.connect(analyser); // not connected to destination: no feedback
        data = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
        live = true;
      }
    } catch {
      live = false;
    }

    const draw = () => {
      if (live && analyser && data) {
        analyser.getByteFrequencyData(data);
        const bins = data.length;
        for (let i = 0; i < bars.length; i++) {
          // Sample the low-to-mid band, where speech energy lives, so the meter
          // is lively rather than dead in the top octaves.
          const idx = Math.min(bins - 1, Math.floor((i / bars.length) * bins * 0.7));
          const v = (data[idx] ?? 0) / 255; // 0..1
          const h = MIN + Math.pow(v, 0.85) * (MAX - MIN);
          bars[i].style.height = `${h.toFixed(1)}px`;
        }
      } else {
        const now = Date.now();
        for (let i = 0; i < bars.length; i++) {
          const base = Math.sin(now / 180 + i * 0.5);
          bars[i].style.height = `${(MIN + Math.abs(base) * (MAX - MIN) * 0.62 + Math.random() * 8).toFixed(1)}px`;
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (ctx) {
        try {
          void ctx.close();
        } catch {
          // AudioContext already closed; nothing to do.
        }
      }
      bars.forEach((b) => {
        b.style.height = `${MIN}px`;
      });
    };
  }, [recording, recorder.stream]);

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
  // Every active selection, in order, for the ACTIVE chips in the sidebar.
  const activeChips = [
    formatName,
    selectedTone?.label,
    selectedPersona?.label,
    selectedAccent?.label,
    targetLanguage,
  ].filter(Boolean) as string[];

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
      setSavedNotice(false);
      setLoadingIndex(nextLoading());
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
        // Auto-save EVERY successful babble, regenerations included (no modifier
        // guard). The Supabase builder is lazy: .then here is what sends the
        // insert. On success, flash a quiet "Saved to My Rambles" confirmation.
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
            if (saveError) {
              console.error("[rambles] save failed:", saveError.message);
            } else {
              setSavedNotice(true);
            }
          });
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
      nextLoading,
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

  // Reset ONLY the format + stack selections (format, tone, character, accent,
  // language, glossary, profanity, custom instruction). Leaves the ramble text
  // and the babble output untouched. Shared by "Clear options" and "New Ramble".
  const resetOptions = useCallback(() => {
    setOutputType("");
    setTone("");
    setPersona("");
    setAccent("");
    setTargetLanguage("");
    setGlossary(EMPTY_GLOSSARY);
    setCleanProfanity(false);
    setCustomInstruction("");
    setOpenFmtGroup(null);
    setOpenPicker(null);
  }, []);

  // Clear options: wipe every format + stack selection only. Ramble text and
  // output stay exactly where they are.
  const handleClearOptions = useCallback(() => {
    resetOptions();
  }, [resetOptions]);

  // New Ramble: FULL reset. Clear the ramble text, reset the output to idle,
  // clear every option, then glide back to the top of the page.
  const handleNewRamble = useCallback(() => {
    if (recorder.status === "recording") recorder.cancel();
    setInputText("");
    resetOptions();
    setCleaned("");
    setKeyPoints([]);
    setFollowUps([]);
    setSavedNotice(false);
    setError(null);
    setLimitNotice(null);
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "smooth" });
  }, [recorder, resetOptions]);

  // Personal Glossary rows.
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

  // Surprise me: randomize TONE, CHARACTER, ACCENT only (never the format). The
  // sidebar dropdowns and the ACTIVE chips all read this state, so they update
  // to reflect the new random picks the moment this runs.
  const surprise = () => {
    const pick = (arr: Option[]) => arr[Math.floor(Math.random() * arr.length)].id;
    setTone(pick(TONES));
    setPersona(pick(PERSONAS));
    setAccent(pick(ACCENTS));
  };

  const words = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const hasResult = !!cleaned;
  const canBabble = !!outputType && !!inputText.trim();

  // Every babble (revealKey bumps once per run, regenerate included) glides the
  // output section's TOP EDGE to the top of the viewport, at every width. Keyed
  // on revealKey (starts at 0, only bumps on a real babble) so it never fires on
  // mount. Offset by the live nav height so the panel top lands just below the
  // nav, never hidden under it.
  useEffect(() => {
    if (revealKey === 0) return;
    if (typeof window === "undefined") return;
    const el = goodsRef.current;
    if (!el) return;
    const hH = headerRef.current?.offsetHeight ?? 64;
    const top = el.getBoundingClientRect().top + window.scrollY - hH - 8;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, [revealKey]);

  // Format-picker selection (Section 1 menu). Selects, collapses the group, and
  // closes the picker menu.
  const pickFormat = (id: string) => {
    setOutputType(id);
    setOpenFmtGroup(null);
    setOpenPicker(null);
  };

  // Render a grid of format rows for a set of ids (used inside each collapsible
  // format group). "custom" is the "Something else" row.
  const renderFormatRows = (ids: string[]) => (
    <FormatGrid>
      {ids.map((id) => {
        if (id === "custom") {
          return (
            <FormatRow
              key="custom"
              label="Something else"
              active={outputType === "custom"}
              onClick={() => pickFormat("custom")}
            />
          );
        }
        const o = OUTPUT_TYPES.find((x) => x.id === id);
        if (!o) return null;
        return (
          <FormatRow
            key={id}
            label={o.label}
            active={outputType === id}
            onClick={() => pickFormat(id)}
          />
        );
      })}
    </FormatGrid>
  );

  const toggle = (key: string) =>
    setOpenPicker((cur) => (cur === key ? null : key));
  const closeMenu = () => setOpenPicker(null);

  return (
    <div style={{ background: t.canvas, color: t.cInk, minHeight: "100vh" }}>
      {/* Error toast (fixed, bottom-center). Tap to dismiss. */}
      {error && (
        <button
          onClick={() => setError(null)}
          role="alert"
          className="rb-rise fixed bottom-8 left-1/2 z-[90] flex max-w-[92vw] -translate-x-1/2 items-center gap-2 rounded-[10px] px-5 py-3.5 text-left text-[16px] font-bold text-white"
          style={{
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

      {/* Cursor spotlight: a violet halo on the dark canvas, tracking the mouse. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(440px circle at var(--mx,50%) var(--my,28%), rgba(139,123,255,0.14), transparent 64%)",
        }}
      />

      {/* ============ STICKY TOP NAV ============ */}
      <div
        ref={headerRef}
        className="sticky top-0 z-30"
        style={{
          background: t.chrome,
          backdropFilter: "blur(10px)",
          borderBottom: `1px solid ${t.cLine}`,
        }}
      >
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3.5 sm:px-7">
          <Wordmark />
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <NavLink
              label="Home"
              active
              onClick={() => {
                if (typeof window !== "undefined")
                  window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
            <NavLink label={"My Rambles"} onClick={onOpenHistory} nowrap />
            <NavLink label="Upgrade" onClick={() => setOverlay("upgrade")} />
            {/* Day / Night switch. */}
            <div
              className="flex items-center overflow-hidden rounded-[9px]"
              style={{ border: `1px solid ${t.cLineStrong}` }}
            >
              <button
                onClick={() => setTheme("day")}
                aria-label="Day mode"
                title="Day mode (light)"
                className="flex h-7 w-9 items-center justify-center transition"
                style={{
                  background: theme === "day" ? t.panel3 : "transparent",
                  color: theme === "day" ? t.cInk : t.cDim,
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
                  background: theme === "night" ? t.panel3 : "transparent",
                  color: theme === "night" ? t.cInk : t.cDim,
                  borderLeft: `1px solid ${t.cLineStrong}`,
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
                className="font-mono-label flex h-9 w-9 items-center justify-center rounded-[8px] text-[14px] font-extrabold transition active:translate-y-px"
                style={{ background: t.violet, color: t.btnColor }}
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
                    className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-[10px]"
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
                        className="font-mono-label flex h-7 w-7 items-center justify-center rounded-[7px] text-[12px] font-bold"
                        style={{ background: t.violet, color: t.btnColor }}
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
                          className="font-mono-label block text-[12px] uppercase tracking-[0.12em]"
                          style={{ color: t.inkDim }}
                        >
                          signed in
                        </span>
                      </span>
                    </div>
                    <AccountItem
                      label="Settings"
                      onClick={() => {
                        setAccountOpen(false);
                        setOverlay("settings");
                      }}
                    />
                    <AccountItem
                      label="Upgrade"
                      onClick={() => {
                        setAccountOpen(false);
                        setOverlay("upgrade");
                      }}
                    />
                    <div style={{ height: 1, background: t.lineStrong }} />
                    <AccountItem
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

      {/* ============ APP SHELL: sidebar + work frame ============ */}
      <main
        className="relative z-10 grid grid-cols-1 md:grid-cols-[300px_1fr] md:items-start"
      >
        {/* ---------- SIDEBAR (blueprint .rail) ---------- */}
        <aside
          className="rb-rail flex flex-col gap-5 border-b border-c-line px-5 py-6 sm:px-6 md:border-b-0 md:border-r"
          style={{ "--rb-nav": `${headerH}px` } as React.CSSProperties}
        >
          <h2
            className="font-mono-label text-[13px] font-bold uppercase tracking-[0.2em]"
            style={{ color: t.cDim }}
          >
            Set it up
          </h2>

          {/* STEP 1 — FORMAT */}
          <div className="flex flex-col gap-2.5">
            <StepLabel num="1" label="Format" />
            <div className="relative">
              <PickerTrigger
                display={formatName || "Choose a format"}
                open={openPicker === "format"}
                onToggle={() => toggle("format")}
              />
              {openPicker === "format" && (
                <PickerMenu onClose={closeMenu}>
                  <div className="flex flex-col gap-3">
                    <PickerGroup
                      label="Just refine"
                      open={openFmtGroup === "just"}
                      onToggle={() =>
                        setOpenFmtGroup((g) => (g === "just" ? null : "just"))
                      }
                    >
                      {renderFormatRows(["note", "conversational"])}
                    </PickerGroup>

                    <FormatGroup heading="Practical">
                      {USEFUL_GROUPS.map((g) => (
                        <PickerGroup
                          key={g.label}
                          label={g.label}
                          open={openFmtGroup === `u:${g.label}`}
                          onToggle={() =>
                            setOpenFmtGroup((cur) =>
                              cur === `u:${g.label}` ? null : `u:${g.label}`,
                            )
                          }
                        >
                          {renderFormatRows(g.ids)}
                        </PickerGroup>
                      ))}
                    </FormatGroup>

                    <FormatGroup heading="Fun">
                      {FUN_GROUPS.map((g) => (
                        <PickerGroup
                          key={g.label}
                          label={g.label}
                          open={openFmtGroup === `f:${g.label}`}
                          onToggle={() =>
                            setOpenFmtGroup((cur) =>
                              cur === `f:${g.label}` ? null : `f:${g.label}`,
                            )
                          }
                        >
                          {renderFormatRows(g.ids)}
                        </PickerGroup>
                      ))}
                    </FormatGroup>

                    <PickerGroup
                      label="Something else"
                      open={openFmtGroup === "custom"}
                      onToggle={() =>
                        setOpenFmtGroup((g) => (g === "custom" ? null : "custom"))
                      }
                    >
                      {renderFormatRows(["custom"])}
                    </PickerGroup>
                  </div>
                </PickerMenu>
              )}
            </div>

            {/* The chosen format's one-line hint, or the custom instruction. */}
            {outputType === "custom" ? (
              <input
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value)}
                placeholder="Turn it into... e.g. a wedding toast, a recipe"
                aria-label="Turn it into"
                className="rb-hero-input mt-0.5 w-full rounded-[8px] px-3 py-2.5 text-[15px] outline-none"
                style={
                  {
                    background: t.panel2,
                    border: `1px solid ${t.lineStrong}`,
                    color: t.ink,
                    "--rb-ph": t.inkFaint,
                  } as React.CSSProperties
                }
              />
            ) : (
              formatHint && (
                <p className="text-[13px] leading-[1.5]" style={{ color: t.cDim }}>
                  {formatHint}
                </p>
              )
            )}
          </div>

          {/* STEP 2 — STACK OPTIONS */}
          <div className="flex flex-col gap-2.5">
            <StepLabel num="2" label="Stack options" optional />

            <div className="relative">
              <PickerTrigger
                display={
                  selectedTone ? `Tone: ${selectedTone.label}` : "Tone"
                }
                muted={!selectedTone}
                open={openPicker === "tone"}
                onToggle={() => toggle("tone")}
              />
              {openPicker === "tone" && (
                <PickerMenu onClose={closeMenu}>
                  <NoneRow
                    active={!tone}
                    onClick={() => {
                      setTone("");
                      closeMenu();
                    }}
                  />
                  <PillGroups
                    groups={TONE_GROUPS}
                    options={TONES}
                    value={tone}
                    onPick={(v) => {
                      setTone(v);
                      closeMenu();
                    }}
                  />
                </PickerMenu>
              )}
            </div>

            <div className="relative">
              <PickerTrigger
                display={
                  selectedPersona
                    ? `Character: ${selectedPersona.label}`
                    : "Character"
                }
                muted={!selectedPersona}
                open={openPicker === "character"}
                onToggle={() => toggle("character")}
              />
              {openPicker === "character" && (
                <PickerMenu onClose={closeMenu}>
                  <NoneRow
                    active={!persona}
                    onClick={() => {
                      setPersona("");
                      closeMenu();
                    }}
                  />
                  <PillGroups
                    groups={PERSONA_GROUPS}
                    options={PERSONAS}
                    value={persona}
                    onPick={(v) => {
                      setPersona(v);
                      closeMenu();
                    }}
                  />
                </PickerMenu>
              )}
            </div>

            <div className="relative">
              <PickerTrigger
                display={
                  selectedAccent ? `Accent: ${selectedAccent.label}` : "Accent"
                }
                muted={!selectedAccent}
                open={openPicker === "accent"}
                onToggle={() => toggle("accent")}
              />
              {openPicker === "accent" && (
                <PickerMenu onClose={closeMenu}>
                  <NoneRow
                    active={!accent}
                    onClick={() => {
                      setAccent("");
                      closeMenu();
                    }}
                  />
                  <PillGroups
                    groups={ACCENT_GROUPS}
                    options={ACCENTS}
                    value={accent}
                    onPick={(v) => {
                      setAccent(v);
                      closeMenu();
                    }}
                  />
                </PickerMenu>
              )}
            </div>

            {/* Secondary, quieter controls: Language, Glossary, Profanity. */}
            <div className="mt-0.5 flex flex-col gap-2">
              <div className="relative">
                <PickerTrigger
                  variant="quiet"
                  display={
                    targetLanguage ? `Language: ${targetLanguage}` : "Language"
                  }
                  muted={!targetLanguage}
                  open={openPicker === "language"}
                  onToggle={() => toggle("language")}
                />
                {openPicker === "language" && (
                  <PickerMenu onClose={closeMenu}>
                    <div className="flex flex-wrap gap-1.5">
                      <Pill
                        label="None"
                        active={!targetLanguage}
                        onClick={() => {
                          setTargetLanguage("");
                          closeMenu();
                        }}
                      />
                      {LANGUAGES.map((l) => (
                        <Pill
                          key={l}
                          label={l}
                          active={targetLanguage === l}
                          onClick={() => {
                            setTargetLanguage(targetLanguage === l ? "" : l);
                            closeMenu();
                          }}
                        />
                      ))}
                    </div>
                  </PickerMenu>
                )}
              </div>

              <div className="relative">
                <PickerTrigger
                  variant="quiet"
                  display={
                    glossaryIsEmpty ? "Personal Glossary" : "Glossary: on"
                  }
                  muted={glossaryIsEmpty}
                  open={openPicker === "glossary"}
                  onToggle={() => toggle("glossary")}
                />
                {openPicker === "glossary" && (
                  <PickerMenu onClose={closeMenu}>
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      <Pill
                        label="None"
                        active={glossaryIsEmpty}
                        onClick={() => setGlossary(EMPTY_GLOSSARY)}
                      />
                    </div>
                    <p className="mb-2 text-[13px]" style={{ color: t.inkDim }}>
                      Names, brands, or words you use that we should get right.
                      Tell us what they mean so we know when you mean them.
                    </p>
                    <div className="flex flex-col gap-2">
                      {glossary.map((row, i) => (
                        <div key={i} className="flex flex-wrap items-end gap-2">
                          <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
                            <label
                              htmlFor={`rb-word-${i}`}
                              className="font-mono-label mb-1 block text-[10px] uppercase tracking-[0.1em]"
                              style={{ color: t.accentOnPanel }}
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
                              className="rb-hero-input w-full rounded-[8px] px-3 py-2.5 text-[15px] outline-none"
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
                              className="font-mono-label mb-1 block text-[10px] uppercase tracking-[0.1em]"
                              style={{ color: t.accentOnPanel }}
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
                              className="rb-hero-input w-full rounded-[8px] px-3 py-2.5 text-[15px] outline-none"
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
                            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[8px] text-[16px] transition active:translate-y-px"
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
                      className="font-mono-label mt-2 rounded-[7px] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] transition active:translate-y-px"
                      style={{
                        background: t.panel2,
                        border: `1px solid ${t.lineStrong}`,
                        color: t.ink,
                      }}
                    >
                      + Add another
                    </button>
                  </PickerMenu>
                )}
              </div>

              <div className="relative">
                <PickerTrigger
                  variant="quiet"
                  display={cleanProfanity ? "Profanity: cleaned" : "Profanity"}
                  muted={!cleanProfanity}
                  open={openPicker === "profanity"}
                  onToggle={() => toggle("profanity")}
                />
                {openPicker === "profanity" && (
                  <PickerMenu onClose={closeMenu}>
                    <div className="flex flex-wrap gap-1.5">
                      <Pill
                        label="Keep it"
                        active={!cleanProfanity}
                        onClick={() => {
                          setCleanProfanity(false);
                          closeMenu();
                        }}
                      />
                      <Pill
                        label="Clean it up"
                        active={cleanProfanity}
                        onClick={() => {
                          setCleanProfanity(true);
                          closeMenu();
                        }}
                      />
                    </div>
                  </PickerMenu>
                )}
              </div>
            </div>

            <SolidBtn
              onClick={handleClearOptions}
              className="font-mono-label mt-1 w-full px-3 py-2.5 text-[12px] uppercase tracking-[0.08em]"
            >
              <span aria-hidden>&#10005;</span> Clear options (keeps your ramble)
            </SolidBtn>
          </div>

          {/* ACTIVE selections + New Ramble, pinned to the bottom on desktop. */}
          <div
            className="mt-2 flex flex-col gap-3 pt-4 md:mt-auto"
            style={{ borderTop: `1px solid ${t.cLine}` }}
          >
            <span
              className="font-mono-label text-[12px] uppercase tracking-[0.18em]"
              style={{ color: t.cDim }}
            >
              Active
            </span>
            {activeChips.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {activeChips.map((c, i) => (
                  <Chip key={`${c}-${i}`}>{c}</Chip>
                ))}
              </div>
            ) : (
              <span className="text-[13px]" style={{ color: t.cDim }}>
                Nothing stacked yet.
              </span>
            )}
            <SolidBtn
              onClick={handleNewRamble}
              className="font-mono-label mt-1 w-full px-3 py-2.5 text-[13px] uppercase tracking-[0.08em]"
            >
              <span aria-hidden>&#8635;</span> New ramble
            </SolidBtn>
          </div>
        </aside>

        {/* ---------- WORK FRAME (blueprint .work) ---------- */}
        <section className="flex flex-col px-4 py-6 sm:px-8 sm:py-7">
          {/* --- YOUR RAMBLE --- */}
          <div className="mb-3">
            <StepMark>Your ramble</StepMark>
          </div>

          <div
            className={`relative rb-racing${cleaning ? " rb-racing-fast" : ""}`}
            style={{
              background: t.panel,
              border: `1px solid ${t.lineStrong}`,
              borderRadius: 14,
            }}
          >
            {recording ? (
              /* --- RECORDING: the box IS the mouth --- */
              <div
                className="relative px-4 py-6 text-center sm:px-6"
                style={{ zIndex: 1 }}
              >
                <div
                  className="font-mono-timer text-[34px] font-bold sm:text-[40px]"
                  style={{ color: t.ink, letterSpacing: "0.04em" }}
                >
                  {formatTime(recorder.seconds)}
                </div>
                <div
                  className="font-mono-label mt-1 text-[13px] font-bold uppercase tracking-[0.2em]"
                  style={{ color: t.inkDim }}
                >
                  Listening
                </div>
                {showWarning && (
                  <div
                    className="font-mono-label mt-1 text-[12px]"
                    style={{ color: "#ff7a5c" }}
                  >
                    {WARNING_MESSAGE}
                  </div>
                )}

                <div
                  className="mx-auto mt-5 w-full max-w-[520px] rounded-[20px] px-5 pb-4 pt-5"
                  style={{ background: t.panel2, border: `1px solid ${t.lineStrong}` }}
                >
                  <div
                    ref={waveContainerRef}
                    className="flex items-end justify-center gap-1"
                    style={{ height: 84 }}
                    aria-hidden
                  >
                    {Array.from({ length: WAVE_BARS }).map((_, i) => (
                      <span
                        key={i}
                        style={{
                          flex: "1 1 0",
                          maxWidth: 6,
                          minWidth: 2,
                          height: 6,
                          borderRadius: 3,
                          background: "linear-gradient(180deg,#b9adff,#8b7bff)",
                        }}
                      />
                    ))}
                  </div>
                  {/* The teeth ARE the cancel control. */}
                  <button
                    onClick={recorder.cancel}
                    aria-label="Cancel recording"
                    title="Cancel"
                    className="mt-4 flex w-full items-end justify-center gap-1.5"
                  >
                    {Array.from({ length: 8 }).map((_, i) => (
                      <span
                        key={i}
                        style={{
                          width: 30,
                          height: 15,
                          borderRadius: "0 0 7px 7px",
                          background: theme === "day" ? "#5b616b" : "#eef0f6",
                        }}
                      />
                    ))}
                  </button>
                  <div
                    className="font-mono-label mt-2 text-[12px] uppercase tracking-[0.2em]"
                    style={{ color: t.inkDim }}
                  >
                    Cancel
                  </div>
                </div>

                <div className="mt-5">
                  <SolidBtn
                    onClick={handleStop}
                    className="px-7 py-2.5 text-[15px]"
                  >
                    <span
                      aria-hidden
                      style={{
                        display: "inline-block",
                        height: 11,
                        width: 11,
                        background: t.btnColor,
                      }}
                    />
                    Stop
                  </SolidBtn>
                </div>
              </div>
            ) : transcribing ? (
              /* --- TRANSCRIBING --- */
              <div
                className="relative flex flex-col items-center gap-3 px-6 py-10 text-center"
                style={{ zIndex: 1 }}
              >
                <span
                  className="rb-spin inline-block h-8 w-8 rounded-full border-[3px]"
                  style={{
                    borderColor: t.lineStrong,
                    borderTopColor: t.accentOnPanel,
                  }}
                />
                <p className="font-bric text-[17px] font-bold" style={{ color: t.ink }}>
                  Turning that noise into words.
                </p>
                <p className="text-[16px] leading-[1.5]" style={{ color: t.inkDim }}>
                  Give us a second, you talk faster than you think.
                </p>
              </div>
            ) : (
              /* --- IDLE: record / textarea / babble --- */
              <div className="relative" style={{ zIndex: 1 }}>
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-5">
                  <SolidBtn onClick={handleStart} className="px-5 py-2.5 text-[15px]">
                    <span
                      aria-hidden
                      style={{
                        display: "inline-block",
                        height: 11,
                        width: 11,
                        borderRadius: 999,
                        background: t.btnColor,
                      }}
                    />
                    Record
                  </SolidBtn>
                  <div className="flex items-center gap-2.5">
                    <span
                      className="font-mono-label text-[12px] uppercase tracking-[0.08em]"
                      style={{ color: t.inkDim }}
                    >
                      {words} words
                    </span>
                    <SolidBtn
                      onClick={clearRamble}
                      disabled={!inputText}
                      className="font-mono-label px-3 py-2 text-[12px] uppercase tracking-[0.06em]"
                    >
                      <span aria-hidden>&#10005;</span> Clear
                    </SolidBtn>
                  </div>
                </div>

                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    fitInput();
                  }}
                  placeholder="Ramble it here. The voice memos, the half-baked ideas, the texts you shouldn't send yet."
                  className="rb-hero-input w-full resize-none px-4 pb-2 pt-4 text-[16px] leading-[1.6] outline-none sm:px-5 sm:text-[17px]"
                  style={
                    {
                      color: t.ink,
                      background: "transparent",
                      minHeight: 140,
                      overflowY: "hidden",
                      border: "1px solid transparent",
                      "--rb-ph": t.inkFaint,
                    } as React.CSSProperties
                  }
                />

                <div className="flex flex-wrap items-center gap-3 px-4 pb-4 pt-1 sm:px-5">
                  <button
                    type="button"
                    onClick={() => runCleanup()}
                    disabled={cleaning || !canBabble}
                    className="rb-grad-btn font-bric inline-flex items-center justify-center gap-2 px-6 py-3 text-[16px] font-extrabold transition hover:brightness-[1.06] active:translate-y-px"
                    style={{
                      boxShadow: "0 8px 24px -10px rgba(255,77,157,0.45)",
                      opacity: !cleaning && !canBabble ? 0.55 : 1,
                      filter: !cleaning && !canBabble ? "saturate(0.7)" : "none",
                      cursor: cleaning || !canBabble ? "not-allowed" : "pointer",
                    }}
                  >
                    {cleaning ? (
                      <>
                        <span
                          className="rb-spin inline-block h-4 w-4 rounded-full border-2"
                          style={{
                            borderColor: "rgba(11,12,16,0.35)",
                            borderTopColor: t.btnColor,
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
                  <SolidBtn
                    onClick={surprise}
                    className="font-mono-label px-5 py-3 text-[13px] uppercase tracking-[0.08em]"
                  >
                    Surprise me
                  </SolidBtn>
                </div>
              </div>
            )}
          </div>

          {limitNotice && (
            <p className="font-mono-label mt-2 text-[12px]" style={{ color: "#ff7a5c" }}>
              {limitNotice}
            </p>
          )}

          {/* --- YOUR BABBLE (output) --- */}
          <section ref={goodsRef} className="mt-8">
            <div
              className="flex min-h-[300px] flex-col rounded-[14px] p-5 sm:p-6"
              style={{ background: t.panel, border: `1px solid ${t.lineStrong}` }}
            >
              <div
                className="mb-4 flex flex-wrap items-center justify-between gap-3 pb-4"
                style={{ borderBottom: `1px solid ${t.line}` }}
              >
                <StepMark>Your babble</StepMark>
                <div className="flex flex-wrap items-center gap-2">
                  <SolidBtn
                    onClick={handleCopy}
                    disabled={!cleaned}
                    className="font-mono-label px-4 py-2 text-[12px] uppercase tracking-[0.08em]"
                  >
                    {copyLabel}
                  </SolidBtn>
                  <SolidBtn
                    onClick={() => runCleanup("again")}
                    disabled={cleaning || !hasResult}
                    className="font-mono-label px-4 py-2 text-[12px] uppercase tracking-[0.08em]"
                  >
                    Regenerate
                  </SolidBtn>
                  <SolidBtn
                    onClick={handleNewRamble}
                    className="font-mono-label px-4 py-2 text-[12px] uppercase tracking-[0.08em]"
                  >
                    New ramble
                  </SolidBtn>
                </div>
              </div>

              {cleaning && !hasResult ? (
                <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
                  <div className="flex max-w-[36ch] items-center justify-center gap-3">
                    <span
                      className="rb-spin inline-block h-6 w-6 shrink-0 rounded-full border-[3px]"
                      style={{
                        borderColor: t.lineStrong,
                        borderTopColor: t.accentOnPanel,
                      }}
                    />
                    <span
                      className="font-bric font-bold"
                      style={{
                        color: t.ink,
                        fontSize: "clamp(20px, 5vw, 26px)",
                        lineHeight: 1.2,
                      }}
                    >
                      {loadingWord}
                    </span>
                  </div>
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
                    className="mt-4 max-w-[360px] whitespace-pre-line text-[16px] leading-[1.55]"
                    style={{ color: t.inkDim }}
                  >
                    {IDLE_COPY}
                  </p>
                </div>
              ) : (
                <div>
                  {/* THE REVEAL. Glyph noise resolving left to right into the real
                      text. `cleaned` (never this) is what Copy reads. */}
                  <div
                    className="font-serif-i whitespace-pre-wrap"
                    style={{
                      color: t.ink,
                      fontStyle: "italic",
                      fontSize: 19,
                      lineHeight: 1.6,
                      letterSpacing: "0.005em",
                      maxWidth: "64ch",
                    }}
                  >
                    {revealText}
                  </div>

                  {settled && keyPoints.length > 0 && (
                    <Collapsible
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

                  {savedNotice && (
                    <div
                      className="mt-5 flex items-center gap-2 pt-4"
                      style={{ borderTop: `1px solid ${t.line}` }}
                    >
                      <span
                        className="font-mono-label flex items-center gap-1.5 text-[12px] uppercase tracking-[0.1em]"
                        style={{ color: t.inkDim }}
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
                        Saved to My Rambles
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer fine print. #9aa2ad clears 7.6:1 on the dark canvas (which
                stays dark in both themes), so it reads without shouting. */}
            <p
              className="font-mono-label pt-5 text-center text-[11px] uppercase tracking-[0.1em]"
              style={{ color: "#9aa2ad" }}
            >
              RambleBabble. Not affiliated with productivity. Probably cursed.
              Definitely cursed.
            </p>
          </section>
        </section>
      </main>

      {overlay === "settings" && (
        <Overlay title="Settings" onClose={() => setOverlay(null)}>
          <SettingRow label="Account">
            <span style={{ color: t.ink }}>You&rsquo;re signed in.</span>
          </SettingRow>
          <SettingRow label="Appearance">
            <button
              onClick={() => setTheme((th) => (th === "night" ? "day" : "night"))}
              className="rb-violet-btn font-mono-label px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em]"
            >
              {theme === "night" ? "Switch to Day" : "Switch to Night"}
            </button>
          </SettingRow>
          <SettingRow label="Plan">
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
          <SettingRow label="Session">
            <button
              onClick={onSignOut}
              className="rb-violet-btn font-mono-label px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em]"
            >
              Log out
            </button>
          </SettingRow>
        </Overlay>
      )}

      {overlay === "upgrade" && (
        <Overlay title="Upgrade" onClose={() => setOverlay(null)}>
          <p className="mb-5 text-[16px]" style={{ color: t.inkDim }}>
            Pick how much you want to Babble. Final pricing is still being locked
            in, these are placeholders.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <PlanCard
              name="Free"
              price="$0"
              line="A few Babbles a month to try it out."
              cta="Current plan"
              disabled
            />
            <PlanCard
              name="Plus"
              price="$6/mo"
              line="Lots more Babbles for everyday use."
              cta="Choose Plus"
              highlight
            />
            <PlanCard
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

/** The wordmark: "Ramble" in ink, "BABBLE" in the brand gradient, tilted -3deg,
 *  static (matching the blueprint). The gradient is one of only two places it
 *  appears in the whole workspace (the other is "Babble it"). */
function Wordmark() {
  return (
    <div className="flex items-baseline gap-2">
      <span
        className="font-bric text-[20px] font-extrabold sm:text-[26px]"
        style={{ color: t.cInk, letterSpacing: "-0.01em" }}
      >
        Ramble
      </span>
      <span
        className="font-bric text-[20px] font-extrabold sm:text-[26px]"
        style={{
          backgroundImage: t.grad,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          transform: "rotate(-3deg)",
          display: "inline-block",
          letterSpacing: "0.01em",
        }}
      >
        BABBLE
      </span>
    </div>
  );
}

/** A top-nav link (mono, uppercase). Active = ink, otherwise dim. */
function NavLink({
  label,
  active,
  nowrap,
  onClick,
}: {
  label: string;
  active?: boolean;
  nowrap?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`font-mono-label text-[12px] font-bold uppercase tracking-[0.06em] transition ${
        nowrap ? "whitespace-nowrap tracking-[0.02em]" : ""
      }`}
      style={{ color: active ? t.cInk : t.cDim }}
    >
      {label}
    </button>
  );
}

/** A numbered step label in the sidebar: a solid violet badge + a bright label,
 *  with an optional dim "(optional)". */
function StepLabel({
  num,
  label,
  optional,
}: {
  num: string;
  label: string;
  optional?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="font-bric inline-grid place-items-center font-extrabold"
        style={{
          width: 26,
          height: 26,
          borderRadius: 7,
          background: t.violet,
          color: t.btnColor,
          fontSize: 15,
        }}
      >
        {num}
      </span>
      <span
        className="font-mono-label text-[15px] font-bold uppercase tracking-[0.1em]"
        style={{ color: t.cInk }}
      >
        {label}
      </span>
      {optional && (
        <span
          className="font-mono-label text-[12px] normal-case"
          style={{ color: t.cDim }}
        >
          (optional)
        </span>
      )}
    </div>
  );
}

/** A step marker in the work frame: a violet ◆ + a bright mono label. */
function StepMark({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span aria-hidden style={{ color: t.accentOnCanvas, fontSize: 18 }}>
        &#9670;
      </span>
      <span
        className="font-mono-label text-[13px] font-bold uppercase tracking-[0.16em]"
        style={{ color: t.cInk }}
      >
        {children}
      </span>
    </div>
  );
}

/** A solid-violet secondary button (Option C). Near-black label, lighter violet
 *  on hover (handled by the rb-violet-btn class). Sizing/case comes from the
 *  caller's className. */
function SolidBtn({
  children,
  onClick,
  disabled,
  title,
  ariaLabel,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      className={`rb-violet-btn inline-flex items-center justify-center gap-2 font-bold transition active:translate-y-px ${className}`}
      style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
    >
      {children}
    </button>
  );
}

/** A sidebar picker trigger. "violet" = a solid violet control (the primary
 *  axes); "quiet" = a bordered panel control (the secondary axes). Shows the
 *  current selection and a chevron that flips when open. */
function PickerTrigger({
  display,
  muted,
  open,
  onToggle,
  variant = "violet",
}: {
  display: string;
  muted?: boolean;
  open: boolean;
  onToggle: () => void;
  variant?: "violet" | "quiet";
}) {
  const violet = variant === "violet";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={`flex w-full items-center justify-between gap-2 rounded-[10px] px-3.5 py-2.5 text-left text-[14px] font-semibold transition active:translate-y-px ${
        violet ? "rb-violet-btn" : ""
      }`}
      style={
        violet
          ? undefined
          : {
              background: t.panel2,
              border: `1px solid ${t.lineStrong}`,
              color: muted ? t.inkDim : t.ink,
            }
      }
    >
      <span className="truncate">{display}</span>
      <span
        aria-hidden
        className="shrink-0 text-[12px] transition-transform"
        style={{
          color: violet ? t.btnColor : t.inkDim,
          transform: open ? "rotate(180deg)" : "none",
        }}
      >
        &#9662;
      </span>
    </button>
  );
}

/** The popover menu body for a picker: a panel surface anchored under its
 *  trigger, dismissed by a click-outside backdrop or Escape. A transient
 *  select-style menu (not a content panel): it caps its height and scrolls only
 *  when a very long list would otherwise run off-screen. */
function PickerMenu({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-[10px] p-2"
        style={{
          background: t.panel,
          border: `1px solid ${t.lineStrong}`,
          boxShadow: "0 24px 50px -16px rgba(0,0,0,0.55)",
          maxHeight: "min(64vh, 560px)",
          overflowY: "auto",
        }}
      >
        {children}
      </div>
    </>
  );
}

/** The "None" clear row at the top of a single-select picker menu. */
function NoneRow({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      <Pill label="None" active={active} onClick={onClick} />
    </div>
  );
}

/** An active-selection chip (violet-soft fill, light-violet label). */
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="rounded-full px-3 py-1 text-[13px] font-semibold"
      style={{
        background: t.chipBg,
        border: `1px solid ${t.chipBorder}`,
        color: t.chipText,
      }}
    >
      {children}
    </span>
  );
}

/** A top-level accent heading in the format picker (Practical / Fun), above the
 *  collapsible groups it contains. */
function FormatGroup({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className="font-mono-label text-[12px] font-bold uppercase tracking-[0.16em]"
        style={{ color: t.accentOnPanel }}
      >
        {heading}
      </div>
      {children}
    </div>
  );
}

/** A collapsible dropdown group used inside the picker menus: an accent label
 *  header with a caret, revealing its children when open. Collapsed by default. */
function PickerGroup({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ border: `1px solid ${open ? t.lineStrong : t.line}`, borderRadius: 8 }}>
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-[8px] px-3 py-2.5 text-left transition"
        style={{ background: open ? t.panel2 : "transparent" }}
      >
        <span
          className="font-mono-label text-[12px] font-bold uppercase tracking-[0.12em]"
          style={{ color: t.accentOnPanel }}
        >
          {label}
        </span>
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke={t.accentOnPanel}
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
      {open && <div className="px-3 pb-3 pt-1">{children}</div>}
    </div>
  );
}

/** A sub-heading (family label) with its content below, in the accent violet. */
function SubGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        className="font-mono-label mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em]"
        style={{ color: t.accentOnPanel }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

/** Tiles format rows into columns so the list stays scannable, not a mile tall. */
function FormatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-1.5">{children}</div>;
}

/** One selectable format row. Active = violet border + wash + dot. */
function FormatRow({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-[7px] px-3 py-2 text-left text-[14px] transition active:translate-y-px"
      style={{
        // Active is marked by the violet border, wash, weight and dot, never by
        // an accent-coloured LABEL: the label stays ink so it clears contrast on
        // the panel in both themes. The border/dot use accentOnPanel (the
        // theme-aware violet) so they clear the 3:1 UI bar on the light day
        // panel too, where the flat #8b7bff would not.
        background: active ? t.violetSoft : "transparent",
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

/** Grouped pills for a single-select axis (click the active one to clear it). */
function PillGroups({
  groups,
  options,
  value,
  onPick,
}: {
  groups: OptionGroup[];
  options: Option[];
  value: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {groups.map((g) => (
        <SubGroup key={g.label} label={g.label}>
          <div className="flex flex-wrap gap-1.5">
            {g.ids.map((id) => {
              const o = options.find((x) => x.id === id);
              if (!o) return null;
              return (
                <Pill
                  key={id}
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

/** One selectable pill. Active = violet ring + wash + weight (label stays ink). */
function Pill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-[7px] px-3 py-1.5 text-[13px] font-medium transition active:translate-y-px"
      style={{
        background: active ? t.violetSoft : "transparent",
        border: `1.5px solid ${active ? t.accentOnPanel : t.lineStrong}`,
        color: t.ink,
        fontWeight: active ? 700 : 500,
      }}
    >
      {label}
    </button>
  );
}

function AccountItem({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="font-mono-label flex w-full items-center px-4 py-2.5 text-left text-[12px] font-bold uppercase tracking-[0.1em] transition"
      style={{ background: "transparent", color: t.ink }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = t.violet;
        e.currentTarget.style.color = t.btnColor;
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
  title,
  onClose,
  children,
}: {
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
        className="w-full max-w-2xl rounded-[12px]"
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
            className="rb-violet-btn font-mono-label px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em]"
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
  label,
  children,
}: {
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
  name,
  price,
  line,
  cta,
  highlight,
  disabled,
}: {
  name: string;
  price: string;
  line: string;
  cta: string;
  highlight?: boolean;
  disabled?: boolean;
}) {
  return (
    <div
      className="flex flex-col rounded-[10px] p-4"
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
        className={`font-mono-label mt-4 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.1em] transition active:translate-y-px disabled:opacity-50 ${
          highlight ? "rb-violet-btn" : ""
        }`}
        style={
          highlight
            ? undefined
            : { background: t.ink, color: t.panel, borderRadius: 8 }
        }
      >
        {cta}
      </button>
    </div>
  );
}

function Collapsible({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rb-rise mt-3 overflow-hidden rounded-[8px]"
      style={{ border: `1.5px solid ${t.line}` }}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-2.5 transition"
        style={{ background: open ? t.panel2 : "transparent" }}
      >
        <span
          className="font-mono-label flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-[0.12em]"
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
