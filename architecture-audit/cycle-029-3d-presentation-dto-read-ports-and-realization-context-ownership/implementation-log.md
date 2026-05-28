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

## Final closure verification — validation and preview stage

Closure timestamp (UTC): 2026-05-28T05:59:18Z.

This validation/preview closure independently re-read `decision.md`, this implementation log, Cycle 029 validation artifacts, the 3D presentation source boundary, protected Wave 028 canvas read-port files, and `architecture-audit/wave-plan.md`. No production source, package/tooling, backend/docs/spec, persistence/command, Drive/auth, rendering/CSS, or UI-feature changes were made during closure.

### Closure evidence written

- `validation/closure-scoped-status-diff.stdout.log` / `.stderr.log` — path-scoped source-control evidence for Cycle 029 artifacts, 3D presentation targets, protected canvas/ThreeView files, e2e contract, wave plan, and this worker report path.
- `validation/closure-verification.stdout.log` / `.stderr.log` — consolidated validation-log presence check, validation pass-marker scan, static boundary scans, live-preview process check, and fresh HTTP reachability probe.
- `validation/closure-verification-summary.stdout.log` / `.stderr.log` — concise summary proving no `MISSING`/`FORBIDDEN` closure scan hits and showing HTTP 200 reachability.
- `validation/closure-wave-plan-scan.stdout.log` / `.stderr.log` and `validation/closure-post-029-wave-headings.stdout.log` / `.stderr.log` — re-read evidence for next-wave recommendation.

### Independent decision/scope match

Closure confirms the implementation followed the Cycle 029 decision-selected direct path:

- `ThreePresentationAdapter.ts` is the focused private owner for concrete `World` traversal and shared 3D realization-context assembly.
- `ThreeWorldReadPort.ts` now constructs one adapter and wires named concern read ports rather than exporting a generic world-like read facade.
- `ThreePresentationReadModel.ts` exposes DTO-native source contracts: ids, discriminated kinds, primitive geometry, visibility, and `ThreeStyleDto` style data.
- 3D selectors consume DTO source models and do not import selector-facing domain realization/style carriers.
- `ThreeView.vue` remains a shell over `ThreePresentationPort` / `ThreeViewRuntime`; it was not redesigned and has no concrete `World` import/injection.
- Wave 028 canvas DTO boundaries remain protected; closure scans found no reintroduced canvas process-tree/world/realization-context seam.

No broadening was observed into command producers/history, persistence schema/replay, command descriptors/serialization, `OperationRegistry`, Drive/auth, backend/docs/specs/package-tooling, validation-platform work, UI features, app-shell production composition redesign, broad domain-realization redesign, package/tooling churn, or DTO-native canvas style cleanup outside the selected 3D scope.

### Mandatory validation evidence status

All required Cycle 029 validation evidence is present and green:

- Static scans: `validation/static-scans.log` and closure scan — PASS; selector/read-model forbidden scan empty; adapter-private conversion localized; no broad facade or Wave 028 canvas raw seam regression.
- Root lint: `validation/root-lint.stdout.log` — PASS.
- Frontend lint: `validation/frontend-lint.stdout.log` — PASS.
- Focused 3D presentation Vitest: `validation/focused-three-presentation.stdout.log` — PASS, 3 files / 14 tests.
- Root full Vitest: `validation/root-full-vitest.stdout.log` — PASS.
- Frontend full Vitest: `validation/frontend-full-vitest.stdout.log` — PASS.
- Root build: `validation/root-build.stdout.log` — PASS with the previously noted Vite chunk-size warning.
- Frontend build: `validation/frontend-build.stdout.log` — PASS with the previously noted Vite chunk-size warning.
- Root e2e/Playwright: `validation/root-e2e.stdout.log` — PASS, 10 tests including `current-ui-contract.spec.ts` overlay pointer ownership.
- Frontend e2e/Playwright: `validation/frontend-e2e.stdout.log` — PASS, 10 tests including `current-ui-contract.spec.ts` overlay pointer ownership.
- Credential-free current UI smoke against the live app: `validation/live-smoke-current-ui-contract-final.out` — PASS, 6 current UI contract tests including 3D overlay pointer-boundary behavior.

No source-attributable validation failure remains. Earlier failed focused/build attempts are already documented above as implementation-time test/type adjustments and were followed by green final validation.

### Live preview closure

The live preview server remained running from `validation/live-preview-server.pid` on `0.0.0.0:5173`. Closure performed a fresh reachability probe to `http://127.0.0.1:5173/` and recorded `HTTP/1.1 200 OK` in `validation/closure-verification.stdout.log`; the prior final refresh probe also recorded `HTTP/1.1 200 OK` in `validation/live-preview-refresh-probe-final.out`. Credential-free Playwright smoke evidence is recorded in `validation/live-smoke-current-ui-contract-final.out`.

### Source-control reconciliation

Path-scoped closure status/diff was used because broad workspace status can overflow in this repository. The scoped diffstat for Cycle 029 source targets was empty at closure time. The scoped status showed untracked Cycle 029 `critique/` and `reviews/` audit artifacts as pre-existing review evidence; closure did not revert, normalize, or incorporate unrelated dirty files. Protected unrelated dirty source files named by the decision remained untouched.

Closure added only audit/validation/report evidence:

- this final closure section in `implementation-log.md`;
- closure validation logs under `validation/`;
- the required worker report JSON under `.saivage/stages/.../reports/`.

### Residual risks and next-wave recommendation

Wave 029 is complete. The remaining residuals are intentionally outside Cycle 029: `ThreeStylePolicy.ts` still converts private domain `VisualStyle` into DTO style, and `CanvasPresentationSelector` still has DTO-to-style/primitive cleanup opportunities already lower-priority than the just-closed 3D read-port boundary.

Re-reading `architecture-audit/wave-plan.md` shows no Wave 030 entry after Wave 029. The precise next stage should therefore be a reviewed wave-plan extension/fresh-scout stage, tentatively `cycle-030-wave-plan-extension-post-029`, to rank the next central residual from current evidence. Recommended candidates to scout first are: DTO-native canvas/3D style-policy cleanup, persistence adapter DTO-cast cleanup, and any remaining presentation selector orchestration cleanup. Do not proceed directly to implementation until that Wave 030 scope is designed and reviewed.
