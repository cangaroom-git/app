---
name: my-hotel-design-system
description: >-
  Core UI/UX design standards for Cangaroom / my-hotel. Enforces ZERO hover
  scale site-wide, Instagram-style minimal 72px pure-white left icon sidebar,
  and Pinterest Gestalt UI (pure #ffffff canvas, #f1f1f1 search bar, staggered
  variable-height Masonry Pin cards, Split 2-Column Pin Close-Up card with
  interactive comments, #e60023 Save/Promo red, and native Thai/EN system font).
---

# Cangaroom · Pinterest Gestalt & Instagram Minimal Design System

Every component, page, and interactive widget MUST strictly follow these design rules:

## 1. STRICT FORBIDDEN RULE
- **NO Hover Scale Anywhere (`ห้ามใช้ hover แล้ว scale ทั้งเว็บเด็ดขาด`)**:
  - **NEVER** apply `hover:scale-*`, `group-hover:scale-*`, or `:hover { transform: scale(...) }` to ANY image, Pin card, video thumbnail, button, or icon anywhere in the codebase.
  - On Pin cards, hover feedback uses a subtle `bg-black/25` dim overlay revealing the `#e60023` `บันทึก` pill and circular action buttons.

## 2. Navigation: Instagram `72px` Left Rail + Pinterest Top Search Bar
- **Desktop Left Sidebar (`w-[72px]`, pure `#ffffff` / `#121212`)**:
  - Top slot: Minimal brand icon.
  - Middle stack: Vertically centered minimal `24px` outline/solid icons (`h-12 w-12 rounded-[12px]`, transparent at rest, subtle hover fill) + circular user avatar.
  - Bottom slot: Minimal `≡` More menu icon with popover settings.
- **Top Bar (`h-16`, pure `#ffffff` / `#121212`)**:
  - Full-width `#f1f1f1` rounded-full Search Pill + right-side quick Calendar filter icon + User Profile Avatar & `⌄` menu.

## 3. Home Feed: Pinterest Staggered Masonry + Split Pin Detail with Comments
- **Masonry Grid**: Multi-column (`2` to `6` columns) variable-height `rounded-[16px]` Pin cards mixing room photography, atmosphere shots, guest reviews, promos, and short videos (`0:18` duration badge).
- **Pin Close-Up View**: Clicking any Pin renders Pinterest's Split 2-Column Card (`rounded-[28px]`, border `#efefef`, subtle shadow) with:
  - Left column: `←` Back circle, crisp photo/carousel or video player, `⤢` fullscreen zoom button.
  - Right column: `♡` Like + count, `💬` comment count, `↑` Share, `#e60023` `บันทึก` pill, resort author row, bold title, gray `#efefef` pill button (`เช็กวันว่าง & ราคา`), expandable `คำอธิบาย`, scrollable comments list, and sticky bottom `เพิ่มความคิดเห็นเพื่อแชร์ความเห็นของคุณ` pill input.
  - Surrounded on the right (`xl+`) and underneath by staggered Related Masonry Pins.

## 4. Pinterest Gestalt Color Palette & Native System Font
- **Canvas & Card**: `#ffffff` (Light) / `#121212` & `#1e1e1e` (Dark).
- **Muted / Pill Surface**: `#f1f1f1` & `#efefef` (hover `#e2e2e2`) Light / `#2b2b2b` Dark.
- **Text**: `#111111` primary, `#767676` secondary (Light) / `#f5f5f5` & `#a3a3a3` (Dark).
- **Save / Promo Red (`--color-promo`)**: `#e60023` (hover `#ad081b`).
- **Accent (`--color-accent`)**: `#0866ff` (booking / verified badges).
- **Font Stack**: `system-ui, -apple-system, BlinkMacSystemFont, ".SFNSText-Regular", "Segoe UI Historic", "Segoe UI", Helvetica, Arial, sans-serif`.
