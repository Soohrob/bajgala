# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Bajgala is a messaging-app simulator for texting AI personas of 42 thinkers, athletes, and film characters, driven live by the Claude API (`claude-opus-4-8`) from the browser. It's a Vite + React + Tailwind v4 SPA with the long-term goal of shipping as an iOS app (Capacitor wrap + backend proxy are planned but not built).

## Commands

```bash
npm run dev        # dev server on :5173, --host (LAN-accessible for phone testing)
npm run build      # production build to dist/
```

There are no tests and no linter. Verification is manual: build + exercise the UI.

**Deploy:** push to `main` → GitHub Actions builds and publishes to GitHub Pages at https://soohrob.github.io/bajgala/ (~35s). The workflow sets `GITHUB_PAGES=true`, which switches Vite's `base` to `/bajgala/` — don't hardcode asset paths.

## Architecture

**The entire app is one file: `src/App.jsx` (~3,800 lines). This is intentional — keep it that way unless the user asks otherwise.** The file is organized in labeled sections, top to bottom: sound engine → `CHARACTERS` database → helpers → response generation → UI components → main `App` → screens (ThreadList/ThreadRow, ComposeSheet, BroadcastSheet, ChatView, SettingsSheet).

### The friction engine (core of the product)

Characters must never reply instantly. Every user send runs an asynchronous lifecycle per thread: Sent → (1–3s) → Delivered → (2–5s × availability multiplier, time-of-day aware) → Read → LLM generation → typing indicator (duration = chars / `baseTypingSpeed` ± 2s) → reply bubbles. Key mechanics:

- **Timers** live in `timersRef` keyed by thread id (character id or `grp_*` group id); `cycleRef` holds a per-thread "cycle token" object.
- **Double-texting**: a send while a cycle is in flight clears all timers, and the new cycle carries `doubleTexted: true`, which injects `[System Note: The user has double-texted you before you responded]` into the prompt. After any `await`, code compares `cycleRef.current[charId] !== cycleToken` to discard stale in-flight replies — preserve this guard when touching `beginReply`.
- **Multi-bubble bursts**: replies split on blank lines (max 3 bubbles); characters with `burst: true` (Dostoyevsky, Sherlock) are prompted to use them.
- On mount, threads whose last message is an unanswered user text get their lifecycle restarted (timers don't survive refresh) — this covers both 1:1 and group threads.
- **Group chats**: threads with `grp_` ids reference a `groups` entry (`{id, name, members, createdAt}` in `bajgala_groups_v1`). A send plans 2–3 responders (`planResponders`: anyone name-dropped + random members; minimum two voices so group questions never get a lone reply) who reply **sequentially**, each seeing the full thread so they react to each other. Group history is mapped from each responder's POV: their own messages become `assistant` turns, everyone else's become labeled `user` turns (`[Name]: …`) — never end the mapped history on `assistant` (prefill 400s). The `typing` map holds `true` for 1:1 and the typing character's id for groups.

### LLM generation (`generateWithClaude`)

- Calls the Anthropic API **directly from the browser** (`dangerouslyAllowBrowser: true`). Key resolution: localStorage (`bajgala_api_key`, set via Settings) → `VITE_ANTHROPIC_KEY` from `.env.local` (git-ignored; exists locally, NOT in the Pages build — users paste their key once per device).
- Every request includes the `web_search_20260209` server tool with a `pause_turn` continuation loop. **Text blocks before the last search block are deliberately discarded** — they're "let me check" narration that breaks the persona illusion. The system prompt forbids assistant-style behavior (no reciting schedules, no mentioning searches, react as an insider).
- **Vision**: user photos in the last 6 messages are sent as base64 image blocks; older ones degrade to `[sent a photo]` text to cap token cost.
- **Time-gap awareness**: gaps > 3h between exchanges are injected as a prompt note so characters react to silence in character.
- **Prompt behavior rules** (don't weaken these — each came from user feedback): brevity ("MATCH LENGTH TO THE MOMENT"), no reflexive trailing questions, offer real book/film/person recommendations when the topic invites it, and rare `delayed` comebacks (a `delayed` extra in `beginReply`, ~12%, adds a long first-bubble delay + an apology-for-the-gap prompt note).
- **Long-term memory**: every ~12 messages per 1:1 thread, `maybeDistill` runs a background call that rewrites a ≤120-word facts file (`bajgala_memory_v1`), injected into all future prompts for that character (including group prompts). Fire-and-forget; failures are silent.
- **Daily statuses**: once per day (`bajgala_status_v1`), one web-search-enabled call regenerates every character's status line as JSON; `statusMap` overlays `statusText` in the info panel and compose list.
- On any API failure the app falls back to canned in-character responses (`fallback` pools) and surfaces it: an amber banner when no key is set, a transient toast when a call fails despite a key. Every character must have `greeting`, `general[]`, and `doubleText` fallbacks — keep this when adding roster entries.

### Character database

`CHARACTERS` entries carry `persona` (the system prompt — several were supplied verbatim by the user; don't rewrite them without being asked), `baseTypingSpeed`, `availability` (drives read-delay multipliers, the `isOnline` dot, and special cases: `nocturnal` is fast at night, `market_hours` characters brush you off after hours), `statusText`, `burst`, and the fallback pools. Dostoyevsky replies only in Russian, Messi only in Spanish — by design.

### Persistence

Everything is in localStorage under `bajgala_*` keys, each with a `const LS_*` at the top of `App.jsx`: conversations (`_convos_v1`), seen timestamps (`_seen_v1`), archived map (`_archived_v1`), groups (`_groups_v1`), distilled memory (`_memory_v1`), daily statuses (`_status_v1`), pinned chats (`_pins_v1`), settings (`_settings_v1`), API key (`_api_key`). Reactions live inline on each message object (`reaction: {emoji, by}`). Conversations are **per-device**; there is no sync (planned backend feature). Images are canvas-compressed to ~50KB JPEG before storing — localStorage's ~5MB quota is the ceiling, and all `localStorage.setItem` calls are wrapped in try/catch to fail silently.

### UI system

- **Theming**: class-based dark mode via `@custom-variant dark` in `src/index.css`; the `dark` class is applied to the root div from Settings (`light`/`dark`/`auto`, auto follows `prefers-color-scheme`). Palette is hardcoded hex (muted navy `#3d5787` accent + outgoing bubbles, light periwinkle `#dfe6f7` incoming bubbles, near-white `#f5f7fd` chat bg, dark navy surfaces like `#0f1120`/`#1e2140`) per a Google-Messages-style mockup the user provided — not Tailwind's default colors.
- **Screen transitions**: thread list and chat are two absolutely-positioned panes translated inside an `overflow-hidden` stage. **Never use `scrollIntoView` for chat autoscroll** — it horizontally scrolls the stage and breaks navigation (past bug); pin via `scrollerRef.scrollTop = scrollHeight` instead.
- **Swipe rows** (`ThreadRow`): dragging writes `style.transform` directly on the DOM node (zero React re-renders mid-drag), with velocity-based flick detection and rubber-band overdrag. State (`openSwipeId`) only changes on release. Keep drag handling imperative; routing it through React state causes jank and breaks under batched synthetic events. Long-press (480ms) on a row pins/unpins the chat (max 3, `bajgala_pins_v1`; pinned sort first).
- **Layout shells**: the phone frame is a column of [content area (list pane + all sheets) → fixed tab bar], with the chat pane absolutely positioned over everything — that's how the tab bar stays visible on contacts/settings but disappears inside a chat. Don't move the sheets out of the content area or they'll cover the tab bar again.
- **Swipe-back in chat** (`onChatPointer*` in App): drags override the CSS `translate` property (NOT `transform` — Tailwind v4 positions the panes via `translate`, so transform would compound). Inline styles are cleared synchronously after the snap; never defer that cleanup to `requestAnimationFrame` (it stalls in background tabs and strands the pane off-screen).
- **Sounds** are synthesized with Web Audio oscillators (no asset files) and gated by the Settings toggle.
- **Message reactions & long-press menu** (`ChatView`): long-press (420ms) a bubble opens a reaction row + Copy/Delete. Reactions store as `{emoji, by}` on the message (`by: "user"|"char"`); characters occasionally tapback the user's last message in `beginReply` (~22%). The menu is a fixed overlay clamped to the touch Y.
- **Swipe-row action buttons are opacity-controlled** (`showActions`), hidden at rest so they can't flicker through during momentum scroll — a past bug. Don't make them always-visible.
- **Character photos**: `public/avatars/{id}.jpg` (256px squares) fetched by `scripts/fetch-avatars.mjs` from each subject's Wikipedia lead image — **Commons-hosted files only** (the script rejects non-free `/wikipedia/en/` images automatically; film characters use the actor's freely-licensed photo). `public/avatars/SOURCES.md` is the attribution record; verify per-file licenses before commercial use. `Avatar` falls back to the monogram gradient on 404, so new characters work before their photo exists.
- **Aurora containment (past bug)**: the `.chat-aurora` blobs overflow their box edges; the class must live on a dedicated `absolute inset-0 overflow-hidden pointer-events-none` layer INSIDE the chat pane — never on the pane itself, or the overflow becomes scrollable and the browser side-scrolls the pane when focusing the composer. The autoscroll effect also pins `chatPane.scrollLeft = 0` as a guard.
- **Display font**: Space Grotesk (variable, OFL) self-hosted at `src/assets/space-grotesk.woff2` (imported via CSS so Vite rebases it under the Pages base path — do NOT reference public/ fonts from CSS with absolute URLs). Applied via `.display-font` to the wordmark and headers.
- **Design accents live in `index.css`**: `.gradient-text` (Messages heading), `.online-pulse` (presence dots), `.chat-aurora` (drifting blurred gradient blobs behind the chat via ::before/::after). Keep chat header/scroller/composer at `z-[1]`+ so they sit above the aurora.
- **PWA**: `public/` holds the manifest, generated icons, and a stale-while-revalidate service worker (`sw.js`, registered only in prod builds via `import.meta.env.BASE_URL`). Bump the `CACHE` name in `sw.js` if a deploy must invalidate cached shells. Icons were generated by a dependency-free script (indigo bubble mark) — regenerate rather than hand-edit.

## Constraints & context

- The user's API key was previously committed nowhere but does exist in `.env.local` and chat history; a backend proxy + key rotation is the agreed plan before any public/production release.
- The GitHub Pages deployment is a stopgap ("until the app is fully built") — the repo is public, so never commit secrets or bake keys into builds.
- The roster includes living public figures; App Store submission will need consent/parody/renaming decisions (flagged to the user already).
