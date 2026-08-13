# LabCrew Design System

## Direction

**Apple product site × YC SaaS (Linear / Vercel tone)** — light, precise, calm.  
Not: purple gradients, glassmorphism, neon glow, emoji UI, dense “AI dashboard” clutter.

## Brand

- **Name:** LabCrew (hero-level on marketing; wordmark in app nav)
- **Promise:** Your lab’s AI operations crew
- **Primary action:** Run weekly ops

## Typography

- **UI / body:** Geist Sans
- **Mono (traces, IDs):** Geist Mono
- Tight tracking on large headlines; comfortable 1.5 line-height on body

## Color (light-first)

| Token | Value | Use |
| ----- | ----- | --- |
| `--lc-bg` | `#fbfbfd` | Page background (Apple-like cool gray-white) |
| `--lc-surface` | `#ffffff` | Panels |
| `--lc-ink` | `#1d1d1f` | Primary text |
| `--lc-muted` | `#6e6e73` | Secondary text |
| `--lc-line` | `rgba(0,0,0,0.08)` | Borders |
| `--lc-accent` | `#0071e3` | Interactive accent (Apple blue — spare) |
| `--lc-ink-inverse` | `#ffffff` | On solid ink buttons |
| `--lc-success` | `#1f8a4c` | Healthy / complete |
| `--lc-warn` | `#b86e00` | Needs attention |
| `--lc-danger` | `#d70015` | Blocked / failed |

No automatic dark mode in v1 (avoids generic “AI dark SaaS”).

## Layout

- Marketing: one composition first viewport — brand, one headline, one sentence, one CTA group
- App: slim top bar + quiet left rail; Mission Control is the default home
- Radius: 10–14px on surfaces; **not** pill-everything
- Shadow: single soft elevation or none — prefer border + spacing

## Motion

- 180–280ms ease for hovers and panel enters
- Mission Control step stream: subtle sequential reveal (Phase 2)
- Respect `prefers-reduced-motion`

## Anti-patterns (do not ship)

- Inter / Roboto / Arial as brand fonts
- Purple-to-indigo gradients
- Floating badge clutter on hero
- Cards-for-everything
- Chatbot widget as the product
