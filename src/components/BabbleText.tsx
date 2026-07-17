"use client";

import React from "react";

const GRADIENT = "linear-gradient(95deg,#7b5cff,#ff4d9d 55%,#ff6f61)";
const WORD = "Babble";

/**
 * The "Babble" wordmark as a travelling wave: the motion of snapping a bedsheet,
 * where the roll starts at one end and moves through to the other.
 *
 * Each letter is its own inline-block riding a slow vertical sine with a small
 * coupled rotation (so it reads as fabric, not pistons). The per-letter
 * animation-delay is the whole trick: without the stagger this is a bounce, with
 * it the wave travels left to right.
 *
 * Splitting the word into letters breaks background-clip:text on a parent (each
 * transformed letter paints on its own), so every letter carries a SLICE of the
 * shared gradient instead: the image is sized to the full word and shifted per
 * letter, which reassembles into one continuous sweep.
 *
 * Motion is switched off wholesale for prefers-reduced-motion in globals.css;
 * the letters' resting state is the visible one, so they simply sit still.
 */
export function BabbleWave({
  className,
  style,
  duration = "1.6s",
  offset = "0s",
}: {
  className?: string;
  style?: React.CSSProperties;
  /** Cycle length for THIS instance. Two instances on screen must use durations
   *  that don't divide evenly into each other (1.6s and 1.9s) so they drift in
   *  and out of phase forever instead of locking into a mechanical lockstep. */
  duration?: string;
  /** Starting phase for THIS instance, added on top of the per-letter stagger.
   *  A negative value means the wave is already mid-roll on first paint. */
  offset?: string;
}) {
  const letters = [...WORD];
  const n = letters.length;
  return (
    <span
      className={`font-babble inline-block ${className ?? ""}`}
      style={
        {
          "--rb-wave-dur": duration,
          "--rb-wave-offset": offset,
          ...style,
        } as React.CSSProperties
      }
    >
      {letters.map((ch, i) => (
        <span
          key={i}
          className="rb-waveletter"
          style={
            {
              "--i": i,
              backgroundImage: GRADIENT,
              backgroundSize: `${n * 100}% 100%`,
              backgroundPosition: `${n > 1 ? (i / (n - 1)) * 100 : 0}% 0`,
            } as React.CSSProperties
          }
        >
          {ch}
        </span>
      ))}
    </span>
  );
}
