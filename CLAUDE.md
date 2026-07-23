# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Vite dev server on port 3000 (host 0.0.0.0)
npm run build    # Production build
npm run preview  # Preview the production build
```

There are no tests and no linter configured.

**Setup**: requires a `.env` file with `GEMINI_API_KEY=<key>`. Vite injects it at build time via `define` in [vite.config.ts](vite.config.ts) as both `process.env.API_KEY` and `process.env.GEMINI_API_KEY` — the code reads `process.env.API_KEY`.

## What this is

"Monitor de Emergencias España" — a Spanish emergency-monitoring PWA (single-page React 19 + TypeScript + Vite app). It has no backend and no database: all data comes live from external APIs at request time. UI text, prompts, and comments are in Spanish; keep new user-facing text in Spanish.

The app degrades gracefully without any AI key: the weather quick-status ([services/weatherService.ts](services/weatherService.ts), Open-Meteo + BigDataCloud reverse geocoding — free, keyless, CORS-enabled) works standalone; the alerts module returns explanatory messages when no provider is configured. Never construct the `GoogleGenAI` client at module scope — it throws in the browser when the key is missing and blanks the whole app.

## Architecture

**Provider-agnostic two-phase AI pipeline** — the core of the app, orchestrated by [services/alertsService.ts](services/alertsService.ts):
1. **Search** ([services/searchService.ts](services/searchService.ts)): finds live incident info (AEMET, DGT, Renfe/ADIF, 112, local press) with source URLs. Providers tried in order: Gemini + `googleSearch` grounding (needs a billing-enabled Gemini key — free tier has NO grounding quota), then Tavily. Gemini grounding URIs are opaque `vertexaisearch` redirects; the real domain is only in the chunk *title* — match against titles, not URIs.
2. **Structuring** ([services/llmService.ts](services/llmService.ts)): any OpenAI-compatible `chat/completions` endpoint turns raw search text into typed `AlertEvent[]` + risk analysis. Presets in [services/config.ts](services/config.ts) (Gemini, Groq, OpenRouter, Cerebras, MiniMax, custom — all verified CORS-open for browser use). JSON is requested in the prompt and robustly extracted; `response_format: json_object` is added only when the preset supports it. Each event's `sourceIndex` maps back to a real search-result URL — the anti-hallucination mechanism; a keyword allowlist (`gob.es`, `aemet.es`, ...) decides `SourceType.OFFICIAL` vs `NEWS`.

**Key/config resolution** ([services/config.ts](services/config.ts)): localStorage (`ai_config`, user-editable in the Ajustes modal) overrides build-time env vars. `fetchAlerts` swallows errors and returns explanatory `analysis` messages (missing key / quota / invalid key) instead of throwing — the UI relies on this.

**Monolithic App component**: [App.tsx](App.tsx) holds all application state — view routing via a `ViewState` enum (ONBOARDING / DASHBOARD / HISTORY), filters (radius, category, historical date), theme, and the 60-second auto-refresh "monitor mode" with browser notifications. Persistence is `localStorage` only (`theme`, `is_monitoring`, `custom_sources`). Shared types live in [types.ts](types.ts).

**Presentational pieces**: [components/AlertCard.tsx](components/AlertCard.tsx) and [components/StatsChart.tsx](components/StatsChart.tsx) (Recharts). [services/audioService.ts](services/audioService.ts) synthesizes UI sounds with the Web Audio API (no audio files).

**Styling is CDN Tailwind, not build-time**: Tailwind loads from `cdn.tailwindcss.com` in [index.html](index.html), with the Tailwind config (custom `emergency`/`official`/`social` colors, `radar` animation, `darkMode: 'class'`) defined inline in a `<script>` there. There is no `tailwind.config.js`; changes to theme tokens go in `index.html`. Dark mode toggles the `dark` class on `<html>`.

**PWA**: configured entirely in [vite.config.ts](vite.config.ts) via `vite-plugin-pwa` (`registerType: 'autoUpdate'`, manifest inline).

## Gotchas

- `index.html` contains an esm.sh import map (AI Studio legacy). Dependencies actually resolve from `node_modules` through Vite; if you add a dependency, `package.json` is what matters, but keep the import map in sync if you touch it.
- `@` path alias resolves to the repo root.
- The app originated in Google AI Studio (`metadata.json`, `migrated_prompt_history/` are artifacts of that); don't treat those as active code.
