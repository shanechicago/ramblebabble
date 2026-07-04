/**
 * quality-sweep.ts  —  READ-ONLY quality-audit harness for RambleBabble.
 *
 * It does NOT modify prompts, options, or app code. It calls the SAME cleanup
 * path the app uses (getProvider().cleanup -> Claude Sonnet 4.6, reusing
 * CLEANUP_SYSTEM_PROMPT + buildCleanupUserMessage exactly), then makes a
 * SEPARATE Claude call (the grader) to score each result against a rubric.
 *
 * Run from the project root:
 *   npx --yes tsx scripts/quality-sweep.ts               (print the estimate, do nothing)
 *   npx --yes tsx scripts/quality-sweep.ts --smoke       (10-case smoke test + estimate)
 *   npx --yes tsx scripts/quality-sweep.ts --run=focused (stacking-critical set)
 *   npx --yes tsx scripts/quality-sweep.ts --run=full    (every valid combo)
 *
 * Results stream to scripts/quality-report/ (results.csv + summary.md) as they
 * complete, so a crash never loses finished work, and a re-run resumes.
 */

import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";

import { getProvider } from "../src/lib/providers/index";
import type { CleanupInput, CleanupResult } from "../src/lib/providers/types";
import { OUTPUT_TYPES, TONES, ACCENTS, PERSONAS } from "../src/lib/options";
import type { Option } from "../src/lib/options";
import { CLEANUP_SYSTEM_PROMPT } from "../src/lib/prompt";

// ---------------------------------------------------------------------------
// 0. Load .env.local so ANTHROPIC_API_KEY (and CLEANUP_PROVIDER etc.) are set,
//    exactly like the app gets them at runtime. Never prints any secret.
// ---------------------------------------------------------------------------
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let val = m[2];
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(m[1] in process.env)) process.env[m[1]] = val;
  }
}
loadEnvLocal();

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set (checked .env.local). Aborting.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 1. ONE fixed test transcript for every run — messy, rambling, 3 distinct
//    points with names and numbers, so the grader can check what survived.
// ---------------------------------------------------------------------------
const TRANSCRIPT = `ok so I need to get this out before I forget, um, three things really. First, the Henderson invoice, it's number 4471, it's still unpaid and it's been 45 days now, so I gotta chase Marcus about it, he's the AP guy over there. Second thing, um, the team offsite, we pushed it to March 12th, not the 5th like we said, because the Riverside venue got double-booked, so it's at the Oakwood Center now, and I need to tell everybody the new date and the new place. And the third thing, oh yeah, the printer on the second floor is busted again, third time this month, it's the Canon one and it keeps jamming, we should honestly just replace it, so somebody's gotta put in a request for a new one. That's it, those are the three things I didn't wanna forget.`;

const TRACKED_FACTS = [
  "The Henderson invoice, number 4471, is unpaid and 45 days overdue; the speaker needs to chase Marcus (the AP contact) about it.",
  "The team offsite moved from March 5th to March 12th because the Riverside venue was double-booked; it is now at the Oakwood Center, and everyone must be told the new date and place.",
  "The second-floor Canon printer is broken again (third time this month) and keeps jamming; it should be replaced, and someone needs to put in a request for a new one.",
];

// ---------------------------------------------------------------------------
// 2. Config
// ---------------------------------------------------------------------------
const CONCURRENCY = Number(process.env.SWEEP_CONCURRENCY || 5);
const GRADER_MODEL = process.env.ANTHROPIC_CLEANUP_MODEL || "claude-sonnet-4-6";
const OUT_DIR = path.resolve(process.cwd(), "scripts", "quality-report");
const CSV_PATH = path.join(OUT_DIR, "results.csv");
const SUMMARY_PATH = path.join(OUT_DIR, "summary.md");

const grader = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 5,
});

const NOTE = OUTPUT_TYPES.find((o) => o.id === "note")!; // neutral format for style solos/combos
const byId = (list: Option[], id: string) => list.find((o) => o.id === id)!;

// ---------------------------------------------------------------------------
// 3. Test matrix
// ---------------------------------------------------------------------------
interface Layer {
  dial: "tone" | "accent" | "character";
  label: string;
  hint: string;
}
interface TestCase {
  id: string;
  group: string;
  format: Option;
  tone?: Option;
  accent?: Option;
  persona?: Option;
  layers: Layer[]; // the selected STYLE layers (tone/accent/character), not format
}

function layersOf(tone?: Option, accent?: Option, persona?: Option): Layer[] {
  const out: Layer[] = [];
  if (tone) out.push({ dial: "tone", label: tone.label, hint: tone.hint });
  if (accent) out.push({ dial: "accent", label: accent.label, hint: accent.hint });
  if (persona) out.push({ dial: "character", label: persona.label, hint: persona.hint });
  return out;
}
function mk(group: string, format: Option, tone?: Option, accent?: Option, persona?: Option): TestCase {
  const id = [group, format.id, tone?.id ?? "-", accent?.id ?? "-", persona?.id ?? "-"].join("|");
  return { id, group, format, tone, accent, persona, layers: layersOf(tone, accent, persona) };
}

// Skip genuinely nonsensical pairings: spicy tones welded onto strictly
// transactional work formats.
const SPICY = new Set(["flirty", "sultry", "romantic", "seductive", "steamy", "naughty"]);
const TRANSACTIONAL = new Set(["bug", "prompt", "meeting", "agenda", "status", "todo", "memo"]);
const nonsensicalFormatTone = (f: Option, t: Option) => TRANSACTIONAL.has(f.id) && SPICY.has(t.id);

function buildSolos(): TestCase[] {
  const cases: TestCase[] = [];
  for (const f of OUTPUT_TYPES) cases.push(mk("solo-format", f));
  for (const t of TONES) cases.push(mk("solo-tone", NOTE, t));
  for (const a of ACCENTS) cases.push(mk("solo-accent", NOTE, undefined, a));
  for (const p of PERSONAS) cases.push(mk("solo-character", NOTE, undefined, undefined, p));
  return cases;
}
function buildTwoLayer(): TestCase[] {
  const cases: TestCase[] = [];
  for (const t of TONES) for (const p of PERSONAS) cases.push(mk("2L-tone+character", NOTE, t, undefined, p));
  for (const a of ACCENTS) for (const p of PERSONAS) cases.push(mk("2L-accent+character", NOTE, undefined, a, p));
  for (const f of OUTPUT_TYPES) for (const t of TONES) if (!nonsensicalFormatTone(f, t)) cases.push(mk("2L-format+tone", f, t));
  for (const f of OUTPUT_TYPES) for (const p of PERSONAS) cases.push(mk("2L-format+character", f, undefined, undefined, p));
  for (const f of OUTPUT_TYPES) for (const a of ACCENTS) cases.push(mk("2L-format+accent", f, undefined, a));
  return cases;
}
// Worst-case stacks: a quiet/subtle tone under a loud CHARACTER + a loud ACCENT.
const QUIET_TONES = ["sultry", "romantic", "flirty"];
const LOUD_CHARACTERS = ["dramaqueen", "standup", "villain", "sportscaster"];
const LOUD_ACCENTS = ["shakespeare", "pirate", "scottish", "cowboy"];
function buildThreeLayer(): TestCase[] {
  const cases: TestCase[] = [];
  for (const tid of QUIET_TONES)
    for (const pid of LOUD_CHARACTERS)
      for (const aid of LOUD_ACCENTS)
        cases.push(mk("3L-stress", NOTE, byId(TONES, tid), byId(ACCENTS, aid), byId(PERSONAS, pid)));
  return cases; // 3 x 4 x 4 = 48
}

function buildMatrix(scope: "full" | "focused"): TestCase[] {
  const solos = buildSolos();
  const three = buildThreeLayer();
  if (scope === "focused") {
    // Stacking-critical set: solos + the cross-dial combos that stress a voice
    // against a voice + the worst-case three-layer stacks. Skips the big
    // FORMAT x (tone/character/accent) matrix.
    const twoStacking = buildTwoLayer().filter((c) =>
      c.group === "2L-tone+character" || c.group === "2L-accent+character",
    );
    return [...solos, ...twoStacking, ...three];
  }
  return [...solos, ...buildTwoLayer(), ...three];
}

// Smoke: 10 hand-picked cases hitting every path.
function buildSmoke(): TestCase[] {
  return [
    mk("solo-tone", NOTE, byId(TONES, "sultry")),
    mk("solo-character", NOTE, undefined, undefined, byId(PERSONAS, "standup")),
    mk("solo-format", byId(OUTPUT_TYPES, "email")),
    mk("2L-tone+character", NOTE, byId(TONES, "sultry"), undefined, byId(PERSONAS, "dramaqueen")),
    mk("2L-format+character", byId(OUTPUT_TYPES, "email"), undefined, undefined, byId(PERSONAS, "standup")),
    mk("2L-accent+character", NOTE, undefined, byId(ACCENTS, "shakespeare"), byId(PERSONAS, "villain")),
    mk("2L-format+tone", byId(OUTPUT_TYPES, "proposal"), byId(TONES, "persuasive")),
    mk("3L-stress", NOTE, byId(TONES, "sultry"), byId(ACCENTS, "shakespeare"), byId(PERSONAS, "dramaqueen")),
    mk("3L-stress", NOTE, byId(TONES, "romantic"), byId(ACCENTS, "scottish"), byId(PERSONAS, "sportscaster")),
    mk("3L-stress", NOTE, byId(TONES, "flirty"), byId(ACCENTS, "pirate"), byId(PERSONAS, "standup")),
  ];
}

// ---------------------------------------------------------------------------
// 4. Cleanup runner — builds the CleanupInput exactly like src/app/api/cleanup.
// ---------------------------------------------------------------------------
function toInput(c: TestCase): CleanupInput {
  const hasCharacter = !!c.accent || !!c.persona;
  const kind: "work" | "fun" = c.format.group === "fun" || hasCharacter ? "fun" : "work";
  return {
    transcript: TRANSCRIPT,
    outputInstruction: c.format.instruction,
    toneInstruction: c.tone?.instruction,
    accentInstruction: c.accent?.instruction,
    personaInstruction: c.persona?.instruction,
    kind,
  };
}

// ---------------------------------------------------------------------------
// 5. Grader — a SEPARATE Claude call. It is NOT told which layer is loud or
//    quiet; it only sees the selected layers (label + hint) and the output.
// ---------------------------------------------------------------------------
const GRADER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    format_held: { type: "integer" },
    layers: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          dial: { type: "string" },
          label: { type: "string" },
          present: { type: "integer" },
        },
        required: ["dial", "label", "present"],
      },
    },
    stacking_balance: { type: "integer" },
    message_survived: { type: "integer" },
    overall: { type: "integer" },
    weak_or_missing_layer: { type: "string" },
    reason: { type: "string" },
  },
  required: [
    "format_held", "layers", "stacking_balance", "message_survived",
    "overall", "weak_or_missing_layer", "reason",
  ],
};

interface Grade {
  format_held: number;
  layers: { dial: string; label: string; present: number }[];
  stacking_balance: number;
  message_survived: number;
  overall: number;
  weak_or_missing_layer: string;
  reason: string;
}

function graderUserMessage(c: TestCase, r: CleanupResult): string {
  const layerLines = c.layers.length
    ? c.layers.map((l) => `- ${l.dial.toUpperCase()}: ${l.label} (${l.hint})`).join("\n")
    : "(none — this run selected only a format)";
  const facts = TRACKED_FACTS.map((f, i) => `${i + 1}. ${f}`).join("\n");
  const body = r.cleaned;
  const extras =
    r.keyPoints.length || r.followUps.length
      ? `\n\nSEPARATE EXTRACTED POINTS (the app shows these in their own side panel; they are NOT part of the formatted output above — do NOT judge the requested format on them; use them only to help confirm the message survived):\n` +
        (r.keyPoints.length ? `Key points:\n- ${r.keyPoints.join("\n- ")}\n` : "") +
        (r.followUps.length ? `Follow-ups:\n- ${r.followUps.join("\n- ")}` : "")
      : "";
  return `You are a strict quality grader for a rambling-to-text tool. Score the OUTPUT below. Be harsh and specific. Do not be generous.

REQUESTED FORMAT: ${c.format.label} (${c.format.hint})

SELECTED STYLE LAYERS (each must be clearly and correctly present in the output):
${layerLines}

THE ORIGINAL SPEAKER'S POINTS (all must survive, clearly, in the output):
${facts}

FORMATTED OUTPUT TO GRADE (judge the requested format and overall on THIS only):
"""
${body}
"""${extras}

Score each 0, 1, or 2 (2 = fully, 1 = partial, 0 = no):
- format_held: is the FORMATTED OUTPUT above actually in the requested format? (Ignore the separate extracted points.)
- layers[]: for EACH selected style layer, is that tone/accent/character clearly and correctly present? Return one entry per selected layer with its dial, label, and present score. If no layers were selected, return an empty array.
- stacking_balance: when 2+ style layers are selected, is EACH clearly present at once, or did one bury another? (2 = all balanced, 0 = one dominated). If fewer than 2 style layers, return 2.
- message_survived: are ALL three of the speaker's points, with their names and numbers, still present and clear?
- overall: does it land? (fun = genuinely funny/on-voice; work = clean and usable).
- weak_or_missing_layer: if any layer is weak or missing, name it (e.g. "TONE: Sultry buried"). Empty string if all fine.
- reason: one short line explaining any score below 2.`;
}

async function grade(c: TestCase, r: CleanupResult): Promise<Grade> {
  const res = await grader.messages.create({
    model: GRADER_MODEL,
    max_tokens: 1024,
    temperature: 0,
    messages: [{ role: "user", content: graderUserMessage(c, r) }],
    // Schema-enforced JSON, same mechanism the app uses for cleanup.
    output_config: { format: { type: "json_schema", schema: GRADER_SCHEMA } },
  });
  let raw = "{}";
  for (const b of res.content) if (b.type === "text") { raw = b.text; break; }
  const g = JSON.parse(raw) as Grade;
  const clamp = (n: number) => Math.max(0, Math.min(2, Math.round(Number(n) || 0)));
  return {
    format_held: clamp(g.format_held),
    layers: (g.layers || []).map((l) => ({ dial: l.dial, label: l.label, present: clamp(l.present) })),
    stacking_balance: clamp(g.stacking_balance),
    message_survived: clamp(g.message_survived),
    overall: clamp(g.overall),
    weak_or_missing_layer: g.weak_or_missing_layer || "",
    reason: g.reason || "",
  };
}

// PASS = strict: format held, message survived, every selected style layer
// present, and (for 2+ layers) balanced stacking — all == 2.
function isPass(c: TestCase, g: Grade): boolean {
  if (g.message_survived !== 2) return false;
  if (!g.layers.every((l) => l.present === 2)) return false;
  if (c.layers.length >= 2 && g.stacking_balance !== 2) return false;
  return true;
}

// ---------------------------------------------------------------------------
// 6. Cost estimate
// ---------------------------------------------------------------------------
function estimate(count: number) {
  const IN = 3 / 1e6, OUT = 15 / 1e6; // Sonnet 4.6 $/token
  const sysTok = Math.ceil(CLEANUP_SYSTEM_PROMPT.length / 4);
  const cleanupIn = sysTok + Math.ceil((TRANSCRIPT.length + 400) / 4);
  const cleanupOut = 450;
  const graderIn = Math.ceil((cleanupOut * 4 + TRACKED_FACTS.join(" ").length + 900) / 4);
  const graderOut = 150;
  const perCase = (cleanupIn + graderIn) * IN + (cleanupOut + graderOut) * OUT;
  return { count, calls: count * 2, usd: count * perCase };
}

// ---------------------------------------------------------------------------
// 7. CSV / resume / progress
// ---------------------------------------------------------------------------
const CSV_HEADER =
  "id,group,format,tone,accent,character,kind,format_held,layers_present,stacking,message_survived,overall,pass,reason,error\n";
function csvCell(s: string | number) { return `"${String(s).replace(/"/g, '""').replace(/\r?\n/g, " ")}"`; }
function ensureCsv() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  if (!fs.existsSync(CSV_PATH)) fs.writeFileSync(CSV_PATH, CSV_HEADER);
}
function doneIds(): Set<string> {
  if (!fs.existsSync(CSV_PATH)) return new Set();
  const ids = new Set<string>();
  const lines = fs.readFileSync(CSV_PATH, "utf8").split(/\r?\n/).slice(1);
  for (const line of lines) {
    const m = line.match(/^"((?:[^"]|"")*)"/);
    if (m) ids.add(m[1].replace(/""/g, '"'));
  }
  return ids;
}
function appendRow(c: TestCase, g: Grade | null, pass: boolean, err: string) {
  const layersPresent = g ? g.layers.map((l) => `${l.dial}:${l.present}`).join(";") : "";
  const row = [
    c.id, c.group, c.format.label, c.tone?.label ?? "", c.accent?.label ?? "", c.persona?.label ?? "",
    toInput(c).kind,
    g ? g.format_held : "", layersPresent, g ? g.stacking_balance : "",
    g ? g.message_survived : "", g ? g.overall : "",
    err ? "ERROR" : pass ? "PASS" : "FAIL",
    g ? (g.reason || (g.weak_or_missing_layer ? `weak: ${g.weak_or_missing_layer}` : "")) : "",
    err,
  ].map(csvCell).join(",");
  fs.appendFileSync(CSV_PATH, row + "\n");
}

// ---------------------------------------------------------------------------
// 8. Runner
// ---------------------------------------------------------------------------
async function runCase(c: TestCase): Promise<{ pass: boolean; err: string }> {
  try {
    const result = await getProvider().cleanup(toInput(c));
    const g = await grade(c, result);
    const pass = isPass(c, g);
    appendRow(c, g, pass, "");
    return { pass, err: "" };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    appendRow(c, null, false, err);
    return { pass: false, err };
  }
}

async function runPool(cases: TestCase[]) {
  const total = cases.length;
  let done = 0, pass = 0, fail = 0, errs = 0;
  const started = Date.now();
  let idx = 0;
  async function worker() {
    while (idx < cases.length) {
      const c = cases[idx++];
      const r = await runCase(c);
      done++;
      if (r.err) errs++; else if (r.pass) pass++; else fail++;
      if (done % 20 === 0 || done === total) {
        const rate = done / ((Date.now() - started) / 1000);
        const eta = rate > 0 ? Math.round((total - done) / rate) : 0;
        console.log(`  ${done}/${total} done  |  pass ${pass}  fail ${fail}  err ${errs}  |  ~${eta}s left`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, total) }, worker));
  return { total, pass, fail, errs };
}

// ---------------------------------------------------------------------------
// 9. Summary
// ---------------------------------------------------------------------------
function writeSummary() {
  const lines = fs.readFileSync(CSV_PATH, "utf8").split(/\r?\n/).slice(1).filter(Boolean);
  const rows = lines.map((line) => {
    const cells: string[] = [];
    const re = /"((?:[^"]|"")*)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line))) cells.push(m[1].replace(/""/g, '"'));
    return {
      id: cells[0], group: cells[1], format: cells[2], tone: cells[3], accent: cells[4],
      character: cells[5], formatHeld: Number(cells[7] || 0), overall: Number(cells[11] || 0),
      verdict: cells[12], reason: cells[13], error: cells[14],
    };
  });
  const total = rows.length;
  const passes = rows.filter((r) => r.verdict === "PASS").length;
  const fails = rows.filter((r) => r.verdict === "FAIL");
  const errors = rows.filter((r) => r.verdict === "ERROR");

  // Failure-pattern buckets from the grader's reason text.
  const patterns: Record<string, number> = {};
  for (const f of fails) {
    const r = f.reason.toLowerCase();
    const bucket =
      /buried|dominat|lost|overpower|drown|missing|weak/.test(r) ? "a style layer buried / missing under another" :
      /format/.test(r) ? "output not in the requested format" :
      /point|fact|number|name|survив|survive|dropped|missing point/.test(r) ? "message / points not fully preserved" :
      /funny|land|flat|generic|voice/.test(r) ? "fun output did not land / off-voice" :
      "other";
    patterns[bucket] = (patterns[bucket] || 0) + 1;
  }

  const worst = [...fails].sort((a, b) => a.overall - b.overall).slice(0, 25);

  let md = `# RambleBabble quality sweep\n\n`;
  md += `Total graded: **${total}**  |  Pass: **${passes}** (${((passes / total) * 100 || 0).toFixed(1)}%)  |  Fail: **${fails.length}**  |  Errors: **${errors.length}**\n\n`;
  md += `## Most common failure patterns\n`;
  for (const [k, v] of Object.entries(patterns).sort((a, b) => b[1] - a[1])) md += `- ${v}x — ${k}\n`;
  md += `\n## Worst failures (lowest overall)\n`;
  for (const w of worst) {
    const combo = [w.format, w.tone, w.accent, w.character].filter(Boolean).join(" + ");
    md += `- **${combo}** — ${w.reason || w.error}\n`;
  }
  md += `\n## Format survival (did the requested format hold, even on passing runs)\n`;
  const graded = rows.filter((r) => !r.error);
  const fFull = graded.filter((r) => r.formatHeld >= 2).length;
  const fPart = graded.filter((r) => r.formatHeld === 1).length;
  const fNone = graded.filter((r) => r.formatHeld === 0).length;
  md += `- Held fully: ${fFull}  |  Partial: ${fPart}  |  Ignored: ${fNone}\n`;
  const collapsed = graded.filter((r) => r.formatHeld === 0).slice(0, 25);
  if (collapsed.length) {
    md += `\nRequested format entirely ignored (style steamrolled the structure):\n`;
    for (const r of collapsed) md += `- ${[r.format, r.tone, r.accent, r.character].filter(Boolean).join(" + ")}\n`;
  }
  fs.writeFileSync(SUMMARY_PATH, md);
  return { total, passes, fails: fails.length, errors: errors.length, patterns, worst };
}

// ---------------------------------------------------------------------------
// 10. Main
// ---------------------------------------------------------------------------
async function main() {
  const arg = process.argv.slice(2);
  const smoke = arg.includes("--smoke");
  const runArg = arg.find((a) => a.startsWith("--run="));

  const fullCount = buildMatrix("full").length;
  const focusedCount = buildMatrix("focused").length;
  const eF = estimate(fullCount), eC = estimate(focusedCount);
  console.log("=== RambleBabble quality sweep ===");
  console.log(`Catalog: ${OUTPUT_TYPES.length} formats, ${TONES.length} tones, ${ACCENTS.length} accents, ${PERSONAS.length} characters`);
  console.log(`FOCUSED scope: ${eC.count} cases, ${eC.calls} Claude calls, ~$${eC.usd.toFixed(2)}`);
  console.log(`FULL scope:    ${eF.count} cases, ${eF.calls} Claude calls, ~$${eF.usd.toFixed(2)}`);

  if (smoke) {
    console.log(`\n--- SMOKE TEST (10 cases) ---`);
    ensureCsv();
    const cases = buildSmoke();
    for (const c of cases) {
      const { pass, err } = await runCase(c);
      const combo = [c.format.label, c.tone?.label, c.accent?.label, c.persona?.label].filter(Boolean).join(" + ");
      console.log(`  [${err ? "ERROR" : pass ? "PASS" : "FAIL"}] ${combo}${err ? `  (${err})` : ""}`);
    }
    console.log(`\nSmoke results written to ${CSV_PATH}`);
    return;
  }

  if (!runArg) {
    console.log(`\n(Estimate only. Re-run with --smoke, --run=focused, or --run=full.)`);
    return;
  }

  const scope = runArg.endsWith("full") ? "full" : "focused";
  const all = buildMatrix(scope);
  ensureCsv();
  const done = doneIds();
  const todo = all.filter((c) => !done.has(c.id));
  console.log(`\n--- FULL SWEEP (${scope}) --- ${todo.length} to run (${done.size} already done)`);
  const res = await runPool(todo);
  const sum = writeSummary();
  console.log(`\n=== DONE (${scope}) ===`);
  console.log(`Graded ${sum.total}. Pass ${sum.passes} (${((sum.passes / sum.total) * 100).toFixed(1)}%), Fail ${sum.fails}, Errors ${sum.errors}.`);
  console.log(`Report: ${SUMMARY_PATH}`);
  void res;
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
