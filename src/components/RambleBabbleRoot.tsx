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

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      // Always land on the main workspace right after signing in.
      if (event === "SIGNED_IN") setScreen("main");
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
        data-theme="night"
        className="flex min-h-screen items-center justify-center bg-[var(--canvas)] text-[var(--cDim)]"
      >
        Loading...
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  if (screen === "history") {
    return (
      <div
        data-theme="night"
        className="min-h-screen bg-[var(--canvas)] text-[var(--cInk)]"
      >
        <MyRambles onBack={() => setScreen("main")} onReopen={handleReopen} />
      </div>
    );
  }

  return (
    <RambleBabbleApp
      key={reopenSeq}
      userId={user.id}
      userEmail={user.email ?? ""}
      onOpenHistory={() => setScreen("history")}
      onSignOut={signOut}
      reopen={reopen}
    />
  );
}
