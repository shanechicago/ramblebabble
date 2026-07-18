"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { BabbleWave } from "./BabbleText";
import { ACCENT, ACCENT_ON_CANVAS, CANVAS, C_INK, C_DIM } from "@/lib/brand";

// Label sitting ON the violet accent FILL. White fails on violet (4.36), so the
// label is the same near-black the brand button uses: #070809 clears AA at 4.60.
const ON_ACCENT = "#070809";
// Accent as TEXT / ICONS on the black canvas (#070809). The violet accent clears
// 4.5 here (4.60), so small accent labels pass, not just large text and graphics.
const ACCENT_TEXT = ACCENT_ON_CANVAS;
// C_LINE is a decorative hairline (1.36:1). Anything that OUTLINES an
// interactive control needs 3:1, because the fill alone does not identify it.
const C_LINE_STRONG = "#66676c";
// Fixed secondary, used only for tone-tag outlines. Not the accent.
const COBALT = "#ff5a2a";
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

function formatOf(r: SavedRamble): string {
  return r.output_label || r.output_type || "Other";
}

// Which time bucket a ramble falls into, so the archive reads as an organized
// timeline instead of one endless pile. Order matters (newest bucket first).
const GROUP_ORDER = [
  "Today",
  "Yesterday",
  "This week",
  "This month",
  "Older",
] as const;

function dateBucket(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return "This week";
  if (days < 30) return "This month";
  return "Older";
}

export default function MyRambles({
  onBack,
  onReopen,
}: {
  onBack: () => void;
  onReopen: (r: SavedRamble) => void;
}) {
  const [rambles, setRambles] = useState<SavedRamble[] | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

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

  // Feeds the cursor spotlight above. Same custom properties as the workspace,
  // so the halo does not jump when you move between screens.
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const root = document.documentElement;
      root.style.setProperty("--mx", `${e.clientX}px`);
      root.style.setProperty("--my", `${e.clientY}px`);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const remove = useCallback(async (id: string) => {
    setRambles((prev) => prev?.filter((r) => r.id !== id) ?? prev);
    await getSupabase().from("rambles").delete().eq("id", id);
  }, []);

  const copy = useCallback((text: string) => {
    void navigator.clipboard.writeText(text);
  }, []);

  const toggleGroup = useCallback((g: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  }, []);

  // The distinct formats present, most-used first, for the filter chips.
  const formats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rambles ?? []) {
      const key = formatOf(r);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts, ([key, count]) => ({ key, count })).sort(
      (a, b) => b.count - a.count,
    );
  }, [rambles]);

  // Search (title/output/transcript/tone) + format filter. Order is preserved
  // from the newest-first fetch.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rambles ?? []).filter((r) => {
      if (typeFilter !== "all" && formatOf(r) !== typeFilter) return false;
      if (!q) return true;
      const hay =
        `${r.cleaned}\n${r.transcript}\n${r.output_label ?? ""}\n${r.output_type ?? ""}\n${r.tone ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rambles, query, typeFilter]);

  const groups = useMemo(() => {
    const g: Record<string, SavedRamble[]> = {};
    for (const r of filtered) {
      const b = dateBucket(r.created_at);
      (g[b] ??= []).push(r);
    }
    return g;
  }, [filtered]);

  const hasRambles = rambles !== null && rambles.length > 0;
  const isSearching = query.trim() !== "" || typeFilter !== "all";

  return (
    <div style={{ background: CANVAS, color: C_INK, minHeight: "100vh" }}>
      {/* Film grain and the cursor spotlight: the editorial signature belongs on
          every screen, not just the workspace. */}
      <div aria-hidden className="rb-grain" />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(440px circle at var(--mx,50%) var(--my,28%), rgba(123,92,255,0.20), transparent 64%)",
        }}
      />

      {/* Header */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-7 py-3.5 backdrop-blur"
        style={{ borderBottom: `1px solid ${C_LINE}`, background: "rgba(7,8,9,0.72)" }}
      >
        <div className="flex items-center gap-2 text-[24px]">
          <span className="font-bric font-extrabold" style={{ letterSpacing: "-0.02em" }}>
            Ramble
          </span>
          <span className="inline-block" style={{ transform: "rotate(-7deg)" }}>
            <BabbleWave style={{ fontSize: "1.75em" }} />
          </span>
        </div>
        <div className="flex items-center gap-5">
          <button
            onClick={onBack}
            className="font-mono-label text-[12px] uppercase tracking-[0.14em]"
            style={{ color: C_DIM }}
          >
            Home
          </button>
          <span
            className="font-mono-label text-[12px] uppercase tracking-[0.14em]"
            style={{ color: ACCENT_TEXT }}
          >
            My Rambles
          </span>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-[1000px] px-7 py-10">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <h1
            className="font-bric font-bold leading-[0.9]"
            style={{ fontSize: "clamp(40px,6vw,80px)", letterSpacing: "-0.05em" }}
          >
            The{" "}
            <span className="font-serif-i font-normal" style={{ color: ACCENT_TEXT }}>
              archive
            </span>
          </h1>
          {/* This screen's primary action, so it carries the accent — but NOT
              the brand gradient. That belongs to the wordmark and to Babble it,
              and to nothing else. */}
          <button
            onClick={onBack}
            className="group flex items-center gap-2 px-5 py-3 text-[16px] font-bold transition"
            style={{ background: ACCENT, color: ON_ACCENT }}
          >
            New ramble{" "}
            <span className="transition-all group-hover:ml-1" aria-hidden>
              &rarr;
            </span>
          </button>
        </div>

        {/* Search + format filters — only once there's something to sift. */}
        {hasRambles && (
          <div className="mb-5">
            <div className="relative flex items-center">
              <svg
                className="pointer-events-none absolute left-3.5"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke={C_DIM}
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your rambles by word or phrase..."
                className="w-full bg-transparent py-3 pl-11 pr-20 text-[16px] outline-none transition placeholder:text-[#7b828c] focus:border-[#7b5cff]"
                style={{ border: `1px solid ${C_LINE_STRONG}`, color: C_INK }}
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="font-mono-label absolute right-3 text-[11px] font-bold uppercase tracking-[0.12em]"
                  style={{ color: ACCENT_TEXT }}
                >
                  Clear
                </button>
              )}
            </div>
            {formats.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-2">
                <FilterChip
                  active={typeFilter === "all"}
                  onClick={() => setTypeFilter("all")}
                >
                  All <Count active={typeFilter === "all"}>{rambles!.length}</Count>
                </FilterChip>
                {formats.map((f) => (
                  <FilterChip
                    key={f.key}
                    active={typeFilter === f.key}
                    onClick={() => setTypeFilter(f.key)}
                  >
                    {f.key} <Count active={typeFilter === f.key}>{f.count}</Count>
                  </FilterChip>
                ))}
              </div>
            )}
          </div>
        )}

        <div
          className="font-mono-label flex items-center justify-between pb-3 text-[11px] uppercase tracking-[0.16em]"
          style={{ color: C_DIM, borderBottom: `1px solid ${C_LINE}` }}
        >
          <span>
            {isSearching
              ? `${filtered.length} of ${rambles?.length ?? 0} shown`
              : `${rambles?.length ?? 0} saved / reopen one to keep refining`}
          </span>
        </div>

        {rambles === null && (
          <p className="font-mono-label mt-6 text-[12px] uppercase tracking-[0.14em]" style={{ color: C_DIM }}>
            Loading...
          </p>
        )}

        {rambles !== null && rambles.length === 0 && (
          <div className="mt-16 flex flex-col items-center text-center">
            <span className="font-serif-i text-[56px]" style={{ color: ACCENT_TEXT }}>
              All clear.
            </span>
            <button
              onClick={onBack}
              className="mt-5 px-5 py-3 text-[16px] font-bold"
              style={{ background: ACCENT, color: ON_ACCENT }}
            >
              Refine your first ramble
            </button>
          </div>
        )}

        {hasRambles && filtered.length === 0 && (
          <p
            className="mt-10 text-center text-[16px]"
            style={{ color: C_DIM }}
          >
            No rambles match that. Try a different word or clear the filter.
          </p>
        )}

        {/* Grouped, collapsible timeline. */}
        {GROUP_ORDER.filter((g) => groups[g]?.length).map((g) => {
          const isCollapsed = collapsed.has(g);
          return (
            <section key={g} className="mt-6">
              <button
                onClick={() => toggleGroup(g)}
                className="font-mono-label flex w-full items-center gap-2 py-2 text-[11px] font-bold uppercase tracking-[0.16em]"
                style={{ color: C_DIM }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={ACCENT_TEXT}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                  style={{
                    transform: isCollapsed ? "rotate(-90deg)" : "none",
                    transition: "transform 0.15s",
                  }}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
                <span style={{ color: C_INK }}>{g}</span>
                <span style={{ color: ACCENT_TEXT }}>{groups[g].length}</span>
              </button>
              {!isCollapsed && (
                <div>
                  {groups[g].map((r) => (
                    <RambleRow
                      key={r.id}
                      r={r}
                      onReopen={onReopen}
                      onCopy={copy}
                      onRemove={remove}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </main>
    </div>
  );
}

function RambleRow({
  r,
  onReopen,
  onCopy,
  onRemove,
}: {
  r: SavedRamble;
  onReopen: (r: SavedRamble) => void;
  onCopy: (text: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div
      className="flex flex-col gap-3 py-4 transition-all sm:grid sm:items-start sm:gap-4 sm:hover:pl-[18px]"
      style={{
        gridTemplateColumns: "1fr auto",
        borderBottom: `1px solid ${C_LINE}`,
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "rgba(243,245,247,0.03)")
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div className="min-w-0">
        <button
          onClick={() => onReopen(r)}
          className="block text-left text-[17px] font-medium transition"
          style={{ color: C_INK }}
          onMouseEnter={(e) => (e.currentTarget.style.color = ACCENT_TEXT)}
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
        <p className="mt-1.5 truncate text-[16px]" style={{ color: C_DIM }}>
          {r.cleaned.replace(/\n+/g, " ")}
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <Tag color={ACCENT_TEXT}>{r.output_label || r.output_type}</Tag>
          {r.tone && <Tag color={COBALT}>{r.tone}</Tag>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
        <button
          onClick={() => onReopen(r)}
          className="font-mono-label px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em]"
          style={{ background: ACCENT, color: ON_ACCENT }}
        >
          Open
        </button>
        <button
          onClick={() => onCopy(r.cleaned)}
          className="font-mono-label px-3 py-1.5 text-[11px] uppercase tracking-[0.1em]"
          style={{ background: "#e9ebf0", color: "#14161b" }}
        >
          Copy
        </button>
        <button
          onClick={() => onRemove(r.id)}
          className="font-mono-label px-3 py-1.5 text-[11px] uppercase tracking-[0.1em]"
          style={{ background: "#e9ebf0", color: "#14161b" }}
        >
          Del
        </button>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="font-mono-label flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] transition"
      style={
        active
          ? { background: ACCENT, color: ON_ACCENT }
          : { border: `1px solid ${C_LINE_STRONG}`, color: C_DIM }
      }
    >
      {children}
    </button>
  );
}

function Count({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span
      className="text-[10px]"
      style={{ color: active ? "rgba(7,8,9,0.72)" : "#5d646c" }}
    >
      {children}
    </span>
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
