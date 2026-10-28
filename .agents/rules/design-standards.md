---
trigger: always_on
description: Mandatory rule enforcing that the agent reads and follows .agents/skills/my-hotel-design-system/SKILL.md before implementing any UI or code changes.
---

# Mandatory Design System Enforcement

Before implementing, creating, or modifying any UI component or page in `my-hotel`, you MUST read and obey `/Users/light/my-hotel/.agents/skills/my-hotel-design-system/SKILL.md`:
- **Icon-First, Minimal Text**: Keep text minimal; prioritize clean `lucide-react` icons and visual clarity.
- **Strict Brand & Promotion Theme Tokens**: Only use CSS theme tokens (`--color-accent` `#1751ae`, `--color-on-accent`, `--color-promo` `#c53829` for promotions/discounts/coupons, `--color-on-promo`, `--color-background-card`, `--color-background-muted`, `--color-border`, `--color-text-primary`, `--color-text-secondary`). Never introduce arbitrary colorful/cartoon gradients.
- **1140px Single Centered Feed & Right Sidebar Drawers**: Public pages use `StandardFeedContainer` (`max-w-[1140px] mx-auto`). All overlays/modals MUST open as Right Sidebar Drawers (`fixed inset-y-0 right-0 h-[100dvh]`), never centered modals.
- **Strict 5-Tier Typography & `Noto Sans Thai`**: Only use `.ty-display`, `.ty-title`, `.ty-subtitle`, `.ty-body`, and `.ty-caption` with `Noto Sans Thai` font.
