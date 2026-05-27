# Cycle 023 Implementation Log — Runtime-session consumer ports and command-history boundary

## Selected path followed

Implemented the decision-selected direct path from `decision.md` / `proposal-direct.md`. No restructure proposal, broad command-kernel migration, rendering/canvas/tool producer migration, persistence schema/replay change, backend/docs/debug/package-tooling change, Drive/auth internals change, or secret/config read was performed.

## Source files changed

- `frontend/src/application/appShell/AppShellPorts.ts`
  - Added narrow `ActivePlanePort`, `SelectionReadPort`, and `CommandHistoryPort` contracts.
- `frontend/src/application/appShell/RuntimeSession.ts`
  - Added behavior-sized ports: `activePlanePort()`, `selectionReadPort()`, `commandHistoryPort()`, and `selectionDeletionCommandPort()`.
  - Added adapter-local typed persistence handles exported from `RuntimeSession`: `RuntimeSessionPersistenceSnapshotHandle` and `RuntimeSessionPersistenceRestoreHandle`.
  - Deleted selected raw accessors: `worldForUseCases()`, `commandStackForCommandServices()`, and `commandStackForShortcuts()`.
  - Retained `worldForView()` as the decision-approved rendering/view seam. After reviewer correction, the remaining raw command-stack handoff is explicitly named `commandStackForDeferredCommandProducers()` for deferred canvas/tool/process-history command producers; it is not a view/history accessor and is not used by active-plane, selection, keyboard, toolbar history, selection-delete, or persistence consumers migrated in this cycle.
- `frontend/src/application/appShell/AppShellRuntime.ts`
  - Wires active-plane, selection, selection-delete, keyboard history, and toolbar-visible command history through `RuntimeSession` ports.
  - Exposes `commandHistory` to production composition while retaining raw `commandStack` only for out-of-scope legacy view/tool consumers.
- `frontend/src/application/appShell/ActivePlaneUseCases.ts`
  - Replaced full `World` dependency with `ActivePlanePort`.
- `frontend/src/application/appShell/SelectionUseCases.ts`
  - Replaced full `World` dependency with `SelectionReadPort`; selection deletion remains delegated to `SelectionDeletionCommandPort`.
- `frontend/src/application/appShell/KeyboardShortcutRouter.ts`
  - Replaced `CommandStack` dependency with `CommandHistoryPort` for undo/redo availability/actions.
- `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts`
  - Removed private `{ commandStack }` / `{ world; commandStack }` casts by accepting the adapter-local typed runtime handles. `ProjectService` schema/replay/serialization internals were not changed.
- `frontend/src/application/toolbar/ToolbarHistoryUseCases.ts`
  - Replaced direct `CommandStack` dependency with shared `CommandHistoryPort`.
- `frontend/src/application/toolbar/ToolbarHistoryController.ts`
  - Replaced raw `commandStack` provider dependency with `commandHistory` provider dependency.
- `frontend/src/components/toolbars/Toolbar.vue`
  - Toolbar history now injects `commandHistory`, not raw `commandStack`.
- `frontend/src/App.vue`
  - Provides `commandHistory` from the app-shell runtime for toolbar history consumers.
- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`
  - Added Cycle 023 static boundary assertions for deleted raw accessors, migrated consumer imports, shared command-history port use, and adapter-local persistence handles.
- `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts`
  - Updated active-plane and selection fakes to port-shaped dependencies; retained behavior coverage for active-plane subscription/cycling, selection cascade preview/select-all, deletion, and session stability.
- `frontend/tests/unit/components/panelToolbarBehavior.spec.ts`
  - Updated toolbar component tests to provide `commandHistory` for undo/redo behavior.

## Deleted / removed legacy surfaces

Removed from production source:

- `RuntimeSession.worldForUseCases()`
- `RuntimeSession.commandStackForCommandServices()`
- `RuntimeSession.commandStackForShortcuts()`
- Direct `World` import from `ActivePlaneUseCases.ts`
- Direct `World` import from `SelectionUseCases.ts`
- Direct `CommandStack` import from `KeyboardShortcutRouter.ts`
- Direct `CommandStack` imports/constructor expectations from `ToolbarHistoryUseCases.ts` and `ToolbarHistoryController.ts`
- Toolbar raw `commandStack` injection for history controls
- Adapter-private casts to `{ commandStack }` and `{ world; commandStack }` in `ProjectSessionPersistenceAdapter.ts`

Proof: `validation/final-static-scan.stdout.log` shows no production hits for selected raw accessors, migrated consumer raw imports, or toolbar raw command-stack injection. The remaining scan hit is the intentional ProjectService DTO cast `data as unknown as ProjectData`, not a runtime World/CommandStack handle cast and not changed by Cycle 023.

## Protected-surface checks

Not modified:

- Backend code/APIs
- Docs/spec source cleanup unrelated to this wave
- Package/dependency/tooling/lint/build configuration
- Debug placeholders
- Drive/auth/credential internals or protected config files
- Persistence schema, serialized project shape, migrations, replay, operation registry, command descriptors, or `ProjectService` internals
- Broad command-kernel redesign
- Canvas/tool/construction/process-history command producers
- Rendering/presentation read-port redesign, Three scene-host work, domain realization contexts, or `SvgCanvas` internals
- Unrelated dirty `frontend/src/components/toolbars/MainToolbar.vue`

## Source-control reconciliation

- Pre-edit scoped status captured in `validation/pre-edit-scoped-status.stdout.log`; it showed pre-existing unrelated `frontend/src/components/toolbars/MainToolbar.vue` plus current stage/audit artifacts.
- Final scoped status captured in `validation/final-scoped-status.stdout.log`.
- The unrelated dirty `frontend/src/components/toolbars/MainToolbar.vue` was not read, modified, reverted, or incorporated.

## Validation log index

All logs are under `architecture-audit/cycle-023-runtime-session-consumer-ports-command-history-boundary/validation/`.

- Pre-edit scoped status: `pre-edit-scoped-status.stdout.log`, `pre-edit-scoped-status.stderr.log`
- Pre-edit raw seam scan: `pre-edit-static-scan.stdout.log`, `pre-edit-static-scan.stderr.log`
- Focused Vitest: `focused-vitest.stdout.log`, `focused-vitest.stderr.log` — PASS, 39 tests passed after port-fake updates
- Post/final static scans: `post-edit-static-scan.*`, `final-static-scan.*` — PASS for selected seams; remaining DTO cast noted above
- Root lint: `root-lint.stdout.log`, `root-lint.stderr.log` — PASS
- Frontend lint: `frontend-lint.stdout.log`, `frontend-lint.stderr.log` — PASS
- Root full Vitest: `root-vitest.stdout.log`, `root-vitest.stderr.log` — PASS, 110 files passed / 1 skipped, 1267 passed / 45 skipped / 11 todo
- Frontend full Vitest: `frontend-vitest.stdout.log`, `frontend-vitest.stderr.log` — PASS, 110 files passed / 1 skipped, 1267 passed / 45 skipped / 11 todo
- Root build: `root-build.stdout.log`, `root-build.stderr.log` — PASS; Vite chunk-size warning only
- Frontend build: `frontend-build.stdout.log`, `frontend-build.stderr.log` — PASS; Vite chunk-size warning only
- Root Playwright e2e: `root-e2e.stdout.log`, `root-e2e.stderr.log` — PASS, 9 tests passed
- Frontend Playwright e2e: `frontend-e2e.stdout.log`, `frontend-e2e.stderr.log` — PASS, 9 tests passed
- Live preview pre-probe: `pre-preview-probe.stdout.log`, `pre-preview-probe.stderr.log` — HTTP 200 before refresh
- Live preview refresh/probe: `live-preview-refresh.stdout.log`, `live-preview-refresh.stderr.log`, `live-preview.stdout.log`, `live-preview.stderr.log`, `live-preview-probe.stdout.log`, `live-preview-probe.stderr.log`, `live-preview.pid` — refreshed Vite dev server on `0.0.0.0:5173`, HTTP 200 probe captured
- Credential-free live/browser smoke: `live-playwright-smoke.stdout.log`, `live-playwright-smoke.stderr.log` — PASS, 8 Playwright tests covering app shell, active-plane selector, selection masks, Delete/undo/redo/Escape/Ctrl+A, and toolbar/status-adjacent behavior

## Preview / live evidence

The preview server was refreshed with:

```sh
npm run dev --workspace=frontend -- --host 0.0.0.0
```

The process id is recorded in `validation/live-preview.pid`. Reachability probe returned HTTP 200 in `validation/live-preview-probe.stdout.log`. A credential-free Playwright smoke against the refreshed app passed in `validation/live-playwright-smoke.stdout.log`.

## Consumer-port / command-history evidence

- Keyboard undo/redo now depends on `CommandHistoryPort` in `KeyboardShortcutRouter.ts`.
- Toolbar undo/redo now depends on the same `CommandHistoryPort` in `ToolbarHistoryUseCases.ts` / `ToolbarHistoryController.ts` and is injected as `commandHistory` in `Toolbar.vue`.
- `AppShellRuntime.ts` creates one `const commandHistory = session.commandHistoryPort()` and wires it to keyboard plus production provide.
- Boundary assertions in `AppShellBoundary.test.ts` enforce that keyboard/toolbar history no longer use raw `CommandStack` and that selected raw `RuntimeSession` accessors remain deleted.

## Corrective review follow-up

Reviewer follow-up identified `commandStackForView()` as an unauthorized new raw RuntimeSession accessor because the Cycle 023 decision approved retaining only `worldForView()` as a view/rendering seam. Corrective commit `eaf4b9cdbc31d1064e44e5c4b5b768513e45c02e` removed that accessor name, updated `AppShellRuntime` and focused app-shell tests, and added a boundary assertion that `commandStackForView()` remains absent. The residual raw command-stack handoff is now named `commandStackForDeferredCommandProducers()` to document the decision-deferred canvas/tool/process-history command-producer seam without presenting it as a view or history consumer path. Correction validation logs: `validation/t3-focused-appshell-tests.stdout.log` (PASS: 2 files, 34 tests) and `validation/t3-postedit-command-stack-view-scan.stdout.log` (no production `commandStackForView()` hits).

## Residual risks and deferred seams

- `worldForView()` remains the decision-approved raw rendering/view seam.
- `commandStackForDeferredCommandProducers()` remains as a scoped residual raw handoff for existing out-of-scope canvas/tool/process-history producers still injecting `commandStack`. The reviewer-rejected `commandStackForView()` accessor was removed in corrective commit `eaf4b9cdbc31d1064e44e5c4b5b768513e45c02e`; boundary tests now assert it stays absent. A future wave should address broad command-producer ports.
- `ProjectSessionPersistenceAdapter` still imports `ProjectService` and casts persisted payload to `ProjectData`; this is intentionally outside Cycle 023 because changing serialized DTO/schema/replay/ProjectService internals was protected.
- Build emits the pre-existing Vite chunk-size warning; validation passed.

## Next-wave candidates

- Replace the residual raw `commandStack` provide/inject for canvas movement/style, construction, process history, and action panels with command-producer ports in a dedicated command-producer boundary wave.
- Replace the residual raw `worldForView()` rendering handoff with a view/render read-port in a rendering/view-boundary wave.
- Continue persistence boundary cleanup only through a reviewed wave that explicitly includes `ProjectService`/schema/replay if needed.
