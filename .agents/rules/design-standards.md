---
trigger: always_on
description: Mandatory rule enforcing .agents/skills/my-hotel-design-system/SKILL.md, zero hover-scale site-wide, Instagram 72px minimal left sidebar, and Pinterest Masonry + Pin Detail with comments.
---

# Mandatory Design System Enforcement

Before implementing, creating, or modifying any UI component or page in `my-hotel`, you MUST read and obey `/Users/light/my-hotel/.agents/skills/my-hotel-design-system/SKILL.md`:
- **FORBIDDEN — Zero Hover Scale (`ห้ามใช้ hover แล้ว scale ทั้งเว็บ`)**: Never use `hover:scale-*` or `group-hover:scale-*` on any image, card, button, or element anywhere in the app.
- **Instagram Minimal `72px` Left Sidebar**: Pure white `#ffffff` rail with top brand glyph, centered minimal icon-only stack, and bottom `≡` menu.
- **Pinterest Masonry & Pin Detail Experience**: Pure white `#ffffff` canvas, `#f1f1f1` rounded search bar, staggered variable-height `rounded-[16px]` Masonry Pin cards, and in-page Split 2-Column Pin Detail Card (`rounded-[28px]`) with interactive comments & related Masonry pins.
- **Pinterest Gestalt Color & Typography Tokens**: `#111111` ink, `#767676` secondary text, `#efefef` / `#f1f1f1` secondary surfaces, `#e60023` Save/Promo red, and `system-ui` native Thai + English font stack.
