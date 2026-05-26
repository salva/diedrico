# Cycle 016 Implementation Log — Canvas presentation read ports and overlay interaction boundary

## Selected path and scope

Implemented the decision-selected direct path from `proposal-direct.md`. No restructure/shared presentation snapshot layer was introduced. The work stayed within the decision-authorized canvas presentation, overlay boundary, focused tests, validation, and implementation-log surfaces.

## Source files changed

- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts` — added the narrow canvas read port and `createCanvasWorldReadPort(world)` adapter. The selector/controller consume this port instead of accepting a concrete full `World` API.
- `frontend/src/application/canvasPresentation/Projected3DCanvasSelector.ts` — moved projected 3D-on-2D render DTO construction out of `CanvasPresentationSelector` into a named adapter.
- `frontend/src/application/canvasPresentation/CanvasPresentationController.ts` — changed `buildModel` to accept `CanvasWorldReadPort`.
- `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts` — changed `select` to accept `CanvasWorldReadPort`, removed `any` helper signatures and the inline `projected3D` loop, typed arc-geometry access, and kept 2D traversal/style/query ownership local.
- `frontend/src/application/canvasPresentation/CanvasVisibilityPolicy.ts` — narrowed the visibility dependency to a read-only process-tree capability used by the read port.
- `frontend/src/components/workspace/SvgCanvas.vue` — wraps the injected runtime `World` with `createCanvasWorldReadPort(world)` at the canvas presentation boundary; existing tool/command interactions remain unchanged and in scope.
- `frontend/src/domain/presentation/Paper.ts` — deleted the unused mutable `Paper` collection/query state and stale `HitResult`, leaving only primitive/style/viewport DTO types used by renderers.
- `frontend/src/App.vue` — made the 3D overlay container explicitly non-intercepting (`pointer-events: none`) and added `data-testid="three-view-overlay"` for live/e2e evidence.
- `frontend/src/components/panels/ThreeView.vue` — made `.three-controls` explicitly interactive (`pointer-events: auto`) so overlay controls retain intentional input ownership.
- `frontend/tests/unit/application/canvasPresentation/canvasPresentationSelector.spec.ts` — replaced obsolete concrete-World selector use with read-port selection.
- `frontend/tests/unit/application/canvasPresentation/canvasWorldReadPort.spec.ts` — added focused read-port/controller boundary tests and compile-time guard against concrete-World selector/controller APIs.
- `frontend/tests/unit/application/canvasPresentation/projected3DCanvasSelector.spec.ts` — added focused adapter coverage for projected 3D-on-2D DTO ownership.
- `frontend/tests/unit/tools/pointTool.spec.ts`, `frontend/tests/unit/tools/CircleTool.spec.ts`, `frontend/tests/unit/tools/toolValidation.spec.ts` — updated existing live interaction-query test helpers to wrap `World` in `createCanvasWorldReadPort(world)` instead of passing concrete `World` to `CanvasPresentationSelector`.

## Deletes / narrowing completed

- Deleted `CanvasPresentationController.buildModel(world: World, ...)` full-World selector API.
- Deleted `CanvasPresentationSelector.select(world: World, ...)` full-World selector API.
- Deleted `CanvasPresentationSelector` active `any` seams (`item(primitive: any, kind: any)`, `Map<string, any>`, `world as any`, `(line as any).arcGeometry`).
- Deleted direct projected-3D rendering loops from `CanvasPresentationSelector`; ownership is now `Projected3DCanvasSelector`.
- Deleted obsolete concrete-World selector tests by replacing them with read-port/DTO tests.
- Deleted mutable/spatial-query responsibilities from `frontend/src/domain/presentation/Paper.ts` after static scan showed active hit-testing ownership in `CanvasInteractionQuery` and no `new Paper(` / `class Paper` active usage remained.
- No e2e workaround deletion was needed; current e2e already clicks canvas by test id. Overlay input ownership is now explicit and covered by live browser evidence.
- No compatibility wrapper or dual full-World/read-port canvas selector path remains.

## Protected-surface checks

No backend files, package metadata, dependency versions, command/undo/persistence contracts, broad app-shell/runtime services, Vite/Vitest/Playwright config, Drive/local persistence, or secret/config files were modified. `SvgCanvas.vue` still uses `World` for tool/command/runtime interactions outside the decision-bound presentation read-port scope.

## Static evidence

- Pre-edit scans: `validation/pre-edit-static-scans.stdout`.
- Post-edit scans: `validation/post-edit-static-scans.stdout`.
- Post-edit scan shows no active `any` seams in `frontend/src/application/canvasPresentation` or `frontend/src/domain/presentation/Paper.ts`, projected-3D loops owned by `Projected3DCanvasSelector`, no `class Paper`/`new Paper(` mutable collection usage, and explicit overlay pointer ownership in `App.vue`/`ThreeView.vue`.

## Validation log index

All validation output was captured under `architecture-audit/cycle-016-canvas-presentation-overlay-boundary/validation/`.

- Root lint: `root-lint.stdout` / `root-lint.stderr` — PASS.
- Frontend lint: `frontend-lint.stdout` / `frontend-lint.stderr` — PASS.
- Focused Vitest: `focused-vitest.stdout` / `focused-vitest.stderr` — PASS, 4 files / 7 tests.
- Full root Vitest: `root-vitest-rerun.stdout` / `root-vitest-rerun.stderr` — PASS, exitCode 0 (initial run failed before test helper seams were updated; see `root-vitest.stdout` / `.stderr`).
- Full frontend Vitest: `frontend-vitest-rerun.stdout` / `frontend-vitest-rerun.stderr` — PASS, exitCode 0 (initial run failed before test helper seams were updated; see `frontend-vitest.stdout` / `.stderr`).
- Root build: `root-build.stdout` / `root-build.stderr` — PASS. Vite emitted the pre-existing large chunk warning only.
- Frontend build: `frontend-build.stdout` / `frontend-build.stderr` — PASS. Vite emitted the pre-existing large chunk warning only.
- Root e2e: `root-e2e.stdout` / `root-e2e.stderr` — PASS, 8 Playwright tests.
- Frontend e2e: `frontend-e2e.stdout` / `frontend-e2e.stderr` — PASS, 8 Playwright tests.
- Preview refresh/probe: `preview-refresh-frontend.stdout` / `.stderr`, `preview-server-frontend.stdout` / `.stderr`, `preview-probe.body` — PASS. A corrected frontend-workspace Vite server is running with `vite --host 0.0.0.0`; probe reached `127.0.0.1:5173` after 2 seconds. Earlier root-script preview attempts failed because npm forwarded `--host` incorrectly; see `preview-refresh-final.stderr` and `preview-server.stdout`.
- Focused live Playwright/browser evidence: `live-overlay-canvas-playwright-rerun.stdout` / `.stderr` — PASS. Evidence shows overlay present, canvas present, overlay `pointer-events: none`, controls `pointer-events: auto`, and an element under the overlay center resolves to underlying SVG content.

## Residual risks / next-wave candidates

- The `CanvasWorldReadPort` adapter still delegates some realization calls to the concrete runtime `World`; this is intentional for the bounded direct path and avoids broad domain/context restructuring. A future wave could introduce a domain-level realization read context if broader selector/3D traversal boundaries become central.
- Existing tool unit tests still use local helper `any` parameters for mock `hitTest` functions; these are test-helper seams outside the decision-bound active presentation source. They were not broadened here.
- Three.js `OrbitControls` still exists inside `ThreeSceneHost`; the overlay canvas is non-intercepting in the current app overlay so broad 3D scene interaction redesign remains deferred.
