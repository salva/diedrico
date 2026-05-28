# Cycle 029 Scope Check — 3D presentation DTO read ports and realization-context ownership

## Status

**Wave status:** valid as the next central wave.  
**Stage type:** fresh scout / proposal only.  
**Source changes:** none in this stage.  
**Implementation authorization:** not granted until proposal review convergence.

## Evidence inspected

- Current Wave 029 entry in `architecture-audit/wave-plan.md` (`## Wave 029 — 3D presentation DTO read ports and realization-context ownership`).
- Cycle 029 plan-extension rationale and review: `architecture-audit/cycle-029-wave-plan-extension/plan-extension-rationale.md`; `architecture-audit/cycle-029-wave-plan-extension/reviews/round-01-review.md`.
- Cycle 028 closure: `architecture-audit/cycle-028-canvas-projection-dto-selectors/implementation-log.md`.
- Current source excerpts captured under this cycle:
  - `evidence/source-excerpts.txt`
  - `evidence/three-presentation-excerpts.txt`
  - `evidence/caller-inventory.txt`
  - `evidence/three-seam-scan.txt`
- Path-scoped git evidence captured in `.saivage/tmp/command-logs/cycle029-scoped-status-diff.stdout`.

## Source-control reconciliation

Path-scoped status/diff for the stage-relevant paths reports:

- Modified, unrelated/protected: `frontend/src/domain/calculations/Intersections.ts`.
- Modified, unrelated/protected: `frontend/src/domain/processTree/ActionGroup.ts`.
- Modified/untracked prior design artifacts under Cycle 029 wave-plan-extension and Cycle 028 critique/review directories.
- No scoped dirty changes in the active 3D presentation source files inspected for this stage.

Those unrelated dirty source files were treated as protected metadata only. This scope-check does not read, revert, normalize, stage, or depend on their modifications.

## Wave-premise check

### Premise 1 — Canvas read boundary is no longer the central raw selector leak

**Valid.** Wave 028 closure says canvas public raw seams were deleted and projected-3D raw traversal was localized in `Projected3DCanvasReadPort.ts`, while `ThreeWorldReadPort` remained a residual boundary (`architecture-audit/cycle-028-canvas-projection-dto-selectors/implementation-log.md`, “Retained residuals and rationale”; “Final residual risks and next-wave recommendation”). Current code matches that claim: `CanvasWorldReadPort` exposes behavior-sized methods (`frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:12-16`) and `CanvasPresentationSelector` consumes those methods rather than raw world/plane getters (`frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts:8-29`).

### Premise 2 — 3D presentation still leaks domain realization/style objects through read models

**Valid.** Current 3D read models expose domain objects or domain-shaped style data:

- `ThreePresentationReadModel.ts` exports `ThreeEntityPresentationData` with `visualStyle?: VisualStyle` (`frontend/src/application/threePresentation/ThreePresentationReadModel.ts:1-3`).
- Projection-plane read models expose `ProjectionPlaneRealization3D` and grid source exposes `Plane3DRealization3D` (`frontend/src/application/threePresentation/ThreeProjectionPlaneReadPort.ts:1-20`).
- Planar element read models expose `Point2DRealization2D`, `Line2DRealization2D`, `Circle2DRealization2D`, and `ProjectionPlaneRealization3D` (`frontend/src/application/threePresentation/ThreePlanarElementReadPort.ts:1-20`).
- Reconstructed models expose `Point3DRealization3D`, `Line3DRealization3D`, `Segment3DRealization3D`, and `Plane3DRealization3D` (`frontend/src/application/threePresentation/ThreeReconstructedElementReadPort.ts:1-10`).
- Guide and hinge read models expose `Line2DRealization2D`, `ProjectionPlaneRealization3D`, and `Line3DRealization3D` (`frontend/src/application/threePresentation/ThreeGuideReadPort.ts:1-18`; `frontend/src/application/threePresentation/ThreeHingeReadPort.ts:1-9`).

### Premise 3 — repeated raw traversal/context assembly exists inside individual 3D sub-ports

**Valid.** The current factory creates five sub-ports from the same concrete world (`frontend/src/application/threePresentation/ThreeWorldReadPort.ts:37-45`). Those ports repeat traversal and context ownership:

- Projection-plane port traverses `world.getAllProjectionPlanes()` and uses `AuxiliaryProjectionPlane instanceof` classification (`frontend/src/application/threePresentation/ThreeProjectionPlaneReadPort.ts:23-39`).
- Planar-element port traverses all projection planes and per-plane point/line/circle collections, builds a three-specific realization context, and classifies segments with `instanceof Segment2DByPoints` (`frontend/src/application/threePresentation/ThreePlanarElementReadPort.ts:26-39`).
- Reconstructed-element port traverses all 3D point/line/segment/plane collections (`frontend/src/application/threePresentation/ThreeReconstructedElementReadPort.ts:16-24`).
- Guide port traverses selected 2D guide lines plus all 3D point/line/segment collections (`frontend/src/application/threePresentation/ThreeGuideReadPort.ts:26-55`).
- Hinge port traverses hinge lines and all projection planes for realization context (`frontend/src/application/threePresentation/ThreeHingeReadPort.ts:12-20`).

### Premise 4 — consumers are narrow enough to replace raw read models with DTO contracts

**Valid with bounded implementation.** Caller inventory shows the read-port methods are consumed only by `threePresentation` selectors and their tests, with runtime wiring through `RuntimeSession`/`RuntimeViewPorts` and rendering through `ThreeViewRuntime` (`evidence/caller-inventory.txt`). `ThreeViewRuntime` already consumes `ThreePresentationModel` DTOs and scene adapters, not raw domain objects (`frontend/src/rendering/threeView/ThreeViewRuntime.ts:1-80`). `ThreeView.vue` is a shell that injects `ThreePresentationPort`, caches the read ports, and calls `runtime.refresh({ readPorts, displayOptions, selectedIds })` (`frontend/src/components/panels/ThreeView.vue:23-56`).

### Premise 5 — realization-context ownership can be cleaned without broad domain realization redesign

**Valid if limited to application adapters.** `WorldRealizationContext` already provides lookup realization capabilities from `World` (`frontend/src/application/presentation/WorldRealizationContext.ts:4-14` per plan-extension evidence), and `ThreeRealizationContext` adds collection callbacks for projection planes and hinge lines (`frontend/src/application/threePresentation/ThreeRealizationContext.ts:12-20`). The implementation can consolidate this assembly inside a single 3D adapter/factory while leaving domain `ProjectionPlaneContext` interfaces unchanged. If implementation needs semantic changes to `Element2D.realize2D`, `Element3D.realize3D`, projection-plane realization classes, or persistence replay, the wave must stop for plan correction.

### Premise 6 — `Element2DRenderer3D.ts` is not an active source surface

**Current-source correction.** The assignment lists `frontend/src/services/Element2DRenderer3D.ts`, but that file does not exist in the current tree. This supports the Wave 029 premise that the active 3D rendering path is now `application/threePresentation/*` plus `rendering/threeView/*`, not an old service renderer. Do not recreate or migrate to `Element2DRenderer3D.ts`.

## Caller/model inventory by behavior

| Behavior | Current method(s) | Consumer(s) | Current leak | Replacement direction |
|---|---|---|---|---|
| Projection-plane mesh/surface | `projectionPlanes.getProjectionPlaneModels()` | `ProjectionPlane3DSelector.select()` | `ProjectionPlaneRealization3D`, `AuxiliaryProjectionPlane instanceof`, world traversal | Return plane surface source DTOs with plane id, kind, basis/geometry primitives, mesh size/source id, feasibility encoded by omission or `visible:false` |
| Projection-plane grid source | `projectionPlanes.getProjectionPlaneGridSource(planeId)` | `ProjectionPlane3DSelector.gridSegments()` | `Plane3DRealization3D` and `ProjectionPlaneRealization3D` returned to selector | Either return precomputed grid segments in domain/three coordinates or a DTO with clipped grid segments; selector should not call realization methods |
| Reference axes | no read-port dependency | `ProjectionPlane3DSelector.referenceAxes()` | none | Keep selector-owned static DTO generation |
| Auxiliary axes | `getProjectionPlaneModels()` | `ProjectionPlane3DSelector.auxiliaryAxes()` | realization matrix exposed to selector | Adapter should expose `origin`, `uAxis`, `vAxis`, and `normal` DTO data |
| Planar 2D-on-3D points | `planarElements.getPlanarPlaneModels()` | `PlanarElement3DSelector.select()` | plane + point realizations, domain style | Return `PlanarPointSourceDto` with lifted 3D position and DTO-native style/visibility |
| Planar 2D-on-3D lines/segments | `planarElements.getPlanarPlaneModels()` | `PlanarElement3DSelector.select()` | line realization object, `isSegment`, `isBounded()` domain API, domain style | Return explicit `kind: planar-line | planar-segment`, start/end DTOs, style/visibility |
| Planar circles | `planarElements.getPlanarPlaneModels()` | `PlanarElement3DSelector.select()` | circle realization object and radius method | Return sampled points or center/radius/basis DTO; direct proposal should return points to minimize scene-adapter changes |
| Reconstructed 3D point/line/segment/plane | `reconstructedElements.getReconstructedModels()` | `ReconstructedElement3DSelector.select()` | realization objects and domain style | Return geometry DTOs (cartesian point, line start/end, segment start/end, plane geometry) plus DTO style/visibility |
| Selected guide display | `guides.getSelectedGuideModels(selectedIds)` | `Guide3DSelector.select()` | selected guide line realization and projection-plane realization | Return selected guide perpendicular-plane geometry source or final guide plane DTOs |
| Guide intersection display | `guides.getGuideIntersectionModels()` | `Guide3DSelector.intersections()` | raw 3D model realization outputs and domain style | Return visible reconstructed geometry DTOs or precomputed guide-intersection marker DTOs; direct proposal should keep guide selector math but use geometry DTOs |
| Hinge-line display | `hinges.getHingeModels()` | `Hinge3DSelector.select()` | `Line3DRealization3D` | Return start/end geometry DTO directly |
| Visual style source | `ThreeEntityPresentationData.visualStyle` and `ThreeStylePolicy` | planar/reconstructed/guide selectors | `VisualStyle` domain type crosses read-model boundary | Adapter maps domain visibility/color to `ThreeStyleSourceDto` or final `ThreeStyleDto`; delete `VisualStyle` from read models |
| Feasibility filtering | selectors check `realization?.feasible` / `isFeasible()` | all selectors | selector knows domain feasibility APIs | Adapter filters infeasible items or emits `visible:false` with no geometry; direct proposal should omit infeasible geometry from DTO lists |
| Realization-context assembly | `createThreeRealizationContext` in sub-ports | read-port factories | duplicated per-port context construction and collection callback wiring | One 3D adapter/factory owns context once and passes it to behavior selectors/converters internally |

## Selected bounded scope for proposals

The implementation proposals may touch:

- `frontend/src/application/threePresentation/*`
- `frontend/src/rendering/threeView/*` only if DTO names or rendering inputs require adaptation
- `frontend/src/components/panels/ThreeView.vue` only if `ThreePresentationInput` / port contract changes require a shell wiring update
- `frontend/src/application/appShell/RuntimeSession.ts` and `RuntimeViewPorts.ts` only to preserve `ThreePresentationPort` wiring to the changed read-port factory
- `frontend/src/application/presentation/WorldRealizationContext.ts` only for a tiny helper/factory extraction used by both canvas/3D without broad façade semantics
- focused tests under `frontend/tests/unit/application/threePresentation/`, `frontend/tests/unit/rendering/threeView/`, `frontend/tests/unit/components/panels/`, and architecture guards
- e2e validation of current UI/overlay behavior

## Out of scope

- Production implementation during this scout stage.
- Canvas projection DTO selector rewrite except shared helper consumption with no public canvas contract churn.
- Command producers/history, `CommandStack`, command descriptors, operation registry, persistence schema/replay, `ProjectService`, Drive/auth, backend, docs/specs, package/tooling, validation-platform work, preview-script ergonomics, app-shell production composition redesign, UI feature changes, CSS-only overlay changes, or broad domain realization semantic redesign.
- Recreating deleted/absent `frontend/src/services/Element2DRenderer3D.ts`.
- Reading or incorporating unrelated dirty `Intersections.ts` / `ActionGroup.ts` modifications.

## DELETE candidates for implementation

- `frontend/src/application/threePresentation/ThreePresentationReadModel.ts` or its `VisualStyle`-based `ThreeEntityPresentationData` shape, if all consumers move to DTO-native style/visibility source types.
- `realization` fields in `ThreeProjectionPlaneReadModel`, `ThreePlanar*ReadModel`, `ThreeReconstructedReadModel`, `ThreeGuideReadModel`, and `ThreeHingeReadModel` where replaced by geometry DTOs.
- `visualStyle` fields crossing 3D read-port boundaries.
- `getProjectionPlaneGridSource()` if the projection-plane adapter returns grid segments/geometry DTOs directly.
- Repeated world traversal from individual sub-port modules where moved behind one `ThreeWorldPresentationAdapter` / behavior adapter boundary.
- Read-port tests/mocks that assert domain realization/style leakage.

## Protected surfaces and preservation requirements

- Preserve Wave 024 runtime command-production ownership: `RuntimeSession` can remain the private owner of `World`/`CommandStack`, but 3D presentation must not receive command producers or history state.
- Preserve Waves 027/028 canvas read-port boundaries: do not reintroduce public raw canvas getters, generic runtime/world façades, process-tree-shaped canvas seams, or `WorldReadModel`/`RuntimeWorld` abstractions.
- Preserve current `ThreeView.vue` shell responsibility and overlay pointer behavior. The 3D overlay must continue to own pointer interaction; e2e coverage at `frontend/tests/e2e/current-ui-contract.spec.ts:89-116` remains mandatory for implementation validation.
- Preserve user-visible 3D display: projection planes, grids/reference axes, auxiliary axes, planar 2D elements, reconstructed 3D entities, selected guide perpendicular planes/intersections, hinges, visibility, and style/color where currently observable.

## Validation requirements for implementation wave

Minimum implementation validation must capture logs under this cycle's `validation/` directory:

1. Static scans proving 3D presentation read models no longer export domain realization types or `VisualStyle`, and proving repeated raw traversal is localized to the selected adapter boundary.
2. Focused Vitest for 3D presentation selectors/read-port DTO contracts.
3. Focused `ThreeViewRuntime` / scene adapter tests if DTO contracts change at renderer boundary.
4. Architecture-boundary tests guarding no generic `RuntimeWorld`, `WorldReadModel`, `SceneKernel`, broad app-kernel façade, or canvas raw-seam regression.
5. Root and frontend lint where defined.
6. Focused and full Vitest.
7. Root and frontend build.
8. Root and frontend Playwright/e2e, including `current-ui-contract.spec.ts` overlay pointer boundary.
9. Live preview refresh on `0.0.0.0:5173` with HTTP 200 reachability probe and browser/MCP or CLI Playwright evidence if MCP is unavailable.

## Decision

Wave 029 remains valid and next by centrality. The current source confirms the exact seam identified by the plan extension: 3D presentation read ports are the remaining active rendering/read boundary that leaks domain realization/style objects and repeats concrete `World` traversal. No wave-plan correction is required before proposal review.
