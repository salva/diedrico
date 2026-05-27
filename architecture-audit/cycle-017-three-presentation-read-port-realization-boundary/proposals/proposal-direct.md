# Proposal Direct — Decompose ThreeWorldReadPort into behavior-sized 3D presentation read ports

## Summary

Implement Wave 017 as a bounded decomposition of the current broad `ThreeWorldReadPort` residual. The current code already removed raw `World` from `ThreeView.vue` and `ThreePresentationInput`; therefore the direct implementation must **not** recreate that solved problem. Instead, split the single `ThreeWorldReadPort.ts` module into explicit concern-owned read ports/adapters that match the existing selector families and Wave 028’s canvas DTO/read-port pattern.

Target outcome: 3D presentation selectors depend on narrow named ports, the concrete `World` remains wrapped only inside runtime/adapter factories, realization-context assembly is localized or shared only as a tiny typed helper, and no scene-host/pointer behavior changes.

## Current evidence this proposal addresses

- `ThreeView.vue` consumes a read port from `ThreePresentationInjectionKey`, not `World` (`frontend/src/components/panels/ThreeView.vue:41-50`).
- `RuntimeSession.threePresentationPort()` is the concrete boundary that creates `createThreeWorldReadPort(this.world)` (`frontend/src/application/appShell/RuntimeSession.ts:93-99`).
- `ThreeWorldReadPort.ts` still imports `World` and concrete domain classes (`frontend/src/application/threePresentation/ThreeWorldReadPort.ts:6-12`) and builds seven read-model families plus realization context in one module (`ThreeWorldReadPort.ts:56-134`).
- `ProjectionPlane3DSelector` accepts the whole `ThreeWorldReadPort` (`frontend/src/application/threePresentation/ProjectionPlane3DSelector.ts:9-10`), while the other selectors already hint at narrower slices through `Pick<ThreeWorldReadPort, ...>`.
- Wave 028 moved canvas public consumers to behavior-sized methods (`frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:11-15`) and localized projected-3D traversal in `Projected3DCanvasReadPort.ts:5-12`; this proposal applies the same adapter-boundary shape to three presentation without introducing a generic facade.

## Files to change

Primary three-presentation files:

- `frontend/src/application/threePresentation/ThreeWorldReadPort.ts` — split or reduce to named slice composition and remove broad god-interface ownership.
- New focused modules under `frontend/src/application/threePresentation/`, for example:
  - `ThreeProjectionPlaneReadPort.ts`
  - `ThreePlanarElementReadPort.ts`
  - `ThreeReconstructedElementReadPort.ts`
  - `ThreeGuideReadPort.ts`
  - `ThreeHingeReadPort.ts`
  - optional `ThreeRealizationContext.ts` if kept local to three.
- `frontend/src/application/threePresentation/ThreePresentationModel.ts` — replace `ThreePresentationInput.readPort: ThreeWorldReadPort` with an explicit composed `ThreePresentationReadPorts` type if needed.
- `frontend/src/application/threePresentation/ThreePresentationController.ts`
- `frontend/src/application/threePresentation/ThreePresentationSelector.ts`
- `frontend/src/application/threePresentation/ProjectionPlane3DSelector.ts`
- `frontend/src/application/threePresentation/PlanarElement3DSelector.ts`
- `frontend/src/application/threePresentation/ReconstructedElement3DSelector.ts`
- `frontend/src/application/threePresentation/Guide3DSelector.ts`
- `frontend/src/application/threePresentation/Hinge3DSelector.ts`

Boundary/wiring files:

- `frontend/src/application/appShell/RuntimeSession.ts` — only for factory rename/composition wiring.
- `frontend/src/application/appShell/RuntimeViewPorts.ts` — only for read-port type rename/composition.
- `frontend/src/components/panels/ThreeView.vue` — only if a mechanical type/name change is required; no behavior/layout/pointer change.
- `frontend/src/rendering/threeView/ThreeViewRuntime.ts` — only if `ThreePresentationInput` type changes mechanically; no scene-host behavior change.

Optional tiny shared helper:

- New `frontend/src/application/presentation/WorldRealizationReadContext.ts` or equivalent only if it contains a typed `createWorldRealizationReadContext(world)` factory and no selector/read-model facade behavior.
- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts` only to consume that tiny helper, not to change public canvas behavior.

Tests:

- `frontend/tests/unit/application/threePresentation/threePresentationSelector.spec.ts`
- `frontend/tests/unit/application/threePresentation/threePresentationConcernSelectors.spec.ts`
- New focused three read-port slice/adapter tests.
- `frontend/tests/unit/components/panels/threeViewShellBoundary.spec.ts`
- Canvas read-port/projected-3D tests only if a shared helper touches canvas wiring.
- Static architecture guard tests, preferably extending `frontend/tests/unit/application/appShell/Cycle027Architecture.test.ts` or adding a Cycle017-specific guard if that is cleaner.

## Proposed design

### 1. Replace monolithic public interface with concern ports

Define explicit read-port slices that mirror selector ownership. Suggested contract shape:

```ts
export interface ThreeProjectionPlaneReadPort {
  getProjectionPlaneModels(): ThreeProjectionPlaneReadModel[];
  getProjectionPlaneGridSource(planeId: string): ThreeProjectionPlaneGridSource;
}

export interface ThreePlanarElementReadPort {
  getPlanarPlaneModels(): ThreePlanarPlaneReadModel[];
}

export interface ThreeReconstructedElementReadPort {
  getReconstructedModels(): ThreeReconstructedReadModel;
}

export interface ThreeGuideReadPort {
  getSelectedGuideModels(selectedIds: readonly string[]): ThreeGuideReadModel[];
  getGuideIntersectionModels(): ThreeGuideIntersectionReadModel;
}

export interface ThreeHingeReadPort {
  getHingeModels(): ThreeHingeReadModel[];
}

export interface ThreePresentationReadPorts {
  projectionPlanes: ThreeProjectionPlaneReadPort;
  planarElements: ThreePlanarElementReadPort;
  reconstructedElements: ThreeReconstructedElementReadPort;
  guides: ThreeGuideReadPort;
  hinges: ThreeHingeReadPort;
}
```

The exact names may differ, but the architecture must be equivalent: no selector should depend on a single god-interface when it only needs one concern.

### 2. Split adapter construction by concern

`createThreePresentationReadPorts(world)` should compose the five concern adapters. Concrete `World` access remains private to those adapter factories, not exposed to selectors/components/runtime. Implementation options:

- One factory file that composes concern modules, plus one module per concern; or
- A reduced `ThreeWorldReadPort.ts` that only re-exports types and factory composition while all traversal/classification logic moves to concern modules.

Allowed private raw traversal inside concern adapters:

- projection planes: `world.getAllProjectionPlanes()`, auxiliary/fixed classification, 3D projection-plane realization, grid-source lookup;
- planar elements: plane `getAllPoints/getAllLines/getAllCircles`, 2D realization, planar line kind/segment classification;
- reconstructed elements: all 3D points/lines/segments/planes and typed realization lookup;
- guides: selected guide lookup/classification and guide-intersection source models;
- hinges: all hinge lines and hinge realization.

Forbidden public exposure:

- `getWorld`, mutable `World`, raw domain maps, command stack, process tree, persistence data, mutation methods, selection/store state, style/visibility policy internals beyond current DTO fields, scene-host lifecycle, and generic collection names that mirror `World` without presentation behavior.

### 3. Selector dependencies become explicit

- `ProjectionPlane3DSelector.select` should accept `ThreeProjectionPlaneReadPort`, not `ThreeWorldReadPort`.
- `PlanarElement3DSelector.select` should accept `ThreePlanarElementReadPort`, not `Pick<ThreeWorldReadPort,...>`.
- `ReconstructedElement3DSelector.select` should accept `ThreeReconstructedElementReadPort`.
- `Guide3DSelector.select` should accept `ThreeGuideReadPort`.
- `Hinge3DSelector.select` should accept `ThreeHingeReadPort`.
- `ThreePresentationSelector` should pass `input.readPorts.projectionPlanes`, `input.readPorts.planarElements`, etc., or equivalent explicit fields, rather than passing one broad object to every selector.

### 4. Realization context treatment

Preferred direct treatment: keep realization-context creation private to three concern adapters, but move it into a small local helper if multiple new modules need it.

Allowed tiny shared treatment: if implementation proves the canvas and three factories duplicate exactly the same `World`-to-realization-context adapter, introduce a helper that exports only typed realization context creation. It must not include selector DTO methods, world collection convenience beyond the existing `ProjectionElementRealizationContext` contract, mutation, persistence, command, store, rendering, or app-shell behavior.

Stop if this becomes larger than a typed factory. That is Wave 018/domain-realization scope.

### 5. Test fixture cleanup

Replace broad `as any` fixtures in touched three-presentation tests with typed builders for the new slice ports. Do not attempt to purge all unrelated repository `as any` usage. Required deletion target is the touched three-presentation seams that exist only because tests mock a monolithic port or world-like object.

## Files/tests/docs/fixtures to DELETE

- Delete `ThreeWorldReadPort` as the broad public selector dependency, or delete its broad interface role by reducing it to a type alias/composition export with no god-interface methods.
- Delete selector imports of `ThreeWorldReadPort` where a named concern port is sufficient.
- Delete `ProjectionPlane3DSelector.select(readPort: ThreeWorldReadPort, ...)` and replace with a projection-plane port.
- Delete `Pick<ThreeWorldReadPort, ...>` patterns from concern selectors and replace with named port interfaces.
- Delete duplicated `createThreeRealizationContext` if a tiny shared context factory is introduced; otherwise delete only duplicated local code created during the split.
- Delete touched broad `as any` test fixtures in `threePresentationConcernSelectors.spec.ts` / `threePresentationSelector.spec.ts` where explicit read-port slice fixtures replace them.
- Delete transitional broad-port compatibility wrappers, overloads, dead exports, and dual old/new read-port paths.

No docs/spec/backend/package/fixture rewrites are required for this wave.

## Expected behavior change

No intended user-visible behavior change. 3D projection planes, grids, axes, labels, planar elements on planes, reconstructed points/lines/segments/planes, guide perpendicular planes/intersection markers, hinges, display toggles, selection-driven guide display, and overlay pointer behavior should remain equivalent.

## No-backcompat/aggressive-deletion rationale

The monolithic `ThreeWorldReadPort` is an internal architecture seam. It should be deleted/reduced rather than preserved through overloads or compatibility wrappers. Keeping both broad and sliced paths would create parallel read models and violate the project’s no-backcompat priorities.

## Protected surfaces

Do not change:

- `ThreeSceneHost`, OrbitControls/camera/lights/animation loop, renderer platform setup, scene-object adapter behavior except for compile-type consequences.
- `.three-view-overlay`, `.three-canvas`, CSS pointer behavior, app-shell overlay layout, or e2e data-testid contracts.
- Canvas public read-port methods introduced by Wave 028.
- Command/undo, persistence/replay, construction tools, active-plane behavior, `screenTo3D`, command producers, backend, package/tooling, docs/specs, auth/provider/env files.
- Unrelated dirty `frontend/src/domain/calculations/Intersections.ts` and `frontend/src/domain/processTree/ActionGroup.ts`.

## Risks

- A split can become cosmetic if a hidden broad aggregate still mirrors the old interface. Static tests must guard selector dependencies on named ports.
- Too much sharing with canvas can create a generic presentation/world facade. Use the stop condition if the shared helper grows beyond typed realization-context construction.
- Moving classification among adapter modules can cause subtle 3D DTO drift. Focused tests must assert representative IDs, kinds, visibility/feasibility filtering, and DTO geometry fields.
- The pointer-boundary regression is unrelated to read-port decomposition but must be protected because any 3D presentation wave touches the same user-visible area.

## Validation plan

Capture logs under `architecture-audit/cycle-017-three-presentation-read-port-realization-boundary/validation/`.

1. Path-scoped pre/post status and diff for only Wave 017 files plus protected unrelated source status.
2. Static scans for:
   - no Vue concrete `World` injection/import in `ThreeView.vue` or production components;
   - no generic `RuntimeWorld`, `WorldReadModel`, app-kernel facade, or raw tool-world seam;
   - no `CanvasWorldReadPort` public raw getter/realization reintroduction;
   - no concern selector import/type dependency on the broad `ThreeWorldReadPort` god-interface;
   - no transitional dual broad/slice read-port paths;
   - touched three-presentation tests no longer using broad `as any` seams where slice fixtures are available.
3. Focused Vitest:
   - `frontend/tests/unit/application/threePresentation/threePresentationSelector.spec.ts`
   - `frontend/tests/unit/application/threePresentation/threePresentationConcernSelectors.spec.ts`
   - new/updated read-port slice adapter tests
   - `frontend/tests/unit/components/panels/threeViewShellBoundary.spec.ts`
   - canvas read-port/projected-3D focused tests only if canvas/shared helper is touched.
4. Root `npm run lint` and frontend `npm run lint` where defined.
5. Root and frontend full Vitest where defined.
6. Root and frontend build where defined.
7. Root and frontend Playwright/e2e because this wave touches 3D presentation, including explicit evidence for `current-ui-contract.spec.ts` pointer-boundary test.
8. Live preview refresh on `0.0.0.0:5173`, HTTP 200 probe, and 3D live smoke where tooling is available.

## Stop conditions

Stop and request a reviewed delta or plan edit if:

- The implementation needs domain realization API/semantic changes beyond moving adapter-local context construction.
- A shared helper grows into a generic read model/world facade.
- Public canvas raw seams deleted by Wave 028 would be reintroduced.
- Scene-host, OrbitControls, overlay/pointer, command/undo, persistence, package/tooling, backend/docs/spec, or auth/provider/env work becomes necessary.
- Unrelated dirty `Intersections.ts` / `ActionGroup.ts` changes become necessary for compile/test success.
- The implementation cannot preserve the 3D overlay pointer-boundary e2e contract.
