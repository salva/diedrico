# Cycle 029 Implementation Log — 3D presentation DTO read ports and realization-context ownership

## Status

Completed implementation of the decision-selected direct path. No user-visible behavior change is intended. This log was corrected after implementation review to align the changed-file and delete/proof narratives with the actual committed Cycle 029 stage changes.

## Source-control hygiene

- Inspected `decision.md`, `proposal-direct.md`, and `reviews/round-01-review.md` before editing.
- Path-scoped diff for Cycle 029 target source/test files was empty before implementation edits.
- Broad `git status` overflowed in this workspace, so subsequent evidence used path-scoped diff/status logs.
- Protected unrelated dirty files, including `frontend/src/domain/calculations/Intersections.ts` and `frontend/src/domain/processTree/ActionGroup.ts`, were not read for implementation logic, changed, staged, or depended on.
- Evidence:
  - `validation/pre-status-and-diff.log`
  - `validation/post-diffstat.log`

## Files changed by the Cycle 029 implementation

Production source:

- `frontend/src/application/threePresentation/ThreePresentationAdapter.ts` — added the focused adapter-private 3D presentation boundary owning concrete `World` traversal and shared realization-context assembly.
- `frontend/src/application/threePresentation/ThreeWorldReadPort.ts` — now builds one `ThreePresentationAdapter` and passes it into concern read-port factories; public exports remain behavior-sized named read ports.
- `frontend/src/application/threePresentation/ThreeProjectionPlaneReadPort.ts` — consumes the adapter instead of concrete `World`; returns DTO-native projection-plane source models with surface, basis, grid, and auxiliary-axis data.
- `frontend/src/application/threePresentation/ThreePlanarElementReadPort.ts` — consumes the adapter/shared realization context and converts planar point/line/segment/circle realizations into lifted DTO source geometry.
- `frontend/src/application/threePresentation/ThreeReconstructedElementReadPort.ts` — consumes adapter methods and converts reconstructed point/line/segment/plane realizations into DTO source geometry.
- `frontend/src/application/threePresentation/ThreeGuideReadPort.ts` — consumes adapter methods/shared realization context and returns selected-guide plane geometry plus intersection source DTOs.
- `frontend/src/application/threePresentation/ThreeHingeReadPort.ts` — consumes adapter methods/shared realization context and returns hinge start/end DTO source geometry.
- `frontend/src/application/threePresentation/ThreeRealizationContext.ts` — exports the narrow `ThreeRealizationContext` type used by the adapter and 3D concern read ports.
- `frontend/src/application/threePresentation/ThreePresentationReadModel.ts` — replaced the old selector-facing realization/style carrier read models with DTO-native source contracts.
- `frontend/src/application/threePresentation/ThreeStylePolicy.ts` — added DTO-style visibility helpers used by selectors after domain style conversion moved behind read ports.
- `frontend/src/application/threePresentation/ProjectionPlane3DSelector.ts` — updated selector orchestration to consume projection-plane DTO source models instead of projection-plane/plane realization objects.
- `frontend/src/application/threePresentation/PlanarElement3DSelector.ts` — updated selector orchestration to consume planar DTO source models instead of 2D realization objects or segment classification from raw read models.
- `frontend/src/application/threePresentation/ReconstructedElement3DSelector.ts` — updated selector orchestration to consume reconstructed DTO source models instead of 3D realization objects.
- `frontend/src/application/threePresentation/Guide3DSelector.ts` — updated selector orchestration to consume selected-guide and intersection DTO source models instead of guide/projection realization objects.
- `frontend/src/application/threePresentation/Hinge3DSelector.ts` — updated selector orchestration to consume hinge DTO source models instead of hinge realization objects.

Tests:

- `frontend/tests/unit/application/threePresentation/threePresentationArchitectureBoundary.spec.ts` — guards the adapter-private traversal owner, DTO-native selector/read-model boundary, Wave 028 canvas raw-seam preservation, and forbidden generic facade names.
- `frontend/tests/unit/application/threePresentation/threePresentationConcernSelectors.spec.ts` — updated selector mocks/assertions to use DTO-native read-port sources rather than raw realization/style carriers.
- `frontend/tests/unit/application/threePresentation/threePresentationSelector.spec.ts` — updated aggregate selector tests to use the narrowed DTO-native read-port contracts.

Validation/log artifacts:

- Files under `architecture-audit/cycle-029-3d-presentation-dto-read-ports-and-realization-context-ownership/validation/` were captured for static scans, focused/full tests, lint, builds, e2e, and preview reachability.
- `validation/live-preview-server.out` changed during the implementation stage because the existing preview server emitted hot-reload / Playwright-report output while validation ran.

Files intentionally not changed:

- `frontend/src/application/appShell/RuntimeSession.ts`, `frontend/src/application/appShell/RuntimeViewPorts.ts`, `frontend/src/components/panels/ThreeView.vue`, `frontend/src/application/canvasPresentation/Projected3DCanvasReadPort.ts`, `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts`, and `frontend/src/services/Element2DRenderer3D.ts` were not changed by the implementation.
- `frontend/src/services/Element2DRenderer3D.ts` was referenced in the stage prompt but is absent from the current tree and was not recreated.

## DELETE / proof list

- Selector-facing raw 3D realization/style leakage: deleted/replaced. The old read-model contracts in `ThreePresentationReadModel.ts` and concern read ports no longer expose selector-facing `realization`, `planeRealization`, or domain `visualStyle` carriers; selector modules now consume DTO-native ids, kinds, primitive geometry, visibility, and `ThreeStyleDto` values.
- `ThreeEntityPresentationData` as a `VisualStyle` carrier: deleted/replaced in `ThreePresentationReadModel.ts`; DTO source models carry `style: ThreeStyleDto` and `visible` state instead.
- Domain realization imports from selector-facing 3D read-model type definitions: deleted from public selector/read-model contracts. Remaining realization type imports are localized to adapter/read-port conversion modules and are recorded in `validation/static-scans.log` under the adapter-private conversion scan.
- Public fields named `realization`, `planeRealization`, and domain `visualStyle` in 3D read ports: deleted/replaced by DTO source geometry/style fields.
- Selector-facing `instanceof` classification: deleted from selectors. Remaining `AuxiliaryProjectionPlane` / `Segment2DByPoints` checks are inside read-port conversion code, not selector-facing contracts.
- Repeated raw world traversal/context construction: deleted/replaced. `ThreeWorldReadPort.ts` now creates one `ThreePresentationAdapter`; individual concern read ports consume that adapter rather than each receiving concrete `World`.
- Dual raw/DTO paths and compatibility wrappers: not introduced. The implementation replaced old raw public seams instead of keeping parallel raw and DTO read models.
- `getProjectionPlaneGridSource()`: proven inapplicable/already absent before this implementation attempt and remains absent. Grid segments are carried on projection-plane DTO source models.
- Stale tests/mocks asserting raw realization/style seams: replaced in the touched 3D presentation selector tests with DTO-native mocks and architecture-boundary assertions.

## Adapter-private residual conversion / caller map

Allowed domain conversion remains private to the 3D presentation adapter/read-port implementation:

- `ThreePresentationAdapter.ts` owns concrete `World` traversal and realization lookup methods.
- `ThreeProjectionPlaneReadPort.ts` converts projection-plane and plane realizations into surface/grid/axis DTO source fields.
- `ThreePlanarElementReadPort.ts` converts 2D element realizations into lifted 3D point/line/segment/circle DTO source fields; `Segment2DByPoints instanceof` remains private here.
- `ThreeReconstructedElementReadPort.ts` converts 3D point/line/segment/plane realizations into reconstructed source DTOs.
- `ThreeGuideReadPort.ts` converts selected guide and 3D intersection candidate realizations into DTO source geometry.
- `ThreeHingeReadPort.ts` converts hinge-line realization into start/end source geometry.

Selectors consume only DTO read-port outputs. `ThreeView.vue` was not changed and remains a shell over the presentation port/runtime.

## Protected-surface checks

- No command producers/history, persistence/replay/schema, command descriptors, `OperationRegistry`, Drive/auth, backend, docs/specs, package/tooling, UI feature, app-shell production composition, canvas public contract, or domain realization semantic changes were made.
- Wave 028 canvas DTO boundary scans remain clean: `validation/static-scans.log` reports no canvas raw seam regression.
- Forbidden broad facade scan remains clean for `RuntimeWorld`, `WorldReadModel`, `SceneKernel`, `PresentationWorld`, and `getWorld(...)`.

## Validation log index

All implementation validation commands were captured under `validation/`.

- Static scans: `static-scans.log`, `static-scans.stdout.log`, `static-scans.stderr.log` — PASS; selector/read-model forbidden scan empty; adapter-private conversion localized; no broad facade/canvas raw seam hits.
- Focused 3D presentation Vitest: `focused-three-presentation.stdout.log`, `focused-three-presentation.stderr.log` — PASS, 3 files / 14 tests.
- Initial focused run: `focused-three-presentation-initial.*` — FAIL due to an outdated architecture-boundary expectation; fixed by updating the test to assert adapter-owned traversal.
- Root lint: `root-lint.stdout.log`, `root-lint.stderr.log` — PASS.
- Frontend lint: `frontend-lint.stdout.log`, `frontend-lint.stderr.log` — PASS.
- Frontend full Vitest: `frontend-full-vitest.stdout.log`, `frontend-full-vitest.stderr.log` — PASS.
- Root full Vitest: `root-full-vitest.stdout.log`, `root-full-vitest.stderr.log` — PASS.
- Frontend build: `frontend-build.stdout.log`, `frontend-build.stderr.log` — PASS with existing Vite chunk-size warning.
- Initial frontend build: `frontend-build-initial.*` — FAIL due to missing exported `ThreeRealizationContext` type; fixed by exporting the type.
- Root build: `root-build.stdout.log`, `root-build.stderr.log` — PASS with existing Vite chunk-size warning.
- Root e2e: `root-e2e.stdout.log`, `root-e2e.stderr.log` — PASS, 10 Playwright tests including `current-ui-contract.spec.ts` overlay pointer ownership.
- Frontend e2e: `frontend-e2e.stdout.log`, `frontend-e2e.stderr.log` — PASS, 10 Playwright tests including overlay pointer ownership.
- Live preview reachability: `live-preview-reachability.stdout.log`, `live-preview-reachability.stderr.log` — PASS, HTTP 200 from `http://127.0.0.1:5173/`.
- Live preview server output: `live-preview-server.out` — existing Vite server on `0.0.0.0:5173` hot-reloaded changed 3D presentation modules and Playwright report writes.

No production code or tests were changed by the later log-correction task, so no additional behavioral validation was required for that correction beyond source-control inspection of the documentation-only diff.

## Preview/live evidence

The existing live preview server on `0.0.0.0:5173` remained running. It hot-reloaded the changed 3D presentation files, and `curl` reachability returned HTTP 200 for `http://127.0.0.1:5173/`. Playwright e2e exercised the live frontend contract, including 3D overlay pointer-boundary behavior plus representative canvas/tool/undo flows.

## Residual risks

- Some domain realization and `VisualStyle` access remains inside private adapter/read-port conversion code by design; static scans intentionally distinguish this from forbidden selector/read-model exports.
- Vite reports the pre-existing chunk-size warning during builds; this is not attributable to Cycle 029 and was not addressed because package/tooling/performance changes are out of scope.

## Next-wave candidates

- A future wave can further split style mapping so `ThreeStylePolicy.ts` no longer imports `VisualStyle`, but this should be scoped separately because current imports are adapter-private conversion support rather than selector-facing leakage.
- A future wave can evaluate whether final 3D renderer DTOs should absorb the remaining thin selector orchestration, if that improves the presentation layer without introducing a generic scene/world facade.
