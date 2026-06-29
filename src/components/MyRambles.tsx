"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";

const GRADIENT = "linear-gradient(95deg,#7b5cff,#ff4d9d 55%,#ff6f61)";
const ACCENT = "#7b5cff";
const COBALT = "#ff5a2a";
const CANVAS = "#0b0c0f";
const C_INK = "#f3f5f7";
const C_DIM = "#9097a2";
const C_LINE = "rgba(243,245,247,0.13)";

export interface SavedRamble {
  id: string;
  created_at: string;
  transcript: string;
  output_type: string;
  output_label: string | null;
  tone: string | null;
  cleaned: string;
  key_points: string[];
  follow_ups: string[];
  is_fun: boolean;
}

function relDate(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function titleOf(r: SavedRamble): string {
  const first = (r.cleaned || r.transcript || "")
    .replace(/^subject:\s*/i, "")
    .split(/[.\n]/)[0]
    .trim();
  return first.length > 64 ? first.slice(0, 64) + "..." : first || "Untitled";
}

export default function MyRambles({
  onBack,
  onReopen,
}: {
  onBack: () => void;
  onReopen: (r: SavedRamble) => void;
}) {
  const [rambles, setRambles] = useState<SavedRamble[] | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await getSupabase()
        .from("rambles")
        .select("*")
        .order("created_at", { ascending: false });
      if (active) setRambles((data as SavedRamble[]) || []);
    })();
    return () => {
      active = false;
    };
  }, []);

  const remove = useCallback(async (id: string) => {
    setRambles((prev) => prev?.filter((r) => r.id !== id) ?? prev);
    await getSupabase().from("rambles").delete().eq("id", id);
  }, []);

  const copy = useCallback((text: string) => {
    void navigator.clipboard.writeText(text);
  }, []);

  return (
    <div style={{ background: CANVAS, color: C_INK, minHeight: "100vh" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-7 py-3.5 backdrop-blur"
        style={{ borderBottom: `1px solid ${C_LINE}`, background: "rgba(11,12,15,0.72)" }}
      >
        <div className="flex items-center gap-2 text-[24px]">
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
        <div className="flex items-center gap-5">
          <button
            onClick={onBack}
            className="font-mono-label text-[12px] uppercase tracking-[0.14em]"
            style={{ color: C_DIM }}
          >
            Refinery
          </button>
          <span
            className="font-mono-label text-[12px] uppercase tracking-[0.14em]"
            style={{ color: ACCENT }}
          >
            Archive
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1000px] px-7 py-10">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <h1
            className="font-bric font-extrabold leading-[0.95]"
            style={{ fontSize: "clamp(36px,4.6vw,58px)", letterSpacing: "-0.04em" }}
          >
            The{" "}
            <span className="font-serif-i" style={{ color: ACCENT }}>
              archive
            </span>
          </h1>
          <button
            onClick={onBack}
            className="group flex items-center gap-2 px-5 py-3 text-[14px] font-semibold text-white"
            style={{
              backgroundImage: GRADIENT,
              boxShadow: "0 12px 30px -12px rgba(123,92,255,0.7)",
            }}
          >
            New ramble{" "}
            <span className="transition-all group-hover:ml-1" aria-hidden>
              &rarr;
            </span>
          </button>
        </div>

        <div
          className="font-mono-label flex items-center justify-between pb-3 text-[11px] uppercase tracking-[0.16em]"
          style={{ color: C_DIM, borderBottom: `1px solid ${C_LINE}` }}
        >
          <span>
            {rambles?.length ?? 0} saved / reopen one to keep refining
          </span>
        </div>

        {rambles === null && (
          <p className="font-mono-label mt-6 text-[12px] uppercase tracking-[0.14em]" style={{ color: C_DIM }}>
            Loading...
          </p>
        )}

        {rambles !== null && rambles.length === 0 && (
          <div className="mt-16 flex flex-col items-center text-center">
            <span className="font-serif-i text-[56px]" style={{ color: ACCENT }}>
              All clear.
            </span>
            <button
              onClick={onBack}
              className="mt-5 px-5 py-3 text-[14px] font-semibold text-white"
              style={{ backgroundImage: GRADIENT }}
            >
              Refine your first ramble
            </button>
          </div>
        )}

        <div>
          {rambles?.map((r, i) => (
            <div
              key={r.id}
              className="grid items-start gap-4 py-5 transition-all hover:pl-[18px]"
              style={{
                gridTemplateColumns: "48px 1fr auto",
                borderBottom: `1px solid ${C_LINE}`,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(243,245,247,0.03)")
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span
                className="font-mono-label pt-1 text-[13px]"
                style={{ color: "#5d646c" }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>

              <div className="min-w-0">
                <button
                  onClick={() => onReopen(r)}
                  className="block text-left text-[19px] font-medium transition"
                  style={{ color: C_INK }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = ACCENT)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = C_INK)}
                >
                  {titleOf(r)}
                </button>
                <span
                  className="font-mono-label text-[11px] uppercase tracking-[0.12em]"
                  style={{ color: "#5d646c" }}
                >
                  {relDate(r.created_at)}
                </span>
                <p
                  className="mt-1.5 truncate text-[14px]"
                  style={{ color: C_DIM }}
                >
                  {r.cleaned.replace(/\n+/g, " ")}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <Tag color={ACCENT}>{r.output_label || r.output_type}</Tag>
                  {r.tone && <Tag color={COBALT}>{r.tone}</Tag>}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => onReopen(r)}
                  className="font-mono-label px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-white"
                  style={{ background: ACCENT }}
                >
                  Open
                </button>
                <button
                  onClick={() => copy(r.cleaned)}
                  className="font-mono-label px-3 py-1.5 text-[11px] uppercase tracking-[0.1em]"
                  style={{ background: "#e9ebf0", color: "#14161b" }}
                >
                  Copy
                </button>
                <button
                  onClick={() => remove(r.id)}
                  className="font-mono-label px-3 py-1.5 text-[11px] uppercase tracking-[0.1em]"
                  style={{ background: "#e9ebf0", color: "#14161b" }}
                >
                  Del
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function Tag({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="font-mono-label px-2 py-0.5 text-[10px] uppercase tracking-[0.1em]"
      style={{ border: `1px solid ${color}`, color }}
    >
      {children}
    </span>
  );
}
