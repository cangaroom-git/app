# Mandatory Agent Guidelines for `my-hotel`

> **CRITICAL RULE (บังคับอ่านทุกครั้งก่อนเขียนหรือแก้ไขโค้ด):**
> Every time you implement, create, or modify any UI component, page, or feature in this repository, you **MUST** first read and strictly follow the design system skill at:
> `.agents/skills/my-hotel-design-system/SKILL.md`

## Core Summary of Mandatory Design Rules
1. **Icon-First & Minimal Text (เน้น Icon ไม่เน้น Text เยอะ):**
   - Do NOT clutter cards, headers, or input bars with long paragraphs, noisy badges, or multi-row text chips.
   - Use clean `lucide-react` icons and circular icon buttons (`h-9 w-9` / `h-10 w-10 rounded-full`) with concise labels or tooltips.
2. **Strict Brand & Promotion Palette:**
   - Never use cartoon/neon colors or arbitrary gradients.
   - Always use CSS variables from `src/app/globals.css`: `var(--color-accent)` (`#1751ae`), `var(--color-on-accent)` (`#ffffff`), `var(--color-promo)` (`#c53829` for all promotions, coupons, and discounts), `var(--color-on-promo)` (`#ffffff`), `var(--color-background-card)`, `var(--color-background-muted)`, `var(--color-border)`, `var(--color-text-primary)`, `var(--color-text-secondary)`.
3. **Single Centered Feed (`1140px`), Right Sidebar Drawers & Fastwork Settings (`/admin`):**
   - Storefront uses a single centered `StandardFeedContainer` (`max-w-[1140px] mx-auto`) and `StandardCard`.
   - All overlays, calendars, room galleries, booking steps, and video drawers open exclusively as **Right Sidebar Drawers** (`fixed inset-y-0 right-0 h-[100dvh]`) — never centered modals.
   - Backoffice (`/admin` & `/super-admin`) uses clean `.fw-setting-row` split-pane settings with full Dark Mode token support.
4. **Unified Font (`Noto Sans Thai`), Controls & Strict 5-Tier Typography Scale:**
   - Primary font across the entire app is `Noto Sans Thai`.
   - Only use `.ty-display` (24px), `.ty-title` (18px), `.ty-subtitle` (16px), `.ty-body` (14px), and `.ty-caption` (12px).
   - Standardize buttons (`rounded-full`, `h-8` / `h-10` / `h-11`), circular icon buttons (`h-9 w-9` / `h-10 w-10 rounded-full`), inputs (`h-10 rounded-[12px]`), and card radii (`20px` page card, `16px` container/video, `12px` element, `8px` thumbnail).
