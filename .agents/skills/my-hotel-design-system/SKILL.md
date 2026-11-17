---
name: my-hotel-design-system
description: >-
  Core UI/UX design standards for Cangaroom / my-hotel. Enforces ZERO hover
  scale site-wide, Instagram-style minimal 72px pure-white left icon sidebar,
  Pinterest squircle buttons & staggered variable-height Masonry Pin cards,
  Fastwork-inspired Thailand 77-province & stay-style cross-filter right column,
  personal /board saved stay boards, and native Thai/EN system font.
---

# Cangaroom · Pinterest Gestalt, Fastwork Discovery & Instagram Minimal Design System

Every component, page, and interactive widget MUST strictly follow these design rules:

## 1. STRICT FORBIDDEN RULE
- **NO Hover Scale Anywhere (`ห้ามใช้ hover แล้ว scale ทั้งเว็บเด็ดขาด`)**:
  - **NEVER** apply `hover:scale-*`, `group-hover:scale-*`, or `:hover { transform: scale(...) }` to ANY image, Pin card, video thumbnail, button, or icon anywhere in the codebase.
  - On Pin cards, hover feedback uses a subtle `bg-black/25` dim overlay revealing the `#e60023` `บันทึก` squircle button (`rounded-[14px]`) and squircle action buttons (`rounded-[12px]`).

## 2. Navigation & Button Geometry: Larger Icons + Pinterest Squircle Radius
- **Desktop Left Sidebar (`w-[72px]`, pure `#ffffff` / `#121212`)**:
  - Top slot: Brand glyph (`27px`).
  - Middle stack: Vertically centered `26px` outline/solid icons inside `h-12 w-12 rounded-[16px]` squircle buttons (`Home`, `Saved Board (/board)`, `Messages`, `Book (/booking)`, `Deals (/deal)`, `List Hotel (/register-hotel)`, `Profile Avatar`).
  - Bottom slot: `26px` `≡` More menu icon with popover settings.
- **Standard Squircle Button Radius**:
  - Prefer crisp squircle radii (`rounded-[16px]` / `rounded-[14px]` / `rounded-[12px]`) over `rounded-full` circles for icon buttons, Pin Detail `←` Back button (`h-12 w-12 rounded-[16px] bg-white`), `บันทึก` buttons, and action buttons.

## 3. Home Feed (`/`) & Saved Board (`/board`)
- **Top Discovery Header**: Cangaroom Thailand Visual Stays identity banner with quick destination spotlight tiles and `/board` & `/register-hotel` CTAs.
- **2-Column Discovery Workspace (`/` Feed Mode)**:
  - **Left (`lg:col-span-8 xl:col-span-9`)**: Underline category tabs (`ทั้งหมด`, `ที่พัก & พูลวิลล่า`, `คลิปบรรยากาศ`, `วิว & มุมถ่ายรูป`, `อาหาร & บาร์`, `รีวิวผู้เข้าพัก`, `โปรโมชั่นจองตรง`) + shortest-column `<MasonryGrid />` with varied aspect ratios across both photos and videos (`16:9`, `9:16`, `3:4`, `2:3`, `4/5`).
  - **Right (`lg:col-span-4 xl:col-span-3`)**: Sticky `<ThailandDiscoverySidebar />` with Fastwork-style visual Stay Style cards (`Mountain`, `Pool Villa`, `Sea`, `Bars`, `Bathtub`, `Glamping`) + searchable/region-grouped **77 Thailand Provinces** cross-filter.
- **Pin Close-Up View (`/?pin=...`)**:
  - Split 2-Column Card (`rounded-[28px]`) inside `xl:col-span-8` with `underMainCardPins` rendered immediately below it (`space-y-6`) so there is ZERO empty whitespace beneath the image, paired with `rightColumnPins` in `xl:col-span-4`.
- **Personal Saved Boards (`/board`)**:
  - Replaces `/shorts`. Displays all user-saved Pin cards organized by All Saved, Custom Trip Boards, and Province Auto-Boards.

## 4. Pinterest Gestalt Color Palette & Native System Font
- **Canvas & Card**: `#ffffff` (Light) / `#121212` & `#1e1e1e` (Dark).
- **Muted Surface**: `#f1f1f1` & `#efefef` (hover `#e2e2e2`) Light / `#2b2b2b` Dark.
- **Text**: `#111111` primary, `#767676` secondary (Light) / `#f5f5f5` & `#a3a3a3` (Dark).
- **Save / Promo Red (`--color-promo`)**: `#e60023` (hover `#ad081b`).
- **Accent (`--color-accent`)**: `#0866ff` (booking / verified badges).
- **Font Stack**: `system-ui, -apple-system, BlinkMacSystemFont, ".SFNSText-Regular", "Segoe UI Historic", "Segoe UI", Helvetica, Arial, sans-serif`.
