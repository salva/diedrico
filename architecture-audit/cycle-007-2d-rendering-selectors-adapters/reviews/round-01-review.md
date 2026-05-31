# Wave 007 Review — Round 01

## Inputs reviewed

- `architecture-audit/wave-plan.md` (Wave 007 entry)
- `architecture-audit/cycle-007-2d-rendering-selectors-adapters/scope-check.md`
- `architecture-audit/cycle-007-2d-rendering-selectors-adapters/proposals/proposal-direct.md`
- `architecture-audit/cycle-007-2d-rendering-selectors-adapters/proposals/proposal-restructure.md`
- `frontend/src/services/PaperService.ts`
- `frontend/src/services/SVGRenderer.ts`
- `frontend/src/services/RenderService.ts`
- `frontend/src/components/workspace/SvgCanvas.vue`
- `frontend/src/domain/presentation/Paper.ts`

## Scorecard

### Proposal Direct

1. **Advances target outcome:** **8/10**  
   Clearly targets the Wave 007 outcome by moving domain traversal, style/visibility resolution, projected-3D inclusion, and hit-test geometry into explicit selector/query DTOs while shrinking `PaperService`/`SVGRenderer` toward adapter roles.

2. **Improves architecture / code quality:** **8/10**  
   The split between selector DTOs, visibility/style policy, hit query, and adapters is directionally strong and directly addresses `PaperService` and `Paper.ts` raw-domain leakage. It also calls for reducing `SvgCanvas.vue` responsibilities rather than only renaming services.

3. **Respects no-backcompat / aggressive deletion priorities:** **8/10**  
   Correctly proposes deleting `RenderService.ts`, `Paper.hitTest(..., world, ...)`, obsolete TODO branches, debug logs, and duplicate special cases instead of preserving shims.

4. **Avoids overfeaturism:** **7/10**  
   Mostly yes, but it risks becoming broad because it introduces several new modules plus both render and hit-query DTO layers. Still within wave scope if kept disciplined.

5. **Introduced risks / hidden regressions:** **6/10**  
   Main risk is underspecification around segment/guide/hinge hit behavior and around whether active-plane grid extraction is in or out. The proposal mentions hit/query DTOs, but not enough implementation detail to ensure current `Paper.hitTest()` semantics survive.

6. **Validation sufficiency:** **7/10**  
   Good focused coverage intent and deletion scans, plus mandatory lint/build/full test/e2e cadence. Needs stronger explicit coverage for guide/segment/hinge hit testing and for raw-domain import boundary assertions.

### Proposal Restructure

1. **Advances target outcome:** **9/10**  
   It addresses the actual larger leak: not just rendering primitives, but the whole 2D canvas read path (grid, hit, snap, properties, rendering) consuming raw domain state.

2. **Improves architecture / code quality:** **9/10**  
   The canvas presentation read-model boundary is conceptually cleaner than a render-only selector and better matches the evidence in `SvgCanvas.vue`, `PaperService.ts`, and `Paper.ts`.

3. **Respects no-backcompat / aggressive deletion priorities:** **8/10**  
   Also proposes deleting `RenderService.ts`, `Paper.hitTest(world, ...)`, direct canvas grid realization, debug logs, and obsolete TODO branches without compatibility layers.

4. **Avoids overfeaturism:** **6/10**  
   This is the main trade-off: it is cleaner, but larger. It is still within Wave 007 if kept read-only and does not drift into app-shell or 3D work.

5. **Introduced risks / hidden regressions:** **7/10**  
   Better at preventing selector/query drift than Proposal Direct, but the broader scope raises execution risk for one cycle unless the model stays tightly focused on current 2D canvas needs.

6. **Validation sufficiency:** **7/10**  
   Similar strengths to Proposal Direct, but it also needs explicit boundary checks proving `SvgCanvas.vue` no longer performs raw world traversal for hit/grid/render paths and that `Paper.ts` no longer imports `World` if retained.

## Acceptance-criteria check

- **Cites required inputs:** Yes.
- **Checks Paper hit testing / query DTO extraction:** Yes. This is a blocker area because `Paper.hitTest()` currently owns active-plane filtering, selection-mask matching, and geometry realization through raw `World`/plane access in `frontend/src/domain/presentation/Paper.ts`.
- **Checks `RenderService.ts` deletion/replacement:** Yes. Both proposals appropriately treat it as a delete-first target because it is explicitly test-only in production comments.
- **Checks `SVGRenderer` / `PaperService` adapter boundaries:** Yes. Both proposals move them in the right direction, with the restructure proposal giving the cleaner separation.
- **Checks `SvgCanvas.vue` raw-domain access reduction:** Yes. The restructure proposal handles this more completely because it includes grid/hit/snap/properties reads, not just primitive generation.
- **Checks style/visibility selector responsibilities:** Yes. Both proposals move style/visibility decisions out of adapter code, which is required.
- **Checks no-backcompat deletion targets:** Partially. Both proposals identify the main deletions, but they should explicitly require deletion of test-only production rendering helpers, obsolete rendering TODO branches, duplicate render special cases, and any obsolete tests rather than “rewrite if needed” ambiguity.
- **Checks Wave 006a/006b boundary:** Yes. Neither proposal should reintroduce command-construction responsibilities; both correctly treat style changes as continuing through Wave 006a boundaries.
- **Checks Wave 008 boundary:** Yes. Both avoid pulling `ThreeView.vue` scene-adapter work into this wave, though the direct proposal should be clearer that projected 3D-on-2D output is read-model scope only, not 3D renderer refactoring.

## Blocking issues

### 1. Hit-testing extraction is still under-specified for non-point/non-circle cases

Current behavior in `frontend/src/domain/presentation/Paper.ts` is not just generic hit testing; it carries active-plane filtering, selection-mask filtering, and line-like behavior across lines, guides, hinge-line subclasses, and segments through active-plane realizations. Both proposals say they will replace `Paper.hitTest(..., world, ...)`, but neither proposal is explicit enough about preserving **segment-specific finite hit behavior** and the current **line-like subtype handling**.

Required correction:

- Edit the chosen proposal to explicitly state that the replacement query layer must preserve current hit semantics for:
  - points,
  - infinite lines,
  - finite segments,
  - guides/sibling guides,
  - hinge/half-hinge line paths as currently pickable,
  - circles,
  - active-plane filtering,
  - selection-mask filtering,
  - snap-point output.
- The validation plan must name focused tests for these cases, not only generic “hit query” coverage.

### 2. Grid responsibility is ambiguous in Proposal Direct

The scope check identifies active-plane grid computations in `SvgCanvas.vue` as remaining raw-domain reads. Proposal Direct says the selector may include an optional `gridModel` and that grid extraction could be deferred as a residual, but the Wave 007 acceptance criteria specifically require reducing raw-domain canvas access in the 2D rendering path. Leaving grid/domain realization in `SvgCanvas.vue` would preserve a significant canvas read leak.

Required correction:

- Proposal Direct must be edited to either:
  - include grid/label read-model extraction in Wave 007, or
  - justify with specific evidence why grid is intentionally deferred without violating the wave target.
- As written, the cleaner and safer correction is to include grid extraction in Wave 007.

### 3. Validation plans need explicit boundary assertions, not only behavior tests

Both proposals describe focused tests and the mandatory validation cadence, but neither explicitly requires architectural checks that enforce the intended boundary after implementation. Given the project’s priorities, behavior-only validation is insufficient.

Required correction:

- Add explicit post-implementation checks that verify:
  - `RenderService.ts` is deleted or fully unused,
  - renderer adapter modules do not import `World`, projection-plane classes, or concrete domain element classes,
  - `SvgCanvas.vue` no longer constructs `PrimitiveContext`, calls `paperService.generatePrimitives(context)`, or calls `Paper.hitTest(..., world, ...)`,
  - if `Paper.ts` remains, it no longer imports `World` or performs raw realization traversal.

## Non-blocking observations

- Proposal Restructure is the stronger recommendation because it matches the actual leak surface evidenced in `SvgCanvas.vue` and `Paper.ts`, not only `PaperService.ts`.
- Proposal Direct could still pass after correction if it is tightened to include grid extraction and a more explicit hit-query contract.
- Both proposals correctly avoid reopening Wave 006a/006b command-intent work and correctly avoid premature Wave 008 `ThreeView.vue` extraction.

## Recommendation

**BLOCKING ISSUES**

Recommend **Proposal Restructure** after in-place edits to address the blocker details above. It is architecturally cleaner because it extracts a single canvas presentation read boundary for rendering, grid, hit/snap/properties queries, and style/visibility outputs. If the Manager prefers Proposal Direct for scope control, it must be corrected to include grid extraction and an explicit hit-query parity plan before decision.
