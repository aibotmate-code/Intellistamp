# IntelliStamp Demo Video

Remotion project producing a 45–60 second product demo video for IntelliStamp by Intellical Labs.

## Compositions

| ID | Resolution | Duration |
|---|---|---|
| `IntelliStampDemo` | 1920×1080 (16:9) | 60s @ 30fps |
| `IntelliStampDemoVertical` | 1080×1920 (9:16) | 60s @ 30fps |

## Setup

```bash
cd video
npm install
```

## Preview (Studio)

```bash
npm start
# Opens http://localhost:3000
```

## Render

```bash
# 16:9 horizontal (primary)
npm run render
# → out/intellistamp-demo.mp4

# 9:16 vertical (Reels / Shorts)
npm run render:vertical
# → out/intellistamp-demo-9x16.mp4
```

Or directly with npx:

```bash
npx remotion render IntelliStampDemo out/intellistamp-demo.mp4
```

## Type Check

```bash
npm run typecheck
```

## Scene Breakdown

| Frames | Time | Scene |
|--------|------|-------|
| 0–120 | 0–4s | **Hook** — headline text |
| 120–300 | 4–10s | **Dashboard** — browser frame, stats, QR tab |
| 300–480 | 10–16s | **QR / Kiosk** — fullscreen kiosk mode |
| 480–690 | 16–23s | **Customer Scan** — phone entry → name entry |
| 690–930 | 23–31s | **Stamp Animation** — 2→3/6 gold dot pop |
| 930–1170 | 31–39s | **Reward / Milestones** — progress bars + Google Review |
| 1170–1410 | 39–47s | **Merchant Dashboard** — customer table |
| 1410–1620 | 47–54s | **Branding** — kiosk preview + config summary |
| 1620–1800 | 54–60s | **Final** — logo, tagline, CTA |

## Design Fidelity

All visual components are faithful replicas of the real IntelliStamp UI:

- **Colours**: OKLCH token palette from `globals.css` converted to sRGB
- **Fonts**: Bebas Neue (display), Barlow (body) — same Google Fonts as the production app
- **Components**: StampCard dots, StatsCard, CustomerTable, QRDisplay, KioskMode — all recreated as Remotion-safe React
- **Demo data**: Fictional business "Cresta Bakery 🥐", customer "Rahul", reward "Free Coffee", 3/6 stamps
- **No live APIs**: Zero Supabase calls, zero production dependencies

## Notes

- The QRPattern component renders a static QR-like SVG. In a future iteration, a real QR code can be generated server-side and embedded as a data URI.
- The 9:16 vertical composition uses the same code but crops to a phone viewport. Fine-tune scene layouts in `src/scenes/` if individual scenes need repositioning for vertical.
- Voiceover script: `VOICEOVER.md`
