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

## Source-control hygiene evidence

Full MCP `git_status` is still too large due to unrelated workspace noise, so Cycle 019 used path-focused status/diff evidence rather than broad workspace assertions. The evidence separates the intentional Cycle 019 changes from unrelated dirty files observed by review:

- `validation/pre-edit-focused-status.stdout` was captured before Cycle 019 source edits against the authorized implementation paths and showed only the Cycle 019 validation directory as untracked. It did not show pre-existing modifications in the authorized ThreeView runtime/host/registry/test paths before implementation began.
- `validation/post-edit-focused-status.stdout` and `validation/final-focused-status-before-report.stdout` showed only the intentional Cycle 019 implementation paths: `frontend/src/rendering/threeView/ThreeObjectRegistry.ts`, `frontend/src/rendering/threeView/ThreeSceneHost.ts`, `frontend/src/rendering/threeView/ThreeViewRuntime.ts`, `frontend/tests/unit/rendering/threeView/threeObjectRegistry.spec.ts`, new `threeSceneHost.spec.ts`, new `threeViewRuntime.spec.ts`, plus this cycle's audit validation/log artifacts.
- The source/test implementation was committed as `70c11e86a6f70ac7db9cd4f6717891e6dbff386b`; follow-up report/status commits were `dd4fdbf1a8ce396b9abd495ece87377c06e2e793` and `47003a76a13c3766ac0bc7f2038e7d70e50e0cc7`. After those commits, `validation/t3-authorized-diff-names.stdout` is empty for the authorized source/test/log paths, proving no remaining uncommitted source behavior edits are being introduced by this correction task.
- Reviewer evidence `.saivage/stages/cycle-019-implement-three-scene-host-lifecycle-renderer-platform/reviews/t2-review-diff-names.stdout` and correction artifact `validation/t3-review-unrelated-diff-names-still-present.stdout` list unrelated dirty files under app-shell, commands, panels/toolbars, composables, domain/process stores, and e2e specs. Those paths are outside Cycle 019's decision-bound implementation scope; this task did not edit or revert them.
- `validation/t3-current-cycle-scope-status.stdout` shows the current Cycle 019-scoped untracked files are only reviewer/report artifacts and the new correction evidence logs. No production source behavior files are modified by this source-control evidence correction.

## Protected-surface checks

- `ThreeView.vue` was not modified; it remains the Vue shell that constructs the runtime, mounts/resizes/refreshes/disposes it, and owns watcher/listener/subscription wiring.
- `ThreeWorldReadPort.ts` and domain realization contracts were not modified.
- No backend, docs/spec, package metadata, lockfile, persistence, command/undo, app-shell, Drive/auth/config, or env/secret paths were modified or read.
- Full MCP `git_status` is still too large due to unrelated workspace noise; path-focused status/diff were used for source-control hygiene and are indexed above.

## Residual risks and next-wave candidates

- No Cycle 019 source-attributable validation failures remain.
- The scene host still contains camera/lights defaults and platform lifecycle in one class by design for this wave; a later wave should only split this further if a concrete architectural smell remains after additional rendering work.
- Existing full-suite stderr contains expected negative-path diagnostic logs from unrelated domain/auth tests; exit code was 0 and they are not attributable to this change.
- Vite reports the existing large-chunk warning during builds; this is package/tooling/performance scope and was intentionally not changed in Cycle 019.

## Validation/preview closure — cycle-019-validation-and-preview-refresh

**Wave 019 COMPLETE.** Closure independently re-read the implementation summary, this implementation log, the Cycle 019 validation directory, path-scoped git evidence, and `architecture-audit/wave-plan.md`. No production source, tests, package/tooling, secret/config, or next-wave implementation files were changed during closure.

### Closure validation evidence

Stable validation evidence remains green and is indexed here for final closure:

- Focused ThreeView/scene-host lifecycle Vitest: `validation/focused-vitest-rerun.stdout` / `.stderr` — 5 files passed, 11 tests passed.
- Root lint: `validation/root-lint.stdout` / `.stderr` — architecture lint passed, 4 files passed, 11 tests passed.
- Frontend lint: `validation/frontend-lint.stdout` / `.stderr` — architecture lint passed, 4 files passed, 11 tests passed.
- Root full Vitest: `validation/root-vitest.stdout` / `.stderr` — 109 files passed, 1 skipped; 1237 tests passed, 45 skipped, 11 todo.
- Frontend full Vitest: `validation/frontend-vitest.stdout` / `.stderr` — 109 files passed, 1 skipped; 1237 tests passed, 45 skipped, 11 todo.
- Root build: `validation/root-build.stdout` / `.stderr` — `vue-tsc && vite build` completed with `✓ built in 3.60s`; Vite large-chunk warning remains non-blocking and pre-existing.
- Frontend build: `validation/frontend-build.stdout` / `.stderr` — `vue-tsc && vite build` completed with `✓ built in 3.70s`; same non-blocking Vite large-chunk warning.
- Root e2e: `validation/root-e2e.stdout` / `.stderr` — Playwright passed, 8/8 tests.
- Frontend e2e: `validation/frontend-e2e.stdout` / `.stderr` — Playwright passed, 8/8 tests.
- Focused live 3D/scene-host browser smoke: `validation/live-3d-smoke-rerun.stdout` / `.stderr` — green: 3D panel visible, canvas visible, four 3D display controls visible, representative controls toggled, and canvas drag exercised; console contained Vite/debug and expected WebGL performance warnings only.
- Closure tail verification: `validation/closure-validation-tail-check.stdout` / `.stderr` — independently re-extracted the final green summaries from the stable validation logs above.

Superseded non-green attempts are explicitly non-blocking: `validation/focused-vitest.stdout` failed because a new test expected no immediate animation render, `validation/live-preview-refresh.stdout` failed because the cleanup command self-matched, and `validation/live-3d-smoke.stdout` failed because the one-off smoke was run from the root where `@playwright/test` was not resolvable. Each is superseded by the green rerun log named above and is not source-attributable.

### Live preview closure evidence

The persistent preview server remains bound for external access via the frontend dev server command recorded earlier (`npm run dev --workspace=frontend -- --host 0.0.0.0`). Closure probe evidence:

- `validation/live-preview-refresh-retry.stdout` / `.stderr` — server restart succeeded and returned HTTP 200 from `http://127.0.0.1:5173/`; PID recorded in `validation/live-preview-server.pid`.
- `validation/live-preview-server.stdout` / `.stderr` — persistent Vite server logs.
- `validation/live-preview-probe.html` / `.stderr` — prior HTTP probe artifact.
- `validation/closure-live-preview-probe.stdout` / `.stderr` — final closure probe: recorded PID `540800` was alive; both `http://127.0.0.1:5173/` and `http://0.0.0.0:5173/` returned HTTP 200.

### Protected-surface and source-control closure checks

- `validation/closure-scoped-status.stdout` / `.stderr` — path-scoped status for Cycle 019 artifacts, this validation stage report directory, and authorized ThreeView runtime/test paths. It shows only closure-stage untracked report/evidence artifacts, not production source changes.
- `validation/closure-scoped-diff-names.stdout` / `.stderr` — no uncommitted tracked diffs in the scoped Cycle 019 source/test/log paths before this closure-log append.
- Full MCP `git_status` remains too large because of unrelated workspace noise; closure therefore used path-scoped status/diff and did not edit or revert unrelated dirty files.
- Forbidden secret/config paths were not read or copied. `.saivage/saivage.json`, auth profiles, env files, provider configs, Drive credentials, and shell history were not accessed.

### Re-rank / next-wave recommendation

`architecture-audit/wave-plan.md` was re-read through the current Wave 019 entry. The plan currently lists Waves 001–019 only, and Wave 019 is now complete. Wave 019 did not invalidate remaining planned premises because there are no later wave entries in the current plan. The next canonical action should therefore be a reviewed wave-plan extension / fresh scout stage (for example, `cycle-020-wave-plan-extension` or `cycle-020-fresh-scout-proposals` only after a new Wave 020 entry exists) to inspect the current post-Wave-019 codebase, identify the next most central architectural risk, and append the next ordered wave before any implementation begins.

No corrective implementation stage is needed for Cycle 019.
