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
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const letters = [...WORD];
  const n = letters.length;
  return (
    <span className={`font-babble inline-block ${className ?? ""}`} style={style}>
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

/**
 * The babble result assembling itself left to right, one character at a time.
 *
 * The entire string is in the DOM from the first frame, so the text stays fully
 * selectable and copyable during and after the flourish (Copy never breaks).
 * Each character is hidden only during its own delay, via `backwards` fill.
 *
 * It is a flourish, not a wait: the per-character step shrinks as the text grows
 * so the whole reveal lands in about a second no matter how long the babble is.
 *
 * Words are wrapped in a nowrap inline-block so lines still break between words
 * rather than mid-word, and whitespace runs are left as plain text so the
 * container's pre-wrap keeps every space and newline intact for copy.
 */
export function FlyInText({
  text,
  className,
  style,
}: {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  // The last character must START by ~650ms so that, plus its own 340ms
  // animation, the whole reveal lands just under a second however long the
  // babble is. Short babbles get the full 14ms step and simply finish sooner.
  const total = Math.max(1, text.length);
  const step = Math.min(14, 650 / total);
  let idx = 0;

  return (
    <div className={className} style={style}>
      {text.split(/(\s+)/).map((part, pi) => {
        if (!part) return null;
        if (/^\s+$/.test(part)) {
          idx += part.length;
          return <span key={pi}>{part}</span>;
        }
        return (
          <span key={pi} style={{ display: "inline-block", whiteSpace: "nowrap" }}>
            {[...part].map((ch, ci) => {
              const delay = idx++ * step;
              return (
                <span
                  key={ci}
                  className="rb-flychar"
                  style={{ animationDelay: `${delay.toFixed(1)}ms` }}
                >
                  {ch}
                </span>
              );
            })}
          </span>
        );
      })}
    </div>
  );
}
