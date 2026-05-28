# Cycle 030 Scope Check — App-shell persistence DTO port contract cleanup

## Status

Fresh scout complete. Wave 030 remains valid and is still the next central wave. No production source or test implementation was performed.

## Evidence inspected

- Wave 030 plan entry: `architecture-audit/cycle-030-app-shell-persistence-dto-port-contract-cleanup/evidence/wave-030-entry.log`.
- Cycle 030 plan-extension rationale and critique: `architecture-audit/cycle-030-wave-plan-extension/plan-extension-rationale.md`, `architecture-audit/cycle-030-wave-plan-extension/critique/round-01-critique.md`.
- Cycle 029 closure and residuals: `architecture-audit/cycle-029-3d-presentation-dto-read-ports-and-realization-context-ownership/implementation-log.md`.
- Current app-shell/source citations: `architecture-audit/cycle-030-app-shell-persistence-dto-port-contract-cleanup/evidence/compact-source-citations.log`.
- Current app-shell persistence scans: `architecture-audit/cycle-030-app-shell-persistence-dto-port-contract-cleanup/evidence/app-shell-scans.log`.
- Path-scoped source-control evidence: `architecture-audit/cycle-030-app-shell-persistence-dto-port-contract-cleanup/evidence/pre-scout-status-diff.log`.

Secret/config surfaces were not read. Broad status lists protected `.saivage/*` paths as untracked, but only filenames from git status were captured; no protected contents were inspected or used.

## Current source inventory

### Port and DTO seam

- `AppShellPorts.ts` defines `PersistedProjectSession` as a nominal empty marker with only `readonly __persistedProjectSession: unique symbol` (`frontend/src/application/appShell/AppShellPorts.ts:7-9`).
- `OpenedProjectSession.payload` is typed as that marker (`frontend/src/application/appShell/AppShellPorts.ts:11-14`).
- `ProjectSessionPersistencePort.snapshotCurrentSession(...)` returns `object`, `validateProjectData(...)` returns `OpenedProjectSession`, and `restoreSession(...)` accepts `PersistedProjectSession` (`frontend/src/application/appShell/AppShellPorts.ts:64-68`).
- `ProjectSessionKernel.snapshot(...)` and `RuntimeSession.snapshot(...)` also return `object` (`frontend/src/application/appShell/ProjectSessionKernel.ts:3-6`, `frontend/src/application/appShell/RuntimeSession.ts:188-190`).

### Adapter behavior

- `ProjectSessionPersistenceAdapter.snapshotCurrentSession(...)` already returns the concrete `ProjectService.serializeCommands(...)` result, which is `ProjectData`, but its signature erases that as `object` (`frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:5-8`; `frontend/src/services/ProjectService.ts:27-43`).
- `ProjectSessionPersistenceAdapter.validateProjectData(...)` calls `ProjectService.validateProjectData(data)`, then relies on the assertion to treat `data` as `ProjectData` (`frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:10-12`; `frontend/src/services/ProjectService.ts:80-102`).
- The adapter then casts the validated `ProjectData` through `unknown` into `PersistedProjectSession` (`frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:13-16`).
- Restore casts the marker payload back through `unknown` into `ProjectData` before replay (`frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:19-20`).

### Runtime/session flow

- `ProjectSessionUseCases.createProject(...)` snapshots the runtime session and sends the generic object to `drive.createFile(...)` (`frontend/src/application/appShell/ProjectSessionUseCases.ts:93-99`).
- `ProjectSessionUseCases.openProject(...)` loads an object from Drive, validates it, restores it, and reads `openedSession.projectName` (`frontend/src/application/appShell/ProjectSessionUseCases.ts:109-118`).
- `AutoSaveUseCases.perform(...)` and its missing-file recovery branch snapshot the runtime session and pass the generic object to Drive update/create calls (`frontend/src/application/appShell/AutoSaveUseCases.ts:51-57`, `frontend/src/application/appShell/AutoSaveUseCases.ts:89-99`).
- `RuntimeSession.restoreValidatedProject(...)` validates restore in a candidate world/stack first, then restores into the live session using the same payload (`frontend/src/application/appShell/RuntimeSession.ts:196-207`). This restore-into-candidate safety behavior must be preserved.

### Current persistence service contract

- `ProjectService.ProjectData` is the current schema DTO: id, name, schemaVersion, created, modified, nextElementId, and command snapshots (`frontend/src/services/ProjectService.ts:11-19`).
- `ProjectService.serializeCommands(...)` produces `ProjectData` (`frontend/src/services/ProjectService.ts:27-43`).
- `ProjectService.deserializeCommands(...)` validates `ProjectData`, clears command/world state, restores next id, deserializes operation descriptors via `OperationRegistry`, replays operations, restores committed command history, and repairs missing active-plane state (`frontend/src/services/ProjectService.ts:45-78`).
- `ProjectService.validateProjectData(...)` is already an assertion gate for unknown input (`frontend/src/services/ProjectService.ts:80-102`).

### Tests and architecture guards

- `AppShellBoundary.test.ts` currently asserts app-shell ports are free of concrete `ProjectService` DTO imports and explicitly expects `PersistedProjectSession` (`frontend/tests/unit/application/appShell/AppShellBoundary.test.ts:75-85`). This is now the stale guard that preserves the marker alias and must be revised by the implementation wave.
- The same boundary test correctly preserves that `ProjectService` awareness is inside the persistence adapter, not other app-shell sources (`frontend/tests/unit/application/appShell/AppShellBoundary.test.ts:97-103`), and that concrete `World`/`CommandStack` handles remain adapter-local through `ProjectSessionPersistenceTargets.ts` (`frontend/tests/unit/application/appShell/AppShellBoundary.test.ts:148-158`). These constraints should survive.
- `AppShellRuntimeUseCases.test.ts` mocks `validateProjectData` with `data: any` and `payload: data as never` (`frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts:59-72`). That mock is a test-side symptom of the current untyped payload seam and is a direct update/delete candidate.
- `current-ui-contract.spec.ts` exercises app shell, construction, active plane switching, coordinate status, and 3D overlay pointer ownership (`frontend/tests/e2e/current-ui-contract.spec.ts:11-119`). Wave 030 must preserve these user-facing flows and add/use persistence-focused e2e only where current credential-free paths allow.

## Premise status

Wave 030 premises hold.

1. The cast seam is real and isolated: current source has a nominal `PersistedProjectSession` marker and `object` returns at the app-shell port, while the adapter immediately converts to/from concrete `ProjectData`.
2. `ProjectService` already owns a current schema and validation assertion. Removing the app-shell cast shim does not require command descriptor redesign, operation registry changes, command-stack semantics changes, schema migration branches, or replay behavior changes.
3. The stale architecture guard expecting `PersistedProjectSession` is local to app-shell boundary tests and can be updated to the new contract.
4. Cycle 029 protected 3D presentation and canvas overlay surfaces remain unrelated; no evidence suggests adapter-private 3D style cleanup should outrank this project persistence contract seam.

## Selected bounded scope for proposals

In scope for Cycle 030 implementation proposals:

- Replace the cast-only `PersistedProjectSession` marker with a single explicit current persistence DTO type at the app-shell persistence port boundary.
- Retype `OpenedProjectSession.payload`, `ProjectSessionPersistencePort.snapshotCurrentSession`, `ProjectSessionPersistencePort.restoreSession`, `ProjectSessionKernel.snapshot`, and `RuntimeSession.snapshot` to that DTO.
- Keep `ProjectService.validateProjectData(...)` as the unknown-input validation gate.
- Update `ProjectSessionPersistenceAdapter` so successful validation produces and restores the typed payload directly without `unknown` double casts.
- Update app-shell focused tests and architecture-boundary expectations so tests guard the new typed boundary instead of the old marker alias.
- Add or update focused persistence-contract tests around snapshot, validation, opened-session payload, candidate restore, create/open/autosave use-case wiring, and no double-cast patterns.

## Out of scope / stop conditions

Out of scope unless a reviewed delta/plan edit explicitly authorizes it:

- Command descriptor redesign, operation output typing, `OperationRegistry` redesign, command-stack semantics, undo/redo semantics, or command replay behavior.
- `ProjectService` schema/migration/backcompat changes, corrupted-operation fallback changes, or private command/world cast cleanup beyond the app-shell port seam.
- Drive/auth internals, OAuth/session behavior, real credential flows, or protected config/secret files.
- Backend/docs/specs/package-tooling changes.
- Rendering/CSS/canvas/3D behavior, 3D style-policy cleanup, selector orchestration cleanup, UI features, app-shell production composition redesign.
- Normalizing unrelated dirty files or stale audit-history mining.

Stop and recommend a plan edit if implementation proves that eliminating the app-shell DTO casts requires changing operation descriptor serialization, `CommandSnapshot`, process-tree action serialization, project schema versioning, or Drive repository semantics.

## DELETE candidates

- Delete `PersistedProjectSession` if the direct proposal is selected and the marker remains only a cast-only alias.
- Delete `object` return/input types from the app-shell persistence DTO path where they carry the current project payload.
- Delete `projectData as unknown as PersistedProjectSession` and `data as unknown as ProjectData` in `ProjectSessionPersistenceAdapter.ts`.
- Delete stale boundary expectations requiring `PersistedProjectSession` and forbidding an explicit current persistence DTO type.
- Delete test mocks using `data: any` / `payload: data as never` for the app-shell persistence port.
- Delete any proposed compatibility wrapper or dual public path that preserves both `ProjectData` and a generic persisted-session alias.

## Validation requirements for the eventual implementation stage

Capture all stdout/stderr under `architecture-audit/cycle-030-app-shell-persistence-dto-port-contract-cleanup/validation/`.

Minimum implementation validation:

1. Path-scoped pre/post git status and diff for app-shell persistence, `ProjectService`, app-shell tests, and e2e contract files.
2. Static scan proving no `PersistedProjectSession`, `as unknown as PersistedProjectSession`, `as unknown as ProjectData`, or app-shell persistence DTO `object` return remains in the selected seam.
3. Focused app-shell architecture/unit tests, including `AppShellBoundary.test.ts` and `AppShellRuntimeUseCases.test.ts`.
4. Focused `ProjectSessionPersistenceAdapter` / `ProjectService` serialization-validation-restore tests if existing coverage is insufficient.
5. Root and frontend lint where scripts exist.
6. Root and frontend Vitest where scripts exist.
7. Root and frontend build where scripts exist.
8. Root and frontend Playwright/e2e because save/open/restore is user-observable.
9. Live preview refresh on `0.0.0.0:5173`, HTTP 200 reachability, and credential-free smoke covering current app shell, representative drawing, active-plane/undo-redo, and 3D overlay pointer behavior. Add credential-free persistence smoke only if the current app exposes a non-secret local project path.

## Protected surfaces and Waves 024–029 preservation

- Preserve Wave 024+ command producer/runtime port boundaries: no raw command-stack or concrete operation construction is introduced into app-shell use cases.
- Preserve Wave 028 canvas DTO boundary and `current-ui-contract.spec.ts` 3D overlay pointer behavior; no canvas/raw realization seams should be touched.
- Preserve Wave 029 3D read-port boundary; no `threePresentation` files should change for this wave.
- Preserve candidate-restore safety in `RuntimeSession.restoreValidatedProject(...)`.
- Preserve `ProjectSessionPersistenceTargets.ts` as the adapter-local holder for concrete `World`/`CommandStack` handles unless a proposal explicitly proves a narrower equivalent. Do not leak those concrete handles into general app-shell ports.

## Source-control reconciliation

Broad `git status` is extremely noisy and includes many unrelated modified/deleted/untracked files, including protected `.saivage/*` filenames. This scout did not revert, normalize, stage, or depend on unrelated source modifications. Path-scoped diff for Wave 030 targets was captured before writing artifacts. Future implementation must use path-scoped source-control checks and avoid unrelated dirty files.

## Preview / 3D implications

This scout/proposal stage does not refresh preview or run validation. The eventual implementation is not expected to change rendering or 3D behavior, but because project open/save/restore is user-observable it must run e2e/live preview checks and retain the Cycle 029 3D overlay pointer contract.

## Decision

Wave 030 is valid as the next central wave. Proceed to Critic review of the scope-check and proposals, then canonical `cycle-030-review-round-01` if the design artifacts are accepted. No wave-plan correction is required at this time.
