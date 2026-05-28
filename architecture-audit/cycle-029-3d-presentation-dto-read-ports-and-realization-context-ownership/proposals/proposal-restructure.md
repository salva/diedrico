# Proposal Restructure — Stop for split/higher-level realization layer only if DTO cleanup cannot stay local

## Recommendation

Use this proposal as the contingency path, not the default. The fresh scout shows Wave 029 is valid, but implementation should stop and choose a split/higher-level restructuring only if the direct DTO read-port cleanup proves that 3D geometry conversion cannot be isolated inside `application/threePresentation` without changing domain realization semantics or scene-host architecture.

The likely split would be:

1. **Wave 029a — 3D realization source adapter ownership:** create a single application-owned 3D realization source/geometry adapter that converts `World` + realization context into primitive presentation source DTOs, with no renderer changes beyond tests.
2. **Wave 029b — 3D selector/renderer DTO contract cleanup:** narrow selectors/read ports to final renderer DTOs, delete remaining raw read-model/test leaks, and update scene adapters if needed.

Do not take this path merely because the direct proposal touches several 3D read-port files. Take it only if implementation evidence shows a real conceptual layer is missing.

## Why consider a restructure?

Current 3D read ports are not only leaking DTO fields; they are also deciding where realization context collections live:

- `ThreeRealizationContext.ts` wraps `createWorldRealizationContext(world)` and adds `getAllProjectionPlanes` / `getAllHingeLines` callbacks (`frontend/src/application/threePresentation/ThreeRealizationContext.ts:12-20`).
- `ThreePlanarElementReadPort.ts` and `ThreeHingeReadPort.ts` each assemble context with different collection callbacks (`frontend/src/application/threePresentation/ThreePlanarElementReadPort.ts:26-31`; `frontend/src/application/threePresentation/ThreeHingeReadPort.ts:12-17`).
- `ThreeGuideReadPort.ts` currently uses empty projection-plane/hinge collections for guide realization while still using world realization lookups (`frontend/src/application/threePresentation/ThreeGuideReadPort.ts:26-36`).

If these differences represent intentional domain semantics rather than adapter duplication, forcing all conversion into one direct cleanup could hide a domain realization-context decision inside rendering code. In that case, a split wave or plan edit is cleaner.

## Stop conditions that should trigger this proposal

Implementation should stop and request a reviewed plan correction if any of these occur:

1. **Domain realization API changes are required.** Example: `Element2D.realize2D`, `Element3D.realize3D`, `ProjectionPlaneRealization3D`, `Plane3DRealization3D`, or `ProjectionPlaneContext.ts` must change semantics to produce DTOs correctly.
2. **Persistence/replay is implicated.** Example: 3D realization output depends on command replay or stored project format decisions.
3. **Renderer scene-host rewrite is required.** Example: `ThreeSceneHost`/scene adapters cannot consume equivalent DTO geometry without changing object lifecycle, pointer behavior, or overlay ownership.
4. **App-shell composition must be redesigned.** Example: `RuntimeSession` must expose a generic world/read-model façade or broader app-kernel to support 3D presentation.
5. **Canvas public contracts must churn.** Example: shared realization context changes require modifying `CanvasWorldReadPort` public methods or `CanvasPresentationSelector` behavior.
6. **Guide/hinge realization context requires domain-level ownership.** Example: selected-guide and hinge-line calculations need a formally shared realization-context owner outside 3D presentation and canvas.

If none of these stop conditions appears, use Proposal Direct.

## Target architecture for the restructure path

### Layer 1: application-owned realization source adapter

Create a focused application module that owns 3D presentation geometry extraction from `World`:

- Possible file: `frontend/src/application/threePresentation/ThreePresentationGeometrySource.ts`
- Inputs: concrete `World` and a private realization-context factory.
- Outputs: primitive geometry/style/visibility source DTOs for projection planes, planar elements, reconstructed elements, guides, and hinges.
- Responsibilities:
  - raw `world.getAllProjectionPlanes()` / `getAll3D*()` / `getAllPlanes()` / `getAllHingeLines()` traversal;
  - domain `instanceof` classification;
  - `realize2D` / `realize3D` calls;
  - domain visual-style-to-DTO style/visibility mapping;
  - feasibility filtering;
  - guide/hinge context assembly.

### Layer 2: 3D presentation selectors/read ports

Read ports become a stable interface over the geometry source, not over `World`:

- Projection-plane read port returns projection-plane surface/grid/axis source DTOs.
- Planar read port returns planar geometry source DTOs.
- Reconstructed read port returns reconstructed geometry source DTOs.
- Guide read port returns selected guide source DTOs plus intersection source DTOs.
- Hinge read port returns hinge line source DTOs.

Selectors convert source DTOs into final `ThreePresentationModel` groups and apply display options. Scene adapters remain final DTO consumers.

## Files to change if this path is selected

### New or restructured application modules

- Add `frontend/src/application/threePresentation/ThreePresentationGeometrySource.ts` or equivalent focused adapter.
- Potentially add `frontend/src/application/threePresentation/ThreePresentationSourceModel.ts` for DTO source types.
- Potentially rename `ThreeRealizationContext.ts` to clarify it is an internal realization-context factory, not a public read model.

### Existing files

- `frontend/src/application/threePresentation/ThreeWorldReadPort.ts`
- `frontend/src/application/threePresentation/ThreeProjectionPlaneReadPort.ts`
- `frontend/src/application/threePresentation/ThreePlanarElementReadPort.ts`
- `frontend/src/application/threePresentation/ThreeReconstructedElementReadPort.ts`
- `frontend/src/application/threePresentation/ThreeGuideReadPort.ts`
- `frontend/src/application/threePresentation/ThreeHingeReadPort.ts`
- `frontend/src/application/threePresentation/ThreePresentationReadModel.ts`
- `frontend/src/application/threePresentation/ThreeStylePolicy.ts`
- 3D selectors under `frontend/src/application/threePresentation/*Selector.ts`
- Focused 3D presentation/runtime tests

### Only if direct evidence requires it

- `frontend/src/application/presentation/WorldRealizationContext.ts` for a tiny shared factory/helper extraction.
- `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts` only if the reviewed plan edit explicitly scopes a domain realization-context ownership change. It should not be touched under the default Wave 029 direct path.

## Files/tests/docs/fixtures to DELETE

- Same read-model leakage deletions as Proposal Direct:
  - `VisualStyle` carrier read models.
  - public `realization` / `planeRealization` fields.
  - public domain realization type exports from 3D read-port modules.
  - stale tests/mocks asserting raw realization/style objects.
- If a split wave is selected, delete only the surfaces covered by the selected sub-wave. Do not leave dual public raw/DTO paths between 029a and 029b; if a temporary internal helper exists, it must be private to the adapter and not exported as compatibility API.

## Expected behavior changes

None intended. The restructure path is architectural only. It must preserve projection-plane display, planar 2D-on-3D elements, reconstructed 3D entities, selected guide visualization, guide intersections, hinges, display options, visibility/color behavior, and overlay pointer ownership.

## Risks

- **Overfeaturism risk:** A generic realization-context layer can easily become a `WorldReadModel`/scene-kernel façade. Avoid broad names and broad capabilities; the adapter must be 3D-presentation-specific unless a reviewed plan edit approves a shared layer.
- **Parallel path risk:** Splitting into 029a/029b can leave raw and DTO contracts side by side. Avoid by making each sub-wave delete its old public surface completely.
- **Ordering risk:** If this becomes a domain realization-context redesign, it may outrank renderer DTO cleanup and require wave-plan correction. Do not continue under Wave 029 without review.
- **Validation risk:** A split still touches user-observable 3D rendering and needs e2e/preview validation for each implementation wave.

## Validation plan

Same mandatory validation as Proposal Direct, plus if a plan correction/split is selected:

1. A plan-edit mini-cycle must update `architecture-audit/wave-plan.md` to define Wave 029a/029b or a new domain realization-context wave.
2. Review convergence must approve the split before source implementation.
3. Each split implementation wave must run the full validation cadence independently; do not defer overlay/e2e validation until the second half if the first half touches active 3D rendering.

## No-backcompat / aggressive deletion rationale

The restructure path is acceptable only if it deletes the old raw realization/style public read models at least as aggressively as the direct proposal. It must not preserve compatibility layers or add a broad façade to keep old consumers working. Internal contracts are free to break because current consumers are narrow and local.

## Protected surfaces

The same protected surfaces apply as Proposal Direct: no command/persistence/backend/Drive/auth/docs/specs/package/tooling/validation-platform/canvas-public-contract/CSS-only-overlay changes; no use of unrelated dirty `Intersections.ts` or `ActionGroup.ts`; no recreation of absent `Element2DRenderer3D.ts`.

## Decision guidance

Choose **Proposal Direct** unless a Critic/Reviewer identifies a concrete stop condition from current source evidence. Choose this restructure path only to avoid hiding a higher-level domain realization-context or scene-host redesign inside a superficially bounded DTO cleanup.
