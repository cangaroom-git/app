# Mandatory Agent Guidelines for `my-hotel` (Cangaroom)

> **CRITICAL RULE (บังคับอ่านทุกครั้งก่อนเขียนหรือแก้ไขโค้ด):**
> Every time you implement, create, or modify any UI component, page, or feature in this repository, you **MUST** first read and strictly follow the design system skill at:
> `.agents/skills/my-hotel-design-system/SKILL.md`

## Core Summary of Mandatory Design Rules
1. **STRICT FORBIDDEN RULE — NO HOVER SCALE ANYWHERE (ห้ามใช้ `hover` แล้ว `scale` ทั้งเว็บเด็ดขาด):**
   - **NEVER** use `hover:scale-*`, `group-hover:scale-*`, or CSS `transform: scale(...)` on `:hover` on ANY image, card, button, or icon anywhere in the application.
2. **Instagram Left Sidebar (`72px`) + Pinterest Masonry & Pin Detail UI:**
   - Desktop Left Sidebar (`w-[72px]`) uses Instagram's clean pure-white vertical icon rail (top brand mark, centered minimal outline/filled icons, bottom `≡` menu).
   - Top bar features Pinterest's `#f1f1f1` full-width rounded search bar + user avatar.
   - Home (`/`) uses a variable-height multi-column **Pinterest Masonry Grid** (`rounded-[16px]` pins). Clicking any pin opens **Pinterest's Split 2-Column Pin Close-Up Card** (`rounded-[28px]`) with live likes, save button (`#e60023`), description, **interactive comments**, and staggered related pins beside & below it.
3. **Pinterest Gestalt Palette & Pure White Canvas:**
   - Light Mode: Pure white `#ffffff` canvas, `#f1f1f1` / `#efefef` muted pills & search bar, `#111111` primary ink, `#767676` secondary gray, `#e60023` Save/Promo red, `#0866ff` booking accent.
   - Dark Mode: `#121212` canvas, `#1e1e1e` cards, `#2b2b2b` muted pills, `#f5f5f5` primary ink.
4. **Native System Font Stack & 5-Tier Scale:**
   - Native `system-ui` font stack (`SF Pro + ThonburiUI` on macOS/iOS, `Segoe UI + Leelawadee UI` on Windows) with `.ty-display`, `.ty-title`, `.ty-subtitle`, `.ty-body`, and `.ty-caption`.
