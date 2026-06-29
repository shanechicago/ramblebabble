"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { usernameToEmail } from "@/lib/auth";

const GRADIENT = "linear-gradient(95deg,#7b5cff,#ff4d9d 55%,#ff6f61)";
const VIOLET = "#7b5cff";

// Editorial palette (de-muted per Shane: void black, clean bright mist gray,
// true white, no bone/cream).
const CANVAS = "#0b0c0f";
const CANVAS_INK = "#f3f5f7";
const CANVAS_DIM = "#9097a2";
const PANEL = "#e9ebf0";
const INK = "#14161b";
const INK_DIM = "#565d63";

const HERO_WORDS = [
  "refined",
  "ridiculous",
  "sendable",
  "sharper",
  "unhinged",
  "poetic",
];

const MARQUEE =
  "EMAIL · TALL TALE · RAP VERSE · SUMMARY · SPICY TEXT · AI PROMPT · MEETING NOTES · POEM · CONSPIRACY THEORY · MOVIE TRAILER · TO DO LIST · HAIKU · BREAKING NEWS · ";

export default function AuthScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hw, setHw] = useState(0);
  const [remember, setRemember] = useState(true);

  const comingSoon = (provider: string) =>
    setError(`${provider} sign-in is coming soon. Make a username for now.`);

  useEffect(() => {
    const id = setInterval(
      () => setHw((h) => (h + 1) % HERO_WORDS.length),
      2200,
    );
    return () => clearInterval(id);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const u = username.trim();
    if (u.length < 3) return setError("Username must be at least 3 characters.");
    if (password.length < 4)
      return setError("Password must be at least 4 characters.");

    setLoading(true);
    const supabase = getSupabase();
    try {
      if (mode === "signup") {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: u, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Couldn't create the account.");
          setLoading(false);
          return;
        }
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(u),
        password,
      });
      if (signInError) {
        setError(
          mode === "signin"
            ? "Wrong username or password."
            : "Account made, but sign-in failed. Try signing in.",
        );
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  };

  return (
    <div
      className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]"
      style={{ background: CANVAS }}
    >
      {/* LEFT: void-black canvas */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden px-[60px] py-[52px] lg:flex"
        style={{
          background: CANVAS,
          color: CANVAS_INK,
          borderRight: "1px solid rgba(243,245,247,0.13)",
        }}
      >
        <Wordmark inkColor={CANVAS_INK} />

        <div className="relative z-10 max-w-xl">
          <div
            className="font-mono-label text-[12px] uppercase tracking-[0.22em]"
            style={{ color: VIOLET }}
          >
            [ the thought refinery ]
          </div>
          <h1
            className="font-bric mt-6 font-extrabold leading-[0.98]"
            style={{ fontSize: "clamp(40px,5vw,66px)", letterSpacing: "-0.04em" }}
          >
            Say it messy.
            <br />
            Get it{" "}
            <span
              className="font-serif-i"
              style={{
                backgroundImage: GRADIENT,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              {HERO_WORDS[hw]}
            </span>
            .
          </h1>
          <p
            className="mt-6 max-w-md text-[16px] leading-[1.62]"
            style={{ color: CANVAS_DIM }}
          >
            Dump in the voice-to-text chaos, the almost-genius ideas, and the
            texts you probably shouldn&apos;t send yet. Watch the mess resolve
            into clean messages, useful notes, AI prompts, or spicy little
            masterpieces with a personality disorder.
          </p>
        </div>

        <div
          className="relative z-10 overflow-hidden"
          style={{
            maskImage:
              "linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent)",
            WebkitMaskImage:
              "linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent)",
          }}
        >
          <div
            className="rb-marquee font-mono-label text-[12px] uppercase tracking-[0.18em]"
            style={{ color: "#5d646c" }}
          >
            {MARQUEE}
            {MARQUEE}
          </div>
        </div>
      </div>

      {/* RIGHT: clean mist-gray panel */}
      <div
        className="flex items-center justify-center px-7 py-12"
        style={{ background: PANEL, color: INK }}
      >
        <form onSubmit={submit} className="w-full max-w-[380px]">
          <div className="mb-8 lg:hidden">
            <Wordmark inkColor={INK} />
          </div>

          <div
            className="font-mono-label text-[11px] uppercase tracking-[0.2em]"
            style={{ color: INK_DIM }}
          >
            enter the refinery
          </div>

          <div
            className="mt-3 inline-flex"
            style={{ border: "1px solid rgba(19,22,26,0.34)" }}
          >
            <ToggleTab
              active={mode === "signin"}
              onClick={() => {
                setMode("signin");
                setError(null);
              }}
            >
              Sign in
            </ToggleTab>
            <ToggleTab
              active={mode === "signup"}
              onClick={() => {
                setMode("signup");
                setError(null);
              }}
            >
              Create
            </ToggleTab>
          </div>

          <h2
            className="font-bric mt-6 text-[30px] font-bold"
            style={{ letterSpacing: "-0.02em" }}
          >
            {mode === "signin" ? "Welcome back" : "Make an account"}
          </h2>
          <p className="mt-1.5 text-[14px]" style={{ color: INK_DIM }}>
            {mode === "signin"
              ? "No judgment. No blank page. Just better words."
              : "Set it up once, then ramble forever."}
          </p>

          <label
            className="font-mono-label mt-8 block text-[11px] uppercase tracking-[0.16em]"
            style={{ color: INK_DIM }}
          >
            Username
          </label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="yourname"
            autoComplete="username"
            autoCapitalize="none"
            className="mt-2 w-full rounded-none border-0 border-b border-[rgba(19,22,26,0.32)] bg-transparent pb-2 pt-1 text-[16px] text-[#14161b] outline-none transition placeholder:text-[#9094a0] focus:border-[#7b5cff]"
          />

          <label
            className="font-mono-label mt-6 block text-[11px] uppercase tracking-[0.16em]"
            style={{ color: INK_DIM }}
          >
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="at least eight characters"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            className="mt-2 w-full rounded-none border-0 border-b border-[rgba(19,22,26,0.32)] bg-transparent pb-2 pt-1 text-[16px] text-[#14161b] outline-none transition placeholder:text-[#9094a0] focus:border-[#7b5cff]"
          />

          <div className="mt-4 flex items-center justify-between">
            <label
              className="flex cursor-pointer select-none items-center gap-2 text-[13px]"
              style={{ color: INK_DIM }}
            >
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 accent-[#7b5cff]"
              />
              Stay signed in
            </label>
            {mode === "signin" && (
              <button
                type="button"
                onClick={() =>
                  setError(
                    "Password reset is coming soon. For now your browser can save it, or make a new username.",
                  )
                }
                className="text-[13px] font-semibold"
                style={{ color: VIOLET }}
              >
                Forgot password?
              </button>
            )}
          </div>

          {error && (
            <p className="mt-4 text-[14px]" style={{ color: "#c8312f" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-8 flex w-full items-center justify-center gap-2 px-4 py-3.5 text-[15px] font-semibold text-white transition hover:brightness-110 active:translate-y-px disabled:opacity-60"
            style={{
              backgroundImage: GRADIENT,
              boxShadow: "0 12px 30px -12px rgba(123,92,255,0.75)",
            }}
          >
            {loading ? (
              "One moment..."
            ) : (
              <>
                {mode === "signin"
                  ? "Sign in and start rambling"
                  : "Create account"}
                <span aria-hidden>&rarr;</span>
              </>
            )}
          </button>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1" style={{ background: "rgba(19,22,26,0.18)" }} />
            <span className="font-mono-label text-[11px]" style={{ color: INK_DIM }}>
              or
            </span>
            <span className="h-px flex-1" style={{ background: "rgba(19,22,26,0.18)" }} />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => comingSoon("Google")}
              className="flex items-center justify-center gap-2 px-3 py-3 text-[13px] font-semibold transition hover:bg-[#14161b] hover:text-[#e9ebf0]"
              style={{ border: "1px solid rgba(19,22,26,0.34)", color: INK }}
            >
              <span className="font-bric font-bold">G</span>
              Google
            </button>
            <button
              type="button"
              onClick={() => comingSoon("Apple")}
              className="flex items-center justify-center gap-2 px-3 py-3 text-[13px] font-semibold transition hover:bg-[#14161b] hover:text-[#e9ebf0]"
              style={{ border: "1px solid rgba(19,22,26,0.34)", color: INK }}
            >
              <span aria-hidden style={{ fontSize: 16, lineHeight: 1 }}>
                &#63743;
              </span>
              Apple
            </button>
            <button
              type="button"
              onClick={() => comingSoon("Microsoft")}
              className="flex items-center justify-center gap-2 px-3 py-3 text-[13px] font-semibold transition hover:bg-[#14161b] hover:text-[#e9ebf0]"
              style={{ border: "1px solid rgba(19,22,26,0.34)", color: INK }}
            >
              <span
                aria-hidden
                className="inline-grid"
                style={{
                  gridTemplateColumns: "6px 6px",
                  gridTemplateRows: "6px 6px",
                  gap: 1.5,
                }}
              >
                <span style={{ background: "#f25022" }} />
                <span style={{ background: "#7fba00" }} />
                <span style={{ background: "#00a4ef" }} />
                <span style={{ background: "#ffb900" }} />
              </span>
              Microsoft
            </button>
          </div>

          <p
            className="font-mono-label mt-7 text-center text-[11px] uppercase tracking-[0.14em]"
            style={{ color: "#9094a0" }}
          >
            No setup. No clutter. Just ramble.
          </p>
        </form>
      </div>
    </div>
  );
}

function ToggleTab({
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
      type="button"
      onClick={onClick}
      className="font-mono-label px-6 py-2 text-[12px] uppercase tracking-[0.12em] transition"
      style={
        active
          ? { background: INK, color: PANEL }
          : { background: "transparent", color: INK_DIM }
      }
    >
      {children}
    </button>
  );
}

function Wordmark({ inkColor }: { inkColor: string }) {
  return (
    <div
      className="relative z-10 flex items-center gap-2 text-[28px]"
      style={{ color: inkColor }}
    >
      <span className="font-bric font-extrabold" style={{ letterSpacing: "-0.02em" }}>
        Ramble
      </span>
      <span className="inline-block" style={{ transform: "rotate(-7deg)" }}>
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
