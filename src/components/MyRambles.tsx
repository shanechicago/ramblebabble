"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";

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
  const then = new Date(iso).getTime();
  const days = Math.floor((Date.now() - then) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function MyRambles({
  onBack,
  onReopen,
}: {
  onBack: () => void;
  onReopen: (r: SavedRamble) => void;
}) {
  const [rambles, setRambles] = useState<SavedRamble[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await getSupabase()
        .from("rambles")
        .select("*")
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) {
        setError("Couldn't load your rambles.");
        setRambles([]);
      } else {
        setRambles((data as SavedRamble[]) || []);
      }
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
    <main className="mx-auto w-full max-w-4xl px-5 pb-20 pt-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-display text-[28px] font-bold">My Rambles</h1>
        <button
          onClick={onBack}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface2)] px-4 py-2.5 text-sm font-semibold transition hover:border-[var(--border-strong)]"
        >
          Back to record
        </button>
      </div>

      {error && (
        <p className="text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      {rambles === null && (
        <p className="text-sm text-[var(--text-dim)]">Loading...</p>
      )}

      {rambles !== null && rambles.length === 0 && (
        <div className="rb-rise mt-10 flex flex-col items-center text-center">
          <div
            className="rb-floaty flex h-20 w-20 items-center justify-center rounded-full"
            style={{ background: "var(--primary-soft)" }}
          >
            <span style={{ color: "var(--primary)" }}>◉</span>
          </div>
          <p className="font-display mt-4 text-xl font-bold">No rambles yet</p>
          <p className="mt-1 max-w-xs text-sm text-[var(--text-dim)]">
            Everything you polish or babble shows up here, on every device.
          </p>
          <button
            onClick={onBack}
            className="mt-5 rounded-[14px] px-5 py-3 text-sm font-bold text-[var(--primary-ink)]"
            style={{ background: "var(--primary)" }}
          >
            Record your first ramble
          </button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {rambles?.map((r) => (
          <div
            key={r.id}
            className="rb-rise rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <div className="mb-2 flex items-center gap-2 text-xs">
              <span
                className="rounded-full px-2.5 py-1 font-semibold"
                style={{
                  background: r.is_fun ? "var(--fun-soft)" : "var(--primary-soft)",
                  color: r.is_fun ? "var(--fun1)" : "var(--primary)",
                }}
              >
                {r.output_label || r.output_type}
              </span>
              {r.tone && (
                <span className="rounded-full bg-[var(--surface3)] px-2.5 py-1 font-semibold text-[var(--text-dim)]">
                  {r.tone}
                </span>
              )}
              <span className="ml-auto text-[var(--text-faint)]">
                {relDate(r.created_at)}
              </span>
            </div>

            <button
              onClick={() => onReopen(r)}
              className="block w-full text-left text-[15px] text-[var(--text)] transition hover:text-[var(--primary)]"
            >
              {r.cleaned.replace(/\n+/g, " ").slice(0, 110)}
              {r.cleaned.length > 110 ? "..." : ""}
            </button>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => onReopen(r)}
                className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface2)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition hover:brightness-110"
              >
                Reopen
              </button>
              <button
                onClick={() => copy(r.cleaned)}
                className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface2)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition hover:brightness-110"
              >
                Copy
              </button>
              <button
                onClick={() => remove(r.id)}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold transition hover:border-[var(--danger)]"
                style={{ color: "var(--danger)" }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
