# Proposal Direct — Three presentation read port with limited canvas realization alignment

## Summary

Implement the existing Wave 017 by introducing a narrow read port for three-presentation selectors/controllers. Keep 3D presentation behavior unchanged while deleting full mutable `World` consumption from the active three-presentation boundary. Align `CanvasWorldReadPort` only where necessary to avoid duplicate realization/read-context ownership.

This proposal is the preferred path after round-01 review because it closes the actual leak named by the wave without reopening the Wave 016 canvas selector model. The read port must be a selector-owned contract, not a renamed `World` facade.

## Files to change

- `frontend/src/application/threePresentation/ThreePresentationModel.ts`
- `frontend/src/application/threePresentation/ThreePresentationController.ts`
- `frontend/src/application/threePresentation/ThreePresentationSelector.ts`
- `frontend/src/application/threePresentation/ProjectionPlane3DSelector.ts`
- `frontend/src/application/threePresentation/PlanarElement3DSelector.ts`
- `frontend/src/application/threePresentation/ReconstructedElement3DSelector.ts`
- `frontend/src/application/threePresentation/Guide3DSelector.ts`
- `frontend/src/application/threePresentation/Hinge3DSelector.ts`
- new `frontend/src/application/threePresentation/ThreeWorldReadPort.ts` or equivalent narrow module
- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts` only for shared realization/read-context type alignment
- `frontend/src/rendering/threeView/ThreeViewRuntime.ts` and `frontend/src/components/panels/ThreeView.vue` only to wrap runtime `World` at the presentation boundary
- focused tests under `frontend/tests/unit/application/threePresentation/` and current canvas read-port tests

## Allowed read/realization surface

The `ThreeWorldReadPort` may expose only the data and realization operations needed by the existing three-presentation selector families. The implementation should prefer small interface slices consumed by each selector over one large class surface.

### Projection-plane selector slice

Allowed capabilities:

- enumerate projection planes required for 3D plane DTO output;
- read fixed-plane identity and orientation data needed for P_H/P_V and auxiliary-plane rendering;
- realize a projection plane into the typed 3D presentation DTO/geometry inputs already consumed by `ProjectionPlane3DSelector`;
- read plane-local grid/reference-axis inputs that are already part of the current projection-plane presentation output.

Forbidden capabilities:

- generic `getWorld()`, `getProjectionPlane(id)` returning mutable domain objects for arbitrary downstream use, or broad process-tree traversal;
- style, visibility, command, persistence, selection, scene-host, or UI state reads not already owned by the projection-plane selector.

### Planar-element selector slice

Allowed capabilities:

- enumerate projection-plane elements that are rendered as planar 3D presentation objects;
- realize each planar element through a typed element-realization context/read method;
- read only the owning plane data needed to place the planar element in 3D;
- provide typed transform/matrix DTOs so local `matrix: any` seams in touched selectors can be deleted.

Forbidden capabilities:

- returning raw mutable `ProjectionPlane` or `Element2D` objects to the selector as a substitute for the former full `World`;
- exposing mutation helpers, dependency updates, command construction, or persistence descriptors.

### Reconstructed-element selector slice

Allowed capabilities:

- enumerate currently reconstructed 3D domain elements that three-presentation already renders;
- read typed realization results for reconstructed points, lines, segments, circles, and planes where currently supported;
- read stable identifiers/labels needed by current 3D view DTOs.

Forbidden capabilities:

- exposing all domain entity maps or a catch-all `elements` collection;
- adding new reconstruction semantics or changing feasibility behavior under this presentation boundary wave.

### Guide selector slice

Allowed capabilities:

- enumerate guide-like elements already shown in the 3D presentation path;
- read typed guide realization geometry and labels needed for existing guide rendering;
- read only plane/context inputs required to realize those guides.

Forbidden capabilities:

- exposing construction-tool state, guide creation factories, or command/process ownership.

### Hinge selector slice

Allowed capabilities:

- read the fixed hinge and half-hinge data currently rendered by `Hinge3DSelector`;
- read typed realization/coordinate inputs required to build existing hinge DTOs.

Forbidden capabilities:

- exposing general plane adjacency, projection setup mutation, or initialization command paths.

### Canvas alignment slice

`CanvasWorldReadPort` may be touched only to share tiny typed realization-context interfaces or helper types when the same context is already required by both canvas and three-presentation realization. This proposal must not convert Wave 016's canvas read port into a global presentation snapshot.

## General facade guardrails

The implementation must not expose any method equivalent to `world`, `getWorld`, `commandStack`, `processTree`, `dependencyService`, unrestricted element maps, persistence serialization, or mutation. If a selector appears to need one of those capabilities, stop and record a wave-plan/delta need instead of widening the port.

## Files/tests/docs/fixtures to DELETE

- Delete full-`World` fields from three-presentation input/controller/selector APIs where replaced by the read port.
- Delete selector calls that pass concrete mutable `World` into each three-presentation concern selector.
- Delete local `matrix: any` helper seams in touched three-presentation selectors by replacing them with typed transform DTOs where the read-port boundary owns that data.
- Delete old tests/helpers that assert three-presentation selectors require concrete `World`.
- Delete compatibility wrappers or dual full-`World`/read-port APIs created during transition.

## Expected behavior change

No intended user-visible behavior change. Three-view projection planes, hinges, guides, planar elements, reconstructed 3D elements, labels, and overlay behavior should remain equivalent.

## No-backcompat/aggressive-deletion rationale

The full-`World` three-presentation input is an internal architectural coupling, not a compatibility surface. Under project priorities, the implementation should replace it and delete old APIs/tests rather than preserve overloads.

## Risks

- A read port can become a broad `World` facade if it exposes too much. Keep methods selector-owned and read-only, and apply the forbidden-capability list above during implementation review.
- Alignment with `CanvasWorldReadPort` can overreach into a general domain realization redesign. Stop for plan edit if a larger redesign is required.
- 3D rendering behavior is visually sensitive; run focused selector tests and browser/live smoke if behavior changes.
- The direct read port may reveal true duplication with canvas realization; if duplication is material and cannot be removed with tiny shared types, stop for reviewed decision rather than smuggling the restructure into this path.

## Validation plan

1. Static scans for three-presentation full-`World` inputs, `world` passed into concern selectors, `matrix: any`, and `CanvasWorldReadPort` realization delegation.
2. Focused Vitest must explicitly include:
   - `frontend/tests/unit/application/threePresentation/threePresentationSelector.spec.ts`
   - `frontend/tests/unit/application/threePresentation/threePresentationConcernSelectors.spec.ts`
   - new or updated `ThreeWorldReadPort`/read-port adapter tests under `frontend/tests/unit/application/threePresentation/`
   - `frontend/tests/unit/application/canvasPresentation/canvasWorldReadPort.spec.ts` if canvas read-port alignment changes.
3. Root/frontend lint.
4. Full root/frontend Vitest.
5. Root/frontend build.
6. Root/frontend Playwright/e2e or an explicit implementation-log justification if the final implementation truly has no user-visible rendering behavior change; live browser smoke is still required if three-view rendering code is touched.
7. Refresh preview on `0.0.0.0:5173` and capture HTTP probe during implementation closure.

## Non-goals

No command controller cleanup, no persistence/backend/app-shell redesign, no package/tooling changes, no docs/spec reconciliation, no broad ThreeSceneHost/OrbitControls redesign, and no new presentation god-snapshot.
