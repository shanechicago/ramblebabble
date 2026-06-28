# RambleBabble

**Talk messy. Leave polished.**

Record or paste messy spoken thoughts and turn them into clean, usable written
text. A single-page Next.js app with secure server-side transcription and AI
cleanup.

## Stack

- **Next.js (App Router) + TypeScript + Tailwind CSS**
- **OpenAI** — speech-to-text (`whisper-1`) for transcription, GPT
  (`gpt-4o-mini`) for cleanup
- Deploy target: **Vercel**

API keys live only in server-side environment variables. The browser never sees
them — it only calls the app's own `/api/transcribe` and `/api/cleanup` routes.

## Getting started

```bash
cp .env.local.example .env.local
# add your OPENAI_API_KEY to .env.local
npm install
npm run dev
```

Open http://localhost:3000.

## How it works

1. **Record** a ramble with your mic, or **paste** messy text into the editable
   box.
2. Recorded audio is sent to `POST /api/transcribe`, which returns a raw
   transcript. **Audio is never stored** — it's processed in memory only.
3. Pick an **output type**, a **tone**, and optionally add **custom vocabulary**
   (names, brands, acronyms to keep correct).
4. `POST /api/cleanup` sends the transcript + options to the model and returns a
   polished version plus optional key points.
5. **Copy**, **Try again**, or **Clear**.

## Architecture

```
src/
  app/
    api/transcribe/route.ts   # secure STT route (multipart audio in)
    api/cleanup/route.ts      # secure cleanup route (JSON in)
    page.tsx                  # renders the single-page app
  components/
    RambleBabbleApp.tsx       # all UI state & flow (no provider logic here)
    useRecorder.ts            # mic + MediaRecorder hook
  lib/
    options.ts                # output types + tones (shared UI/server)
    prompt.ts                 # cleanup prompt (with anti-injection guard)
    providers/
      types.ts                # AIProvider interface
      openai.ts               # OpenAI implementation
      index.ts                # provider registry / selector
```

### Adding another provider

Implement the `AIProvider` interface in `src/lib/providers/<name>.ts`, register
it in `src/lib/providers/index.ts`, and set `AI_PROVIDER=<name>`. No UI or route
changes needed — components never import a vendor SDK directly.

## Notes & limits

- Spoken phrases are **never treated as commands** — the transcript is always
  rewritten as content, never executed as instructions.
- Each ramble is capped at **3 minutes** (auto-stops, with a warning at 2:30).
  Upload size is checked before sending and capped at ~25 MB (OpenAI limit) —
  too-large files fail with a friendly message, never silently. v0 does not
  chunk audio. These limits live in `src/lib/config.ts`.
- MVP scope only: no auth, payments, dashboards, folders, teams, or
  integrations.

## Deploy to Vercel

Push to a Git repo, import into Vercel, and set `OPENAI_API_KEY` (plus any
optional overrides) as an environment variable in the project settings.
