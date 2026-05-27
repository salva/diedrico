# Cycle 024 Implementation Log — Command-producer runtime ports

## Summary

Implemented the decision-selected direct path from `architecture-audit/cycle-024-command-producer-runtime-ports/decision.md`.

The residual raw `RuntimeSession.commandStackForDeferredCommandProducers()` seam was deleted. `RuntimeSession` now remains the concrete owner of the scoped `CommandStack` and creates behavior-sized command-producer ports/controllers for canvas/tool command production and process-history command production. Vue wiring now uses typed `InjectionKey` constants instead of raw string `commandStack` provide/inject wiring.

No backend, docs, specs, debug tooling, package scripts, Drive/auth internals, persistence schema/replay internals, domain realization layers, command-kernel internals, or broad rendering/read-port redesign were changed.

## Source files changed

Production source:

- `frontend/src/application/appShell/RuntimeSession.ts`
  - Deleted `commandStackForDeferredCommandProducers()`.
  - Added `canvasCommandProducerPort(toolStore)` and `processHistoryCommandPort()` factories that construct narrow existing controllers from private `world` + private `commandStack`.
- `frontend/src/application/appShell/AppShellRuntime.ts`
  - Stopped unwrapping raw `commandStack` from the session.
  - Returns `canvasCommandProducerPort`, `processHistoryCommandPort`, and existing `commandHistory` instead of a raw producer stack.
- `frontend/src/application/appShell/RuntimeInjectionKeys.ts`
  - Added typed Vue `InjectionKey` constants for `World`, `CommandHistoryPort`, `ToolCommandSink`, and `ProcessHistoryIntentSink` wiring.
- `frontend/src/App.vue`
  - Replaced raw `provide('commandStack', runtime.commandStack)` with typed `CanvasCommandProducerInjectionKey` and `ProcessHistoryCommandInjectionKey` providers.
  - Replaced string `world`/`commandHistory` providers with typed keys so production runtime wiring remains type-addressable.
- `frontend/src/components/workspace/SvgCanvas.vue`
  - Removed raw `inject('commandStack')` command-producer wiring.
  - Consumes typed world and canvas command-producer ports while leaving rendering, hit-testing, argument collection, and `worldForView()` read seams unchanged.
- `frontend/src/components/panels/ActionsPanel.vue`
  - Removed raw `inject<unknown>('commandStack')` process-history command wiring.
  - Consumes typed world and process-history command port while retaining process-tree rendering/read responsibilities as-is.
- `frontend/src/application/tools/CanvasToolController.ts`
  - Deleted provider dependency `{ commandStack: unknown }` and the unknown-to-`CommandStack` cast.
  - Kept `ToolCommandSink` boundary and existing command construction semantics.
- `frontend/src/application/processHistory/ProcessHistoryController.ts`
  - Deleted provider dependency `{ commandStack: unknown }` and the unknown-to-`CommandStack` cast.
- `frontend/src/components/toolbars/Toolbar.vue`
  - Consumes typed `CommandHistoryInjectionKey`; undo/redo still route through `commandHistoryPort`, not command-producer ports.
- `frontend/src/components/toolbars/PlaneSelector.vue`, `frontend/src/components/panels/ElementsPanel.vue`, `frontend/src/components/panels/ThreeView.vue`
  - Switched existing world-read consumers from string `world` injection to `WorldInjectionKey` because `App.vue` no longer provides the string key. No rendering/read redesign was performed.

Tests updated:

- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`
- `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts`
- `frontend/tests/unit/application/canvasToolControllers.spec.ts`
- `frontend/tests/unit/application/panelToolbarIntentControllers.spec.ts`
- `frontend/tests/unit/components/panelToolbarBehavior.spec.ts`

## Deleted legacy surfaces / proofs

Deleted or removed from production source:

- `RuntimeSession.commandStackForDeferredCommandProducers()`.
- `AppShellRuntime` returned raw `commandStack` field for deferred producers.
- `provide('commandStack', runtime.commandStack)` in `App.vue`.
- `inject('commandStack')` in `SvgCanvas.vue`.
- `inject<unknown>('commandStack')` in `ActionsPanel.vue`.
- `CanvasToolControllerProviderDependencies.commandStack: unknown` and its `as CommandStack` cast.
- `ProcessHistoryControllerProviderDependencies.commandStack: unknown` and its `as CommandStack` cast.
- Stale tests requiring the deferred raw accessor to remain present.

Static proof logs:

- `validation/final-production-static-scans.stdout.log` shows no production matches for `commandStackForDeferredCommandProducers`, raw `provide('commandStack')`, raw `inject(...commandStack...)`, `as CommandStack`, replacement string catch-all runtime/commands providers, generic `execute(commandBuilder)`, or `runtime.commandStack`.
- `validation/final-static-scans.stdout.log` records keyboard/toolbar undo-redo still flowing through `commandHistoryPort` / `CommandHistoryInjectionKey` / `createToolbarHistoryController` and confirms `worldForView()` remains only as the deferred view/read seam in app-shell runtime/session.

## Protected-surface checks

Not modified:

- backend files;
- docs/spec fixtures;
- debug/package tooling and package scripts;
- persistence schema, command serialization/replay, ProjectService internals;
- Drive/auth internals or secret/config files;
- domain realization layers;
- command-kernel internals;
- rendering/read-port architecture beyond typed world injection keys required by App.vue provider replacement.

No protected secret/config files were read or logged.

## Source-control hygiene

Pre-edit evidence:

- `validation/pre-edit-scoped-status.stdout.log` showed only untracked current-stage/report artifacts and the existing `reviews/` artifact directory.
- `validation/pre-edit-scoped-diff.stdout.log` was empty for the scoped production/test files.
- `validation/pre-edit-static-scan.stdout.log` captured the raw accessor/provide/inject/cast seams before editing.

Post-edit evidence:

- `validation/post-edit-scoped-status.stdout.log` lists only the files changed for this implementation plus current-stage audit/report artifacts.
- `validation/post-edit-scoped-diffstat.stdout.log` records the scoped diffstat.

Adjacent untracked `architecture-audit/cycle-024-command-producer-runtime-ports/reviews/` was pre-existing stage evidence and was not modified by this implementation.

## Validation log index

All validation logs are under `architecture-audit/cycle-024-command-producer-runtime-ports/validation/`.

Pre/post/static:

- `pre-edit-scoped-status.stdout.log` / `.stderr.log`
- `pre-edit-scoped-diff.stdout.log` / `.stderr.log`
- `pre-edit-static-scan.stdout.log` / `.stderr.log`
- `post-edit-static-scan.stdout.log` / `.stderr.log`
- `final-static-scans.stdout.log` / `.stderr.log`
- `final-production-static-scans.stdout.log` / `.stderr.log`
- `post-edit-scoped-status.stdout.log` / `.stderr.log`
- `post-edit-scoped-diffstat.stdout.log` / `.stderr.log`

Focused tests:

- `focused-app-shell-boundary.stdout.log` / `.stderr.log` — passed.
- `focused-runtime-port-vitest-rerun.stdout.log` / `.stderr.log` — passed; covers app-shell runtime use cases, canvas controller/movement/style, representative point/circle/tool validation, process-history, toolbar history, autosave/persistence guards.

Lint:

- `root-lint.stdout.log` / `.stderr.log` — passed.
- `frontend-lint.stdout.log` / `.stderr.log` — passed.
- `final-lint.stdout.log` / `.stderr.log` — passed after final typed world-key fixes.

Full tests:

- `frontend-vitest-rerun.stdout.log` / `.stderr.log` — passed: 110 files passed, 1 skipped; 1268 tests passed, 45 skipped, 11 todo.
- `root-vitest-final.stdout.log` / `.stderr.log` — passed: 110 files passed, 1 skipped; 1268 tests passed, 45 skipped, 11 todo.

Builds:

- `root-build-final.stdout.log` / `.stderr.log` — passed.
- `frontend-build.stdout.log` / `.stderr.log` and `e2e-after-world-key-fix-rerun.stdout.log` build phase — passed.

E2E/live:

- Initial `root-e2e.stdout.log` failed because `PlaneSelector` still consumed string `world` after `App.vue` moved to typed keys. Root cause was implementation wiring, fixed by updating world-read consumers to `WorldInjectionKey`.
- `e2e-after-world-key-fix-rerun.stdout.log` / `.stderr.log` — passed: 9 Playwright tests passed.
- `live-preview-refresh-probe-rerun.stdout.log` / `.stderr.log` — preview refreshed on `0.0.0.0:5173`; HTTP probe returned `HTTP/1.1 200 OK` from `127.0.0.1:5173`.
- `live-playwright-smoke-rerun.stdout.log` / `.stderr.log` — passed credential-free smoke: app loaded, point construction path executed, undo/redo keyboard route executed, plane selector rendered.

Expected transient failures during implementation, fixed before final validation:

- `frontend-build-initial.*` and `frontend-build-after-nullability.*` exposed Vue TypeScript nullability after typed injection migration.
- `focused-runtime-port-vitest.*` exposed tests still calling the deleted accessor.
- `root-e2e.*` exposed remaining string world injection in view/read consumers.
- `live-preview-refresh-probe.*` first attempt was interrupted by the kill pattern; `live-preview-refresh-probe-rerun.*` is the successful preview evidence.

## Runtime-port ownership evidence

- `RuntimeSession` is the only production source that owns the concrete scoped `CommandStack` for canvas/tool and process-history producers.
- Vue components receive `ToolCommandSink` and `ProcessHistoryIntentSink` through typed injection keys.
- No production component receives raw `CommandStack`, a stack-like wrapper, a generic command service, or a generic mutable runtime facade.
- `ToolCommandSink` remains the tool intent boundary; tool hit-testing, active-plane/argument collection reads, world interaction reads, process-tree rendering, and rendering reads remain outside command-producer ports.
- Keyboard/toolbar undo-redo continue through `CommandHistoryPort` via `session.commandHistoryPort()`, `KeyboardShortcutRouter`, `CommandHistoryInjectionKey`, and `ToolbarHistoryController`.

## Residual risks

- `worldForView()` and typed `WorldInjectionKey` still expose the existing deferred view/read world seam to rendering/read consumers. This was explicitly deferred by Cycle 024 and should remain a future rendering/read-port wave candidate.
- `ToolbarHistoryController` still accepts an `unknown` provider dependency internally and casts it to `CommandHistoryPort`; this is outside the Cycle 024 command-producer seam, but a future small cleanup could make toolbar-history injection fully typed end-to-end.
- Bundle-size warning persists during Vite build; it is unrelated to this wave and existed as tooling/performance concern outside scope.

## Next-wave candidates

- Replace remaining `worldForView()` / `WorldInjectionKey` rendering and read consumers with behavior-sized read ports/selectors in a dedicated rendering/read-port wave.
- Tighten toolbar history controller provider typing now that `CommandHistoryInjectionKey` is typed.
- Continue reducing Vue component direct world reads in `SvgCanvas`, `ActionsPanel`, `ElementsPanel`, `PlaneSelector`, and `ThreeView` through reviewed future waves.

## Validation-and-preview closure — cycle-024-validation-and-preview-refresh

**Closure status: Wave 024 COMPLETE.** This closure stage independently rechecked the implementation evidence, reran the mandatory validation cadence, refreshed the live preview on `0.0.0.0:5173`, and re-read the wave plan without production source refactor work.

### Closure source-control reconciliation

- Correction added by `t3-correct-source-control-reconciliation`: the repository was **not clean** during validation closure. `validation/t3-worktree-status-short.stdout.log`, `validation/t3-worktree-diffstat.stdout.log`, and `validation/t3-worktree-untracked.stdout.log` capture a bounded status/diffstat sample showing a broad pre-existing dirty worktree, including modified/deleted `.github` / `.specify` files, many historical `.saivage` stage/report artifacts, many prior-cycle audit/validation artifacts, and unrelated frontend source/test changes such as command/operation/process-store/intersection files and deleted e2e specs. This broad dirty state was outside Wave 024 closure ownership and was not reconciled or reverted here.
- The earlier closure statement that the status log listed only implementation files plus current-stage audit/report artifacts was too narrow for the actual repository state. The accurate claim is scoped: Wave 024 closure intentionally edited only its implementation-log completion text, validation evidence under `architecture-audit/cycle-024-command-producer-runtime-ports/validation/`, live-preview evidence, and current-stage report artifacts; unrelated dirty files already present in the worktree remain outside this closure.
- This reconciliation task touched no production source, backend, docs/specs, package/tooling, persistence schema/replay, Drive/auth, secret/config, rendering/read-port redesign, or next-wave implementation files. Protected secret/config file contents were not read; their paths appear only as git-status pathnames when Git reported untracked files.
- `validation/closure-static-port-verification.stdout.log` independently confirms the deleted command-producer raw seams remain absent from production source: no `commandStackForDeferredCommandProducers`, no raw `provide('commandStack')`, no raw `inject(...commandStack...)`, no `as CommandStack` provider casts, no `runtime.commandStack`, no string-keyed `commands`/`runtime` catch-all provider, and no generic `execute(commandBuilder)` replacement.

### Closure validation log index

Fresh closure logs are under `architecture-audit/cycle-024-command-producer-runtime-ports/validation/`:

- Static/source verification:
  - `closure-precheck-status-diff.stdout.log` / `.stderr.log`
  - `closure-static-port-verification.stdout.log` / `.stderr.log`
  - `closure-wave-plan-rerank-scan.stdout.log` / `.stderr.log`
- Focused and mandatory tests:
  - `closure-root-lint.stdout.log` / `.stderr.log` — passed: root lint delegates to frontend architecture tests; 4 files, 11 tests passed.
  - `closure-frontend-lint.stdout.log` / `.stderr.log` — passed: frontend architecture tests; 4 files, 11 tests passed.
  - `closure-focused-runtime-port-vitest.stdout.log` / `.stderr.log` — passed: 5 focused files, 52 tests passed for app-shell boundary/runtime, canvas tool controllers, panel/toolbar intent controllers, and component behavior.
  - `closure-root-vitest.stdout.log` / `.stderr.log` — passed: 110 files passed, 1 skipped; 1268 tests passed, 45 skipped, 11 todo.
  - `closure-frontend-vitest.stdout.log` / `.stderr.log` — passed: 110 files passed, 1 skipped; 1268 tests passed, 45 skipped, 11 todo.
  - `closure-vitest-tail.stdout.log` / `.stderr.log` — summarized the full root/frontend Vitest pass tails. Stderr contains expected test-exercised domain/auth/property validation diagnostics while the suites exit green.
- Builds:
  - `closure-root-build.stdout.log` / `.stderr.log` — passed: `vue-tsc && vite build` completed. Vite emitted the pre-existing large chunk warning only.
  - `closure-frontend-build.stdout.log` / `.stderr.log` — passed with the same pre-existing Vite chunk-size warning.
- E2E:
  - `closure-root-e2e.stdout.log` / `.stderr.log` — passed: 9 Playwright tests.
  - `closure-frontend-e2e.stdout.log` / `.stderr.log` — passed: 9 Playwright tests.
- Live preview / browser smoke:
  - `closure-preview-before-refresh.stdout.log` / `.stderr.log` — recorded that the previous stored preview PID was not reachable at `127.0.0.1:5173`, so refresh was required.
  - `closure-live-preview-refresh-command.stdout.log` / `.stderr.log` and `closure-live-preview-probe.stdout.log` / `.stderr.log` — refreshed the live preview with `npm run dev -- --host 0.0.0.0`; HTTP probe returned `HTTP/1.1 200 OK` from `127.0.0.1:5173` on attempt 2.
  - `closure-live-preview-tail.stdout.log` / `.stderr.log` — confirms Vite bound to `0.0.0.0` and exposed both local and network URLs.
  - `closure-live-playwright-smoke.stdout.log` / `.stderr.log` — stale selector attempt failed because it used obsolete `workspace-canvas` rather than the current `svg-canvas` test id; this is superseded by the rerun below and is not a source failure.
  - `closure-live-playwright-smoke-rerun.stdout.log` / `.stderr.log` — passed credential-free live smoke: app loaded, point creation executed on the current SVG canvas selector, undo/redo keyboard route was exercised, and the plane selector opened with 3 options.

### Runtime-port ownership evidence after closure

- `RuntimeSession` remains the only production owner of the scoped concrete `CommandStack` for canvas/tool and process-history command producers. It creates `canvasCommandProducerPort(toolStore)` and `processHistoryCommandPort()` from its private `world` and private `commandStack` rather than exposing a producer stack.
- `AppShellRuntime` exposes named behavior fields (`canvasCommandProducerPort`, `processHistoryCommandPort`, and existing `commandHistory`) and does not return a raw `commandStack` or a broad mutable runtime/commands facade.
- `App.vue` provides typed injection keys: `WorldInjectionKey`, `CanvasCommandProducerInjectionKey`, `ProcessHistoryCommandInjectionKey`, and `CommandHistoryInjectionKey`.
- `SvgCanvas.vue` and `ActionsPanel.vue` consume typed behavior ports for command production; `Toolbar.vue` consumes the typed `CommandHistoryInjectionKey` for undo/redo routing.
- `CanvasToolController` and `ProcessHistoryController` depend on typed constructor dependencies supplied by `RuntimeSession`; there are no unknown-to-`CommandStack` casts in those controllers.
- Keyboard/toolbar undo-redo still route through `CommandHistoryPort` / `CommandHistoryInjectionKey` / `ToolbarHistoryController`, not through the command-producer ports.
- `worldForView()` remains only in `RuntimeSession` and `AppShellRuntime` as the intentionally deferred rendering/view read seam; it was not broadened in this wave.
- Dirty/autosave/persistence round-trip behavior remains covered by the focused app-shell runtime tests and full suite; no persistence schema, replay, command descriptor, or ProjectService source changed in this wave.

### Superseded stale/interrupted evidence

- Initial implementation-stage failures (`frontend-build-initial.*`, `frontend-build-after-nullability.*`, `focused-runtime-port-vitest.*`, `root-e2e.*`, and the interrupted first preview-probe attempt) remain useful debugging history but are superseded by the green final implementation logs and fresh closure logs listed above.
- Closure live-smoke `closure-live-playwright-smoke.*` failed only because the script used stale selector `workspace-canvas`; the current e2e contract uses `svg-canvas`. `closure-live-playwright-smoke-rerun.*` is the source-valid live-smoke evidence.
- The Vite chunk-size warning in build stderr is a pre-existing performance/tooling warning, not a Wave 024 source regression.
- Vitest stderr diagnostics are expected logs emitted by tests that intentionally exercise infeasible geometry, auth parsing failures, and validation failures; both root and frontend Vitest commands exited successfully.

### Residual risks after Wave 024

- The raw `worldForView()` / `WorldInjectionKey` rendering and read seam remains intentionally deferred. Vue rendering/read consumers (`SvgCanvas`, `ActionsPanel`, `ElementsPanel`, `PlaneSelector`, `ThreeView`) still observe/read the domain `World` directly through the typed key; this is now a clearer candidate for a dedicated view/read-port wave because command-producer stack access has been removed.
- `ToolbarHistoryController` still has an internal `unknown` provider-dependency cast to `CommandHistoryPort`. This is not a command-producer stack seam, but a small future cleanup could make toolbar-history wiring fully typed end-to-end.
- Build chunk-size warning remains outside Wave 024 scope.

### Wave-plan reread / next-wave recommendation

`architecture-audit/wave-plan.md` currently ends at Wave 024; no reviewed Wave 025 entry is present. After Wave 024, the most central remaining current seam is the rendering/view read boundary around `worldForView()` / `WorldInjectionKey`, because command-production no longer needs raw stack injection and the existing typed world key now cleanly exposes the deferred read/rendering problem.

Recommended next canonical stage: **`cycle-025-wave-plan-extension`** to add a reviewed Wave 025 for a rendering/view read-port boundary. The proposed Wave 025 should inventory current `WorldInjectionKey` and `worldForView()` consumers (`SvgCanvas`, `ActionsPanel`, `ElementsPanel`, `PlaneSelector`, `ThreeView`), distinguish rendering/read/query needs from command-production needs, and propose behavior-sized read ports/selectors without changing persistence, command descriptors, backend/docs/specs, package tooling, Drive/auth, or broad rendering architecture before review convergence.

Do not implement the next wave from this closure stage. The next step should be plan extension/review first, then the canonical fresh-scout/proposal stage if the plan extension is approved.
