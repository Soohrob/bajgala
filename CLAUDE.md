# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Bajgala is a messaging-app simulator for texting AI personas of 29 thinkers, athletes, and film characters, driven live by the Claude API (`claude-opus-4-8`) from the browser. It's a Vite + React + Tailwind v4 SPA with the long-term goal of shipping as an iOS app (Capacitor wrap + backend proxy are planned but not built).

## Commands

```bash
npm run dev        # dev server on :5173, --host (LAN-accessible for phone testing)
npm run build      # production build to dist/
```

There are no tests and no linter. Verification is manual: build + exercise the UI.

**Deploy:** push to `main` → GitHub Actions builds and publishes to GitHub Pages at https://soohrob.github.io/bajgala/ (~35s). The workflow sets `GITHUB_PAGES=true`, which switches Vite's `base` to `/bajgala/` — don't hardcode asset paths.

## Architecture

**The entire app is one file: `src/App.jsx` (~2,800 lines). This is intentional — keep it that way unless the user asks otherwise.** The file is organized in labeled sections, top to bottom: sound engine → `CHARACTERS` database → helpers → response generation → UI components → main `App` → screens (ThreadList/ThreadRow, ComposeSheet, BroadcastSheet, ChatView, SettingsSheet).

### The friction engine (core of the product)

Characters must never reply instantly. Every user send runs an asynchronous lifecycle per character: Sent → (1–3s) → Delivered → (2–5s × availability multiplier, time-of-day aware) → Read → LLM generation → typing indicator (duration = chars / `baseTypingSpeed` ± 2s) → reply bubbles. Key mechanics:

- **Timers** live in `timersRef` keyed by character id; `cycleRef` holds a per-character "cycle token" object.
- **Double-texting**: a send while a cycle is in flight clears all timers, and the new cycle carries `doubleTexted: true`, which injects `[System Note: The user has double-texted you before you responded]` into the prompt. After any `await`, code compares `cycleRef.current[charId] !== cycleToken` to discard stale in-flight replies — preserve this guard when touching `beginReply`.
- **Multi-bubble bursts**: replies split on blank lines (max 3 bubbles); characters with `burst: true` (Dostoyevsky, Sherlock) are prompted to use them.
- On mount, threads whose last message is an unanswered user text get their lifecycle restarted (timers don't survive refresh).

### LLM generation (`generateWithClaude`)

- Calls the Anthropic API **directly from the browser** (`dangerouslyAllowBrowser: true`). Key resolution: localStorage (`bajgala_api_key`, set via Settings) → `VITE_ANTHROPIC_KEY` from `.env.local` (git-ignored; exists locally, NOT in the Pages build — users paste their key once per device).
- Every request includes the `web_search_20260209` server tool with a `pause_turn` continuation loop. **Text blocks before the last search block are deliberately discarded** — they're "let me check" narration that breaks the persona illusion. The system prompt forbids assistant-style behavior (no reciting schedules, no mentioning searches, react as an insider).
- **Vision**: user photos in the last 6 messages are sent as base64 image blocks; older ones degrade to `[sent a photo]` text to cap token cost.
- On any API failure, `generateReply` silently falls back to canned in-character responses (`fallback` pools on each character). Every character must have `greeting`, `general[]`, and `doubleText` fallbacks — keep this when adding roster entries.

### Character database

`CHARACTERS` entries carry `persona` (the system prompt — several were supplied verbatim by the user; don't rewrite them without being asked), `baseTypingSpeed`, `availability` (drives read-delay multipliers, the `isOnline` dot, and special cases: `nocturnal` is fast at night, `market_hours` characters brush you off after hours), `statusText`, `burst`, and the fallback pools. Dostoyevsky replies only in Russian, Messi only in Spanish — by design.

### Persistence

Everything is in localStorage under `bajgala_*` keys (conversations, seen timestamps, archived map, settings, API key). Conversations are **per-device**; there is no sync (planned backend feature). Images are canvas-compressed to ~50KB JPEG before storing — localStorage's ~5MB quota is the ceiling, and all `localStorage.setItem` calls are wrapped in try/catch to fail silently.

### UI system

- **Theming**: class-based dark mode via `@custom-variant dark` in `src/index.css`; the `dark` class is applied to the root div from Settings (`light`/`dark`/`auto`, auto follows `prefers-color-scheme`). Palette is hardcoded hex (indigo `#5B6CFF` accent, pink `#ff4fa0` FAB, dark navy surfaces like `#0f1120`/`#1e2140`) per a design-inspiration mockup the user provided — not Tailwind's default colors.
- **Screen transitions**: thread list and chat are two absolutely-positioned panes translated inside an `overflow-hidden` stage. **Never use `scrollIntoView` for chat autoscroll** — it horizontally scrolls the stage and breaks navigation (past bug); pin via `scrollerRef.scrollTop = scrollHeight` instead.
- **Swipe rows** (`ThreadRow`): dragging writes `style.transform` directly on the DOM node (zero React re-renders mid-drag), with velocity-based flick detection and rubber-band overdrag. State (`openSwipeId`) only changes on release. Keep drag handling imperative; routing it through React state causes jank and breaks under batched synthetic events.
- **Sounds** are synthesized with Web Audio oscillators (no asset files) and gated by the Settings toggle.

## Constraints & context

- The user's API key was previously committed nowhere but does exist in `.env.local` and chat history; a backend proxy + key rotation is the agreed plan before any public/production release.
- The GitHub Pages deployment is a stopgap ("until the app is fully built") — the repo is public, so never commit secrets or bake keys into builds.
- The roster includes living public figures; App Store submission will need consent/parody/renaming decisions (flagged to the user already).
