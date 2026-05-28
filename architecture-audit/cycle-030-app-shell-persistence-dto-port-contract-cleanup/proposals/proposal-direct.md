# Cycle 030 Proposal Direct — Replace cast-only app-shell persisted-session marker with the current project DTO contract

## Summary

Implement the Wave 030 cleanup directly at the app-shell persistence port seam. The app-shell should name the current project persistence payload explicitly and pass it through snapshot, validation, opened-session, restore, create/open, and autosave flows without `object` erasure or `unknown` double casts.

No user-visible behavior change is intended. `ProjectService` remains the current-schema command-stream serializer/deserializer and validation owner.

## Target architecture after implementation

Persistence flow becomes:

1. `RuntimeSession.snapshot(projectName, persistence)` returns the typed current project/session DTO.
2. `ProjectSessionPersistenceAdapter.snapshotCurrentSession(...)` returns `ProjectService.serializeCommands(...)` directly.
3. `DrivePort.createFile(...)` and `DrivePort.updateFile(...)` accept the same typed project/session DTO for trusted save/update paths, while `DrivePort.loadFile(...)` remains `Promise<unknown>` because remote file contents are untrusted until `ProjectService.validateProjectData(...)` succeeds.
4. `ProjectSessionPersistenceAdapter.validateProjectData(data: unknown)` calls `ProjectService.validateProjectData(data)` and returns `{ projectName: data.name, payload: data }` with `payload` typed directly as the current DTO.
5. `RuntimeSession.restoreValidatedProject(...)` restores that typed payload into a candidate world/stack and then into the live session.

The general app-shell ports must continue to avoid leaking concrete `World` and `CommandStack`. The persistence DTO may be imported as a type at the app-shell port boundary only if the implementation chooses the current `ProjectData` type as the single canonical payload type; no runtime service dependency should be introduced into unrelated app-shell modules.

## Files to change

Expected production changes:

- `frontend/src/application/appShell/AppShellPorts.ts`
  - Delete the nominal `PersistedProjectSession` marker.
  - Introduce a single explicit app-shell persistence payload type, preferably `export type ProjectSessionPersistencePayload = ProjectData` imported with `import type { ProjectData } from '@/services/ProjectService'`, unless implementation chooses an equally narrow colocated DTO export that aliases the same current schema.
  - Retype `OpenedProjectSession.payload` to `ProjectSessionPersistencePayload`.
  - Retype `ProjectSessionPersistencePort.snapshotCurrentSession(...)` to return `ProjectSessionPersistencePayload`.
  - Retype `ProjectSessionPersistencePort.restoreSession(...)` to accept `ProjectSessionPersistencePayload`.
  - Retype `DrivePort.createFile(fileName, data)` and `DrivePort.updateFile(fileId, data)` so `data` is `ProjectSessionPersistencePayload`. This is in scope because `ProjectSessionUseCases.createProject(...)` and `AutoSaveUseCases.perform(...)` pass only freshly produced runtime snapshots into these trusted save/update calls.
  - Retype `DrivePort.loadFile(fileId)` to `Promise<unknown>`, not the payload type. Loaded remote content crosses an untrusted boundary and must become typed only through `ProjectSessionPersistencePort.validateProjectData(...)` / `ProjectService.validateProjectData(...)`.
- `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts`
  - Return `ProjectData` directly from `snapshotCurrentSession(...)`.
  - After `ProjectService.validateProjectData(data)`, use `data` directly as `ProjectData` and return it as the opened payload without `unknown` casts.
  - Call `ProjectService.deserializeCommands(payload, ...)` directly.
- `frontend/src/application/appShell/ProjectSessionKernel.ts`
  - Retype `SnapshotCapableProjectSessionKernel.snapshot(...)` to return the selected persistence payload type.
- `frontend/src/application/appShell/RuntimeSession.ts`
  - Retype `snapshot(...)` and preserve candidate-restore flow in `restoreValidatedProject(...)`.
- `frontend/src/application/appShell/ProjectSessionUseCases.ts`
  - Propagate the typed snapshot payload to `drive.createFile(...)` in create paths.
  - Treat `drive.loadFile(...)` output as unknown in open paths and rely on session validation before restore. Do not import `ProjectService` here.
- `frontend/src/application/appShell/AutoSaveUseCases.ts`
  - Propagate the typed snapshot payload to `drive.updateFile(...)` and missing-file `drive.createFile(...)` paths. Do not import `ProjectService` here.
- `frontend/src/services/ProjectService.ts`
  - Prefer no behavior change. Only adjust exported type names or add a zero-runtime type alias if needed for a clean port import. Do not change schema, replay, operation registry, command descriptor semantics, or validation behavior.

Expected test changes:

- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`
  - Replace the stale expectation that `PersistedProjectSession` appears.
  - Add assertions that the app-shell persistence DTO path has no `object` snapshot return and no double-cast bridge.
  - Keep assertions that concrete `World`/`CommandStack` handles are not in general app-shell ports and remain adapter-local through `ProjectSessionPersistenceTargets.ts`.
  - Keep assertions that `ProjectService` usage is localized to the persistence adapter or, if the payload type is imported in `AppShellPorts.ts`, update the rule to distinguish type-only DTO import from runtime service orchestration.
- `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts`
  - Replace `data: any` and `payload: data as never` mocks with typed payload builders.
  - Assert create, open, autosave update, and missing-file re-create pass the typed payload from session snapshot/validation without generic object assumptions.
- Add/update focused adapter tests if existing coverage does not directly prove:
  - snapshot returns a `ProjectData`-shaped payload;
  - validation rejects invalid unknown input via `ProjectService.validateProjectData`;
  - validation returns the same typed payload that restore consumes;
  - restore invokes `ProjectService.deserializeCommands` without casts or wrapper conversion.

## Files/tests/docs/fixtures to DELETE

- Delete `PersistedProjectSession` from `AppShellPorts.ts` if it is only the current nominal marker.
- Delete `object` return types from `ProjectSessionPersistencePort.snapshotCurrentSession`, `ProjectSessionKernel.snapshot`, and `RuntimeSession.snapshot` for the project persistence payload path.
- Delete the adapter double casts:
  - `projectData as unknown as PersistedProjectSession`;
  - `data as unknown as ProjectData` in restore.
- Delete stale app-shell boundary expectations requiring `PersistedProjectSession` and forbidding any explicit current DTO type at the persistence port.
- Delete stale test mocks using `data: any` or `payload: data as never` for project-session persistence.
- Do not delete production persistence schema/replay code, operation registries, command operations, Drive/auth internals, backend, docs/specs, rendering files, or e2e files unless a specific stale test assertion is replaced by current coverage.

## Expected behavior change

None. Current project creation, open, autosave, validation failure behavior, candidate restore safety, undo/redo after load, active-plane restoration, and current app shell/3D overlay behavior should remain equivalent.

## Risks and mitigations

- **Risk: importing `ProjectData` into `AppShellPorts.ts` appears to violate an older architecture test.** Mitigation: update the architecture guard intentionally. The old rule protected against service orchestration leaking into app-shell ports; Wave 030 chooses an explicit current DTO contract instead of a cast-only marker. If reviewers prefer avoiding `ProjectService` type import in `AppShellPorts.ts`, use the restructure proposal's dedicated DTO module variant.
- **Risk: DrivePort save/update payloads remain partially generic.** Mitigation: this direct proposal explicitly chooses the boundary rule: `DrivePort.createFile` and `DrivePort.updateFile` are in scope and must accept `ProjectSessionPersistencePayload`; `DrivePort.loadFile` must remain `unknown`. If making create/update typed requires Drive/auth internals, OAuth/session behavior, external API schema redesign, or a GoogleDriveService runtime rewrite, stop for a reviewed delta instead of broadening the wave or leaving a half-tightened public app-shell boundary.
- **Risk: tests encode generic payload assumptions.** Mitigation: delete/update stale mocks and assert typed payload builders.
- **Risk: command descriptor residuals surface during `ProjectService` tests.** Mitigation: do not redesign descriptors in this wave. Stop for a reviewed delta if cast removal truly requires descriptor schema changes.

## Validation plan

Implementation validation must capture logs under `architecture-audit/cycle-030-app-shell-persistence-dto-port-contract-cleanup/validation/`:

1. Static scans for `PersistedProjectSession`, `snapshot(...): object`, `snapshotCurrentSession(...): object`, `as unknown as PersistedProjectSession`, `as unknown as ProjectData`, and app-shell persistence `data: any` mocks.
2. Focused app-shell tests:
   - `npm run test --workspace=frontend -- AppShellBoundary AppShellRuntimeUseCases` or the repository-equivalent Vitest invocation.
   - Include focused adapter/runtime tests if created or updated.
3. Focused `ProjectService` persistence tests if touched.
4. Root and frontend lint.
5. Root and frontend full Vitest.
6. Root and frontend build.
7. Root and frontend Playwright/e2e because app-shell persistence is user-observable.
8. Live preview refresh/reachability and credential-free smoke preserving current UI contract, representative drawing, active-plane switch, undo/redo, and 3D overlay pointer ownership. Add save/open/autosave live smoke only if available without protected credentials.

## No-backcompat / aggressive deletion rationale

The marker `PersistedProjectSession` is not a product compatibility boundary; it exists only to hide the concrete `ProjectData` payload while forcing casts at both adapter edges. Keeping it alongside a typed DTO would preserve a dual path. Delete the marker and generic object snapshot path rather than wrapping them.

## DrivePort create/update payload boundary rule

Decision for implementation: `DrivePort.createFile(...)` and `DrivePort.updateFile(...)` are part of the Wave 030 app-shell persistence DTO seam and must be retyped from generic `object` to the selected `ProjectSessionPersistencePayload`. `DrivePort.loadFile(...)` must move in the opposite direction, from `Promise<object>` to `Promise<unknown>`, because loaded remote data is untrusted until the persistence port validates it.

Rationale:

- Current source shows the trusted save path is app-shell-local: `ProjectSessionUseCases.createProject(...)` snapshots the runtime session and immediately passes that snapshot to `drive.createFile(...)`; `AutoSaveUseCases.perform(...)` and the missing-file recovery branch do the same for `drive.updateFile(...)` / `drive.createFile(...)`.
- Current source shows the open path is untrusted: `ProjectSessionUseCases.openProject(...)` receives `drive.loadFile(...)` output and only then calls `session.validateProjectData(...)` before restore.
- The cleanup target is the public app-shell persistence DTO seam. Leaving create/update as `object` would preserve a generic public save boundary after deleting `PersistedProjectSession`, which is exactly the half-tightened contract risk raised in review round 01.
- Retyping the app-shell `DrivePort` interface and its tests/mocks is in scope; redesigning Google Drive auth/session internals, external API response handling, credentials, or Drive storage behavior is out of scope. If create/update typing cannot be completed without those internals, implementation must stop for a reviewed delta rather than broadening ad hoc.

## Protected surfaces

Do not touch command descriptor design, `OperationRegistry`, operation implementations, command stack semantics, project schema version/migration/backcompat, Drive/auth internals beyond satisfying the app-shell `DrivePort` type contract at existing adapter boundaries, backend, docs/specs, rendering/CSS/canvas/3D presentation files, package/tooling, or unrelated dirty files. Preserve Waves 024–029 boundaries and current 3D overlay pointer behavior.

## Stop conditions

Stop and return for a reviewed delta/plan correction if any of the following become true during implementation:

- Retyping `DrivePort.createFile/updateFile` to `ProjectSessionPersistencePayload` requires Drive/auth internals redesign, credential handling changes, Google API behavior changes, or protected config inspection.
- Removing the app-shell casts requires changing command descriptors, `CommandSnapshot`, `OperationRegistry`, command replay semantics, schema versioning, or migration/backcompat behavior.
- Implementation would need to leave both the old generic `object` save/update public path and the new typed payload path alive.

## Recommendation

Select this direct proposal if Critic/Reviewer accept a type-only current DTO dependency at the app-shell persistence port or an equivalent narrow alias that does not introduce a new abstraction layer. It is the smallest honest deletion of the cast seam and now explicitly requires the trusted `DrivePort` create/update save path to use the same selected payload while preserving unknown input for load/validation.
