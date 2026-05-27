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
