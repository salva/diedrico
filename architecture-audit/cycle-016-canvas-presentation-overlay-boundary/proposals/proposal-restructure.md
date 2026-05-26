# Proposal Restructure — Unify presentation snapshots before touching overlay mechanics

## Summary

This intentionally broader alternative asks whether the direct fix is still too local. It is not the preferred implementation of the corrected Wave 016 entry unless review explicitly broadens that entry. Instead of only narrowing the current canvas selector, introduce a small application-owned presentation snapshot layer shared by 2D canvas and 3D presentation. The snapshot becomes the single input to 2D, projected-3D-on-2D, and 3D selectors. Overlay pointer behavior is then resolved against that explicit presentation/interaction ownership model.

## Files to change

- new `frontend/src/application/presentation/PresentationSnapshot.ts` or equivalent shared read-model module
- new `frontend/src/application/presentation/WorldPresentationSnapshotFactory.ts` or equivalent thin adapter from `World` to presentation input DTOs, with style/visibility/projection/interaction/rendering delegated as specified below
- `frontend/src/application/canvasPresentation/CanvasPresentationController.ts`
- `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts`
- `frontend/src/application/canvasPresentation/CanvasPresentationModel.ts`
- `frontend/src/application/canvasPresentation/CanvasInteractionQuery.ts`
- `frontend/src/application/threePresentation/ThreePresentationController.ts`
- `frontend/src/application/threePresentation/ThreePresentationSelector.ts`
- `frontend/src/application/threePresentation/ThreePresentationModel.ts`
- `frontend/src/rendering/threeView/*` only as consumers of the snapshot-derived model
- `frontend/src/components/workspace/SvgCanvas.vue`
- `frontend/src/components/panels/ThreeView.vue`
- `frontend/src/domain/presentation/Paper.ts`
- focused presentation snapshot/canvas/three tests

## Proposal-to-wave-plan relationship

This proposal is an intentionally broader alternative to the corrected Wave 016 entry. It may be selected only if review decides that a shared presentation snapshot is the required conceptual layer and explicitly accepts the larger 2D-plus-3D regression surface. If review keeps the Wave 016 scope bounded to canvas read ports, projected-3D canvas ownership, and overlay interaction, this proposal must be rejected or deferred to a later reviewed wave-plan edit rather than partially implemented.

## Delegated responsibilities and anti-god-module constraints

The proposed snapshot factory is allowed to adapt current `World`/projection-plane state into a presentation input DTO and nothing more. It must not become a rendering platform, policy registry, command facade, app-shell state container, persistence adapter, or interaction controller. Concrete boundaries:

- **Stays delegated to style modules:** selected/hovered/default styling remains owned by `CanvasStylePolicy` or existing three-style helpers; the snapshot may carry stable style inputs or identifiers, not compute every visual attribute.
- **Stays delegated to visibility modules:** plane/element visibility and mask decisions remain owned by `CanvasVisibilityPolicy` or focused three-presentation visibility helpers; the snapshot may expose source facts, not become the policy engine.
- **Stays delegated to projection modules:** projected-3D-on-2D conversion belongs in a named projection selector/adapter; the snapshot factory may collect needed source coordinates but must not inline all projection math and SVG/Three mapping rules.
- **Stays delegated to interaction modules:** hit testing, snapping, overlay pointer ownership, and click-region decisions remain in `CanvasInteractionQuery` and rendering/runtime overlay modules; the snapshot must not answer interaction queries directly.
- **Stays delegated to render adapters:** `SVGRenderer`, three-view rendering helpers, and DTO-to-primitive adapters remain responsible for render-specific output. The snapshot must not create SVG nodes, Three meshes, or `Paper` collections.
- **No command/app/persistence ownership:** the snapshot layer must not import commands, command stacks, project services, stores for mutation, backend modules, package/tooling code, or persistence DTOs.

Hard size/shape limits for implementation review: the snapshot factory should remain a thin adapter with small typed helper functions; if it starts accumulating style, visibility, projection, interaction, rendering, and traversal branches in one file, stop and choose the direct proposal or a new reviewed split. No dual full-`World` and snapshot selector APIs may remain after implementation.

## Explicit out of scope

- Command construction, undo/redo, persistence, backend, package/tooling, root validation redesign, docs/spec reconciliation, and app-shell lifecycle changes.
- Broad `ThreeView.vue` scene extraction, low-level Three mesh redesign, visual redesign of the 3D panel, or general SVG renderer rewrite.
- Store/runtime ownership changes except read-only consumption necessary to build the snapshot input.
- Deleting or reshaping unrelated tests/fixtures beyond the selector/snapshot/overlay contracts named here.

## Stop conditions

Stop and return to a reviewed plan-edit mini-cycle instead of implementing if any of these occur:

1. The snapshot factory needs to own style, visibility, projection, interaction, and rendering policy together.
2. More than the named canvas/three presentation consumers must be migrated to make the design coherent.
3. Current overlay behavior cannot be reasoned about without redesigning 3D scene interaction or app-shell layout.
4. `Paper.ts` query deletion cannot be proven by static usage and focused tests.
5. The implementation would require package/tooling, command, persistence, backend, or broad test-suite rewrites.

## Files/tests/docs/fixtures to DELETE

- Delete full-`World` input from both `CanvasPresentationController.buildModel()` and `ThreePresentationInput` if the snapshot layer replaces it.
- Delete duplicated domain traversal from `CanvasPresentationSelector` and `ThreePresentationSelector` where the snapshot factory becomes the owner.
- Delete `CanvasPresentationSelector` `any` helper seams and map casts rather than hiding them behind the snapshot.
- Delete projected-3D-on-2D loops from the 2D selector if the shared snapshot exposes explicit reconstructed/projected DTOs.
- Delete `Paper` mutable query/collection methods if the snapshot plus `CanvasInteractionQuery` fully own current rendering/query needs.
- Delete tests that instantiate selectors with concrete `World` fixtures solely to inspect traversal internals; replace with snapshot fixture tests.

## Expected behavior change

- Visual output should remain equivalent.
- The implementation may deliberately change overlay pointer behavior only after the snapshot clarifies whether the 3D overlay owns an interactive region. Any change must be covered by current-contract e2e/live browser evidence.
- No persistence, command construction, backend, package/tooling, or broad app-shell behavior should change.

## Architecture outcome

- Domain traversal for presentation is centralized in one application adapter rather than duplicated across 2D and 3D selector families.
- Canvas and three selectors become pure transformations from presentation snapshots to render DTOs.
- Cross-view projections become data in the snapshot or a named projection selector, not ad hoc loops inside the 2D selector.
- Overlay/pointer ownership can be expressed as a presentation/runtime decision rather than accidental CSS/layout behavior.

## No-backcompat / aggressive-deletion rationale

If selector callers or tests rely on passing `World` directly, that API should be deleted once the snapshot adapter is in place. The goal is not to support both full-World and snapshot presentation paths. Similarly, stale `Paper` query APIs should be removed if they are no longer authoritative.

## Risks

- This has a higher abstraction cost than the direct proposal and may be too broad if implemented as a general rendering platform.
- A snapshot factory can become a new god-module if it absorbs all presentation policies. It must stay an adapter and delegate style, visibility, projection, and interaction policies to focused modules.
- Touching both 2D and 3D selectors increases regression surface; validation must include focused tests for representative planes, points, lines, circles, guides, projected 3D elements, and overlay behavior.

## Validation plan

1. Snapshot factory unit tests using a small constructed world fixture.
2. Canvas selector tests from snapshot fixtures for points, lines/segments, circles, guides, projected 3D elements, selected/hovered/snap states, and grid labels.
3. Three selector tests from the same snapshot fixtures for projection planes, planar elements, reconstructed elements, guides, hinges, and labels.
4. Canvas interaction query tests for hit/snap behavior independent of concrete `World`.
5. Focused e2e/live browser check for the 2D/3D overlay overlap if event behavior changes.
6. Root/frontend lint, full Vitest, root/frontend build, root/frontend e2e where user-facing behavior changes, and live preview refresh/probe.

## Plan edit status before implementation

The corrected `architecture-audit/wave-plan.md` now contains a bounded Wave 016 entry. This restructure proposal exceeds that bounded entry unless review round 02 deliberately broadens the wave. If not broadened, the direct proposal remains the implementation candidate and this restructure proposal is a documented rejected/deferred alternative.
