# Cycle 029 Implementation Log — 3D presentation DTO read ports and realization-context ownership

## Status

Complete. Implemented the decision-selected `proposal-direct.md` path without touching command/history, persistence, backend/docs/specs, package/tooling, Drive/auth, app-shell composition redesign, Wave 028 canvas public contracts, or unrelated dirty source files.

## Source files changed

- `frontend/src/application/threePresentation/ThreePresentationReadModel.ts`
  - Replaced the `VisualStyle`-carrying `ThreeEntityPresentationData` surface with DTO-native source contracts: entity style/visibility DTO, projection-plane source DTO, planar element sources, reconstructed sources, guide intersection/source DTOs, and hinge source DTOs.
- `frontend/src/application/threePresentation/ThreeStylePolicy.ts`
  - Kept domain `VisualStyle` mapping adapter-private via `planarStyleFromDomain`, `reconstructedStyleFromDomain`, and `visibleFromDomain`; selectors now consume only DTO `style`/`visible` through `isVisible`.
- `frontend/src/application/threePresentation/ThreeProjectionPlaneReadPort.ts`
  - Moved projection-plane realization, basis, surface, grid, and auxiliary-axis conversion into the read-port adapter. Removed public `getProjectionPlaneGridSource()` and raw projection/plane realization read models.
- `frontend/src/application/threePresentation/ProjectionPlane3DSelector.ts`
  - Consumes DTO-native projection-plane source models and assembles final surface/grid/reference-axis DTOs without domain realization APIs.
- `frontend/src/application/threePresentation/ThreePlanarElementReadPort.ts`
  - Moved planar point/line/segment/circle realization and 2D-to-3D lifting into the adapter. Selector-facing models expose renderable primitive geometry only.
- `frontend/src/application/threePresentation/PlanarElement3DSelector.ts`
  - Consumes DTO-native planar element sources only.
- `frontend/src/application/threePresentation/ThreeReconstructedElementReadPort.ts`
  - Converts reconstructed point/line/segment/plane domain realizations to DTO-native geometry inside the adapter.
- `frontend/src/application/threePresentation/ReconstructedElement3DSelector.ts`
  - Consumes DTO-native reconstructed source arrays only.
- `frontend/src/application/threePresentation/ThreeGuideReadPort.ts`
  - Converts selected guide perpendicular-plane source geometry and guide-intersection candidate geometry inside the adapter.
- `frontend/src/application/threePresentation/Guide3DSelector.ts`
  - Consumes selected-guide primitive plane geometry and intersection candidate DTOs only.
- `frontend/src/application/threePresentation/ThreeHingeReadPort.ts`
  - Converts hinge realization to start/end line DTO geometry inside the adapter.
- `frontend/src/application/threePresentation/Hinge3DSelector.ts`
  - Consumes hinge DTO geometry only.
- `frontend/src/application/threePresentation/ThreeWorldReadPort.ts`
  - Removed the deleted raw/style carrier export and the deleted grid-source public type export.
- `frontend/tests/unit/application/threePresentation/threePresentationConcernSelectors.spec.ts`
  - Rewrote concern-selector mocks to DTO-native sources and added adapter-boundary assertions that adapted world ports do not expose raw `realization` fields.
- `frontend/tests/unit/application/threePresentation/threePresentationSelector.spec.ts`
  - Updated read-port orchestration mock after deleting `getProjectionPlaneGridSource()`.
- `frontend/tests/unit/application/threePresentation/threePresentationArchitectureBoundary.spec.ts`
  - Added Cycle 029 static guards for no selector/read-model `VisualStyle`, realization classes, raw `realization`/`planeRealization`/`visualStyle` fields, selector-facing `instanceof`, forbidden broad facades, and Wave 028 canvas raw-seam preservation.

## Authorized delete/proof list

- Deleted `ThreeEntityPresentationData`; `ThreePresentationReadModel.ts` now contains DTO source contracts only.
- Deleted selector-facing domain realization imports from public 3D read model and selector contracts. Static scan `validation/static-scan-selector-readmodel-leakage-post.out` has no matches beyond the scan header.
- Deleted public read-model fields named `realization`, `planeRealization`, and domain `visualStyle` from selector-facing `application/threePresentation` selectors/read models.
- Deleted `getProjectionPlaneGridSource()` and `ThreeProjectionPlaneGridSource`; grid segments are emitted as DTO geometry by `ThreeProjectionPlaneReadPort.ts`.
- Deleted stale test mocks that injected raw realization/style objects into selector-facing contracts.
- Repeated raw world traversal remains only in adapter/read-port modules. Static scan `validation/static-scan-adapter-private-conversions.out` records remaining domain realization/style/world traversal call sites as adapter-private conversion evidence.
- `AuxiliaryProjectionPlane instanceof` and `Segment2DByPoints instanceof` remain adapter-private in `ThreeProjectionPlaneReadPort.ts` and `ThreePlanarElementReadPort.ts`; no selector-facing `instanceof` remains.
- No compatibility wrappers, dual raw/DTO public paths, generic `RuntimeWorld`, `WorldReadModel`, `SceneKernel`, or app-kernel facade were introduced; see `validation/static-scan-forbidden-facades.out`.

## 3D DTO/read-port ownership evidence

Selector-facing sources now expose:

- Projection planes: `id`, `kind`, optional `plane3DId`, surface `PlaneGeometryDto`, grid `SegmentGeometryDto[]`, and auxiliary-axis primitive vectors.
- Planar elements: discriminated `planar-point` / `planar-line` / `planar-segment` / `planar-circle` with `visible`, `style`, and primitive positions/segments/polyline points.
- Reconstructed elements: discriminated point/line/segment/plane geometry DTOs with `visible` and `style`.
- Guides: selected-guide plane point/normal/geometry and intersection candidate DTO geometry.
- Hinges: `start`/`end` line geometry DTOs.

Domain realization calls, domain `VisualStyle` inspection, and domain `instanceof` checks are confined to read-port adapter modules and `ThreeStylePolicy.ts`. Selectors now assemble final `ThreePresentationModel` groups from DTO-native inputs and display options only.

## Wave 028 / overlay preservation

- No production canvas files were modified. `CanvasWorldReadPort`, `Projected3DCanvasReadPort`, and canvas selector contracts remain as they were before this implementation.
- Static canvas scan `validation/static-scan-wave028-canvas-boundary.out` records only existing `CanvasWorldReadPort` internal traversal/realize calls and no selector/raw public seam regressions.
- `frontend/tests/unit/components/panels/threeViewShellBoundary.spec.ts` passed in focused validation and still guards ThreeView as a shell with overlay pointer ownership.
- Root/frontend e2e and live current UI contract smoke both passed, including `current-ui-contract.spec.ts` overlay pointer-boundary behavior.

## Validation log index

Required validation logs are under `architecture-audit/cycle-029-3d-presentation-dto-read-ports-and-realization-context-ownership/validation/`.

- Static scans:
  - `static-scan-selector-readmodel-leakage-post.out` — no forbidden selector/read-model leaks.
  - `static-scan-adapter-private-conversions.out` — allowed adapter-private domain conversion/caller-map evidence.
  - `static-scan-forbidden-facades.out` — no forbidden facade names.
  - `static-scan-wave028-canvas-boundary.out` — Wave 028 canvas boundary preservation scan.
- Focused Vitest:
  - `focused-vitest-final.out` — 4 files / 16 tests passed.
- Root/frontend lint:
  - `root-lint.out` — passed.
  - `frontend-lint.out` — passed.
- Full Vitest:
  - `root-full-vitest.out` / `.err` — passed, exit code 0.
  - `frontend-full-vitest.out` / `.err` — passed, exit code 0.
- Build:
  - `root-build.out` / `.err` — passed; Vite emitted only the pre-existing large chunk warning.
  - `frontend-build.out` / `.err` — passed; Vite emitted only the same large chunk warning.
- Playwright/e2e:
  - `root-e2e.out` — 10 passed.
  - `frontend-e2e.out` — 10 passed.
- Live preview / smoke:
  - `live-preview-refresh-probe-clean.out` — refreshed frontend Vite server bound on `0.0.0.0:5173`; both `127.0.0.1:5173` and `localhost:5173` returned HTTP 200.
  - `live-smoke-current-ui-contract-final.out` — live current UI contract smoke passed, 6 tests including render, canvas, coordinate status, and 3D overlay pointer ownership.
  - Earlier failed refresh/smoke attempts are retained (`live-preview-refresh-probe.out`, `live-smoke-current-ui-contract*.out`) as diagnostic evidence: they came from an initial npm argument forwarding mistake and a stale root Vite process, then were corrected by explicit process cleanup and workspace-server restart.
- Source-control evidence:
  - `post-diffstat.out` — path-scoped implementation diffstat.
  - `validation-file-index.out` — complete validation artifact index.

## Source-control reconciliation

- Path-scoped pre-change diff for `frontend/src/application/threePresentation`, `frontend/tests/unit/application/threePresentation`, and selected shell/e2e tests was empty.
- Known unrelated dirty files such as `frontend/src/domain/calculations/Intersections.ts` and `frontend/src/domain/processTree/ActionGroup.ts` were not read for implementation logic, edited, normalized, staged, or depended on.
- Source changes stayed inside the Cycle 029 approved 3D presentation/test surface plus this implementation log and validation artifacts.

## Residual risks / notes

- `Projected3DCanvasReadPort.ts` still intentionally exposes raw 3D realization data for the existing canvas selector seam; this file was not changed because the Cycle 029 decision protected Wave 028 canvas public contracts and scoped the DTO cleanup to 3D presentation read ports.
- Adapter modules still perform domain realization and style conversion, as intended. Future waves can consider whether a shared presentation geometry conversion utility is warranted, but no generic world/read-model facade should be introduced.
- The root/frontend build retains the existing Vite chunk-size warning; it is unrelated to this 3D read-port refactor.

## Next-wave candidate

After Cycle 029, the remaining architectural candidate is a focused cleanup of shared presentation geometry/style conversion duplication across 3D presentation adapters and canvas projection adapters, if the next scope-check confirms it can be done without creating a generic runtime/world facade or reopening canvas raw seams.
