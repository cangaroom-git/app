---
name: my-hotel-design-system
description: >-
  Core UI/UX design standards for Cangaroom / my-hotel. Enforces ZERO hover
  scale site-wide, Instagram-style minimal 72px pure-white left icon sidebar,
  clean Pinterest Masonry Pin cards (only '...' underneath, no play/duration or
  subtitle clutter), Fastwork-style /{hotelSlug} property profile pages,
  personal /board saved stay boards, and native Thai/EN system font.
---

# Cangaroom · Pinterest Gestalt, Fastwork Profile & Instagram Minimal Design System

Every component, page, and interactive widget MUST strictly follow these design rules:

## 1. STRICT FORBIDDEN RULE
- **NO Hover Scale Anywhere (`ห้ามใช้ hover แล้ว scale ทั้งเว็บเด็ดขาด`)**:
  - **NEVER** apply `hover:scale-*`, `group-hover:scale-*`, or `:hover { transform: scale(...) }` to ANY image, Pin card, video thumbnail, button, or icon anywhere in the codebase.
  - On Pin cards, hover feedback uses a subtle `bg-black/28` dim overlay revealing the `#e60023` `บันทึก` squircle button (`rounded-[14px]`) and squircle action buttons (`rounded-[12px]`).

## 2. Clean Pinterest Pin Cards
- **No Play/Duration Badges & No Subtitle Clutter**:
  - Pin cards in `<MasonryGrid />` render pure rounded images (`rounded-[16px]`) with **no** video duration pill, **no** play icon overlay, and **no** title/subtitle text block underneath—only the clean right-aligned `...` (`MoreHorizontal`) menu button underneath each card.

## 3. Navigation & Page Architecture
- **Desktop Left Sidebar (`w-[72px]`, pure `#ffffff` / `#121212`)**:
  - Top slot: Brand glyph (`27px`).
  - Middle stack: Vertically centered `26px` outline/solid icons inside `h-12 w-12 rounded-[16px]` squircle buttons (`Home (/)`, `Saved Board (/board)`, `Messages`, `Property Profile (/sapanunseen)`, `Deals (/deal)`, `List Hotel (/register-hotel)`, `Profile Avatar`).
  - Bottom slot: `26px` `≡` More menu icon with popover settings.
- **Home Feed (`/`)**:
  - **Left (`flex-1`)**: Underline category tabs + `<MasonryGrid />` (never jumps vertically when filtering).
  - **Right (`lg:w-[236px] xl:w-[248px]`)**: Slim minimal `<ThailandDiscoverySidebar />` containing active filter chips, Stay Style rows, and searchable **77 Thailand Provinces** cross-filter.
- **Saved Boards (`/board`)**:
  - Includes the same underline category tabs (`ทั้งหมด`, `ที่พัก & พูลวิลล่า`, `คลิปบรรยากาศ`, etc.) + custom Trip Boards & Province filter pills.
- **Hotel Profile Page (`/{hotelSlug}`, e.g. `/sapanunseen` — Replaces `/booking`)**:
  - Fastwork Profile layout: Top 2-column profile header (Avatar + Name + `@slug` + 4-Metric box on left, Wide Cover Banner + Tag Pills + Location on right), Left Masonry Portfolio with underline tabs, and Right Sidebar showing **ประเภทห้องพักพร้อมราคา** (`Rooms & Villas` horizontal cards) that open the Room Booking Drawer on click.

## 4. Pinterest Gestalt Color Palette & Native System Font
- **Canvas & Card**: `#ffffff` (Light) / `#121212` & `#1e1e1e` (Dark).
- **Muted Surface**: `#f1f1f1` & `#efefef` (hover `#e2e2e2`) Light / `#2b2b2b` Dark.
- **Text**: `#111111` primary, `#767676` secondary (Light) / `#f5f5f5` & `#a3a3a3` (Dark).
- **Save / Promo Red (`--color-promo`)**: `#e60023` (hover `#ad081b`).
- **Accent (`--color-accent`)**: `#0866ff` (booking / verified badges).
- **Font Stack**: `system-ui, -apple-system, BlinkMacSystemFont, ".SFNSText-Regular", "Segoe UI Historic", "Segoe UI", Helvetica, Arial, sans-serif`.
