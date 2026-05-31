# Round 02 Review — Wave 001: Invert the World/application boundary

**Reviewer:** primary reviewer (opencode-go/glm-5.1)
**Stage:** cycle-001-review-round-02
**Date:** 2026-05-25
**Proposals reviewed (corrected versions):**
- `architecture-audit/cycle-001-invert-world-application-boundary/proposals/proposal-direct.md`
- `architecture-audit/cycle-001-invert-world-application-boundary/proposals/proposal-restructure.md`

**Correction note reviewed:** `architecture-audit/cycle-001-invert-world-application-boundary/reviews/corrections-round-01-note.md`

**Scope check reviewed:** `architecture-audit/cycle-001-invert-world-application-boundary/scope-check.md`

---

## Resolution of round-01 blockers

### B1 — Test update surface undercounted — RESOLVED

Both proposals now include a complete verified direct-call inventory for `world.initialize(commandStack)`:

| File | Proposal evidence | Verified in source |
|---|---|---|
| `World.ts:193` | ✅ Listed | ✅ Confirmed via `grep -n "initialize" World.ts` → line 193 |
| `App.vue:157, 323, 384, 439` | ✅ Listed | ✅ Confirmed via `grep -n "world.initialize" App.vue` → exact match |
| `worldInitialization.spec.ts` lines 21, 50, 67, 82, 114, 124, 149, 151, 169, 184, 198, 221, 247, 260 | ✅ 14 lines listed | ✅ Confirmed via grep → exact 14 matches |
| `initializeWorldCommand.spec.ts:26` | ✅ Listed | ✅ Confirmed |
| `worldHelpers.ts:43, 44` | ✅ Listed with `createTestWorld()` plan | ✅ Confirmed: line 43 `new CommandStack(world)`, line 44 `world.initialize(commandStack)` |
| `commandStack.spec.ts:38` | ✅ Listed for stale `new CommandStack(world)` argument | ✅ Confirmed |

Both proposals explicitly commit to updating `createTestWorld()` to call the new application initializer while preserving the `{ world, commandStack }` return signature, avoiding broad downstream churn. Both commit to updating all test call sites in the same implementation wave with no broken intermediate state.

I independently verified the complete call-site inventory via `grep -rn "world.initialize" frontend/tests/` and `grep -rn "world.initialize" frontend/src/`. No call sites were missed. The correction fully resolves B1.

### B2 — ProjectRuntime lifecycle gap — RESOLVED

The restructure proposal has been corrected to **explicitly reject `ProjectRuntime` for Wave 001**, stating that a runtime without sign-out/load/reset/autosave lifecycle semantics would be an incoherent partial wrapper, and that adding those semantics would enter Wave 009 app-shell scope. The corrected restructure proposal now recommends choosing the direct proposal and carrying runtime extraction forward as Wave 009 input.

This resolves B2 by eliminating the problematic partial abstraction. The restructure proposal effectively converges toward the direct proposal for Wave 001 scope, while preserving the runtime concept as a future wave input.

---

## Resolution of round-01 warnings

### W1 — DependencyService target location — RESOLVED

Both proposals now commit to a **mechanical move** from `frontend/src/services/DependencyService.ts` to `frontend/src/domain/world/DependencyService.ts`, retaining the `DependencyService` class name and behavior. No conceptual rename, no re-export, no shim, no redesign in this wave. Verified that `World.ts` (line 94) is indeed the only direct importer via `grep -rn "DependencyService" frontend/src/`.

### W2 — CommandStack dependency direction — RESOLVED

Both proposals now document that `CommandStack` imports `Command` only and has no declared constructor (verified: `CommandStack.ts` has `private undoStack`, `private redoStack`, `private listeners` as fields, no `constructor()` method). Both note that `new CommandStack(world)` in `worldHelpers.ts:43` is a stale argument that will be removed. Both explicitly preserve the allowed direction `application initializer → commands/CommandStack → domain World`.

### W3 (info) — styleService/Element2D context deferral — Confirmed appropriate

No change needed. Both proposals correctly defer broad `realize2D`/`resolveVisibility` signature changes.

### W4 (info) — InitializationOps.ts private casts — Confirmed appropriate

No change needed. Correctly deferred to Wave 004.

---

## Criterion-by-criterion re-scoring (corrected proposals)

### Criterion 1: Does it advance the wave's target outcome?

**Proposal Direct — Score: STRONG PASS**

- Fully deletes `World.initialize(commandStack)` and all command/stack/service imports from `World.ts`.
- Creates a focused application initializer at the correct dependency level.
- Moves `DependencyService` into the domain, eliminating the `@/services/` import.
- Makes `new World()` a pure domain construction with no command/application dependencies.
- Test update surface is now completely inventoried with explicit per-file plans.
- Meets all mandatory success criteria from the wave plan.

**Proposal Restructure — Score: PASS**

- Achieves the same core outcome as the direct proposal (since `ProjectRuntime` is rejected for Wave 001).
- The corrected restructure effectively converges to the direct proposal's scope for Wave 001.
- Retains the runtime concept as documented Wave 009 input — good forward reference but not actionable in this wave.
- Slightly lower signal-to-noise ratio: the restructure proposal is now largely a justification for not using the restructure approach, plus the same direct implementation.

### Criterion 2: Does it improve architecture and code quality?

**Proposal Direct — Score: GOOD**

- Cleanly inverts the primary dependency (domain→commands becomes commands→domain for initialization).
- Introduces one small, focused module at the application layer.
- No shims, no compatibility wrappers.
- Does not attempt to redesign adjacent concerns.

**Proposal Restructure — Score: GOOD (corrected)**

- Same core inversion as direct for Wave 001 scope.
- The rejection of `ProjectRuntime` removes the previous caveat about incomplete lifecycle. The corrected proposal is now architecturally clean for Wave 001.
- The runtime sketch is preserved as Wave 009 input with clear scope guards.

### Criterion 3: Does it respect the no-backcompat / aggressive-deletion priorities?

**Proposal Direct — Score: STRONG PASS**

- Explicit DELETE list with specific file paths.
- No compatibility wrappers (`World.initialize = initializeWorld`).
- Deletes stale commented-out initialization path.
- Deletes tests asserting the old `World.initialize(...)` API and replaces with application-initializer coverage.
- Deletes `DependencyService` service-layer file with no re-export.

**Proposal Restructure — Score: STRONG PASS (improved from PASS)**

- Same DELETE list for `World.initialize` and imports.
- Explicitly does NOT delete `new World()`/`new CommandStack()` from `App.vue` (correct — that belongs to a future wave).
- Explicitly avoids compatibility bridges.

### Criterion 4: Does it avoid overfeaturism?

**Proposal Direct — Score: STRONG PASS**

- Minimal scope: one new file, modifications to `World.ts` and `App.vue`, move of `DependencyService`.
- Explicitly defers `Element2D`/`styleService` context cleanup when it risks broad churn.
- No new abstractions beyond what the wave requires.

**Proposal Restructure — Score: PASS (improved from WARNING)**

- By rejecting `ProjectRuntime` for Wave 001, the overfeaturism concern is resolved.
- The proposal is now essentially the direct approach plus a documented future reference.
- Some redundancy: the restructure proposal exists mainly to explain why the restructure isn't happening, which is useful as a decision record but doesn't add implementation value.

### Criterion 5: Does it introduce new risks or hidden regressions?

**Proposal Direct — Score: LOW RISK**

- `DependencyService` move is simple (single importer verified).
- Idempotency is unit-testable.
- Test update surface is now fully inventoried.
- `App.vue` sign-out is explicitly out of scope and documented.
- `CommandStack` direction is documented and correct.

**Proposal Restructure — Score: LOW RISK (improved from MEDIUM)**

- Same risk profile as direct for Wave 001 scope.
- The runtime is not introduced, so the reference-stability and lifecycle risks are eliminated.
- The risk of the proposal itself being confusing (proposing a restructure then rejecting it) is present but manageable.

### Criterion 6: Is the proposed validation sufficient?

**Proposal Direct — Score: ADEQUATE → GOOD (improved)**

- Now includes complete test-file inventory with per-file update plans.
- Includes architecture boundary test for `World.ts` imports.
- Includes `CommandStack` stale-argument cleanup in test helpers.
- Explicitly mentions that transitive dependencies (`active-plane-shortcuts.spec.ts`, `paperService.spec.ts`) must be covered by focused/full validation even though they are not direct call sites.
- All mandatory validation cadence steps listed (lint, focused Vitest, full Vitest, build, Playwright/e2e, live preview refresh).

**Proposal Restructure — Score: ADEQUATE → GOOD (improved)**

- Same validation improvements as direct.
- Explicitly notes no runtime-specific tests in Wave 001 (since runtime is rejected).
- Clear focus on initializer and boundary tests.

---

## New observations

### N1. The restructure proposal is effectively the direct proposal plus a decision record

**Severity:** INFO

The corrected restructure proposal no longer proposes a materially different implementation for Wave 001. It converges to the same scope as the direct proposal. This is the correct resolution to B2, but it means the "two proposals" are no longer offering genuinely different architectural choices for this wave. The restructure proposal's primary remaining value is as a documented rationale for deferring `ProjectRuntime` to Wave 009. This is fine for the review protocol but worth noting.

### N2. `initializeWorldCommand.spec.ts` may contain a redundant test

**Severity:** INFO

The corrected proposals note that `initializeWorldCommand.spec.ts:26` calls `world.initialize(commandStack)`, and the correction plan says to "replace obsolete `World.initialize` API assertion with initializer/command-stack behavior or delete if redundant." Source inspection shows this test file at line 25 creates `new CommandStack()` and at line 26 calls `world.initialize(commandStack)`. After the wave, the test should either: (a) import and test `initializeWorld(world, commandStack)` directly, or (b) be deleted if its coverage is subsumed by the updated `worldInitialization.spec.ts` integration tests. The proposals correctly leave this as an implementation-time decision, which is appropriate.

---

## Comparative assessment (corrected proposals)

| Criterion | Proposal Direct | Proposal Restructure (corrected) |
|---|---|---|
| Target outcome advancement | STRONG PASS | PASS |
| Architecture/code quality | GOOD | GOOD |
| No-backcompat/deletion | STRONG PASS | STRONG PASS |
| Avoids overfeaturism | STRONG PASS | PASS |
| New risks/regressions | LOW | LOW |
| Validation sufficiency | GOOD | GOOD |

**Preferred proposal:** Proposal Direct.

**Rationale:** Both proposals now converge to the same Wave 001 scope. The direct proposal presents that scope more concisely and directly. The restructure proposal adds a useful decision record for Wave 009 but is essentially endorsing the direct approach for this wave. No architectural reason to choose the restructure proposal over the direct one for Wave 001.

---

## Verdict: NO BLOCKING ISSUES

Both round-01 blockers (B1: test surface inventory, B2: ProjectRuntime lifecycle gap) have been resolved by the in-place corrections. Both warnings (W1: DependencyService location, W2: CommandStack direction) have been addressed. The corrected proposals are ready for decision and implementation.

**Recommendation:** Choose Proposal Direct for Wave 001 implementation. Record the `ProjectRuntime` concept from Proposal Restructure as Wave 009 input.
