---
name: my-hotel-design-system
description: >-
  Core UI/UX design standards for the Cangaroom / my-hotel application. Enforces
  an ultra-minimal GoDaddy Console inspired layout (pure #ffffff canvas, 1px
  #e5e7eb hairline borders, crisp #111111 solid primary buttons, 1px bordered
  secondary buttons, underline tabs, zero noisy icon circles) combined with
  Facebook's exact native Thai + English OS font stack.
---

# Cangaroom · Minimal Enterprise & Facebook Native Font Design System

Every component, page, and interactive widget MUST strictly follow these design rules:

## 1. Minimal Hairline Architecture (GoDaddy Console Inspired)
- **Pure Crisp Surfaces & 1px Hairline Borders**:
  - Canvas (`--color-background-body`): `#ffffff` (Light) / `#141517` (Dark).
  - Left Sidebar (`--color-sidebar-bg`): `#f9fafb` (Light) / `#17181b` (Dark) with `1px solid var(--color-border)` right divider.
  - Cards (`.app-card`): `#ffffff` with `1px solid var(--color-border)` (`#e5e7eb`), `rounded-[8px]`, `box-shadow: none`.
- **Zero Noisy Icon Circles**:
  - Sidebar items, dropdown menus, and top bar icon buttons use clean `16px–18px` monochrome stroke icons directly on clean rows — never wrap every icon inside gray circular blobs.
- **Distinct Page Roles (No Duplicate Pages)**:
  - `/` (Home): Property Overview, Horizontal Underline Tabs, 16:9 Cover, 3 Action Summary Cards, Compact 4-Column Room Grid, Short Videos, and Guest Reviews.
  - `/booking`: Dedicated Rooms & Availability Workspace (starts directly with Date/Availability Header + Underline Category Tabs + Horizontal Room Booking Cards, without repeating the Home Cover Hero).

## 2. Minimal Buttons & Controls
- **Primary Button (`.btn-round-solid`, `StandardButton variant="primary"`)**: `#111111` solid (`#f3f4f6` in Dark Mode), `rounded-[6px]`, `36px` (`h-9`).
- **Secondary Button (`.btn-fw-secondary`, `StandardButton variant="secondary"`)**: Pure `#ffffff` background + `1px solid #d1d5db` border (`hover:border-[#111111]`), `rounded-[6px]`, `36px` (`h-9`).
- **Promotion Accent (`--color-promo`)**: `#c53829` reserved strictly for discount badges and coupon highlights.
- **Custom CSS Layering**: All custom component classes in `src/app/globals.css` MUST live inside `@layer components` so Tailwind responsive utilities (`hidden`, `lg:hidden`) are never overridden.

## 3. Exact Facebook Native OS Font Stack (Thai + English)
- **Font Family**: `system-ui, -apple-system, BlinkMacSystemFont, ".SFNSText-Regular", "Segoe UI Historic", "Segoe UI", Helvetica, Arial, sans-serif` (do NOT inject Google Webfont overrides before `sans-serif`, so macOS renders native SF Pro + Thonburi and Windows renders Segoe UI + Leelawadee UI / Tahoma identically to `facebook.com`).
- **5-Tier Scale**: `.ty-display` (`24px`), `.ty-title` (`19px`), `.ty-subtitle` (`16px`), `.ty-body` (`15px`), `.ty-caption` (`13px`).
