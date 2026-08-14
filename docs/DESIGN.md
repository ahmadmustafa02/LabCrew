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

## Color

Light + dark themes via `html.dark`. Tokens in `globals.css`. Toggle persists in `localStorage` (`labcrew.theme`).

| Token | Light | Dark | Use |
| ----- | ----- | ---- | --- |
| `--lc-bg` | `#f5f5f7` | `#0a0a0b` | Page background |
| `--lc-surface` | `#ffffff` | `#121214` | Panels |
| `--lc-ink` | `#1d1d1f` | `#f5f5f7` | Primary text |
| `--lc-accent` | `#0071e3` | `#2997ff` | Interactive accent |

Avoid purple neon “AI SaaS” looks — charcoal + Apple blue.

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
