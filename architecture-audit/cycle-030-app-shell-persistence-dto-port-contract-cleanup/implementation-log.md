# Cycle 030 Implementation Log — App-shell persistence DTO port contract cleanup

## Scope and source-control hygiene

- Decision followed: `architecture-audit/cycle-030-app-shell-persistence-dto-port-contract-cleanup/decision.md` selected the direct proposal.
- Pre-edit scoped evidence: `validation/pre-edit-status-diffstat.log` showed no scoped source/test diff before this retry began.
- Current retry found the selected DTO contract already present in the in-scope source files and did not broaden implementation beyond the decision-selected seam.
- No protected config/secret files were read. No backend, docs, specs, package/tooling, Drive/auth internals, command descriptor/replay/schema, rendering/CSS/canvas/3D presentation, or unrelated dirty files were edited.
- Post-edit scoped evidence: `validation/post-edit-status-diffstat.log` shows no scoped production/test diff; only Cycle 030 validation evidence was newly written during this retry.

## Source files changed by the selected implementation

The direct Cycle 030 source/test implementation is present in the current tree with no additional source diff in this retry:

- `frontend/src/application/appShell/AppShellPorts.ts`
  - Defines `ProjectSessionPersistencePayload` as a type-only alias to `ProjectData`.
  - `OpenedProjectSession.payload`, `ProjectSessionPersistencePort.snapshotCurrentSession(...)`, `ProjectSessionPersistencePort.restoreSession(...)`, `DrivePort.createFile(...)`, and `DrivePort.updateFile(...)` use the typed payload.
  - `DrivePort.loadFile(...)` returns `Promise<unknown>`.
- `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts`
  - `snapshotCurrentSession(...)` returns `ProjectService.serializeCommands(...)` directly.
  - `validateProjectData(data: unknown)` delegates to `ProjectService.validateProjectData(data)` before returning the typed opened payload.
  - `restoreSession(...)` passes the typed payload directly to `ProjectService.deserializeCommands(...)`.
- `frontend/src/application/appShell/ProjectSessionKernel.ts` and `frontend/src/application/appShell/RuntimeSession.ts`
  - Runtime snapshot methods return `ProjectSessionPersistencePayload`.
  - `RuntimeSession.restoreValidatedProject(...)` preserves candidate-restore safety before live-session restore.
- `frontend/src/application/appShell/ProjectSessionUseCases.ts` and `frontend/src/application/appShell/AutoSaveUseCases.ts`
  - Trusted create/update/autosave paths propagate session snapshots into the typed DrivePort save/update calls.
  - Open path treats `drive.loadFile(...)` output as unknown and validates before restore.
- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`
  - Guards the DTO type alias, DrivePort create/update/load boundary rule, deletion of cast-only markers, deletion of object snapshot signatures, and localization of ProjectService usage.
- `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts`
  - Uses typed `ProjectSessionPersistencePayload` builders and exercises create/open/autosave/missing-file behavior without generic-object/cast-shim mocks.

No `frontend/src/services/ProjectService.ts` behavior or type export change was required.

## Authorized delete list / proofs

- `PersistedProjectSession` alias: deleted from app-shell source. Remaining grep hits are only negative test assertions in `AppShellBoundary.test.ts`; see `validation/post-static-scans.log`.
- `object` snapshot/restore payload signatures: no app-shell persistence-path matches for `snapshot(...): object` or `snapshotCurrentSession(...): object`; see `validation/post-static-scans.log`.
- Double casts through `unknown` / object at adapter boundary: no source matches for `as unknown as PersistedProjectSession` or `as unknown as ProjectData`; see `validation/post-static-scans.log`.
- Stale tests asserting object marker behavior: replaced by Cycle 030 boundary assertions for `ProjectSessionPersistencePayload` and DrivePort save/load rules.
- Transitional compatibility wrappers / dual raw-object and typed paths: none found in app-shell persistence source; create/update use `ProjectSessionPersistencePayload`, load remains `unknown`.
- Stale app-shell persistence mocks using `data: any` or `payload: data as never`: no focused app-shell test matches; see `validation/post-static-scans.log`.

## Persistence DTO ownership evidence

- `AppShellPorts.ts` contains only a type-only import of `ProjectData` and the alias `ProjectSessionPersistencePayload = ProjectData`.
- Runtime orchestration modules do not import `ProjectService`; `ProjectSessionPersistenceAdapter.ts` remains the only app-shell production module invoking `ProjectService` behavior.
- Validation/restoration of unknown loaded data remains owned by `ProjectService.validateProjectData(...)` through `ProjectSessionPersistenceAdapter.validateProjectData(...)`.

## DrivePort boundary evidence

- `DrivePort.createFile(fileName, data)` accepts `ProjectSessionPersistencePayload`.
- `DrivePort.updateFile(fileId, data)` accepts `ProjectSessionPersistencePayload`.
- `DrivePort.loadFile(fileId)` returns `Promise<unknown>` until app-shell session validation succeeds.
- The implementation did not inspect or modify Drive/auth internals, credential handling, Google API behavior, or protected config.

## Validation log index

All validation evidence was captured under `architecture-audit/cycle-030-app-shell-persistence-dto-port-contract-cleanup/validation/`.

| Check | Command / evidence | Result |
| --- | --- | --- |
| Pre-edit scoped status/diffstat | `pre-edit-status-diffstat.log` | Pass: no scoped source/test diff at retry start. |
| Static scans | `static-scans.log`, `post-static-scans.log` | Pass: no source seam remnants; remaining `PersistedProjectSession` / double-cast text is negative test assertion only. |
| Focused app-shell Vitest | `npm run test --workspace=frontend -- tests/unit/application/appShell/AppShellBoundary.test.ts tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts` | Pass: 2 files, 39 tests. Logs: `focused-appshell-vitest.stdout.log`, `.stderr.log`. |
| Root lint | `npm run lint` | Pass: architecture tests 11/11. Logs: `root-lint.stdout.log`, `.stderr.log`. |
| Frontend lint | `npm run lint --workspace=frontend` | Pass: architecture tests 11/11. Logs: `frontend-lint.stdout.log`, `.stderr.log`. |
| Root full Vitest | `npm run test` | Pass: 115 files passed, 1 skipped; 1292 tests passed, 45 skipped, 11 todo. Logs: `root-vitest.stdout.log`, `.stderr.log`. |
| Frontend full Vitest | `npm run test --workspace=frontend` | Pass: 115 files passed, 1 skipped; 1292 tests passed, 45 skipped, 11 todo. Logs: `frontend-vitest.stdout.log`, `.stderr.log`. |
| Root build | `npm run build` | Pass. Existing Vite chunk-size warning only. Logs: `root-build.stdout.log`, `.stderr.log`. |
| Frontend build | `npm run build --workspace=frontend` | Pass. Existing Vite chunk-size warning only. Logs: `frontend-build.stdout.log`, `.stderr.log`. |
| Root Playwright/e2e first attempt | `npm run test:e2e` | Initial failure: existing duplicate preview occupied/confused `localhost:5173`; Playwright webServer started on 5174 and timed out. Logs: `root-e2e.stdout.log`, `.stderr.log`, `e2e-port-conflict-probe.log`. Not source-attributable. |
| Preview duplicate cleanup | Process/listener/reachability evidence | Pass: removed duplicate non-canonical preview, left one `0.0.0.0:5173` server reachable. Log: `preview-duplicate-cleanup.log`. |
| Root Playwright/e2e rerun | `npm run test:e2e` | Pass: 10/10 Playwright tests. Logs: `root-e2e-rerun.stdout.log`, `.stderr.log`. |
| Frontend Playwright/e2e | `npm run test:e2e --workspace=frontend` | Pass: 10/10 Playwright tests. Logs: `frontend-e2e.stdout.log`, `.stderr.log`. |
| Live preview refresh/reachability | ensured one `npm run dev -- --host 0.0.0.0` preview and probed HTTP | Pass: `0.0.0.0:5173` listening; `127.0.0.1:5173` and `localhost:5173` returned HTTP 200. Logs: `live-preview-refresh.log`, `live-preview-server.stdout.log`, `.stderr.log`, `live-preview.pid`. |
| Post-edit scoped status/diffstat | `post-edit-status-diffstat.log` | Pass: no scoped production/test source diff; validation PID/logs are the only scoped untracked evidence before commit. |

## Credential-free smoke / 3D overlay preservation

- Playwright `current-ui-contract.spec.ts` passed in both root rerun and frontend e2e runs.
- Coverage includes current app shell rendering, representative free-point creation, active-plane selector exposure/switching, 3D coordinate status, and 3D overlay pointer ownership not passing drag gestures through to the 2D canvas.
- Keyboard e2e covered Delete, undo, redo, Escape, and Ctrl+A selection-command behavior.
- Save/open/autosave live smoke is limited to credential-free unit/use-case coverage because the current production Drive-backed save/open UI path requires Google credentials; no protected credentials/config were read.

## Residual risks and notes

- The selected implementation intentionally permits a type-only `ProjectData` import in `AppShellPorts.ts`; runtime ProjectService behavior remains adapter-private.
- Initial root e2e failure was caused by stale duplicate preview processes/localhost binding conflict, not by source behavior. After cleanup and canonical preview refresh, root and frontend e2e passed.
- Existing Vite chunk-size warnings remain unrelated to Cycle 030 and were not addressed.
- Full-worktree static scan showed pre-existing unrelated dirty audit artifacts outside Cycle 030 validation; they were not read for conclusions, normalized, staged, or reverted.

## Next-wave candidates

- Command descriptor / operation serialization cleanup remains a future centrality candidate, but was not needed for this DTO port cleanup.
- Preview lifecycle/process hygiene could be tightened in a future validation-platform wave to avoid duplicate 5173 servers and localhost/IPv6 conflicts.
