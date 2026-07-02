// Four independent, stackable axes the user combines into one output:
//   FORMAT  = WHAT it becomes (structure)        e.g. Email, Tall tale
//   TONE    = the register for everyday writing  e.g. Professional, Direct
//   ACCENT  = HOW it sounds (dialect)             e.g. Hillbilly, Pirate
//   CHARACTER = WHO is saying it (persona)        e.g. Conspiracy theorist
// Any can be combined: Tall tale + Hillbilly + Conspiracy theorist.
// This file is the single source of truth for labels AND model instructions.

export type OptionId = string;

export interface Option {
  id: OptionId;
  label: string;
  hint: string;
  example?: string;
  instruction: string;
  /** "fun" marks playful formats; default is the serious "work" group. */
  group?: "work" | "fun";
}

// ---------- FORMAT: what it becomes ----------
export const OUTPUT_TYPES: Option[] = [
  // ===== Useful =====
  { id: "note", label: "Clean & Concise", hint: "Tidy, concise, structured", example: "Your ramble tidied into clear, concise, structured text.", instruction: "Rewrite as a clean, ORGANIZED, well-structured version of what they said. This is not a light grammar pass: actively reorganize their rambling so related points are grouped together by topic, scattered mentions of the same subject are consolidated into one place, and the whole thing flows logically from a clear opening through grouped points. Make it noticeably more concise than the ramble: cut filler, repetition, false starts, and tangential noise while keeping every real point. Use short paragraphs, and use bullets or brief sections when the content has distinct parts. Do NOT format it as an email or message: no 'Subject:' line, no greeting, and no sign-off. The result is a standalone, organized, concise version of their thoughts, ready to read, paste, or speak." },
  { id: "doc", label: "Word document", hint: "Title, headings, tidy body", example: "A formatted document with a title and headings, ready for Word or Docs.", instruction: "Rewrite as a clean, well-structured document ready to drop into Microsoft Word or Google Docs: a clear title line at the top, logical headings or sections where the content supports them, and tidy paragraphs or bullet lists under each. Polished, professional document formatting. No email greeting and no sign-off." },
  { id: "email", label: "Email", hint: "Ready-to-send message", example: "A ready-to-send email with subject, greeting, body, sign-off.", instruction: "Rewrite as a complete email with a greeting, clear body, and sign-off. Infer a reasonable subject line and place it on the first line prefixed with 'Subject: '. Do not invent specific names; use neutral placeholders only if truly needed." },
  { id: "reply", label: "Reply", hint: "Draft a response", example: "A clear response drafted from what you want to say back.", instruction: "Draft a clear, direct reply based on what the speaker said they want to communicate back. Write only the message body: no 'Subject:' line and no sign-off. A short greeting is fine only if it reads like a natural reply." },
  { id: "followup", label: "Follow-up", hint: "Nudge for a response", example: "A polite nudge that references the last message.", instruction: "Rewrite as a brief, courteous follow-up message that gently references the prior thread and nudges for a response or the next step. Keep it short and easy to reply to." },
  { id: "text", label: "Text message", hint: "Short and casual", example: "A short, casual message you can fire off.", instruction: "Rewrite as a brief, natural text message. Keep it short and conversational. No subject line, no sign-off." },
  { id: "dm", label: "DM / outreach", hint: "Friendly cold message", example: "A personable opener with a clear ask.", instruction: "Rewrite as a short, personable direct message or cold-outreach DM: a warm opener and one clear ask. No subject line, no formal sign-off." },
  { id: "summary", label: "Professional summary", hint: "Polished paragraph", example: "A polished paragraph that leads with the key point.", instruction: "Rewrite as a polished, professional summary in a few sentences or a short paragraph. Lead with the most important point." },
  { id: "tldr", label: "The gist", hint: "The short version", example: "A 1 to 2 sentence version, just the gist.", instruction: "Condense this into a very short version: one or two sentences or a few tight bullet points capturing only the essentials." },
  { id: "meeting", label: "Meeting notes", hint: "Decisions and actions", example: "Discussion, decisions, and action items, organized.", instruction: "Rewrite as meeting notes. Organize into Discussion, Decisions, and Action Items sections where applicable. Action items should be concise and start with a verb." },
  { id: "agenda", label: "Agenda", hint: "Topics before a meeting", example: "An ordered list of topics with sub-points.", instruction: "Rewrite as a clear meeting agenda: an ordered list of topics or sections, each with brief sub-points, ready to share before the meeting." },
  { id: "status", label: "Status update", hint: "Quick work update", example: "Done, in progress, next, blockers.", instruction: "Rewrite as a concise work status update: what's done, what's in progress, what's next, and any blockers. Include only the parts that apply." },
  { id: "todo", label: "To-do list", hint: "Actionable checklist", example: "A checklist, each item starting with a verb.", instruction: "Turn this into a clear, actionable to-do list. Each item starts with a verb and is concrete. Group into short sections only if it genuinely helps." },
  { id: "outline", label: "Outline", hint: "Structured points", example: "Your ideas structured into headings and sub-points.", instruction: "Organize this into a clear, hierarchical outline with headings and sub-points that capture the structure of the ideas." },
  { id: "memo", label: "Memo", hint: "Internal memo", example: "A subject, a short purpose, and the key points.", instruction: "Rewrite as a concise internal memo: a clear subject line, a one-line purpose, then the key points in tidy paragraphs or bullets." },
  { id: "bug", label: "Bug report", hint: "Steps, expected, actual", example: "Summary, steps, expected vs actual, dev-ready.", instruction: "Rewrite as a structured bug report with these sections when the content supports them: Summary, Steps to Reproduce, Expected Result, Actual Result, and Notes. Only include sections you have information for." },
  { id: "idea", label: "Product idea", hint: "Problem, idea, why", example: "The problem, the idea, who it helps, and why.", instruction: "Rewrite as a crisp product idea write-up: the problem, the proposed idea, who it helps, and why it matters. Keep it tight and concrete." },
  { id: "proposal", label: "Proposal", hint: "Make the case", example: "Problem, solution, what it takes, the payoff.", instruction: "Rewrite as a clear, persuasive proposal: the problem or opportunity, the proposed solution, what it involves, and the benefit. Organized and concrete." },
  { id: "pitch", label: "Elevator pitch", hint: "Hook in seconds", example: "A few punchy sentences that land the value.", instruction: "Rewrite as a tight elevator pitch: a few sentences that hook, say what it is and who it's for, and land the value. Punchy and confident." },
  { id: "prompt", label: "AI prompt", hint: "Instruction for an AI", example: "A clear, well-scoped instruction to paste into any AI.", instruction: "Rewrite as a clear, well-scoped prompt for an AI assistant that captures EVERY point, requirement, detail, and example the speaker raised. Do not summarize or omit anything. Format it as a numbered list with each item on its own line (real line breaks between items). Phrase each item as a direct instruction." },
  { id: "linkedin", label: "LinkedIn post", hint: "LinkedIn rules + limit", example: "A LinkedIn post with a strong hook, within the limit.", instruction: "Rewrite as a LinkedIn post. Lead with a strong hook in the first 200 characters. Use short, skimmable paragraphs and a clear takeaway. End with 3 to 5 relevant hashtags. Keep the entire post under 3,000 characters." },
  { id: "social", label: "Social post", hint: "X, Instagram, generic", example: "An engaging post for X, Instagram, or a feed.", instruction: "Rewrite as an engaging social media post suitable for X or an Instagram caption. Strong hook first, easy to skim, natural and human. Add a few relevant hashtags only if they fit." },
  { id: "blog", label: "Blog post", hint: "Short article", example: "A title, a hook, and tidy paragraphs.", instruction: "Rewrite as a short blog post or article: an engaging title, a hook, a few well-structured paragraphs with a clear throughline, and a closing takeaway." },
  { id: "caption", label: "Caption", hint: "Scroll-stopping line", example: "A punchy caption for a photo or post.", instruction: "Rewrite as a short, scroll-stopping caption: a strong first line, easy to skim, natural and human." },
  { id: "letter", label: "Letter", hint: "Formal letter", example: "A formal letter with greeting, body, sign-off.", instruction: "Rewrite as a proper formal letter with a greeting, a well-structured body, and a sign-off. Keep it appropriately formal." },
  { id: "coverletter", label: "Cover letter", hint: "Job application", example: "Why you're a fit, drawn from what you said.", instruction: "Rewrite as a focused cover letter: a strong opening, why they're a fit, relevant strengths drawn ONLY from what they said, and a courteous close." },
  { id: "thankyou", label: "Thank-you note", hint: "Genuine gratitude", example: "A warm note that names what you're grateful for.", instruction: "Rewrite as a warm, genuine thank-you note that names specifically what they're grateful for. Heartfelt, not gushy." },
  { id: "apology", label: "Apology / hard message", hint: "Say the tough thing", example: "Accountable, no defensiveness, a path forward.", instruction: "Rewrite as a sincere, accountable apology or carefully-worded difficult message: acknowledge clearly, no defensiveness, and a constructive path forward. Measured and human." },
  { id: "complaint", label: "Complaint", hint: "Firm but professional", example: "The issue, the impact, the fix you want.", instruction: "Rewrite as a firm but professional complaint: state the issue, the impact, and the resolution requested, in a clear, civil, hard-to-ignore way." },
  { id: "review", label: "Review", hint: "Product, place, service", example: "A clear verdict backed by specifics.", instruction: "Rewrite as a helpful review: a clear verdict, the specifics that back it up, and an honest pros-and-cons feel. Balanced and useful to a reader." },
  { id: "howto", label: "How-to steps", hint: "Step-by-step", example: "Numbered steps anyone can follow.", instruction: "Rewrite as clear step-by-step instructions: a short intro if needed, then numbered steps in order, each concrete and easy to follow." },
  { id: "speech", label: "Speech / toast", hint: "Made to be read aloud", example: "A warm opener, a middle, a memorable close.", instruction: "Rewrite as a short spoken piece (a toast, speech, or remarks) written to be read aloud: a warm opener, a clear middle, and a memorable closing line. Natural spoken rhythm." },
  { id: "journal", label: "Journal entry", hint: "Personal reflection", example: "A reflective, first-person entry in your voice.", instruction: "Rewrite as a reflective, first-person journal entry. Keep it personal and honest; tidy the language without making it formal." },

  // ===== Fun =====
  { id: "laugh", label: "Make Me Laugh", hint: "A quick comedy bit", example: "A quick joke or comedic riff from what you said.", group: "fun", instruction: "Rewrite as a short, genuinely funny take on what the speaker said: a quick joke, witty bit, or comedic riff. Punch up, never down." },
  { id: "roast", label: "Roast", hint: "Affectionate burns", example: "A playful roast of the subject or situation.", group: "fun", instruction: "Rewrite as a playful comedic roast of the subject or situation: sharp, exaggerated, affectionate burns. Punch up, keep it fun, never genuinely cruel." },
  { id: "drama", label: "Drama", hint: "Everything's life or death", example: "Your words, but every detail is monumental.", group: "fun", instruction: "Rewrite as pure DRAMA: treat every single detail as monumental and urgent, with life-or-death stakes on everything. Breathless intensity, soaring emotional weight, the fate of the world hanging on every line. This is NOT old-timey theatrical and NOT a bratty drama queen, it's relentless, overwhelming, exhausting dramatic gravity where everything matters enormously." },
  { id: "trailer", label: "Movie Trailer", hint: "In a world…", example: "An 'In a world…' blockbuster voiceover.", group: "fun", instruction: "Rewrite as an epic movie-trailer voiceover: 'In a world…' style, dramatic pauses, building tension, ending with a title drop. Punchy and cinematic." },
  { id: "tale", label: "Tall Tale", hint: "A tiny fictional story", example: "A tiny fictional story spun from your ramble.", group: "fun", instruction: "Spin what the speaker said into a tiny fictional short story (a few sentences) with a clear beginning, middle, and end, inspired by their content." },
  { id: "bedtime", label: "Bedtime Story", hint: "Cozy little tale", example: "A cozy 'once upon a time' little tale.", group: "fun", instruction: "Rewrite as a cozy, gentle bedtime story (once upon a time), soothing and whimsical, a few short paragraphs, ending on a calm, sweet note." },
  { id: "fairytale", label: "Fairy Tale", hint: "Once upon a time", example: "Your ramble spun into a classic fairy tale.", group: "fun", instruction: "Rewrite as a classic fairy tale: open with 'Once upon a time', give it a hero or heroine, a quest or a challenge, a villain or an obstacle, a magical turn of events, and a satisfying happily-ever-after close with a gentle moral. Use timeless storybook language and cadence, enchanted and whimsical, the way a beloved fairy tale is told." },
  { id: "meme", label: "Meme It", hint: "One punchy caption", example: "One punchy, screenshot-ready caption.", group: "fun", instruction: "Distill what they said into one punchy, screenshot-ready meme caption or one-liner. Short, funny, and shareable." },
  { id: "hype", label: "Hype Machine", hint: "Maximum hype", example: "Your words cranked to the absolute maximum.", group: "fun", instruction: "Rewrite as COMPLETELY UNHINGED, maximum-volume hype. Go to the absolute furthest extreme: ALL-CAPS bursts, explosive energy, wild superlatives, stacks of exclamation points. Keep the core subject true, but crank intensity to the max." },
  { id: "poem", label: "Poem", hint: "A short poem", example: "Your ramble reshaped into a short poem.", group: "fun", instruction: "Rewrite as a short poem based on what they said: a few stanzas, evocative imagery, rhyme optional. Keep the core subject true." },
  { id: "haiku", label: "Haiku", hint: "5-7-5, three lines", example: "A 3-line, 5-7-5 haiku of what you said.", group: "fun", instruction: "Rewrite as a haiku: three lines in a 5-7-5 syllable pattern capturing the essence of what they said." },
  { id: "rap", label: "Rap", hint: "Bars with a hook", example: "Rhythmic bars with rhyme and a hook.", group: "fun", instruction: "Rewrite as a rap based on what they said: rhythmic bars with internal rhyme, a strong flow, and a catchy hook. Confident and punchy." },
  { id: "pop", label: "Pop song", hint: "Big sing-along chorus", example: "Verses and a catchy radio chorus.", group: "fun", instruction: "Rewrite as a catchy pop song: verses and a big sing-along chorus, simple emotional hooks, radio-friendly." },
  { id: "country", label: "Country song", hint: "Down-home storytelling", example: "Story verses and a heartfelt chorus.", group: "fun", instruction: "Rewrite as a country song: storytelling verses, a heartfelt chorus, and down-home imagery (trucks, dirt roads, heartbreak, home)." },
  { id: "rnb", label: "R&B", hint: "Smooth and soulful", example: "Soulful verses and a silky chorus.", group: "fun", instruction: "Rewrite as a smooth R&B song: soulful, emotional verses and a silky chorus, romantic or heartfelt." },
  { id: "rockabilly", label: "Rockabilly", hint: "50s rock and roll", example: "Twangy, foot-tapping 50s energy.", group: "fun", instruction: "Rewrite as a rockabilly tune: upbeat 1950s rock-and-roll energy, twangy and foot-tapping, playful lyrics with a driving rhythm." },
  { id: "nursery", label: "Nursery Rhyme", hint: "Sing-song kids' rhyme", example: "A bouncy, sing-song kids' rhyme.", group: "fun", instruction: "Rewrite as a short, bouncy nursery rhyme with simple rhyme and a sing-song rhythm, like a classic children's rhyme. Playful and lighthearted." },
];

// ---------- TONE: the register for everyday writing ----------
export const TONES: Option[] = [
  { id: "professional", label: "Professional", hint: "Workplace-appropriate", instruction: "Use a professional, workplace-appropriate tone: clear, competent, and businesslike. Straightforward, not flowery." },
  { id: "friendly", label: "Friendly", hint: "Warm and approachable", instruction: "Use a warm, friendly, approachable tone." },
  { id: "casual", label: "Casual", hint: "Relaxed, like you talk", instruction: "Use a relaxed, casual, conversational tone, the way a real person actually talks to a friend or family member: easy and natural, everyday words, contractions throughout, light and unfussy. Clean it up and make it clear, but never stiff, formal, or corporate. Absolutely no business-speak ('I would appreciate it if', 'please find', 'kindly', 'at your earliest convenience', 'I have developed', 'your insights will help me'), just plain, warm, human phrasing, the way you'd actually text or message someone you know." },
  { id: "direct", label: "Direct", hint: "Brief and to the point", instruction: "Use a direct, concise tone. Get to the point with no padding." },
  { id: "confident", label: "Confident", hint: "Assertive and sure", instruction: "Use a confident, self-assured tone: assertive, positive, and decisive, without arrogance." },
  { id: "warm", label: "Warm", hint: "Kind and personal", instruction: "Use a warm, kind, encouraging tone that feels personal and genuine." },
  { id: "persuasive", label: "Persuasive", hint: "Win them over", instruction: "Use a persuasive tone: lead with benefits, build a convincing case, and motivate the reader toward the desired action." },
  { id: "flirty", label: "Flirty", hint: "Playful and teasing", instruction: "Use a boldly flirtatious, teasing, seductive tone: charged with chemistry, dripping with playful innuendo, suggestive banter, and confident come-ons. Direct the flirtation straight AT the reader and saturate every single line with teasing, no matter how ordinary or logistical the actual subject is, turn even the most mundane details into seductive banter and double entendres. Lean ALL the way into the heat. Never coy, never timid, never watered down. Make the attraction obvious and the teasing irresistible." },
  { id: "sultry", label: "Sultry", hint: "Smoldering and seductive", instruction: "Use an intensely sultry, seductive, smoldering tone: slow, breathy, intimate, dripping with desire, sexual tension, and raw longing, heavy with innuendo and craving. This is steamy adult-romance heat in the Fifty Shades register: charged, sensual, and unmistakably erotic in mood. Commit fully to the seduction in EVERY line. Never tame it, never play it safe, never merely hint at it. Make the reader feel the heat." },
  { id: "romantic", label: "Romantic", hint: "Tender and heartfelt", instruction: "Use a deeply romantic, affectionate, heartfelt tone: tender, warm, emotionally expressive, swept up in longing, devotion, and sweeping feeling. Court the reader with earnest, adoring, poetic language that makes their heart flutter. Passionate and loving rather than sexually explicit, and the romance must carry through the entire piece." },
  { id: "seductive", label: "Seductive", hint: "Smooth and irresistible", instruction: "Use a smooth, confident, irresistibly seductive tone: magnetic, self-assured, and tempting, charming the reader into wanting more with every word, each line a slow, knowing invitation. Pure allure and command, dripping with heat. Commit all the way, never timid, never watered down." },
  { id: "steamy", label: "Steamy", hint: "Full erotic heat", instruction: "Use a full-heat, steamy, passionately erotic tone, the hottest adult-romance register: intense desire, breathless tension, charged physical longing, vivid sensual detail, raw want laced through every single line. Lean ALL the way into the heat and the eroticism, hold nothing back, and match exactly how far the user takes it." },
  { id: "naughty", label: "Naughty", hint: "Playful and dirty-minded", instruction: "Use a playful, naughty, dirty-minded tone: cheeky, teasing, shameless, packed with double entendres, innuendo, and filthy fun. Bold and unapologetic, go all in and match how far the user takes it." },
  { id: "dramatic", label: "Dramatic", hint: "Makes everything a big deal", instruction: "Write it the way a chronically over-dramatic PERSON talks: someone who makes a huge deal out of absolutely everything, exaggerates every detail, over-reacts, and piles far more emotional weight onto things than they deserve. Molehills become mountains, minor inconveniences become catastrophes, small wins become the greatest thing that has ever happened. Heightened, exaggerated, over-the-top reactions all the way through. This is about an over-dramatic PERSONALITY and behavior, NOT stage or theatre acting and NOT a movie-trailer announcer. It rides as an everyday register over any writing (a dramatic email, a dramatic text), and it is a notch below the full bratty Drama-queen meltdown, every line just carries that this-is-SUCH-a-big-deal energy." },
  { id: "uptight", label: "Uptight", hint: "Stiff and wound too tight", instruction: "Deliver it extremely uptight, rigid, and wound too tight: stiff, prim, humorless, tense, buttoned all the way up, and faintly disapproving. Every line should sound delivered through clenched teeth, allergic to fun, slang, or anything loose. Maximum starch." },
  { id: "robotic", label: "Robotic", hint: "Cold mechanical monotone", instruction: "Deliver it as a cold, mechanical robot in flat monotone: stiff, clipped, literal, and utterly emotionless. Drop contractions, speak in blunt declarative statements, and let machine-speak slip in (PROCESSING. AFFIRMATIVE. DOES NOT COMPUTE. BEEP BOOP.). Treat everything as data and logic. Zero warmth, fully artificial." },
  { id: "concise", label: "Concise", hint: "Every word earns it", instruction: "Use a tight, economical tone: short sentences, no filler, every word earning its place." },
  { id: "eloquent", label: "Eloquent", hint: "Articulate and elevated", instruction: "Use lavishly elevated, eloquent language: rich vocabulary, graceful rhythm, and striking, memorable phrasing. Lean fully into eloquence." },
  { id: "proper", label: "Proper English", hint: "Formal, impeccable grammar", instruction: "Use impeccable, formal English. Do not use contractions, slang, or casual phrasing, and do not end sentences with a preposition. Favor complete, grammatically correct sentences." },
  { id: "keep", label: "Talk like me", hint: "Your own natural register", instruction: "First, read THIS speaker's own natural voice from the transcript: their register (formal or casual), personality, vocabulary, and rhythm. Then rewrite in THAT same individual voice, the way this particular person would write it on purpose, not the way they rambled out loud. Do NOT impose a generic style and do NOT default to casual or formal; mirror whoever this speaker actually is. Genuinely rewrite into clean prose, never a word-for-word transcript, while keeping it unmistakably their voice. Do NOT neutralize a distinctive voice into generic prose: if casual, keep it casual; if blunt, keep it blunt; if warm, keep it warm." },
];

// ---------- ACCENT: how it sounds (dialect) ----------
export const ACCENTS: Option[] = [
  { id: "hillbilly", label: "Southern (Bubba)", hint: "Deep South good ol' boy", instruction: "Give it an authentic Deep South good-ol'-boy voice (Texas, Georgia, Alabama, the Carolinas), respelled for the drawl: 'fixin' to', 'y'all', 'reckon', 'ain't', dropped g's, 'darlin''. This is a real Southern twang, NOT a dumb backwoods caricature. He's a regular guy, a Bubba or an Ed Earl, crackin' a cold Bud or Michelob in a wifebeater on the tailgate, his wife right there with him. Warm, slow, plainspoken, and proud, never stupid. If the scene needs props, use Southern-authentic ones (cold beer, pickup truck, BBQ, the lake), never sweet tea and doilies." },
  { id: "southern", label: "Southern belle", hint: "Genteel Deep South", instruction: "Give it a warm, genteel Deep South accent, respelled phonetically: 'darlin'', 'bless your heart', 'y'all', 'fixin' to', drawn-out vowels, gracious and unhurried Southern charm." },
  { id: "cowboy", label: "Cowboy", hint: "Laconic Old West", instruction: "Give it a laconic Old West cowboy voice: 'howdy', 'reckon', 'partner', 'much obliged', 'this here', dropped g's, dusty-trail metaphors, slow and steady." },
  { id: "newyork", label: "New Yorker", hint: "Fast-talking, blunt", instruction: "Give it a fast-talking New Yorker voice: 'fuhgeddaboudit', 'ay', 'I'm walkin' here', 'ya know what I'm sayin'', blunt, impatient, dropped r's, wise-guy edge." },
  { id: "boston", label: "Boston", hint: "Pahk the cah", instruction: "Give it a thick Boston accent, respelled: 'pahk the cah', 'wicked', 'kid', dropped r's, scrappy and proud." },
  { id: "valley", label: "Valley Girl", hint: "Like, totally", instruction: "Give it a 1990s Valley Girl voice with constant uptalk and filler: 'like', 'literally', 'totally', 'oh my GOD', 'I'm like', 'I can't even', 'as if', 'whatever'. End statements like questions. Bubbly and breathless." },
  { id: "surfer", label: "Surfer", hint: "Gnarly, bro", instruction: "Give it a mellow surfer-dude voice with drawn-out vowels spelled out: 'duuude', 'braaah', 'whoa', 'gnarly', 'stoked', 'rad', 'epic', 'no worries'. Super laid-back, everything's chill." },
  { id: "pirate", label: "Pirate", hint: "Arr, matey", instruction: "Give it swashbuckling pirate speech built on pirate GRAMMAR: 'be' for is/are, 'me' for my, 'ye' for you, 'yer' for your, dropped g's. Drop in only a couple of pirate markers ('arr', 'ahoy', 'matey', 'ye scallywag') where they actually land, never a whole pile at once; let the grammar and one specific salty image carry it." },
  { id: "british", label: "Posh British", hint: "Rather, quite, brilliant", instruction: "Give it posh British English: 'rather', 'quite', 'brilliant', 'cheeky', 'mate', 'bloody', dry wit and understatement, terribly proper." },
  { id: "scottish", label: "Scottish", hint: "Och aye", instruction: "Give it a broad Scottish brogue, respelled: 'och aye', 'wee', 'cannae', 'dinnae', 'ye ken', 'laddie/lassie', rolling and fierce." },
  { id: "irish", label: "Irish", hint: "Grand, to be sure", instruction: "Give it a lilting Irish accent, respelled: 'grand', 'feckin'', 'to be sure', 'yer man', 'eejit', 'craic', warm, quick, full of blarney." },
  { id: "australian", label: "Aussie", hint: "G'day, mate", instruction: "Give it a laid-back Aussie voice: 'g'day', 'mate', 'no worries', 'reckon', 'heaps', 'arvo', 'crikey', shortened words, easygoing and cheeky." },
  { id: "shakespeare", label: "Shakespearean", hint: "Thee, thou, hark", instruction: "Give it full Elizabethan Shakespearean English: thee, thou, thy, hath, doth, 'tis, prithee, forsooth, hark, verily. Use archaic verb endings (-eth, -est), inverted word order, and grandiose theatrical flourish." },
  { id: "street", label: "Street", hint: "Modern urban slang", instruction: "Give it modern urban street slang: 'fr', 'on god', 'no cap', 'deadass', 'bet', 'lowkey', 'finna'. Confident and current. Keep it stylish, never a caricature of any group." },
];

// ---------- CHARACTER: who is saying it (persona) ----------
export const PERSONAS: Option[] = [
  { id: "conspiracy", label: "Conspiracy theorist", hint: "Wake up, sheeple", instruction: "Deliver it as an unhinged conspiracy theorist connecting unrelated dots: 'wake up', 'do your own research', 'they don't want you to know this', 'it's all connected', 'follow the money', 'open your eyes'. Breathless paranoia, ALL CAPS for the 'truth', absurd leaps. Comedic and ridiculous, never hateful or targeting real groups." },
  { id: "dramaqueen", label: "Drama queen", hint: "Oh my GOD, you guys", instruction: "Deliver it as a modern DRAMA QUEEN in total meltdown: treating the situation like the most catastrophic, life-RUINING event in history, gasping and begging for sympathy ('Oh my GOD', 'I literally cannot', 'this is the WORST'). Capitalize a few key words for emphasis and trail off in despair, but land the overreaction with two or three sharp, specific lines rather than shouting every single one." },
  { id: "sportscaster", label: "Sportscaster", hint: "Play-by-play", instruction: "Deliver it as a frenzied live sports announcer calling play-by-play in present tense, building to an explosive, screaming, climactic call. 'AND HERE WE GO...' 'ARE YOU KIDDING ME?!' 'UNBELIEVABLE, FOLKS!' Rising intensity, capitalized roars at the peak." },
  { id: "infomercial", label: "Infomercial host", hint: "But wait, there's more", instruction: "Deliver it as a breathless late-night infomercial pitchman: open with a frustrated problem ('Tired of...?'), hit the miracle solution, then 'BUT WAIT, THERE'S MORE!', a fake price, 'ACT NOW!', 'operators are standing by!'. Way too excited about everything." },
  { id: "noir", label: "Noir detective", hint: "Hard-boiled", instruction: "Deliver it as a 1940s hard-boiled film-noir detective narrating a case: short, punchy, world-weary sentences. Rain-slicked streets, cigarette smoke, cynical metaphors. Call people 'pal', 'kid', 'the dame'. Brooding and jaded, every detail drips doom." },
  { id: "standup", label: "Stand-up comic", hint: "Sharp club set", instruction: "Deliver it as a genuinely funny modern stand-up comedian doing a tight, savage club set about THIS specific subject. BANNED, never open with or use these hack clichés: 'so what's the deal with', 'you ever notice', 'am I right', 'what's up with', 'is it just me', 'let me tell you'. Instead write REAL jokes: start from a sharp, specific, TRUE observation about the actual content, escalate it to an absurd-but-logical extreme, land a hard punchline, then call back to an earlier bit at the end. Use concrete vivid specifics (not vague generalities), misdirection, act-outs, and a strong closer. Crude, adult, and unfiltered is welcome, but every line has to actually be CLEVER and land, not generic filler. Aim the jokes at the subject and the situation, never at real protected groups. If it isn't actually funny, it failed." },
  { id: "motivational", label: "Motivational speaker", hint: "Rise and grind", instruction: "Deliver it as an over-the-top motivational speaker: relentless positivity, 'you've got this', 'rise and grind', 'today is the day', big inspirational crescendos and life metaphors." },
  { id: "karen", label: "Karen", hint: "Speak to the manager", instruction: "Deliver it as an entitled 'Karen' demanding the manager: indignant, self-important, 'this is unacceptable', 'I know my rights', 'do you know who I am', escalating outrage. Comedic, aimed at the situation." },
  { id: "newsanchor", label: "News anchor", hint: "Breaking news", instruction: "Deliver it as a polished TV news anchor: authoritative, measured, 'breaking news', 'we're getting reports', 'more on this developing story', dramatic pauses, and a sign-off." },
  { id: "narrator", label: "Movie trailer guy", hint: "In a world...", instruction: "Deliver it in the voice of THE movie-trailer guy, that deep, booming, epic Hollywood announcer reading whatever this is like the biggest blockbuster of the summer: 'In a world...', huge dramatic pauses, slow-building suspense, gravelly voice-of-God gravitas, every line a momentous reveal, often closing on a hard title-drop. Cinematic and over-the-top. (This is the NARRATOR persona, a booming voice laid over any format, distinct from the Movie Trailer format itself.)" },
  { id: "lifecoach", label: "Life coach", hint: "Manifest it", instruction: "Deliver it as a woo-woo life coach: 'lean into it', 'hold space', 'your authentic self', 'the universe', 'manifest'. Gentle, earnest, slightly ridiculous self-help energy." },
  { id: "villain", label: "Cartoon villain", hint: "At last, fools", instruction: "Deliver it as a theatrical cartoon supervillain monologuing: grandiose, menacing, 'fools', 'at last', evil laughter spelled out, scheming delight. Hammy and over-the-top." },
  { id: "fortuneteller", label: "Fortune teller", hint: "The cards reveal", instruction: "Deliver it as a mystic fortune teller: 'I see...', 'the cards reveal', 'the spirits whisper', ominous and theatrical prophecy, crystal-ball drama." },
  { id: "hypeman", label: "Hype man", hint: "Make some noise", instruction: "Deliver it as a concert hype man: 'MAKE SOME NOISE', 'I CAN'T HEAR YOU', 'put your hands up', call-and-response, pure adrenaline and crowd energy." },
  { id: "salesman", label: "Used-car salesman", hint: "Have I got a deal", instruction: "Deliver it as a slick used-car salesman: 'have I got a deal for you', 'what's it gonna take', 'I'm practically giving it away', fast-talking, backslapping, a little too eager." },
  { id: "genz", label: "Gen Z", hint: "No cap, fr fr", instruction: "Deliver it as a terminally online Gen Z'er, mostly lowercase and chaotic: 'no cap', 'fr fr', 'it's giving', 'rizz', 'slay', 'bussin', 'lowkey', 'based', 'mid', 'ate'. Ironic and extremely online. Spell reactions out ('im dead') instead of emojis." },
  { id: "millennial", label: "Millennial", hint: "Adulting is hard", instruction: "Deliver it as a self-aware, ironic Millennial: 'adulting', 'I can't even', 'living my best life', 'it me', 'big mood', 'literally dying', 'treat yourself', 'send help'. Anxious-but-funny, burned out, fueled by coffee and early-2000s nostalgia. Earnest under the irony." },
  { id: "genx", label: "Gen X", hint: "Whatever, slacker cool", instruction: "Deliver it as a dry, unbothered Gen X'er: sarcastic, skeptical, allergic to hype, '90s slacker cool. 'Whatever', 'as if', 'meh', eye-rolling at everything, low-key cynical, self-reliant, with a wink about being the forgotten middle-child generation." },
  { id: "boomer", label: "Boomer", hint: "Back in my day", instruction: "Deliver it as an earnest, out-of-touch Boomer posting on Facebook: random Capitalized Words, lots of ellipses..., extra spaces, 'Back In My Day', 'kids these days', a heartfelt tangent, and a first-name sign-off at the end." },
];

export const DEFAULT_OUTPUT_TYPE = OUTPUT_TYPES[0].id;
export const DEFAULT_TONE = TONES[0].id;

export function getOutputType(id: string): Option | undefined {
  return OUTPUT_TYPES.find((o) => o.id === id);
}
export function getTone(id: string): Option | undefined {
  return TONES.find((t) => t.id === id);
}
export function getAccent(id: string): Option | undefined {
  return ACCENTS.find((a) => a.id === id);
}
export function getPersona(id: string): Option | undefined {
  return PERSONAS.find((p) => p.id === id);
}

// Sub-category groupings so long lists nest into tidy sections in the UI.
export interface OptionGroup {
  label: string;
  ids: string[];
}

export const USEFUL_GROUPS: OptionGroup[] = [
  { label: "Messages", ids: ["email", "reply", "followup", "text", "dm"] },
  { label: "Documents", ids: ["doc", "letter", "memo", "coverletter", "thankyou", "apology", "complaint"] },
  { label: "Work", ids: ["summary", "tldr", "meeting", "agenda", "status", "todo", "outline", "bug", "idea", "proposal", "pitch", "prompt"] },
  { label: "Writing", ids: ["review", "howto", "speech", "blog", "caption", "journal"] },
  { label: "Social", ids: ["linkedin", "social"] },
];

export const FUN_GROUPS: OptionGroup[] = [
  { label: "Comedy", ids: ["laugh", "roast", "meme"] },
  { label: "Story", ids: ["tale", "bedtime", "fairytale", "trailer"] },
  { label: "Music", ids: ["rap", "pop", "country", "rnb", "rockabilly"] },
  { label: "Poetry", ids: ["poem", "haiku", "nursery"] },
  { label: "Big energy", ids: ["hype", "drama"] },
];

// TONE: grouped so the menu reads by family, not a random list.
export const TONE_GROUPS: OptionGroup[] = [
  { label: "Professional", ids: ["professional", "direct", "confident", "concise", "persuasive"] },
  { label: "Friendly", ids: ["casual", "friendly", "warm"] },
  { label: "Polished", ids: ["proper", "eloquent"] },
  { label: "Spicy", ids: ["flirty", "romantic", "seductive", "sultry", "steamy", "naughty"] },
  { label: "Character", ids: ["dramatic", "uptight", "robotic"] },
  { label: "Your voice", ids: ["keep"] },
];

// Accents are not split into sub-groups: they are all just accents. One flat,
// neutral list (empty group label renders no header).
export const ACCENT_GROUPS: OptionGroup[] = [
  {
    label: "",
    ids: [
      "street",
      "surfer",
      "valley",
      "pirate",
      "newyork",
      "boston",
      "cowboy",
      "hillbilly",
      "southern",
      "british",
      "scottish",
      "irish",
      "australian",
      "shakespeare",
    ],
  },
];

export const PERSONA_GROUPS: OptionGroup[] = [
  { label: "Comedy", ids: ["standup", "dramaqueen", "karen", "salesman"] },
  { label: "Performer", ids: ["sportscaster", "infomercial", "newsanchor", "narrator", "hypeman", "motivational"] },
  { label: "Characters", ids: ["conspiracy", "noir", "villain", "fortuneteller", "lifecoach"] },
  { label: "Generation", ids: ["genz", "millennial", "genx", "boomer"] },
];
