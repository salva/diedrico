# Cycle 019 Implementation Log — Three scene-host lifecycle / renderer platform boundary

## Decision path followed

Implemented the selected `proposal-direct.md` path from `decision.md`. No restructure/platform-module broadening was introduced. The implementation stayed within the authorized ThreeView runtime/scene-host/object-registry surfaces and focused tests.

Protected surfaces were not modified: backend, docs/specs, package/tooling/lockfiles, app-shell services, persistence, command/undo, canvas presentation, domain realization/read-port contracts, secrets/config paths, and unrelated dirty files.

## Files changed

Production source:

- `frontend/src/rendering/threeView/ThreeViewRuntime.ts`
  - Replaced private field hard-wiring of concrete host/controller/adapters with narrow typed collaborator interfaces and `ThreeViewRuntimeOptions`.
  - Kept one production composition path: default constructor still composes `ThreeSceneHost`, `ThreePresentationController`, and current scene adapters.
  - Runtime responsibility remains presentation-model build plus named group replacement for `projectionPlanes`, `planarElements`, `reconstructedElements`, `guides`, and `hinges`.
- `frontend/src/rendering/threeView/ThreeSceneHost.ts`
  - Added a small `ThreeSceneHostPlatform` factory seam for WebGL renderer, CSS2D renderer, OrbitControls, animation frame scheduling, and pixel ratio.
  - Made mount/remount/dispose lifecycle explicit: remount disposes prior platform resources; dispose cancels exactly the owned animation frame, disposes controls/renderer, removes CSS2D DOM, clears references, and disposes the registry.
  - Kept camera, lights, controls, renderers, CSS2D DOM, resize, animation, and registry ownership in the scene host.
- `frontend/src/rendering/threeView/ThreeObjectRegistry.ts`
  - Documented the registry ownership contract for adapter-created objects, descendants, geometry/materials, and CSS2D elements.

Tests:

- Added `frontend/tests/unit/rendering/threeView/threeViewRuntime.spec.ts` covering injected host/controller/adapters, single controller call, adapter calls, exact group replacement order, and mount/resize/dispose delegation.
- Added `frontend/tests/unit/rendering/threeView/threeSceneHost.spec.ts` covering renderer/CSS2D DOM/controls setup, resize, animation scheduling, render calls, dispose cancellation/removal/disposal, registry disposal, and remount disposal.
- Extended `frontend/tests/unit/rendering/threeView/threeObjectRegistry.spec.ts` to cover nested owned objects and material-array disposal, including idempotent registry disposal.

## DELETE/removal outcomes

- Deleted implicit unreplaceable runtime collaborator construction as private field initializers in `ThreeViewRuntime.ts`; production composition is now a single default constructor path with narrow typed injection for tests.
- No compatibility wrappers, transitional overloads, or broad scene-manager/platform facades were added.
- Renderer/label DOM ownership ambiguity was removed by explicit host lifecycle code and focused tests for CSS2D DOM attachment/removal, renderer/controls disposal, and animation cancellation.
- No stale low-level `ThreeView.vue` mount tests were found that needed deletion. `threeViewShellBoundary.spec.ts` remains shell-boundary coverage and passed unchanged.
- `AxisLabelSceneAdapter.ts` was not deleted. Pre/post static scans show it remains active through `ProjectionPlaneSceneAdapter.ts`.
- No duplicate/dead scene-host lifecycle helpers or scene-adapter exports were proven dead by implementation-stage scans.

## Validation log index

All logs are under `architecture-audit/cycle-019-three-scene-host-lifecycle-renderer-platform/validation/`.

Pre/post scans:

- `pre-edit-focused-status.stdout` / `.stderr` — path-focused status before source edits; only validation directory untracked in scope.
- `pre-edit-static-scan.stdout` / `.stderr` — confirmed old runtime private hard-wiring, active AxisLabel adapter usage, host platform resources, and registry replacement/disposal surfaces.
- `post-edit-focused-status.stdout` / `.stderr` — scoped changed files after implementation.
- `post-edit-static-scan.stdout` / `.stderr` — confirmed new runtime/host seams and active AxisLabel adapter usage.

Focused tests:

- `focused-vitest.stdout` / `.stderr` — initial focused run failed due to an incorrect new test expectation that ignored the host's immediate first animation render; no production failure.
- `focused-vitest-rerun.stdout` / `.stderr` — green: 5 files passed, 11 tests passed.

Mandatory gates:

- `root-lint.stdout` / `.stderr` — green: architecture lint, 4 files passed, 11 tests passed.
- `frontend-lint.stdout` / `.stderr` — green: architecture lint, 4 files passed, 11 tests passed.
- `root-vitest.stdout` / `.stderr` — green: 109 files passed, 1 skipped; 1237 passed, 45 skipped, 11 todo.
- `frontend-vitest.stdout` / `.stderr` — green: 109 files passed, 1 skipped; 1237 passed, 45 skipped, 11 todo.
- `root-build.stdout` / `.stderr` — green `vue-tsc && vite build`; Vite chunk-size warning only, pre-existing non-blocking build warning.
- `frontend-build.stdout` / `.stderr` — green `vue-tsc && vite build`; same Vite chunk-size warning.
- `root-e2e.stdout` / `.stderr` — green: 8 passed.
- `frontend-e2e.stdout` / `.stderr` — green: 8 passed.
- `validation-summary.stdout` / `.stderr` — extracted summaries for the gates above.

Live preview and browser evidence:

- `live-preview-refresh.stdout` / `.stderr` — first preview refresh attempt exited before output due to cleanup command self-matching; no app/source failure.
- `live-preview-processes-before-retry.stdout` / `.stderr` — confirmed no preview process remained after first attempt.
- `live-preview-refresh-retry.stdout` / `.stderr` — preview restarted with `npm run dev --workspace=frontend -- --host 0.0.0.0`; probe returned HTTP 200 from `http://127.0.0.1:5173/` after 2s; PID recorded in `live-preview-server.pid`.
- `live-preview-server.stdout` / `.stderr` — persistent Vite preview server logs.
- `live-preview-probe.html` / `live-preview-probe.stderr` — HTTP probe artifact.
- `live-3d-smoke.stdout` / `.stderr` — first one-off smoke failed because it was run from root where `@playwright/test` is not resolvable; rerun used frontend workspace.
- `live-3d-smoke-rerun.stdout` / `.stderr` — green browser smoke: 3D panel visible, canvas visible, all four 3D display controls visible, toggled `Show Planes` and `Show Reference Axes`, and exercised a canvas drag. Console contained Vite connection/debug and expected WebGL performance warnings only; no page errors.

## Protected-surface checks

- `ThreeView.vue` was not modified; it remains the Vue shell that constructs the runtime, mounts/resizes/refreshes/disposes it, and owns watcher/listener/subscription wiring.
- `ThreeWorldReadPort.ts` and domain realization contracts were not modified.
- No backend, docs/spec, package metadata, lockfile, persistence, command/undo, app-shell, Drive/auth/config, or env/secret paths were modified or read.
- Full MCP `git_status` is still too large due to unrelated workspace noise; path-focused status/diff were used for source-control hygiene.

## Residual risks and next-wave candidates

- No Cycle 019 source-attributable validation failures remain.
- The scene host still contains camera/lights defaults and platform lifecycle in one class by design for this wave; a later wave should only split this further if a concrete architectural smell remains after additional rendering work.
- Existing full-suite stderr contains expected negative-path diagnostic logs from unrelated domain/auth tests; exit code was 0 and they are not attributable to this change.
- Vite reports the existing large-chunk warning during builds; this is package/tooling/performance scope and was intentionally not changed in Cycle 019.
