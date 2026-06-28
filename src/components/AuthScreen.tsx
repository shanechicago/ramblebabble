"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { usernameToEmail } from "@/lib/auth";

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
      // Success: the auth listener in the root swaps to the app.
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  };

  return (
    <div
      data-theme="dark"
      data-accent="coral"
      className="grid min-h-screen w-full grid-cols-1 bg-[var(--bg)] text-[var(--text)] lg:grid-cols-2"
    >
      {/* Left: brand / story */}
      <div className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
        <div
          aria-hidden
          className="rb-floaty pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full blur-3xl"
          style={{ background: "var(--glow1)" }}
        />
        <div
          aria-hidden
          className="rb-floaty pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full blur-3xl"
          style={{ background: "var(--glow2)", animationDelay: "-4.5s" }}
        />
        <Wordmark />
        <div className="relative z-10 max-w-md">
          <h1 className="font-display text-4xl font-bold leading-[1.1]">
            Ramble in. Brilliance out...{" "}
            <span style={{ color: "var(--signal)" }}>sometimes wildly wacky.</span>
          </h1>
          <p className="mt-4 text-lg text-[var(--text-dim)]">
            Say what&apos;s on your mind. RambleBabble turns rambling thoughts,
            voice notes, and messy drafts into clean messages, useful work notes,
            AI prompts, or ridiculous little masterpieces.
          </p>
        </div>
        <p className="relative z-10 text-sm text-[var(--text-faint)]">
          No setup. No clutter. Just ramble.
        </p>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="mb-6 lg:hidden">
            <Wordmark />
          </div>

          <div className="mb-6 inline-flex rounded-full bg-[var(--surface2)] p-1">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError(null);
              }}
              className="rounded-full px-5 py-2 text-sm font-semibold transition"
              style={
                mode === "signin"
                  ? { background: "var(--surface)", color: "var(--text)" }
                  : { color: "var(--text-dim)" }
              }
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError(null);
              }}
              className="rounded-full px-5 py-2 text-sm font-semibold transition"
              style={
                mode === "signup"
                  ? { background: "var(--surface)", color: "var(--text)" }
                  : { color: "var(--text-dim)" }
              }
            >
              Create account
            </button>
          </div>

          <h2 className="font-display text-2xl font-bold">
            {mode === "signin" ? "Welcome back" : "Let's get you set up"}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-dim)]">
            No judgment. No blank page. Just better words.
          </p>

          <label className="mt-6 block text-sm font-semibold text-[var(--text-dim)]">
            Username
          </label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. sunny_talker"
            autoComplete="username"
            className="mt-1.5 w-full rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-3.5 text-[var(--text)] outline-none transition placeholder:text-[var(--text-faint)] focus:border-[var(--primary)]"
          />

          <label className="mt-4 block text-sm font-semibold text-[var(--text-dim)]">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 4 characters"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            className="mt-1.5 w-full rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-3.5 text-[var(--text)] outline-none transition placeholder:text-[var(--text-faint)] focus:border-[var(--primary)]"
          />

          {error && (
            <p className="mt-3 text-sm" style={{ color: "var(--danger)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-[14px] px-4 py-3.5 text-base font-bold text-[var(--primary-ink)] transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
            style={{ background: "var(--primary)" }}
          >
            {loading
              ? "One moment..."
              : mode === "signin"
                ? "Sign in and Start Rambling"
                : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Wordmark() {
  return (
    <div className="font-display flex items-center gap-2 text-[26px] font-bold">
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
  );
}
