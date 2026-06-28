"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_RECORDING_SECONDS } from "@/lib/config";

export type RecorderStatus = "idle" | "recording" | "error";

interface UseRecorderOptions {
  /**
   * Called when the recording auto-stops at MAX_RECORDING_SECONDS, with the
   * captured audio (or null). The hook stops the recorder; the caller decides
   * what to do with the blob (e.g. upload it) and how to message the user.
   */
  onAutoStop?: (blob: Blob | null) => void;
}

interface UseRecorder {
  status: RecorderStatus;
  seconds: number;
  error: string | null;
  start: () => Promise<void>;
  /** Resolves with the recorded audio, or null if nothing was captured. */
  stop: () => Promise<Blob | null>;
  cancel: () => void;
}

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = ["audio/webm", "audio/mp4", "audio/ogg"];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) || "";
}

export function useRecorder(options: UseRecorderOptions = {}): UseRecorder {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStoppedRef = useRef(false);

  // Keep the latest callback in a ref so the timer closure never goes stale.
  const onAutoStopRef = useRef(options.onAutoStop);
  useEffect(() => {
    onAutoStopRef.current = options.onAutoStop;
  }, [options.onAutoStop]);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  // Stop is defined before start so the auto-stop timer can call it.
  const stop = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        cleanup();
        setStatus("idle");
        resolve(null);
        return;
      }
      recorder.onstop = () => {
        const type = recorder.mimeType || "audio/webm";
        const blob = chunksRef.current.length
          ? new Blob(chunksRef.current, { type })
          : null;
        cleanup();
        setStatus("idle");
        resolve(blob);
      };
      recorder.stop();
    });
  }, [cleanup]);

  const start = useCallback(async () => {
    setError(null);
    setSeconds(0);
    chunksRef.current = [];
    autoStoppedRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();
      setStatus("recording");

      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          const next = s + 1;
          // Auto-stop exactly once at the cap, then hand the audio to the
          // caller so it can upload it (never silently dropped).
          if (next >= MAX_RECORDING_SECONDS && !autoStoppedRef.current) {
            autoStoppedRef.current = true;
            void stop().then((blob) => onAutoStopRef.current?.(blob));
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error("[recorder] start error:", err);
      cleanup();
      setStatus("error");
      setError(
        "Couldn't access the microphone. Check your browser permissions and try again.",
      );
    }
  }, [cleanup, stop]);

  const cancel = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    cleanup();
    setSeconds(0);
    setStatus("idle");
  }, [cleanup]);

  // Safety net: release the mic if the component unmounts mid-recording.
  useEffect(() => cleanup, [cleanup]);

  return { status, seconds, error, start, stop, cancel };
}
