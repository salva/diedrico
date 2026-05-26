# Wave 007 Corrections Round 01 Note

**Stage:** `cycle-007-corrections-round-01`  
**Task:** `t1-correct-wave-007-proposals`  
**Review source:** `architecture-audit/cycle-007-2d-rendering-selectors-adapters/reviews/round-01-review.md`

No application source files were changed. This correction edits only Wave 007 proposal artifacts so review round 02 can judge an implementation-ready proposal set.

## Blocker-to-edit mapping

### Blocking issue 1 — Hit-testing extraction under-specified for non-point/non-circle cases

**Reviewer requirement:** Preserve current semantics for points, infinite lines, finite segments, guides/sibling guides, hinge/half-hinge line paths, circles, active-plane filtering, selection-mask filtering, and snap-point output; add focused tests for these cases.

**Edits made:**

- `proposals/proposal-direct.md` now requires `RenderItem2D`/`HitItem2D` discriminants for finite segments, guides, sibling guides, hinge lines, half-hinge lines, and circles instead of generic line-like collapse.
- `proposals/proposal-direct.md` now defines `PaperHitQuery` parity obligations for finite segment distance checks, active-plane realization semantics for guide/hinge pickability, selection masks, closest-element priority, and snap-point output.
- `proposals/proposal-direct.md` focused tests now explicitly cover finite segment endpoint/interior/outside misses, guide/sibling-guide hits, hinge/half-hinge hits, active-plane filtering, masks, and snap points.
- `proposals/proposal-restructure.md` now mirrors the same contract in `CanvasPresentationModel` and `CanvasInteractionQuery`, including explicit snap-output DTOs and focused selector/query tests.

### Blocking issue 2 — Grid responsibility ambiguous in Proposal Direct

**Reviewer requirement:** Proposal Direct must include grid/label read-model extraction or give review-grade evidence for deferral; reviewer favored inclusion.

**Edits made:**

- `proposals/proposal-direct.md` now makes `gridModel` and `labelModel` required parts of `Canvas2DViewModel`, not optional residuals.
- `proposals/proposal-direct.md` now states grid/label extraction is in Wave 007 scope because the scope check identifies active-plane grid realization in `SvgCanvas.vue` as a raw-domain canvas read leak.
- `proposals/proposal-direct.md` now requires `SvgCanvas.vue` to consume selector-produced grid/label output and forbids component-owned active-plane grid realization in static boundary scans.
- `proposals/proposal-restructure.md` already included `CanvasGridSelector`; it was tightened to make grid/label extraction explicitly non-deferred.

### Blocking issue 3 — Validation plans need explicit architectural boundary assertions

**Reviewer requirement:** Add post-implementation checks for `RenderService.ts` deletion/unused state, renderer adapter import boundaries, removal of `PrimitiveContext`/`generatePrimitives`/`Paper.hitTest(world)` from `SvgCanvas.vue`, and `Paper.ts` no longer importing `World` if retained.

**Edits made:**

- `proposals/proposal-direct.md` validation now requires static deletion/boundary scans proving:
  - `RenderService.ts` is deleted or fully unused before wave completion, with deletion preferred;
  - renderer adapters do not import `World`, projection-plane classes, concrete domain element classes, or realization types;
  - `SvgCanvas.vue` no longer constructs `PrimitiveContext`, calls `paperService.generatePrimitives(context)`, calls `Paper.hitTest(... world ...)`, or owns grid realization;
  - `Paper.ts`, if retained, no longer imports `World` or raw domain types and performs no realization traversal;
  - obsolete TODO/debug/duplicate branches are deleted rather than hidden behind compatibility shims.
- `proposals/proposal-restructure.md` validation now includes the same boundary assertions for the canvas-presentation path and explicitly confines raw-domain imports to selector/query modules.

## Recommendation readiness

The corrected set keeps Proposal Restructure as the recommended path because it matches the reviewer’s preferred higher-level read boundary for rendering, grid, hit/snap/properties, style, and visibility. Proposal Direct is also corrected enough for comparison because it now includes grid/label extraction and an explicit hit-query parity contract. Both proposals continue to avoid premature Wave 008 `ThreeView.vue` scene-adapter work and maintain the no-backcompat/delete-first priorities for `RenderService.ts`, old `Paper.hitTest(world)` behavior, obsolete rendering TODOs, duplicate render special cases, and compatibility shims.
