---
name: my-hotel-design-system
description: >-
  Core UI/UX design standards for the my-hotel application. Enforces an
  Icon-First / Minimal-Text interface, strict monochrome theme tokens
  (Light/Dark mode), a single centered 760px social feed layout, and the
  5-tier typography scale. Always read and follow this skill when designing,
  creating, or updating any UI component or page in my-hotel.
---

# My-Hotel Design System & UI Standards

Every component, page, and interactive widget in `my-hotel` MUST strictly follow these design rules:

## 1. Icon-First, Minimal-Text Philosophy (สำคัญมาก: เน้น Icon ไม่เน้น Text เยอะ)
- **Visuals & Icons Over Text**: The application is designed like a modern Social Media App (Instagram / TikTok / Threads). Users scan visually rather than reading long paragraphs.
- **Avoid Clutter**: Do NOT stack multi-line descriptions, rotating paragraphs, noisy badges, or text-heavy chip rows inside cards or bars.
- **Use Icons for Actions & Specs**:
  - Represent actions (Like, Share, Ask AI, Check Rooms, Deals, Audio, Expand) primarily with clean `lucide-react` icons or icon-only circular buttons (`h-9 w-9` / `h-10 w-10 rounded-full`).
  - Keep labels short (1–2 words max) or rely on `title` / `aria-label` tooltips where the icon is self-explanatory.

## 2. Strict Monochrome Color Palette (Theme Tokens Only)
- **Never use arbitrary colorful/neon gradients** (no random cyan, pink, purple, or cartoon colors on illustrations/bots/cards).
- All UI elements, icons, and custom SVG illustrations/animations (including the AI Bot) MUST use the CSS variables from `src/app/globals.css`:
  - Primary Accent: `var(--color-accent)` (`#171717` in Light Mode, `#f5f5f5` in Dark Mode)
  - On Accent: `var(--color-on-accent)` (`#ffffff` in Light Mode, `#1C1C1D` in Dark Mode)
  - Surfaces: `var(--color-background-body)`, `var(--color-background-card)`, `var(--color-background-muted)`
  - Text: `var(--color-text-primary)`, `var(--color-text-secondary)`
  - Borders: `var(--color-border)`, `var(--color-border-emphasized)`
  - Status Indicators: Use semantic status colors (`var(--color-success)`, `var(--color-warning)`, `var(--color-error)`) sparingly (e.g., a small online status dot or `StatusPill`).

## 3. Single Centered Social Feed (`760px` Max-Width) & Instagram Desktop Right Rail
- All public pages render inside `StandardFeedContainer` (`max-w-[760px] mx-auto`) and `StandardCard` (`rounded-[20px]` on desktop, edge-to-edge on mobile).
- Desktop secondary panels (such as the Room Availability & Quick Jump list on the right side of the feed) MUST follow **Instagram Desktop's 2-Column Flex + Sticky Right Rail architecture**:
  - **NEVER use `position: fixed` for the right rail**, as `fixed` causes the sidebar to overlap the central feed when the viewport narrows.
  - Always place the `760px` Feed Column (`flex-1 max-w-[760px] min-w-0`) and the Right Rail (`hidden xl:flex w-[160px] shrink-0 sticky top-4`) inside a shared parent flex row (`max-w-[960px] mx-auto flex justify-center items-start gap-8`) so they push each other naturally and never overlap.
  - No boxy outer borders, no heavy card shadows, and no noisy section headers (`Suggested rooms`, `See all`, profile headers, or date ranges).
  - **Ultra-Minimal Room Row**: Each item displays ONLY 3 elements:
    1. `44px` (`h-11 w-11`) circular room image/icon with a small availability dot,
    2. Short room code (`A1`, `A2`),
    3. Concise availability status (`ว่าง` / `เต็ม` or `Available` / `Full`). Never include long room names, prices, or extra action links.
- Media (Photos & 9:16 Reels/Shorts) must be clean and unobstructed—avoid heavy dark gradients or walls of text overlaid on photos/videos.

## 4. Strict 5-Tier Typography Scale
Never use arbitrary font sizes. Only use the 5 standardized typography classes defined in `src/app/globals.css`:
1. `.ty-display` (`24px` desktop / `22px` mobile, bold)
2. `.ty-title` (`18px`, bold)
3. `.ty-subtitle` (`16px`, semibold)
4. `.ty-body` (`14px`, regular/medium)
5. `.ty-caption` (`12px`, secondary meta/labels)
