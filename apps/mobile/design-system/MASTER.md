# LabCrew Field — design system

Product: research-lab field collection (productivity / scientific SaaS).  
Audience: students and directors collecting rows in the field.  
Stack: Flutter.

## Style

**Minimal editorial SaaS, dark + light.** Same voice as the web product.

- Charcoal surfaces, one Apple-blue accent
- Radius 10–14, hairline borders, almost no shadow
- Plus Jakarta Sans for UI, IBM Plex Mono for numbers
- Motion 180–220ms ease-out; respect reduced motion via short durations
- No purple gradients, no glassmorphism, no emoji icons

## Color

| Token | Light | Dark |
| ----- | ----- | ---- |
| bg | `#f5f5f7` | `#0a0a0b` |
| surface | `#ffffff` | `#121214` |
| ink | `#1d1d1f` | `#f5f5f7` |
| muted | `#6e6e73` | `#a1a1a6` |
| accent | `#0071e3` | `#2997ff` |

## UX rules we implemented

- Touch targets ≥ 48dp on primary buttons
- Visible labels on every field (not placeholder-only)
- Password show/hide
- Bottom nav: 4 items, icon + label
- Safe-area padding on headers and the submit bar
- Skeleton on load; snackbar on error with a retry path
- Charts: you vs cohort, plus a text summary for screen readers
- Conflict sheet: keep mine / view theirs (never silent discard)

## Anti-patterns

- Chat as the product
- Cards-for-everything marketing clutter
- Color-only status (chips always have text)
