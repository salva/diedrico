# Wave 005 Review — Round 02

**Cycle:** `cycle-005-process-tree-dependency-ownership`  
**Stage:** `cycle-005-review-round-02`  
**Reviewer:** primary reviewer  
**Artifacts reviewed:** `reviews/round-01-review.md`, `corrections-round-01.md`, `proposals/proposal-direct.md`, `proposals/proposal-restructure.md`, `scope-check.md`.

## Overall verdict

**NO BLOCKING ISSUES**

The round-01 blockers were substantively resolved. **Proposal Direct is now implementation-ready for decision** and remains the correct Wave 005 path. It now cleanly absorbs deletion of the deprecated `DependencyService` compatibility shims into the same ownership cleanup, explicitly defers broad `ActionsPanel` use-case extraction to Wave 006, and tightens validation around deletion-cascade/dependency registration after shim removal.

Proposal Restructure is also corrected as a decision-context artifact: it no longer tries to force the `ActionsPanel` extraction into Wave 005 and clearly presents that broader seam as Wave 006 material unless scope is intentionally expanded.

## Round-01 blocker disposition

### 1) Proposal Direct must absorb `DependencyService` shim deletion

**Status: RESOLVED**

Evidence in corrected Proposal Direct:

- Summary now states Wave 005 deletes the remaining `DependencyService` process-era compatibility shims.
- Target outcome explicitly requires deletion of `DependencyService.rebuildDependencyMaps()` and `DependencyService.getActionDependencies()` with no aliases/stubs/wrappers left behind.
- `frontend/src/domain/world/DependencyService.ts` is now an explicit file-to-change with both methods listed for deletion.
- Test rewrite scope now explicitly removes `rebuildDependencyMaps()` fixture shortcuts and requires real dependency registration instead.
- Explicit DELETE list includes both deprecated `DependencyService` methods and stale call sites/helpers.

This closes the round-01 gap between the claimed single dependency boundary and the actual proposed deletions.

### 2) Proposal Direct must explicitly defer broad `ActionsPanel` use-case extraction to Wave 006

**Status: RESOLVED**

Evidence in corrected Proposal Direct:

- New `Explicit Wave 006 deferral` section says Wave 005 does not extract broad process-history use-cases from `ActionsPanel.vue`.
- UI section allows only narrow `ActionsPanel.vue` edits for compile fallout, misleading dependency comments, or debug/noisy logging cleanup.
- Proposal explicitly states any new `frontend/src/application/processTree/*UseCases.ts` module would be a scope deviation requiring a mini-cycle.
- Validation now includes a static check intended to catch accidental Wave 006 pull-forward.

This matches the round-01 review recommendation and the stage acceptance criterion requiring Wave 006 deferral of broad ActionsPanel use-case extraction.

### 3) Proposal Restructure must narrow or mark the `ActionsPanel` extraction as rejected for this wave

**Status: RESOLVED**

Evidence in corrected Proposal Restructure:

- The proposal is now explicitly framed as a **rejected alternative for Wave 005 implementation**.
- It contains a dedicated section explaining why the use-case extraction is too broad for Wave 005.
- It preserves the conceptual design only as Wave 006 input.
- Validation expectations now distinguish between the corrected Proposal Direct path (operation imports may remain) and the broader alternative (operation imports must disappear only if intentionally selected).

This is sufficient for decision-stage context without destabilizing wave boundaries.

### 4) Both proposals must tighten validation around dependency-shim deletion

**Status: RESOLVED**

Evidence in corrected proposals:

- Both proposals now include explicit static deletion checks for `rebuildDependencyMaps()` and `getActionDependencies()` across source/tests.
- Proposal Direct now names focused dependency/deletion tests and requires dependency-service graph validation around real registration/query behavior.
- Both proposals retain the full mandatory validation cadence, including e2e/preview obligations.

This resolves the earlier evidence gap around proving no caller still depends on the deleted compatibility methods.

## Reassessment against the six required criteria

Round-01 scoring still stands in substance, with the following updated disposition:

1. **Advances the wave target outcome:** Proposal Direct remains **5/5**. It now fully matches the target by removing both deprecated process-tree APIs and the dependency-service compatibility residue.
2. **Improves architecture and code quality:** Proposal Direct increases from **4/5 to 5/5** because it no longer preserves the deprecated dependency shims.
3. **Respects no-backcompat / aggressive deletion priorities:** Proposal Direct increases from **3/5 to 5/5** because the deletion list now includes the full deprecated compatibility surface called out in round 01.
4. **Avoids overfeaturism:** Proposal Direct remains **5/5** because it preserves Wave 005 focus and explicitly rejects premature ActionsPanel seam extraction.
5. **Avoids introduced risks / hidden regressions:** Proposal Direct remains **4/5**. The main remaining risk is test-rewrite quality, not proposal scope ambiguity.
6. **Validation sufficiency:** Proposal Direct increases from **3/5 to 4/5** because deletion-cascade/dependency-registration checks are now explicitly named. Remaining validation risk is repository-wide debt, which must be logged honestly during implementation rather than solved in proposal text.

## Decision recommendation

**Proceed to decision with Proposal Direct.**

The corrected direct proposal now gives Wave 005 a clean, appropriately scoped implementation target:

- delete `ProcessTree.addAction()`;
- delete `World.addAction()`;
- delete `ProcessTree.getActionsDependingOnElement()`;
- delete `DependencyService.rebuildDependencyMaps()`;
- delete `DependencyService.getActionDependencies()`;
- delete obsolete implicit-group/dependency-shim tests and setup shortcuts;
- preserve `ActionsPanel.vue` broad command/use-case extraction for Wave 006.

## Accepted residual risks

These are acceptable for decision and implementation, not blockers:

- Test rewrites could accidentally weaken coverage if they replace deleted shortcuts with poor fixtures rather than explicit public APIs.
- Some deletion/factory tests may expose hidden reliance on rebuild semantics; implementation must repair real dependency registration paths rather than restoring compatibility shims.
- `ActionsPanel.vue` remains a known cross-layer leak after Wave 005, but that is an intentional Wave 006 residual and is now honestly disclosed.
- Existing repo-wide lint/build/e2e debt may still affect validation outcomes; implementation must capture and classify failures precisely.
