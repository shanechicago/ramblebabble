"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

const MAX_MINUTES = Math.round(MAX_RECORDING_SECONDS / 60);
// The brand gradient. It earns its loudness by being RARE: exactly two things
// in the whole product wear it, the wordmark and the one hero action below.
// Everything else is quiet. When five things shouted, nothing was primary.
const GRADIENT = "linear-gradient(95deg,#7b5cff,#ff4d9d 55%,#ff6f61)";
const ACCENT = "#7b5cff";
// White fails AA on this gradient at two of its three stops (violet 4.36, pink
// 3.09, coral 2.73). Contrast is symmetric, so the label flips instead of the
// brand: #070809 clears all three (violet 4.60, pink 6.49, coral 7.35). The
// VIOLET stop is what binds — it is the darkest, so a dark label has the least
// contrast there. #13161a (4.16) and #0b0c0f (4.49) both miss. Do not "round up".
const ON_GRADIENT = "#070809";
// The same arithmetic for a flat accent fill: white on #7b5cff is 4.36 and
// fails; #070809 is 4.60 and passes.
const ON_ACCENT = "#070809";

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

// ONE canvas: a near-black void, in BOTH themes. The toggle swaps the PAPER
// lying on it, not the desk under it — light paper (Day) or dark paper (Night).
// A light-canvas "day" mode used to live here; it was invented, it matched
// neither design theme, and it is gone.
//
// Two text scales, and mixing them is the classic bug: `cInk`/`cDim` are for
// things sitting on the black CANVAS, `ink`/`inkDim`/`inkFaint` are for things
// inside a PANEL. In Day those two scales are near opposites.
type Theme = "night" | "day";
const THEMES = {
  // DAY = the design spec's "Mist": light misty paper on the void.
  day: {
    canvas: "#0b0c0f",
    chrome: "rgba(11,12,15,0.78)",
    cInk: "#eef1f3", // 17.24 on canvas
    cDim: "#8b929b", // 6.22 on canvas
    cLine: "rgba(238,241,243,0.13)",
    cLineStrong: "rgba(238,241,243,0.30)",
    panel: "#d6dbde", // 14.01 vs canvas — unmistakably paper on a desk
    panel2: "#c6cccf", // deeper mist: hover/active, and input wells
    ink: "#13161a", // 13.00 on panel
    inkDim: "#50575d", // 5.26 panel / 4.52 panel2 (the wells)
    // The spec says #878d93 here, which is 2.40:1 — it breaks the spec's OWN
    // "no tone-on-tone, high contrast everywhere" law. 4.56:1.
    inkFaint: "#51575d", // 5.24 panel / 4.51 panel2
    line: "rgba(19,22,26,0.16)", // decorative hairlines and dividers ONLY
    // Solid, and the ONLY outline allowed to IDENTIFY an interactive control:
    // panel2 on panel is 1.09:1, so on a bare control the border IS the
    // control. 3.44 on panel.
    lineStrong: "#6c7277", // 3.49 panel / 3.00 panel2
    // The brand violet is 3.12:1 on this paper — fine as a large graphic, a
    // fail as text. Same hue (251deg), moved in lightness until it reads:
    // 5.36 on panel, 4.61 on panel2.
    accentOnPanel: "#4317ff",
  },
  // NIGHT = the spec's "Ink" — but the spec is WRONG here and this fixes it.
  // It puts #16181d panels on a #070809 canvas: 1.13:1. Invisible. That is the
  // exact muddy tone-on-tone this rebuild exists to kill, and it violates the
  // spec's own law. The panel is lifted until it reads as dark paper on a
  // black desk.
  night: {
    canvas: "#070809",
    chrome: "rgba(7,8,9,0.78)",
    cInk: "#eef1f3", // 17.67 on canvas
    cDim: "#8b929b", // 6.38 on canvas
    cLine: "rgba(238,241,243,0.13)",
    cLineStrong: "rgba(238,241,243,0.30)",
    panel: "#3d424c", // 1.99 vs canvas (the spec's own value was 1.13)
    panel2: "#4e545f",
    ink: "#eef1f3", // 8.89 on panel
    inkDim: "#c1c8d1", // 5.98 panel / 4.52 panel2 (the wells)
    inkFaint: "#c1c8cf", // 5.97 panel / 4.51 panel2
    line: "rgba(238,241,243,0.12)", // decorative hairlines and dividers ONLY
    lineStrong: "#a2a3a5", // identifies interactive controls. 4.00 panel / 3.02 panel2.
    // 2.31:1 on this paper — it fails even the 3:1 graphic bar. 6.13 on panel,
    // 4.63 on panel2.
    accentOnPanel: "#cdc2ff",
  },
} as const;

function formatTime(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// "Your words" rows. The UI always holds both fields as strings (controlled
// inputs); the wire shape drops a blank meaning entirely.
type GlossaryRow = { word: string; meaning: string };
const EMPTY_GLOSSARY: GlossaryRow[] = [{ word: "", meaning: "" }];

// Where the floating Options layer sits. It is measured off the Options toggle
// and portalled to <body>, so it spends NO layout height in the control band:
// opening it moves the notes column, Record and Babble it by exactly zero
// pixels (layout contract rules 2 and 3). An inline drawer cannot do that: on
// a 700px-tall viewport the fixed chrome plus the drawer is ~688px, so there is
// no textarea height, not even zero, that keeps Babble it above the fold.
// A phone gets a bottom sheet; anything wider gets a panel anchored under the
// toggle, flipped above it when there is more room up there, and always clamped
// inside all four viewport edges.
type OptionsPlacement =
  | { mode: "sheet" }
  | { mode: "below"; left: number; top: number; width: number; maxHeight: number }
  | { mode: "above"; left: number; bottom: number; width: number; maxHeight: number };

const OPTIONS_EDGE = 8; // never touch a viewport edge
const OPTIONS_GAP = 6; // breathing room between the toggle and the panel
const OPTIONS_MAX_WIDTH = 760;
const OPTIONS_MIN_HEIGHT = 160;
const OPTIONS_SHEET_BELOW = 640; // narrower than this, anchoring buys nothing

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
  const t = THEMES[theme];

  // Display name + initial for the account avatar (from the signed-in user).
  const accountName = (userEmail || "").split("@")[0] || "you";
  const accountInitial = (accountName[0] || "Y").toUpperCase();

  const [inputText, setInputText] = useState(reopen?.transcript ?? "");
  const [outputType, setOutputType] = useState(reopen?.output_type ?? "note");
  const [tone, setTone] = useState(reopen?.tone ?? "");
  // "Your words": the speaker's own terms, each with what it means, so the app
  // can tell their term from the ordinary word it sounds like. One empty row
  // to start, so the feature is obvious without being noisy.
  const [glossary, setGlossary] = useState<GlossaryRow[]>(EMPTY_GLOSSARY);
  const [accent, setAccent] = useState("");
  const [persona, setPersona] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("");
  const [customInstruction, setCustomInstruction] = useState("");
  // Default: keep the speaker's swearing verbatim (their free-speech default).
  // Toggle "Clean it up" to strip the curse words while keeping the anger.
  const [cleanProfanity, setCleanProfanity] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  // Drives the floating Options layer (tone, character, accent, language,
  // spellings, profanity). Format lives outside it, always visible. Shut by
  // default on every size, so the ramble gets the screen.
  const [showOptions, setShowOptions] = useState(false);
  const [optionsPlacement, setOptionsPlacement] =
    useState<OptionsPlacement | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  // ONE thing at a time, full screen: "compose" (ramble + options) or "result"
  // (the Babble, full width, with room to read it all). Babble it -> result;
  // a Back button returns to compose. Kills the cramped two-panel scroll mess.
  const [view, setView] = useState<"compose" | "result">(
    reopen?.cleaned ? "result" : "compose",
  );

  const [cleaned, setCleaned] = useState(reopen?.cleaned ?? "");
  // Bumped on every new result so the decode replays even when the engine
  // hands back the exact same text (Try again on an unchanged ramble).
  const [revealKey, setRevealKey] = useState(0);
  // What the output panel is PAINTING right now: glyph noise mid-decode, the
  // real text once it settles. `cleaned` is always the real text, so Copy and
  // Share can never pick up glyphs.
  const [revealText, setRevealText] = useState(reopen?.cleaned ?? "");
  // Key points and follow ups wait for the decode to finish, then fade up.
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
  const [accountOpen, setAccountOpen] = useState(false);
  const [overlay, setOverlay] = useState<"settings" | "upgrade" | null>(null);

  const revealRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // The ramble textarea (Edit focuses it) and the right output panel (mobile
  // auto-scrolls to it once a Babble lands, since both panels are now always
  // on screen together).
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  // The Options toggle in the control band. The floating layer is positioned
  // off this element's rect, so the panel stays visually attached to the
  // control that opened it without occupying a single pixel of the flow.
  const optionsToggleRef = useRef<HTMLButtonElement>(null);

  // Measure the toggle and clamp the panel inside the viewport: never off an
  // edge, flip above when there is more room up there, bottom sheet on a phone.
  const placeOptions = useCallback(() => {
    const btn = optionsToggleRef.current;
    if (typeof window === "undefined" || !btn) return;
    const r = btn.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (vw < OPTIONS_SHEET_BELOW) {
      setOptionsPlacement({ mode: "sheet" });
      return;
    }

    const width = Math.min(OPTIONS_MAX_WIDTH, vw - OPTIONS_EDGE * 2);
    let left = r.left;
    if (left + width > vw - OPTIONS_EDGE) left = vw - OPTIONS_EDGE - width;
    if (left < OPTIONS_EDGE) left = OPTIONS_EDGE;

    const roomBelow = vh - r.bottom - OPTIONS_GAP - OPTIONS_EDGE;
    const roomAbove = r.top - OPTIONS_GAP - OPTIONS_EDGE;
    if (roomBelow >= roomAbove) {
      setOptionsPlacement({
        mode: "below",
        left,
        top: r.bottom + OPTIONS_GAP,
        width,
        maxHeight: Math.max(OPTIONS_MIN_HEIGHT, roomBelow),
      });
    } else {
      setOptionsPlacement({
        mode: "above",
        left,
        bottom: vh - r.top + OPTIONS_GAP,
        width,
        maxHeight: Math.max(OPTIONS_MIN_HEIGHT, roomAbove),
      });
    }
  }, []);

  // The placement itself is measured up front, on the click, while the toggle
  // is already on screen (see toggleOptions), so the layer paints in the right
  // place on its very first frame with no flash. This effect only SUBSCRIBES:
  // it re-measures when something moves the anchor under the open layer, and
  // wires up Escape.
  useEffect(() => {
    if (!showOptions) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // A dropdown open INSIDE the panel takes the Escape first, so one press
      // never yanks the whole layer out from under an open menu.
      if (openDropdown) setOpenDropdown(null);
      else setShowOptions(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", placeOptions);
    window.addEventListener("scroll", placeOptions, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", placeOptions);
      window.removeEventListener("scroll", placeOptions, true);
    };
  }, [showOptions, openDropdown, placeOptions]);

  const toggleOptions = useCallback(() => {
    if (showOptions) {
      setShowOptions(false);
      return;
    }
    placeOptions();
    setShowOptions(true);
  }, [showOptions, placeOptions]);

  // THE SCRAMBLE-DECODE. The engine's real text arrives all at once; this is
  // what turns that into the signature reveal. A full-length block of noise
  // resolves left to right at 6 characters every 26ms, then settles.
  //
  // The interval is cleared on unmount, on Clear, and before every new run, so
  // a fast second Babble can never leave two decoders fighting over one panel.
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
    // Reduced motion: no decode at all, just the finished text.
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

  // Auto-dismiss the error toast after a few seconds.
  useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(id);
  }, [error]);

  // iOS Safari can restore focus to the ramble textarea from the back/forward
  // cache, popping the on-screen keyboard the moment the page loads and hiding
  // the Record button and the whole action row behind it. Always land with the
  // keyboard dismissed so the controls are visible from the start.
  useEffect(() => {
    const dismissKeyboard = () => {
      const el = document.activeElement as HTMLElement | null;
      if (el && el.tagName === "TEXTAREA") el.blur();
    };
    dismissKeyboard();
    window.addEventListener("pageshow", dismissKeyboard);
    return () => window.removeEventListener("pageshow", dismissKeyboard);
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
        // Send the speaker's own terms up front: transcription is biased
        // toward their spellings instead of guessing and being repaired later.
        const entries = toGlossaryEntries(glossary);
        if (entries.length) form.append("glossary", JSON.stringify(entries));
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
  const busy = transcribing || cleaning || recording;
  const showWarning = recording && recorder.seconds >= WARNING_AT_SECONDS;

  const selectedStyle =
    outputType === "custom"
      ? { label: "Something else" }
      : OUTPUT_TYPES.find((o) => o.id === outputType);
  const selectedTone = TONES.find((x) => x.id === tone);
  const selectedAccent = getAccent(accent);
  const selectedPersona = getPersona(persona);

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
        setError("Pick a format first. What should your ramble become?");
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
        if (!res.ok) throw new Error(data.error || "Cleanup failed.");
        const out = data.cleaned || "";
        setCleaned(out);
        setKeyPoints(Array.isArray(data.keyPoints) ? data.keyPoints : []);
        setFollowUps(Array.isArray(data.followUps) ? data.followUps : []);
        setKeyOpen(true);
        setFollowOpen(true);
        setRevealKey((k) => k + 1);
        setView("result");
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
    // Every value the closure READS has to be here. cleanProfanity was not.
    // So if Profanity was the last thing you touched before Babble it (the
    // natural order: open Options, hit Clean it up, Done, Babble it), nothing
    // else in this list changed, the memoized closure was reused, and it
    // shipped the PREVIOUS profanity choice. Your pick was silently dropped on
    // exactly the run you made it for.
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
    setGlossary(EMPTY_GLOSSARY);
    setCustomInstruction("");
    setCleaned("");
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
    setGlossary(EMPTY_GLOSSARY);
    setCleanProfanity(false);
    setOpenDropdown(null);
  };

  // "Your words" rows. Removing the last remaining row leaves one empty row
  // rather than nothing, so the feature never disappears off the screen.
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
  // Nothing to remove when all that exists is the one blank starter row.
  const glossaryIsEmpty =
    glossary.length === 1 &&
    !glossary[0].word.trim() &&
    !glossary[0].meaning.trim();

  const words = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const chars = inputText.length;
  const hasResult = !!cleaned;
  const metaLabel = [
    outputType === "custom" ? "Something else" : selectedStyle?.label,
    selectedTone?.label,
    selectedPersona?.label,
    selectedAccent?.label,
    targetLanguage,
  ]
    .filter(Boolean)
    .join(" / ");
  // The output panel's header meta: what it is doing, then what it made.
  const resultMeta = cleaning ? "decoding..." : hasResult ? metaLabel : "";

  // Both panels now live on screen together. On mobile (stacked) the output
  // sits below the fold, so once a Babble lands, glide it into view. On
  // tablet/desktop it's already visible beside the workspace, so do nothing.
  useEffect(() => {
    if (!hasResult) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 768px)").matches) return;
    rightPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hasResult, cleaning]);

  // Edit brings you back to the ramble on the left (both panels are always
  // visible now, so there's no view to switch — just focus the text).
  const focusRamble = () => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const navBtn = (label: string, active: boolean, onClick: () => void) => (
    <button
      onClick={onClick}
      className="font-mono-label text-[12px] font-bold uppercase tracking-[0.14em] transition"
      style={{ color: active ? t.cInk : t.cDim }}
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

      {/* Cursor spotlight: an accent halo on the black canvas, tracking the
          mouse. Sits behind the content (the main below is z-10). */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(440px circle at var(--mx,50%) var(--my,28%), rgba(123,92,255,0.22), transparent 64%)",
        }}
      />

      {/* STICKY TOP — the whole header stays put: the brand, the title, and
          your highlighted choices stay visible no matter how far you scroll. */}
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
              setView("compose");
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
                className="font-mono-label flex h-8 w-8 items-center justify-center text-[13px] font-bold transition active:translate-y-px"
                style={{ background: ACCENT, color: ON_ACCENT }}
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

      {/* HELP — lives outside the sticky chrome on purpose. It is position:fixed
          and never needed that wrapper; the wrapper's only real effects were
          12px of dead padding under the header on every screen, and trapping
          this z-[70] modal inside the header's z-30 stacking context, where the
          portalled dropdown sheets could paint over it. */}
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
                    style={{ color: t.ink }}
                  >
                    How to shape your Babble
                  </span>
                  <button
                    onClick={() => setHelpOpen(false)}
                    className="font-mono-label text-[11px] font-bold uppercase tracking-[0.12em]"
                    style={{ color: t.inkDim }}
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
                    <b>Your words</b> locks your own names and terms to the
                    exact spelling, and tells the app what they mean, so it
                    knows when you mean your word and when you mean the
                    ordinary one.
                  </li>
                </ul>
                <p className="mt-3 text-[13px]" style={{ color: t.inkDim }}>
                  Only Format is required. Mix and match the rest, or stack
                  several for something wild.
                </p>
              </div>
            </div>
      )}

      <main
        className="relative z-10 mx-auto w-full px-4 pb-4 pt-3 sm:px-8"
        style={{ maxWidth: 1760 }}
      >
        {/* ============ TITLE BAND ============ */}
        {/* Oversized and tightly tracked, with the instruction riding the far
            end of the same line rather than costing a row. This is the
            editorial voice: the page says what it is at full volume. It can
            afford the height because Babble it no longer lives below it. */}
        <div className="mb-3 flex flex-wrap items-end justify-between gap-x-5 gap-y-1">
          <h1
            className="font-bric font-bold"
            style={{
              color: t.cInk,
              fontSize: "clamp(34px,5vw,72px)",
              lineHeight: 0.9,
              letterSpacing: "-0.045em",
            }}
          >
            Refine a{" "}
            <span className="font-serif-i font-normal" style={{ color: ACCENT }}>
              ramble
            </span>
          </h1>
          <p
            className="font-mono-label text-[11px] uppercase leading-[1.45] tracking-[0.1em] sm:text-[12px] sm:text-right"
            style={{ color: t.cDim, maxWidth: 300 }}
          >
            Talk or paste your ramble on the left. Stack the controls. Babble
            it.
          </p>
        </div>

        {/* ============ CONTROL BAND ============ */}
        {/* Every choice lives here, ABOVE both columns. These controls used to
            sit inside the left column, which made that column do two jobs
            (settings AND notes) and pushed the ramble, Record and Babble it down
            every time the drawer opened. Out here the drawer spends WIDTH
            instead of height, and the workspace below keeps its own geometry no
            matter what is open.
            ONE CARD, not two floating line items. Format and Advanced were bare
            controls stacked on the page with nothing containing them, so they
            read as two unrelated rows and Advanced looked like an afterthought
            belonging to nothing. They are one unit: you pick a format, and the
            secondary choices are the same decision continued. The card says so.
            It is deliberately NOT full page width: Format's value is one or two
            words ("Email"), so stretching it across 1800px only manufactures a
            vast empty bar. The space to the right stays empty on purpose. */}
        <div className="mb-4">
          <div
            className="w-full p-2.5 sm:max-w-[620px]"
            style={{ background: t.panel, border: `1px solid ${t.lineStrong}` }}
          >
          {/* FORMAT and BABBLE IT share the console's top row. Babble it USED to
              live at the bottom of the notes column, which is what kept burying
              it: every control that grew above it pushed it further down, and
              on a short screen it fell off the bottom exactly when you reached
              for it. Up here it is above the fold BY CONSTRUCTION — nothing can
              ever push it down, because nothing is above it but the title.
              They stack only on a phone, where they genuinely do not fit on one
              row (layout contract rule 5 is about controls that DO fit). */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <div
            className="min-w-0 flex-1"
            style={{ border: `1px solid ${t.lineStrong}` }}
          >
            <Selector
              t={t}
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
                style={{ color: t.accentOnPanel }}
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
          </div>

            {/* THE one hero action. It wears the brand gradient because it is
                the only thing here that earns it. The label is dark, not white:
                white fails AA on two of the gradient's three stops, and the
                brand is not the thing that gives way. */}
            <button
              onClick={() => runCleanup()}
              disabled={cleaning || !inputText.trim()}
              className={
                "font-bric flex shrink-0 items-center justify-center gap-2.5 whitespace-nowrap px-7 py-3 text-[16px] font-bold transition hover:brightness-[1.1] active:translate-y-px disabled:opacity-45 disabled:saturate-50 sm:py-0" +
                (inputText.trim() && !cleaning ? " rb-glowpulse" : "")
              }
              style={{
                backgroundImage: GRADIENT,
                color: ON_GRADIENT,
                letterSpacing: "0.01em",
                boxShadow: "0 12px 30px -10px rgba(123,92,255,0.55)",
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

          {/* The custom instruction belongs right under the choice that asked
              for it, not in some other drawer. */}
          {outputType === "custom" && (
            <input
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              placeholder="Turn it into... e.g. a wedding toast, a recipe"
              aria-label="Turn it into"
              className="rb-hero-input mt-2 w-full px-3 py-2.5 text-[16px] outline-none"
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

          {/* OPTIONS — the same decision continued, so it lives INSIDE the card
              directly under Format. Deliberately no divider and no box of its
              own: a rule here would split one unit into two and put Advanced
              back in its own element. Quiet and left-aligned, so it never
              competes with Format. Closed by default. The "?" sits beside it and
              opens help without touching the drawer. */}
          <div className="flex items-center gap-2 px-1 pb-0.5 pt-2">
            <button
              type="button"
              ref={optionsToggleRef}
              onClick={toggleOptions}
              aria-expanded={showOptions}
              aria-haspopup="dialog"
              className="flex items-center gap-1.5 text-left transition active:translate-y-px"
              style={{ background: "transparent" }}
              title="Tone, character, accent, language, spellings, profanity"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke={t.inkDim}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                style={{
                  flexShrink: 0,
                  transform: showOptions ? "rotate(180deg)" : "none",
                  transition: "transform 0.15s",
                }}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
              <span
                className="font-mono-label text-[11px] font-medium uppercase tracking-[0.12em]"
                style={{ color: t.inkDim }}
              >
                Options
              </span>
            </button>
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              aria-label="How the style options work"
              title="How the style options work"
              className="font-mono-label flex h-6 w-6 shrink-0 items-center justify-center text-[12px] font-bold transition"
              style={{
                background: "transparent",
                // lineStrong, not line: this control has no fill, so the border
                // IS the control. At 1.2:1 there was nothing to aim at.
                border: `1px solid ${t.lineStrong}`,
                color: t.inkDim,
              }}
            >
              ?
            </button>
          </div>
          </div>

          {/* The drawer is a FLOATING LAYER, portalled to <body>. It used to
              open inline right here, which pushed the columns down and dropped
              Babble it 226px below the fold at 1440x700, exactly when the user
              has just picked a Character and is reaching for that button. It
              renders nothing in the flow, so this band's height is identical
              open or shut. Anchored under the toggle above, clamped to the
              viewport, and dismissible three ways: Escape, click outside, Done.
              The four secondary choices still ride a responsive grid so they
              spend the width rather than stacking four deep, and they are still
              compact and quiet: they must never read as equal to Format.
              z-45/46 is deliberate and load-bearing: the Selector dropdowns
              inside portal at z-60 and MUST still open above this layer. */}
          {showOptions &&
            optionsPlacement &&
            typeof document !== "undefined" &&
            createPortal(
              <div
                className="fixed inset-0 z-[45]"
                role="dialog"
                aria-modal="true"
                aria-label="Options"
              >
                {/* Click-outside. Dimmed only for the phone sheet, which covers
                    the screen anyway; the anchored popover leaves the page
                    bright so Babble it stays plainly readable behind it. */}
                <div
                  className="absolute inset-0"
                  style={
                    optionsPlacement.mode === "sheet"
                      ? { background: "rgba(0,0,0,0.55)", touchAction: "none" }
                      : undefined
                  }
                  onClick={() => setShowOptions(false)}
                />
                <div
                  className={
                    optionsPlacement.mode === "sheet"
                      ? "absolute inset-x-0 bottom-0 z-[46] flex flex-col overflow-hidden"
                      : "absolute z-[46] flex flex-col overflow-hidden"
                  }
                  style={{
                    background: t.panel,
                    border: `1px solid ${t.lineStrong}`,
                    boxShadow: "0 24px 60px -16px rgba(0,0,0,0.6)",
                    ...(optionsPlacement.mode === "sheet"
                      ? { maxHeight: "85vh" }
                      : optionsPlacement.mode === "below"
                        ? {
                            left: optionsPlacement.left,
                            top: optionsPlacement.top,
                            width: optionsPlacement.width,
                            maxHeight: optionsPlacement.maxHeight,
                          }
                        : {
                            left: optionsPlacement.left,
                            bottom: optionsPlacement.bottom,
                            width: optionsPlacement.width,
                            maxHeight: optionsPlacement.maxHeight,
                          }),
                  }}
                >
                  <div
                    className="flex shrink-0 items-center justify-between px-3.5 py-2"
                    style={{ borderBottom: `1px solid ${t.line}` }}
                  >
                    <span
                      className="font-mono-label text-[11px] font-medium uppercase tracking-[0.12em]"
                      style={{ color: t.inkDim }}
                    >
                      Options
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowOptions(false)}
                      className="font-mono-label px-2 py-1 text-[11px] font-bold uppercase tracking-[0.12em] transition active:translate-y-px"
                      style={{ background: "transparent", color: t.inkDim }}
                    >
                      Done
                    </button>
                  </div>
                  {/* The one legitimate scroll region on this screen: a
                      transient overlay, not a page panel, so contract rule 1
                      is intact. If the choices outgrow the space THIS scrolls.
                      The page never does. */}
                  <div className="flex flex-col gap-4 overflow-y-auto overscroll-contain p-3.5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div
                  className="overflow-hidden"
                  style={{ border: `1px solid ${t.lineStrong}` }}
                >
                  <Selector
                    t={t}
                    label="Tone"
                    optional
                    compact
                    value={selectedTone?.label ?? ""}
                    placeholder="Choose a tone"
                    open={openDropdown === "tone"}
                    onToggle={() =>
                      setOpenDropdown((d) => (d === "tone" ? null : "tone"))
                    }
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
                </div>

                <div
                  className="overflow-hidden"
                  style={{ border: `1px solid ${t.lineStrong}` }}
                >
                  <Selector
                    t={t}
                    label="Character"
                    optional
                    compact
                    value={selectedPersona?.label ?? ""}
                    placeholder="Add a character"
                    open={openDropdown === "character"}
                    onToggle={() =>
                      setOpenDropdown((d) =>
                        d === "character" ? null : "character",
                      )
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
                </div>

                <div
                  className="overflow-hidden"
                  style={{ border: `1px solid ${t.lineStrong}` }}
                >
                  <Selector
                    t={t}
                    label="Accent"
                    optional
                    compact
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
                </div>

                {/* LANGUAGE — its own axis, not buried under Accent. Accent =
                    English spoken with an accent. Language = the output
                    written in that language. */}
                <div
                  className="overflow-hidden"
                  style={{ border: `1px solid ${t.lineStrong}` }}
                >
                  <Selector
                    t={t}
                    label="Language"
                    optional
                    compact
                    value={targetLanguage}
                    placeholder="Same as input"
                    open={openDropdown === "language"}
                    onToggle={() =>
                      setOpenDropdown((d) =>
                        d === "language" ? null : "language",
                      )
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
                      className="font-mono-label px-3 pb-1 pt-3 text-[10px] uppercase tracking-[0.18em]"
                      style={{ color: t.inkFaint }}
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
              </div>

              {/* Your words: the speaker's own terms. A flat spelling list
                  could not do this job — "recruiter" and their app "Rekrutr"
                  sound identical, so the app needs to know what the word MEANS
                  to pick the right one. Word and meaning ride ONE row wherever
                  there is width (contract rule 5) and only stack on a narrow
                  phone. */}
              <div>
                <span
                  className="font-mono-label mb-1.5 block text-[9px] font-medium uppercase tracking-[0.12em]"
                  style={{ color: t.inkFaint }}
                >
                  Your words{" "}
                  <span className="font-normal" style={{ color: t.inkFaint }}>
                    · optional
                  </span>
                </span>
                <p className="mb-2 text-[12px]" style={{ color: t.inkDim }}>
                  Names, brands, or words you use that we should get right.
                  Tell us what they mean so we know when you mean them.
                </p>

                <div className="flex flex-col gap-2">
                  {glossary.map((row, i) => (
                    /* One row on any real width; only a narrow phone wraps,
                       and even there it wraps to TWO lines (word, then meaning
                       + remove) rather than three, because this drawer's
                       height is charged against Record and Babble it. */
                    <div key={i} className="flex flex-wrap items-end gap-2">
                      <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
                        <label
                          htmlFor={`rb-word-${i}`}
                          className="font-mono-label mb-1 block text-[9px] uppercase tracking-[0.12em]"
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
                          placeholder="Rekrutr"
                          className="rb-hero-input w-full px-3 py-2.5 text-[16px] outline-none"
                          style={
                            {
                              // panel2, not panel: these wells sit ON the
                              // panel-coloured drawer, so they need the deeper
                              // tone plus a lineStrong outline to read as
                              // fields at all rather than as bare paper.
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
                          className="font-mono-label mb-1 block text-[9px] uppercase tracking-[0.12em]"
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
                          placeholder="my recruiting app"
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
                      {/* Quiet, and disabled rather than hidden on the lone
                          starter row so the row geometry never jumps. */}
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
                        className="flex h-[42px] w-[42px] shrink-0 items-center justify-center text-[15px] transition active:translate-y-px"
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
              </div>

              {/* Profanity and Reset choices share one row: both are small, and
                  small controls do not get a full-width row each. */}
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <span
                    className="font-mono-label mb-1.5 block text-[9px] font-medium uppercase tracking-[0.12em]"
                    style={{ color: t.inkFaint }}
                  >
                    Profanity{" "}
                    <span className="font-normal" style={{ color: t.inkFaint }}>
                      · optional
                    </span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCleanProfanity(false)}
                      className="font-mono-label px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.1em] transition active:translate-y-px"
                      style={
                        !cleanProfanity
                          ? {
                              background: t.ink,
                              color: t.panel,
                              border: `1px solid ${t.ink}`,
                            }
                          : {
                              background: t.panel2,
                              color: t.ink,
                              border: `1px solid ${t.lineStrong}`,
                            }
                      }
                    >
                      Keep it
                    </button>
                    <button
                      type="button"
                      onClick={() => setCleanProfanity(true)}
                      className="font-mono-label px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.1em] transition active:translate-y-px"
                      style={
                        cleanProfanity
                          ? {
                              background: t.ink,
                              color: t.panel,
                              border: `1px solid ${t.ink}`,
                            }
                          : {
                              background: t.panel2,
                              color: t.ink,
                              border: `1px solid ${t.lineStrong}`,
                            }
                      }
                    >
                      Clean it up
                    </button>
                  </div>
                </div>

                <button
                  onClick={resetChoices}
                  className="font-mono-label flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.1em] transition active:translate-y-px"
                  style={{ background: t.ink, color: t.panel }}
                >
                  <span aria-hidden>&#8635;</span> Reset choices
                </button>
              </div>
                  </div>
                </div>
              </div>,
              document.body,
            )}
        </div>

        {/* ============ TWO-COLUMN WORKSPACE ============ */}
        {/* LEFT is the notes and the one primary action, RIGHT is the payoff.
            Side by side on tablet/desktop, stacked on phones. Neither column
            ever scrolls inside itself. */}
        <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:items-start">
          {/* ============ LEFT PANEL — your notes ============ */}
          {/* It now does ONE job: the ramble, Record, and Babble it. Nothing in
              here moves when the Options drawer opens. */}
          <section
            className="flex flex-col gap-2 p-4 sm:p-5"
            style={{ background: t.panel, border: `1px solid ${t.lineStrong}` }}
          >
            {/* Heading for the column, with the live count riding the far end of
                the same line instead of costing a row of its own. */}
            <div className="flex items-baseline justify-between gap-2">
              <span
                className="font-mono-label text-[11px] font-medium uppercase tracking-[0.16em]"
                style={{ color: t.inkDim }}
              >
                Ramble
              </span>
              <span
                className="font-mono-label text-[10px] uppercase tracking-[0.06em]"
                style={{ color: t.inkFaint }}
              >
                {words} words / {chars} chars
              </span>
            </div>

            {/* The ramble. The textarea is the ADJUSTABLE variable on this page
                (layout contract rule 1: content gets smaller, the panel never
                scrolls inside itself). Its height is derived from the viewport
                so the title band, the control band, Record and Babble it always
                fit on one screen: on a short viewport it gives up its own height
                rather than pushing the primary action below the fold (rules 2
                and 3). The ceiling keeps it from turning into a void on tall
                screens; the floor keeps it usable. It never scrolls at rest. */}
            <div className="relative flex flex-col">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Spill it here. The voice memos, the half-baked ideas, the texts you shouldn't send yet."
                className="rb-hero-input h-[clamp(120px,calc(100dvh_-_35rem),210px)] w-full resize-none p-4 text-[16px] leading-[1.6] outline-none sm:h-[clamp(150px,calc(100dvh_-_27rem),300px)] sm:p-5 sm:text-[17px]"
                style={
                  {
                    color: t.ink,
                    background: t.panel2,
                    // lineStrong, not line: panel2 on panel is 1.4:1, so this
                    // border is the only thing that says "type here".
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
                  {/* Five full-height bars, alternating accent and ink, each a
                      beat behind the last so the meter reads as one travelling
                      pulse. The spec's third bar is cobalt; cobalt measures
                      2.23:1 on Day paper, so it does not go here. */}
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
                      className="font-mono-label px-4 py-2 text-[11px] uppercase tracking-[0.12em]"
                      style={{ background: ACCENT, color: ON_ACCENT }}
                    >
                      Stop
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* The quiet chips, directly under the ramble and visible with zero
                scrolling: Record is the app's core input, so it is never below
                the fold. It turns into Stop while a take is live. Clear stays
                out of the way. No Paste chip: the browser cannot read the
                clipboard silently, so it prompts, and Ctrl+V / long-press
                already do it in fewer taps. No Copy chip either: copying your
                own ramble back out of the box you just typed it into serves
                nobody. */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={recording ? handleStop : handleStart}
                disabled={transcribing}
                className="font-mono-label flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] transition active:translate-y-px disabled:opacity-50"
                style={{
                  background: "transparent",
                  // lineStrong, not line: no fill, so the border is the chip.
                  border: `1px solid ${recording ? t.accentOnPanel : t.lineStrong}`,
                  color: recording ? t.accentOnPanel : t.inkDim,
                }}
              >
                {transcribing ? (
                  <span
                    className="rb-spin inline-block h-3 w-3 rounded-full border-2"
                    style={{
                      borderColor: "transparent",
                      borderTopColor: t.accentOnPanel,
                    }}
                  />
                ) : (
                  /* The record status dot: one of only two things on this
                     screen still allowed to be round. */
                  <span
                    className={recording ? "rb-blink" : ""}
                    style={{
                      display: "inline-block",
                      height: 9,
                      width: 9,
                      borderRadius: 999,
                      background: t.accentOnPanel,
                    }}
                  />
                )}
                {transcribing ? `${loadingWord}…` : recording ? "Stop" : "Record"}
              </button>
              <button
                onClick={() => {
                  if (recorder.status === "recording") recorder.cancel();
                  setInputText("");
                  setError(null);
                  setLimitNotice(null);
                }}
                disabled={!inputText}
                className="font-mono-label flex items-center gap-1 whitespace-nowrap px-2 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] transition active:translate-y-px disabled:opacity-40"
                style={{ background: "transparent", color: t.inkFaint }}
              >
                <span aria-hidden style={{ color: "#ff6b68", fontSize: 14 }}>
                  &times;
                </span>{" "}
                Clear
              </button>
            </div>

            {/* Babble it used to live here, and this is exactly why it kept
                getting buried. It is in the console now. */}
            {limitNotice && (
              <p className="font-mono-label text-[11px]" style={{ color: "#ff5a3c" }}>
                {limitNotice}
              </p>
            )}
          </section>

          {/* ============ RIGHT PANEL — payoff ============ */}
          {/* GROWS to fit its content. No internal scroll: a long babble makes
              this panel taller and the PAGE scrolls (AGENTS.md rule 1). The
              min-height is only a floor so the idle "b" mark has room to centre;
              it never caps. md:items-start on the grid keeps the columns at
              their own natural heights instead of stretching to match. */}
          <section
            ref={rightPanelRef}
            className="flex min-h-[320px] flex-col sm:min-h-[440px]"
            style={{ background: t.panel, border: `1px solid ${t.lineStrong}` }}
          >
            {/* Panel header: what this side is, and a right-aligned meta line
                saying what it is doing ("decoding...") or what it made. */}
            <div
              className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2.5"
              style={{ borderBottom: `1px solid ${t.line}` }}
            >
              <span
                className="font-mono-label shrink-0 text-[11px] font-medium uppercase tracking-[0.16em]"
                style={{ color: t.accentOnPanel }}
              >
                Babble
              </span>
              <div className="flex min-w-0 items-center gap-2">
                {resultMeta && (
                  <span
                    className="font-mono-label truncate text-[10px] uppercase tracking-[0.08em]"
                    style={{ color: t.inkFaint }}
                  >
                    {resultMeta}
                  </span>
                )}
                {hasResult && !cleaning && (
                  <>
                    <button
                      onClick={focusRamble}
                      title="Edit this ramble (jumps back to the text on the left)"
                      className="font-mono-label flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] transition active:translate-y-px"
                      style={{ background: "transparent", border: `1px solid ${t.lineStrong}`, color: t.inkDim }}
                    >
                      <span aria-hidden style={{ fontSize: 13 }}>
                        &larr;
                      </span>{" "}
                      Edit
                    </button>
                    <button
                      onClick={handleCopy}
                      disabled={!cleaned}
                      className="font-mono-label flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] transition active:translate-y-px disabled:opacity-40"
                      style={{
                        background: "transparent",
                        border: `1px solid ${t.lineStrong}`,
                        color: t.inkDim,
                      }}
                    >
                      {copyLabel}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* NO overflow: the body grows with the babble and the page scrolls.
                flex-1 lets it fill the section's min-height so the idle state
                can centre, and lets it grow past that when a result is long. */}
            <div className="flex flex-1 flex-col">
              {/* flex-1 (not min-h-full: a percentage min-height does not
                  resolve against a flex-grown parent, which collapsed the idle
                  state to the top) fills the panel so the empty and working
                  states centre; a real result just flows from the top and grows
                  the panel, scrolling the page. */}
              <div className="flex flex-1 flex-col px-5 py-4 sm:px-6">
                {cleaning && !hasResult ? (
                  /* Working: the engine has the ramble and has not answered
                     yet. There is nothing to decode until it does. */
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
                      className="mt-4 max-w-[260px] text-[16px] leading-[1.5]"
                      style={{ color: t.inkDim }}
                    >
                      Your refined or ridiculous text resolves right here. Stack
                      a few controls, then babble it.
                    </p>
                  </div>
                ) : (
                  <div>
                    {/* THE REVEAL. A block of glyph noise resolving left to
                        right into the real text. `cleaned` (never this) is what
                        Copy and Share read, so the buttons cannot hand anyone a
                        mouthful of noise, and once it settles this IS the real
                        string: selectable and copyable straight off the page. */}
                    <div
                      className="font-serif-i whitespace-pre-wrap"
                      style={{
                        color: t.ink,
                        fontStyle: "normal",
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
                              className="flex gap-2 text-[15px]"
                              style={{ color: t.inkDim }}
                            >
                              <span
                                className="font-mono-label text-[12px]"
                                style={{ color: t.accentOnPanel }}
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
                              className="flex items-center gap-2 py-2 text-[15px]"
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
                  </div>
                )}
              </div>
            </div>

            {hasResult && (
              <div
                className="flex shrink-0 flex-wrap gap-1 p-2"
                style={{ borderTop: `1px solid ${t.line}` }}
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
      {/* Bigger and tilted (b dips low, e kicks up). The letters ride a wave
          that travels through the word, like a snapped bedsheet. */}
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
          // The one primary action inside its own modal, so it may carry the
          // accent. No gradient and no glow: the brand gradient belongs to the
          // wordmark and to Babble it, and nothing else. The label is dark
          // because white on this violet is 4.36:1 and fails AA.
          highlight
            ? { background: ACCENT, color: ON_ACCENT }
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
  compact,
  open,
  onToggle,
  children,
  className,
}: {
  t: T;
  // Optional: nobody needs "01".."05" counted at them. Left in for any caller
  // that genuinely wants a numbered step; the app itself passes none.
  index?: string;
  label: string;
  value: string;
  placeholder: string;
  optional?: boolean;
  // Compact = a secondary choice (the four in the Options drawer). Lighter and
  // smaller than Format on purpose, so Format always visibly outranks them.
  compact?: boolean;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const set = !!value;
  return (
    <div
      className={`relative flex flex-col ${className ?? ""}`}
      style={{ background: "transparent" }}
    >
      <button
        onClick={onToggle}
        className={`flex w-full flex-1 items-center justify-between gap-2 px-3.5 text-left transition ${
          compact ? "py-1.5" : "py-2.5"
        }`}
        style={{
          // A set value does NOT tint. Only "open" raises the tone, because
          // only "open" is live state. The value below the label already says
          // what is selected; a purple wash on top of it says nothing.
          background: open ? t.panel2 : "transparent",
        }}
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span
            className="font-mono-label flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-[0.12em]"
            style={{ color: t.inkFaint }}
          >
            {index ? `${index} ${label}` : label}
            {optional ? (
              <span style={{ color: t.inkFaint }} className="font-normal">
                · optional
              </span>
            ) : null}
          </span>
          <span
            className={`truncate ${compact ? "text-[14px]" : "text-[16px]"}`}
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
          stroke={t.inkDim}
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
              className="relative z-[61] flex max-h-[85vh] w-full flex-col overflow-hidden sm:w-[460px] sm:max-h-[80vh]"
              style={{
                background: t.panel,
                border: `1px solid ${t.lineStrong}`,
                boxShadow: "0 -8px 60px -10px rgba(0,0,0,0.6)",
              }}
            >
              <div
                className="flex shrink-0 items-center justify-between px-4 py-3"
                style={{ borderBottom: `1px solid ${t.line}`, background: t.panel2 }}
              >
                <span
                  className="font-mono-label text-[11px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: t.ink }}
                >
                  {index ? `${index} ${label}` : label}
                </span>
                <button
                  onClick={onToggle}
                  className="font-mono-label px-2 py-1 text-[11px] font-bold uppercase tracking-[0.12em]"
                  style={{ color: t.inkDim }}
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
          style={{ color: t.accentOnPanel }}
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
  // The chosen row is marked by TONE plus an accent bullet, never by tinting
  // its label accent: the brand violet is 2.3-3.1:1 on this paper and would be
  // the one row you cannot read.
  const rest = () => ({
    background: active ? t.panel2 : "transparent",
    color: active ? t.ink : t.inkDim,
  });
  return (
    <button
      onClick={onClick}
      className="rb-optrow flex w-full items-center gap-2 px-3 py-2 text-left text-[14px] transition hover:pl-5"
      style={rest()}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = t.ink;
        e.currentTarget.style.color = t.panel;
      }}
      onMouseLeave={(e) => {
        const r = rest();
        e.currentTarget.style.background = r.background;
        e.currentTarget.style.color = r.color;
      }}
    >
      {active && (
        <span
          className="rb-optdot h-1.5 w-1.5 shrink-0"
          style={{ background: t.accentOnPanel }}
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
      className="rb-rise mt-3 overflow-hidden"
      style={{ border: `1.5px solid ${t.line}` }}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-2.5 transition"
        style={{
          background: open ? t.panel2 : "transparent",
        }}
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
      className="font-mono-label flex-1 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] transition hover:bg-[rgba(128,128,128,0.12)] disabled:opacity-50"
      style={{ background: "transparent", color: t.inkDim }}
    >
      {children}
    </button>
  );
}
