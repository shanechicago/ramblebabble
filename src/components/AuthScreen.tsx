"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { usernameToEmail } from "@/lib/auth";

const PRIMARY_GRADIENT = "linear-gradient(95deg,#7b5cff,#ff4d9d 55%,#ff6f61)";

export default function AuthScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        return;
      }
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  };

  return (
    <div
      data-theme="dark"
      data-accent="coral"
      className="grid min-h-screen w-full grid-cols-1 bg-[var(--bg)] text-[var(--text)] lg:grid-cols-[1.05fr_0.95fr]"
    >
      {/* Left: brand / story */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden border-r border-[var(--border)] px-[60px] py-[56px] lg:flex"
        style={{
          backgroundImage:
            "linear-gradient(150deg,rgba(123,92,255,0.16),rgba(255,77,157,0.1) 50%,rgba(255,111,97,0.12))",
        }}
      >
        <div
          aria-hidden
          className="rb-floaty pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full blur-3xl"
          style={{ background: "rgba(123,92,255,0.4)" }}
        />
        <div
          aria-hidden
          className="rb-floaty pointer-events-none absolute -bottom-40 right-0 h-96 w-96 rounded-full blur-3xl"
          style={{ background: "rgba(255,77,157,0.25)", animationDelay: "-6s" }}
        />

        <Wordmark size={30} />

        <div className="relative z-10 max-w-lg">
          <h1 className="font-display text-[42px] font-bold leading-[1.05] sm:text-[52px]">
            Ramble in.
            <br />
            Brilliance out...
            <br />
            <WackyText />
          </h1>
          <p className="mt-5 max-w-md text-[17px] leading-[1.6] text-[var(--text-dim)]">
            Dump in the voice-to-text chaos, the almost-genius ideas, and the
            texts you probably shouldn&apos;t send yet. Watch the mess turn into
            clean messages, useful notes, AI prompts, or spicy little
            masterpieces with a personality disorder.
          </p>

          <ul className="mt-7 space-y-3">
            <Bullet color="#7b5cff">
              Voice-to-text chaos in, polished words out
            </Bullet>
            <Bullet color="#ff4d9d">
              Stack format, tone, character, and accent
            </Bullet>
            <Bullet color="#ff6f61">
              Clean messages, work notes, AI prompts, or chaos
            </Bullet>
          </ul>
        </div>

        <p className="relative z-10 text-[13px] text-[var(--text-faint)]">
          No setup. No clutter. Just ramble.
        </p>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center px-6 py-12">
        <form onSubmit={submit} className="w-full max-w-[380px]">
          <div className="mb-7 lg:hidden">
            <Wordmark size={26} />
          </div>

          <div className="mb-7 inline-flex rounded-[13px] bg-[var(--surface2)] p-1">
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
              Create account
            </ToggleTab>
          </div>

          <h2 className="font-display text-[30px] font-bold">
            {mode === "signin" ? "Welcome back" : "Let's get you set up"}
          </h2>
          <p className="mt-1.5 text-[15px] text-[var(--text-dim)]">
            No judgment. No blank page. Just better words.
          </p>

          <label className="mt-7 block text-[13px] font-semibold text-[var(--text-dim)]">
            Username
          </label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="yourname"
            autoComplete="username"
            autoCapitalize="none"
            className="mt-2 w-full rounded-[13px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 text-[15px] text-[var(--text)] outline-none transition placeholder:text-[var(--text-faint)] focus:border-[var(--primary)]"
          />

          <label className="mt-5 block text-[13px] font-semibold text-[var(--text-dim)]">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="at least eight characters"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            className="mt-2 w-full rounded-[13px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 text-[15px] text-[var(--text)] outline-none transition placeholder:text-[var(--text-faint)] focus:border-[var(--primary)]"
          />

          {error && (
            <p className="mt-3 text-[14px]" style={{ color: "var(--danger)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-[13px] px-4 py-3.5 text-[15px] font-semibold text-white transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
            style={{
              backgroundImage: PRIMARY_GRADIENT,
              boxShadow: "0 12px 34px -10px rgba(123,92,255,0.8)",
            }}
          >
            {loading ? (
              "One moment..."
            ) : (
              <>
                <MicGlyph />
                {mode === "signin"
                  ? "Sign in and start rambling"
                  : "Create account and start rambling"}
              </>
            )}
          </button>

          <p className="mt-6 text-center text-[12px] text-[var(--text-faint)]">
            By continuing you agree to talk a little messy.
          </p>
        </form>
      </div>
    </div>
  );
}

function WackyText() {
  const words = ["sometimes", "wildly", "wacky."];
  return (
    <span className="rb-wacky font-babble" style={{ fontSize: "1.18em" }}>
      {words.map((w, i) => (
        <span
          key={w}
          className="rb-wacky-word"
          style={{
            animationDelay: `${0.5 + i * 0.22}s`,
            marginRight: i < words.length - 1 ? "0.22em" : 0,
            backgroundImage: "linear-gradient(100deg,#22d3ee,#67e8f9,#38bdf8)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {w}
        </span>
      ))}
    </span>
  );
}

function Bullet({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 text-[15px] text-[var(--text-dim)]">
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: color, boxShadow: `0 0 10px ${color}` }}
      />
      {children}
    </li>
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
      className="rounded-[10px] px-5 py-2 text-[14px] font-semibold transition"
      style={
        active
          ? { background: "var(--surface)", color: "var(--text)" }
          : { color: "var(--text-faint)" }
      }
    >
      {children}
    </button>
  );
}

function MicGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
    </svg>
  );
}

function Wordmark({ size = 30 }: { size?: number }) {
  return (
    <div
      className="font-display relative z-10 flex items-center gap-2 font-bold"
      style={{ fontSize: size }}
    >
      <span
        className="rb-blink rounded-full"
        style={{ background: "var(--signal)", width: 9, height: 9 }}
      />
      <span>
        Ramble{" "}
        <span
          className="rb-shake font-babble inline-block bg-clip-text text-transparent"
          style={{
            backgroundImage: PRIMARY_GRADIENT,
            fontSize: size * 1.35,
          }}
        >
          Babble
        </span>
      </span>
    </div>
  );
}
