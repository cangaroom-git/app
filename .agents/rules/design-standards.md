---
trigger: always_on
description: Mandatory rule enforcing .agents/skills/my-hotel-design-system/SKILL.md, zero hover-scale site-wide, and pure media viewing without forced detail drawers.
---

# Mandatory Design System Enforcement

Before implementing, creating, or modifying any UI component or page in `my-hotel`, you MUST read and obey `/Users/light/my-hotel/.agents/skills/my-hotel-design-system/SKILL.md`:
- **FORBIDDEN — Zero Hover Scale (`ห้ามใช้ hover แล้ว scale ทั้งเว็บ`)**: Never use `hover:scale-*` or `group-hover:scale-*` on any image, card, button, or element anywhere in the app.
- **Pure Media Click Behavior**: Clicking photos or videos opens ONLY a clean photo/video viewer — never force-open room details or booking drawers when viewing media. Booking happens on `/booking`.
- **Facebook Comet Theme Tokens**: Use CSS variables from `src/app/globals.css` (`--color-accent` `#0866ff`, `--color-promo` `#c53829`, `--color-background-body` `#f2f4f7` / `#18191a`, `--color-background-card` `#ffffff` / `#242526`).
- **Native System Font & 5-Tier Typography**: Use `system-ui` native Thai + English font stack with `.ty-display`, `.ty-title`, `.ty-subtitle`, `.ty-body`, and `.ty-caption`.
