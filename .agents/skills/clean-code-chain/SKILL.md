---
name: clean-code-chain
description: >-
  Structured, behavior-preserving Clean Code workflow for my-hotel (Nondii), chaining
  read-only over-engineering audit (ponytail-audit) -> single-candidate scope selection ->
  incremental simplification (code-simplification) -> React/Next.js performance & design-system
  check (vercel-react-best-practices + nondii-speed-and-superadmin + my-hotel-design-system) ->
  verification (tsc, lint, build). Use whenever asked to "clean code", "refactor cleanly",
  "reduce complexity", "clean up module", or run a safe multi-step cleanup without regressions.
---

# Nondii Clean-Code Chain Workflow

Safe, evidence-backed workflow for cleaning and simplifying production code in `my-hotel` (`nondii.com`) **without changing behavior**, **without drive-by edits**, and **without breaking speed or Airbnb Warm Minimal UI standards**.

> **Default Mode:** `plan-only` (audit and propose 1 candidate before editing) unless the user explicitly asks to execute (`execute-after-audit` / "ลุยเลย").
> **Golden Rule:** NEVER "clean the entire repository" in one pass. Pick **1 evidence-backed candidate** per cycle, verify cleanly, then move to the next.

---

## Standard Skill Chain (Do Not Skip Order)

```text
1. ponytail-audit (read-only)
   → 2. Select 1 high-impact, low-risk candidate + document preserved behavior
   → 3. code-simplification (scoped refactor ONLY)
   → 4. React/Next.js & Design-System review (vercel-react-best-practices + nondii-speed-and-superadmin + my-hotel-design-system)
   → 5. Verification (npx tsc --noEmit → npm run lint → npm run build → diff review)
```

---

## Step-by-Step Procedure

### Step 1 — Read-Only Audit (`ponytail-audit`)
- Inspect ONLY the requested module, route, or directory. **Do NOT edit any files in Step 1.**
- Identify dead code, unused exports/deps, pass-through wrappers, single-implementation abstractions, duplicated logic, bloated components (>200 lines), or deep nesting.
- Confirm every candidate with actual call sites, imports, dynamic imports, and Next.js file conventions. Separate verified evidence from assumptions.
- If nothing is genuinely worth simplifying, stop and report that no refactor is needed.

### Step 2 — Select Scope & Safety Gate
- Rank candidates by impact, risk, and ease of verification. Choose at most **1–3** (default **1**) focused candidates and list the exact behaviors/edge cases that must remain 100% identical.
- **Mandatory Stop-and-Ask Gate:** Pause and ask for confirmation before editing if a candidate:
  - Touches `> 500` lines, OR
  - Alters public API contracts, Prisma schema/migrations, authentication/RBAC, payment/booking math, or data persistence.

### Step 3 — Scoped Simplification (`code-simplification`)
- Understand before touching (**Chesterton's Fence**): inspect callers, callees, and git context first.
- Preserve exact inputs, outputs, side effects, execution order, error handling, and validation.
- Prefer clarity over cleverness or line-count golf (guard clauses, explicit lookup maps, intention-revealing names, SRP extraction).
- Strictly ZERO drive-by refactors outside the selected scope.
- Never weaken error handling, validation, or existing tests to force a pass.

### Step 4 — React / Next.js & Design-System Check
When the diff touches `.tsx`, hooks, Server Components, API routes, or data fetching:
- Check with `vercel-react-best-practices` & `nondii-speed-and-superadmin`:
  - No new async waterfalls, no unnecessary `force-dynamic`, no client bundle bloat, no hydration mismatches, no prefetch storms, no speculative `useMemo`/`useCallback` without evidence.
- Check with `my-hotel-design-system`:
  - Zero `hover:scale-*`, zero card/button shadows, zero border fatigue, zero native `<select>` or raw `<input type="checkbox">`, proper squircle radii, `useModalPresence` animations preserved.

### Step 5 — Verification Gate
Run repository checks in order and report exact pass/fail status:
1. `npx tsc --noEmit`
2. `npm run lint` (or targeted eslint on modified files if pre-existing unrelated warnings exist)
3. `npm run build`
4. Review `git diff --stat` to confirm zero unrelated files were touched and zero dead imports/stale comments remain.

**Never claim success if any required check fails.** Distinguish regressions introduced by the diff from pre-existing issues.

---

## Standard Output Format (Thai)

1. **ขอบเขตที่ตรวจ** (Scope)
2. **ข้อค้นพบและหลักฐาน** (Evidence-backed findings)
3. **การเปลี่ยนแปลงที่ทำ** (Exact simplifications applied & why behavior is preserved)
4. **สิ่งที่ตั้งใจไม่เปลี่ยน** (Out-of-scope or intentionally preserved code)
5. **ผล Verification** (Exact commands + pass/fail status)
6. **ความเสี่ยงหรือขั้นถัดไป** (Only if applicable)
