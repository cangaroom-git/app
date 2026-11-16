# Mandatory Agent Guidelines for `my-hotel` (Cangaroom)

> **CRITICAL RULE (บังคับอ่านทุกครั้งก่อนเขียนหรือแก้ไขโค้ด):**
> Every time you implement, create, or modify any UI component, page, or feature in this repository, you **MUST** first read and strictly follow the design system skill at:
> `.agents/skills/my-hotel-design-system/SKILL.md`

## Core Summary of Mandatory Design Rules
1. **STRICT FORBIDDEN RULE — NO HOVER SCALE ANYWHERE (ห้ามใช้ `hover` แล้ว `scale` ทั้งเว็บเด็ดขาด):**
   - **NEVER** use `hover:scale-*`, `group-hover:scale-*`, or CSS `transform: scale(...)` on `:hover` on ANY image, card, button, or icon anywhere in the application. Hover feedback may only use subtle color, background, or opacity changes.
2. **Pure Media Viewing Only (กดรูปหรือวิดีโอ ต้องเปิดดูแค่รูป/วิดีโอเท่านั้น):**
   - Clicking a photo, photo album/carousel, or video thumbnail MUST open a pure, distraction-free media viewer (photo/video only) — **NEVER** force-open room specification details, countdown timers, or booking checkout drawers when the user simply wants to view media. Booking actions belong strictly on the `/booking` flow.
3. **Facebook Comet Palette & Instagram Mixed Media Grid:**
   - Always use CSS variables from `src/app/globals.css`: `--color-accent` (`#0866ff`), `--color-promo` (`#c53829`), `--color-background-body` (`#f2f4f7` Light / `#18191a` Dark), `--color-background-card` (`#ffffff` Light / `#242526` Dark), `--color-text-primary`, `--color-text-secondary`.
4. **Native System Font Stack & 5-Tier Scale:**
   - Use Facebook's native `system-ui` font stack (`SF Pro + ThonburiUI` on macOS/iOS, `Segoe UI + Leelawadee UI` on Windows) and the 5-tier classes: `.ty-display` (24px), `.ty-title` (20px), `.ty-subtitle` (17px), `.ty-body` (15px), and `.ty-caption` (13px).
