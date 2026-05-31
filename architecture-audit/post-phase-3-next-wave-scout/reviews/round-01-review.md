# Review Round 01 — Post-Phase-3 Next-Wave Scout

## Verdict

**BLOCKING ISSUES**

The proposal set correctly identifies that `PLAN_COMPLETE` is not justified while root/frontend full Vitest, build, and broad e2e remain red, and it keeps the next unit bounded around validation health rather than reopening broad refactors. However, both proposals need in-place corrections before decision because they leave the Wave 014 framing under-specified in two central places:

1. the intersection contract work is not bounded tightly enough against accidental domain redesign, and
2. the validation plan does not explicitly require Playwright MCP/live behavioral verification even though the wave explicitly touches user-observable frontend behavior and e2e ownership.

Between the two, **`proposal-restructure.md` is the better Wave 014 framing** because the evidence shows a systemic ownership problem, not just a handful of isolated repairs: the Playwright suite is currently corrupted at parse time, the guide integration file is effectively invalid as collected, and the build gate is blocked by a tool/runtime incompatibility rather than app logic. Framing the wave as **validation contract ownership with aggressive deletion of invalid gates** better matches the project priorities and reduces the risk of cosmetic “green by patching” work. The direct proposal is still viable, but only if corrected to match that ownership/deletion discipline.

## Evidence checked

- `architecture-audit/post-phase-3-next-wave-scout/scope-check.md`
- `architecture-audit/post-phase-3-next-wave-scout/candidate-risks.md`
- `architecture-audit/post-phase-3-next-wave-scout/proposals/proposal-direct.md`
- `architecture-audit/post-phase-3-next-wave-scout/proposals/proposal-restructure.md`
- `architecture-audit/cycle-013-docs-specs-reconciliation/validation/final-validation-summary.stdout`
- `architecture-audit/wave-plan.md`
- `frontend/src/domain/calculations/Intersections.ts`
- `frontend/tests/unit/calculations/intersections.spec.ts`
- `frontend/src/components/dialogs/PropertiesDialog.vue`
- `frontend/tests/unit/components/propertiesDialog.spec.ts`
- `frontend/tests/integration/guide-creation.test.ts`
- `frontend/tests/e2e/selection-mask.spec.ts`
- `frontend/tests/e2e/keyboard-shortcuts.spec.ts`
- `frontend/package.json`
- `package.json`

## Proposal scoring

### Proposal Direct — Restore Mandatory Validation Gates

1. **Advances target outcome:** **4/5**  
   Yes. It directly targets the currently red mandatory gates documented in Wave 013 validation and correctly treats them as central blockers to future waves.

2. **Improves architecture/code quality:** **3/5**  
   Moderately. It improves confidence and correctness, but its framing still reads partly as “repair the failures” instead of explicitly forcing ownership/deletion decisions for invalid validation artifacts.

3. **Respects no-backcompat / aggressive deletion:** **4/5**  
   Mostly yes. The DELETE list is directionally correct, especially for corrupted Playwright fragments and placeholder guide blocks.

4. **Avoids overfeaturism:** **4/5**  
   Mostly yes. It stays narrower than a broad validation-platform redesign, though the proposal should say more explicitly that no generic framework/check suite should be introduced beyond narrow recurrence guards.

5. **Introduces risks / hidden regressions:** **2/5**  
   Current gap: the intersection item is central domain behavior, and the proposal does not yet force the implementer to prove whether the right fix is limited contract alignment versus a deeper intersection/domain-model redesign. Without that tighter guard, a “validation wave” could smuggle in unreviewed geometry redesign.

6. **Validation sufficiency:** **3/5**  
   Incomplete. It includes focused/full Vitest, build, e2e, and preview probe, but it does not explicitly require the Playwright MCP/live behavioral check mandated by the project objective for frontend/user-observable changes.

### Proposal Restructure — Establish Validation Contract Ownership

1. **Advances target outcome:** **5/5**  
   Strongly yes. It matches the observed problem: broad gates exist but cannot be trusted because their current ownership/contracts are unclear or stale.

2. **Improves architecture/code quality:** **4/5**  
   Better than Direct because it treats invalid tests/tooling/specs as architecture debt to delete or replace, not merely failures to patch.

3. **Respects no-backcompat / aggressive deletion:** **5/5**  
   Strongly aligned. It explicitly prefers deleting stale gates/helpers/specs over preserving coverage theater.

4. **Avoids overfeaturism:** **3/5**  
   Better than a tooling-redesign wave, but still needs a sharper statement that no broad validation framework, generalized allowlist system, or new custom runner is permitted.

5. **Introduces risks / hidden regressions:** **3/5**  
   Better framing, but still under-specifies the boundary for intersection contract work and therefore still risks domain redesign hiding under validation ownership language.

6. **Validation sufficiency:** **3/5**  
   Same gap as Direct: strong on focused/full command coverage, but it should explicitly require Playwright MCP/live behavioral verification after the repaired/replaced e2e surfaces are green.

## Required criteria review

### 1) Does the wave restore validation gates directly or establish validation contract ownership?

**Recommendation: establish validation contract ownership.**

Why:
- The build failure is a tool/runtime incompatibility (`vue-tsc` under Node 24), not a normal app defect.
- The Playwright suite currently fails before browser execution because two spec files are structurally corrupted.
- The guide integration file is collected as `0 test`, which is not meaningful validation.
- `PropertiesDialog.vue` still contains placeholder/default-loading behavior and `as any` boundary leaks, so test failures may be exposing a stale UI contract rather than just a missing assertion update.

That is broader than “restore gates,” but still bounded if the wave is limited to the currently red surfaces and small recurrence checks only.

### 2) Is intersection correctness scoped safely?

**Not yet. This is a blocker.**

Evidence:
- `frontend/src/domain/calculations/Intersections.ts` currently returns `Point2DRealization2D` and encodes parallel/coincident lines as `new Point2DRealization2D(..., false)`.
- `frontend/tests/unit/calculations/intersections.spec.ts` expects `null` for those same cases.

This is a real contract mismatch, not just broken tests. But the proposals currently do not require the implementation to first enumerate and review all active callers/call-site assumptions before choosing the new contract. That missing step risks an over-broad or under-reviewed geometry change inside a validation wave.

### 3) Are PropertiesDialog/guide-test repairs scoped safely?

**Mostly yes, but they should be stated more explicitly as contract triage, not feature work.**

Evidence supports the proposals’ caution:
- `PropertiesDialog.vue` still uses placeholder property loading and placeholder created-by text, plus repeated `as any` casts into domain internals.
- `guide-creation.test.ts` includes a placeholder `it(...)` block with no executable assertions, matching the Wave 013 summary’s `0 test` concern.

Wave 014 may repair or delete stale tests and minimally adjust component behavior where the current contract is already implied, but it should not expand into a broad PropertiesDialog redesign or guide/domain refactor.

### 4) Are vue-tsc/Node tooling repairs avoiding overbroad redesign?

**Yes in intent, but the wording should be tightened.**

The proposals correctly focus on restoring a working build gate rather than redesigning the full build system. They should explicitly forbid adding parallel build paths or preserving an old/new dual toolchain.

### 5) Are corrupted Playwright spec repairs avoiding overbroad tooling redesign?

**Yes, with the Restructure proposal framing this more cleanly.**

The evidence is strong:
- `selection-mask.spec.ts` contains a closed test suite followed by orphaned content.
- `keyboard-shortcuts.spec.ts` contains a large corrupted preamble before valid imports/tests.

Deleting corrupted historical fragments and replacing them with smaller current-flow specs is exactly aligned with project priorities. No broader Playwright framework redesign is justified by current evidence.

### 6) Is a wave-plan extension required before implementation?

**Yes.**

`architecture-audit/wave-plan.md` ends at Wave 013. The current codebase still has meaningful remaining architectural/correctness work because mandatory validation gates are red. Therefore the project should continue, but only through a reviewed Wave 014 plan extension before any implementation starts.

## Decision guidance

If corrected, prefer **Proposal Restructure** as the Wave 014 entry, with a tightened scope guard that says:
- the wave is limited to the currently red validation surfaces and narrow recurrence checks,
- the intersection item must remain a contract-alignment task unless scope-check evidence proves a deeper domain redesign is required, in which case implementation must stop and trigger a reviewed plan edit,
- no broad validation framework, custom runner, or parallel toolchain may be introduced,
- Playwright MCP/live behavioral verification is mandatory because the wave touches frontend/user-observable behavior.

## Blocking issues to correct in-place before decision

1. Add an explicit requirement in the chosen proposal that **intersection contract work must begin with an audited caller inventory and selected contract statement** (nullable result vs infeasible realization vs discriminated result), and that any need for a deeper geometric/domain redesign triggers a reviewed plan-edit mini-cycle instead of being absorbed into Wave 014.
2. Add an explicit requirement that **Playwright MCP/live preview behavioral verification** will be run after the suite is repaired/replaced, because the wave changes frontend/user-observable validation surfaces.
3. Tighten the scope guard so the wave **forbids broad validation-framework redesign, generalized allowlists, or parallel build/test toolchains**; only narrow recurrence checks for the exact invalid artifact classes are allowed.

