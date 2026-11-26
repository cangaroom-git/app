---
name: my-hotel-design-system
description: >-
  Authoritative UI/UX Design Constitution for Cangaroom (my-hotel) v3.0 — Airbnb Warm Minimal
  & Pinterest Gestalt standard. Enforces Minimal Borders ("Zero Border Fatigue"), equal vertical
  section rhythm via single 1px horizontal hairlines, ZERO hover scale, ZERO card/button shadows
  (except --shadow-booking-widget on sticky booking cards and --shadow-popover on floating menus),
  ZERO gradients/pastels, custom ResponsiveSelect (no native select), continuous single-page
  /{hotelSlug}, clean /{hotelSlug}/book checkout, and smooth fractional /map explorer.
---

# Cangaroom Master Design System Standard (v3.0 — Airbnb Warm Minimal)

Every UI component, layout, modal, drawer, and page in `my-hotel` **MUST** read and strictly obey this specification before designing or editing any UI.

---

## 1. Strictly Forbidden Anti-Patterns (ห้ามใช้เด็ดขาด)

1. **NO Hover Scale (`ห้าม hover แล้ว scale ทั้งเว็บ`)**:
   - **NEVER** use `hover:scale-*`, `group-hover:scale-*`, or CSS `:hover { transform: scale(...) }` on any image, video, card, button, or icon.
2. **NO Border Fatigue (`ห้ามตีกรอบ border รอบทุกกล่อง`)**:
   - **NEVER** wrap lists, room cards, add-ons, blog cards, review cards, sidebar POI rows, inputs, or secondary pill buttons inside 4-sided `border` boxes.
   - Divide sections strictly using single `1px` horizontal hairlines (`divide-y divide-[var(--color-border)]` or `border-t border-[var(--color-border)]`) and generous whitespace instead of card-in-card borders.
3. **NO Card / Button Drop Shadows (`ห้ามใส่เงาให้การ์ดคอนเทนต์และปุ่ม`)**:
   - **NEVER** use `shadow-sm`, `shadow`, `shadow-md`, `shadow-lg`, `shadow-xl`, or `shadow-[var(--shadow-card)]` on inline content cards, room cards, banners, or buttons (`--shadow-card: none`).
   - **Strictly 2 Shadow Exceptions Only**:
     - `shadow-[var(--shadow-booking-widget)]` (`0 6px 16px rgba(0, 0, 0, 0.12)`): Reserved **ONLY** for the floating desktop sticky booking/price summary card on `/{hotelSlug}` and `/{hotelSlug}/book` (paired with hairline `border-black/[0.04] dark:border-white/[0.08]`).
     - `shadow-[var(--shadow-popover)]` (`0 6px 20px rgba(0, 0, 0, 0.14)`): Reserved **ONLY** for floating dropdowns (`ResponsiveSelect`), floating modal/bottom sheets, floating map overlays/controls, and the Mobile Bottom Bar.
4. **NO Gradients, Colored Eyebrows, or Multi-Color Buttons**:
   - **NEVER** use `bg-gradient-*` on banners or cards.
   - **NEVER** use `#0866ff` blue buttons, `#06c755` green LINE buttons, or pastel status/category washes (`bg-blue-*`, `bg-pink-*`, `bg-amber-*`, `bg-emerald-*`).
   - **NEVER** render native OS `<select>` menus — always use `<ResponsiveSelect />` (popover on Desktop, slide-up Bottom Sheet on Mobile/Tablet).

---

## 2. Airbnb Warm Minimal Palette, Typography & Equal Rhythm

### Surface & Ink Tokens (`globals.css`)
| Token | Light Mode | Dark Mode (`html.dark`) | Usage |
|---|---|---|---|
| `--color-background-body` | `#ffffff` | `#11161d` | Main pure-white canvas & left `72px` sidebar |
| `--color-background-card` | `#ffffff` | `#18202b` | Floating cards (`border-black/[0.04]` + sticky shadow) |
| `--color-background-popover` | `#ffffff` | `#1e2736` | Dropdown popovers, dialogs & bottom sheets |
| `--color-background-muted` | `#f3f7fc` | `#18202b` | Secondary buttons, borderless inputs, muted tags |
| `--color-background-subtle` | `#e7eff8` | `#243041` | Hover fill for muted buttons/inputs |
| `--color-border` | `#e3ebf4` | `#283444` | Single `1px` horizontal section/list dividers |
| `--color-border-emphasized` | `#cedbe9` | `#3a495e` | Structural hairlines & dashed splits |
| `--color-accent` | `#1e78d6` | `#4ca3f5` | **Travel-Blue Primary CTA & Active Pill Accent** |
| `--color-text-primary` | `#182334` | `#f1f5fa` | Calm slate-navy headings, prices, primary copy |
| `--color-text-secondary` | `#5c6b80` | `#9ba8bc` | Slate captions, sublabels, metadata |
| `--color-promo` | `#e60023` | `#e60023` | **ONLY** Heart Wishlist `'บันทึก'`, active Like heart & nav notification dots |
| Category Crest Tokens | `STAY #5369A6` · `CAFE #D47E35` · `RESTAURANT #C6566E` · `ATTRACTION #529D48` · `WELLNESS #3A8D9A` | Same matte tokens | **ONLY** Category Medallion on `1:1` Collectible Place Cards & `/explore`/`/trip` Map Pins (never buttons/banners/gradients) |

### Typography (`Plus Jakarta Sans` + `Anuphan`)
- Warm balanced semi-bold headings (`font-semibold` / `600`) paired with readable Thai line-heights:
  - Consumer Editorial Scale (`.ty-*`): Display `26px`, Title `22px`, Subtitle `16px`, Body `15.5px`, Caption `14px`.
  - **Workspace Locked 6-Step Type Scale (`.ws-*` — MANDATORY across `/admin/*`, `/studio/*`, `/account`)**:
    - **Single Font Stack**: 100% `Plus Jakarta Sans` + `Anuphan` (`--font-family-heading` / `--font-family-body`). Avoid `font-mono` for Thai text or table names.
    - **Max Weight Cap `600` (`NO font-bold`)**: **NEVER** use `font-bold` (`700`) anywhere inside `/admin/*`, `/studio/*`, or `/account`. Only weights `400` (`font-normal`), `500` (`font-medium`), and `600` (`font-semibold`) are allowed so Thai `Anuphan` renders airy and balanced like Airbnb DLS.
    - **Zero Arbitrary Off-Scale Sizes**: NEVER write ad-hoc fractional pixel sizes (`text-[10.5px]`, `text-[11px]`, `text-[12.5px]`, `text-[13.5px]`, `text-[14.5px]`, `text-[15.5px]`, `text-[17px]`, `text-[18px]`, `text-[22px]`) in workspace pages. Always use the 6 locked semantic classes from `src/app/globals.css`:
      - `.ws-display` (`24px` / `sm:26px`, `600`, `1.25`) — Page H1
      - `.ws-title` (`20px`, `600`, `1.30`) — Section H2 & Modal Titles
      - `.ws-subtitle` (`15px`, `600`, `1.40`) — Row / Sub-section / Card Titles
      - `.ws-body` / `.ws-body-medium` / `.ws-body-strong` (`14px`, `400`/`500`/`600`, `1.50`) — Body copy, table primary cells, controls, nav links
      - `.ws-caption` / `.ws-caption-medium` (`13px`, `400`/`500`, `1.45`, secondary ink) — Subtitles, helper text, table headers (`<th>`)
      - `.ws-badge` (`12px`, `600`, `1.20`) — Status pills, badges, micro counters ONLY (minimum floor `12px`)
      - `.ws-kpi` (`28px` / `sm:32px`, `600`, `tabular-nums`) — KPI hero numbers ONLY
    - **8px Workspace Spatial Rhythm**:
      - Page sections: `.ws-section` (`py-8` = `32px`) + `border-b border-[var(--color-border)]`
      - Settings / List rows: `.ws-row` (`py-5` = `20px`) inside `divide-y divide-[var(--color-border)]`
      - Table header & body cells: `.ws-table-th` / `.ws-table-td` (`14px 12px` = `py-3.5 px-3`) via `<AdminDataTable />`
    - **Single-Source Workspace Primitives, 2-Column Split Layout & Auto-Hide Scrollbars**:
      - Always compose `/admin/*` and `/studio/*` pages from `src/components/workspace/WorkspacePrimitives.tsx` (`<WorkspacePageHeader />`, `<WorkspaceKpiBand />`, `<WorkspaceSection />`, `<WorkspaceSearchInput />`, `<WorkspaceStatusPill />`), `<AdminDataTable />`, and `<AdminSlideSheet />` (centered desktop modal `md:max-w-[720px]` / mobile slide-up bottom sheet `rounded-t-[24px]` — NEVER right slide-over drawers and NEVER legacy `bg-gray-100 rounded-2xl` wrappers).
      - **Unified 2-Column Split Pages (`<WorkspaceSplitLayout />`)**: Every 2-column master-detail page (`/admin/systems`, `/admin/locations`, `/admin/categories`, `/studio/settings`, `/studio/listings/*`) MUST use `<WorkspaceSplitLayout />` (`src/components/workspace/WorkspaceSplitLayout.tsx`) — identical `max-w-[1160px]` + `w-[260px]` left borderless nav on desktop, **auto-hide scrollbars** (`.cgr-scroll-autohide` — invisible when idle, thin thumb visible only while actively scrolling via `useGlobalAutoHideScrollbars()`), and **native iOS mobile horizontal push Slide-In / pop Slide-Out** drill-down animation (`.cgr-split-mobile-stage`).
      - **Single-Row Compact Mobile Toolbars (`<WorkspaceCompactToolbar />`)**: Every list/table filter bar in `/admin/*` & `/studio/*` MUST stay strictly on **ONE single horizontal row (`h-9`) on mobile** — never wrapping into 2–3 stacked rows! Search collapses to an expandable `h-9 w-9` circular Search icon button, filter pills scroll horizontally (`overflow-x-auto no-scrollbar`), and actions stay pinned on the right.
      - **100% Airbnb Inset-Label Form Fields**: Every text, number, URL, textarea, select, and checkbox in `/admin/*` & `/studio/*` MUST use `<StandardInput />`, `<StandardTextarea />`, `<StandardSelectField />`, `<StandardFieldGroup />`, and `<StandardCheckbox />` from `src/components/ui/standards.tsx` (matching `/studio/settings`; legacy `wg-input` is banned and enforced by `npm run audit:design`).
    - **Automated Pre-Ship Check**: After any UI edit in `/admin`, `/studio`, or `/account`, ALWAYS run `npm run audit:design` and verify 0 violations.

### Minimal Borders & Equal Section Spacing Law (`กฎแบ่ง Section ให้เท่ากัน`)
1. **Top-Level Page Section Rhythm**: Group consecutive content sections inside `<div className="divide-y divide-[var(--color-border)]">` and apply **uniform vertical padding** to every `<section>`:
   - `/{hotelSlug}` editorial & full-width bands: `py-8 lg:py-10 first:pt-0` (zero uneven `py-4` next to `py-12`).
   - `/{hotelSlug}/book` checkout left column & sticky summary: `py-8 first:pt-0 last:pb-0` (right summary blocks `py-5 first:pt-0 last:pb-0`).
   - Vertical lists (map POI sidebar, room switch modal, add-ons): use `divide-y divide-[var(--color-border)]` with equal `py-3.5` or `py-4` rows (`border-0`, hover/selected fill `bg-[var(--color-background-muted)]` only).
2. **Unified Airbnb Inset-Label Input Standard (`StandardInput`, `StandardTextarea`, `StandardFieldGroup`, `StandardStepperRow`)**:
   - **Site-Wide Consistency Law**: Every form `<input>`, `<textarea>`, and form dropdown trigger MUST match the Airbnb Sticky Widget / Property Type field system: pure white canvas `bg-[var(--color-background-card)]`, `rounded-[12px]`, crisp calm `1px border-[#b0b0b0]` (`dark:border-[var(--color-border-emphasized)]`), `min-h-[56px] px-3.5 py-2`, small inset label (`text-[12px] font-medium text-[var(--color-text-secondary)]`) INSIDE top-left with `15px` value directly beneath, transitioning to `border-[var(--color-text-primary)] ring-1 ring-[var(--color-text-primary)]` on focus.
   - **Grouped Fields (`StandardFieldGroup`)**: Combine paired fields (e.g. `Check-in | Check-out`, `Weekday Price | Weekend Price`, `Room Code | Room Name`) inside ONE outer `rounded-[12px] border border-[#b0b0b0] divide-y` / `divide-x` box with zero double borders.
   - **Counter Steppers (`StandardStepperRow`)**: Integer counts (bedrooms, beds, bathrooms, guests, units) use clean `divide-y` rows with `−` / `count` / `+` squircle buttons (`h-8 w-8 rounded-[10px] border border-[#b0b0b0]`) instead of raw number inputs.
   - **Global Squircle Checkboxes (`StandardCheckbox`) & Airbnb 2-Month Date Pickers (`StudioDateRangePicker`)**: NEVER use raw `<input type="checkbox">` or native `<input type="date">`. Always use `<StandardCheckbox />` (`20×20px` squircle `#222222`/`#f5f5f5` with crisp `Check` icon) and `<StudioDateRangePicker />` (2-month desktop Portal popover + mobile slide-up Bottom Sheet matching `DesktopDateRangePopover`).

### Strict 2-Button Hierarchy & Full-Round Pill Buttons (`rounded-full`)
- **Full-Round Pill Curvature on ALL Buttons**: Every `<button>`, filter pill, and icon button MUST use `rounded-full` (like the Travel-Blue `Discover now` pill CTA). Multi-line `<input>` / `<textarea>` fields keep clean inset-label `rounded-[14px]`–`rounded-[16px]`. All cards, posts, review photos, and room thumbnails MUST use `aspect-square` (`rounded-[18px..24px]`); only Desktop 5-Photo Hero Mosaic (`aspect-[2/1]`), full-screen maps, and video players remain rectangular.
1. **Primary Button**: Solid Travel-Blue `bg-[var(--color-accent)] !text-[var(--color-on-accent)]` (`hover:bg-[var(--color-accent-hover)]`), **`rounded-full`**.
2. **Secondary Button**: Flat borderless `bg-[var(--color-background-muted)]` + `text-[var(--color-text-primary)]`, `hover:bg-[var(--color-background-subtle)]`, **`rounded-full`**.
3. **Underline Text Link**: Secondary editorial actions (`แก้ไข`, `เปลี่ยนห้อง`, `ล้างการค้นหา`, `ดูบนแผนที่`) use clean underlined text buttons (`underline underline-offset-2`) with zero outer box.

---

## 3. Motion & Animation Constitution (กฎมาตรฐาน Animation — Smooth Airbnb / iOS Physics)

Every modal, bottom sheet, drawer, dropdown, search transition, and interactive reveal across the entire app **MUST** feel physically continuous, calm, and 120fps smooth — **NEVER** snapping open/closed via abrupt conditional unmounts, **NEVER** bouncing like a cartoon, and strictly honoring **ZERO Hover Scale**.

### Canonical Motion Tokens (`globals.css`)
| Token | Value | Usage |
|---|---|---|
| `--ease-out-expo` | `cubic-bezier(0.22, 1, 0.36, 1)` | Primary Airbnb deceleration (popovers, view transitions, content reveals, modal enter) |
| `--ease-ios-sheet` | `cubic-bezier(0.32, 0.72, 0, 1)` | Native iOS/Airbnb sheet glide (bottom sheets, multi-detent morphs, modal/drawer exits) |
| `--ease-spring-subtle` | `cubic-bezier(0.22, 1.25, 0.36, 1)` | Reserved **ONLY** for expressive physical reveals (e.g., fanned ticket deck) — never hover |
| `--duration-micro` | `150ms` | Color, background, focus ring, icon opacity transitions |
| `--duration-popover` / `exit` | `220ms` / `160ms` | Floating menus, tooltips, travel-time dropdowns, search dropdowns |
| `--duration-sheet` / `exit` | `360ms` / `250ms` | Modals, slide-up bottom sheets, drawers (**exit is always ~25–30% faster than enter**) |
| `--duration-morph` | `420ms` | Continuous multi-detent sheet expand/collapse (e.g. bottom search card -> full-height search sheet) |

### 5 Mandatory Motion Laws (บังคับใช้ทั้งเว็บ)
1. **Smooth Fade Slide-In + Slide-Out Presence Law (`useModalPresence` — ห้ามเปิด/ปิดแบบตัดฉับ)**:
   - Every modal, bottom sheet, right drawer, floating pill/card, and popover MUST animate smoothly with **Fade Slide-In AND Fade Slide-Out** (`opacity` + `translate3d(...)` via `useModalPresence(isOpen, exitDurationMs)` in `src/lib/useModalPresence.ts`) paired with GPU-composited `data-state="open" | "closed"` CSS classes (`.cgr-modal-backdrop`, `.cgr-modal-fade-slide`, `.cgr-modal-surface-sm/md/lg`, `.cgr-modal-sheet-only`, `.cgr-floating-card-motion`, `.cgr-popover-motion`, `.cgr-fade-slide-pill`).
   - Exit duration is always ~25–30% faster than enter (`340–360ms` fade slide-in / `220–250ms` fade slide-out) so closing feels responsive without abrupt unmounting.
   - Always pass `shouldRender` (not `isOpen`) to `useBodyScrollLock(shouldRender)` so scrollbars never jump mid-exit. When exiting a detail card bound to nullable state (e.g., `selectedPlace` or `focusedDeal`), cache the last non-null item in a ref/state so its photo/text stays intact during the fade slide-out glide.
2. **Continuous Sheet Morphing Law (`ห้ามสลับกล่องตัดฉับ`)**:
   - Multi-state mobile sheets (e.g., Idle floating card <-> Full-height Search overlay <-> Collapsed / Half / Full Results sheet) MUST keep **ONE persistent sheet container** (`.cgr-map-mobile-sheet`) that smoothly morphs its height, edge insets, border-radius, and `transform` via `--ease-ios-sheet` (`420ms`) instead of unmounting one card and flashing another.
   - Inner content swaps inside an open sheet use subtle vertical rise-fade (`.cgr-sheet-content-in`, `10px`, `260ms var(--ease-out-expo)`).
3. **1:1 Direct Touch Manipulation Law (`นิ้วลากติดมือบนมือถือ`)**:
   - Every draggable mobile sheet MUST track finger `touchmove` delta live (`data-dragging="true"` disables CSS transition while dragging, with gentle `0.35×` rubber-banding past bounds) and spring smoothly to the target detent on `touchend`.
4. **GPU-First & Zero Hover-Scale Law**:
   - Animate `transform: translate3d(...)` and `opacity` with `will-change` + `backface-visibility: hidden` for all enter/exit motions. Never animate layout properties inside scrolling page flow (isolated `position: fixed/absolute` multi-detent sheets only).
   - **NEVER** use `scale` on hover (`hover:scale-*` / `group-hover:scale-*` remain strictly forbidden).
5. **Accessibility Law (`prefers-reduced-motion`)**:
   - Every animation utility and keyframe MUST provide a `@media (prefers-reduced-motion: reduce)` rule that removes spatial translation and preserves a calm `120–140ms` opacity crossfade.

---

## 4. Unified App Shell, 3-Tier Grid & Mobile/Tablet UX

### Persistent Navigation Shell (`HotelAppShell.tsx` & `PrimaryNavigation.tsx`)
- **Desktop Left Sidebar (`w-[72px]`, fixed)**: Persistent across **every** route except `/login` and full-screen modals (`z-[85]`). Center holds strictly **3 Traveller-First items (`Coupon /`, `Explore /explore`, `Trip /trip`)**; secondary routes (`/bookings`, `/register-hotel`, `/studio`, `/super-admin`) live in **`More (≡)`**.
- **Desktop Top Bar (`>= lg`, `64px`)**: Pure full-width search bar + user dropdown. On Mobile/Tablet (`< lg`), the top navbar is completely removed (Airbnb native-app standard) to maximize canvas & map viewport height.
- **Mobile Clean Airbnb Docked 5-Icon Bottom Bar (`< lg`, `z-[70]`)**: Full-width pure-white docked bar (`bg-[var(--color-background-body)]/96 backdrop-blur-md border-t border-[var(--color-border)]`, safe-area bottom padding) with 5 clean icon+label tabs: **`Coupon` (`/`)**, **`Explore` (`/explore`)**, **`Search`** (opens floating SmartSearch overlay), **`Trip` (`/trip`)**, and **`Log in` / `Profile`** (circular profile photo when logged in). Automatically hidden on `/{hotelSlug}` via `data-hide-on-hotel` so the **Sticky Bottom Booking CTA Footer** owns the mobile thumb zone cleanly.
- **Canonical Container Width Classes (`globals.css`)**:
  1. `.cgr-page-fluid` (`w-full`): `/` and `/trip` map stage.
  2. `.cgr-page-standard` (`w-full max-w-[1120px] mx-auto`): `/deal`, `/{hotelSlug}`, `/{hotelSlug}/book`, `/{hotelSlug}/posts`, `/bookings`, `/studio`, `/super-admin`.
  3. `.cgr-page-reading` (`max-w-[760px] mx-auto`) & `.cgr-page-form` (`max-w-[640px] mx-auto`).

### Mobile & Tablet Interaction Standards
- **MANDATORY Slide-Up Bottom Sheet Standard for ALL Mobile Modals (`< sm` / `< lg`)**:
  - **ALL** mobile dialogs, option pickers, confirmations, action menus (`More ...`), auth prompts, and save-action toast bars MUST slide up seamlessly from the bottom edge of the viewport (`flex items-end`, `w-full`, `rounded-t-[24px]`, centered top grab handle `h-1 w-10 rounded-full bg-[var(--color-border-emphasized)]`, `animate-slide-up-sheet`, `pb-[max(20px,env(safe-area-inset-bottom))]`) — **NEVER** render centered floating popups or left-aligned desktop cards on mobile viewports.
  - **Portal Escape Rule**: Whenever a mobile bottom sheet or toast renders inside an ancestor using CSS `transform`, `will-change-transform` (e.g., swipe tracks), or `overflow-hidden`, it **MUST** be mounted via React `createPortal(..., document.body)` (`z-[95]`) with `stopPropagation` on `onClick`, `onPointerDown`, and `onTouchStart` so parent swipe/drag listeners cannot clip or hijack taps inside the sheet.
- **Edge-Safe Horizontal Snap Carousels**: Every mobile horizontal scroll track MUST pair `-mx-4 px-4 sm:-mx-6 sm:px-6` with **`scroll-px-4 sm:scroll-px-6`** so the first snap card keeps clean left margin (never flush `0px` to the viewport edge).
- **Locked Horizontal Anchor Bars**: Sticky sub-navs MUST include `overflow-y-hidden touch-pan-x overscroll-y-none` without negative vertical margin hacks (`-mb-px`), preventing vertical touch wiggle.
- **Progressive Disclosure Bottom Sheets (`HotelInfoBottomSheet.tsx`)**: On `< lg`, clamp long hotel descriptions, amenity previews, and `Things to know` policy rows, opening full content inside a slide-up Bottom Sheet (`animate-slide-up-sheet`).
- **Custom Select (`ResponsiveSelect.tsx`)**: Desktop opens an anchored popover (`--shadow-popover`); Mobile (`< lg`) slides up a full-width Bottom Sheet option picker.

---

## 5. Signature Page Specifications

### A. Home (`/`) & Saved Boards (`/board`)
- Underline Stay Style tabs + `<MasonryGrid columnWidth={236} gutter={16} />` (`6px` mobile gutter).
- **Desktop Pin Close-Up (`>= lg`)**: Renders inline at top (`window.scrollTo({ top: 0, behavior: "instant" })`); inline comments inside right panel.
- **Mobile Pin Close-Up (`< lg`, `z-[60]`)**: Full-screen overlay with Drill-Down Back Stack, pull-down close gesture (`>= 60px`), horizontal media swipe, and bottom-sheet Comments / More menus.

### B. Coupon Marketplace (`/deal`) — Minimalist In-Place 3D Flip Ticket
- Root: `<div className="cgr-page-standard space-y-6">`.
- Pure `#ffffff` (`#222222` Dark), `1px` border, semicircular edge notches, `30%` vertical dashed perforation (Logo left | 3 clean lines right), in-place `rotateY(180deg)` flip to reveal terms & `#222222` Claim CTA.

### C. Continuous Single-Page Property Storefront (`/{hotelSlug}`)
- Root: `<div className="cgr-page-standard">`.
- **Sticky Scroll-Reveal Anchor Bar**: Appears seamlessly when scrolling past Hero, pinned `top-0 lg:top-16` (`photos`, `rooms`, `amenities`, `posts`, `reviews`, `location`), with smooth scroll spy.
- **Hero Stage**: Mobile/Tablet `< md` renders swipeable `1:1` square carousel (`aspect-square`, dot counter); Desktop `>= md` renders Airbnb 5-photo mosaic (`48px` gaps = `gap-2`, `rounded-[16px]`).
- **7/1/4 Desktop Split**: Left 7 cols hold Title, Verified Host row, Clamped Story (`Show more -> Bottom Sheet`), **Date-First Inline Availability Calendar (`AirbnbStayCalendar`)** + **Borderless Room Availability Grid** (`#section-rooms`), and Amenities (`6` Mobile / `8` Desktop -> Bottom Sheet). Right 4 cols hold the sticky floating Booking Summary Card (`rounded-[16px] border-black/[0.04] shadow-[var(--shadow-booking-widget)]`) — **hidden on mobile (`< lg`)**, replaced by a fixed bottom `"Book / Check dates"` footer (`BOOK_IT_FLOATING_FOOTER`).
- **Full-Width Lower Sections (Equal `py-10`, Single `1px` Dividers)**:
  - `#section-posts`: Pinterest Moments masonry preview + `"View all photos"` -> `/{hotelSlug}/posts`.
  - `#section-reviews`: Mobile horizontal snap carousel / Desktop 2-col editorial grid.
  - `#section-location` & **Full-Screen Seamless WebGL `/map` Explorer (`HotelLocationMap.tsx` + `airbnbMapLibreStyle.ts`)**: Inline non-interactive square/wide preview (`maplibre-gl` with static `/maplibre-gl-worker.js` + OpenFreeMap custom Warm Minimal vector style — zero `256px` PNG grid seams), opening a 100% full-bleed `/map` modal with **Airbnb's Floating Top-Left Search + Category Menu + Compact Results Card** (no wall-to-wall sidebar), dynamic `moveend` area discovery, and top-right `✕` + grouped `+ / −` + Recenter controls. Hotel owners pin locations via `<HostLocationPicker />` (Google Maps link extractor + drag-to-pin + province guardrail) instead of typing raw `Latitude`/`Longitude`.
  - `#section-blog` (Mobile snap carousel / Desktop 3-col grid) & `#section-policies` (`Things to know`: tappable Bottom Sheets on Mobile / 3-col on Desktop).

### D. Direct Booking Checkout (`/{hotelSlug}/book`)
- Root: `<div className="cgr-page-standard pb-14">`.
- **2-Column Checkout Split (6/1/5 Cols Desktop; Single Stream Mobile)**:
  - Clean header (`←` flat `#f7f7f7` squircle back button + H1) + borderless flush mobile summary row (`pb-7 border-b`).
  - Left 6 cols: `<form className="divide-y divide-[var(--color-border)]">` with strictly equal `py-8 first:pt-0 last:pb-0` sections (`Your trip` -> `Enhance your stay` borderless `divide-y` add-on rows -> `Guest details` borderless `StandardInput` -> `Enter a coupon` -> `Payment & ground rules` -> Mobile inline Price Breakdown + `#222222` Confirm CTA).
  - Right 5 cols (`hidden lg:block lg:sticky lg:top-24`): Floating summary card (`rounded-[16px] border-black/[0.04] shadow-[var(--shadow-booking-widget)] p-6 divide-y`) matching `/{hotelSlug}`'s sidebar elevation.
  - Edit Dates & Switch Room open in slide-up Bottom Sheets on mobile / centered popovers on desktop, with borderless `divide-y` room picker rows.
