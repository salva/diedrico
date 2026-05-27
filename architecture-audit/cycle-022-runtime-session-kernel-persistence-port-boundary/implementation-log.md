# Cycle 022 Implementation Log — Runtime session kernel and persistence port boundary

## Scope followed

Implemented the decision-selected direct path from `decision.md` / `proposals/proposal-direct.md`: a named app-shell `RuntimeSession` now owns the current `World`/`CommandStack` lifecycle, and project/session/autosave use cases consume session-oriented methods instead of passing raw runtime pairs to persistence.

No reviewed delta was needed. The implementation did not modify backend, docs/spec source, package/tooling, persistence schema/replay internals, operation descriptors, Drive/auth internals, rendering/domain layers, debug files, environment/provider/secret config, or broad command-kernel/keyboard/active-plane/selection APIs.

## Source-control reconciliation

Pre-edit evidence:

- `validation/pre-edit-scoped-status-diff.stdout`
- `validation/pre-edit-scoped-status-diff.stderr`

The workspace already contained adjacent Cycle 022 audit/stage artifacts and a tracked `decision.md` diff before implementation. Those pre-existing artifacts were not reverted or used as implementation authority. The implementation intentionally changed only app-shell source/tests and this cycle's validation/log artifacts.

Final scoped evidence:

- `validation/final-scoped-status-diff.stdout`
- `validation/final-scoped-status-diff.stderr`
- `validation/final-boundary-scan.stdout`
- `validation/final-boundary-scan.stderr`

## Production files changed

- `frontend/src/application/appShell/RuntimeSession.ts` — new focused runtime-session boundary. Owns `World` and `CommandStack`, default initialization, clear/reset, version observation, snapshot delegation, validation, and atomic restore by replaying into an isolated candidate runtime before clearing active state.
- `frontend/src/application/appShell/AppShellRuntime.ts` — composes one `RuntimeSession`; wires active-plane, selection deletion, keyboard, view-facing `world`/`commandStack`, project session, and autosave through named session accessors.
- `frontend/src/application/appShell/AppShellPorts.ts` — narrows app-shell persistence contract to `SerializedProjectSession`, `RuntimeSessionSnapshotHandle`, and `RuntimeSessionRestoreHandle`; no longer imports or exposes `World`, `CommandStack`, `ProjectData`, or `ProjectService`.
- `frontend/src/application/appShell/ProjectSessionUseCases.ts` — removed direct `World`, `CommandStack`, `ProjectData`, and `initializeWorld` dependencies; uses `RuntimeSession` for local startup initialization, sign-out clear, create/new reset, open validation, atomic restore, and snapshot flows.
- `frontend/src/application/appShell/AutoSaveUseCases.ts` — removed direct `World`/`CommandStack` dependencies; polls `session.getVersion()` and snapshots through `session.snapshot(...)`.
- `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts` — remains the only app-shell `ProjectService` bridge; concrete `ProjectData`, `World`, and `CommandStack` awareness is adapter-private casting from opaque session handles.

## Tests changed

- `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts` — updated fakes to the narrowed persistence port; added failure-path coverage for invalid project data, restore/deserialization failure isolation, command-stack/world state preservation after failed open, project metadata preservation, and autosave snapshot exception status behavior.
- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts` — added Cycle 022 static boundary assertions: ports do not import concrete runtime/persistence DTOs; project session and autosave do not call raw-pair persistence; `ProjectSessionPersistenceAdapter` is the only app-shell `ProjectService` import; selection deletion wiring remains explicit.

## DELETE list / proofs

Deleted legacy raw app-shell persistence surfaces:

- Removed `ProjectSessionPersistencePort.snapshotCurrentSession(deps: { commandStack; world; projectName })`.
- Removed `ProjectSessionPersistencePort.restoreSession(data, deps: { world; commandStack })` from the public app-shell port.
- Removed app-shell port imports of `CommandStack`, `World`, and `ProjectData`.
- Removed direct `ProjectSessionUseCases` imports/dependencies on `CommandStack`, `World`, `ProjectData`, and `initializeWorld`.
- Removed direct `AutoSaveUseCases` imports/dependencies on `CommandStack` and `World`.
- Updated tests/fakes that asserted or depended on raw concrete persistence arguments.

No transitional overloads, compatibility wrappers, or parallel raw-pair public persistence paths were added. The only remaining concrete runtime object use is inside `RuntimeSession` and the adapter-private `ProjectSessionPersistenceAdapter`, plus reviewed existing consumers (`ActivePlaneUseCases`, `KeyboardShortcutRouter`, `SelectionUseCases`, and `SelectionDeletionCommandService`) wired by named session accessors.

## Atomic restore / failure-path evidence

Atomicity is implemented in `RuntimeSession.restoreValidatedProject()`:

1. `ProjectSessionUseCases.openProject()` loads data and calls `session.validateProjectData(...)` before any destructive reset.
2. `RuntimeSession.restoreValidatedProject()` restores into a new isolated `World`/`CommandStack` candidate first.
3. If candidate restore or fallback initialization throws, the active session is never cleared or partially replaced.
4. Only after candidate restore succeeds does the method clear and restore the active session, preserving current successful-flow behavior including fallback plane initialization and dirty marking.

Focused tests prove:

- invalid project data does not clear or partially replace active world/command-stack state;
- restore/deserialization failure calls restore only on the isolated candidate and leaves active state, project metadata, undo/redo state, and autosave start state intact;
- autosave snapshot failure returns save status to `idle` without disabling polling/future autosave.

## Validation log index

All commands were run from `/work/diedrico` unless otherwise noted.

- Pre-edit scoped status/diff: `validation/pre-edit-scoped-status-diff.stdout`, `validation/pre-edit-scoped-status-diff.stderr` — pass.
- Initial focused Vitest with wrong workspace-relative paths: `validation/focused-appshell-vitest-01.stdout`, `validation/focused-appshell-vitest-01.stderr` — failed with `No test files found`; command was corrected and rerun.
- Focused Vitest after path correction: `validation/focused-appshell-vitest-02.stdout`, `validation/focused-appshell-vitest-02.stderr` — failed on overly strict new test assumptions about initialization undo count; tests were corrected to compare captured pre-open state.
- Focused Vitest final: `validation/focused-appshell-vitest-03.stdout`, `validation/focused-appshell-vitest-03.stderr` — pass, 30 tests.
- Static app-shell scan: `validation/static-appshell-scan.stdout`, `validation/static-appshell-scan.stderr` — inspected; remaining concrete imports are in existing reviewed consumers, new `RuntimeSession`, and adapter-private bridge.
- Root lint: `validation/root-lint-01.stdout`, `validation/root-lint-01.stderr` — pass.
- Frontend lint: `validation/frontend-lint.stdout`, `validation/frontend-lint.stderr` — pass.
- Frontend build first attempt: `validation/frontend-build-01.stdout`, `validation/frontend-build-01.stderr` — failed due `SerializedProjectSession` index-signature typing; fixed by narrowing the DTO shape and adapter cast.
- Frontend build: `validation/frontend-build-02.stdout`, `validation/frontend-build-02.stderr` — pass with existing Vite large-chunk warning.
- Focused test + build after opaque port adjustment: `validation/focused-and-build-after-opaque-port.stdout`, `validation/focused-and-build-after-opaque-port.stderr` — pass.
- Root full Vitest: `validation/root-full-vitest.stdout`, `validation/root-full-vitest.stderr` — pass via root `npm run test` (frontend suite), 110 passed / 1 skipped test files; 1263 passed / 45 skipped / 11 todo tests.
- Frontend full Vitest: `validation/frontend-full-vitest.stdout`, `validation/frontend-full-vitest.stderr` — pass, same suite counts.
- Root build: `validation/root-build.stdout`, `validation/root-build.stderr` — pass with existing Vite large-chunk warning.
- Root e2e/Playwright: `validation/root-e2e.stdout`, `validation/root-e2e.stderr` — pass, 9/9 Chromium tests including startup/project chooser and delete/undo behavior.
- Live preview restart/probe attempts: `validation/live-preview-probe.stdout`, `validation/live-preview-probe.stderr` and `validation/live-preview-probe-02.stdout`, `validation/live-preview-probe-02.stderr` — failed because the restart command's `pkill` pattern matched its own shell.
- Live preview refresh/probe final: `validation/live-preview-refresh-03.stdout`, `validation/live-preview-refresh-03.stderr`, `validation/live-preview-probe-03.stdout`, `validation/live-preview-probe-03.stderr` — pass; dev server bound on `0.0.0.0` and `curl http://127.0.0.1:5173/` returned HTTP 200.
- Final scoped status/diff: `validation/final-scoped-status-diff.stdout`, `validation/final-scoped-status-diff.stderr` — captured.
- Final boundary scan: `validation/final-boundary-scan.stdout`, `validation/final-boundary-scan.stderr` — captured.

## Live preview / credential-free behavior evidence

The live preview was refreshed with:

```sh
nohup npm run dev --workspace=frontend -- --host 0.0.0.0 > validation/live-preview-refresh-03.stdout 2> validation/live-preview-refresh-03.stderr &
```

Reachability probe returned HTTP 200 in `validation/live-preview-probe-03.stdout`.

Credential-free user-observable behavior was covered by `npm run test:e2e` in `validation/root-e2e.stdout`, including startup without Google credentials, app-shell project chooser access without backend project API calls, selection deletion, undo/redo, keyboard shortcuts, and canvas/status interactions. No real Drive credentials were used.

## Protected-surface checks

Not modified:

- backend files;
- docs/spec source files;
- package/tooling files;
- persistence schema version, command snapshot shape, operation descriptors, `OperationRegistry`, replay algorithm, migration behavior;
- Drive/auth internals or credential behavior;
- rendering/domain layers;
- protected config/env/provider/secret files.

No secret/config/env/provider file contents were read, logged, copied, or included.

## Residual risks and next-wave candidates

- `RuntimeSession` now contains narrow raw-object accessors for existing consumers. This is intentional for Cycle 022, but a future wave should continue shrinking direct `World`/`CommandStack` dependencies for active-plane, keyboard/history, selection, and rendering-facing consumers.
- `ProjectSessionPersistenceAdapter` uses private casts from opaque session handles to concrete runtime objects. This preserves the public app-shell contract, but future persistence-port work could replace the private cast with a package-private adapter interface if TypeScript module boundaries become stricter.
- Successful active restore still clears and replays the active session after candidate validation. This keeps `World`/`CommandStack` object identity stable for current consumers; a later deeper session replacement design may be cleaner but would require reviewed migration of all raw-object consumers.

## Correction round — t3 review blockers

Reviewer blocker corrections were applied without broadening Cycle 022 scope.

### Serialized DTO leakage correction

Changed the app-shell persistence boundary so use cases no longer consume the serialized project DTO shape:

- `AppShellPorts.ts` no longer exposes `SerializedProjectSession` or DTO fields such as schema/version/commands/timestamps. It now exposes an opaque `PersistedProjectSession` payload and an `OpenedProjectSession` result containing only app-shell metadata (`projectName`) plus the opaque payload.
- `ProjectSessionUseCases.openProject()` no longer reads `projectData.name`; it consumes `openedSession.projectName` returned by the session/persistence boundary.
- `RuntimeSession` restores only the opaque validated payload, preserving validation-before-destructive-reset and isolated candidate restore semantics.
- `ProjectSessionPersistenceAdapter` remains the only app-shell bridge that reads `ProjectData.name` and casts the opaque payload back to `ProjectData` for `ProjectService.deserializeCommands()`.
- `AppShellBoundary.test.ts` now asserts that `AppShellPorts.ts` does not expose `SerializedProjectSession` or serialized DTO fields, and that `ProjectSessionUseCases.ts` does not read serialized project shape directly.

### Additional validation evidence

New correction-round logs under `validation/`:

- `t3-prepatch-symbol-scan.stdout`, `t3-prepatch-symbol-scan.stderr` — pre-correction symbol scan for obsolete DTO-boundary names.
- `t3-obsolete-symbol-scan-01.stdout`, `t3-obsolete-symbol-scan-01.stderr` — intermediate scan after first patch.
- `t3-root-workspace-frontend-lint.stdout`, `t3-root-workspace-frontend-lint.stderr` — pass; missing mandatory root workspace frontend lint evidence (`npm run lint --workspace=frontend`) captured from repository root.
- `t3-focused-appshell-vitest.stdout`, `t3-focused-appshell-vitest.stderr` — failed once because the new boundary assertion also rejected the legitimate `nextElementId` snapshot handle; assertion was corrected.
- `t3-focused-vitest-and-frontend-build.stdout`, `t3-focused-vitest-and-frontend-build.stderr` — pass; focused app-shell Vitest 30/30 and frontend build pass with the existing Vite large-chunk warning.
- `t3-final-boundary-scan.stdout`, `t3-final-boundary-scan.stderr` — confirms obsolete `SerializedProjectSession`, `assertProjectData`, and use-case `projectData.name` usage are gone from app-shell production files; remaining DTO field mentions are adapter-private or test fixtures/boundary assertions.

No protected out-of-scope surfaces were modified during this correction.
