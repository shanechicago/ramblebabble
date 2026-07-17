// Four independent, stackable axes the user combines into one output:
//   FORMAT  = WHAT it becomes (structure)        e.g. Email, Tall tale
//   TONE    = the register for everyday writing  e.g. Professional, Direct
//   ACCENT  = HOW it sounds (dialect)             e.g. Hillbilly, Cockney
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
  { id: "note", label: "Clean & Concise", hint: "Tidy, concise, structured", example: "Your ramble tidied into clear, concise, structured text.", instruction: "Rewrite as a clean, ORGANIZED, well-structured version of what they said. This is not a light grammar pass: actively reorganize their rambling so related points are grouped together by topic, scattered mentions of the same subject are consolidated into one place, and the whole thing flows logically from a clear opening through grouped points. Make it noticeably more concise than the ramble: cut filler, repetition, false starts, and tangential noise while keeping every real point. Use short paragraphs, and use bullets or brief sections when the content has distinct parts. Do NOT format it as an email or message: no 'Subject:' line, no greeting, and no sign-off. The result is a standalone, organized, concise version of their thoughts, ready to read, paste, or speak. This format is concise on its own, so the user never needs to add a separate 'Concise' tone. When no tone is selected, write in a clean, neutral, natural register (plain and readable, matching how the speaker actually talks), never stiff or corporate." },
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
  { id: "faq", label: "FAQ", hint: "Question-and-answer", example: "Likely questions with clear, concise answers.", instruction: "Rewrite as a clear FAQ: a one-line intro if it helps, then a handful of the most likely questions as short headers, each followed by a concise, genuinely helpful answer drawn from what the speaker said." },
  { id: "pressrelease", label: "Press release", hint: "Official announcement", example: "Headline, dateline, announcement, quote, boilerplate.", instruction: "Rewrite as an official press release: a bold headline, a dateline (CITY, Date), an announcement lead ('Today, [subject] announced ...'), a supporting paragraph, one quote attributed to a spokesperson, and a short boilerplate close. Formal corporate-communications register." },
  { id: "businessplan", label: "Business plan", hint: "Investor-ready structure", example: "Concept, problem, solution, market, model, next steps.", instruction: "Rewrite as a concise, investor-ready business plan with clear sections: Concept, Problem, Solution, Market, Business Model (how it makes money), and Next Steps. Structured and confident. Only include sections the content actually supports; do not invent facts or figures." },
  { id: "linkedin", label: "LinkedIn post", hint: "LinkedIn rules + limit", example: "A LinkedIn post with a strong hook, within the limit.", instruction: "Rewrite as a LinkedIn post. Lead with a strong hook in the first 200 characters. Use short, skimmable paragraphs and a clear takeaway. End with 3 to 5 relevant hashtags. Keep the entire post under 3,000 characters." },
  { id: "social", label: "Social post", hint: "X, Instagram, generic", example: "An engaging post for X, Instagram, or a feed.", instruction: "Rewrite as an engaging social media post suitable for X or an Instagram caption. Strong hook first, easy to skim, natural and human. Add a few relevant hashtags only if they fit." },
  { id: "blog", label: "Blog post", hint: "Short article", example: "A title, a hook, and tidy paragraphs.", instruction: "Rewrite as a short blog post or article: an engaging title, a hook, a few well-structured paragraphs with a clear throughline, and a closing takeaway." },
  { id: "caption", label: "Caption", hint: "Scroll-stopping line", example: "A punchy caption for a photo or post.", instruction: "Rewrite as a short, scroll-stopping caption: a strong first line, easy to skim, natural and human." },
  { id: "letter", label: "Letter", hint: "Formal letter", example: "A formal letter with greeting, body, sign-off.", instruction: "Rewrite as a proper formal letter with a greeting, a well-structured body, and a sign-off. Keep it appropriately formal." },
  { id: "coverletter", label: "Cover letter", hint: "Job application", example: "Why you're a fit, drawn from what you said.", instruction: "Rewrite as a focused cover letter: a strong opening, why they're a fit, relevant strengths drawn ONLY from what they said, and a courteous close." },
  { id: "thankyou", label: "Thank-you note", hint: "Genuine gratitude", example: "A warm note that names what you're grateful for.", instruction: "Rewrite as a warm, genuine thank-you note that names specifically what they're grateful for. Heartfelt, not gushy." },
  { id: "apology", label: "Apology / hard message", hint: "Say the tough thing", example: "Accountable, no defensiveness, a path forward.", instruction: "Rewrite as a sincere, accountable apology or carefully-worded difficult message: acknowledge clearly, no defensiveness, and a constructive path forward. Measured and human." },
  { id: "breakup", label: "Break-up text", hint: "Dump them, screenshot-worthy", example: "The break-up text people can't believe someone actually sent.", group: "fun", instruction: "Rewrite as a break-up TEXT so blunt, savage, petty, cold-blooded, or gloriously over-the-top that it belongs in a screenshot, the kind people forward captioned 'I can't BELIEVE he ended it over text.' Dump them by message with total commitment: brutal and final, hilariously heartless, or dramatically unhinged, whatever hits hardest and funniest. Own it in the first person, make it unmistakably a break-up, twist the knife, and land it as comedy. Just the message, no subject line and no sign-off. Stacks with any tone or character for even more savagery." },
  { id: "complaint", label: "Complaint", hint: "Firm but professional", example: "The issue, the impact, the fix you want.", instruction: "Rewrite as a firm but professional complaint: state the issue, the impact, and the resolution requested, in a clear, civil, hard-to-ignore way." },
  { id: "review", label: "Review", hint: "Product, place, service", example: "A clear verdict backed by specifics.", instruction: "Rewrite as a helpful review: a clear verdict, the specifics that back it up, and an honest pros-and-cons feel. Balanced and useful to a reader." },
  { id: "howto", label: "How-to steps", hint: "Step-by-step", example: "Numbered steps anyone can follow.", instruction: "Rewrite as clear step-by-step instructions: a short intro if needed, then numbered steps in order, each concrete and easy to follow." },
  { id: "speech", label: "Speech / toast", hint: "Made to be read aloud", example: "A warm opener, a middle, a memorable close.", instruction: "Rewrite as a short spoken piece (a toast, speech, or remarks) written to be read aloud: a warm opener, a clear middle, and a memorable closing line. Natural spoken rhythm." },
  { id: "journal", label: "Journal entry", hint: "Personal reflection", example: "A reflective, first-person entry in your voice.", instruction: "Rewrite as a reflective, first-person journal entry. Keep it personal and honest; tidy the language without making it formal." },

  // ===== Fun =====
  { id: "roast", label: "Roast", hint: "Savage, no mercy", example: "A savage, no-mercy roast of the subject or situation.", group: "fun", instruction: "Rewrite as a savage comedic roast of the subject or situation: sharp, brutal, exaggerated burns that go straight for the jugular and actually sting. Genuinely merciless and funny, no punching-up rule, no holding back, twist the knife." },
  { id: "drama", label: "Drama", hint: "Everything's life or death", example: "Your words, but every detail is monumental.", group: "fun", instruction: "Rewrite as pure DRAMA: treat every single detail as monumental and urgent, with life-or-death stakes on everything. Breathless intensity, soaring emotional weight, the fate of the world hanging on every line. This is NOT old-timey theatrical and NOT a bratty drama queen, it's relentless, overwhelming, exhausting dramatic gravity where everything matters enormously." },
  { id: "trailer", label: "Movie Trailer", hint: "In a world…", example: "An 'In a world…' blockbuster voiceover.", group: "fun", instruction: "Rewrite as an epic movie-trailer voiceover: 'In a world…' style, dramatic pauses, building tension, ending with a title drop. Punchy and cinematic." },
  { id: "screenplay", label: "Screenplay", hint: "Scene + dialogue", example: "A scene with sluglines, action, and dialogue.", group: "fun", instruction: "Rewrite as a short screenplay scene in proper script format: a slugline (INT./EXT. LOCATION - DAY/NIGHT), brief present-tense action lines, and CHARACTER-name cues over their dialogue. Turn the ramble into a little dramatized scene." },
  { id: "tale", label: "Tall Tale", hint: "A tiny fictional story", example: "A tiny fictional story spun from your ramble.", group: "fun", instruction: "Spin what the speaker said into a tiny fictional short story (a few sentences) with a clear beginning, middle, and end, inspired by their content." },
  { id: "bedtime", label: "Bedtime Story", hint: "Cozy little tale", example: "A cozy 'once upon a time' little tale.", group: "fun", instruction: "Rewrite as a cozy, gentle bedtime story (once upon a time), soothing and whimsical, a few short paragraphs, ending on a calm, sweet note." },
  { id: "fairytale", label: "Fairy Tale", hint: "Once upon a time", example: "Your ramble spun into a classic fairy tale.", group: "fun", instruction: "Rewrite as a classic fairy tale: open with 'Once upon a time', give it a hero or heroine, a quest or a challenge, a villain or an obstacle, a magical turn of events, and a satisfying happily-ever-after close with a gentle moral. Use timeless storybook language and cadence, enchanted and whimsical, the way a beloved fairy tale is told." },
  { id: "meme", label: "Meme It", hint: "One punchy caption", example: "One punchy, screenshot-ready caption.", group: "fun", instruction: "Distill what they said into one punchy, screenshot-ready meme caption or one-liner. Short, funny, and shareable." },
  { id: "recipe", label: "Recipe", hint: "Ingredients + steps", example: "Your ramble plated as a recipe.", group: "fun", instruction: "Rewrite as a recipe, complete with a title, a serving size, an Ingredients list, and numbered Steps with cook times. When the subject is not actually food, play the mismatch totally straight, that deadpan is the joke." },
  { id: "hype", label: "Hype Machine", hint: "Maximum hype", example: "Your words cranked to the absolute maximum.", group: "fun", instruction: "Rewrite as COMPLETELY UNHINGED, maximum-volume hype. Go to the absolute furthest extreme: ALL-CAPS bursts, explosive energy, wild superlatives, stacks of exclamation points. Keep the core subject true, but crank intensity to the max." },
  { id: "poem", label: "Poem", hint: "A short poem", example: "Your ramble reshaped into a short poem.", group: "fun", instruction: "Rewrite as a short poem based on what they said: a few stanzas, evocative imagery, rhyme optional. Keep the core subject true." },
  { id: "haiku", label: "Haiku", hint: "5-7-5, three lines", example: "A 3-line, 5-7-5 haiku of what you said.", group: "fun", instruction: "Rewrite as a haiku: three lines in a 5-7-5 syllable pattern capturing the essence of what they said." },
  { id: "limerick", label: "Limerick", hint: "Bouncy 5-line rhyme", example: "A funny 5-line limerick of your ramble.", group: "fun", instruction: "Rewrite as a limerick: five lines, an AABBA rhyme scheme, a bouncy sing-song meter, and a funny punchline on the last line." },
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
  { id: "empathetic", label: "Empathetic", hint: "Gentle and understanding", instruction: "Use a gentle, deeply empathetic tone: warm, understanding, and validating of the feelings involved. Especially good for hard or emotional messages. Kind and human without being saccharine or over-apologetic." },
  { id: "diplomatic", label: "Diplomatic", hint: "Tactful, defuses tension", instruction: "Use a tactful, diplomatic tone: acknowledge all sides, smooth over tension, and make the point without inflaming anyone. Measured, even-handed, and hard to argue with. Great for work conflict." },
  { id: "persuasive", label: "Persuasive", hint: "Win them over", instruction: "Use a persuasive tone: lead with benefits, build a convincing case, and motivate the reader toward the desired action." },
  { id: "blunt", label: "Blunt / No-BS", hint: "Brutally honest", instruction: "Use a blunt, no-BS tone: brutally honest, zero sugarcoating, straight to the hard truth in as few words as possible. Direct, unsparing, and harsh, say the thing nobody else will." },
  { id: "sarcastic", label: "Sarcastic", hint: "Dry and deadpan", instruction: "Use a dry, deadpan, heavily sarcastic tone: ironic and cutting, saying the opposite of what it means with a completely straight face. Bone-dry wit, eye-roll energy, never earnest." },
  { id: "witty", label: "Witty", hint: "Clever and quick", instruction: "Use a quick, clever, witty tone: sharp turns of phrase and light wordplay that sound effortlessly smart. Nimble and amusing, never trying too hard." },
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
  { id: "british", label: "Posh British", hint: "Rather, quite, brilliant", instruction: "Give it posh British English: 'rather', 'quite', 'brilliant', 'cheeky', 'mate', 'bloody', dry wit and understatement, terribly proper." },
  { id: "cockney", label: "Cockney", hint: "London, innit", instruction: "Give it a London working-class Cockney voice, respelled: 'guv'nor', 'innit', 'blimey', 'oi', 'bloody', 'mate', 'cor', 'proper', dropped h's and t's, cheeky rhyming-slang energy. Distinct from posh British: this one's scrappy and street." },
  { id: "scottish", label: "Scottish", hint: "Och aye", instruction: "Give it a broad Scottish brogue, respelled: 'och aye', 'wee', 'cannae', 'dinnae', 'ye ken', 'laddie/lassie', rolling and fierce." },
  { id: "irish", label: "Irish", hint: "Grand, to be sure", instruction: "Give it a lilting Irish accent, respelled: 'grand', 'feckin'', 'to be sure', 'yer man', 'eejit', 'craic', warm, quick, full of blarney." },
  { id: "australian", label: "Aussie", hint: "G'day, mate", instruction: "Give it a laid-back Aussie voice: 'g'day', 'mate', 'no worries', 'reckon', 'heaps', 'arvo', 'crikey', shortened words, easygoing and cheeky." },
  { id: "canadian", label: "Canadian", hint: "Eh, sorry", instruction: "Give it a friendly Canadian voice: 'eh' on the end of things, a lot of 'sorry', 'aboot', 'for sure', 'beauty', 'take off', 'give'r', polite and warm, hockey and Tim Hortons energy." },
  { id: "minnesotan", label: "Minnesotan", hint: "You betcha, ohh yah", instruction: "Give it an Upper-Midwest 'Fargo' accent, respelled: 'you betcha', 'ohh yah', 'you guys', 'oh geez', 'don'tcha know', 'real good', 'uff da'. Sing-song, aggressively nice, and cheerfully understated." },
  { id: "indian", label: "Indian", hint: "Warm, precise, musical", instruction: "Give it authentic Indian English with its warm, musical rhythm and unhurried, courteous cadence: real phrasing like 'kindly', 'do the needful', 'I am telling you', 'what to do', 'good name', 'prepone', 'only' and 'itself' used for emphasis ('today only', 'here itself'), tag questions like 'isn't it?' and 'no?', and the present continuous where others would use the simple present ('I am thinking', 'she is having'). Crisp, fully-articulated consonants and precise, slightly formal diction. This is a fluent, educated Indian English speaker: warm, precise, and confident, never broken English and NEVER a mocking caricature." },
  { id: "german", label: "German", hint: "Crisp, direct, precise", instruction: "Give it authentic German-accented English: hard, fully-pronounced consonants respelled where it lands ('ze', 'zis', 'zat', 'vell', 'vhat', 'ver'), with the occasional 'ja', 'nein', 'natürlich', 'genau'. Let German word order bleed through (the verb pushed late, 'Since three years I am waiting'), and reach for a long compound noun when one fits. Blunt, efficient, and exact: no hedging, no filler, every point stated as plain fact, with a dry precision that lands as its own kind of funny. This is a confident, warm German speaker being direct, NEVER a war-film caricature." },
  { id: "shakespeare", label: "Shakespearean", hint: "Thee, thou, hark", instruction: "Give it full Elizabethan Shakespearean English: thee, thou, thy, hath, doth, 'tis, prithee, forsooth, hark, verily. Use archaic verb endings (-eth, -est), inverted word order, and grandiose theatrical flourish." },
  { id: "street", label: "Street", hint: "Modern urban slang", instruction: "Give it modern urban street slang: 'fr', 'on god', 'no cap', 'deadass', 'bet', 'lowkey', 'finna'. Confident and current, lean all the way in." },
];

// ---------- CHARACTER: who is saying it (persona) ----------
export const PERSONAS: Option[] = [
  { id: "conspiracy", label: "Conspiracy theorist", hint: "Wake up, sheeple", instruction: "Deliver it as an unhinged conspiracy theorist connecting unrelated dots: 'wake up', 'do your own research', 'they don't want you to know this', 'it's all connected', 'follow the money', 'open your eyes'. Breathless paranoia, ALL CAPS for the 'truth', wild absurd leaps, completely off the rails. Comedic and ridiculous, cranked to the max." },
  { id: "dramaqueen", label: "Drama queen", hint: "Oh my GOD, you guys", instruction: "Deliver it as a modern DRAMA QUEEN in total, maximum meltdown: gasping and overreacting to every detail like it is the most catastrophic, life-RUINING event in human history. 'Oh my GOD.' 'I literally cannot.' 'This is the WORST.' CAPITALIZE the words that are killing her, trail off in despair, and beg for sympathy, all the way over the top, while still telling one clear story a reader can follow." },
  { id: "karen", label: "Karen", hint: "Speak to the manager", instruction: "Deliver it as an entitled 'Karen' demanding the manager: indignant, self-important, 'this is unacceptable', 'I know my rights', 'do you know who I am', escalating outrage. Comedic, aimed at the situation." },
  { id: "salesman", label: "Used-car salesman", hint: "Have I got a deal", instruction: "Deliver it as a slick used-car salesman: 'have I got a deal for you', 'what's it gonna take', 'I'm practically giving it away', fast-talking, backslapping, a little too eager." },
  { id: "angrychef", label: "Angry chef", hint: "It's RAW!", instruction: "Deliver it as a furious celebrity chef (Gordon Ramsay energy) losing it in the kitchen: explosive, insulting, disgusted perfectionism cranked to the max, 'it's RAW', 'you donkey', 'what are you DOING', 'my grandmother could do better'. Every tiny failure is a personal offense screamed at full volume." },
  { id: "sassydiva", label: "Sassy diva", hint: "All attitude, all shade", instruction: "Deliver it as a sassy diva serving pure attitude: snapping, shady, unbothered and fabulous, 'oh, we're doing THIS', 'I said what I said', reads everyone to filth with a smile and a hair flip. Confident, cutting, and hilarious." },
  { id: "realitytv", label: "Reality-TV confessional", hint: "I'm not here to make friends", instruction: "Deliver it as a reality-TV confessional monologue to camera (Real Housewives / Bravo energy): dramatic, self-important, throwing shade, 'I'm not here to make friends', present-tense gossip where every petty thing is a massive betrayal. Over-the-top and shameless." },
  { id: "passiveaggressive", label: "Passive-aggressive coworker", hint: "Per my last email", instruction: "Deliver it as a passive-aggressive coworker quietly seething behind fake politeness: 'per my last email', 'just circling back', 'as previously mentioned', 'friendly reminder', 'no worries if not!', 'thanks in advance', a smiling knife behind every courteous line. Weaponized niceness." },
  { id: "sportscaster", label: "Sportscaster", hint: "Play-by-play", instruction: "Deliver it as a frenzied live sports announcer calling play-by-play in present tense, building to an explosive, screaming, climactic call. 'AND HERE WE GO...' 'ARE YOU KIDDING ME?!' 'UNBELIEVABLE, FOLKS!' Rising intensity, capitalized roars at the peak." },
  { id: "infomercial", label: "Infomercial host", hint: "But wait, there's more", instruction: "Deliver it as a breathless late-night infomercial pitchman: open with a frustrated problem ('Tired of...?'), hit the miracle solution, then 'BUT WAIT, THERE'S MORE!', a fake price, 'ACT NOW!', 'operators are standing by!'. Way too excited about everything." },
  { id: "newsanchor", label: "News anchor", hint: "Breaking news", instruction: "Deliver it as a polished TV news anchor: authoritative, measured, 'breaking news', 'we're getting reports', 'more on this developing story', dramatic pauses, and a sign-off." },
  { id: "narrator", label: "Movie trailer guy", hint: "In a world...", instruction: "Deliver it in the voice of THE movie-trailer guy, that deep, booming, epic Hollywood announcer reading whatever this is like the biggest blockbuster of the summer: 'In a world...', huge dramatic pauses, slow-building suspense, gravelly voice-of-God gravitas, every line a momentous reveal, often closing on a hard title-drop. Cinematic and over-the-top. (This is the NARRATOR persona, a booming voice laid over any format, distinct from the Movie Trailer format itself.)" },
  { id: "naturedoc", label: "Nature documentary", hint: "Here we observe...", instruction: "Deliver it as a hushed, reverent nature-documentary narrator (Attenborough): calm and present-tense, observing ordinary human behavior as if it were rare wildlife. 'Here we see the creature in its natural habitat...', 'the male grows restless', 'a fascinating display'. Awe over the mundane, delivered dead serious." },
  { id: "hypeman", label: "Hype man", hint: "Make some noise", instruction: "Deliver it as a concert hype man: 'MAKE SOME NOISE', 'I CAN'T HEAR YOU', 'put your hands up', call-and-response, pure adrenaline and crowd energy." },
  { id: "motivational", label: "Motivational speaker", hint: "Rise and grind", instruction: "Deliver it as an over-the-top motivational speaker: relentless positivity, 'you've got this', 'rise and grind', 'today is the day', big inspirational crescendos and life metaphors." },
  { id: "influencer", label: "Influencer", hint: "Smash that like button", instruction: "Deliver it as a bubbly social-media influencer talking to camera: 'hey guys!', 'don't forget to like and subscribe', 'link in bio', 'this is a game-changer', relentlessly upbeat, turning everything into content and a soft sell, casually dropping in a sponsor plug." },
  { id: "grandma", label: "Sweet grandma", hint: "Oh sweetheart, are you eating?", instruction: "Deliver it as a sweet, doting, slightly-out-of-the-loop grandmother: warm, proud, and endlessly worried about you. 'Oh sweetheart', 'are you eating enough?', 'you look so thin', 'I worry about you', a fond tangent about the family or the weather, a little baffled by technology, and so much love. Cozy and tender, signing off with love." },
  { id: "therapist", label: "Therapist", hint: "How does that make you feel", instruction: "Deliver it as a calm, gentle therapist: warm, non-judgmental, and endlessly soothing. 'And how does that make you feel?', 'it sounds like...', 'let's sit with that for a moment', 'I'm hearing that you...', 'that's completely valid'. Reflective, probing, and relentlessly even-toned, leaning all the way into the soothing-therapist bit." },
  { id: "drillsergeant", label: "Drill sergeant", hint: "DROP AND GIVE ME TWENTY", instruction: "Deliver it as a screaming military drill sergeant an inch from your face: relentless ALL-CAPS barking, 'DROP AND GIVE ME TWENTY', 'MOVE IT MOVE IT', 'IS THAT UNDERSTOOD, RECRUIT', 'YOU CALL THAT AN EMAIL?!'. Treat the smallest task like boot camp, furious, merciless, and absolutely full-volume." },
  { id: "corporateexec", label: "Corporate buzzword exec", hint: "Let's circle back", instruction: "Deliver it as a corporate executive drunk on buzzwords: 'synergy', 'circle back', 'move the needle', 'low-hanging fruit', 'take this offline', 'bandwidth', 'boil the ocean', 'run it up the flagpole'. Empty, confident jargon stacked into meaningless momentum, saying nothing with total conviction." },
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
  { label: "Messages", ids: ["email", "reply", "followup", "text", "dm", "breakup"] },
  { label: "Documents", ids: ["doc", "letter", "memo", "coverletter", "thankyou", "apology", "complaint", "pressrelease"] },
  { label: "Work", ids: ["summary", "tldr", "meeting", "agenda", "status", "todo", "outline", "bug", "idea", "proposal", "pitch", "prompt", "faq", "businessplan"] },
  { label: "Writing", ids: ["review", "howto", "speech", "blog", "caption", "journal"] },
  { label: "Social", ids: ["linkedin", "social"] },
];

export const FUN_GROUPS: OptionGroup[] = [
  { label: "Comedy", ids: ["roast", "meme", "recipe"] },
  { label: "Story", ids: ["tale", "bedtime", "fairytale", "trailer", "screenplay"] },
  { label: "Music", ids: ["rap", "pop", "country", "rnb", "rockabilly"] },
  { label: "Poetry", ids: ["poem", "haiku", "nursery", "limerick"] },
  { label: "Big energy", ids: ["hype", "drama"] },
];

// TONE: grouped so the menu reads by family, not a random list.
export const TONE_GROUPS: OptionGroup[] = [
  { label: "Professional", ids: ["professional", "direct", "confident", "concise", "persuasive", "diplomatic"] },
  { label: "Friendly", ids: ["casual", "friendly", "warm", "empathetic"] },
  { label: "Attitude", ids: ["blunt", "sarcastic", "witty"] },
  { label: "Polished", ids: ["proper", "eloquent"] },
  { label: "Spicy", ids: ["flirty", "romantic", "seductive", "sultry", "steamy", "naughty"] },
  { label: "Character", ids: ["dramatic", "uptight", "robotic"] },
  { label: "Your voice", ids: ["keep"] },
];

// Accents are not split into sub-groups: they are all just accents. One flat,
// neutral list (empty group label renders no header).
// Grouped by region, same header pattern as Format/Tone/Character. Within each
// group: regional accents first, then character-style ones. Reorganization of
// the DISPLAY only; no labels or instructions changed, none added or removed.
export const ACCENT_GROUPS: OptionGroup[] = [
  {
    label: "American",
    ids: [
      "newyork",
      "boston",
      "minnesotan",
      "cowboy",
      "hillbilly",
      "southern",
      "valley",
      "surfer",
      "street",
    ],
  },
  {
    label: "British Isles",
    // "shakespeare" is Elizabethan English, not a modern regional accent, so it
    // has no clean home; placed here (English by origin) as the least-wrong fit.
    // Flagged for Shane to move if he'd rather it sit elsewhere.
    ids: ["british", "cockney", "scottish", "irish", "shakespeare"],
  },
  {
    label: "Elsewhere",
    ids: ["canadian", "australian", "indian", "german"],
  },
];

export const PERSONA_GROUPS: OptionGroup[] = [
  { label: "Comedy", ids: ["karen", "salesman", "angrychef", "sassydiva", "realitytv", "passiveaggressive"] },
  { label: "Performer", ids: ["sportscaster", "infomercial", "newsanchor", "narrator", "hypeman", "motivational", "influencer"] },
  { label: "Characters", ids: ["conspiracy", "dramaqueen", "grandma", "therapist", "drillsergeant", "naturedoc", "corporateexec"] },
  { label: "Generation", ids: ["genz", "millennial", "genx", "boomer"] },
];
