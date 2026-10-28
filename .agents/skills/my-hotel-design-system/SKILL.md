---
name: my-hotel-design-system
description: >-
  Core UI/UX design standards for the my-hotel application. Enforces an
  Icon-First / Minimal-Text interface, strict brand & promotion theme tokens
  (Light/Dark mode, #1751ae brand accent, #c53829 promotion/discount accent),
  a single centered 1140px social feed layout, unified Right Sidebar Drawers,
  Noto Sans Thai font, and the 5-tier typography scale. Always read and follow
  this skill when designing, creating, or updating any UI component or page in
  my-hotel.
---

# My-Hotel Design System & UI Standards

Every component, page, and interactive widget in `my-hotel` MUST strictly follow these design rules:

## 1. Icon-First, Minimal-Text Philosophy (สำคัญมาก: เน้น Icon ไม่เน้น Text เยอะ)
- **Visuals & Icons Over Text**: The application is designed like a modern Social Media App (Instagram / TikTok / Threads). Users scan visually rather than reading long paragraphs.
- **Avoid Clutter**: Do NOT stack multi-line descriptions, rotating paragraphs, noisy badges, or text-heavy chip rows inside cards or bars.
- **Use Icons for Actions & Specs**:
  - Represent actions (Like, Share, Ask AI, Check Rooms, Deals, Audio, Expand) primarily with clean `lucide-react` icons or icon-only circular buttons (`h-9 w-9` / `h-10 w-10 rounded-full`).
  - Keep labels short (1–2 words max) or rely on `title` / `aria-label` tooltips where the icon is self-explanatory.

## 2. Strict Brand & Promotion Color Palette (Light & Dark Mode Tokens)
Never use arbitrary hex codes, neon colors, or decorative gradients. Always consume CSS variables from `src/app/globals.css`:
- **Primary Brand Accent**: `var(--color-accent)` (`#1751ae` Royal Blue in Light Mode, `#3b82f6` in Dark Mode) with `var(--color-on-accent)` (`#ffffff`).
- **Promotion & Discount Color (`#c53829`)**:
  - `var(--color-promo)`: `#c53829` (mandatory for all discount badges `ลด X%`, promo coupons, voucher pills, discount rows `−฿...`, and deal claim CTAs).
  - `var(--color-on-promo)`: `#ffffff` (WCAG AA compliant contrast on `#c53829`).
  - `var(--color-promo-muted)`: subtle promo tint background (`rgba(197, 56, 41, 0.10)` Light / `rgba(197, 56, 41, 0.20)` Dark).
  - `var(--color-promo-text)`: `#c53829` (Light) / `#f26b5e` (Dark) for readable text/icons on muted promo surfaces.
- **Flat 1-Layer Tonal Architecture (Zero Clutter Borders & Zero Nested `div`s)**:
  - **Open Canvas**: `--color-background-body` is pure white `#FFFFFF` in Light Mode and deep charcoal `#141416` in Dark Mode. Section titles, filter chips, and card grids sit **directly on the open canvas** — never wrap a grid of cards inside an outer wrapper card.
  - **Strict 1-Layer Card Rule (No Box-in-Box)**: Individual cards, accordions, inputs, and rows use at most **1 tonal layer** (`--color-background-muted`: `#F5F6F8` Light / `#202024` Dark, hover `--color-background-subtle`: `#EAECEF` Light / `#2A2A30` Dark). Never nest shaded sub-boxes inside cards, and never wrap Right Sidebar Drawer sections inside extra outer boxes.
  - **Inline Metadata Over Pill Soup**: Display static specs (size, guests, amenities) as clean icon + inline text rather than rows of background pill boxes.
- **Semantic Statuses**: `var(--color-success)` / `var(--color-success-muted)`, `var(--color-warning)` / `var(--color-warning-muted)`, `var(--color-error)` / `var(--color-error-muted)`.

## 3. Unified Controls, Buttons, Icons & Border Radius System
All interactive controls across Storefront and Admin MUST use unified sizing and radii:
- **Buttons (`rounded-full` pill standard)**:
  - `sm`: `h-8 px-3` (`.ty-caption font-semibold`), icon `w-3.5 h-3.5` (`14px`).
  - `md` (Default): `h-10 px-4` (`.ty-body font-semibold`), icon `w-4 h-4` (`16px`) — `.btn-round-solid`, `.btn-promo-solid`, `.btn-fw-secondary`, `.btn-round-border`.
  - `lg` (Primary CTA): `h-11 px-5` (`.ty-body font-semibold`), icon `w-4 h-4` (`16px`).
- **Circular Icon Buttons (`.btn-icon`, `rounded-full`)**:
  - Standard action/close button: `h-9 w-9 rounded-full` with `w-4 h-4` (`16px`) or `w-[18px] h-[18px]` icon.
  - Prominent navbar/media button: `h-10 w-10 rounded-full` with `w-5 h-5` (`20px`) icon.
- **Inputs**: `h-10 rounded-[12px]` for form inputs (`StandardInput`), `h-10 rounded-full` for search/pill inputs.
- **Border Radii**:
  - Page Card (`.app-card` / `StandardCard`): `rounded-none lg:rounded-[20px]` (`--radius-page`).
  - Inner Container / Sub-panel / 9:16 Video Card: `rounded-[16px]` (`--radius-container`).
  - Form Input / Header Icon Box (`.fw-head-icon`): `rounded-[12px]` (`--radius-element`).
  - Small Thumbnail / Code Tag: `rounded-[8px]` (`--radius-inner`).
  - Buttons / Pills / Status Badges: `rounded-full` (`--radius-full`).

## 4. Single Centered `1140px` Feed, Right Sidebar Drawers & Fastwork Settings
- **Storefront Layout (`1140px`)**: All public pages render inside a single centered `StandardFeedContainer` (`max-w-[1140px] mx-auto`) and `StandardCard` (`rounded-[20px]` on desktop, edge-to-edge on mobile). Media (photos & 9:16 reels) must remain clean without heavy dark gradient overlays.
- **Right Sidebar Drawer Standard (No Centered Modals, Single Unified Width)**:
  - Every modal/overlay in the app (Top Navbar Date Picker, Coupon Bag Wallet, Room Calendar & Gallery, Room Details & 15-Min QR Checkout, Shorts Video Player, AI Chat Drawer, and Mobile Profile Menu) MUST open as a **Right Sidebar Drawer** using `.app-right-drawer` (`fixed inset-y-0 right-0 h-[100dvh]`, unified width `100%` `< 640px`, `460px` `>= 640px`, `520px` `>= 1024px`, sliding from the right edge with backdrop `.app-right-drawer-backdrop` and body scroll lock) without custom width overrides.
  - Never render centered dialog boxes or bottom-sheet modals.
- **Backoffice (`/admin` & `/super-admin`)**: Uses Fastwork-style `.fw-setting-row` split-pane settings with CSS theme tokens so Light and Dark Mode work seamlessly.

## 5. Primary Font (`Noto Sans Thai`) & Strict 5-Tier Typography Scale
- **Font Family**: `Noto Sans Thai` (loaded in `src/app/layout.tsx`) is used globally across `html, body, button, input, textarea, select`.
- **5-Tier Scale**: Never use arbitrary font sizes. Only use the 5 standardized typography classes defined in `src/app/globals.css`:
  1. `.ty-display` (`24px` desktop / `22px` mobile, bold)
  2. `.ty-title` (`18px`, bold)
  3. `.ty-subtitle` (`16px`, semibold)
  4. `.ty-body` (`14px`, regular/medium)
  5. `.ty-caption` (`12px`, secondary meta/labels)
