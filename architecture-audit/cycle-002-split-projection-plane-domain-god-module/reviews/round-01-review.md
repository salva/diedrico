# Round-01 Review — Wave 002: Split the projection-plane domain god-module

**Reviewer:** reviewer (primary, round 01)
**Stage:** cycle-002-review-round-01
**Date:** 2026-05-25
**Proposals reviewed:**
- `architecture-audit/cycle-002-split-projection-plane-domain-god-module/proposals/proposal-direct.md`
- `architecture-audit/cycle-002-split-projection-plane-domain-god-module/proposals/proposal-restructure.md`

**Supporting evidence consulted:**
- `architecture-audit/cycle-002-split-projection-plane-domain-god-module/scope-check.md`
- `architecture-audit/wave-plan.md`
- `architecture-audit/cycle-001-invert-world-application-boundary/implementation-log.md`
- Direct source inspection: `frontend/src/domain/world/ProjectionPlane.ts` (1,797 lines confirmed)
- Import surface grep of `frontend/src` and `frontend/tests`
- `any` signature grep on `ProjectionPlane.ts`
- `console.log` grep on `ProjectionPlane.ts` and `AddAuxiliaryProjectionPlaneOp.ts`
- Construction helper call-site surface count
- `BaseProjectionPlane` export and test-import verification

---

## Criterion 1: Does it advance the wave's target outcome?

**Wave 002 target outcome** (from wave-plan.md): "Projection-plane responsibilities are separated into small domain modules with stable imports: realization value types, base plane abstraction, fixed projection planes, auxiliary projection planes, and element collection/ownership helpers. The split should reduce accidental coupling without changing the geometric model."

**Proposal Direct — Score: STRONG**

The direct proposal addresses every component of the target outcome:
- Realization value types → `ProjectionPlaneRealization.ts` ✓
- Base plane abstraction → `ProjectionPlane.ts` ✓
- Fixed projection planes → `FixedProjectionPlane.ts` ✓
- Auxiliary projection planes → `AuxiliaryProjectionPlane.ts` ✓
- Element collection/ownership helpers → `ProjectionPlaneElementStore.ts` ✓
- Typed context contracts replacing `any` → `ProjectionPlaneContext.ts` ✓
- Construction helpers → `ProjectionPlaneConstruction.ts` (conditional, only if base module stays too large) ✓

The scope is bounded to the Wave 002 target and does not expand into later wave territory.

**Proposal Restructure — Score: GOOD with CAVEAT**

The restructure proposal achieves the physical split AND additionally moves construction helpers into a separate `PlaneElementConstructionService`. This advances the target outcome further in one dimension — it prevents the base module from remaining a construction god-module — but the proposal itself acknowledges the call-site surface is likely too large for one cycle (732 broad helper-call matches per the scout grep). The proposal correctly recommends falling back to Proposal Direct unless the surface proves manageable, which is a responsible self-assessment.

**Finding:** Both proposals advance the wave target. The restructure goes further but at scope risk.

---

## Criterion 2: Does it improve architecture and code quality?

**Proposal Direct — Score: GOOD**

Positive:
- Eliminates the 1,797-line god-module by splitting into ~7 focused files.
- Replaces 6 `any` realization-context signatures with typed `ProjectionPlaneRealizationContext` and `ProjectionPlaneMutationContext` interfaces. Verified: lines 1428, 1436, 1578, 1600, 1689, 1747 all use `any` today.
- Deletes debug `console.log` noise: 7 instances in `AuxiliaryProjectionPlane.realize3D/realize2D` (lines 1694–1719, 1763) and 5 instances in `AddAuxiliaryProjectionPlaneOp.ts` (lines 112–123). Verified present in source.
- Deletes the "Dual storage period" migration comment (line 170). Verified present.
- Extracts element store/caches, which currently live as private fields in the abstract base class (lines 176–198). Verified.
- The `ProjectionPlaneElementStore` delegation pattern preserves the public API while allowing internal cleanup.

Concern:
- The `ProjectionPlaneConstruction.ts` file is described as "optional" — if the construction helpers (24 methods taking `world: import('./World').World`) remain on the base class, the resulting `ProjectionPlane.ts` will still be large and will still couple to `World` through construction helpers. The proposal acknowledges this but the conditional language ("only if keeping construction helper methods as prototype methods would leave the base module too large") is vague about the threshold. **This is a non-blocking concern because the wave plan explicitly says "guide/intersection construction helpers only where necessary to preserve a clean split" — keeping them temporarily is acceptable if the base module is materially reduced.**

**Proposal Restructure — Score: STRONG (if feasible)**

Positive:
- Achieves all of Proposal Direct's improvements plus removes construction helper methods from the plane entity entirely.
- Introduces a clean entity vs. workflow separation — planes own state, services own construction workflows.
- Eliminates optional `world?: World` side-effect parameters from add/remove methods, which are currently a domain-to-World coupling smell (6 such parameters verified at lines 244, 292, 329, 357, 395, 423).
- Clear dependency-direction criterion for placing the construction service.

Concern:
- 24 methods with `world: import('./World').World` parameters plus 6 optional `world?: World` parameters = 30 method signatures that must change. The call-site surface is 732+ matches (34 source, 698 test). This is very large for one cycle.

---

## Criterion 3: Does it respect no-backcompat / aggressive-deletion priorities?

**Proposal Direct — Score: STRONG**

- Explicitly deletes the monolith file with no compatibility barrel.
- Deletes `any` signatures.
- Deletes `BaseProjectionPlane` test imports (which are stale — `BaseProjectionPlane` is NOT an exported class, only appears in comments at lines 1621, 1628, but is imported in 4 test files). Verified.
- Deletes debug logging.
- Deletes "Dual storage period" obsolete comments.
- No wrappers, no shims, no re-export barrels.

**Proposal Restructure — Score: STRONG**

- All of Proposal Direct's deletions.
- Additionally deletes construction helper methods from the plane entity.
- Explicitly rejects wrapper methods on `ProjectionPlane` that forward to the service.
- Offers a mini-split fallback (002a + 002b) if the surface is too large, which requires a reviewed wave-plan edit — this is the correct process for scope expansion rather than偷偷 squeezing it in.

---

## Criterion 4: Does it avoid overfeaturism?

**Proposal Direct — Score: STRONG**

The proposal does exactly what the wave plan asks — split the god-module and type the realization contexts. It does not attempt to redesign the domain model, command architecture, or persistence layer. The `ProjectionPlaneElementStore` is a delegation helper, not a new abstraction — it extracts existing private fields into a focused class. The conditional `ProjectionPlaneConstruction.ts` is a reasonable escape valve, not feature creep.

**Proposal Restructure — Score: MODERATE**

The construction-service extraction is architecturally sound but goes beyond what the wave plan targets. The wave plan says "guide/intersection construction helpers only where necessary to preserve a clean split" — it does not ask for a full service extraction. The proposal itself acknowledges this risk and recommends the direct path unless the call surface is manageable. This is self-correcting but the proposal as written proposes a larger scope than the wave plan requires.

---

## Criterion 5: Does it introduce new risks or hidden regressions?

**Proposal Direct — Score: LOW RISK, with one WARNING**

Risks identified and adequately mitigated:
1. Construction helper extraction risk — mitigated by delegation-first approach and focused test coverage.
2. Context narrowing risk — mitigated by structural typing from actual `World` method usage.
3. Test drift risk — `BaseProjectionPlane` is already broken (imports a non-existent export). The proposal addresses this. Verified: `BaseProjectionPlane` appears in tests at `paperService.spec.ts:13`, `coordinateTransform.spec.ts:9,21`, `projectionPlane.spec.ts:9,182,183` but is NOT an exported class in `ProjectionPlane.ts`.
4. Import churn risk — bounded consumer surface verified (World.ts, AddAuxiliaryProjectionPlaneOp.ts, ThreeView.vue, descriptors, ToolArgumentCollector.ts, Element2DRenderer3D.ts, test files).

**WARNING W1:** The `ProjectionPlaneMutationContext` interface proposed in `ProjectionPlaneContext.ts` includes `getDependencyService(): DependencyRegistrar` and `markDirty(): void`. The current code uses `world?.markDirty()` and `world?.dependencyService` inside add/remove methods. These side effects are the exact coupling that makes `world?: World` parameters a smell. However, the direct proposal's approach of keeping these side effects on the plane's add/remove methods (just with a narrower context parameter instead of `world?: World`) still means the plane entity performs mutation side effects during collection operations. This is a legitimate design choice for Wave 002 (the wave plan does not ask to eliminate all side effects, only to split the module), but it should be explicitly acknowledged as a residual smell that a future wave may address. The proposal's `ProjectionPlaneMutationContext` is a stepping stone, not a full decoupling. **This is a non-blocking warning.**

**Proposal Restructure — Score: MODERATE RISK**

All of Proposal Direct's risks, plus:
1. **Scope risk** — 732+ call-site matches is very large. Even with aggressive test rewriting, this could overflow one cycle.
2. **Behavior regression risk** — construction helpers encode ID generation, label generation, dependency registration ordering, and sibling creation logic. Moving 24 methods plus their call sites introduces a higher probability of subtle regressions.
3. **Layering ambiguity** — the proposal correctly flags that the construction service could end up under `domain` or `application` depending on dependencies, but this decision is deferred to implementation. If it imports command infrastructure during implementation, it would violate the Wave 001 boundary.

---

## Criterion 6: Is the proposed validation sufficient?

**Proposal Direct — Score: ADEQUATE**

The validation plan covers:
- Pre/post grep for old import paths ✓
- Grep for `any` in realization signatures ✓
- File-deletion check ✓
- Focused Vitest covering projectionPlane, coordinateTransform, realizationCache, worldInitialization, initializationOps, guide/intersection factories ✓
- Full mandatory cadence (lint, focused, full, build, e2e, preview) ✓

**Gap:** The validation plan does not explicitly call out testing the `ProjectionPlaneElementStore` extraction in isolation (e.g., verifying that add/remove/delegation still works after store extraction). This should be added during implementation. **Non-blocking — implementation can add a focused store test.**

**Proposal Restructure — Score: ADEQUATE with one ADDITION NEEDED**

The restructure validation adds a pre-implementation sizing check (grep for construction helper call sites) which is critical for the go/no-go decision. However, it should also include:
- A test for the `PlaneElementConstructionService` in isolation, proving ID/label/dependency registration ordering is preserved.
- The proposal mentions "If auxiliary-plane tests exist or are added, run them explicitly; otherwise add focused coverage" — this is good but should be stronger: at minimum one focused test for `AuxiliaryProjectionPlane.realize2D/realize3D` with a typed context should be added.

---

## Blocking Issues

**B1:** Both proposals reference deleting `BaseProjectionPlane` imports from tests, but the proposals describe it as "stale" without verifying whether the current test suite even passes with those imports. `BaseProjectionPlane` is NOT an exported symbol from `ProjectionPlane.ts` (verified: only appears in comments at lines 1621, 1628). This means test files at `paperService.spec.ts:13`, `coordinateTransform.spec.ts:9,21`, and `projectionPlane.spec.ts:9,182,183` are importing a symbol that does not exist. This is likely a pre-existing test breakage, not introduced by either proposal. However, **both proposals must explicitly state whether they assume these tests are currently passing or currently broken**, because the implementation plan depends on this: if the tests are already broken, the "update tests" step is a fix, not a migration; if they are somehow passing (e.g., via a type-level re-export or Vitest tolerance), the migration must preserve that behavior.

**Required correction:** Both proposals should add a one-line clarification about the current pass/fail state of the `BaseProjectionPlane` test imports. The implementation step 7 ("Update imports in World.ts, AddAuxiliaryProjectionPlaneOp.ts, type collectors, services, and tests") should explicitly call out replacing `BaseProjectionPlane` with the correct concrete class (likely `FixedProjectionPlane` based on the architecture, since P_H/P_V are fixed planes).

---

## Warnings

**W1 (Proposal Direct):** The `ProjectionPlaneMutationContext` approach keeps mutation side effects (dependency registration, dirty marking) inside the plane's add/remove methods, just with a narrower typed context instead of `world?: World`. This is a valid stepping stone for Wave 002 but leaves a coupling smell. Future waves should address making collection mutations side-effect-free or moving these workflows out of the entity. Not blocking — the wave plan does not require full decoupling in Wave 002.

**W2 (Proposal Restructure):** The scope is likely too large for one cycle. The proposal's own recommendation to fall back to Proposal Direct if the call-site surface is large is the correct call. However, if the restructure is selected, the implementation must include a wave-plan edit to split 002 into 002a (physical split + typed contexts) and 002b (construction service extraction) before proceeding. The proposal mentions this option but does not commit to it as a mandatory pre-condition.

**W3 (Both proposals):** Neither proposal addresses the 6 non-optional `world: import('./World').World` parameters on `realizePoint2D`, `realizeLine2D`, `realizeCircle2D`, and the `generateXxxId` methods (lines 465, 489, 513, 538, 546, 554, 562, 570). These are distinct from the abstract `realize2D(world: any)`/`realize3D(world: any)` signatures. The direct proposal's `ProjectionPlaneMutationContext` should cover these methods as well. The proposal text focuses on the abstract realization signatures but these per-element realization helpers also take `World` directly and should be included in the context narrowing.

---

## Verdict

**BLOCKING ISSUES — 1 blocking issue (B1)**

B1 requires both proposals to clarify the current state of `BaseProjectionPlane` test imports and specify the replacement class explicitly. This is a straightforward correction — add one paragraph to each proposal confirming the current test breakage state and naming the replacement class.

Once B1 is resolved through in-place proposal edits, the reviewer recommends **Proposal Direct** for Wave 002 implementation, with the following accepted residual items:
- W1 (mutation context as stepping stone) is accepted as a reasonable Wave 002 boundary.
- W3 (per-element realization helpers) should be addressed during implementation by including those methods in the `ProjectionPlaneMutationContext` or `ProjectionPlaneRealizationContext` as appropriate.

Proposal Restructure is architecturally superior but should be deferred to a later wave (002b or a new numbered wave) because the construction helper call-site surface (732+ matches) makes it too large for a single cycle without a wave-plan split.

---

## Score Summary

| Criterion | Proposal Direct | Proposal Restructure |
| --- | --- | --- |
| 1. Target outcome advancement | Strong | Good (with caveat) |
| 2. Architecture/code quality improvement | Good | Strong (if feasible) |
| 3. No-backcompat/aggressive deletion | Strong | Strong |
| 4. Avoidance of overfeaturism | Strong | Moderate |
| 5. New risks/hidden regressions | Low risk (W1, W3 warnings) | Moderate risk |
| 6. Validation sufficiency | Adequate (minor gap) | Adequate (one addition needed) |

**Recommended proposal after B1 resolution:** Proposal Direct
