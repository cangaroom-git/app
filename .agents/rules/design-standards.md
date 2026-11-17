---
trigger: always_on
description: Mandatory Cangaroom Design System Constitution enforcing 95/5 monochrome palette, zero hover-scale, zero card shadows/gradients, persistent 72px sidebar, unified 3-tier container grid, 3D flip coupons on /deal, and Instagram SSR DOM tabs on /{hotelSlug}.
---

# Mandatory Design System Enforcement (`my-hotel` / Cangaroom)

Before implementing, creating, or modifying any UI component or page in `my-hotel`, you MUST read and obey `/Users/light/my-hotel/.agents/skills/my-hotel-design-system/SKILL.md`:

1. **FORBIDDEN — Zero Hover Scale**: Never use `hover:scale-*`, `group-hover:scale-*`, or `:hover { transform: scale(...) }` anywhere in the app.
2. **FORBIDDEN — Zero Card Shadows & Zero Gradients/Pastels**: Never use `shadow-*` on cards, banners, or buttons (`1px solid var(--color-border)` only). Never use `bg-gradient-*` or pastel tinted pills/cards (`#0866ff` blue, `#06c755` green, pink/yellow/blue washes are banned).
3. **95/5 Monochrome, 2-Button System & Unified Squircle Curvature**:
   - Canvas `#ffffff` (`#121212` Dark), Muted `#efefef` (`#262626` Dark), Ink `#111111` (`#f5f5f5` Dark), Secondary Ink `#737373` (`#a3a3a3` Dark).
   - Primary buttons are solid `#111111` (`#f5f5f5` Dark); Secondary buttons are flat `#efefef` (`#262626` Dark).
   - All buttons and inputs across the app MUST use squircle curvature matching the `48px` (`rounded-[16px]`) Mobile Bottom Menu (`rounded-[10px]`–`rounded-[16px]`) — **NEVER** use `rounded-full` on buttons or inputs.
   - `#e60023` Red is reserved **exclusively** for Pin `'บันทึก'` (`Save`) buttons and small navigation notification badges/dots.
4. **Unified Shell & 3-Tier Spacing Grid**:
   - Persistent `72px` Left Sidebar + `64px` Top Bar on every route except `/login`.
   - Global gutter `px-4 sm:px-6 lg:px-8` + vertical offset `pt-5 pb-12` owned by `HotelAppShell` (pages never add custom outer `px-*` or uneven `py-*`).
   - Strictly 3 widths: `cgr-page-fluid` (`w-full` for `/`, `/board`), `cgr-page-standard` (`max-w-[1120px]` for `/deal`, `/{hotelSlug}`, `/{hotelSlug}/posts`, `/trips`, `/studio`, `/super-admin`), and `cgr-page-reading` (`760px`) / `cgr-page-form` (`640px`).
5. **Signature Patterns**:
   - `/deal`: Clean pure-white ticket cards with **In-Place 3D Flip (`rotateY(180deg)`)** on click (no front-face clutter).
   - `/{hotelSlug}`: **Facebook Cover Photo Banner Header** (no circular Instagram highlights) + **5 SSR DOM Tabs (`posts` Pinterest Masonry, `rooms` Inline Instant Calendar, `blog`, `reviews`, `more`)** (`hidden` CSS toggle + `?tab=` URL sync + JSON-LD) for 100% Google SEO & AI Crawler visibility.
