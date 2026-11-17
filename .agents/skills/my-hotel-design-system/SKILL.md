---
name: my-hotel-design-system
description: >-
  Authoritative UI/UX Design Constitution for Cangaroom (my-hotel). Enforces
  95/5 Instagram+Pinterest Monochrome Zen, ZERO hover scale, ZERO card/button
  shadows & gradients, persistent 72px left sidebar across all app/studio pages,
  strict 3-tier container spacing grid (px-4 sm:px-6 lg:px-8, max-w-1120px),
  in-place 3D Flip Coupon cards on /deal, and Instagram Profile + SSR DOM Tabs
  on /{hotelSlug}.
---

# Cangaroom Master Design System Standard (v2.0)

Every UI component, layout, drawer, and page in `my-hotel` **MUST** strictly obey this specification without exception.

---

## 1. Strictly Forbidden Anti-Patterns (ห้ามใช้เด็ดขาด)

1. **NO Hover Scale (`ห้าม hover แล้ว scale ทั้งเว็บ`)**:
   - **NEVER** use `hover:scale-*`, `group-hover:scale-*`, or CSS `:hover { transform: scale(...) }` on any image, video, card, button, or icon.
2. **NO Card / Button Drop Shadows (`ห้ามใส่เงาให้การ์ด แบนเนอร์ และปุ่ม`)**:
   - **NEVER** use `shadow-sm`, `shadow`, `shadow-md`, `shadow-lg`, `shadow-xl`, or `shadow-[var(--shadow-card)]` on cards, banners, or buttons.
   - Surfaces separate cleanly via `border border-[var(--color-border)]` (`1px solid #ebebeb` Light / `#2b2b2b` Dark) or flat muted fill `bg-[var(--color-background-muted)]`.
   - Floating shadows (`shadow-[var(--shadow-popover)]`) are allowed **ONLY** on floating dropdown popovers, calendar pickers, and modal drawers.
3. **NO Gradients, Colored Eyebrows, or Multi-Color Buttons**:
   - **NEVER** use `bg-gradient-*` on banners or cards.
   - **NEVER** use `#0866ff` blue buttons, `#06c755` green LINE buttons, or pastel status/category pills (`bg-blue-*`, `bg-pink-*`, `bg-amber-*`, `bg-emerald-*`).
   - **NEVER** add colored uppercase eyebrows above `<h2>` section headings.

---

## 2. 95/5 Monochrome Color Tokens & 2-Button Hierarchy

### Surface & Ink Tokens
| Token | Light Mode | Dark Mode (`html.dark`) | Usage |
|---|---|---|---|
| `--color-background-body` | `#ffffff` | `#121212` | Main app canvas & left `72px` sidebar |
| `--color-background-card` | `#ffffff` | `#1e1e1e` | Bordered cards (`1px solid var(--color-border)`) |
| `--color-background-muted` | `#f1f1f1` | `#262626` | Search bar, inputs, secondary buttons, tags |
| `--color-background-subtle` | `#e4e4e4` | `#333333` | Hover state for muted surfaces |
| `--color-border` | `#ebebeb` | `#2b2b2b` | Crisp `1px` card & section dividers |
| `--color-border-emphasized` | `#d4d4d4` | `#404040` | Dashed ticket perforations & input focus |
| `--color-text-primary` | `#111111` | `#f5f5f5` | Titles, prices, primary copy |
| `--color-text-secondary` | `#737373` | `#a3a3a3` | Captions, metadata, timestamps |
| `--color-promo` | `#e60023` | `#e60023` | **ONLY** Pin `'บันทึก'` (`Save`) button & nav count badges |

### Strict 2-Button Hierarchy & Ironclad Unified Squircle Curvature
- **Ironclad Squircle Button Rule (`ห้ามใช้ปุ่ม rounded-full เด็ดขาด`)**: Every `<button>` and `<input>` across the entire application MUST use the unified `1/3` squircle curvature matching the `48×48px` (`rounded-[16px]`) Mobile Bottom Menu (`h-11` -> `rounded-[14px]`, `h-10` -> `rounded-[12px]`/`rounded-[13px]`, `h-9` -> `rounded-[12px]`, `h-8` -> `rounded-[10px]`, `h-7` -> `rounded-[9px]`). `rounded-full` is permitted **ONLY** on circular user/hotel avatars, tiny `6px` status/pagination dots, and switch thumbs.
1. **Primary Action Button (`.btn-round-solid` / `StandardButton variant="primary"`)**:
   - Solid `#111111` background + `#ffffff` text in Light Mode (`#f5f5f5` background + `#111111` text in Dark Mode), squircle `rounded-[12px]`, `hover:opacity-90`.
   - Used for: `จองห้องพัก`, `เก็บคูปอง`, `ใช้โค้ดจอง`, `ค้นหา`, `บันทึกข้อมูล`.
2. **Secondary Action Button (`.btn-fw-secondary` / `StandardButton variant="secondary"`)**:
   - Flat `bg-[var(--color-background-muted)]` (`#f1f1f1`) + `text-[var(--color-text-primary)]` (`#111111`), squircle `rounded-[12px]`, `hover:bg-[var(--color-background-subtle)]`.
   - Used for: `ดูรายละเอียด`, `ทัก LINE`, `Facebook`, `โทร`, `กระเป๋าคูปอง`, `คัดลอกโค้ด`.
3. **Status Indicators (`StatusPill`)**:
   - Neutral `bg-[var(--color-background-muted)] text-[var(--color-text-primary)] rounded-full px-2.5 h-6` with a single `6px` (`h-1.5 w-1.5 rounded-full`) semantic dot (`bg-emerald-500`, `bg-amber-500`, `bg-rose-500`). Never tint the pill background.

---

## 3. Unified App Shell & 3-Tier Spacing Grid

### Persistent Navigation Shell (`HotelAppShell.tsx` & `PrimaryNavigation.tsx`)
- **Desktop Left Sidebar (`w-[72px]`, fixed)**: Persistent across **every** route except `/login`. Center stack holds strictly **3 Traveller-First items (`1. Home /`, `2. Deal /deal`, `3. Board /board`)**; secondary/owner routes (`/trips`, `/register-hotel`, `/studio`, `/super-admin`) live cleanly inside the bottom **`More (≡)`** popover.
- **Mobile/Tablet Top Bar (`< lg`)**: Left displays **`Cangaroom`** brand mark; Right displays **`Search`** (expands Floating Search Bar) + **`More/Profile`** (zero hard province/date filters in the global navbar; availability calendar lives exclusively on `/{hotelSlug}` rooms tab).
- **Mobile/Tablet Floating Bottom Bar (`< lg`, `z-[70]`)**: Centered floating container (`fixed bottom-[max(14px,env(safe-area-inset-bottom))] z-[70]`) holding **4 separated `48×48px` (`rounded-[16px]`) squircle buttons (`1. Home`, `2. Deal`, `3. Search`, `4. Board`)** (`shadow-[var(--shadow-popover)]`, backdrop blur) so it stays visible above Pin Detail (`z-[60]`) and auto-slides down smoothly on scroll down alongside the Top Header Bar.
- **Unified Outer Gutter**: Standard routes use `px-4 sm:px-6 lg:px-8` + `pt-5`; fluid feed routes (`/`, `/board`) tighten on mobile to `px-1.5 sm:px-6 lg:px-8 pt-2 sm:pt-5` so Pin cards sit almost flush to screen edges (`6px`).
- **Page Rule**: Individual `page.tsx` files **MUST NEVER** add outer `px-*` or custom top/bottom `py-*` paddings. Vertical spacing between major sections inside a page uses `space-y-6` (`24px`).

### Canonical Container Width Classes (`globals.css`)
Every route's root element MUST use one of these 3 container classes:
1. **`.cgr-page-fluid` (`w-full`)** — Used **ONLY** on `/` and `/board` so the fixed-width `236px` `<MasonryGrid />` (`columnWidth={236}`, `gutter={16}`) auto-fits columns across the viewport.
2. **`.cgr-page-standard` (`w-full max-w-[1120px] mx-auto`)** — Used on `/deal`, `/{hotelSlug}`, `/{hotelSlug}/posts`, `/trips`, `/studio`, and `/super-admin` so left/right content edges never shift when navigating between pages.
3. **`.cgr-page-reading` (`max-w-[760px] mx-auto`) & `.cgr-page-form` (`max-w-[640px] mx-auto`)** — Used on `/{hotelSlug}/posts/{postSlug}` and `/register-hotel` (`/login` uses `max-w-[420px]`).

---

## 4. Signature Page Specifications

### A. Home (`/`) & Saved Boards (`/board`)
- Underline Stay Style filter bar (`border-b border-[var(--color-border)]`, active underline `h-[2px] bg-[var(--color-text-primary)]`). On mobile (`< lg`), horizontal swipe left/right across the feed switches category tabs.
- `<MasonryGrid columnWidth={236} gutter={16} />` (`6px` gutter / 2 flush columns on mobile `< 640px`, `<= 10px` gutter on tablet, `120ms` resize settle debounce, `240ms cubic-bezier(0.2, 0, 0, 1)` GPU `translate3d` reflow).
- **Desktop Pin Close-Up (`>= lg`)**: Clicking any Pin **hides the Horizontal Stay Style Tabs** and displays `<PinterestPinDetail />` immediately at the very top of the page above `"More to explore"` (`window.scrollTo({ top: 0, behavior: "instant" })` — ZERO smooth sliding scroll).
- **Mobile Pin Close-Up (`< lg`, `z-[60]`)**: Opens as a full-screen top overlay (`fixed inset-0 z-[60]`, `data-mobile-scroll-container="true"`) keeping the `z-[70]` Mobile Bottom Bar accessible (auto-hiding smoothly on scroll down), with `"More to explore"` 2-column masonry below, a **Drill-Down Back Stack** on the top-left `<` squircle button (`Card C -> Card B -> Card A -> Home`), and native finger gestures (pull down Hero Media `>= 60px` to close, swipe left/right Hero Media when `images.length > 1` to flip photos).
- **`PinterestPinDetail` Clean Anatomy (Desktop Inline vs Mobile Bottom Sheets `z-[85]`)**: Left Media Stage uses `bg-[var(--color-background-body)]` (never hardcoded black) + `object-contain` (`fitMode="contain"` for videos) with desktop-only `<`/`>` carousel arrows; **On Desktop (`>= lg`)**, comments and the sticky squircle comment composer live **inline inside the Right Panel** (never opening a bottom-sheet modal on Desktop); **On Mobile/Tablet (`< lg`)**, comments are hidden inline and tapping `💬` slides up the **Comments Bottom Sheet Modal** (`lg:hidden z-[85]`, `.animate-slide-up-sheet`), while tapping `•••` opens a standard monochrome dropdown on Desktop (`>= lg`) or slides up the **More Options Bottom Sheet** on Mobile/Tablet (`< lg`).

### B. Coupon Marketplace (`/deal`) — Minimalist In-Place 3D Flip Ticket
- Root: `<div className="cgr-page-standard space-y-6">`.
- Clean 1-row header (`<h1>` left + `#f1f1f1` Wallet button right) + single-row Stay Style underline tabs (no Hero banner box, no 3-stat dashboard).
- Grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`, fixed card height `h-[168px]`.
- **Front Face**: Pure `#ffffff` (`#1e1e1e` Dark), `1px` border, semicircular left/right edge notches, vertical `1px dashed` perforation at `30%`:
  - Left: Centered Hotel Logo (`56×56px` rounded-full).
  - Right: Strictly 3 clean lines — Bold discount (`22px` `#111111`), Hotel Name (`15px` `#111111`), Validity date (`13px` `#737373`) + subtle flip cue. Zero front buttons.
- **Back Face (In-Place 3D `rotateY(180deg)` via `.cgr-flip-card`)**: Clicking flips the card smoothly in its grid cell to reveal the offer title, concise bulleted conditions (min spend, cap, remaining quota), copyable promo code chip, `#111111` Claim/Redeem CTA, property link, and `✕` flip-back button.

### C. Property Profile (`/{hotelSlug}`) — Facebook Cover Banner + 5 SSR DOM Tabs
- Root: `<div className="cgr-page-standard space-y-6">`.
- **Facebook-Style Cover Photo Header** (always visible above tabs; **NO** circular Instagram Story highlights, flush `0px` left/right edges):
  - Full-width `1120px` Cover Photo Banner (`h-[210px] sm:h-[290px] lg:h-[340px] rounded-[20px]`), followed by an overlapping circular avatar (`ring-4 ring-[var(--color-background-body)]`), `<h1>` Hotel Name + inline `BadgeCheck`, `@slug · อำเภอ จังหวัด · ★ รีวิว · ราคาเริ่มต้น`, flush-right monochrome action buttons (`เลือกห้องพัก` `#111111`, `ทัก LINE / โทร` `#f1f1f1`), concise Bio, and inline dashed coupon chips.
- **5 Flush Bottom-Underline Tabs (`border-b border-[var(--color-border)]`, active `border-b-2 border-[var(--color-text-primary)]`)**:
  1. `posts` (`โพสต์`): Flush 5-column edge-to-edge Pinterest `<MasonryGrid columnWidth={208} gutter={16} fitContainer={true} />` (`offsetX = 0`, zero side whitespace) + `<PinterestPinCard />` + in-place `<PinterestPinDetail />` row expansion.
  2. `rooms` (`ห้องพัก`): **12-Column Split Booking Dashboard** (`lg:col-span-7` compact non-stretched 2-month calendar + `lg:col-span-5` live per-room availability matrix for the tapped dates) + strictly equal-height (`sm:h-[216px]`) 2-column Room Cards clearly indicating available vs. sold-out rooms.
  3. `blog` (`บทความ`): 3-column shadow-free Hotel SEO Guide cards (`/{hotelSlug}/posts/{postSlug}`).
  4. `reviews` (`รีวิว`): Dedicated Guest Reviews summary + verified review cards & guest photos.
  5. `more` (`เพิ่มเติม`): Location & Google Map embed, Nearby spots, Check-in/Pet policies, Contact channels & FAQ accordion.
- **Mandatory SEO / AI Rule**: All 5 `<section role="tabpanel">` blocks **MUST** stay mounted in SSR HTML and toggle visibility via CSS `hidden` (`display: none`) + `?tab=` URL sync + `Schema.org JSON-LD` (never conditionally unmount inactive tabs).
