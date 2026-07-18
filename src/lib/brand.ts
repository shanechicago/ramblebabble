// Shared brand constants. ONE source of truth for the accent, the primary-button
// gradient, and the wordmark gradient, so no screen can drift from another.
//
// The theme tokens (canvas/panel/ink/accentOnPanel/...) live as CSS variables in
// globals.css under [data-theme]. These constants are the values that are NOT
// theme-dependent: the raw accent, the gradients, and the canvas scale used by
// the single-theme screens (Auth, Archive) that always paint on the black void.

// The brand accent: violet. It carries interactive states, focus rings, active
// selections, and the section numbers. Every accent use in the UI is either
// LARGE text (the numbers, the idle "b") or a GRAPHIC (rings, active borders,
// marquee diamonds), so the 3:1 bar applies, which #7b5cff clears on every
// surface (min 3.12 on the light Day panel; 4.49/4.60 on the dark canvas).
export const ACCENT = "#7b5cff";

// Primary buttons ("Babble it", auth CTA) wear the brand gradient with a
// near-black label. #070809 clears AA on every stop (worst 4.60 on the violet).
export const BUTTON_GRADIENT =
  "linear-gradient(95deg,#7b5cff,#ff4d9d 55%,#ff6f61)";
export const ON_GRADIENT = "#070809";

// The wordmark gradient (identical to the button gradient): carries the "Babble"
// wave. Kept as its own export so BabbleText imports an unmistakable name.
export const WORDMARK_GRADIENT =
  "linear-gradient(95deg,#7b5cff,#ff4d9d 55%,#ff6f61)";

// Accent as TEXT/ICONS on the black canvas, both themes (the canvas is dark in
// Day and Night alike). Matches --accentOnCanvas in globals.css. Clears 4.5 on
// the unified #070809 canvas (4.60), so small accent labels pass, not just the
// large numbers and graphics.
export const ACCENT_ON_CANVAS = "#7b5cff";

// Accent as TEXT on a LIGHT surface (the Auth mist panel #e9ebf0). The violet
// #7b5cff is too light there (3.65), so accent text on light panels uses this
// deep violet: 6.12 on the mist panel, 5.23 on the Day panel. Matches the Day
// --accentOnPanel token.
export const ACCENT_ON_LIGHT = "#5a3cc4";

// The canvas scale, shared by the single-theme screens (Auth left column,
// Archive). Unified to #070809 (matches the --canvas token in both themes) so
// accent text on it clears 4.5.
export const CANVAS = "#070809";
export const C_INK = "#eef1f3";
export const C_DIM = "#8b929b";
