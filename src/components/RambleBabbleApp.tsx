"use client";

import { useCallback, useState } from "react";
import { useRecorder } from "./useRecorder";
import { getSupabase } from "@/lib/supabase/client";
import type { SavedRamble } from "./MyRambles";
import {
  OUTPUT_TYPES,
  TONES,
  DEFAULT_OUTPUT_TYPE,
  DEFAULT_TONE,
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

function formatTime(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Deterministic waveform bar heights (sine-based), so no Math.random.
const WAVE_BARS = Array.from({ length: 28 }, (_, i) =>
  Math.round(12 + 26 * Math.abs(Math.sin(i * 0.7))),
);

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
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const [inputText, setInputText] = useState(reopen?.transcript ?? "");
  const [outputType, setOutputType] = useState(
    reopen?.output_type ?? DEFAULT_OUTPUT_TYPE,
  );
  const [tone, setTone] = useState(reopen?.tone ?? DEFAULT_TONE);
  const [vocabulary, setVocabulary] = useState("");
  const [vocabOpen, setVocabOpen] = useState(false);
  const [expandedTab, setExpandedTab] = useState<"work" | "fun" | null>(null);
  const [expandedTone, setExpandedTone] = useState<
    "standard" | "character" | null
  >(null);
  const [customInstruction, setCustomInstruction] = useState("");

  const [cleaned, setCleaned] = useState(reopen?.cleaned ?? "");
  const [keyPoints, setKeyPoints] = useState<string[]>(reopen?.key_points ?? []);
  const [followUps, setFollowUps] = useState<string[]>(reopen?.follow_ups ?? []);
  const [resultGroup, setResultGroup] = useState<"work" | "fun" | null>(
    reopen ? (reopen.is_fun ? "fun" : "work") : null,
  );
  const [resultLabel, setResultLabel] = useState(
    reopen?.output_label ?? reopen?.output_type ?? "",
  );
  const [resultTone, setResultTone] = useState(
    reopen
      ? (TONES.find((t) => t.id === reopen.tone)?.label ?? reopen.tone ?? "")
      : "",
  );
  const [editing, setEditing] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const [transcribing, setTranscribing] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitNotice, setLimitNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  // Shared by both manual Stop and the automatic 3-minute cap. Checks file
  // size BEFORE upload so a too-large file fails with a friendly message.
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
      setTranscribing(true);
      try {
        const form = new FormData();
        const ext = blob.type.includes("mp4") ? "mp4" : "webm";
        form.append("audio", blob, `ramble.${ext}`);
        if (vocabulary.trim()) form.append("vocabulary", vocabulary.trim());

        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: form,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Transcription failed.");

        setInputText((prev) =>
          prev.trim()
            ? `${prev.trim()}\n\n${data.transcript}`
            : data.transcript,
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

  const busy = transcribing || cleaning || recorder.status === "recording";
  const showWarning =
    recorder.status === "recording" && recorder.seconds >= WARNING_AT_SECONDS;

  const workTypes = OUTPUT_TYPES.filter((o) => o.group !== "fun");
  const funTypes = OUTPUT_TYPES.filter((o) => o.group === "fun");
  const seriousTones = TONES.filter((t) => t.group !== "fun");
  const characterTones = TONES.filter((t) => t.group === "fun");
  // "Fun" styling for the action button = a fun format OR a character voice.
  const selectedIsFun =
    funTypes.some((o) => o.id === outputType) ||
    characterTones.some((t) => t.id === tone);

  const selectedStyle =
    outputType === "custom"
      ? {
          label: "Something else…",
          example: "We'll turn it into whatever you type above.",
        }
      : OUTPUT_TYPES.find((o) => o.id === outputType);
  const selectedTone = TONES.find((t) => t.id === tone);

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
        setError("Record or paste some text first.");
        return;
      }
      if (outputType === "custom" && !customInstruction.trim()) {
        setError("Tell us what to turn it into.");
        return;
      }
      const selected = OUTPUT_TYPES.find((o) => o.id === outputType);
      const kind: "work" | "fun" = selected?.group === "fun" ? "fun" : "work";
      const label =
        outputType === "custom"
          ? customInstruction.trim()
          : (selected?.label ?? "");
      const toneLabel = TONES.find((t) => t.id === tone)?.label ?? "";

      setError(null);
      setCopied(false);
      setEditing(false);
      setShowRaw(false);
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
            vocabulary: vocabulary.trim() || undefined,
            modifier,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Cleanup failed.");
        setCleaned(data.cleaned || "");
        setKeyPoints(Array.isArray(data.keyPoints) ? data.keyPoints : []);
        setFollowUps(Array.isArray(data.followUps) ? data.followUps : []);
        setResultGroup(kind);
        setResultLabel(label);
        setResultTone(toneLabel);
        // Save to the user's history (skip re-runs like wilder/shorter/try-again).
        if (!modifier) {
          void getSupabase()
            .from("rambles")
            .insert({
              user_id: userId,
              transcript: inputText,
              output_type: outputType,
              output_label: label,
              tone,
              cleaned: data.cleaned || "",
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
    [inputText, outputType, customInstruction, tone, vocabulary, userId],
  );

  const copyText = useCallback(
    async (text: string) => {
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        showToast("Copied to clipboard");
      } catch {
        setError("Couldn't copy to clipboard.");
      }
    },
    [showToast],
  );

  const handleCopy = useCallback(async () => {
    if (!cleaned) return;
    await copyText(cleaned);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [cleaned, copyText]);

  const handleClear = useCallback(() => {
    if (recorder.status === "recording") recorder.cancel();
    setInputText("");
    setVocabulary("");
    setCustomInstruction("");
    setCleaned("");
    setKeyPoints([]);
    setFollowUps([]);
    setResultGroup(null);
    setEditing(false);
    setShowRaw(false);
    setError(null);
    setLimitNotice(null);
    setCopied(false);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [recorder]);

  const idle = recorder.status !== "recording";
  const polishDisabled =
    busy ||
    !inputText.trim() ||
    (outputType === "custom" && !customInstruction.trim());

  const pickStyle = (id: string) => {
    setOutputType(id);
    // Collapse the category once a choice is made (custom keeps it open to type).
    if (id !== "custom") setExpandedTab(null);
  };
  const pickTone = (id: string) => {
    setTone(id);
    setExpandedTone(null);
  };

  return (
    <div
      data-theme={theme}
      data-accent="coral"
      className="relative min-h-screen w-full overflow-hidden bg-[var(--bg)] text-[var(--text)]"
    >
      {/* Ambient glow blobs */}
      <div
        aria-hidden
        className="rb-floaty pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full blur-3xl"
        style={{ background: "var(--glow1)" }}
      />
      <div
        aria-hidden
        className="rb-floaty pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full blur-3xl"
        style={{ background: "var(--glow2)", animationDelay: "-4.5s" }}
      />

      {/* Header */}
      <header className="sticky top-0 z-30 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-3 backdrop-blur-sm">
        <div className="font-display flex items-center gap-2 text-[28px] font-bold">
          <span
            className="rb-blink h-2.5 w-2.5 rounded-full"
            style={{ background: "var(--signal)" }}
          />
          <span>
            Ramble{" "}
            <span
              className="rb-shake font-babble inline-block bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(120deg,var(--primary),var(--signal))",
              }}
            >
              Babble
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            aria-label="Toggle theme"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface2)] text-lg transition hover:border-[var(--border-strong)]"
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <button
            onClick={onOpenHistory}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface2)] px-4 py-2.5 text-sm font-semibold transition hover:border-[var(--border-strong)]"
          >
            My Rambles
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-12 pt-2">
        {/* App shell: control rail (left) + workspace (right) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
          {/* SIDEBAR: record + all controls */}
          <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)]">
            {/* Record */}
            <section className="flex flex-col items-center gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4">
          {idle ? (
            <>
              <button
                onClick={handleStart}
                disabled={transcribing}
                aria-label="Record ramble"
                className="relative flex h-14 w-14 items-center justify-center rounded-full text-white transition active:scale-[0.96] disabled:opacity-60"
                style={{
                  background: "var(--primary)",
                  boxShadow: "0 6px 18px -8px var(--glow1)",
                }}
              >
                <MicIcon size={22} />
              </button>
              <div className="text-center">
                <p className="font-display text-[16px] font-semibold">
                  {transcribing ? "Transcribing…" : "Tap to record"}
                </p>
                <p className="mt-0.5 text-xs text-[var(--text-dim)]">
                  up to {MAX_MINUTES} min, or paste
                </p>
              </div>
            </>
          ) : (
            <div className="flex w-full flex-col items-center gap-5">
              <div className="relative flex h-20 w-20 items-center justify-center">
                {[0, 0.8, 1.6].map((d) => (
                  <span
                    key={d}
                    className="rb-ring absolute inset-0 rounded-full"
                    style={{
                      border: "2px solid var(--signal)",
                      animationDelay: `${d}s`,
                    }}
                  />
                ))}
                <div
                  className="font-mono-timer flex h-[72px] w-[72px] items-center justify-center rounded-full text-[18px] font-bold"
                  style={{ background: "var(--signal)", color: "var(--signal-ink)" }}
                >
                  {formatTime(recorder.seconds)}
                </div>
              </div>

              {/* Waveform */}
              <div className="flex h-10 items-center gap-[3px]">
                {WAVE_BARS.map((h, i) => (
                  <span
                    key={i}
                    className="rb-wave-bar w-1 rounded-full"
                    style={{
                      height: `${h}px`,
                      background:
                        "linear-gradient(180deg,var(--signal),var(--primary))",
                      animationDuration: `${0.55 + (i % 6) * 0.08}s`,
                      animationDelay: `${(i % 5) * 0.07}s`,
                    }}
                  />
                ))}
              </div>

              {showWarning && (
                <p
                  className="rounded-full px-4 py-1.5 text-sm font-medium"
                  style={{
                    background: "var(--danger-soft)",
                    color: "var(--danger)",
                  }}
                >
                  ⏳ {WARNING_MESSAGE}
                </p>
              )}

              <div className="flex w-full gap-3">
                <button
                  onClick={recorder.cancel}
                  className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface2)] px-4 py-3 font-semibold transition hover:border-[var(--border-strong)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStop}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold text-[var(--primary-ink)]"
                  style={{ background: "var(--primary)" }}
                >
                  <span className="inline-block h-3 w-3 rounded-[2px] bg-white" />
                  Stop
                </button>
              </div>
            </div>
          )}

          {recorder.error && (
            <p className="text-sm" style={{ color: "var(--danger)" }}>
              {recorder.error}
            </p>
          )}
          {limitNotice && (
            <p
              className="rounded-xl px-4 py-3 text-center text-sm"
              style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
            >
              {limitNotice}
            </p>
          )}
        </section>

        {/* Scrollable controls between the record card and the Babble button */}
        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {/* Format — always-visible tabs so BOTH sides are obvious */}
        <section>
          <Label>Turn it into…</Label>
          <div className="mt-2 grid grid-cols-2 gap-2.5">
            <button
              onClick={() =>
                setExpandedTab((t) => (t === "work" ? null : "work"))
              }
              className="rb-pulseglow flex items-center justify-between rounded-[14px] border-2 px-4 py-3.5 text-sm font-bold transition active:scale-[0.99]"
              style={
                {
                  borderColor: "var(--primary)",
                  background:
                    expandedTab === "work"
                      ? "var(--primary)"
                      : "var(--primary-soft)",
                  color:
                    expandedTab === "work"
                      ? "var(--primary-ink)"
                      : "var(--text)",
                  "--pulse-color": "rgba(123,92,255,0.45)",
                } as React.CSSProperties
              }
            >
              Get It Done
              <span className="text-xs opacity-70">
                {expandedTab === "work" ? "▴" : "▾"}
              </span>
            </button>
            <button
              onClick={() =>
                setExpandedTab((t) => (t === "fun" ? null : "fun"))
              }
              className="rb-pulseglow flex items-center justify-between rounded-[14px] border-2 px-4 py-3.5 text-sm font-bold transition active:scale-[0.99]"
              style={
                {
                  borderColor: "var(--fun1)",
                  background:
                    expandedTab === "fun" ? "var(--fun1)" : "var(--fun-soft)",
                  color: expandedTab === "fun" ? "#fff" : "var(--fun1)",
                  "--pulse-color": "rgba(255,77,157,0.45)",
                } as React.CSSProperties
              }
            >
              <span>Just for Fun</span>
              <span className="text-xs opacity-70">
                {expandedTab === "fun" ? "▴" : "▾"}
              </span>
            </button>
          </div>

          {expandedTab === "work" && (
            <>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                {workTypes.map((o) => (
                  <OptionCard
                    key={o.id}
                    label={o.label}
                    active={outputType === o.id}
                    onClick={() => pickStyle(o.id)}
                    dotColor="var(--primary)"
                  />
                ))}
                <OptionCard
                  label="Something else…"
                  active={outputType === "custom"}
                  onClick={() => pickStyle("custom")}
                  dotColor="var(--text-faint)"
                />
              </div>
              {outputType === "custom" && (
                <input
                  type="text"
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  placeholder="Turn it into… e.g. a wedding toast, a recipe, a cover letter"
                  autoComplete="off"
                  className="mt-2.5 w-full rounded-[14px] border border-[var(--primary)] bg-[var(--surface)] p-3 text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
                />
              )}
            </>
          )}
          {expandedTab === "fun" && (
            <div
              className="mt-2 rounded-[18px] border p-3"
              style={{
                background: "var(--fun-soft)",
                borderColor: "color-mix(in srgb,var(--fun1) 28%,transparent)",
              }}
            >
              <p className="mb-2 text-xs text-[var(--text-dim)]">
                Let your Babble off the leash.
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {funTypes.map((o) => (
                  <OptionCard
                    key={o.id}
                    label={o.label}
                    active={outputType === o.id}
                    onClick={() => pickStyle(o.id)}
                    fun
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Tone — two collapsible column bars, matching the format section */}
        <section className="mt-6">
          <Label>Tone</Label>
          <div className="mt-2 grid grid-cols-2 gap-2.5">
            <button
              onClick={() =>
                setExpandedTone((t) => (t === "standard" ? null : "standard"))
              }
              className="rb-pulseglow flex items-center justify-between rounded-[14px] border-2 px-4 py-3.5 text-sm font-bold transition active:scale-[0.99]"
              style={
                {
                  borderColor: "var(--primary)",
                  background:
                    expandedTone === "standard"
                      ? "var(--primary)"
                      : "var(--primary-soft)",
                  color:
                    expandedTone === "standard"
                      ? "var(--primary-ink)"
                      : "var(--text)",
                  "--pulse-color": "rgba(123,92,255,0.45)",
                } as React.CSSProperties
              }
            >
              Standard
              <span className="text-xs opacity-70">
                {expandedTone === "standard" ? "▴" : "▾"}
              </span>
            </button>
            <button
              onClick={() =>
                setExpandedTone((t) => (t === "character" ? null : "character"))
              }
              className="rb-pulseglow flex items-center justify-between rounded-[14px] border-2 px-4 py-3.5 text-sm font-bold transition active:scale-[0.99]"
              style={
                {
                  borderColor: "var(--fun1)",
                  background:
                    expandedTone === "character"
                      ? "var(--fun1)"
                      : "var(--fun-soft)",
                  color: expandedTone === "character" ? "#fff" : "var(--fun1)",
                  "--pulse-color": "rgba(255,77,157,0.45)",
                } as React.CSSProperties
              }
            >
              <span>Character Voices</span>
              <span className="text-xs opacity-70">
                {expandedTone === "character" ? "▴" : "▾"}
              </span>
            </button>
          </div>

          {expandedTone === "standard" && (
            <div className="mt-3 flex flex-wrap gap-2">
              {seriousTones.map((t) => (
                <TonePill
                  key={t.id}
                  label={t.label}
                  hint={t.hint}
                  active={tone === t.id}
                  onClick={() => pickTone(t.id)}
                />
              ))}
            </div>
          )}
          {expandedTone === "character" && (
            <div className="mt-3 flex flex-wrap gap-2">
              {characterTones.map((t) => (
                <TonePill
                  key={t.id}
                  label={t.label}
                  hint={t.hint}
                  accent="fun"
                  active={tone === t.id}
                  onClick={() => pickTone(t.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Custom vocabulary — collapsible */}
        <Accordion
          label="Custom vocabulary"
          value={vocabulary.trim() ? vocabulary : "None"}
          sub="names, brands, jargon to keep right"
          open={vocabOpen}
          onToggle={() => setVocabOpen((o) => !o)}
        >
          <input
            type="text"
            value={vocabulary}
            onChange={(e) => setVocabulary(e.target.value)}
            placeholder="e.g. Priya, Acme Corp, RambleBabble, OAuth"
            autoComplete="off"
            className="w-full rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-3 text-[var(--text)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--primary)]"
          />
          <p className="mt-1.5 text-xs text-[var(--text-faint)]">
            We&apos;ll keep these spelled exactly right in your polished text.
          </p>
        </Accordion>
        </div>

            {/* Babble it — pinned at the bottom of the control rail */}
            <button
              onClick={() => runCleanup()}
              disabled={polishDisabled}
              className="flex w-full shrink-0 flex-col items-center justify-center gap-0.5 rounded-[16px] px-4 py-4 transition active:scale-[0.99]"
              style={
                polishDisabled
                  ? { background: "var(--surface3)", color: "var(--text-faint)" }
                  : selectedIsFun
                    ? {
                        backgroundImage:
                          "linear-gradient(120deg,var(--fun1),var(--fun2))",
                        color: "#fff",
                        boxShadow: "0 14px 34px -10px var(--fun-glow)",
                      }
                    : {
                        background: "var(--signal)",
                        color: "var(--signal-ink)",
                        boxShadow: "0 14px 34px -10px var(--glow2)",
                      }
              }
            >
              <span className="font-display text-[19px] font-bold">
                {cleaning ? "Working…" : "Babble it"}
              </span>
              <span className="text-xs font-semibold opacity-80">
                {selectedStyle?.label}
                {selectedTone ? ` · ${selectedTone.label}` : ""}
              </span>
            </button>
          </aside>

          {/* WORKSPACE: your words in, polished words out */}
          <main className="min-w-0 space-y-5">
            <section>
              <div className="mb-2 flex items-center justify-between">
                <Label>Your Ramble</Label>
                {inputText.trim() && (
                  <button
                    onClick={handleClear}
                    className="text-xs font-semibold text-[var(--text-dim)] underline-offset-2 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Your transcript appears here, or paste messy text to polish."
                rows={5}
                autoComplete="off"
                className="min-h-[140px] w-full resize-y rounded-[15px] border border-[var(--border)] bg-[var(--surface)] p-4 text-[17px] text-[var(--text)] outline-none transition placeholder:text-[var(--text-faint)] focus:border-[var(--primary)]"
              />
            </section>
            {error && (
          <p
            className="mt-5 rounded-[14px] border px-4 py-3 text-sm"
            style={{
              background: "var(--danger-soft)",
              borderColor: "var(--danger)",
              color: "var(--danger)",
            }}
          >
            {error}
          </p>
        )}

        {/* Loading */}
        {(transcribing || cleaning) && (
          <div className="mt-5 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-3">
              <span
                className="rb-spin inline-block h-5 w-5 rounded-full border-2 border-[var(--surface3)]"
                style={{ borderTopColor: "var(--primary)" }}
              />
              <span className="text-sm text-[var(--text-dim)]">
                {transcribing
                  ? "Listening closely… turning sound into text"
                  : selectedIsFun
                    ? "Babbling…"
                    : "Polishing your words…"}
              </span>
            </div>
            <div className="mt-4 h-1 overflow-hidden rounded-full bg-[var(--surface3)]">
              <div
                className="rb-loadbar h-full w-1/3 rounded-full"
                style={{ background: "var(--primary)" }}
              />
            </div>
          </div>
        )}

        {/* Result */}
        {cleaned && resultGroup && !cleaning && (
          <section className="rb-rise mt-6">
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
              <div className="flex min-w-0 items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-[var(--text-dim)]">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    background:
                      resultGroup === "fun" ? "var(--fun1)" : "var(--signal)",
                  }}
                />
                <span className="truncate">
                  {resultGroup === "fun" ? "Babbled" : "Polished"} ·{" "}
                  {resultLabel}
                  {resultTone ? ` · ${resultTone}` : ""}
                </span>
              </div>
              <button
                onClick={handleCopy}
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold text-[var(--primary-ink)]"
                style={{ background: "var(--primary)" }}
              >
                {copied ? "Copied ✓" : "Copy"}
              </button>
            </div>

            <div
              className="rounded-[18px] border p-5"
              style={{
                background: "var(--surface)",
                borderColor:
                  resultGroup === "fun" ? "var(--fun1)" : "var(--border)",
                boxShadow: "var(--shadow)",
              }}
            >
              {editing ? (
                <textarea
                  value={cleaned}
                  onChange={(e) => setCleaned(e.target.value)}
                  rows={8}
                  className="w-full resize-y rounded-[14px] border border-[var(--primary)] bg-[var(--bg-soft)] p-3 text-[17px] text-[var(--text)] outline-none"
                />
              ) : (
                <div className="whitespace-pre-wrap text-[17px] leading-[1.62] text-[var(--text)]">
                  {cleaned}
                </div>
              )}

              {keyPoints.length > 0 && (
                <div className="mt-5 rounded-[14px] bg-[var(--surface2)] p-4">
                  <div className="flex items-center justify-between">
                    <Label>Key points</Label>
                    <button
                      onClick={() =>
                        copyText(keyPoints.map((p) => `• ${p}`).join("\n"))
                      }
                      className="text-xs font-semibold text-[var(--text-dim)] hover:text-[var(--text)]"
                    >
                      Copy
                    </button>
                  </div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] text-[var(--text-dim)]">
                    {keyPoints.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}

              {followUps.length > 0 && (
                <div className="mt-3 rounded-[14px] bg-[var(--surface2)] p-4">
                  <div className="flex items-center justify-between">
                    <Label>Suggested follow-ups</Label>
                    <button
                      onClick={() =>
                        copyText(followUps.map((f) => `• ${f}`).join("\n"))
                      }
                      className="text-xs font-semibold text-[var(--text-dim)] hover:text-[var(--text)]"
                    >
                      Copy
                    </button>
                  </div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] text-[var(--text-dim)]">
                    {followUps.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={() => setShowRaw((s) => !s)}
                className="mt-4 text-xs font-semibold text-[var(--text-dim)] hover:text-[var(--text)]"
              >
                {showRaw ? "Hide raw transcript" : "View raw transcript"}
              </button>
              {showRaw && (
                <div className="mt-2 whitespace-pre-wrap rounded-[14px] bg-[var(--surface2)] p-3 text-sm text-[var(--text-faint)]">
                  {inputText}
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2.5">
              {resultGroup === "fun" && (
                <>
                  <GhostButton
                    accent="fun"
                    disabled={busy}
                    onClick={() =>
                      runCleanup(
                        "Make this even wilder, more over-the-top, and more exaggerated.",
                      )
                    }
                  >
                    Make It Wilder
                  </GhostButton>
                  <GhostButton
                    accent="fun"
                    disabled={busy}
                    onClick={() =>
                      runCleanup(
                        "Make this noticeably shorter, punchier, and tighter.",
                      )
                    }
                  >
                    Make It Shorter
                  </GhostButton>
                </>
              )}
              <GhostButton
                accent={resultGroup === "fun" ? "fun" : "brand"}
                disabled={busy}
                onClick={() => runCleanup()}
              >
                Try again
              </GhostButton>
              <GhostButton
                accent={resultGroup === "fun" ? "fun" : "brand"}
                onClick={handleClear}
              >
                Clear
              </GhostButton>
            </div>
          </section>
        )}

            {/* Empty output state */}
            {!cleaned && !transcribing && !cleaning && !error && (
              <div className="rounded-[18px] border border-dashed border-[var(--border-strong)] p-12 text-center text-sm text-[var(--text-faint)]">
                Pick a style, then hit Babble it. Your polished version shows up
                right here.
              </div>
            )}
          </main>
        </div>

        <footer className="mt-10 text-center text-xs text-[var(--text-faint)]">
          <p className="font-semibold text-[var(--text-dim)]">
            Useful enough to keep. Fun enough to share.
          </p>
          <p className="mt-1">Audio isn&apos;t stored. Your words stay yours.</p>
          <button
            onClick={onSignOut}
            className="mt-3 text-xs font-semibold text-[var(--text-dim)] underline-offset-2 hover:underline"
          >
            Sign out
          </button>
        </footer>
      </main>

      {/* The Babble button now lives in the sidebar control rail. */}

      {/* Floating Copy — always reachable while a result is on screen */}
      {cleaned && resultGroup && !cleaning && (
        <button
          onClick={handleCopy}
          className="fixed bottom-[96px] right-4 z-40 flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold shadow-xl"
          style={{ background: "var(--primary)", color: "var(--primary-ink)" }}
        >
          <CopyIcon />
          {copied ? "Copied" : "Copy"}
        </button>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full bg-[var(--surface3)] px-4 py-2 text-sm font-medium text-[var(--text)] shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function Accordion({
  label,
  value,
  sub,
  open,
  onToggle,
  children,
}: {
  label: string;
  value: string;
  sub?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-3">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left transition hover:border-[var(--border-strong)]"
      >
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-dim)]">
            {label}
          </div>
          <div className="truncate text-[15px] font-semibold text-[var(--text)]">
            {value}
          </div>
          {sub && (
            <div className="truncate text-xs text-[var(--text-faint)]">
              {sub}
            </div>
          )}
        </div>
        <span
          className="shrink-0 text-[var(--text-dim)] transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        >
          ⌄
        </span>
      </button>
      {open && <div className="mt-2.5">{children}</div>}
    </section>
  );
}

function TonePill({
  label,
  hint,
  active,
  onClick,
  accent = "brand",
}: {
  label: string;
  hint: string;
  active: boolean;
  onClick: () => void;
  accent?: "brand" | "fun";
}) {
  const activeStyle =
    accent === "fun"
      ? {
          background: "var(--fun1)",
          color: "#fff",
          boxShadow: "0 8px 20px -8px var(--fun-glow)",
        }
      : {
          background: "var(--primary)",
          color: "var(--primary-ink)",
          boxShadow: "0 8px 20px -8px var(--glow1)",
        };
  return (
    <button
      onClick={onClick}
      title={hint}
      className="rounded-full px-4 py-2.5 text-[15px] font-semibold transition"
      style={
        active
          ? activeStyle
          : { background: "var(--surface2)", color: "var(--text-dim)" }
      }
    >
      {label}
    </button>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[15px] font-semibold uppercase tracking-[0.06em] text-[var(--text-dim)]">
      {children}
    </span>
  );
}

function OptionCard({
  label,
  active,
  onClick,
  dotColor,
  fun = false,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  dotColor?: string;
  fun?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex min-h-[58px] items-center gap-2.5 rounded-[15px] border px-3.5 py-3 text-left text-[15.5px] font-semibold transition"
      style={{
        background: active
          ? fun
            ? "var(--fun-soft)"
            : "var(--primary-soft)"
          : "var(--surface2)",
        borderColor: active
          ? fun
            ? "var(--fun1)"
            : "var(--primary)"
          : "var(--border)",
        boxShadow: active
          ? `inset 0 0 0 1px ${fun ? "var(--fun1)" : "var(--primary)"}`
          : "none",
        color: "var(--text)",
      }}
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={
          fun
            ? {
                backgroundImage:
                  "linear-gradient(135deg,var(--fun1),var(--fun2))",
              }
            : { background: dotColor }
        }
      />
      {label}
    </button>
  );
}

function GhostButton({
  children,
  onClick,
  disabled,
  accent = "brand",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  accent?: "brand" | "fun";
}) {
  const tone =
    accent === "fun"
      ? {
          borderColor: "var(--fun1)",
          background: "var(--fun-soft)",
          color: "var(--fun1)",
        }
      : {
          borderColor: "var(--primary)",
          background: "var(--primary-soft)",
          color: "var(--text)",
        };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={tone}
      className="rounded-xl border-2 px-4 py-2.5 text-sm font-bold transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function CopyIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function MicIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}
