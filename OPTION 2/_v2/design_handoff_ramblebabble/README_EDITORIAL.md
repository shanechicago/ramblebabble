# Handoff: RambleBabble (Editorial direction)

## Overview
This is the award-caliber "thought refinery" visual direction for RambleBabble, a tool that turns messy spoken or pasted thoughts into clean or playful text. It replaces the earlier neon direction entirely. Same three screens (sign in, workspace, archive), same core translator interaction, completely different aesthetic.

This README documents the editorial direction specifically. The original neon direction's spec is in `README.md` in this same folder, and the original prototype is `RambleBabble.dc.html`. The editorial prototype is `RambleBabble Editorial.dc.html`.

## About the design files
`RambleBabble Editorial.dc.html` is a **design reference created in HTML** demonstrating look, motion, and behavior. It is a single self-contained prototype, not production code to copy line for line. The transform output is **mocked** (two canned passages plus a scramble-decode reveal); wire the real engine to the "Babble it" action and reuse the reveal treatment. Target stack per the brief: React + TypeScript + Tailwind CSS in a Next.js App Router project. Translate the CSS variables and inline styles into Tailwind theme tokens and components.

## Fidelity
**High fidelity.** Final palette, type, spacing, motion, and copy are specified below.

## Hard brand rules (non-negotiable)
- No emojis anywhere in UI or copy.
- No em dashes or en dashes in copy. Plain hyphens (e.g. "voice-to-text", "almost-genius") are fine. Arrows use the glyph "->" rendered as &rarr;.
- Copy is sentence case, conversational, uses contractions (e.g. "shouldn't").
- No tone-on-tone. High contrast everywhere: light misty panels on a near-black canvas, dark text on the panels, light text on the canvas.

## Concept and aesthetic
"The thought refinery": raw spoken mess is refined into clean type. The signature moment is a scramble-decode where a full block of random glyphs resolves left to right into the final text. Editorial / brutalist-refined: oversized type, strong asymmetric grid, hairline rules, monospace technical labels, film grain, a cursor-following accent spotlight, a kinetic word cycler, and a marquee.

## Typography
- Display, headings, UI, body: **Bricolage Grotesque** (Google Fonts), weights 300 to 800. Headlines use heavy weight and tight tracking (-0.04 to -0.05em).
- Expressive accent (the word "babble", the cycling hero word, large pull words, the idle "b" mark): **Instrument Serif**, italic. Used at large sizes for personality, and as the reading face for the refined output (23px, line-height 1.5).
- Technical labels, eyebrows, meta, tags, buttons: **Space Mono**, uppercase, letter-spacing 0.06 to 0.22em.

## Color system (design tokens)
Two themes, toggled by `data-theme` on the root. The default ("Mist") is a void-black canvas with light misty-gray panels. The alternate ("Ink") keeps the black canvas but makes panels dark charcoal. Crucially there are TWO text scales: one for elements sitting on the black canvas, one for elements inside the misty panels.

Default theme (Mist):
- Canvas: `--bg` #0b0c0f (void black)
- Canvas text: `--canvas-ink` #eef1f3, `--canvas-dim` #8b929b
- Canvas rules: `--canvas-line` rgba(238,241,243,0.13), `--canvas-line-strong` rgba(238,241,243,0.30)
- Panels: `--surface` #d6dbde (misty gray), `--bg-2` #c6cccf (deeper mist, used for hover/active inside panels)
- Panel text: `--ink` #13161a, `--ink-dim` #565d63, `--ink-faint` #878d93
- Panel rules: `--line` rgba(19,22,26,0.16), `--line-strong` rgba(19,22,26,0.34)

Ink theme (alternate):
- `--bg` #070809; `--surface` #16181d; `--bg-2` #1e2127
- `--ink` #eef1f3; `--ink-dim` #9097a0; `--ink-faint` #646b72
- `--line` rgba(238,241,243,0.12); `--line-strong` rgba(238,241,243,0.26)
- canvas tokens essentially unchanged (light text on black)

Accent:
- `--accent` is user-selectable. Default #1f2bff (electric blue). Other curated options: #ff5a2a (vermilion), #c0521f (burnt orange), #15a06a (emerald), #0fb5b0 (teal), #e8a317 (amber). Pink is deliberately excluded.
- `--cobalt` #ff5a2a is a fixed secondary used only for tone tag outlines and one equalizer bar.
- Primary buttons use an auto-derived gradient from the accent: `linear-gradient(120deg, var(--accent), color-mix(in srgb, var(--accent) 52%, #000))`. This works for any chosen accent.

## Other tokens
- Geometry: sharp. Border radius is 0 almost everywhere (square panels, square buttons, square tags). The only round things are the record status dot and the spinner.
- Borders: 1px hairlines using the line tokens. Panels are 1px `--line-strong`; internal dividers are 1px `--line`.
- Grain: a fixed full-screen SVG fractal-noise overlay, opacity 0.045, mix-blend-mode overlay.
- Cursor spotlight: a fixed overlay behind the content (z-index 1) painting `radial-gradient(440px circle at cursor, accent at 22% alpha, transparent 64%)`, position updated from mousemove via CSS vars `--mx`/`--my`. Reads as an accent halo glowing on the black canvas behind panels and page titles.

## Screens

### Sign in
Full-height split, columns 1.1fr / 0.9fr.
- Left column: void-black panel (`--darkpanel`), light text. Top: wordmark ("Ramble" Bricolage 800 + "babble" Instrument Serif italic accent). Middle: mono eyebrow "[ The thought refinery ]" in accent, a huge headline "Say it messy. / Get it <word>." where <word> is an Instrument Serif italic accent word that cycles every 2.2s through refined / ridiculous / sendable / sharper / unhinged / poetic, then the subcopy. Bottom: a left-to-right marquee of format names in mono, masked at both edges, 34s loop.
  - Subcopy (exact): "Dump in the voice-to-text chaos, the almost-genius ideas, and the texts you probably shouldn't send yet. Watch the mess resolve into clean messages, useful notes, AI prompts, or spicy little masterpieces with a personality disorder."
- Right column: misty-gray panel (`--surface`), dark text. Mono eyebrow "Enter the refinery". A two-button segmented toggle (Sign in / Create) with a square 1px border; active button has `--ink` background and `--surface` text. Heading "Welcome back" (or "Make an account"). Subline "No judgment. No blank page. Just better words." (or "Set it up once, then ramble forever."). Username and Password fields are underline-only inputs (no box, 1px bottom border, focus border = accent). Primary CTA: full-width gradient button "Sign in and start rambling" (or "Create account") with a trailing arrow; hover lifts 2px and brightens. An "or" hairline divider. A secondary outline "Continue with Google" button (mono "G", hover inverts to `--ink` background with `--surface` text). Footer mono line "No setup. No clutter. Just ramble."

### Workspace (the refinery)
Header (shared, sticky, blurred, on canvas): wordmark left; nav right is mono "Refinery" / "Archive" (active = accent, inactive = `--canvas-dim`), a square theme toggle reading "Mist" or "Ink", and a square accent account button "R".
- Page title: huge "Refine a ramble" ("ramble" in Instrument Serif italic accent), `--canvas-ink`. To its right, a mono instruction "Talk or paste your ramble on the left. Stack the controls. Babble it."
- Control console: one misty-gray bordered block. Top row is a 4-column grid of selector buttons (Format / Tone / Character / Accent), each showing a mono index+label ("01 FORMAT", and a small accent "SET" mark when chosen) above the chosen value or prompt in 19px. Clicking opens a square dropdown panel directly below (absolute, scrollable, slide-up 0.22s); Format options are grouped under accent "Practical" / "Fun" headers; the rest are flat. Items invert to `--ink` background with `--surface` text and indent on hover; the active item shows an accent bullet. Bottom row of the console: a "05 Vocabulary" mono label + free input, a "Reset" text button, and the primary "Babble it ->" gradient button (shows a spinner and reads "Babbling" while transforming; hover widens the gap and brightens).
- Two equal panels below, both misty-gray, min-height 480px:
  - Left "Ramble" (input): mono header "Ramble" with Paste and Record buttons. Record turns solid accent with a square dot while recording and overlays the textarea with a 5-bar equalizer, a large mono timer (counts up, 3 minute cap), and "Listening. Tap stop when done." Footer shows "N WORDS / N CHARS" and a Clear button. Textarea placeholder ends "...the texts you shouldn't send yet. That is the point."
  - Right "Babble" (output): mono header "Babble" in accent, with right-aligned meta ("decoding..." while transforming, then the chosen selections joined by " / "). Idle state: a large Instrument Serif italic "b" in accent and a one-line prompt. Result renders in Instrument Serif 23px. On completion, collapsible "Key points" (mono-numbered list) and "Suggested follow ups" (hairline-separated buttons with an accent arrow) fade up. Footer action bar: Copy / Share / Try again / Clear, each a mono button that inverts to `--ink` background with `--surface` text on hover.

### Archive
On-canvas editorial index (not boxed). Title "The archive" ("archive" italic accent), `--canvas-ink`. A gradient "New ramble ->" button. A mono line "06 saved / reopen one to keep refining" above a hairline.
- Each saved ramble is a row: grid 64px / 1fr / auto, divided by `--canvas-line`. Left: mono index number. Middle: title (`--canvas-ink`, hover turns accent) + mono date, a one-line clamped snippet (`--canvas-dim`), and mono tag chips (square 1px outline; format = accent, tone = cobalt, other = canvas-dim). Right: "Open" (solid accent), "Copy" and "Del" (misty-gray chips). Row hover indents 18px with a faint light wash. Empty state: an Instrument Serif italic "All clear." with a restart button.

## Interactions and motion
- Navigation: single-page screen switching via a `screen` state value; wordmark and nav switch screens, account button returns to sign in.
- Theme toggle flips `data-theme` between the Mist and Ink token sets.
- Hero word cycler: 2.2s interval. Marquee: 34s linear loop. Cursor spotlight: live, follows mouse.
- Record (mocked): 1s timer to a 180s cap with the equalizer overlay; on stop the textarea fills.
- Signature transform: on "Babble it", status becomes "babbling"; the output renders as a full-length block of random glyphs (whitespace preserved) that resolves left to right, advancing about 6 characters every 26ms (roughly 3 seconds for the sample), then settles and the key points and follow ups fade up. Replace the canned text with the engine's output but keep this reveal.
- Hover micro-interactions: dropdown items and action buttons invert (dark/light swap), buttons that lift or brighten, archive rows that indent with an accent title. All transitions about 0.14 to 0.5s.

## State, options, props
State model matches the neon version (see `README.md`): `screen`, `theme`, `authMode`, `inputText`, `customVocab`, `selections` {format, tone, character, accent}, `openDropdown`, `isRecording`/`recordSeconds`, `status`/`outputText`/`finalOutput`, `keyOpen`/`followOpen`, `rambles`, transient copy labels, plus a `heroWord` index for the cycler.

Selector option lists are identical to the neon version (see `README.md`): Format grouped Practical/Fun (includes AI prompt and Spicy text), plus Tone, Character, Accent flat lists.

Configurable props in the prototype: `startScreen` (signin / workspace / rambles) and `accentColor` (the curated swatch set above, pink excluded). The accent flows into every accent use and the auto-gradient.

## Assets
- Fonts: Bricolage Grotesque, Instrument Serif, Space Mono (all Google Fonts).
- No images. Grain and spotlight are pure CSS/SVG. No icon library required (record dot and spinner are CSS; arrows are the &rarr; glyph; mic is not used in this direction).

## Files
- `RambleBabble Editorial.dc.html` - the editorial prototype (all three screens, scramble-decode, console, archive, Mist/Ink themes, accent tweak). Open in a browser for motion; read the markup and logic for exact values.
- `README.md` - the original neon direction spec, shared state model, and the full selector option lists.
- `RambleBabble.dc.html` - the original neon prototype.
