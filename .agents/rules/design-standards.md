---
trigger: always_on
description: Mandatory rule enforcing that the agent reads and follows .agents/skills/my-hotel-design-system/SKILL.md before implementing any UI or code changes.
---

# Mandatory Design System Enforcement

Before implementing, creating, or modifying any UI component or page in `my-hotel`, you MUST read and obey `/Users/light/my-hotel/.agents/skills/my-hotel-design-system/SKILL.md`:
- **Icon-First, Minimal Text**: Keep text minimal; prioritize clean icons and visual clarity.
- **Strict Monochrome Theme Tokens**: Only use CSS theme tokens (`--color-accent`, `--color-on-accent`, `--color-background-card`, `--color-background-muted`, `--color-border`, `--color-text-primary`, `--color-text-secondary`). Never introduce arbitrary colorful/cartoon gradients.
- **Strict 5-Tier Typography**: Only use `.ty-display`, `.ty-title`, `.ty-subtitle`, `.ty-body`, and `.ty-caption`.
