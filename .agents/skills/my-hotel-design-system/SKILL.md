---
name: my-hotel-design-system
description: >-
  Core UI/UX design standards for the Cangaroom / my-hotel application. Enforces
  a warm, familiar Facebook Comet inspired social interface: clean icon-first
  navigation, soft neutral wash (#f2f4f7 Light / #18191a Dark), crisp elevated
  cards (#ffffff Light / #242526 Dark), #0866ff brand accent, #c53829 promo
  accent, native Thai + English typography (24px/20px/17px/15px/13px), and
  unified Right Sidebar Drawers.
---

# Cangaroom · Facebook Comet Inspired Design System

Every component, page, and interactive widget MUST strictly follow these design rules:

## 1. Familiar, Human, Zero-Clutter Social Feed Philosophy
- **Look Like a Friendly Social App (Facebook Comet), Never an AI Brochure**:
  - Do NOT stack uppercase `TRACKING-WIDER` eyebrows, verbose marketing essays, or duplicate multi-section landing walls.
  - Present properties like a clean **Facebook Page**: Cover Photo + Circular Avatar + Verified Name + Clear Action Buttons (`เช็กห้องว่าง`, `ทักแชท`, `แชร์`), followed by Reels and clean Post-style Room Cards.
- **Role-Aware Menu Clarity**:
  - Hide unused or admin-only controls from regular guests so menus stay uncluttered and effortless.

## 2. Facebook Comet Color Palette (Light & Dark Mode Tokens)
Always consume CSS variables from `src/app/globals.css`:
- **Canvas Wash (`--color-background-body`)**: `#f2f4f7` (Light) / `#18191a` (Dark).
- **Elevated Card & Top Bar (`--color-background-card`)**: `#ffffff` (Light) / `#242526` (Dark) with subtle elevation `--shadow-card: 0 1px 2px rgba(0, 0, 0, 0.12)`.
- **Secondary Button / Icon Circle (`--color-background-subtle`)**: `#e4e6eb` (Light) / `#4e4f50` (Dark).
- **Input / Muted Surface (`--color-background-muted`)**: `#f0f2f5` (Light) / `#3a3b3c` (Dark).
- **Primary Brand Blue (`--color-accent`)**: `#0866ff` (hover `#075ce5` Light / `#2d88ff` Dark) with `--color-on-accent: #ffffff`.
- **Promotion & Discount Red (`--color-promo`)**: `#c53829` with `--color-on-promo: #ffffff`.
- **Typography Colors**:
  - `--color-text-primary`: `#080809` (Light) / `#e4e6eb` (Dark)
  - `--color-text-secondary`: `#65686c` (Light) / `#b0b3b8` (Dark)

## 3. Unified Controls, Radii & Right Sidebar Drawers
- **Buttons**: `h-9` (`36px`) / `h-10` (`40px`), `rounded-[8px]` (`--radius-button`), `15px` semibold.
- **Circular Icon Buttons (`.btn-icon`, `.btn-icon-lg`)**: `36px` / `40px` `rounded-full` circles on `--color-background-subtle`.
- **Cards (`.app-card`)**: `rounded-[12px]` (`--radius-page`), crisp white `#ffffff` on `#f2f4f7` wash.
- **Right Sidebar Drawers (`.app-right-drawer`)**: All calendars, galleries, room details, 15-min QR checkout, video players, and mobile menus open exclusively as Right Sidebar Drawers (`fixed inset-y-0 right-0 h-[100dvh]`) — never centered modals.

## 4. Native Facebook Thai + English Font Stack & 5-Tier Scale
- **Font Family**: `system-ui, -apple-system, BlinkMacSystemFont, ".SFNSText-Regular", "Segoe UI Historic", "Segoe UI", Helvetica, Arial, sans-serif` (renders native OS Thai & English fonts identically to `facebook.com`: SF Pro + Thonburi on macOS/iOS, Segoe UI + Leelawadee UI on Windows).
- **5-Tier Scale**:
  1. `.ty-display` (`24px` desktop / `22px` mobile, bold)
  2. `.ty-title` (`20px`, bold)
  3. `.ty-subtitle` (`17px`, semibold)
  4. `.ty-body` (`15px`, regular/medium)
  5. `.ty-caption` (`13px`, secondary metadata)
