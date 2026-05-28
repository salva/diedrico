# Cycle 029 Implementation Log — 3D presentation DTO read ports and realization-context ownership

## Status

Completed implementation of the decision-selected direct path. No user-visible behavior change is intended.

## Source-control hygiene

- Inspected `decision.md`, `proposal-direct.md`, and `reviews/round-01-review.md` before editing.
- Path-scoped diff for Cycle 029 target source/test files was empty before edits.
- Broad `git status` overflowed in this workspace, so subsequent evidence used path-scoped diff/status logs.
- Protected unrelated dirty files, including `frontend/src/domain/calculations/Intersections.ts` and `frontend/src/domain/processTree/ActionGroup.ts`, were not read for implementation logic, changed, staged, or depended on.
- Evidence:
  - `validation/pre-status-and-diff.log`
  - `validation/post-diffstat.log`

## Files changed

Production:

- `frontend/src/application/threePresentation/ThreePresentationAdapter.ts` — new focused adapter-private 3D presentation boundary owning concrete `World` traversal and shared realization-context assembly.
- `frontend/src/application/threePresentation/ThreeWorldReadPort.ts` — now builds one `ThreePresentationAdapter` and passes it into concern read-port factories; public exports remain behavior-sized DTO read ports.
- `frontend/src/application/threePresentation/ThreeProjectionPlaneReadPort.ts` — consumes the adapter instead of concrete `World`; projection-plane realization/grid conversion remains adapter-private/read-port-private and returns DTO-native models.
- `frontend/src/application/threePresentation/ThreePlanarElementReadPort.ts` — consumes the adapter/shared realization context; no repeated `World` traversal/context construction.
- `frontend/src/application/threePresentation/ThreeReconstructedElementReadPort.ts` — consumes adapter methods for reconstructed DTO source conversion.
- `frontend/src/application/threePresentation/ThreeGuideReadPort.ts` — consumes adapter methods/shared realization context for selected guide and intersection source DTOs.
- `frontend/src/application/threePresentation/ThreeHingeReadPort.ts` — consumes adapter methods/shared realization context for hinge DTO source conversion.
- `frontend/src/application/threePresentation/ThreeRealizationContext.ts` — exports the narrow `ThreeRealizationContext` type used by the adapter.

Tests:

- `frontend/tests/unit/application/threePresentation/threePresentationArchitectureBoundary.spec.ts` — guards the new adapter-private traversal owner, keeps selectors/read models DTO-native, preserves Wave 028 canvas raw-seam checks, and scans for forbidden generic facades.

Validation/log artifacts:

- Files under `architecture-audit/cycle-029-3d-presentation-dto-read-ports-and-realization-context-ownership/validation/` were captured for static scans, focused/full tests, lint, builds, e2e, and preview reachability.

## DELETE / proof list

- Selector-facing raw 3D realization/style leakage: removed/proven absent. `ThreePresentationReadModel.ts` and selector modules expose DTO-native ids, kinds, primitive geometry, visibility, and `ThreeStyleDto` only. `validation/static-scans.log` has an empty selector/read-model forbidden scan.
- Broad public 3D raw traversal/read-port surfaces: replaced. `ThreeWorldReadPort.ts` no longer creates five independent world-backed sub-ports; it creates one focused `ThreePresentationAdapter` and public consumers still receive named concern read ports.
- Dual raw/DTO paths and compatibility wrappers: not introduced. No `ThreeEntityPresentationData`, raw `realization`, `planeRealization`, or public `visualStyle` carriers remain in selector-facing models.
- Repeated context construction: removed from planar/guide/hinge sub-ports; one adapter-built realization context is shared.
- `getProjectionPlaneGridSource()`: already absent before this attempt and remains absent. Grid segments are carried on `ThreeProjectionPlaneSourceDto`.
- Stale tests/mocks asserting raw realization/style seams: replaced by DTO-native selector and architecture-boundary tests.

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

All commands were captured under `validation/`.

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

## Preview/live evidence

The existing live preview server on `0.0.0.0:5173` remained running. It hot-reloaded the changed 3D presentation files, and `curl` reachability returned HTTP 200 for `http://127.0.0.1:5173/`. Playwright e2e exercised the live frontend contract, including 3D overlay pointer-boundary behavior plus representative canvas/tool/undo flows.

## Residual risks

- Some domain realization and `VisualStyle` access remains inside private adapter/read-port conversion code by design; static scans intentionally distinguish this from forbidden selector/read-model exports.
- Vite reports the pre-existing chunk-size warning during builds; this is not attributable to Cycle 029 and was not addressed because package/tooling/performance changes are out of scope.

## Next-wave candidates

- A future wave can further split style mapping so `ThreeStylePolicy.ts` no longer imports `VisualStyle`, but this should be scoped separately because current imports are adapter-private conversion support rather than selector-facing leakage.
- A future wave can evaluate whether final 3D renderer DTOs should absorb the remaining thin selector orchestration, if that improves the presentation layer without introducing a generic scene/world facade.
