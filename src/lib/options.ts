// Shared definitions for output types (formats) and tones (voices).
// Single source of truth used by BOTH the UI (labels) and the server (model
// instructions). Formats = WHAT it becomes. Tones = HOW it sounds.
// A format and a tone combine: e.g. an Email in a Pirate voice.

export type OptionId = string;

export interface Option {
  id: OptionId;
  label: string;
  /** Short helper shown on the chip (tooltip). */
  hint: string;
  /** One-line "what you'll get" (formats only). */
  example?: string;
  /** Instruction handed to the cleanup model. */
  instruction: string;
  /** "fun" marks playful formats / character voices; default is serious. */
  group?: "work" | "fun";
}

export const OUTPUT_TYPES: Option[] = [
  {
    id: "note",
    label: "Cleaned note",
    hint: "Tidy, readable version",
    example: "Your words tidied into a clear, readable note.",
    instruction:
      "Rewrite as a clean, well-structured note. Keep all the substance, remove filler and repetition, organize into short paragraphs or bullets where it helps readability. Do NOT format it as an email or message: no 'Subject:' line, no greeting, and no sign-off. It is a standalone note.",
  },
  {
    id: "email",
    label: "Email",
    hint: "Ready-to-send message",
    example: "A ready-to-send email with subject, greeting, body, sign-off.",
    instruction:
      "Rewrite as a complete email with a greeting, clear body, and sign-off. Infer a reasonable subject line and place it on the first line prefixed with 'Subject: '. Do not invent specific names; use neutral placeholders only if truly needed.",
  },
  {
    id: "text",
    label: "Text message",
    hint: "Short and casual",
    example: "A short, casual message you can fire off.",
    instruction:
      "Rewrite as a brief, natural text message. Keep it short and conversational. No subject line, no sign-off.",
  },
  {
    id: "prompt",
    label: "AI prompt",
    hint: "Structured instruction for an AI",
    example: "A clear, well-scoped instruction to paste into any AI.",
    instruction:
      "Rewrite as a clear, well-scoped prompt for an AI assistant that captures EVERY point, requirement, detail, and example the speaker raised. Do not summarize or omit anything. Keep all their specifics intact. Format it as a numbered list with each item on its own line (use real line breaks between items, never one run-on paragraph). Make the intent explicit and phrase each item as a direct instruction.",
  },
  {
    id: "bug",
    label: "Bug report",
    hint: "Steps, expected, actual",
    example: "Summary, steps, expected vs actual, dev-ready.",
    instruction:
      "Rewrite as a structured bug report with these sections when the content supports them: Summary, Steps to Reproduce, Expected Result, Actual Result, and Notes. Only include sections you have information for.",
  },
  {
    id: "meeting",
    label: "Meeting notes",
    hint: "Decisions and action items",
    example: "Discussion, decisions, and action items, organized.",
    instruction:
      "Rewrite as meeting notes. Organize into Discussion, Decisions, and Action Items sections where applicable. Action items should be concise and start with a verb.",
  },
  {
    id: "idea",
    label: "Product idea",
    hint: "Problem, idea, why",
    example: "The problem, the idea, who it helps, and why.",
    instruction:
      "Rewrite as a crisp product idea write-up: the problem, the proposed idea, who it helps, and why it matters. Keep it tight and concrete.",
  },
  {
    id: "summary",
    label: "Professional summary",
    hint: "Polished paragraph",
    example: "A polished short paragraph that leads with the key point.",
    instruction:
      "Rewrite as a polished, professional summary in a few sentences or a short paragraph. Lead with the most important point.",
  },
  {
    id: "tldr",
    label: "Quick summary",
    hint: "Short TL;DR",
    example: "A 1 to 2 sentence TL;DR, just the gist.",
    instruction:
      "Condense this into a short TL;DR: one or two sentences or a few tight bullet points capturing only the essentials.",
  },
  {
    id: "todo",
    label: "To-do list",
    hint: "Actionable checklist",
    example: "An actionable checklist, each item starting with a verb.",
    instruction:
      "Turn this into a clear, actionable to-do list. Each item starts with a verb and is concrete. Group into short sections only if it genuinely helps.",
  },
  {
    id: "outline",
    label: "Outline",
    hint: "Structured points",
    example: "Your ideas structured into headings and sub-points.",
    instruction:
      "Organize this into a clear, hierarchical outline with headings and sub-points that capture the structure of the ideas.",
  },
  {
    id: "status",
    label: "Status update",
    hint: "Quick work update",
    example: "Done, in progress, next, blockers. Work-ready.",
    instruction:
      "Rewrite as a concise work status update: what's done, what's in progress, what's next, and any blockers. Include only the parts that apply.",
  },
  {
    id: "social",
    label: "Social post",
    hint: "X, Instagram, generic",
    example: "An engaging post for X, Instagram, or a generic feed.",
    instruction:
      "Rewrite as an engaging social media post suitable for X/Twitter or an Instagram caption. Strong hook first, easy to skim, natural and human (not salesy). Add a few relevant hashtags only if they fit.",
  },
  {
    id: "linkedin",
    label: "LinkedIn post",
    hint: "LinkedIn rules + limit",
    example: "A LinkedIn post with a strong hook, within their limit.",
    instruction:
      "Rewrite as a LinkedIn post. Lead with a strong hook in the first 200 characters (before LinkedIn's 'see more' cutoff). Use short, skimmable paragraphs and a clear takeaway. End with 3 to 5 relevant hashtags. Keep the entire post under 3,000 characters (LinkedIn's limit).",
  },
  {
    id: "letter",
    label: "Letter",
    hint: "Formal letter",
    example: "A formal letter with greeting, body, and sign-off.",
    instruction:
      "Rewrite as a proper formal letter with a greeting, a well-structured body, and a sign-off. Keep it appropriately formal.",
  },
  {
    id: "reply",
    label: "Reply",
    hint: "Draft a response",
    example: "A clear response drafted from what you want to say back.",
    instruction:
      "Draft a clear, direct reply or response based on what the speaker said they want to communicate back. Write only the message body: no 'Subject:' line and no sign-off. A short greeting is fine only if it genuinely reads like a natural reply.",
  },
  {
    id: "journal",
    label: "Journal entry",
    hint: "Personal reflection",
    example: "A reflective, first-person entry in your own voice.",
    instruction:
      "Rewrite as a reflective, first-person journal entry. Keep it personal and honest; tidy the language without making it formal.",
  },

  // ---- Just for Fun (formats) ----
  {
    id: "laugh",
    label: "Make Me Laugh",
    hint: "A quick joke or comedy bit",
    example: "A quick joke or comedic riff from what you said.",
    group: "fun",
    instruction:
      "Rewrite as a short, genuinely funny take on what the speaker said: a quick joke, witty bit, or comedic riff. Punch up, never down.",
  },
  {
    id: "trailer",
    label: "Movie Trailer",
    hint: "In a world…",
    example: "An 'In a world…' blockbuster trailer voiceover.",
    group: "fun",
    instruction:
      "Rewrite as an epic movie-trailer voiceover: 'In a world…' style, dramatic pauses, building tension, ending with a title drop based on the topic. Punchy and cinematic.",
  },
  {
    id: "tale",
    label: "Tall Tale",
    hint: "A tiny fictional story",
    example: "A tiny fictional story spun from your ramble.",
    group: "fun",
    instruction:
      "Spin what the speaker said into a tiny fictional short story (a few sentences) with a clear beginning, middle, and end, inspired by their content.",
  },
  {
    id: "meme",
    label: "Meme It",
    hint: "One punchy caption",
    example: "One punchy, screenshot-ready caption.",
    group: "fun",
    instruction:
      "Distill what they said into one punchy, screenshot-ready meme caption or one-liner. Short, funny, and shareable.",
  },
  {
    id: "hype",
    label: "Hype Machine",
    hint: "Maximum, unhinged hype",
    example: "Your words, cranked to the absolute maximum.",
    group: "fun",
    instruction:
      "Rewrite as COMPLETELY UNHINGED, maximum-volume hype. Go to the absolute furthest extreme and then push past it: ALL-CAPS bursts, explosive energy, wild superlatives, stacks of exclamation points, the most over-the-top enthusiasm imaginable. Do not hold back, do not play it safe, do not water it down. Keep the core subject true to what they said, but crank the intensity to the absolute maximum.",
  },
  {
    id: "poem",
    label: "Poem",
    hint: "A short poem",
    example: "Your ramble reshaped into a short poem.",
    group: "fun",
    instruction:
      "Rewrite as a short poem based on what they said: a few stanzas, evocative imagery, rhyme optional. Keep the core subject true to what they said.",
  },
  {
    id: "haiku",
    label: "Haiku",
    hint: "5-7-5, three lines",
    example: "A 3-line, 5-7-5 haiku of what you said.",
    group: "fun",
    instruction:
      "Rewrite as a haiku: three lines in a 5-7-5 syllable pattern capturing the essence of what they said.",
  },
  {
    id: "song",
    label: "Song / Rap",
    hint: "Lyrics with a hook",
    example: "Verse-and-chorus song lyrics, or a rap.",
    group: "fun",
    instruction:
      "Rewrite as song lyrics or a rap based on what they said: include a verse and a catchy chorus or hook, with rhythm and rhyme.",
  },
  {
    id: "nursery",
    label: "Nursery Rhyme",
    hint: "Sing-song kids' rhyme",
    example: "A bouncy, sing-song kids' rhyme.",
    group: "fun",
    instruction:
      "Rewrite as a short, bouncy nursery rhyme with simple rhyme and a sing-song rhythm, like a classic children's rhyme. Playful and lighthearted.",
  },
  {
    id: "bedtime",
    label: "Bedtime Story",
    hint: "Cozy little tale",
    example: "A cozy 'once upon a time' little tale.",
    group: "fun",
    instruction:
      "Rewrite as a cozy, gentle bedtime story (once upon a time), soothing and whimsical, a few short paragraphs, ending on a calm, sweet note.",
  },
];

export const TONES: Option[] = [
  // ---- Serious tones ----
  {
    id: "professional",
    label: "Professional",
    hint: "Workplace-appropriate",
    instruction:
      "Use a professional, workplace-appropriate tone: clear, competent, and businesslike. Straightforward, not fancy or flowery.",
  },
  {
    id: "friendly",
    label: "Friendly",
    hint: "Warm and approachable",
    instruction: "Use a warm, friendly, approachable tone.",
  },
  {
    id: "direct",
    label: "Direct",
    hint: "Brief and to the point",
    instruction: "Use a direct, concise tone. Get to the point with no padding.",
  },
  {
    id: "eloquent",
    label: "Eloquent",
    hint: "Articulate and elevated",
    instruction:
      "Use lavishly elevated, eloquent language: rich and sophisticated vocabulary, graceful sentence rhythm, and striking, memorable phrasing that makes the writer sound extraordinarily articulate and impressive. Lean fully into eloquence and do not hold back.",
  },
  {
    id: "keep",
    label: "Keep my voice",
    hint: "Your own natural voice, rewritten",
    instruction:
      "First, read THIS speaker's own natural voice from the transcript: their register (formal or casual), their personality (warm, blunt, funny, earnest, whatever they are), their vocabulary, and their rhythm. Then rewrite the message in THAT same individual voice, the way this particular person would write it on purpose, not the way they rambled out loud. Do NOT impose a generic style and do NOT default to casual or to formal; mirror whoever this speaker actually is. Genuinely rewrite and tighten it into clean, well-written prose, never a word-for-word transcript, while keeping it unmistakably their voice. Crucially, do NOT neutralize a distinctive voice into generic, professional-sounding prose: if they are casual, keep it casual and conversational; if blunt, keep it blunt; if warm, keep it warm. Preserve their personality and informality, just cleaned up.",
  },
  {
    id: "proper",
    label: "Proper English",
    hint: "Formal, impeccable grammar",
    instruction:
      "Use impeccable, formal English. Do not use contractions, slang, or casual phrasing, and do not end sentences with a preposition. Favor complete, grammatically correct sentences and a refined register.",
  },

  // ---- Character voices ----
  {
    id: "dramaqueen",
    label: "Drama Queen",
    hint: "Oh my GOD, you guys",
    group: "fun",
    instruction:
      "Deliver it as a modern DRAMA QUEEN having a total meltdown: gasping, breathless, overreacting to every tiny detail like it is the most catastrophic, life-RUINING event in human history. 'Oh my GOD, you guys.' 'I literally cannot.' 'This is the WORST.' 'Nobody understands what I am going through.' Capitalize random words for emphasis, trail off in despair, beg for sympathy. Bratty reality-TV energy, modern, never theatrical or old-timey.",
  },
  {
    id: "shakespeare",
    label: "Shakespearean",
    hint: "Thee, thou, hark",
    group: "fun",
    instruction:
      "Deliver it in full Elizabethan Shakespearean English: thee, thou, thy, thine, hath, doth, 'tis, 'twas, prithee, forsooth, hark, anon, verily. Use archaic verb endings (-eth and -est: 'he goeth', 'thou knowest'), inverted word order, and grandiose theatrical flourish. Address the reader as 'good sir' or 'fair maiden'. Lay it on thick.",
  },
  {
    id: "hillbilly",
    label: "Hillbilly",
    hint: "Backwoods Southern twang",
    group: "fun",
    instruction:
      "Deliver it in a thick, exaggerated backwoods Southern hillbilly voice, and RESPELL words phonetically to capture the twang, do not just add slang. Drop the g's (drainin', nuthin', fixin'), respell to match the accent (finger becomes fanger, debris becomes day-bree, window becomes winder, condensation becomes con-dun-SAY-shun, going becomes gonna or goin'), use double negatives (ain't smelled nuthin' neither), and pile on folksy slang (y'all, reckon, yonder, dang). Go full caricature.",
  },
  {
    id: "valley",
    label: "Valley Girl",
    hint: "Like, totally",
    group: "fun",
    instruction:
      "Deliver it as a stereotypical 1990s Valley Girl with constant uptalk and filler: cram in 'like', 'literally', 'totally', 'oh my GOD', 'I'm like', 'so', 'I can't even', 'as if', 'whatever', 'for sure'. End statements like they are questions. Air-headed, bubbly, breathless, easily distracted. 'I was like, literally, oh my god, so done?'",
  },
  {
    id: "surfer",
    label: "Surfer Dude",
    hint: "Gnarly, bro",
    group: "fun",
    instruction:
      "Deliver it as a mellow, stoked-out surfer dude with drawn-out vowels spelled out: 'duuude', 'braaah', 'whoa', 'gnarly', 'stoked', 'rad', 'sick', 'epic', 'totally tubular', 'no worries', 'right on'. Super laid-back and chill, everything is mellow even when it is a disaster.",
  },
  {
    id: "pirate",
    label: "Pirate",
    hint: "Arr, matey",
    group: "fun",
    instruction:
      "Deliver it as a swashbuckling pirate using pirate GRAMMAR, not just words: 'be' for is/are ('the report be done'), 'me' for my ('me hearties'), 'ye' for you, 'yer' for your, and drop the g's. Pile on 'arr', 'avast', 'ahoy', 'matey', 'shiver me timbers', 'walk the plank', 'landlubber', 'booty', 'aye'. Salty sea-dog through and through.",
  },
  {
    id: "sportscaster",
    label: "Sportscaster",
    hint: "Play-by-play",
    group: "fun",
    instruction:
      "Deliver it as a frenzied live sports announcer calling play-by-play in present tense, building to an explosive, screaming, climactic call. 'AND HERE WE GO...' 'OH, ARE YOU KIDDING ME?!' 'HE SHOOTS...' 'UNBELIEVABLE, FOLKS!' Rising intensity, capitalized roars at the peak, the crowd goes wild.",
  },
  {
    id: "infomercial",
    label: "Infomercial",
    hint: "But wait, there's more",
    group: "fun",
    instruction:
      "Deliver it as a breathless late-night infomercial pitchman. Open with a frustrated problem ('Tired of...? Sick of...?'), hit the miracle solution, then 'BUT WAIT, THERE'S MORE!', a fake price, 'ACT NOW!', 'operators are standing by!', 'not sold in stores!'. Way too excited about everything.",
  },
  {
    id: "noir",
    label: "Film Noir",
    hint: "Hard-boiled detective",
    group: "fun",
    instruction:
      "Deliver it as a 1940s hard-boiled film-noir detective narrating a case: short, punchy, world-weary sentences. Rain-slicked streets, cigarette smoke, cynical metaphors ('the news hit me like a sucker punch'). Call people 'pal', 'kid', 'doll', 'the dame'. Brooding and jaded, every detail drips with doom. 'It was a cold night, and the trouble was just gettin' started.'",
  },
  {
    id: "conspiracy",
    label: "Conspiracy Theorist",
    hint: "Wake up, sheeple",
    group: "fun",
    instruction:
      "Deliver it as an unhinged conspiracy theorist connecting unrelated dots: 'wake up', 'do your own research', 'they don't want you to know this', 'it's all connected', 'follow the money', 'open your eyes', 'that's what THEY want you to think'. Breathless paranoia, ALL CAPS for the 'truth', absurd leaps of logic. Comedic and ridiculous, never hateful or targeting real groups.",
  },
  {
    id: "standup",
    label: "Stand-Up (Adult)",
    hint: "Raunchy club bit",
    group: "fun",
    instruction:
      "Deliver it as a raunchy adult stand-up comedian working a late-night club: 'So what's the deal with...', 'You ever notice...', 'Am I right?', clear setups and punchlines, act-outs, crowd work, crude and unfiltered with real bite. Aim jokes at the subject and situation, not at real protected groups.",
  },
  {
    id: "genz",
    label: "Gen Z",
    hint: "No cap, fr fr",
    group: "fun",
    instruction:
      "Deliver it in extremely online Gen Z slang, mostly lowercase and chaotic: 'no cap', 'fr fr', 'it's giving', 'rizz', 'slay', 'bussin', 'bestie', 'lowkey', 'highkey', 'based', 'mid', 'cooked', 'ate', 'the way that...', 'not me...'. Ironic, exaggerated, terminally online. Spell reactions out ('im dead', 'screaming') instead of using emojis.",
  },
  {
    id: "millennial",
    label: "Millennial",
    hint: "Adulting is hard",
    group: "fun",
    instruction:
      "Deliver it as an anxious, ironic Millennial: 'adulting is hard', 'I can't even', 'literally dying', 'this is everything', 'treat yourself', 'the struggle is real', 'send help', side-hustle and burnout jokes, 90s nostalgia, way too much coffee, exhausted but quippy.",
  },
  {
    id: "genx",
    label: "Gen X",
    hint: "Whatever",
    group: "fun",
    instruction:
      "Deliver it as a sardonic, unbothered Gen X slacker: dry sarcasm, heavy eye-rolling, 'whatever', 'meh', 'big deal', 'been there', grunge-era apathy, 'back in my day we didn't even HAVE...'. Cynical, deadpan, thoroughly unimpressed, allergic to enthusiasm.",
  },
  {
    id: "boomer",
    label: "Boomer",
    hint: "Back in my day",
    group: "fun",
    instruction:
      "Deliver it as an earnest, out-of-touch Baby Boomer Facebook post: random Capitalized Words, lots of ellipses..., extra spaces, 'Back In My Day', 'kids these days', mild misuse of modern slang, a heartfelt unrelated tangent, and a sign-off with a first name (maybe a 'God Bless') at the end.",
  },
];

export const DEFAULT_OUTPUT_TYPE = OUTPUT_TYPES[0].id;
export const DEFAULT_TONE = TONES[0].id;

export function getOutputType(id: string): Option | undefined {
  return OUTPUT_TYPES.find((o) => o.id === id);
}

export function getTone(id: string): Option | undefined {
  return TONES.find((t) => t.id === id);
}
