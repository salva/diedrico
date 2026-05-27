# Cycle 028 Implementation Log — Canvas projection DTO selectors

## Scope and source-control reconciliation

Implemented the decision-selected Proposal Direct path from `decision.md`. Source changes were limited to the approved canvas-presentation and runtime transform-input scope plus focused tests:

- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts`
- `frontend/src/application/canvasPresentation/CanvasPresentationModel.ts`
- `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts`
- `frontend/src/application/canvasPresentation/Projected3DCanvasSelector.ts`
- `frontend/src/application/appShell/RuntimeSession.ts`
- `frontend/tests/unit/application/canvasPresentation/canvasWorldReadPort.spec.ts`
- `frontend/tests/unit/application/canvasPresentation/projected3DCanvasSelector.spec.ts`
- `frontend/tests/unit/application/appShell/Cycle027Architecture.test.ts`

Pre-edit scoped diff for the target implementation files was empty. Broad `git status` overflowed in this workspace as warned by the decision; no unrelated dirty source was reverted, staged, or incorporated. Known unrelated dirty files `frontend/src/domain/calculations/Intersections.ts` and `frontend/src/domain/processTree/ActionGroup.ts` were not read for implementation logic and were not modified by this task.

## Implementation summary

- Replaced the public `CanvasWorldReadPort` raw canvas selector contract with behavior-sized methods:
  - `getCanvasPlaneTransforms(): CanvasPlaneTransformModel[]`
  - `getPlaneCanvasItems(): CanvasPlaneCanvasItems[]`
  - `getProjected3DCanvasItems(planeTransforms): CanvasRenderItem[]`
- Added typed canvas DTOs in `CanvasPresentationModel.ts` for plane-owned realized items:
  - point DTOs carry element id, plane id, realized plane position, and point role.
  - line DTOs carry explicit canvas kind (`finite-segment`, `guide`, `sibling-guide`, `half-hinge-line`, `infinite-line`), plane geometry, and optional arc geometry.
  - circle DTOs carry realized center/radius data.
- Moved raw projection-plane traversal, per-plane `getAllPoints`/`getAllLines`/`getAllCircles`, visibility filtering, 2D realization, and line-kind classification behind the `CanvasWorldReadPort` adapter boundary.
- Reworked `CanvasPresentationSelector` so it consumes plane-item DTOs and retains only composition, style/render/query mapping, sorting, grid, and active-transform selection.
- Reworked `Projected3DCanvasSelector` to consume a behavior-sized `Projected3DCanvasReadPort` with projected source DTOs instead of the raw `CanvasWorldReadPort` collection/realization methods.
- Routed `RuntimeSession.getPlaneTransformsForInput()` through `canvasReadPort.getCanvasPlaneTransforms()` so rendering and input reuse the same transform DTO capability without changing `screenTo3D`, tool producers, move sessions, active-plane behavior, grid behavior, or viewport math.
- Updated focused tests and architecture guards to assert the new Cycle 028 boundary and the deletion of the stale raw public seams.

## Deletes and proofs

Deleted from the public canvas selector contract:

- `CanvasWorldReadPort.getAllProjectionPlanes()`
- `CanvasWorldReadPort.getAll3DPoints()`
- `CanvasWorldReadPort.getAll3DLines()`
- `CanvasWorldReadPort.getAll3DSegments()`
- `CanvasWorldReadPort.realizePoint2D()`
- `CanvasWorldReadPort.realizeLine2D()`
- `CanvasWorldReadPort.realizeCircle2D()`
- `CanvasWorldReadPort.realizePoint3D()`
- `CanvasWorldReadPort.realizeLine3D()`
- `CanvasWorldReadPort.realizeSegment3D()`
- public `CanvasWorldReadPort.isElementVisible()`; visibility is now internal to the adapter boundary.

Deleted from selector ownership:

- `CanvasPresentationSelector` no longer calls `readPort.getAllProjectionPlanes()`, `plane.getAllPoints()`, `plane.getAllLines()`, `plane.getAllCircles()`, or public `realize*` methods.
- `CanvasPresentationSelector` no longer performs domain `instanceof` classification.
- `Projected3DCanvasSelector` no longer depends on raw `CanvasWorldReadPort` 3D getters or public realization methods.
- Stale projected-3D selector mocks expecting raw canvas getter contracts were replaced with `Projected3DCanvasReadPort` DTO-source mocks.

Static proof logs:

- `validation/final-public-seam-scan.stdout.log` is empty, proving public raw canvas collection/realization signatures are absent from canvas-presentation source and focused tests.
- `validation/final-forbidden-facade-scan.stdout.log` contains only legitimate `CanvasWorldReadPort` type/module references; it found no `RuntimeWorld`, `WorldReadModel`, `WorldInjectionKey`, raw tool-world seams, or process-tree-shaped canvas seam in the scanned surfaces.
- `frontend/tests/unit/application/appShell/Cycle027Architecture.test.ts` now asserts both the Wave 027 process-tree deletion and the Cycle 028 raw-public-seam deletion.

## Retained residuals and rationale

- `ThreeWorldReadPort` was not changed. The decision explicitly preserved it as a residual boundary unless a tiny shared realization-context helper was proven necessary. The canvas implementation completed without needing that helper, so broad 3D scene/read-port redesign stayed out of scope.
- Internal adapter code in `CanvasWorldReadPort.ts` still traverses `World` and projection-plane collections and performs realization/classification. This is intentional: it is the behavior-sized adapter boundary that converts private concrete world state into canvas DTOs. These methods are not public canvas selector seams.
- `CanvasVisibilityPolicy.ts` remains unchanged. Visibility process-tree access is still not exposed through canvas presentation selectors; visibility resolution remains internal to the read-port adapter boundary.

## Validation log index

All logs are under `architecture-audit/cycle-028-canvas-projection-dto-selectors/validation/`.

### Source and static scans

- `pre-scan-canvas-seams.stdout.log` / `.stderr.log` — pre-change seam inventory.
- `post-scan-protected-seams.stdout.log` / `.stderr.log` — post-change broad seam scan; remaining hits are internal adapter/runtime residuals, not public selector seams.
- `final-public-seam-scan.stdout.log` / `.stderr.log` — final public raw seam scan; stdout empty.
- `final-forbidden-facade-scan.stdout.log` / `.stderr.log` — final forbidden facade/invariant scan; only legitimate `CanvasWorldReadPort` names remain.

### Lint / architecture tests

- `root-lint.stdout.log` / `.stderr.log` — `npm run lint` at root: PASS.
- `frontend-lint.stdout.log` / `.stderr.log` — `npm run lint` in `frontend/`: PASS.

### Focused Vitest

- `focused-vitest-canvas.stdout.log` / `.stderr.log` — focused canvas DTO/read-port selector tests: PASS.
- `focused-vitest-final.stdout.log` / `.stderr.log` — focused canvas presentation/query tests: PASS.
- `focused-vitest-post-arch-guard.stdout.log` / `.stderr.log` — focused architecture guard plus canvas tests after stale guard update: PASS.

Earlier exploratory failed logs retained for provenance:

- `focused-vitest-initial.*` — root-relative test path mismatch; no source failure.
- `focused-vitest-frontend.*` — expected stale projected-3D mock failure after API deletion; fixed by updating test to new DTO read-port.
- `root-vitest-full.stdout.log` and `root-vitest-full-rerun.stdout.log` — stale Cycle 027 architecture guard expected raw residuals that Cycle 028 intentionally deletes; fixed by updating the guard.

### Full Vitest

- `root-vitest-full-final.stdout.log` / `.stderr.log` — `npm run test` at root: PASS (exitCode 0; expected diagnostic stderr from existing tests only).
- `frontend-vitest-full-final.stdout.log` / `.stderr.log` — `npm run test` in `frontend/`: PASS (exitCode 0; expected diagnostic stderr from existing tests only).

### Build

- `root-build.stdout.log` / `.stderr.log` — `npm run build` at root: PASS.
- `frontend-build-final.stdout.log` / `.stderr.log` — `npm run build` in `frontend/`: PASS.
- Earlier successful build logs (`frontend-build-initial.*`, `frontend-build-after-dto.*`) are retained as compile/type-check provenance.

### E2E / Playwright / overlay pointer boundary

- `root-e2e.stdout.log` / `.stderr.log` — `npm run test:e2e` at root: PASS, 10/10 Playwright tests. Includes `current-ui-contract.spec.ts` overlay pointer-boundary regression: `3D overlay owns pointer interaction and does not pass drag gestures through to the 2D canvas`.
- `frontend-e2e.stdout.log` / `.stderr.log` — `npm run test:e2e` in `frontend/`: PASS, 10/10 Playwright tests with the same overlay pointer-boundary coverage.

### Live preview / reachability

- `live-preview-probe-rerun.stdout.log` / `.stderr.log` — HTTP reachability probe returned `HTTP/1.1 200 OK` from `http://127.0.0.1:5173/`.
- A preview refresh command using the required `0.0.0.0:5173` host/port was attempted. The first combined command exited early because the shell `pkill` pattern matched the wrapping command; the follow-up start command's PID redirection path was malformed, but the reachability probe confirms a Diedrico Vite preview/dev server was already answering on port 5173. No preview tooling or package scripts were changed.


## Reviewer-blocker correction — projected-3D adapter boundary

A follow-up correction moved the projected-3D raw `World` traversal out of `CanvasWorldReadPort.ts` into a dedicated behavior-named adapter module:

- Added `frontend/src/application/canvasPresentation/Projected3DCanvasReadPort.ts` with `createProjected3DCanvasReadPort(world, realizationContext)`. This module is now the only canvas-presentation boundary that performs the projected-3D all-plane/all-3D traversal and converts raw world state into the `Projected3DCanvasReadPort` DTO source contract.
- Updated `CanvasWorldReadPort.ts` so `getProjected3DCanvasItems()` delegates to `Projected3DCanvasSelector.selectWorldProjection(createProjected3DCanvasReadPort(...), planeTransforms)` instead of constructing raw 3D source DTOs inline. `CanvasWorldReadPort` remains the canvas-facing composition boundary, but no longer owns projected-3D raw getter traversal.
- Strengthened `frontend/tests/unit/application/appShell/Cycle027Architecture.test.ts` to assert `CanvasWorldReadPort.ts` has no `world.getAll3DPoints()`, `world.getAll3DLines()`, or `world.getAll3DSegments()` calls and that the raw projected-3D traversal is localized in `Projected3DCanvasReadPort.ts`.

Correction validation logs:

- `validation/t3-projected3d-boundary-scan.stdout.log` / `.stderr.log` — confirms the 3D raw getter traversal is absent from `CanvasWorldReadPort.ts` and present only in the new projected-3D adapter boundary; remaining `CanvasWorldReadPort` projection-plane traversal is the already documented 2D plane-item/transform adapter residual.
- `validation/t3-focused-vitest.stdout.log` / `.stderr.log` — `npm run test -- --run tests/unit/application/canvasPresentation/projected3DCanvasSelector.spec.ts tests/unit/application/canvasPresentation/canvasWorldReadPort.spec.ts tests/unit/application/appShell/Cycle027Architecture.test.ts` from `frontend/`: PASS, 3 files / 7 tests.
- `validation/t3-frontend-build.stdout.log` / `.stderr.log` — `npm run build` from `frontend/`: PASS; only existing Vite chunk-size warning.
- `validation/t3-live-preview-refresh.stdout.log` / `.stderr.log` plus `t3-live-preview-server.*` — refreshed Vite dev server with `--host 0.0.0.0 --port 5173`; reachability probe to `http://127.0.0.1:5173/` returned `HTTP/1.1 200 OK`.

## Behavior verification

- Focused canvas tests verify render/query DTO generation and plane transform availability through `createCanvasWorldReadPort`.
- Projected-3D focused test verifies projected point render DTO generation through the new `Projected3DCanvasReadPort` source DTO contract.
- Full Playwright e2e verifies app shell rendering, point creation, active-plane selector behavior, selection masks, 3D coordinate status, keyboard shortcuts, project chooser credential-free behavior, and the 3D overlay pointer-boundary regression.

## Residual risks

- `CanvasPresentationSelector` now owns DTO-to-style/render/query mapping and includes a small local point DTO style function to avoid domain `instanceof` in the selector. Future work can split styling into DTO-native style policy helpers, but this was not necessary for Cycle 028 and would be style-policy cleanup rather than raw seam deletion.
- Internal `CanvasWorldReadPort` uses `point.constructor.name` to classify free vs dependent point role at the adapter boundary. This is less ideal than an explicit domain predicate but keeps classification localized inside the permitted adapter boundary and avoids selector/domain leakage.
- `ThreeWorldReadPort` remains a documented residual boundary for a future 3D scene/read-port extraction wave.

## Next-wave candidates

- DTO-native canvas style policy extraction so selectors do not need any casted domain-shaped style inputs.
- Narrow `ThreeWorldReadPort` scene DTO generation behind smaller behavior-specific selectors once canvas presentation seams are stable.
- Consider a tiny typed realization-context factory only if both canvas and 3D boundaries converge on duplicated context assembly in a future reviewed wave.

## Validation/preview closure — Wave 028 COMPLETE

**Status: Wave 028 COMPLETE.** Closure verification was performed in `cycle-028-validation-and-preview-refresh` without production source refactoring, package/tooling edits, backend/docs/specs changes, persistence/command-history changes, broad realization redesign, or next-wave implementation.

### Closure validation evidence

Fresh closure logs are under `architecture-audit/cycle-028-canvas-projection-dto-selectors/validation/`:

- `t3-closure-static-seam-scan-rerun.stdout.log` / `.stderr.log` — PASS. `CanvasWorldReadPort.ts` contains no `world.getAll3DPoints()`, `world.getAll3DLines()`, or `world.getAll3DSegments()` calls; projected-3D raw traversal is localized in `Projected3DCanvasReadPort.ts`; `CanvasPresentationSelector.ts` and `Projected3DCanvasSelector.ts` contain no raw plane/world getter loops. Hits for public seam names are deletion assertions in tests and internal adapter-owned 2D/3D traversal, not public selector seams.
- `t3-closure-protected-invariant-scan-rerun.stdout.log` / `.stderr.log` — PASS with expected legitimate `CanvasWorldReadPort` references only. No generic `RuntimeWorld`, `WorldReadModel`, `WorldInjectionKey`, app-kernel facade, raw tool-world seam, or process-tree-shaped canvas visibility regression was introduced. Protected unrelated files were checked by metadata only.
- `t3-closure-focused-vitest.stdout.log` / `.stderr.log` — PASS, 3 files / 7 tests: `projected3DCanvasSelector.spec.ts`, `canvasWorldReadPort.spec.ts`, and `Cycle027Architecture.test.ts`.
- `t3-closure-root-lint.stdout.log` / `.stderr.log` — PASS, root `npm run lint`.
- `t3-closure-frontend-lint.stdout.log` / `.stderr.log` — PASS, frontend `npm run lint`.
- `t3-closure-root-vitest.stdout.log` / `.stderr.log` — PASS, root `npm run test`: 113 files passed, 1 skipped; 1278 tests passed, 45 skipped, 11 todo. Existing diagnostic stderr from infeasible geometry/auth/error-path tests remains non-failing.
- `t3-closure-frontend-vitest.stdout.log` / `.stderr.log` — PASS, frontend `npm run test`: same passing suite counts as root workspace run.
- `t3-closure-root-build.stdout.log` / `.stderr.log` — PASS, root `npm run build`; only existing Vite chunk-size warning.
- `t3-closure-frontend-build.stdout.log` / `.stderr.log` — PASS, frontend `npm run build`; only existing Vite chunk-size warning.
- `t3-closure-root-e2e.stdout.log` / `.stderr.log` — PASS, root `npm run test:e2e`: 10/10 Playwright tests passed, including `3D overlay owns pointer interaction and does not pass drag gestures through to the 2D canvas`.
- `t3-closure-frontend-e2e.stdout.log` / `.stderr.log` — PASS, frontend `npm run test:e2e`: 10/10 Playwright tests passed with the same overlay pointer-boundary coverage.
- `t3-closure-live-preview-confirm.stdout.log` / `.stderr.log` and `t3-closure-live-preview-probe.stdout.log` — PASS. A dev server was listening on `0.0.0.0:5173` (`ss` reported `LISTEN 0.0.0.0:5173`) and `curl -I http://127.0.0.1:5173/` returned `HTTP/1.1 200 OK`.

Two early closure scan/preview attempts are retained as harness/shell-command provenance and superseded by green reruns: `t3-closure-static-seam-scan.*` and `t3-closure-protected-invariant-scan.*` failed because `/bin/sh` did not support `set -o pipefail`; `t3-closure-live-preview-refresh.*` exited early due to process matching. The green `*-rerun` scans and `t3-closure-live-preview-confirm.*` are the authoritative closure evidence.

### 3D interaction regression evidence

The user-reported 3D view interaction regression remains fixed by CLI Playwright evidence. Both root and frontend e2e runs passed `frontend/tests/e2e/current-ui-contract.spec.ts`, including the overlay pointer-boundary test that drags/clicks the 3D overlay and verifies the gesture does not pass through to move paper/canvas state. MCP/browser manual tooling was not available in this coder toolset, so the accepted residual is that verification is CLI Playwright rather than MCP live interaction; the live preview was separately confirmed reachable on `0.0.0.0:5173`.

### Protected-surface/source-control reconciliation

- No source files were modified during validation closure.
- `frontend/src/domain/calculations/Intersections.ts` and `frontend/src/domain/processTree/ActionGroup.ts` remain unrelated dirty files from outside Cycle 028; closure checked only metadata/status and did not read, revert, stage, or incorporate their contents.
- Persistence schema/replay, backend/docs/specs/package/auth/provider/env files, command history/producer redesign, broad realization redesign, UI feature work, app-kernel facade work, and `ThreeWorldReadPort.ts` source were not touched.
- Broad `git status` remains unsuitable in this workspace because it can overflow; scoped status/diff evidence is captured in `t3-closure-scoped-status.stdout.log` and `t3-closure-scoped-diffstat.stdout.log`.

### Final residual risks and next-wave recommendation

Wave 028 leaves no blocking validation or preview issue. Remaining architecture candidates should be handled only through the next reviewed wave/design process, not in this closure stage:

1. Highest centrality remains the ordered plan’s next unclosed central wave work; reread `architecture-audit/wave-plan.md` and the separate next-wave recommendation artifact before opening the next cycle.
2. Cycle 028-specific residuals are candidates for a future presentation wave: DTO-native canvas style policy extraction, narrower `ThreeWorldReadPort` scene DTO/read-port ownership, and a tiny typed realization-context factory only if future evidence shows duplicated context assembly across canvas/3D boundaries.
3. The unrelated dirty `Intersections.ts` and `ActionGroup.ts` files should stay protected unless a future reviewed wave explicitly scopes them.
