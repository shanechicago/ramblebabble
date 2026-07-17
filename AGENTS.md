<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# RambleBabble layout contract (non-negotiable)

These rules are permanent and apply to EVERY change, without being re-explained.
Read them before touching any layout, and check them again before reporting done.
They exist because the same regressions kept coming back.

1. NO SCROLLBARS INSIDE PANELS. Ever. If a panel's content is too tall, the panel gets taller or the content gets smaller. A panel never scrolls inside itself. A textarea never shows a scrollbar at rest. Only the PAGE may scroll.
2. THE PRIMARY BUTTON IS NEVER BURIED. "Babble it" must be visible without scrolling, at every screen size, in every state. If a change pushes it below the fold, the change is wrong.
3. RECORD IS NEVER BURIED. Record is the app's core input method and must always be visible without scrolling.
4. ONE PRIMARY ACTION. "Babble it" is the only emphasized button. Everything else is small and quiet. No full-width gradient bars on secondary controls.
5. DO NOT STACK CONTROLS THAT FIT ON ONE ROW. Small controls sit side by side. Never give a small control its own full-width row by default.
6. NEVER PUT LIGHT TEXT ON A LIGHT SURFACE, or same-tone text on same-tone background. All text must have strong contrast in both themes.
7. DARK MODE MUST BE GENUINELY DARK: deep near-black panels, light text, accent pops. Not a dimmed light theme.
8. THE LANDING PAGE IS OFF-LIMITS unless explicitly asked. Never modify it as a side effect.
9. EVERY CHANGE APPLIES TO MOBILE, TABLET, AND DESKTOP. Never fix one width and leave another broken.
10. AFTER EVERY LAYOUT CHANGE, VERIFY THE WHOLE SCREEN, not just the thing you changed. Explicitly confirm rules 1, 2, and 3 still hold at roughly 390px, 820px, and 1440px wide, at a 700px-tall viewport. If any rule broke, fix it before reporting done. Do not report a layout change as complete without this check.
