# Proposal Direct — Named app-shell runtime session with narrow persistence port

## Summary

Implement Wave 022 by introducing a small app-shell runtime-session boundary that owns the current `World` and `CommandStack` pair plus lifecycle operations that currently leak through app-shell use cases: initialize default world, clear session, snapshot current session, restore loaded project data, mark dirty after restore, observe version for autosave, and expose only the raw objects needed by already-reviewed consumers such as active-plane, keyboard undo/redo, canvas integration, and `SelectionDeletionCommandService` wiring.

The direct path keeps the current `ProjectService` command-stream persistence implementation intact and moves its `ProjectData`/`World`/`CommandStack` knowledge behind adapter-private methods. It does not redesign command descriptors, schema/replay, Drive/auth, backend, rendering, or leaf command producers.

## Files to change

Production:

- `frontend/src/application/appShell/AppShellRuntime.ts`
  - Create one runtime session at the existing composition point.
  - Wire `SelectionDeletionCommandService`, `ActivePlaneUseCases`, `KeyboardShortcutRouter`, and UI-facing returned `world`/`commandStack` from the session's adapter accessors where still required by current consumers.
  - Pass the session boundary, not raw `world`/`commandStack`, into `ProjectSessionUseCases` and `AutoSaveUseCases`.
- `frontend/src/application/appShell/AppShellPorts.ts`
  - Replace `ProjectSessionPersistencePort` raw-pair signatures with session-oriented methods that do not import `World`, `CommandStack`, or `ProjectData` in this port module.
  - Introduce small DTO/opaque aliases if needed, such as `SerializedProjectSession` as `object`/`unknown` at the Drive boundary, without leaking `ProjectService.ProjectData` into use cases.
- New focused module, likely `frontend/src/application/appShell/RuntimeSession.ts` or `frontend/src/application/appShell/ProjectSessionKernel.ts`
  - Own `world: World` and `commandStack: CommandStack` privately or semi-privately.
  - Provide explicit methods: `initializeDefaultWorldIfNeeded()`, `resetToEmptyInitializedWorld()`, `clear()`, `restoreProject(data)`, `snapshot(projectName)`, `getVersion()`, `markDirtyAfterRestore()` if needed, and narrow accessors for existing consumers that still legitimately need concrete objects in this wave.
  - Delegate initialization to `initializeWorld(world, commandStack)` rather than changing initialization command semantics.
- `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts`
  - Become adapter-private bridge from the session snapshot/restore request to `ProjectService.serializeCommands`, `ProjectService.validateProjectData`, and `ProjectService.deserializeCommands`.
  - Continue importing `World`, `CommandStack`, and `ProjectData` only here or in the runtime-session owner if implementation chooses session-owned persistence delegation.
- `frontend/src/application/appShell/ProjectSessionUseCases.ts`
  - Remove constructor dependencies on raw `World`, `CommandStack`, `initializeWorld`, and `ProjectData`.
  - Use runtime-session methods for no-Drive initialization, sign-out clear, create/new reset, snapshot-before-create, open restore, fallback initialization, and dirty marking.
- `frontend/src/application/appShell/AutoSaveUseCases.ts`
  - Remove constructor dependencies on raw `World` and `CommandStack`.
  - Poll session version and request session snapshot through the session/persistence boundary.
- `frontend/src/application/world/initializeWorld.ts`
  - No semantic rewrite expected. At most adjust export/import location only if the new session module becomes the sole application caller. Preserve command-backed behavior.
- `frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts`
  - No public API change expected. Only construction site may receive `session.worldForCommandServices()` / `session.commandStackForCommandServices()` if the direct design hides raw objects behind named accessors.

Tests:

- `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts`
  - Update app-shell use-case tests to assert session methods and persistence boundaries rather than raw pair passing.
  - Cover startup/no-Drive initialization, create/open/new, sign-out, autosave, missing-remote-file recovery, and failure paths.
- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`
  - Add/replace static assertions: `AppShellPorts.ts` must not import `CommandStack`, `World`, or `ProjectData`; `ProjectSessionUseCases.ts` and `AutoSaveUseCases.ts` must not import `CommandStack`, `World`, `ProjectData`, or `initializeWorld`; `ProjectSessionPersistenceAdapter.ts` remains the allowed `ProjectService` import.
  - Keep the existing selection-delete service ownership assertion, updated for the new runtime-session wiring if necessary.
- Add a focused unit file if useful, e.g. `frontend/tests/unit/application/appShell/RuntimeSession.test.ts`, for the session boundary itself.

## Files/tests/docs/fixtures to DELETE

- Delete `ProjectSessionPersistencePort.snapshotCurrentSession(deps: { commandStack: CommandStack; world: World; projectName: string }): ProjectData`.
- Delete `ProjectSessionPersistencePort.restoreSession(data: ProjectData, deps: { world: World; commandStack: CommandStack }): void`.
- Delete app-shell port imports of `CommandStack`, `World`, and `ProjectData` once the new port shape is in place.
- Delete direct `ProjectSessionUseCases` imports/dependencies on `CommandStack`, `World`, `ProjectData`, and `initializeWorld` where replaced by session methods.
- Delete direct `AutoSaveUseCases` imports/dependencies on `CommandStack` and `World` where replaced by session methods.
- Delete tests/fakes that assert persistence receives raw concrete kernel objects or that app-shell ports expose `ProjectData`.
- Delete any transitional overloads or compatibility wrappers that allow old raw-pair persistence calls to coexist with the new session boundary.

No docs/specs, backend files, package/tooling files, fixtures, command descriptor tests, operation registry tests, rendering tests, canvas/tool/process-history tests, or Drive/auth tests should be deleted in this wave unless a reviewed plan edit broadens scope.

## Expected behavior change

No intended user-visible behavior change for successful session flows.

Startup without Drive, startup with last project, create project, open project, new project, sign-out, autosave save/update, missing-remote-file recovery, selection deletion, undo/redo, active-plane setup, and save-status transitions should remain equivalent. Internal architecture changes: app-shell project/session use cases stop passing raw `World`/`CommandStack` pairs and stop importing concrete persistence DTOs.

## Open/restore failure semantics

The implementation must choose **validation-before-destructive-reset / atomic restore** semantics for user-initiated open/restore through the new session boundary. The session boundary must validate the external project payload before clearing the current world or command history. If validation fails, deserialization throws, or session restore cannot complete, the currently active `World`, `CommandStack`, selected/current project metadata, dirty/version state, and autosave eligibility must remain as they were before the attempted open.

Rationale: Wave 022 centralizes session restore ownership, so this is the correct narrow point to remove the current app-shell orchestration flaw where `openProject()` clears the world before validation/restore. The change is intentionally limited to failure atomicity at the new boundary; it must not redesign `ProjectService` schema/replay, command descriptors, persistence formats, or Drive/auth behavior. Successful restore behavior remains equivalent, including projection-plane fallback initialization and dirty marking after a valid project opens.

If implementing atomic restore requires changing `ProjectService` replay/schema internals, operation descriptors, command-stack semantics, or adding a compatibility path, stop and request a reviewed delta instead of broadening implementation.

## No-backcompat rationale

The raw `{ world, commandStack }` persistence port is an internal architecture leak, not a public compatibility contract. Keeping both the old raw-pair API and a named session boundary would preserve ambiguous runtime ownership and force later waves to choose between parallel paths. Delete the old signatures and update active callers/tests directly.

## Validation plan

Implementation must capture full stdout/stderr under `architecture-audit/cycle-022-runtime-session-kernel-persistence-port-boundary/validation/` or the final implementation-cycle validation directory selected by Manager.

1. Pre-edit scoped `git status`/`git diff --stat` for touched paths and static scans for `World`, `CommandStack`, `ProjectData`, `ProjectService`, `snapshotCurrentSession`, `restoreSession`, and `initializeWorld` in app-shell files.
2. Focused Vitest:
   - `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts`
   - `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`
   - any new runtime-session test file
   - invalid/corrupt project payload tests proving user-initiated open validates before destructive reset and leaves the previous world, command stack, project metadata, dirty/version state, and autosave eligibility intact after validation failure.
   - restore/deserialization failure tests proving partial replay errors do not leave a half-cleared or half-restored active session.
   - command-stack/world state assertions after failed open: existing committed command count, undo/redo behavior, projection planes, selected/current project identity, and next element id remain equivalent to the pre-open snapshot.
   - autosave/session exception tests proving snapshot/restore boundary exceptions propagate or surface through existing save-status/error paths without marking the session clean, disabling future autosave, or overwriting the active remote/local project with invalid data.
3. Static/boundary scan proving:
   - `AppShellPorts.ts` no longer imports `World`, `CommandStack`, or `ProjectData`.
   - `ProjectSessionUseCases.ts` and `AutoSaveUseCases.ts` no longer pass raw pairs to persistence.
   - `ProjectSessionPersistenceAdapter.ts` remains the only app-shell `ProjectService` import.
4. `npm run lint` at root and `npm run lint --workspace=frontend` or from `frontend/` where defined.
5. Root and frontend full Vitest.
6. Root and frontend build.
7. Root and frontend Playwright/e2e because project/session/startup/save/autosave and keyboard/delete behavior are user-observable.
8. Refresh live preview bound to `0.0.0.0:5173`, capture HTTP 200 probe, and run Playwright/live smoke for startup/new project plus representative save-status and delete/undo behavior without real Drive credentials.

## Risks and mitigations

- **Risk: runtime session becomes a god object.** Mitigation: restrict it to runtime state ownership, initialization, snapshot/restore, clear/reset, version observation, and narrow raw-object accessors for existing consumers. Do not move leaf command construction or UI state into it.
- **Risk: accidental schema/replay redesign.** Mitigation: keep `ProjectService` semantics unchanged and adapter-private. Stop for plan edit if descriptor/schema/replay changes become necessary.
- **Risk: initialization history semantics shift.** Mitigation: preserve `initializeWorld` behavior and add focused assertions for startup/new/open fallback world initialization and command-stack counts where current tests support it.
- **Risk: open/restore failure atomicity introduces accidental schema/replay work.** Mitigation: implement atomicity only at the session boundary by validating before active-session reset and by restoring into an isolated/new runtime pair, if needed; stop for reviewed delta if this requires `ProjectService` schema/replay changes.
- **Risk: autosave timing regression.** Mitigation: keep scheduler/debounce behavior unchanged and update fake-scheduler tests around session version/snapshot methods, including snapshot/restore exception paths.
- **Risk: raw accessors undermine the boundary.** Mitigation: name them as explicit transitional adapter accessors for still-in-scope consumers and prohibit app-shell persistence/use-case ports from accepting the pair.

## Stop conditions for broader redesign

Stop and request a reviewed plan edit if implementation requires:

- Modifying `ProjectService` schema version, command snapshots, operation descriptors, replay algorithm, or `OperationRegistry`.
- Introducing a generic `ApplicationCommandExecutor` or migrating canvas/style/construction/process-history/toolbar command producers.
- Changing Drive/auth API behavior or using real credentials in tests.
- Reworking rendering selectors, Three view, backend, docs/specs, package/tooling, or validation architecture.
- Adding a broad application kernel/event bus/service locator rather than a narrow session boundary.

## Review recommendation

Recommend this direct proposal for implementation if review agrees that the central defect is app-shell raw runtime/persistence leakage and that a narrow named session boundary is sufficient without reopening persistence schema/replay.
