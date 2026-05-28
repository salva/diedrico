# Cycle 030 Decision — App-shell persistence DTO port contract cleanup

## Decision status

Cycle 030 is approved to proceed to implementation.

Review convergence has no remaining blockers:

- `architecture-audit/cycle-030-app-shell-persistence-dto-port-contract-cleanup/reviews/round-01-review.md` found one blocking issue: the direct proposal had not made a firm `DrivePort` boundary choice for trusted save/update calls versus untrusted load.
- `architecture-audit/cycle-030-app-shell-persistence-dto-port-contract-cleanup/proposals/proposal-direct.md` was corrected in place during corrections round 01. It now explicitly chooses the `DrivePort` rule: `createFile(...)` and `updateFile(...)` are in scope and must accept `ProjectSessionPersistencePayload`; `loadFile(...)` must remain / become `Promise<unknown>` until validation.
- `architecture-audit/cycle-030-app-shell-persistence-dto-port-contract-cleanup/reviews/round-02-review.md` verifies that blocker as resolved and states: “No blocking review issues remain.”
- The design critique evidence is accepted. `architecture-audit/cycle-030-app-shell-persistence-dto-port-contract-cleanup/critique/round-01-critique.md` is synthesized by the Manager with `reason: critic_dispatch_unavailable` after two failed Critic dispatches in the same round, which satisfies the project failure-tolerance rule. It found no blocking design issues.

No source implementation, validation execution, preview refresh, package/tooling churn, or protected config/secret reads are authorized by this decision stage itself.

## Selected proposal

Select **`architecture-audit/cycle-030-app-shell-persistence-dto-port-contract-cleanup/proposals/proposal-direct.md`**.

Rationale:

1. It is the smallest honest deletion of the app-shell persistence cast seam.
2. It directly removes `PersistedProjectSession`, generic `object` payload typing, adapter double casts, and stale test expectations rather than adding a wrapper or dual path.
3. It keeps `ProjectService` as the current schema serialization, validation, and replay owner.
4. After corrections round 01, it explicitly includes the app-shell `DrivePort` save/update boundary, eliminating the half-tightened public-boundary risk raised in review round 01.
5. It avoids introducing an additional contract module unless implementation proves the direct type-only dependency is unacceptable.

Reject **`architecture-audit/cycle-030-app-shell-persistence-dto-port-contract-cleanup/proposals/proposal-restructure.md`** for the initial implementation path. It remains a fallback/stop path only if implementation proves a type-only `ProjectData` dependency or equivalent narrow alias in `AppShellPorts.ts` is unacceptable. Do not preemptively add a new contract module merely to avoid the direct proposal; that would broaden the selected implementation without need.

## Bound implementation scope

The implementation stage must change only the app-shell persistence DTO seam and directly required focused tests.

Production files in scope:

- `frontend/src/application/appShell/AppShellPorts.ts`
- `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts`
- `frontend/src/application/appShell/ProjectSessionKernel.ts`
- `frontend/src/application/appShell/RuntimeSession.ts`
- `frontend/src/application/appShell/ProjectSessionUseCases.ts`
- `frontend/src/application/appShell/AutoSaveUseCases.ts`
- `frontend/src/application/appShell/ProjectSessionPersistenceTargets.ts` only if type propagation through the existing adapter-local target holder requires it
- `frontend/src/services/ProjectService.ts` only for a zero-runtime type export/name adjustment needed by the selected DTO contract; no schema, validation, replay, or descriptor behavior change is authorized

Test files in scope:

- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`
- `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts`
- Existing focused adapter/runtime/use-case/ProjectService persistence tests if they already cover this seam or must be narrowly updated
- A new focused app-shell persistence-contract test only if existing coverage cannot prove the selected contract without overloading unrelated tests
- Existing persistence/current UI e2e files only if needed to exercise the user-observable save/open/restore behavior during validation

## Required target contract

### ProjectSessionPersistencePayload

Implementation must establish one explicit current-schema persistence payload type for the app-shell project/session path:

- Preferred direct shape: `ProjectSessionPersistencePayload` as a type-only alias to the current `ProjectData` DTO exported by `ProjectService`.
- The name may live in `AppShellPorts.ts` or an equivalently narrow location if that is the smallest clean implementation. Do not create a runtime wrapper, duplicate schema interface, migration facade, compatibility adapter, or parallel schema owner.
- `OpenedProjectSession.payload` must use `ProjectSessionPersistencePayload`.
- `ProjectSessionPersistencePort.snapshotCurrentSession(...)` must return `ProjectSessionPersistencePayload`.
- `ProjectSessionPersistencePort.restoreSession(...)` must accept `ProjectSessionPersistencePayload`.
- `SnapshotCapableProjectSessionKernel.snapshot(...)` and `RuntimeSession.snapshot(...)` must return `ProjectSessionPersistencePayload` rather than `object`.

### Adapter validation and restore

`ProjectSessionPersistenceAdapter` must preserve current behavior while deleting cast shims:

- `snapshotCurrentSession(...)` returns `ProjectService.serializeCommands(...)` directly as the selected payload type.
- `validateProjectData(data: unknown)` continues to call `ProjectService.validateProjectData(data)` as the only unknown-input gate.
- After successful validation, the adapter returns `{ projectName: data.name, payload: data }` with `payload` typed as `ProjectSessionPersistencePayload` / `ProjectData` directly.
- `restoreSession(payload, targets)` passes the typed payload directly to `ProjectService.deserializeCommands(...)`.
- The implementation must preserve `RuntimeSession.restoreValidatedProject(...)` candidate-restore safety: restore into candidate world/stack first, then restore into the live session only after candidate restore succeeds.

### DrivePort boundary rule

The implementation must apply the corrected reviewed rule exactly:

- `DrivePort.createFile(fileName, data)` is in scope and `data` must be `ProjectSessionPersistencePayload`.
- `DrivePort.updateFile(fileId, data)` is in scope and `data` must be `ProjectSessionPersistencePayload`.
- `DrivePort.loadFile(fileId)` must remain / become `Promise<unknown>` because remote file contents are untrusted until `ProjectSessionPersistencePort.validateProjectData(...)` / `ProjectService.validateProjectData(...)` succeeds.

This rule applies to the app-shell `DrivePort` interface and its tests/mocks. It does not authorize Drive/auth internals redesign, OAuth/session behavior changes, real credential flow changes, Google API semantics changes, or protected config inspection.

### Behavior to preserve

Implementation must preserve:

- `ProjectService` current schema fields and validation assertions.
- `ProjectService.serializeCommands(...)` and `deserializeCommands(...)` replay/restore semantics.
- Project creation, open, autosave update, and missing-file autosave re-create wiring in `ProjectSessionUseCases.ts` and `AutoSaveUseCases.ts`.
- Undo/redo after load where currently supported.
- Active-plane restoration and current runtime session behavior.
- Waves 024–029 boundaries, especially command producer/runtime port boundaries, canvas DTO boundary, 3D presentation DTO read ports, and current 3D overlay pointer behavior.
- `ProjectSessionPersistenceTargets.ts` as the adapter-local concrete `World`/`CommandStack` target holder unless a trivial type-only adjustment is required; do not leak these concrete handles into general app-shell ports.

## Required delete list

The implementation must delete, not wrap, the obsolete seam:

- Delete `PersistedProjectSession` if it remains only the cast-only nominal marker.
- Delete `object` return/input types from the app-shell persistence payload path, including `ProjectSessionPersistencePort.snapshotCurrentSession`, `ProjectSessionKernel.snapshot`, and `RuntimeSession.snapshot`.
- Delete `projectData as unknown as PersistedProjectSession` in `ProjectSessionPersistenceAdapter.ts`.
- Delete `data as unknown as ProjectData` / equivalent restore-side double cast in `ProjectSessionPersistenceAdapter.ts`.
- Delete stale boundary-test expectations requiring `PersistedProjectSession` or forbidding the selected explicit current DTO type.
- Delete stale app-shell persistence mocks using `data: any`, `payload: data as never`, or equivalent generic-object/cast shims.
- Delete any compatibility wrapper or dual public path that keeps both `ProjectData` and `PersistedProjectSession` as separate public app-shell payload shapes.

## Protected out-of-scope surfaces

The implementation stage must not broaden into:

- `ProjectService` schema redesign, schema-version changes, migration/backcompat behavior, corrupted-operation fallback behavior, or command replay semantics.
- Command descriptor redesign, `CommandSnapshot` redesign, operation output typing normalization, `OperationRegistry`, concrete operation implementations, command-stack semantics, or undo/redo architecture.
- Drive/auth internals, OAuth/session behavior, Google API behavior, real credential flows, or protected config/secret files.
- Local-storage/browser repository redesign beyond satisfying the selected app-shell `DrivePort` type contract at existing boundaries.
- Backend, docs, specs, package/tooling, validation-platform work, CI scripts, or dependency churn.
- UI features, rendering, CSS, canvas behavior, 3D presentation/style-policy files, 3D selector orchestration, or preview ergonomics.
- App-shell production composition redesign outside the listed app-shell persistence/use-case files.
- Broad test rewrites, stale audit-history mining, or normalization of unrelated dirty files.

## Stop conditions

Stop implementation and return for a reviewed delta / plan correction if any of these become true:

1. Retyping `DrivePort.createFile(...)` or `DrivePort.updateFile(...)` to `ProjectSessionPersistencePayload` requires Drive/auth internals redesign, credential handling changes, Google API behavior changes, or protected config inspection.
2. Removing `PersistedProjectSession`, generic `object` payloads, or adapter double casts requires changing command descriptors, `CommandSnapshot`, `OperationRegistry`, command replay semantics, schema versioning, or migration/backcompat behavior.
3. The implementation would need to leave both the old generic public `object` save/update path and the new typed payload path alive.
4. The selected direct path cannot compile without adding a runtime wrapper, duplicate schema interface, broad `any`, blanket `unknown as`, `@ts-ignore`, `@ts-expect-error`, TypeScript config relaxation, alternate build script, or validation allowlist.
5. Any required change falls outside the bound production/test scope above.

If a stop condition is hit, do not partially implement around it. Write a delta proposal or plan-edit recommendation and send the cycle back through the required design/review loop.

## Validation requirements for the implementation stage

All stdout/stderr must be captured under:

`architecture-audit/cycle-030-app-shell-persistence-dto-port-contract-cleanup/validation/`

The implementation log must record exact commands, log paths, exit statuses, and any skipped undefined command with package-script evidence. Minimum validation:

1. Pre-edit and post-edit path-scoped git status/diff for the in-scope app-shell persistence files, `ProjectService`, relevant app-shell tests, and relevant e2e files.
2. Static scans proving no selected-seam remnants remain:
   - `PersistedProjectSession`
   - `as unknown as PersistedProjectSession`
   - `as unknown as ProjectData`
   - `snapshot(...): object` / `snapshotCurrentSession(...): object` in the app-shell persistence DTO path
   - app-shell persistence mocks using `data: any` or `payload: data as never`
3. Focused app-shell architecture/unit tests, including `AppShellBoundary.test.ts` and `AppShellRuntimeUseCases.test.ts`.
4. Focused adapter/runtime/use-case/ProjectService persistence tests where touched or newly added.
5. Root lint and frontend lint where scripts exist.
6. Root full Vitest and frontend full Vitest where scripts exist.
7. Root build and frontend build where scripts exist.
8. Root/frontend Playwright/e2e where scripts exist because project save/open/restore is user-observable.
9. Live preview refresh bound to `0.0.0.0:5173`, HTTP 200 reachability probe, and credential-free live smoke covering current app shell, representative drawing, active-plane switch, undo/redo, and 3D overlay pointer behavior. Add save/open/autosave live smoke only if the current app exposes a credential-free local project path.

The implementation is rejected if any validation failure is attributable to the change or if e2e/live preview is skipped without explicit justified evidence in the implementation log.

## Source-control hygiene and dirty-worktree context

Path-scoped evidence captured for this decision stage shows no diff in the scoped implementation files. Scoped status currently shows only untracked Cycle 030 critique/review artifacts:

- `?? architecture-audit/cycle-030-app-shell-persistence-dto-port-contract-cleanup/critique/`
- `?? architecture-audit/cycle-030-app-shell-persistence-dto-port-contract-cleanup/reviews/`

The broader worktree is known to be noisy. Implementation must use path-scoped status/diff and must not revert, stage, normalize, or incorporate unrelated dirty files. Do not read, log, copy, or cite protected secrets/configs, including `.saivage/auth-profiles.json`, `.saivage/saivage.json`, provider configs, frontend `.env*`, OAuth tokens, Google Drive credentials, shell history, or OS keychain material.

## Residual risks accepted for implementation

- A type-only `ProjectData` alias in the app-shell port may require updating older architecture tests that previously treated any `ProjectService` import in `AppShellPorts.ts` as a violation. This is accepted because Wave 030 intentionally replaces a cast-only marker with one explicit current DTO contract. Runtime service orchestration must still not leak into general app-shell ports.
- If implementation discovers that even trusted `DrivePort.createFile/updateFile` typing pulls on Drive/auth internals, the stop condition applies; this decision does not authorize broad Drive/auth work.
- Command descriptor and operation serialization residuals remain future-wave candidates unless directly proven necessary for this port cleanup.
- Presentation-private 3D style-policy cleanup and thin selector orchestration remain lower-centrality future work and are not part of this implementation.

## Next stage recommendation

Proceed to the unique canonical implementation stage:

`cycle-030-implement-app-shell-persistence-dto-port-contract-cleanup`

That stage must implement `proposal-direct.md` exactly as bounded here, record `implementation-log.md`, run the validation cadence above, refresh the live preview, and stop for a reviewed delta if any stop condition is triggered.
