# Wave 007 Review — Round 02

## Inputs reviewed

- `architecture-audit/wave-plan.md` (Wave 007 entry)
- `architecture-audit/cycle-007-2d-rendering-selectors-adapters/scope-check.md`
- `architecture-audit/cycle-007-2d-rendering-selectors-adapters/reviews/round-01-review.md`
- `architecture-audit/cycle-007-2d-rendering-selectors-adapters/corrections-round-01-note.md`
- `architecture-audit/cycle-007-2d-rendering-selectors-adapters/proposals/proposal-direct.md`
- `architecture-audit/cycle-007-2d-rendering-selectors-adapters/proposals/proposal-restructure.md`

## Round-01 blocker disposition

### Blocker 1 — Hit-testing extraction under-specified for non-point/non-circle cases

**Disposition: RESOLVED**

The correction note maps this blocker to explicit proposal edits, and the corrected proposals now state the required parity obligations clearly:

- **Proposal Direct** now requires `HitItem2D` discriminants and `PaperHitQuery` parity for points, infinite lines, finite segments, guides, sibling guides, hinge lines, half-hinge lines, circles, active-plane filtering, selection-mask filtering, closest-element priority, and snap-point output.
- **Proposal Restructure** now mirrors the same parity in `CanvasQueryItem` / `CanvasInteractionQuery`, including finite-segment finiteness and active-plane realization semantics for guide/hinge pickability.
- Both proposals now require focused tests for finite segment endpoint/interior/outside misses, guide/sibling-guide hits, hinge/half-hinge hits, active-plane filtering, masks, and snap behavior.

This is now specific enough for an implementation decision and no longer leaves the non-point/non-circle cases ambiguous.

### Blocker 2 — Grid responsibility ambiguous in Proposal Direct

**Disposition: RESOLVED**

Proposal Direct now makes `gridModel` and `labelModel` required members of `Canvas2DViewModel`, explicitly states that grid/label extraction is in Wave 007 scope, and requires `SvgCanvas.vue` to consume selector-produced grid/label output rather than owning active-plane grid realization.

Proposal Restructure was already closer on this point and is now also explicit that grid/label extraction is non-deferred Wave 007 scope. The round-01 ambiguity is therefore removed for both proposals.

### Blocker 3 — Validation plans lacked explicit architectural boundary assertions

**Disposition: RESOLVED**

Both proposals now require explicit post-implementation boundary/deletion checks covering the critical acceptance points:

- `RenderService.ts` deletion or proof of complete non-use before wave completion, with deletion preferred.
- Renderer adapters forbidden from importing `World`, projection-plane classes, concrete domain element classes, or realization types.
- `SvgCanvas.vue` forbidden from retaining `PrimitiveContext`, direct `paperService.generatePrimitives(...)`, direct `Paper.hitTest(... world ...)`, or component-owned grid realization.
- `Paper.ts`, if retained, forbidden from importing `World` or performing raw realization traversal.
- Obsolete TODO/debug/duplicate branches required to be deleted rather than hidden behind compatibility paths.

These checks are now concrete enough to enforce the intended architectural boundary rather than relying only on behavior tests.

## Updated scorecard

The round-01 comparative scoring still broadly stands. The substantive change is that the previously blocking underspecification is now corrected in both proposals.

### Proposal Direct

1. **Advances target outcome:** **8/10**  
   Now clearly includes render, hit, grid, and label extraction rather than leaving a meaningful canvas leak behind.

2. **Improves architecture / code quality:** **8/10**  
   Stronger than round 01 because boundary assertions and delete-first expectations are now explicit.

3. **Respects no-backcompat / aggressive deletion priorities:** **8/10**  
   Still good: delete `RenderService.ts`, old `Paper.hitTest(world, ...)`, duplicate raw-domain branches, debug logs, and obsolete TODO paths.

4. **Avoids overfeaturism:** **7/10**  
   Still somewhat broader than a pure renderer refactor, but remains within Wave 007 after the grid/hit clarifications.

5. **Introduced risks / hidden regressions:** **7/10**  
   Risk is now mostly execution complexity rather than proposal ambiguity.

6. **Validation sufficiency:** **8/10**  
   Now materially improved because the proposal names both focused behavior tests and static architecture checks.

### Proposal Restructure

1. **Advances target outcome:** **9/10**  
   Still the cleanest match to the actual leak surface across render, grid, hit, snap, and properties reads.

2. **Improves architecture / code quality:** **9/10**  
   Best proposal for establishing a coherent canvas presentation read boundary instead of a narrower render-only extraction.

3. **Respects no-backcompat / aggressive deletion priorities:** **8/10**  
   Delete-first stance remains explicit and aligned with project priorities.

4. **Avoids overfeaturism:** **7/10**  
   Slightly improved from round 01 because the proposal now states the boundary more crisply and continues to exclude app-shell and 3D scene work.

5. **Introduced risks / hidden regressions:** **7/10**  
   Still larger in scope than Proposal Direct, but the execution risk is now balanced by the cleaner target architecture.

6. **Validation sufficiency:** **8/10**  
   Now includes the same explicit boundary checks and focused interaction/grid coverage needed for an honest implementation gate.

## Acceptance-criteria check

- **Review explicitly checks each round-01 blocker against the correction note and corrected proposals:** Yes.
- **Hit-testing semantics for non-point/non-circle cases:** Now explicit in both proposals.
- **Grid/label extraction:** Now explicit in both proposals and no longer deferred.
- **Architecture boundary assertions:** Now explicit in both proposals.
- **`RenderService.ts` deletion/replacement:** Explicitly covered.
- **Wave 008 exclusion:** Both proposals continue to exclude `ThreeView.vue` / 3D scene-adapter refactoring, limiting scope to current projected-3D-on-2D read output where relevant.
- **Decision readiness:** Yes. Either proposal can proceed to decision; Proposal Restructure remains the better architectural recommendation.

## Residual risks accepted if proceeding

- Proposal Restructure is still a somewhat larger one-cycle change than Proposal Direct; implementation discipline must prevent drift into Wave 008 or Wave 009 concerns.
- Proposal Direct remains more vulnerable to becoming a renamed selector god-module if the implementation does not actually split traversal, style, visibility, grid, and query responsibilities into focused modules.
- Full-suite/e2e instability may still limit confidence, so focused selector/query tests plus live Playwright smoke remain important evidence requirements.

## Recommendation

**NO BLOCKING ISSUES**

Recommend proceeding to decision with **Proposal Restructure** as the preferred implementation path. It still best matches the actual architectural leak by placing rendering, grid/labels, hit/snap/properties queries, style, and visibility behind one coherent canvas-presentation read boundary while explicitly excluding Wave 008 `ThreeView.vue` scene-adapter refactoring and Wave 009 app-shell extraction.

Proposal Direct is now also implementation-ready as a fallback, because the grid/label scope, hit-testing parity contract, and boundary validations have been corrected to review-grade specificity.
