# Handoff: RambleBabble web app UI

## Overview
RambleBabble turns messy spoken or pasted thoughts into clean, useful text or playful, entertaining text. Tagline: "Talk messy. Leave polished... or ridiculous." It has a dual personality: a serious productivity tool and a fun toy.

This package documents the front-end UI/UX for three screens: a sign in / create account screen, the main workspace (the core translator interaction), and the My Rambles history view. The backend, AI engine, and all transformation logic already exist and are out of scope. Your job is to recreate this UI in the product's real codebase.

## About the Design Files
The file in this bundle (`RambleBabble.dc.html`) is a **design reference created in HTML** that demonstrates the intended look, motion, and behavior. It is a single self-contained prototype, not production code to copy line for line.

The transform output in the prototype is **mocked** (two canned passages plus a typewriter reveal). In the real app, the existing AI engine produces the output; wire the UI's "Babble it" action and the streaming reveal to that engine.

The target stack is **React + TypeScript + Tailwind CSS in a Next.js App Router project** (per the brief). Recreate the designs using that environment's established components and patterns. The HTML uses CSS variables and inline styles only because of the prototype tooling; in the real codebase, translate these into Tailwind tokens / theme config and component styles.

## Fidelity
**High fidelity.** Final colors, typography, spacing, motion, and copy are all specified below and should be reproduced closely. Where the prototype used inline styles, the exact values are listed in Design Tokens.

## Hard brand rules (non-negotiable)
- **No emojis** anywhere in the UI or copy.
- **No em dashes or en dashes** in any copy. Regular hyphens (as in "voice-to-text") are fine.
- Copy is **sentence case**, conversational, uses contractions, never stiff or robotic.
- **No tone-on-tone.** Every element must have clear contrast and pop off the background. Strong hierarchy, nothing flat or blending in.
- Dark theme is primary; a light theme exists behind a toggle.
- The wordmark is always two words set together: "Ramble" in the bold display font, "Babble" in the handwritten script font with a violet to pink to coral gradient.

## Typography
- **Display / headings / UI / body:** Space Grotesk (Google Fonts), weights 400/500/600/700.
- **Script accent (the word "Babble" and a few playful flourishes):** Caveat Brush (Google Fonts).
- Headings use tight letter-spacing (-0.02em to -0.03em). Body line-height 1.5 to 1.68.

## Color system (design tokens)
Themeable values are CSS variables that flip between dark and light. Accent colors are constant across both themes so they always pop.

Dark theme (default):
- `--bg` #0a0b12 (near-black background)
- `--surface` #14161f (panels, inputs)
- `--surface-2` #1b1e29 (raised surfaces, dropdown panels, secondary buttons)
- `--line` #262a38 (borders, dividers)
- `--text` #f4f5fa (primary text)
- `--text-dim` #a3a7b8 (secondary text)
- `--text-faint` #6b7081 (tertiary / placeholder)

Light theme:
- `--bg` #f3f2f9
- `--surface` #ffffff
- `--surface-2` #f0eef8
- `--line` #e3e1ef
- `--text` #161826
- `--text-dim` #565a6b
- `--text-faint` #9094a6

Accents (constant in both themes):
- `--violet` #7b5cff
- `--coral` #ff6f61
- `--pink` #ff4d9d

Primary gradient (CTAs, wordmark, key accents): `linear-gradient(95deg, #7b5cff, #ff4d9d 55%, #ff6f61)`. Some CTAs use a two-stop `linear-gradient(95deg, #7b5cff, #ff4d9d)`.

## Other tokens
- Border radius: panels/cards 18 to 20px; inputs and buttons 11 to 14px; pills 9 to 13px; small tags 8px; status dots are circles.
- Shadows / glow: CTA buttons use colored glow, e.g. `0 12px 34px -10px rgba(123,92,255,0.8)`, deepening to pink on hover. Dropdown panel: `0 24px 50px -16px rgba(0,0,0,0.6), 0 0 0 1px rgba(123,92,255,0.18)`. Status dots use `box-shadow: 0 0 10px <accent>` for a glow.
- Spacing: panel padding 16 to 20px; gaps between controls 12px; workspace column gap 18px.
- Ambient background: three large blurred radial-gradient blobs (violet, pink, coral) fixed behind everything, drifting slowly (19s to 26s ease-in-out loops), opacity driven by a `--glow` variable (0.55 dark, 0.28 light).

---

## Screens / Views

### Screen 1: Sign in / Create account
**Purpose:** Authenticate or register, then enter the workspace.

**Layout:** Full-height split, two columns `grid-template-columns: 1.05fr 0.95fr`.
- **Left panel (brand/story):** padding 56px 60px, a soft brand gradient wash `linear-gradient(150deg, rgba(123,92,255,0.16), rgba(255,77,157,0.1) 50%, rgba(255,111,97,0.12))`, right border `--line`. Vertically space-between: wordmark at top, headline + subcopy + feature bullets in the middle, a footer line at the bottom.
  - Wordmark: "Ramble" 30px/700 + "Babble" Caveat Brush ~42px with the primary gradient as text fill.
  - Headline (52px/700, line-height 1.04): "Ramble in." / "Brilliance out..." then "sometimes wildly wacky." set in Caveat Brush ~60px with a coral to pink gradient text fill.
  - Subcopy (17px, `--text-dim`): "Dump in the voice-to-text chaos, the almost-genius ideas, and the texts you probably should not send yet. Watch the mess turn into clean messages, useful notes, AI prompts, or spicy little masterpieces with a personality disorder."
  - Three feature bullets, each a glowing accent dot (violet, pink, coral) + 15px `--text-dim` text: "Voice-to-text chaos in, polished words out" / "Stack format, tone, character and accent" / "Clean messages, work notes, AI prompts, or chaos".
  - Footer line (13px, `--text-faint`): "No setup. No clutter. Just ramble."
- **Right panel (form):** centered, max-width 380px.
  - Segmented pill toggle (in a `--surface-2` rounded container, 4px padding): "Sign in" | "Create account". Active tab has `--surface` background and `--text` color; inactive is transparent with `--text-faint`.
  - Heading (28px/700): "Welcome back" (sign in) or "Make an account" (create).
  - Subline (15px, `--text-dim`): "No judgment. No blank page. Just better words." (sign in) or "Set it up once, then ramble forever." (create).
  - Username field: label "Username", placeholder "yourname". Standard `--surface` input, `--line` border, focus border `--violet`.
  - Password field: label "Password", placeholder "at least eight characters".
  - Primary CTA: full-width gradient button with violet glow, a small outline microphone icon on the left, label "Sign in and start rambling" (sign in) or "Create account and start rambling" (create). Hover: lifts 2px, glow shifts toward pink.
  - Divider: thin `--line` rules with a centered "or" (12px, `--text-faint`).
  - Secondary CTA: full-width outline button (`--surface` bg, `--line` border) with a small white circular "G" mark, label "Continue with Google". Hover border `--violet`, lifts 1px.
  - Footer (13px, `--text-faint`, centered): "By continuing you agree to talk a little messy."

### Screen 2: Main workspace (the core interaction)
**Purpose:** Paste or record a messy ramble, stack transformation controls, and get back the transformed result. This is a translator pattern (input left, output right) with the controls in the middle.

**Header (shared with My Rambles), sticky, blurred:** padding 16px 30px, `--line` bottom border, translucent `--bg` backdrop blur.
- Left: wordmark button (returns to workspace), "Ramble" 25px/700 + "Babble" Caveat Brush 34px gradient.
- Right nav: text buttons "Workspace" and "My rambles" (`--text-dim`, hover fills `--surface-2`), a square theme toggle button (shows "L" in dark mode / "D" in light, hover border `--violet`), and a round gradient account avatar showing "R" (click goes to sign in / sign out).

**Body:** max-width 1320px, centered, padding 28px 30px 60px. Three columns `grid-template-columns: 1fr 348px 1fr`, gap 18px, items stretch to equal height (min-height 560px). Per the chosen layout, the input and output panels are equal and balanced on the sides, with the transformation controls in a narrower center column.

**Left column: Input panel** (`--surface`, `--line` border, radius 20px).
- Header row: a coral glowing dot + "Your ramble" (14px/600). Right side: a "Paste" button (fills the textarea with the sample ramble) and a "Record" button.
  - Record button: gradient bg with violet glow and a round white dot when idle ("Record"); when recording it turns solid coral, the dot becomes a square ("Stop"), and a coral focus ring appears.
- Textarea: transparent, 16px/1.62 line-height, padding 20px, placeholder "Hit record and just talk, or paste the chaos here. The half thoughts, the almost-genius ideas, the texts you should not send yet. That is the point."
- Recording overlay (while recording): blurred scrim over the textarea showing a 5-bar animated equalizer (violet/pink/coral bars, staggered scaleY pulse), a large tabular-numerals timer (m:ss, counts up, hard cap 180s = 3 min), and the line "Listening. Tap stop when you are done." On stop, the textarea fills with the transcription (mocked as the sample ramble if empty).
- Footer row: "<n> words, <n> characters" on the left, "Clear input" button on the right (hover coral).

**Center column: Controls** (subtle brand-gradient panel `linear-gradient(170deg, rgba(123,92,255,0.1), rgba(255,77,157,0.06))`, `--line` border, radius 20px, padding 18px, gap 12px).
- Heading (centered): "How should it come out?" (15px/600) and "Stack any of these. They combine." (12px, `--text-dim`).
- Four stacked dropdown selectors (Format, Tone, Character, Accent). Each is a full-width button (`--surface`, radius 13px) showing an uppercase 11px label and, below it, either the dim prompt text (unset) or the chosen value in bright `--text`. Border turns `--violet` and the value brightens once a value is chosen. A small chevron rotates 180deg when open.
  - Default state shows prompts, not values: "Choose a format", "Set a tone", "Add a character", "Pick an accent".
  - Opening a selector shows an absolutely-positioned panel below it (`--surface-2`, radius 14px, max-height 280px scroll, the dropdown shadow above). Only one selector is open at a time. Selecting an item sets the value and closes the panel. The active item shows a violet glowing dot on the right. Items hover with a faint violet wash.
  - Format options are grouped under "Practical" and "Fun" headers (10px violet uppercase). The other three are flat lists.
- Custom Vocabulary field: a single `--surface` input, placeholder "Custom vocabulary, optional", focus border `--violet`.
- Primary action: full-width gradient "Babble it" button (17px/700). It has a slow ambient glow pulse (`--signaturePulse`, ~3.2s) when idle; while transforming it shows a spinning ring and reads "Babbling". Hover lifts and scales slightly.
- A small "Reset choices" text button below clears all four selectors.

**Right column: Output panel** (`--surface`, `--line` border, radius 20px).
- A 3px glow sweep bar animates across the top edge while transforming (gradient violet to pink, ~1.1s loop).
- Header row: a violet glowing dot + "The result" (14px/600). Right side meta text: shows "babbling" while transforming, then the active selections joined by " · " (e.g. "Email · Friendly") when done.
- Idle state: centered placeholder, a rounded gradient tile with a Caveat Brush "B", and the line "Your polished or babbled text shows up right here. Stack a few choices, then babble it."
- Transforming + done state: the result text (16px/1.68, `white-space: pre-wrap`). During transform a pink blinking caret block trails the streamed text.
- When done, two collapsible sections appear (both open by default), each fading up:
  - "Key points": bulleted list (violet dots) of short takeaways.
  - "Suggested follow ups": stacked outline buttons (hover pink) that re-run the transform in the prototype.
- Action bar (only when done), `--line` top border: "Copy" (gradient, copies result, label flips to "Copied" ~1.6s), "Share" (outline, copies, flips to "Link copied"), "Try again" (outline, re-runs), and a "Clear" text button (resets the output to idle).

### Screen 3: My Rambles (history)
**Purpose:** Browse, reopen, copy, or delete saved rambles.

**Layout:** shared header, then max-width 1180px content, padding 34px 30px 60px.
- Title row: "My rambles" (36px/700) + subline "<n> saved. Reopen one to keep tweaking it." On the right, a gradient "New ramble" button (goes to the workspace).
- Grid of cards: `repeat(auto-fill, minmax(330px, 1fr))`, gap 16px.
- Each card (`--surface`, `--line` border, radius 18px, padding 18px; hover lifts 4px and border turns violet):
  - Top row: date (12px `--text-faint`) and a small glowing status dot (alternating violet / pink / coral per card).
  - Title (17px/600) and a 2-line clamped snippet (14px, `--text-dim`).
  - Tag chips: small rounded pills color-coded by tag kind. Format tags use a violet wash + violet text; tone tags pink; character/other tags coral.
  - Action row: "Reopen" (gradient, loads that ramble into the workspace input), "Copy" (outline, flips to "Copied" ~1.5s), "Delete" (ghost, hover coral, removes the card).
- Empty state (when no cards): a Caveat Brush "All clear" headline, the line "No rambles yet. Go make a mess and clean it up.", and a "Start rambling" button.

---

## Interactions & Behavior
- **Navigation** is single-page screen switching (sign in -> workspace -> my rambles), driven by a `screen` state value. The wordmark and nav buttons switch screens; the account avatar returns to sign in (sign out); the sign in CTAs and Google button advance to the workspace.
- **Theme toggle** flips a `theme` value ("dark" | "light"). In the prototype this sets `data-theme` on the document root and all themeable colors are CSS variables. In React/Tailwind, drive this with a theme class / data attribute and Tailwind dark-mode tokens.
- **Record (simulated)** in the prototype: starts a 1s interval timer capped at 180s, shows the equalizer overlay, and on stop fills the input. In production, wire this to the real recording/transcription pipeline (3 minute cap).
- **Paste** fills the input directly (in production, use the clipboard / paste handler).
- **Babble it (the signature moment):** sets status to "babbling", shows the top glow-sweep bar and the spinner, then reveals the output with a typewriter stream (prototype advances ~4 chars every 16ms; a pink caret trails). On completion, status becomes "done", the caret stops, and Key points + Follow ups fade up. In production, replace the canned text with the engine's streamed output but keep the same reveal treatment and timing feel.
- **Copy / Share** write the result to the clipboard and briefly swap their label to confirm.
- **Selector dropdowns:** one open at a time; selecting closes and stores the choice; "Reset choices" clears all four. Choosing a Format from the "Fun" group vs "Practical" group changes which mock passage is shown (a hook for: practical formats -> clean output, fun formats -> playful output).
- **Animations / easing:** ambient blobs 19 to 26s ease-in-out infinite; glow sweep ~1.1s; caret blink 1s step-end; collapsible reveal ~0.5s ease (fade + 10px translate up); button hovers ~0.16s transform; CTA idle pulse ~3.2s ease-in-out. Keep motion tasteful (the brief calls it "balanced": signature transform animation plus micro-interactions, not maximal).
- **Hover states** are specified per component above (lifts, border color shifts toward an accent, background washes). Honor them; the brief stresses life and personality.

## State Management
Recreate these state values (names are suggestions):
- `screen`: "signin" | "workspace" | "rambles".
- `theme`: "dark" | "light".
- `authMode`: "signin" | "create" (drives the pill, heading, subline, CTA label).
- `inputText`: string (the ramble).
- `customVocab`: string.
- `selections`: { format, tone, character, accent } each string | null (null shows the prompt).
- `openDropdown`: which selector is open (or null).
- `isRecording`, `recordSeconds`: recording overlay + timer (cap 180).
- `status`: "idle" | "babbling" | "done"; `outputText` (streamed), plus the final result.
- `keyOpen`, `followOpen`: collapsible section open flags (default true).
- `rambles`: the saved-history list (id, title, snippet, tags, date, status dot color).
- Transient label flips for Copy/Share confirmations.
Data fetching: the transform call, the saved-rambles list (CRUD: reopen, copy, delete), and auth all hit the existing backend; the prototype mocks them.

## Selector option lists (exact content)
**Format (grouped)**
- Practical: Email, Quick note, Summary, AI prompt, Meeting notes, To do list, Bullet points, Status update, Report, Outline, Tweet, LinkedIn post, Journal entry.
- Fun: Tall tale, Rap verse, Spicy text, Soap opera, Meme caption, Poem, Haiku, Fairy tale, Conspiracy theory, Movie trailer, Stand up bit, Greek myth, Breaking news.

**Tone:** Professional, Friendly, Direct, Flirty, Sultry, Sarcastic, Wholesome, Deadpan, Hyped, Zen.

**Character:** Conspiracy theorist, Drama queen, Sportscaster, Pirate captain, Wise grandma, Malfunctioning robot, Noir detective, Influencer, Cult leader, Shakespeare.

**Accent:** Southern, Pirate, Valley girl, Posh British, New York, Australian, French, Surfer, Texan, Scottish.

(The brief targets roughly 36 formats; the prototype ships 26. Extend the Practical/Fun groups as desired.)

## Configurable knobs in the prototype
The prototype exposes three props you may map to app settings: `startScreen` (which screen loads first), `ambientGlow` (0 to 1, the blob opacity), and `signaturePulse` (boolean, the idle pulse on the Babble button).

## Assets
- Fonts: Space Grotesk and Caveat Brush from Google Fonts. Load both in the target app.
- Icons: a single inline outline microphone (on the sign in CTA). No icon library is required; use the codebase's existing icon set for the mic and any others.
- Imagery: none shipped. The ambient background is pure CSS radial gradients, not images. There are no logos or photos to migrate.
- The wordmark is type, not an image: "Ramble" (Space Grotesk 700) + "Babble" (Caveat Brush) with the primary gradient as text fill.

## Files
- `RambleBabble.dc.html` — the full interactive prototype for all three screens (sign in, workspace, my rambles), including the streaming transform animation, the dropdown stacks, the recording overlay, theming, and the My Rambles grid. Open it in a browser to see motion and interaction states. Read its markup and logic for exact values, copy, and timing.
