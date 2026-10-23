# Mandatory Agent Guidelines for `my-hotel`

> **CRITICAL RULE (บังคับอ่านทุกครั้งก่อนเขียนหรือแก้ไขโค้ด):**
> Every time you implement, create, or modify any UI component, page, or feature in this repository, you **MUST** first read and strictly follow the design system skill at:
> `.agents/skills/my-hotel-design-system/SKILL.md`

## Core Summary of Mandatory Design Rules
1. **Icon-First & Minimal Text (เน้น Icon ไม่เน้น Text เยอะ):**
   - Do NOT clutter cards, headers, or input bars with long paragraphs, noisy badges, or multi-row text chips.
   - Use clean `lucide-react` icons and circular icon buttons (`h-9 w-9` / `h-10 w-10 rounded-full`) with concise labels or tooltips.
2. **Strict Monochrome Brand Palette:**
   - Never use cartoon/neon colors or arbitrary gradients.
   - Always use CSS variables from `src/app/globals.css`: `var(--color-accent)`, `var(--color-on-accent)`, `var(--color-background-card)`, `var(--color-background-muted)`, `var(--color-border)`, `var(--color-text-primary)`, `var(--color-text-secondary)`.
3. **Single Centered Feed (`760px`) & Fastwork-Style Minimalist Settings (`/admin`):**
   - Storefront uses `StandardFeedContainer` (`max-w-[760px] mx-auto`) and `StandardCard`.
   - Backoffice (`/admin` & `/super-admin`) uses clean `.fw-setting-row` split-pane settings.
4. **Strict 5-Tier Typography Scale:**
   - Only use `.ty-display` (24px), `.ty-title` (18px), `.ty-subtitle` (16px), `.ty-body` (14px), and `.ty-caption` (12px).
