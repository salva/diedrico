# Cycle 022 Scope Check — Runtime session kernel and persistence port boundary

## Stage and source-control reconciliation

This is a scout/proposal-only artifact for Wave 022. No production source, tests, package/tooling files, backend code, docs/spec source, stale audit history, protected config, env, provider, Drive credential, or secret material was read or modified.

Source-control handling was path-scoped because the initial full MCP `git_status` response exceeded its output buffer. The bounded status captured in `pre-scope-evidence.stdout` shows this cycle directory as new/untracked and adjacent untracked evidence files under `architecture-audit/cycle-022-wave-plan-extension/`. Those adjacent files were not inspected beyond the assigned plan-extension note and were not reverted, reformatted, incorporated, or used as source authority. This task's intended changes are limited to:

- `architecture-audit/cycle-022-runtime-session-kernel-persistence-port-boundary/scope-check.md`
- `architecture-audit/cycle-022-runtime-session-kernel-persistence-port-boundary/proposals/proposal-direct.md`
- `architecture-audit/cycle-022-runtime-session-kernel-persistence-port-boundary/proposals/proposal-restructure.md`
- stable evidence logs under `architecture-audit/cycle-022-runtime-session-kernel-persistence-port-boundary/`
- `.saivage/stages/cycle-022-fresh-scout-proposals/reports/t1-scout-scope-and-proposals.json`

## Wave-plan entry re-read

The current Wave 022 entry is titled **Runtime session kernel and persistence port boundary**. It scopes the cycle to app-shell runtime/session ownership and app-shell persistence ports:

- `frontend/src/application/appShell/AppShellRuntime.ts`
- `frontend/src/application/appShell/AppShellPorts.ts`
- `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts`
- `frontend/src/application/appShell/ProjectSessionUseCases.ts`
- `frontend/src/application/appShell/AutoSaveUseCases.ts`
- `frontend/src/application/world/initializeWorld.ts` only where initialization command ownership must be represented by the runtime/session boundary
- `frontend/src/services/ProjectService.ts` only as the concrete adapter target
- `frontend/src/application/selectionDeletion/` only as an already-extracted consumer that remains wired through runtime
- focused app-shell runtime/session/persistence adapter tests and boundary tests

The entry explicitly excludes generic command-kernel migration, canvas movement/style/construction, process-history, toolbar, rendering, backend, docs/spec, placeholder/debug cleanup, package/tooling, and validation-platform work. Current source evidence supports the entry; no wave-plan adjustment is required by this scope check.

## Current source evidence

### Runtime object ownership is still implicit in `AppShellRuntime`

`createAppShellRuntime` imports and constructs the concrete runtime objects directly: `CommandStack` and `World` are imported at `frontend/src/application/appShell/AppShellRuntime.ts:2-3` and instantiated at `frontend/src/application/appShell/AppShellRuntime.ts:17-18`. The same function owns all app-shell state refs, wires `ActivePlaneUseCases`, `SelectionDeletionCommandService`, `SelectionUseCases`, `AutoSaveUseCases`, `ProjectSessionUseCases`, and `KeyboardShortcutRouter`, then returns raw `world` and `commandStack` alongside UI state/actions (`frontend/src/application/appShell/AppShellRuntime.ts:38-76`, `frontend/src/application/appShell/AppShellRuntime.ts:99-136`).

This is the correct composition point, but the runtime session is unnamed: downstream use cases receive raw concrete objects rather than a session/kernel contract.

### Persistence port exposes concrete kernel and persistence DTO types

`AppShellPorts` imports `CommandStack`, `World`, and `ProjectData` solely to define app-shell persistence signatures (`frontend/src/application/appShell/AppShellPorts.ts:2-5`). `ProjectSessionPersistencePort` exposes:

- `snapshotCurrentSession(deps: { commandStack: CommandStack; world: World; projectName: string }): ProjectData` at `frontend/src/application/appShell/AppShellPorts.ts:25-26`
- `assertProjectData(data: unknown): asserts data is ProjectData` at `frontend/src/application/appShell/AppShellPorts.ts:27`
- `restoreSession(data: ProjectData, deps: { world: World; commandStack: CommandStack }): void` at `frontend/src/application/appShell/AppShellPorts.ts:28`

This leaks both concrete runtime kernel types and the concrete `ProjectService` DTO into app-shell port definitions.

### Production adapter is already the correct bridge location, but it mirrors the leaked shape

`ProjectSessionPersistenceAdapter` imports concrete `CommandStack`, `World`, and `ProjectService`/`ProjectData` (`frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:1-4`). Its methods call `ProjectService.serializeCommands` with `commandStack`, `world.peekNextId()`, and project name (`frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:7-8`), validate via `ProjectService.validateProjectData` (`frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:11-12`), and restore via `ProjectService.deserializeCommands(data, world, commandStack)` (`frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:15-16`).

The adapter is the right place for `ProjectService` and concrete persistence DTO knowledge; the problem is that the adapter's shape is currently exported back into app-shell use cases.

### Project-session use cases manually orchestrate runtime mutation and persistence calls

`ProjectSessionUseCases` imports `CommandStack`, `World`, `initializeWorld`, and `ProjectData` (`frontend/src/application/appShell/ProjectSessionUseCases.ts:1-7`). Its constructor receives raw `world` and `commandStack` (`frontend/src/application/appShell/ProjectSessionUseCases.ts:11-24`). It calls `initializeWorld(this.deps.world, this.deps.commandStack)` during no-Drive startup and fallback paths (`frontend/src/application/appShell/ProjectSessionUseCases.ts:31`, `frontend/src/application/appShell/ProjectSessionUseCases.ts:50`), clears world and command history directly on sign-out/create/new (`frontend/src/application/appShell/ProjectSessionUseCases.ts:88-91`, `frontend/src/application/appShell/ProjectSessionUseCases.ts:98-101`, `frontend/src/application/appShell/ProjectSessionUseCases.ts:143-145`), snapshots by passing raw objects into `ports.persistence.snapshotCurrentSession` (`frontend/src/application/appShell/ProjectSessionUseCases.ts:101-105`), restores by passing raw objects into `ports.persistence.restoreSession` (`frontend/src/application/appShell/ProjectSessionUseCases.ts:122-126`), conditionally initializes after restore if no projection planes exist (`frontend/src/application/appShell/ProjectSessionUseCases.ts:127`), and marks the world dirty after opening (`frontend/src/application/appShell/ProjectSessionUseCases.ts:128`).

These operations belong to a named runtime/session boundary if the app shell is to stop sharing `{ world, commandStack }` pairs.

### Autosave polls world version and snapshots through the leaked port

`AutoSaveUseCases` imports `CommandStack`, `World`, and the persistence port (`frontend/src/application/appShell/AutoSaveUseCases.ts:1-5`). It receives raw `world`/`commandStack` (`frontend/src/application/appShell/AutoSaveUseCases.ts:14-27`), polls `world.getVersion()` to schedule saves (`frontend/src/application/appShell/AutoSaveUseCases.ts:33-41`), and snapshots by passing raw objects to persistence in both the normal save path and missing-remote-file recovery path (`frontend/src/application/appShell/AutoSaveUseCases.ts:56-60`, `frontend/src/application/appShell/AutoSaveUseCases.ts:91-95`).

The version/dirty observation is legitimate session behavior; the raw object dependency is the boundary smell.

### Initialization is command-backed and therefore part of the session boundary

`initializeWorld` imports `Command`, `CommandStack`, initialization factory/process-tree operations, and `World` (`frontend/src/application/world/initializeWorld.ts:1-7`). It returns early if projection planes exist (`frontend/src/application/world/initializeWorld.ts:19-20`), creates an initialization command (`frontend/src/application/world/initializeWorld.ts:22`), adds process-tree and world-initialization operations (`frontend/src/application/world/initializeWorld.ts:24-30`), commits and pushes to command history (`frontend/src/application/world/initializeWorld.ts:33-34`), and marks the world dirty (`frontend/src/application/world/initializeWorld.ts:35`).

Wave 022 should not redesign initialization semantics, but startup/new/open fallback should call this behavior through the selected runtime-session owner rather than through an implicit helper that requires raw `World` and `CommandStack` everywhere.

### `ProjectService` remains command-stream persistence and should stay adapter-private

`ProjectService` imports `World`, `CommandStack`, `Command`, operation descriptors, and `OperationRegistry` (`frontend/src/services/ProjectService.ts:5-9`). It serializes committed command snapshots plus `nextElementId` into schema `6.0.0` (`frontend/src/services/ProjectService.ts:11-41`), deserializes by clearing `commandStack`, restoring `nextElementId`, replaying operation descriptors into `world`, restoring committed commands, and fixing active-plane fallback (`frontend/src/services/ProjectService.ts:45-74`), and validates the current schema and operation descriptor shapes (`frontend/src/services/ProjectService.ts:80-136`).

This is intentionally not a schema/replay redesign wave. The stop condition is triggered if implementation cannot hide this behind app-shell session ports without changing descriptors, registry semantics, schema constants, replay invariants, or command-stack behavior.

### Selection deletion is already extracted and only needs runtime wiring preservation

`SelectionDeletionCommandService` owns command construction for the selection/delete slice: it stores concrete `World` and `CommandStack` privately (`frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts:20-29`) and executes by creating a command, delegating cascade deletion, committing, and pushing (`frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts:31-39`). `AppShellRuntime` wires it with the current runtime objects (`frontend/src/application/appShell/AppShellRuntime.ts:40`).

Wave 022 must preserve this public boundary and avoid widening `selectionDeletion/` into a generic command executor.

## Selected bounded scope for Cycle 022 proposals

The bounded implementation scope should be:

1. Introduce one named runtime session/kernel boundary at the app-shell composition layer.
2. Move app-shell snapshot/restore/initialize/clear/version-observation calls behind that boundary.
3. Redefine `ProjectSessionPersistencePort` so app-shell use cases do not mention concrete `World`, `CommandStack`, or `ProjectData`.
4. Keep `ProjectSessionPersistenceAdapter` as the only app-shell bridge to `ProjectService` and current command-stream DTOs.
5. Keep `ProjectService`, `OperationRegistry`, command descriptors, schema constants, Drive/auth internals, canvas/tool/process-history/toolbar command producers, rendering, backend, docs/specs, and package/tooling out of scope.
6. Update focused app-shell runtime/session/persistence tests and architecture-boundary tests only where they assert the old raw-pair contract.

## Premises and invalidated assumptions

### Premises that still hold

- Wave 021 left a concrete runtime wiring point for `SelectionDeletionCommandService` (`AppShellRuntime.ts:40`) and documented broader runtime ownership as residual risk.
- App-shell persistence and autosave still pass raw `World`/`CommandStack` pairs to persistence (`AppShellPorts.ts:25-28`, `ProjectSessionUseCases.ts:101-126`, `AutoSaveUseCases.ts:56-60`, `AutoSaveUseCases.ts:91-95`).
- `ProjectSessionPersistenceAdapter` is already the only app-shell module directly importing `ProjectService` in the scoped files (`ProjectSessionPersistenceAdapter.ts:3`).
- Initialization remains command-backed and touches history (`initializeWorld.ts:22-35`), so any session boundary must cover it explicitly.

### Invalidated assumptions

No Wave 022 plan premise was invalidated by current source. The only nuance is that `ProjectSessionUseCases.openProject` clears `world` before validating loaded project data (`ProjectSessionUseCases.ts:120-123`); proposals should preserve current behavior unless review decides failure atomicity belongs in the session boundary. This nuance does not require editing `wave-plan.md`.

## Explicit out-of-scope items

- Redesigning `ProjectService`, `ProjectData`, schema `6.0.0`, command snapshots, operation descriptors, `OperationRegistry`, replay semantics, or migration/backcompat behavior.
- Migrating leaf command producers in canvas movement/style, construction, process history, toolbar shortcuts, or tools.
- Rendering selectors/read ports, Three view, canvas presentation, backend/frontend contract stance, validation-platform work, package scripts, docs/spec cleanup, placeholder/debug deletion, Drive/auth implementation details, Google credential behavior, or browser default/runtime wiring from prior waves.
- Rewriting broad app-shell UI state, stores, Vue components, or e2e specs beyond focused validation required by the eventual implementation.

## DELETE list candidates for the implementation wave

- Raw `ProjectSessionPersistencePort.snapshotCurrentSession({ commandStack, world, projectName })` and `restoreSession(data, { world, commandStack })` signatures.
- `AppShellPorts.ts` imports of `CommandStack`, `World`, and `ProjectData` if the new port shape no longer needs them.
- `ProjectSessionUseCases` and `AutoSaveUseCases` direct `CommandStack`/`World` constructor dependencies where replaced by a session boundary.
- `ProjectSessionUseCases` direct `initializeWorld`, `world.clear`, `commandStack.clear`, `world.markDirty`, and `world.getAllProjectionPlanes()` orchestration where replaced by session methods.
- Tests that assert persistence fakes receive raw concrete kernel objects or that app-shell ports mention `ProjectData`.
- Any compatibility overloads allowing both raw-pair persistence and the new session boundary to remain active.

## Stop conditions for broader redesign

Stop and run a reviewed plan edit if implementation requires any of the following:

- Changing `ProjectService` schema version, descriptor shape, replay algorithm, operation registry ownership, command snapshot format, or command-stack restore semantics.
- Introducing a generic command-kernel executor that migrates canvas/tool/process-history/toolbar command producers.
- Replacing Drive/local file API contracts or auth/session behavior.
- Adding a broad application kernel/event bus/service locator instead of a narrow runtime session boundary.
- Changing backend, docs/specs, package/tooling, Playwright config, rendering selectors, or validation architecture.

## Validation requirements for the eventual implementation

Minimum implementation validation should capture stable stdout/stderr under the Cycle 022 implementation directory:

1. Pre-edit scoped git status/diff and static scans for app-shell imports/signatures exposing `World`, `CommandStack`, `ProjectData`, and `ProjectService`.
2. Focused Vitest for app-shell runtime/session/persistence flows: runtime creation, no-Drive initialization, create/open/new, sign-out clearing, autosave snapshot/update/recreate, failure propagation, and selection-delete wiring.
3. Focused architecture/static boundary tests proving app-shell use-case ports no longer expose raw `World`/`CommandStack` persistence signatures and `ProjectService` remains adapter-private.
4. Root and frontend lint where scripts exist.
5. Root and frontend full Vitest where scripts exist.
6. Root and frontend build where scripts exist.
7. Root and frontend e2e/Playwright because startup/new/open/save/autosave and keyboard/delete flows are user-observable.
8. Live preview refresh bound to `0.0.0.0:5173`, HTTP reachability probe, and Playwright/live smoke for startup/new project plus representative save/status and delete/undo behavior without real Drive credentials.

## Recommendation

Proceed to `cycle-022-review-round-01` for review of this scope check plus the direct and restructure proposals. Do not implement before review convergence and a Cycle 022 decision artifact are recorded.
