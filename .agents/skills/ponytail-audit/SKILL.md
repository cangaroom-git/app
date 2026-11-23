---
name: ponytail-audit
description: >-
  Whole-repo or scoped read-only audit for over-engineering, dead code, YAGNI abstractions,
  and platform-redundant code in my-hotel (Nondii). Produces a ranked list of what to delete,
  simplify, or replace with stdlib/native equivalents without editing files. Use when the user
  says "audit this codebase", "audit for over-engineering", "what can I delete from this repo",
  "find bloat", "clean code audit", or "ponytail-audit".
---

# Ponytail Audit (Read-Only Over-Engineering & Bloat Audit)

Scan the requested directory or entire repository without modifying any file. Rank findings from highest impact / biggest cut first.

## Tags

- `delete:` dead code, unused exports, speculative features, orphaned helpers. Replacement: nothing.
- `stdlib:` hand-rolled logic that JavaScript/TypeScript/Node standard library already ships. Name the function.
- `native:` dependency or wrapper doing what Next.js / React / Browser platform already does. Name the feature.
- `yagni:` abstraction, interface, or factory with a single implementation, unused config flag, or pass-through layer with one caller.
- `shrink:` same exact behavior expressed in significantly clearer, shorter form. Show the replacement.

## Hunt Targets

1. Unused dependencies or hand-rolled utilities the platform/stdlib already ships.
2. Single-implementation interfaces/factories and pass-through wrappers that only delegate.
3. Files exporting one trivial symbol or duplicated mappers/helpers across routes.
4. Dead flags, stale fallback arrays, unreachable branches, and orphaned components.
5. Verify every finding via references, call sites, dynamic imports, Next.js route conventions (`page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`, `sitemap.ts`), and config files before suggesting deletion. If usage is uncertain, mark as uncertain and do **not** suggest deletion.

## Output Format

Report ranked findings:

```text
<tag> <what to cut>. <replacement>. [path]
```

And a Thai/English summary table:

| ลำดับ | ประเภท | Candidate | หลักฐาน | ผลที่คาด | ความเสี่ยง | ขั้นถัดไป |
|---|---|---|---|---|---|---|

End with:
- `net: -<N> lines, -<M> deps possible.` (or `Lean already. Ship.` if nothing is worth cutting)
- Top 1 recommended candidate to tackle first (with estimated file scope and required verification)
- Checked items intentionally left untouched

## Boundaries

- Scope: over-engineering, dead code, and complexity ONLY. Correctness bugs, security holes, and performance issues should be flagged separately for dedicated review (`nondii-speed-and-superadmin` / `security-and-hardening`).
- **Strictly Read-Only:** Lists findings and applies ZERO edits during the audit pass.
