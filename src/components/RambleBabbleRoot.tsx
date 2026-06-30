"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import AuthScreen from "./AuthScreen";
import RambleBabbleApp from "./RambleBabbleApp";
import MyRambles, { type SavedRamble } from "./MyRambles";

export default function RambleBabbleRoot() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<"main" | "history">("main");
  const [reopen, setReopen] = useState<SavedRamble | null>(null);
  const [reopenSeq, setReopenSeq] = useState(0);
  // Try-first: the app loads for everyone. The sign-in / create screen is an
  // on-demand overlay (triggered by the nav or the free-Babble gate), not a wall.
  const [authMode, setAuthMode] = useState<null | "signin" | "signup">(null);

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      // Always land on the main workspace right after signing in, and close
      // the auth overlay if it was open.
      if (event === "SIGNED_IN") {
        setScreen("main");
        setAuthMode(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
    setScreen("main");
  }, []);

  const handleReopen = useCallback((r: SavedRamble) => {
    setReopen(r);
    setReopenSeq((s) => s + 1); // bump the key to remount with this ramble loaded
    setScreen("main");
  }, []);

  if (!ready) {
    return (
      <div
        data-theme="dark"
        data-accent="coral"
        className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-[var(--text-dim)]"
      >
        Loading...
      </div>
    );
  }

  // My Rambles (the saved archive) needs an account. Anonymous users who try to
  // open it get the create-account overlay instead.
  if (screen === "history" && user) {
    return (
      <div
        data-theme="dark"
        data-accent="coral"
        className="min-h-screen bg-[var(--bg)] text-[var(--text)]"
      >
        <MyRambles onBack={() => setScreen("main")} onReopen={handleReopen} />
      </div>
    );
  }

  return (
    <>
      <RambleBabbleApp
        key={reopenSeq}
        userId={user?.id ?? null}
        userEmail={user?.email ?? ""}
        onOpenHistory={() => (user ? setScreen("history") : setAuthMode("signup"))}
        onSignOut={signOut}
        onRequestAuth={(m) => setAuthMode(m)}
        reopen={reopen}
      />
      {authMode && (
        <div className="fixed inset-0 z-[80] overflow-y-auto">
          <AuthScreen initialMode={authMode} onClose={() => setAuthMode(null)} />
        </div>
      )}
    </>
  );
}
