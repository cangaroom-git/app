---
name: code-simplification
description: Simplifies and organizes code into clean, well-structured architecture while preserving exact behavior. Enforces meaningful naming conventions, eliminates code smells and deep nesting, decomposes large functions/components, and ensures maintainability.
---

# Code Simplification & Clean Code Architecture

> Process-driven skill for AI coding agents to refactor, simplify, organize, and name code with industry-standard clean code principles. Built on Anthropic's `code-simplifier` principles and Robert C. Martin's Clean Code standards, tailored for TypeScript, React, and Next.js projects.

---

## 1. Overview & Golden Rule

**The Golden Rule: Preserve Behavior Exactly (100% Behavior-Preserving)**
- Simplification modifies *how* code expresses logic, **never** *what* the code does.
- All inputs, outputs, side effects, ordering, async resolution, and error behaviors must remain identical.
- Every change must pass this test: *"Would a new engineer understand and modify this code faster than the original, without any regression?"*

---

## 2. Meaningful Naming Standards (การตั้งชื่อให้สื่อความหมาย)

Clean code is self-documenting. Names must reveal intent without requiring comments or mental translations.

### 2.1 Identifiers & Variables
* **Intention-Revealing:** Name what it represents, not its generic container type.
  * ❌ `data`, `info`, `item`, `val`, `temp`, `res`, `obj`
  * ✅ `hotelBookingSummary`, `selectedRoomRate`, `guestProfile`
* **Avoid Cryptic Abbreviations:**
  * ❌ `usr`, `btn`, `cb`, `idx_tmp`, `cfg`, `param`
  * ✅ `user`, `submitButton`, `onCompleteCallback`, `config`
  * *Exceptions:* Globally recognized conventions (`id`, `url`, `api`, `i` in short loops).

### 2.2 Booleans (Predicate Prefixing)
Always prefix boolean variables and return types with a predicate:
* `is...`: State or identity (`isOpen`, `isAvailable`, `isSubmitting`, `isVerified`)
* `has...`: Possession or capability (`hasBreakfastIncluded`, `hasSpecialRequest`, `hasChildren`)
* `should...`: Conditional logic (`shouldAutoScroll`, `shouldShowGuestCounter`)
* `can...`: Permissions or capabilities (`canCancelBooking`, `canModifyDates`)
* ❌ Avoid negated boolean names like `isNotReady` or `disableSubmit` when `isEnabled` or `isSubmitting` is clearer.

### 2.3 Functions & Methods
* **Verb-First Pattern:** Always start with an active verb describing the action.
  * ✅ `calculateTotalPrice()`, `filterAvailableRooms()`, `formatCurrency()`
  * ❌ `totalPrice()`, `roomFilter()`, `price()`
* **Event Handlers:**
  * Define handlers as `handle[Action]` or `handle[Event]` (e.g., `handleDateRangeSelect`, `handleGuestCountChange`, `handleBookingSubmit`).
  * Pass them to props with `on[Event]` (e.g., `onSelectDate`, `onChange`, `onSubmit`).

### 2.4 React & TypeScript Types
* **Components:** PascalCase (e.g., `AgodaBookingBar`, `RoomAvailabilityCard`).
* **Props Interfaces:** `[ComponentName]Props` (e.g., `AgodaBookingBarProps`).
* **Custom Hooks:** camelCase prefixed with `use` (e.g., `useBookingDates`, `useRoomPriceCalculation`).
* **Enums & Const Maps:** UPPER_SNAKE_CASE for values, PascalCase for types (e.g., `BOOKING_STATUS.CONFIRMED`).

---

## 3. Structural Simplification & Clean Architecture

### 3.1 Flatten Deep Nesting (Guard Clauses First)
Replace nested `if/else` ladders with early returns.

```typescript
// ❌ HARD TO READ: Deep nesting
function processBooking(booking: BookingRequest) {
  if (booking.isValid) {
    if (booking.rooms.length > 0) {
      if (!booking.isExpired) {
        return createReservation(booking);
      } else {
        throw new Error('Booking expired');
      }
    } else {
      throw new Error('No rooms selected');
    }
  } else {
    throw new Error('Invalid booking payload');
  }
}

// ✅ CLEAN & READABLE: Guard clauses
function processBooking(booking: BookingRequest): Reservation {
  if (!booking.isValid) {
    throw new Error('Invalid booking payload');
  }
  if (booking.rooms.length === 0) {
    throw new Error('No rooms selected');
  }
  if (booking.isExpired) {
    throw new Error('Booking expired');
  }

  return createReservation(booking);
}
```

### 3.2 Single Responsibility Principle (SRP)
* A function should do **one thing** and do it well.
* If a function exceeds 30–40 lines or handles multiple tasks (e.g., parsing URL params + fetching data + validating form state + mapping UI models), decompose it into focused helper functions.

### 3.3 Decomposing Bloated React Components
When a React component grows past ~150–200 lines:
1. **Extract Business Logic into Custom Hooks:** Move complex state, `useEffect` dependencies, and calculation logic into a dedicated hook (e.g., `useBookingBarState`).
2. **Extract Pure Sub-Components:** Split isolated UI elements (e.g., DatePicker popover, Guest dropdown counter, Price breakdown card) into distinct sub-components.
3. **Colocate or Shared:** If sub-components are only used by this parent, put them in a subfolder or inline them cleanly. If reusable, place in `src/components/`.

### 3.4 Replace Complex Inline Logic with Explicit Mappings
```typescript
// ❌ Confusing inline nested ternaries
const badgeColor = status === 'confirmed' ? 'green' : status === 'pending' ? 'yellow' : status === 'cancelled' ? 'red' : 'gray';

// ✅ Clean dictionary / lookup table
const STATUS_BADGE_COLOR_MAP: Record<BookingStatus, string> = {
  confirmed: 'green',
  pending: 'yellow',
  cancelled: 'red',
  draft: 'gray',
};
const badgeColor = STATUS_BADGE_COLOR_MAP[status] ?? 'gray';
```

---

## 4. The 4-Step Simplification Workflow

```
1. UNDERSTAND → 2. IDENTIFY → 3. REFACTOR INCREMENTALLY → 4. VERIFY
```

### Step 1: Understand (Chesterton's Fence)
* Understand *why* the code was written this way before refactoring.
* Identify all callers, dependencies, edge cases, and side effects.
* If you don't fully understand a block of logic, do NOT rewrite it arbitrarily.

### Step 2: Identify Targets
* **Names:** Vague or abbreviated variables/functions.
* **Complexity:** Deeply nested loops/conditions, functions > 40 lines.
* **Redundancy:** Copy-pasted code blocks across the file.
* **Dead Code:** Unused imports, orphaned state variables, commented-out dead code.

### Step 3: Refactor Incrementally
* Make one focused change at a time (e.g., extract helper function first, rename identifiers second).
* Never mix large refactoring with new feature implementation.
* Keep git diffs clean and easy to review.

### Step 4: Verify
* Run type checks (`tsc --noEmit` or build).
* Ensure lint rules pass.
* Verify user interactions and edge cases behave identically.

---

## 5. Anti-Patterns to Avoid

| Anti-Pattern | Why it hurts | What to do instead |
| :--- | :--- | :--- |
| **Over-simplification / Code Golfing** | Making code shorter at the expense of mental overhead (e.g. nested regex/reduce combos). | Favor clarity over brevity. An 8-line readable loop beats a cryptic 1-line reduce. |
| **Drive-by Global Refactoring** | Changing files outside the requested scope. | Keep refactoring scoped to the active component or task. |
| **Removing Comments that Explain "Why"** | Removing crucial domain context. | Keep comments explaining *why* a workaround or special rule exists; delete only comments explaining *what* obvious code does. |
| **Breaking Design System Rules** | Using ad-hoc Tailwind colors or random styling while refactoring. | Strictly obey project design tokens (e.g. `var(--color-accent)`, `StandardCard`, minimal text). |

---

## 6. Simplification Quality Checklist

Before finalizing any refactor, verify:
- [ ] **Exact Behavior Preserved:** Inputs, outputs, and edge cases unchanged.
- [ ] **Descriptive Naming:** No vague names (`data`, `temp`, `item`, `res`, `usr`).
- [ ] **Clean Structure:** Guard clauses applied, nesting minimized.
- [ ] **Separation of Concerns:** Business logic separated from presentation.
- [ ] **No Dead Code:** Unused imports, unused variables, and stale comments purged.
- [ ] **TypeScript Types Strong:** No lazy `any` types introduced.
- [ ] **Build & Tests Pass:** Zero compile or runtime warnings introduced.
