# Mandatory Agent Guidelines for `my-hotel` (Cangaroom)

> **CRITICAL RULE 1 — MASTER DESIGN SYSTEM CONSTITUTION (บังคับอ่านทุกครั้งก่อนเขียนหรือแก้ไข UI):**
> Every time you implement, create, or modify any UI component, page, or feature in this repository, you **MUST** first read and strictly follow the design system skill at:
> `.agents/skills/my-hotel-design-system/SKILL.md`
>
> **CRITICAL RULE 2 — CORE BUSINESS MODEL & ARCHITECTURE (บังคับอ่านก่อนแก้ลอจิก ฐานข้อมูล หรือโครงสร้างหน้าเว็บ):**
> Every time you plan, build, or modify business logic, routes, APIs, or database schemas, you **MUST** read and follow the master business blueprint inside:
> `CoreBusiness/README.md` (and `CoreBusiness/01` through `05` — which supersede legacy `plan/` and `booking-flow.md`).

## Non-Negotiable Design Constitution (Read Every Turn)

1. **ZERO HOVER SCALE (`ห้ามใช้ hover แล้ว scale ทั้งเว็บเด็ดขาด`)**:
   - **NEVER** use `hover:scale-*`, `group-hover:scale-*`, or `:hover { transform: scale(...) }` on ANY image, card, button, or icon anywhere in the codebase.
2. **ZERO CARD/BUTTON SHADOWS & ZERO GRADIENTS/PASTEL WASHES (`ห้ามใส่เงาการ์ด/ปุ่ม และห้ามใช้พื้นหลังพาสเทลหรือไล่สี`)**:
   - **NEVER** apply `shadow-*` (`shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-[var(--shadow-card)]`) to cards, banners, or buttons. Separate surfaces strictly with `1px solid var(--color-border)` (`#ebebeb` Light / `#2b2b2b` Dark) or muted fills (`#f2f2f2` / `#262626`). Floating shadows (`--shadow-popover`) are permitted ONLY on floating dropdown popovers/modals.
   - **NEVER** use `bg-gradient-*` or pastel tinted boxes (`--color-promo-muted`, `--color-accent-muted`, `--color-warning-muted`, `--color-success-muted`) on UI cards or section headers.
3. **STRICT 95/5 MONOCHROME PALETTE & 2-BUTTON HIERARCHY**:
   - **95% Monochrome**: Pure white `#ffffff` (`#121212` Dark) canvas, `#ffffff` (`#1e1e1e` Dark) bordered cards, `#efefef` / `#f2f2f2` (`#262626` Dark) secondary surfaces, `#111111` (`#f5f5f5` Dark) primary ink, `#737373` (`#a3a3a3` Dark) secondary ink.
   - **2 Buttons Only & Ironclad Unified Squircle Curvature**:
     - **Primary Button**: Solid `#111111` ink (`#f5f5f5` Dark) for primary actions (`จองห้องพัก`, `เก็บคูปอง`, `ค้นหา`, `บันทึกข้อมูล`).
     - **Secondary Button**: Flat `#efefef` (`#262626` Dark) with `#111111` ink for secondary actions (`ดูรายละเอียด`, `ทัก LINE`, `Facebook`, `คัดลอกโค้ด`).
     - **Unified Squircle Curvature**: Every `<button>` and `<input>` across the app MUST use squircle radii matching the `48px` (`rounded-[16px]`) Mobile Bottom Menu (`rounded-[10px]`–`rounded-[16px]`); **NEVER** use `rounded-full` on buttons or inputs.
     - **FORBIDDEN**: Never use `#0866ff` blue buttons, `#06c755` green buttons, or colored section eyebrows/headings.
   - **5% Reserved Red (`#e60023`)**: Allowed **ONLY** on the Pin `'บันทึก'` (`Save`) button and tiny notification count badges/dots in navigation. Status indicators use a `6px` dot inside a monochrome `#efefef` pill.
4. **UNIFIED APP SHELL & 3-TIER CONTAINER GRID (Exact Margins & Paddings Everywhere)**:
   - **Persistent `72px` Left Sidebar + `64px` Top Bar**: Shown consistently across **ALL** routes (`/`, `/board`, `/deal`, `/{hotelSlug}`, `/{hotelSlug}/posts`, `/trips`, `/studio`, `/register-hotel`, `/super-admin`), with standalone auth ONLY on `/login`.
   - **Single Global Gutter & Vertical Rhythm**: Both `<header>` and `<main>` in `HotelAppShell` enforce `px-4 sm:px-6 lg:px-8` horizontally and `pt-5 pb-12` vertically. Individual `page.tsx` files **MUST NOT** add conflicting outer `px-*` or arbitrary `py-*`.
   - **3 Container Width Tiers Only**:
     - **Tier 1 (`cgr-page-fluid` — `w-full`)**: `/` and `/board` ONLY (for `236px` fixed-width animated `<MasonryGrid />`).
     - **Tier 2 (`cgr-page-standard` — `max-w-[1120px] mx-auto`)**: `/deal`, `/{hotelSlug}`, `/{hotelSlug}/posts`, `/trips`, `/studio`, `/super-admin`.
     - **Tier 3 (`cgr-page-reading` `760px` / `cgr-page-form` `640px` / Auth `420px`)**: `/{hotelSlug}/posts/{postSlug}`, `/register-hotel`, `/login`.
5. **SIGNATURE PAGE ARCHITECTURES**:
   - **`/deal`**: Clean pure-white horizontal ticket grid (`1px` border, semicircular side notches, vertical dashed divider: Logo left | Discount + Hotel + Expiry right) with **In-Place 3D Card Flip (`rotateY(180deg)`)** on click to reveal conditions, copyable code, and `#111111` Claim/Redeem CTA.
   - **`/{hotelSlug}`**: **Facebook Cover Photo Banner Header** (no Instagram circular Story highlights) + **5 SSR DOM Tabs (`posts`, `rooms`, `blog`, `reviews`, `more`)**: `posts` uses the Home Pinterest `<MasonryGrid columnWidth={236} gutter={16} />` & `<PinterestPinCard />`; `rooms` puts an always-visible **Inline Interactive Calendar** on top that filters rooms immediately on tap; `reviews` and `more` (`เพิ่มเติม` — Map, Policies, FAQs) are separate tabs; all 5 panels render in SSR HTML and toggle via CSS `hidden` + `?tab=` URL sync + `Schema.org JSON-LD`.
