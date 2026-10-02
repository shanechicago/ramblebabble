# RambleBabble backlog

Order roughly = priority. Kept in the repo so nothing gets lost.

## A. Output quality (the engine — this is the actual product)
- Output FONT: the italic serif in the babble box is wrong and hard to reuse. Change to a
  clean, modern, copy-paste-friendly font. This is the first thing to change in that box.
- PARAGRAPH BREAKS: the babble comes out as one wall of text. Preserve paragraph breaks.
  Fix the dead space on the right; use the box width.
- Punctuation "?" vs "!": the rising question marks are the uptalk VOICE of the sassy /
  valley-girl characters, not a bug. Make sure non-sassy characters do NOT uptalk, and add
  a way to dial uptalk intensity down.
- Tone redundancy: Professional / Direct / Confident / Diplomatic / Concise read too
  similar. Either push each to a distinct, stronger interpretation, or trim the redundant
  ones.
- Street character reads too sophisticated (wants rougher). Cockney is good.

## B. Clear behavior (bug)
- The ramble-box "Clear" and the "Clear ramble" menu item must reset EVERYTHING to default:
  the ramble text, ALL top-bar selections (format, tone, character, accent, language,
  glossary, profanity), AND the babble output.
- Add a SEPARATE control to reset only the top-bar options while keeping the ramble.

## C. Dropdown consistency + behavior (Rule 21 — implement once, apply everywhere)
- Every dropdown (Tone, Character, Accent, Language, Glossary, Profanity) gets the SAME
  nested, collapsible-category structure as Format. Consistent across the board.
- Dropdowns open in a consistent, predictable position anchored to their control. They must
  not flip left/right or jump elsewhere depending on where they sit on screen.

## D. State restoration (bug to confirm)
- Reopening a saved ramble from the archive: the Accent selection appeared to drop and the
  toolbar reshuffled. Confirm every selection restores correctly when a ramble is reopened.

## E. New-user onboarding (HIGH — friends hit this first)
- Welcome / orientation after first signup: what the tool is, how to drive it. No email on
  it. Skippable, re-openable from How-tos.

## F. Workspace polish
- Left rail: full-height, anchored, not a floating cut-off "barnacle."
- Everything except Record and Babble it becomes an underlined clickable word, not a
  bubble/pill (toolbar dropdowns AND the output's selection pills). Only Record and Babble
  it stay buttons.
- Record button more prominent.
- Profanity inline at the END of the toolbar row, no awkward wrap.
- Output header: drop "YOUR BABBLE"; put the selections as underlined words level with
  Copy / Regenerate / New ramble.
- Reduce the wasted vertical space in the ramble and babble boxes.
- Babble it scrolls the page down to the output.

## G. Features
- Audio playback of the babble (Play control on the output).
- Recording "air puppet" character restored (air-dancer, arms out, phrase through the
  middle forming the arms/face) from git history. Rule 27: do not drop again.

## H. Aesthetic north star
- Premium, modern, high-tech, animated. Nested menus, polish, motion. It should feel like a
  million-dollar app, NOT a Wix site from 2008.

## I. Auth phase
- Email as the real signup identity, username optional, password min 8, remove dead
  Google/Apple/Microsoft buttons, restyle login/signup to the brand.
