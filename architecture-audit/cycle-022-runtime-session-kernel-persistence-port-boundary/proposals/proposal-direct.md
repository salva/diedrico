# Proposal Direct — Extract a bounded project-session kernel and adapter-facing persistence targets

## Recommendation

Proceed with a bounded Wave 022 implementation. Current source does not require another plan correction: app-shell ports are already partly abstract, but `RuntimeSession` and `ProjectSessionPersistenceAdapter` still share concrete persistence handles and `ProjectSessionUseCases` depends on the concrete `RuntimeSession` class. The direct fix is to name the runtime/session/persistence contract, move adapter-facing handles out of `RuntimeSession.ts`, and delete the concrete cross-import seam.

This proposal intentionally leaves `ProjectService` command-stream persistence, operation descriptors, schema versioning, Drive/auth, rendering, canvas/tool command producers, process-history producers, and UI behavior unchanged.

## Target outcome

After implementation:

- App-shell use cases depend on a narrow project-session kernel interface, not on the concrete `RuntimeSession` class.
- `ProjectSessionPersistenceAdapter` no longer imports `RuntimeSession.ts`.
- Concrete `World`/`CommandStack` handles are scoped to a small adapter-facing contract module and the runtime/session implementation, not the public app-shell port file or use-case code.
- `ProjectService` remains the only concrete command-stream serializer/deserializer, reached through `ProjectSessionPersistenceAdapter`.
- `RuntimeSession` remains the single owner of runtime `World`, `CommandStack`, initialization, restore isolation, selection-delete wiring, view ports, and command-history port creation.

## Implementation design

### 1. Introduce a small project-session kernel contract

Add a new file such as:

- `frontend/src/application/appShell/ProjectSessionKernel.ts`

Define only the project/session methods currently needed by project-session and autosave flows:

- `initializeDefaultWorldIfNeeded(): void`
- `resetToEmptyInitializedWorld(): void`
- `clear(): void`
- `getVersion(): number`
- `snapshot(projectName: string, persistence: ProjectSessionPersistencePort): object`
- `validateProjectData(data: unknown, persistence: ProjectSessionPersistencePort): OpenedProjectSession`
- `restoreValidatedProject(openedSession: OpenedProjectSession, persistence: ProjectSessionPersistencePort): void`

If desired, split into `SnapshotCapableProjectSessionKernel` for autosave and full `ProjectSessionKernel` for project-session use cases. Do not add view ports, command-history, selection, or command-producer methods to this kernel.

### 2. Move adapter-facing persistence target types out of RuntimeSession

Create a small module such as:

- `frontend/src/application/appShell/ProjectSessionPersistenceTargets.ts`

It should own the adapter-facing concrete handles, for example:

- `ProjectSessionSnapshotSource extends RuntimeSessionSnapshotHandle` with `readonly commandStack: CommandStack`
- `ProjectSessionRestoreTarget extends RuntimeSessionRestoreHandle` with `readonly world: World; readonly commandStack: CommandStack`

This is the only app-shell contract module allowed to import concrete `World`/`CommandStack` for persistence target typing. It is deliberately adapter-facing and not imported by `ProjectSessionUseCases` or `AutoSaveUseCases`.

Then:

- Update `RuntimeSession.snapshotHandle()` / `restoreTarget()` to return these target/source types.
- Delete `RuntimeSessionPersistenceSnapshotHandle` and `RuntimeSessionPersistenceRestoreHandle` exports from `RuntimeSession.ts`.
- Update `ProjectSessionPersistenceAdapter` to import the new target/source types instead of importing from `./RuntimeSession`.

### 3. Narrow ProjectSessionUseCases dependency

Update `ProjectSessionUseCases.ts`:

- Replace `import type { RuntimeSession } from './RuntimeSession'` with `import type { ProjectSessionKernel } from './ProjectSessionKernel'`.
- Change constructor dependency `session: RuntimeSession` to `session: ProjectSessionKernel`.
- Leave startup/create/open/new/sign-out behavior unchanged.

### 4. Align AutoSaveUseCases without broadening it

Option A (preferred if simple): update `AutoSaveRuntimeSessionPort` to be an alias or subset of the snapshot-capable kernel contract, so autosave still sees only `getVersion()` and `snapshot(...)`.

Option B: leave `AutoSaveRuntimeSessionPort` in place if merging contracts causes churn. The direct wave does not require eliminating every local interface; it requires deleting raw persistence/kernel exposure and concrete runtime dependencies in use cases.

Do not make autosave know restore, initialization, Drive, browser storage, or command history.

### 5. Preserve RuntimeSession behavior

Keep these behaviors equivalent:

- Runtime owns `new World()` and `new CommandStack()` (`RuntimeSession.ts`).
- `initializeDefaultWorldIfNeeded()` still calls `initializeWorld(world, commandStack)`.
- `resetToEmptyInitializedWorld()` clears world/stack and reinitializes.
- `restoreValidatedProject()` still restores into an isolated candidate world/stack first before clearing active state, then restores into active state and initializes empty projects when needed.
- `selectionDeletionCommandPort()` still returns `new SelectionDeletionCommandService(world, commandStack)`.
- `commandHistoryPort()` still delegates undo/redo to the same stack.

## Files to change

Production source:

- Add `frontend/src/application/appShell/ProjectSessionKernel.ts`.
- Add `frontend/src/application/appShell/ProjectSessionPersistenceTargets.ts` or equivalent small adapter-facing module.
- Modify `frontend/src/application/appShell/RuntimeSession.ts` to implement/import the new contracts and delete exported persistence handle interfaces.
- Modify `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts` to import adapter target/source types from the new module instead of `RuntimeSession.ts`.
- Modify `frontend/src/application/appShell/ProjectSessionUseCases.ts` to depend on `ProjectSessionKernel`.
- Modify `frontend/src/application/appShell/AutoSaveUseCases.ts` only if sharing the snapshot-capable kernel contract is a net simplification.
- Modify `frontend/src/application/appShell/AppShellRuntime.ts` only for type alignment if needed; no production browser or composition behavior changes.

Tests:

- Update `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts` fixtures to type against the new kernel contract where they currently construct `RuntimeSession` directly for use-case tests.
- Update `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts` static assertions:
  - `ProjectSessionUseCases.ts` must not import `RuntimeSession`.
  - `ProjectSessionPersistenceAdapter.ts` must not import `RuntimeSession`.
  - `AppShellPorts.ts` remains free of `World`, `CommandStack`, and `ProjectData` imports.
  - `ProjectService` remains adapter-private in app-shell.
  - selection-delete boundary remains unchanged.

## Files/tests/docs/fixtures to DELETE

Delete source surfaces:

- `RuntimeSessionPersistenceSnapshotHandle` export from `RuntimeSession.ts`.
- `RuntimeSessionPersistenceRestoreHandle` export from `RuntimeSession.ts`.
- `ProjectSessionPersistenceAdapter.ts` import from `./RuntimeSession`.
- `ProjectSessionUseCases.ts` import from `./RuntimeSession`.
- Any test fixture that requires a fake full `RuntimeSession` when it only needs project-session kernel methods.

Do not delete:

- `ProjectData`, `ProjectService.serializeCommands`, `ProjectService.deserializeCommands`, current schema validation, or command snapshots.
- `createAppShellRuntime().internals` solely for cleanup.
- Selection-delete service/port.
- Canvas/tool/process-history command producers.
- Any e2e spec, package metadata, backend/docs/specs, or 3D/CSS/rendering file.

## Expected behavior change

None intended. This is an architecture/typing boundary refactor only.

Preserved user-visible behavior:

- Local startup initializes default planes and status as before.
- Drive-enabled create/open/new/rename/sign-out flows behave as before with fake/no-credential validation.
- Autosave polling/debounce/save-status behavior is unchanged.
- Undo/redo and command-history semantics are unchanged, including initialization being command-backed.
- Selection Delete/Backspace and undo remain unchanged.
- 3D overlay pointer ownership remains unchanged.

## Risks and mitigations

- **Risk: kernel becomes a god object.** Mitigation: kernel contains only project-session lifecycle/snapshot/restore/version methods; no view ports, command producers, selection, rendering, browser, or Drive methods.
- **Risk: adapter target module looks like a compatibility shim.** Mitigation: it is a replacement boundary, not a dual path. Delete old RuntimeSession-exported handle types and old imports in the same change.
- **Risk: hidden schema/replay change.** Mitigation: do not edit `ProjectService` behavior beyond import/type fallout; run ProjectService round-trip tests if touched.
- **Risk: restore isolation regression.** Mitigation: keep and focus-test the existing candidate restore behavior before clearing active state.
- **Risk: autosave status regression.** Mitigation: run existing autosave timer/error tests and avoid changing scheduler/Drive handling.
- **Risk: unrelated dirty files pollute implementation.** Mitigation: use path-scoped diffs and stage only Wave 022 files.

## No-backcompat / aggressive-deletion rationale

The old adapter-to-runtime import and concrete use-case dependency are internal architecture debt, not public compatibility contracts. Keeping both the old `RuntimeSession` handle exports and the new kernel would preserve two ownership models. Delete the old cross-imports and update current tests directly.

## Validation plan

Implementation must capture logs under `architecture-audit/cycle-022-runtime-session-kernel-persistence-port-boundary/validation/`:

1. Pre-edit path-scoped status/diff and static source scans for Wave 022 paths plus protected dirty files.
2. Focused static boundary scan proving:
   - no `RuntimeSession` import in `ProjectSessionPersistenceAdapter.ts`;
   - no `RuntimeSession` import in `ProjectSessionUseCases.ts`;
   - no concrete `World`, `CommandStack`, or `ProjectData` imports in `AppShellPorts.ts`;
   - app-shell `ProjectService` import exists only in `ProjectSessionPersistenceAdapter.ts`;
   - selection-delete boundary remains unchanged.
3. Focused Vitest:
   - `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts`
   - `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`
   - `frontend/tests/unit/application/selectionDeletion/SelectionDeletionCommandService.test.ts` if boundary assertions or runtime wiring are touched
   - relevant `frontend/tests/unit/services/ProjectService.*.spec.ts` if adapter type changes require behavior confirmation.
4. Root and frontend lint.
5. Root and frontend full Vitest.
6. Root and frontend build.
7. Root and frontend Playwright/e2e.
8. Live preview refresh on `0.0.0.0:5173`, HTTP probe, and credential-free browser smoke for startup/new project, Delete/Backspace + undo, and 3D overlay no-click-through.

## Stop conditions

Stop for reviewed plan edit if implementation requires:

- changing project schema, operation descriptors, `OperationRegistry`, migration/replay policy, or command snapshots;
- changing Drive/auth internals or browser production composition;
- migrating canvas/tool/construction/process-history command producers;
- editing rendering, Three, SVG, overlay CSS, or UI features;
- keeping compatibility overloads for both old runtime-handle exports and new kernel contracts;
- touching unrelated dirty files to make tests pass.

## Boundary preservation checklist

- Wave 020 app-shell composition: preserved; no browser/global default reintroduced.
- Corrected Wave 021 selection-delete boundary: preserved; runtime still wires existing port/service.
- Cycle 026 3D overlay pointer boundary: preserved; no rendering/CSS change and validation protects it.
