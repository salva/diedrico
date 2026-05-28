# Cycle 022 Scope Check — Runtime session kernel and persistence port boundary

## Status

**Wave 022 premise remains valid, but only as a bounded runtime/session/persistence-port cleanup.** Current source has already narrowed some old raw pair exposure: `AppShellPorts.ts` no longer imports concrete `World`, `CommandStack`, or `ProjectData`; it defines abstract `RuntimeSessionSnapshotHandle`, `RuntimeSessionRestoreHandle`, and branded persisted/opened session payloads (`frontend/src/application/appShell/AppShellPorts.ts:58-68`). However, the concrete runtime still extends those handles with raw `CommandStack` and `World`, and the persistence adapter imports those concrete runtime handles to reach `ProjectService` (`frontend/src/application/appShell/RuntimeSession.ts:22-29`, `frontend/src/application/appShell/RuntimeSession.ts:246-257`, `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:1-3`, `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:6-20`).

The implementation premise is therefore **not invalidated**. A reviewed implementation can delete the remaining cross-import/cast seam between runtime session and persistence adapter without redesigning command descriptors, schema/replay, Drive/auth, rendering, app-shell production composition, or leaf command producers.

## Evidence inspected first

Design evidence and path-scoped hygiene logs were captured under `.saivage/stages/cycle-022-fresh-scout-proposals-post-021-plan-correction/logs/`:

- `path-scoped-status-and-diff.stdout`
- `wave022-section.stdout`
- `runtime-persistence-search.stdout`
- `app-command-world-search.stdout`
- line-number excerpts for `AppShellRuntime.ts`, `AppShellPorts.ts`, `RuntimeSession.ts`, `ProjectSessionPersistenceAdapter.ts`, `ProjectSessionUseCases.ts`, `AutoSaveUseCases.ts`, `initializeWorld.ts`, `ProjectService.ts`, selection-delete ports/service, `Command.ts`, `CommandStack.ts`, and `current-ui-contract.spec.ts`

Read prior stage artifacts:

- `architecture-audit/wave-plan.md`, corrected Wave 022 entry (`architecture-audit/wave-plan.md:1281-1368`)
- Wave 021 scope check, which proves selection/delete use-case command construction is already behind a port/service boundary
- Wave 021 plan-correction review, which approved re-ranking to this fresh Wave 022 scope check
- Wave 020 implementation/closure log, which must be preserved for app-shell/browser composition boundaries
- Cycle 026 hotfix log, which fixes and protects 3D overlay pointer ownership

No secret/config/env files were read. The status output listed secret/config files as untracked paths only; their contents were not opened.

## Corrected Wave 022 plan premise status

Current source confirms the corrected Wave 022 entry is current enough to proceed to proposal review:

- `createAppShellRuntime()` owns one `RuntimeSession`, then derives command history, canvas/process command ports, read ports, selection deletion, autosave, project-session use cases, and keyboard routing from that session and injected ports (`frontend/src/application/appShell/AppShellRuntime.ts:14-24`, `frontend/src/application/appShell/AppShellRuntime.ts:44-85`, `frontend/src/application/appShell/AppShellRuntime.ts:107-148`).
- `RuntimeSession` owns the concrete in-memory `World` and `CommandStack` (`frontend/src/application/appShell/RuntimeSession.ts:31-33`).
- `RuntimeSession` still exposes persistence-specific concrete handles with raw `CommandStack`, `World`, and `CommandStack` (`frontend/src/application/appShell/RuntimeSession.ts:22-29`, `frontend/src/application/appShell/RuntimeSession.ts:246-257`).
- `ProjectSessionPersistenceAdapter` imports those concrete runtime handle types and casts validated payloads to/from `ProjectData` / `PersistedProjectSession` (`frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:1-3`, `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:6-20`).
- `ProjectService` remains the concrete command-stream serializer/deserializer and legitimately owns the current schema, command replay, validation, and `World`/`CommandStack` dependencies inside the service layer (`frontend/src/services/ProjectService.ts:24-80`).

This is the exact residual seam the plan describes: the app-shell use-case port is nominally abstract, but the adapter/runtime boundary still couples runtime internals and persistence internals through concrete handles.

## Current runtime/session/persistence seam inventory

### Runtime session kernel ownership

- `RuntimeSession` constructs the authoritative runtime `World` and `CommandStack` privately (`frontend/src/application/appShell/RuntimeSession.ts:31-33`).
- It derives presentation/read ports from that world (`frontend/src/application/appShell/RuntimeSession.ts:36-100`, `frontend/src/application/appShell/RuntimeSession.ts:131-158`).
- It derives command-history/selection-delete ports from the same command stack/world (`frontend/src/application/appShell/RuntimeSession.ts:160-172`).
- It initializes, resets, and clears the runtime session (`frontend/src/application/appShell/RuntimeSession.ts:174-187`).
- It exposes version and persistence operations (`frontend/src/application/appShell/RuntimeSession.ts:189-213`).

### Persistence port definitions

- `AppShellPorts.ts` contains branded persistence DTOs and narrow abstract handle marker interfaces (`frontend/src/application/appShell/AppShellPorts.ts:7-14`, `frontend/src/application/appShell/AppShellPorts.ts:58-68`).
- The public app-shell persistence port shape is already mostly abstract: `snapshotCurrentSession(session, projectName)`, `validateProjectData(data)`, and `restoreSession(session, target)` (`frontend/src/application/appShell/AppShellPorts.ts:64-68`).
- The remaining weakness is that the concrete adapter cannot implement the port without importing `RuntimeSession`-owned handle extensions, which reverses the dependency from adapter to runtime internals (`frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:2-3`).

### Project-session and autosave call sites

- `ProjectSessionUseCases` depends on the concrete `RuntimeSession` class, not a project-session kernel interface (`frontend/src/application/appShell/ProjectSessionUseCases.ts:3-5`, `frontend/src/application/appShell/ProjectSessionUseCases.ts:7-24`).
- It calls runtime methods for startup initialization, fallback initialization, reset/snapshot/create, validation/restore/open, and sign-out clear (`frontend/src/application/appShell/ProjectSessionUseCases.ts:27-56`, `frontend/src/application/appShell/ProjectSessionUseCases.ts:81-98`, `frontend/src/application/appShell/ProjectSessionUseCases.ts:109-123`).
- `AutoSaveUseCases` is already better factored: it consumes an `AutoSaveRuntimeSessionPort` with `getVersion()` and `snapshot(projectName, persistence)` (`frontend/src/application/appShell/AutoSaveUseCases.ts:5-8`, `frontend/src/application/appShell/AutoSaveUseCases.ts:16-29`, `frontend/src/application/appShell/AutoSaveUseCases.ts:53-63`).
- Autosave still passes persistence through to the session, keeping snapshot ownership split across autosave, runtime, and adapter (`frontend/src/application/appShell/AutoSaveUseCases.ts:57-58`, `frontend/src/application/appShell/AutoSaveUseCases.ts:91-100`).

### Initialization command/history ownership

- `initializeWorld` is an application initializer that creates an initialization `Command`, pushes process-tree operations, builds default projection planes, commits, pushes to the command stack, and marks the world dirty (`frontend/src/application/world/initializeWorld.ts:19-35`).
- This command-backed initialization is intentionally preserved in Wave 022; the selected implementation should only make it part of a named runtime-session contract, not redesign world initialization or command history semantics.

### ProjectService boundary

- `ProjectService.serializeCommands()` consumes `CommandStack`, `nextElementId`, and project name to produce `ProjectData` (`frontend/src/services/ProjectService.ts:24-43`).
- `ProjectService.deserializeCommands()` consumes `ProjectData`, `World`, and `CommandStack`, validates, replays operations, restores committed commands, and repairs active-plane selection if needed (`frontend/src/services/ProjectService.ts:45-78`).
- `validateProjectData()` enforces current schema/version and command descriptor shape (`frontend/src/services/ProjectService.ts:80-129`).
- This remains a concrete adapter target in Wave 022, not a schema or command descriptor redesign target.

### Selection-delete protected boundary

- `SelectionDeletionCommandPort` is behavior-sized: `execute(selectedIds)` (`frontend/src/application/selectionDeletion/SelectionDeletionPorts.ts:1-3`).
- `SelectionDeletionCommandService` owns delete command creation, cascade operation creation, commit, and stack push (`frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts:19-36`).
- `RuntimeSession.selectionDeletionCommandPort()` wires this existing boundary from runtime-owned `world`/`commandStack` (`frontend/src/application/appShell/RuntimeSession.ts:170-172`).
- Wave 022 must preserve this corrected Wave 021 boundary and avoid broadening its public API.

### Direct command producers intentionally out of scope

Static search confirms other app-layer command producers remain, but they are not Wave 022 implementation scope:

- Canvas/tool command producer wiring still receives `world` and `commandStack` (`frontend/src/application/appShell/RuntimeSession.ts:116-128`).
- Canvas movement/style, construction, quick tools, process-history, and presentation read ports still have `World`/`CommandStack` dependencies in their own slices (see `app-command-world-search.stdout`).
- These are leaf or rendering/use-case seams that should be addressed only by later reviewed waves or plan edits.

## Bounded scope selected for Wave 022 proposals

Implementable scope for proposal review:

1. Introduce a named project-session kernel/persistence surface owned by the app-shell runtime boundary, likely in a new small module under `frontend/src/application/appShell/`.
2. Move concrete persistence-access handle types out of `RuntimeSession.ts` so `ProjectSessionPersistenceAdapter` does not import `RuntimeSession`.
3. Change `ProjectSessionUseCases` to depend on a narrow project-session kernel interface instead of the concrete `RuntimeSession` class.
4. Optionally simplify `AutoSaveRuntimeSessionPort` to reuse the snapshot portion of the kernel if it reduces duplication without broadening autosave responsibilities.
5. Keep `ProjectService` command-stream schema/replay internals intact and adapter-private.
6. Preserve `AppShellRuntime` production composition and selection-delete wiring.

## Out-of-scope and protected surfaces

Do not touch in Wave 022 implementation without reviewed plan edit:

- `ProjectService` schema version, command descriptor shape, `OperationRegistry`, replay algorithm, migration/backcompat policy, or command descriptor registry.
- Drive/auth internals, Google credentials, provider config, env files, `.saivage` secret/config files, backend, docs/specs, package/tooling, validation-platform work.
- Canvas/tool, construction, quick-tool, process-history, toolbar, rendering, Three, SVG, overlay CSS, UI feature behavior.
- `SelectionDeletionCommandService` behavior or public API except static boundary assertions proving it remains wired through `RuntimeSession`.
- Production browser composition hardened by Wave 020 (`AppShellProductionRuntime`, browser scheduler/repository construction, keyboard target injection).
- The 3D overlay pointer contract from Cycle 026 (`pointer-events: auto`, overlay hit-testing, no click-through).

## Source-control reconciliation

Full MCP `git_status` overflows in this workspace, so this task captured path-scoped status/diff to `.saivage/stages/cycle-022-fresh-scout-proposals-post-021-plan-correction/logs/path-scoped-status-and-diff.stdout`.

Observed unrelated dirty/protected state includes, and was not modified or normalized by this design task:

- `frontend/src/domain/calculations/Intersections.ts`
- `frontend/src/domain/processTree/ActionGroup.ts`
- `frontend/src/stores/viewStore.ts`
- `frontend/src/commands/Command.ts`
- `frontend/src/commands/factories/DeletionSequenceFactory.ts`
- additional unrelated command/operation/process/store/component files already dirty in the worktree
- deleted e2e files including `frontend/tests/e2e/active-plane-shortcuts.spec.ts` and `frontend/tests/e2e/selection-mask.spec.ts`
- broad historical audit/validation noise and `.saivage` plan/report noise
- untracked secret/config paths listed by status only; contents were not read

This design stage changes only audit/design artifacts, stage logs, and its task report. No production implementation changes were made.

## DELETE list candidates

Recommended for direct Wave 022 implementation:

- Delete `ProjectSessionPersistenceAdapter` imports from `./RuntimeSession` by moving persistence handle/target contracts to an adapter-facing port module.
- Delete exported persistence-specific handle interfaces from `RuntimeSession.ts` if replacement contracts make them unnecessary there.
- Delete `ProjectSessionUseCases` dependency on concrete `RuntimeSession`; replace with a small project-session kernel interface containing only initialization/reset/clear/snapshot/validate/restore needs.
- Delete duplicate autosave-only session snapshot shape if a shared snapshot-capable kernel contract covers it without requiring autosave to know unrelated methods.
- Delete tests that assert the old adapter-to-runtime import or concrete `RuntimeSession` dependency; replace with static boundary and behavior tests for the new contract.

Explicitly not for this wave:

- Do not delete or rewrite `ProjectData`, `ProjectService.serializeCommands`, `ProjectService.deserializeCommands`, `OperationRegistry`, or command snapshots.
- Do not delete canvas/tool/process-history command producer paths.
- Do not delete `createAppShellRuntime().internals` in this wave unless a tiny test-only typing update naturally follows from the selected kernel interface; production internals cleanup is not the target.

## Validation requirements for implementation

Minimum validation for the reviewed Wave 022 implementation:

1. Pre/post path-scoped status and diff for app-shell runtime/session/persistence paths and protected dirty paths.
2. Static scans proving:
   - `ProjectSessionPersistenceAdapter.ts` no longer imports `RuntimeSession.ts`.
   - `ProjectSessionUseCases.ts` no longer imports the concrete `RuntimeSession` class.
   - `AppShellPorts.ts` remains free of concrete `World`, `CommandStack`, and `ProjectData` imports.
   - `ProjectService` imports remain isolated to `ProjectSessionPersistenceAdapter.ts` among app-shell modules.
   - selection-delete command construction remains in `SelectionDeletionCommandService`, not `SelectionUseCases`.
3. Focused Vitest:
   - `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts`
   - `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`
   - `frontend/tests/unit/application/selectionDeletion/SelectionDeletionCommandService.test.ts` if runtime wiring or static scans touch selection-delete assertions
   - focused `ProjectService` tests only if adapter typing changes require confirming serialization/restore behavior remains equivalent
4. Root and frontend lint where scripts exist.
5. Root and frontend full Vitest.
6. Root and frontend build.
7. Root and frontend Playwright/e2e because startup/open/new/save/autosave and keyboard-visible flows are user-observable.
8. Live preview refresh on `0.0.0.0:5173`, HTTP reachability probe, and credential-free Playwright/live smoke for startup/local initialization, new/open/save-status behavior where fake/no-credential flows allow, Delete/Backspace + undo, and 3D overlay no-click-through.

## Wave 020 boundary preservation

Wave 022 must preserve the Wave 020 app-shell/browser integration hardening:

- `createAppShellRuntime()` remains environment-free and receives browser/runtime ports through `AppShellRuntimePorts` (`frontend/src/application/appShell/AppShellRuntime.ts:10-24`).
- Keyboard installation remains explicit through injected `keyboardTarget` (`frontend/src/application/appShell/AppShellRuntime.ts:87-95`).
- Production browser composition remains isolated in `AppShellProductionRuntime`, and `ProjectService` remains behind `ProjectSessionPersistenceAdapter`.
- No Drive/auth internals, last-project browser storage behavior, or production runtime factory redesign belongs in Wave 022.

## 3D overlay / preview implications

Wave 022 is not a rendering or CSS wave. It must not change `App.vue`, `ThreeView.vue`, scene host behavior, OrbitControls, SVG canvas drag behavior, or overlay CSS. Validation must nevertheless protect the user-reported regression fixed in Cycle 026:

- The fixed app-shell rule is `.three-view-overlay { pointer-events: auto; }` (`frontend/src/App.vue:277-278`).
- Current e2e asserts the overlay is visible, has `pointer-events: auto`, owns `document.elementFromPoint(...)`, and does not pass drag gestures through to the SVG canvas (`frontend/tests/e2e/current-ui-contract.spec.ts:89-117`).

## Stop conditions

Stop and request a reviewed plan edit rather than broadening Wave 022 if implementation requires:

- changing `ProjectService` schema/replay/descriptor behavior or the operation registry;
- migrating canvas/tool/construction/process-history command producers;
- modifying Drive/auth, backend, docs/specs, package/tooling, validation platform, e2e suite structure, or UI features;
- changing 3D/SVG/canvas/rendering/pointer behavior;
- preserving dual raw-pair and kernel persistence paths instead of deleting the old seam;
- normalizing unrelated dirty files.

## Next-stage recommendation

Proceed to `cycle-022-review-round-01-post-021-plan-correction` after critic approval of this scope check and the two proposals. The stage should review the proposals as implementation candidates, not schedule a plan-correction stage, because current source still contains a bounded, central runtime/session/persistence boundary seam that matches the corrected Wave 022 entry.
