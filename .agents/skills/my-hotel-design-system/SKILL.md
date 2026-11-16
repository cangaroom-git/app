---
name: my-hotel-design-system
description: >-
  Core UI/UX design standards for Cangaroom / my-hotel. Enforces ZERO hover
  scale site-wide, pure distraction-free photo/video viewing, Facebook Comet
  theme tokens (#f2f4f7/#18191a wash, #ffffff/#242526 crisp cards, #0866ff
  brand accent, #c53829 promo), Instagram-style mixed media grid on Home, and
  native system-ui Thai + English typography (24px/20px/17px/15px/13px).
---

# Cangaroom · UI/UX Design System

Every component, page, and interactive widget MUST strictly follow these design rules:

## 1. STRICT FORBIDDEN RULES (กฎเหล็กห้ามฝ่าฝืน)
- **NO Hover Scale Anywhere (`ห้ามใช้ hover แล้ว scale ทั้งเว็บเด็ดขาด`)**:
  - **NEVER** apply `hover:scale-*`, `group-hover:scale-*`, `lg:group-hover:scale-*`, or `:hover { transform: scale(...) }` to ANY image, video thumbnail, card, button, or icon anywhere in the codebase.
  - For hover feedback, use only subtle background, border, or brightness/opacity shifts (e.g. `hover:brightness-95`, `hover:bg-[var(--color-background-muted)]`).
- **Pure Media Viewing (`กดรูปหรือวิดีโอ ต้องเปิดดูแค่รูป/วิดีโอเท่านั้น`)**:
  - When a user clicks a photo, multi-photo carousel, or video thumbnail, open **ONLY** a clean photo/carousel/video viewer (`PureMediaViewer`).
  - **NEVER** force-open room detail sheets (`รูปภาพ & รายละเอียด`), countdown timers, comment walls, or booking CTAs when someone clicks media. Users who want to book will use the dedicated `/booking` page.

## 2. Facebook Comet Color Palette (Light & Dark Mode Tokens)
Always consume CSS variables from `src/app/globals.css`:
- **Canvas Wash (`--color-background-body`)**: `#f2f4f7` (Light) / `#18191a` (Dark).
- **Elevated Card & Top Bar (`--color-background-card`)**: `#ffffff` (Light) / `#242526` (Dark) with `--shadow-card: 0 1px 2px rgba(0, 0, 0, 0.12)`.
- **Secondary Button / Icon Circle (`--color-background-subtle`)**: `#e4e6eb` (Light) / `#4e4f50` (Dark).
- **Input / Muted Surface (`--color-background-muted`)**: `#f0f2f5` (Light) / `#3a3b3c` (Dark).
- **Primary Brand Blue (`--color-accent`)**: `#0866ff` (hover `#075ce5` Light / `#2d88ff` Dark) with `--color-on-accent: #ffffff`.
- **Promotion & Discount Red (`--color-promo`)**: `#c53829` with `--color-on-promo: #ffffff`.
- **Typography Colors**:
  - `--color-text-primary`: `#080809` (Light) / `#e4e6eb` (Dark)
  - `--color-text-secondary`: `#65686c` (Light) / `#b0b3b8` (Dark)

## 3. Unified Controls, Radii & Drawers
- **Buttons**: `h-9` (`36px`) / `h-10` (`40px`), `rounded-[8px]` (`--radius-button`), `15px` semibold.
- **Circular Icon Buttons (`.btn-icon`, `.btn-icon-lg`)**: `36px` / `40px` `rounded-full` circles on `--color-background-subtle`.
- **Cards (`.app-card`)**: `rounded-[12px]` (`--radius-page`), crisp white `#ffffff` on `#f2f4f7` wash.
- **Booking & Settings Drawers (`.app-right-drawer`)**: Booking calendars, checkout steps, coupon bag, and mobile profile menus open as Right Sidebar Drawers (`fixed inset-y-0 right-0 h-[100dvh]`).

## 4. Native System Font Stack & 5-Tier Scale
- **Font Family**: `system-ui, -apple-system, BlinkMacSystemFont, ".SFNSText-Regular", "Segoe UI Historic", "Segoe UI", Helvetica, Arial, sans-serif` (renders `SF Pro + ThonburiUI` on macOS/iOS and `Segoe UI + Leelawadee UI` on Windows).
- **5-Tier Scale**:
  1. `.ty-display` (`24px` desktop / `22px` mobile, bold)
  2. `.ty-title` (`20px`, bold)
  3. `.ty-subtitle` (`17px`, semibold)
  4. `.ty-body` (`15px`, regular/medium)
  5. `.ty-caption` (`13px`, secondary metadata)
