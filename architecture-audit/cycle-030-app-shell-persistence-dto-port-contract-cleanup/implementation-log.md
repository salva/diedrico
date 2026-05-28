# Cycle 030 Implementation Log — App-shell persistence DTO port contract cleanup

## Summary

Implemented the decision-selected direct path from `decision.md` / `proposal-direct.md`.

The app-shell persistence seam now names the trusted current ProjectService DTO as `ProjectSessionPersistencePayload` and passes it through snapshot, validated open, restore, create, update, and autosave paths without the old `PersistedProjectSession` nominal marker or adapter double casts. Remote load remains untrusted (`Promise<unknown>`) until `ProjectSessionPersistenceAdapter.validateProjectData(...)` delegates to `ProjectService.validateProjectData(...)`.

No ProjectService schema, replay, validation, command descriptor, Drive/auth internals, rendering/canvas/3D, package/tooling, backend, docs, or specs behavior was changed.

## Source files changed

- `frontend/src/application/appShell/AppShellPorts.ts`
  - Deleted `PersistedProjectSession`.
  - Added `export type ProjectSessionPersistencePayload = ProjectData` as a type-only current DTO contract.
  - Retyped `OpenedProjectSession.payload`, `ProjectSessionPersistencePort.snapshotCurrentSession(...)`, `ProjectSessionPersistencePort.restoreSession(...)`.
  - Retyped `DrivePort.createFile(...)` / `updateFile(...)` to accept `ProjectSessionPersistencePayload` and `loadFile(...)` to return `Promise<unknown>`.
- `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts`
  - Returns `ProjectService.serializeCommands(...)` directly as `ProjectSessionPersistencePayload`.
  - Keeps `ProjectService.validateProjectData(data)` as the only unknown-input validation gate.
  - Returns `{ projectName: data.name, payload: data }` after assertion narrowing.
  - Passes the typed payload directly into `ProjectService.deserializeCommands(...)`.
- `frontend/src/application/appShell/ProjectSessionKernel.ts`
  - Retyped snapshot return to `ProjectSessionPersistencePayload`.
- `frontend/src/application/appShell/RuntimeSession.ts`
  - Retyped snapshot return to `ProjectSessionPersistencePayload`.
  - Candidate restore safety was left unchanged: restore into candidate world/stack first; live session is cleared/restored only after candidate restore succeeds.
- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`
  - Replaced stale `PersistedProjectSession` expectations with explicit Cycle 030 DTO/DrivePort boundary assertions.
  - Added seam-removal guard for marker names, double casts, and object snapshot signatures.
  - Preserved concrete `World`/`CommandStack` boundary assertions and adapter-local target checks.
- `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts`
  - Replaced `data: any` / `payload: data as never` persistence mock shims with a typed `ProjectSessionPersistencePayload` builder.
  - Added assertions that create, autosave update, missing-file recreate, validation, and restore paths pass the typed payload through the app-shell seam.

## Authorized delete list / proof

- `PersistedProjectSession` alias: deleted from production app-shell ports.
- `object` snapshot/restore payload signatures in the app-shell persistence path: deleted from `ProjectSessionPersistencePort`, `ProjectSessionKernel`, and `RuntimeSession` snapshot/restore signatures.
- `projectData as unknown as PersistedProjectSession`: deleted from `ProjectSessionPersistenceAdapter.ts`.
- `data as unknown as ProjectData`: deleted from `ProjectSessionPersistenceAdapter.ts`.
- Stale tests asserting marker behavior: replaced in `AppShellBoundary.test.ts`.
- Stale app-shell persistence mocks using `data: any` / `payload: data as never`: replaced in `AppShellRuntimeUseCases.test.ts`.
- Transitional compatibility wrappers / dual raw-object typed paths: none added; static seam scans show no production app-shell remnants.

Proof log: `validation/static-scans.log` has empty sections for production app-shell seam remnants and stale app-shell mock shims.

## Persistence DTO ownership evidence

- The only explicit app-shell DTO name is `ProjectSessionPersistencePayload` in `AppShellPorts.ts`.
- It is a type-only alias to `ProjectData`; no duplicate schema interface, runtime wrapper, migration facade, or parallel schema owner was introduced.
- `ProjectSessionPersistenceAdapter.ts` remains the only app-shell module that invokes `ProjectService` runtime methods.
- `AppShellPorts.ts` imports only the `ProjectData` type; it does not instantiate or call `ProjectService`.

## DrivePort boundary evidence

- `DrivePort.createFile(fileName, data)` accepts `ProjectSessionPersistencePayload`.
- `DrivePort.updateFile(fileId, data)` accepts `ProjectSessionPersistencePayload`.
- `DrivePort.loadFile(fileId)` returns `Promise<unknown>`.
- `ProjectSessionUseCases.openProject(...)` still validates the loaded unknown via `session.validateProjectData(..., persistence)` before restore.
- No Drive/auth internals, credential logic, OAuth behavior, Google API behavior, or protected config/secret file was inspected or changed.

## Validation log index

All validation artifacts are under `architecture-audit/cycle-030-app-shell-persistence-dto-port-contract-cleanup/validation/`.

### Source-control / static evidence

- Initial scoped MCP diff before edits: empty for in-scope implementation paths (captured in worker trace; broad MCP status overflowed due known noisy worktree).
- `post-path-status.log`: only the six intended source/test files were modified among scoped implementation paths at the time captured.
- `post-path-diffstat.log`: six intended source/test files changed.
- `static-scans.log`: no production app-shell seam remnants and no stale app-shell mock shims; unrelated pre-existing dirty frontend files are listed under protected/out-of-scope source scan and were not touched, staged, normalized, or incorporated.
- `driveport-usage-scan.stdout.log`: records app-shell `DrivePort` signatures and existing GoogleDriveService method shapes; no Drive/auth implementation changes were needed.

Note: the broader worktree is noisy. The unrelated files listed in `static-scans.log` are outside this wave’s changed-file set and were not modified by this implementation.

### Focused tests

- `focused-appshell-tests.stdout.log` / `.stderr.log`: `npm run test --workspace=frontend -- AppShellBoundary AppShellRuntimeUseCases` — pass, 39 tests.
- `focused-appshell-tests-rerun.stdout.log` / `.stderr.log`: same focused command after final test cleanup — pass, 39 tests.

### Lint / architecture guards

- `root-lint.stdout.log` / `.stderr.log`: `npm run lint` — pass.
- `frontend-lint.stdout.log` / `.stderr.log`: `npm run lint --workspace=frontend` — pass.

### Full unit tests

- `root-vitest.stdout.log` / `.stderr.log`: `npm run test` — pass.
- `frontend-vitest.stdout.log` / `.stderr.log`: `npm run test --workspace=frontend` — pass.

### Builds

- `root-build.stdout.log` / `.stderr.log`: `npm run build` — pass. Existing Vite chunk-size warning only.
- `frontend-build.stdout.log` / `.stderr.log`: `npm run build --workspace=frontend` — pass. Existing Vite chunk-size warning only.

### E2E / Playwright

- `root-e2e.stdout.log` / `.stderr.log`: `npm run test:e2e` — pass, 10 tests.
- `frontend-e2e.stdout.log` / `.stderr.log`: `npm run test:e2e --workspace=frontend` — pass, 10 tests.

These e2e runs cover the current app shell, representative drawing, active-plane switch, undo/redo keyboard behavior, and current 3D overlay pointer ownership.

### Live preview refresh / credential-free smoke

- Refreshed live preview by terminating any prior process on `5173/tcp` and starting `npm run dev -- --host 0.0.0.0` from the project root.
- New preview PID recorded in `live-preview-server.pid`.
- Server stdout/stderr recorded in `live-preview-server.stdout.log` / `.stderr.log`.
- Reachability probe recorded in `live-preview-reachability.html` and `preview-refresh.stdout.log`; HTTP 200 returned from `http://127.0.0.1:5173/`.
- `live-smoke.stdout.log` / `.stderr.log`: credential-free Playwright smoke against the live preview passed for app shell, canvas/status/overlay visibility, representative drawing, active-plane interaction, undo/redo keyboard commands, and 3D overlay pointer ownership with stable 2D canvas viewBox.
- Credential-free save/open/autosave live smoke was skipped because the current app shell exposes those flows only through Google Drive credentials; protected credential/config files were not inspected.

## Protected surfaces / scope compliance

- No changes to `frontend/src/services/ProjectService.ts` schema, validation assertions, replay semantics, schema version, command descriptors, migration/backcompat, or operation registry.
- No changes to Drive/auth internals or credential handling.
- No changes to rendering, CSS, canvas, 3D presentation/style policy, selector orchestration, UI feature behavior, backend, docs, specs, package scripts, dependencies, or validation-platform tooling.
- No broad source refactor or app-shell production composition redesign.

## Source-control reconciliation

- Intended changed source/test files: six files listed in `post-path-diffstat.log`.
- Intended audit artifacts: this `implementation-log.md` and validation logs under the Cycle 030 validation directory.
- Unrelated dirty files in the broader worktree remain untouched; they are visible only in `static-scans.log` as existing out-of-scope diffs and are not part of this implementation.

## Residual risks

- `AppShellPorts.ts` now has a type-only dependency on `ProjectData`, as explicitly accepted by `decision.md`. Future architecture tests should preserve the distinction between type-only DTO naming and runtime service orchestration.
- `GoogleDriveService` still accepts broad `object` in its concrete methods. This is acceptable for this wave because the reviewed rule applies to the app-shell `DrivePort` boundary, production composition remains structurally compatible, and no Drive/auth internals redesign was authorized.
- Command descriptor / operation serialization residuals remain future-wave concerns; no changes were needed for this DTO port cleanup.

## Next-wave candidates

- A future central wave can address command descriptor / operation serialization typing if still architecturally central after Cycle 030.
- A lower-centrality future wave can revisit presentation-private 3D style-policy and thin selector orchestration cleanup.
