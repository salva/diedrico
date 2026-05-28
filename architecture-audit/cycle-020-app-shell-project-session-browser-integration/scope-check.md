# Cycle 020 Scope Check — App-shell project session and browser integration boundary

## Status

**Premise status: valid, with important current-source update.** Wave 020 remains the next central architecture wave after Wave 019, but current source already contains some of the boundary that the wave-plan describes: `App.vue` delegates runtime creation to `createProductionAppShellRuntime`, production browser construction is concentrated in `AppShellProductionRuntime.ts`, last-project storage is behind `BrowserLastProjectRepository`, and ProjectService static persistence is behind `ProjectSessionPersistenceAdapter`. The implementation proposal should therefore harden and delete residual leaks rather than recreate those seams.

This scope-check is design-only. It does not implement production, test, package, tooling, validation, preview, backend, docs/spec, persistence-schema, command-descriptor, Drive/auth-internals, rendering, Three scene-host, or UI feature changes.

## Source-control reconciliation

Path-scoped status/diff was captured before writing this artifact:

- `.saivage/stages/cycle-020-fresh-scout-proposals-post-019/design-notes/pre-scoped-status.stdout`
- `.saivage/stages/cycle-020-fresh-scout-proposals-post-019/design-notes/pre-scoped-diff-names.stdout`

Observed dirty scoped source files:

- `frontend/src/domain/calculations/Intersections.ts` — unrelated, out of scope, not read for implementation and not to be normalized by Wave 020.
- `frontend/src/domain/processTree/ActionGroup.ts` — unrelated, out of scope, not read for implementation and not to be normalized by Wave 020.
- `frontend/src/stores/viewStore.ts` — dirty in the scoped diff; it is a protected/touched-only-if-needed store-adapter surface and must not be normalized by Wave 020 unless the accepted proposal explicitly touches its app-shell port shape.

Broad `git status` overflows in this workspace, so Wave 020 implementation must keep using path-scoped status/diff and stage only selected Wave 020 files.

## Wave-plan evidence

The Wave 020 entry names these core goals and constraints:

- Inventory app-shell construction/browser globals: `World`, `CommandStack`, `GoogleDriveService`, `ProjectService`, `window.localStorage`, keyboard target, scheduler/timers, alert callbacks, auth/session keys, and runtime state exposed to `App.vue` (`architecture-audit/wave-plan.md:1124-1143`).
- Target a clear composition boundary where `App.vue` is passive, production browser adapters create Drive/storage/scheduler/alert/keyboard target, and use cases consume typed ports rather than browser globals or static persistence methods (`architecture-audit/wave-plan.md:1155-1159`).
- Delete hidden default browser/static-service construction, duplicated storage keys, touched `any` error handling, compatibility wrappers, dual paths, dead exports, and broad facades (`architecture-audit/wave-plan.md:1161-1169`).
- Avoid domain realization, rendering/presentation, Three scene-host, command descriptor, persistence schema, backend/docs/spec, package/tooling, validation-platform, Drive/auth internals, store redesign, and UI-feature work (`architecture-audit/wave-plan.md:1139-1141`, `architecture-audit/wave-plan.md:1178`).

## Wave 019 / 3D evidence and protected surfaces

Wave 019 closed with green validation and preview evidence and recommended Wave 020 next. It did not invalidate the Wave 020 premise or require a renderer follow-up before app-shell work (`architecture-audit/cycle-019-three-scene-host-lifecycle-renderer-platform/implementation-log-post-018.md`, “Next-wave recommendation after re-rank”).

The 3D click-through regression remains a protected validation requirement:

- The hotfix root cause was `.three-view-overlay` using click-through pointer behavior; it was fixed by `pointer-events: auto` (`architecture-audit/cycle-026-hotfix-3d-view-interaction-regression/implementation-log.md`, “Root cause” and “Fix”).
- Current source still renders the overlay in `App.vue` (`frontend/src/App.vue:70`) and keeps `.three-view-overlay { pointer-events: auto; }` (`frontend/src/App.vue:277-278`).
- Current e2e still asserts overlay pointer ownership and no drag-through to SVG canvas (`frontend/tests/e2e/current-ui-contract.spec.ts:92-106`).

Wave 020 must preserve Wave 019 Three runtime/platform boundaries and the overlay pointer boundary. Do not change `ThreeView.vue`, Three scene host/runtime/registry/adapters, OrbitControls behavior, canvas drag behavior, or `.three-view-overlay` CSS in this design stage or in the direct implementation unless a reviewed plan edit broadens scope.

## Current app-shell/browser/session inventory

### Vue app shell

`App.vue` is now mostly a composition shell:

- It imports `createProductionAppShellRuntime` (`frontend/src/App.vue:107`) and constructs one runtime (`frontend/src/App.vue:136`).
- It reads Google config from `import.meta.env` into a local config object (`frontend/src/App.vue:120-122`). No secret values were read; only code paths were inspected.
- It passes UI callbacks into production composition, including `window.alert` (`frontend/src/App.vue:148`).
- It provides runtime read/command ports to descendants rather than creating `World` or `CommandStack` directly (`frontend/src/App.vue:151-158`).
- It starts/disposes runtime on mount/unmount (`frontend/src/App.vue:188-189`).

Residual shell considerations:

- `App.vue` still owns environment variable lookup and the alert callback. This is acceptable for the direct path if documented as production shell configuration, but it can be narrowed by a browser-environment adapter if the implementation finds test friction.
- The shell must not regain inline project lifecycle, autosave, keyboard handling, Drive construction, persistence serialization, or storage-key logic.

### Production browser composition

`AppShellProductionRuntime.ts` already exists and centralizes major browser-only bindings:

- `GoogleDriveService` import and conditional construction (`frontend/src/application/appShell/AppShellProductionRuntime.ts:1`, `frontend/src/application/appShell/AppShellProductionRuntime.ts:23`).
- `ProjectSessionPersistenceAdapter` construction (`frontend/src/application/appShell/AppShellProductionRuntime.ts:24`).
- `BrowserLastProjectRepository(window.localStorage)` construction (`frontend/src/application/appShell/AppShellProductionRuntime.ts:25`).
- Browser scheduler creation (`frontend/src/application/appShell/AppShellProductionRuntime.ts:26`).
- Keyboard target installation target set to `window` (`frontend/src/application/appShell/AppShellProductionRuntime.ts:27`).

This means the old wave-plan concern that `createAppShellRuntime` itself constructs Drive/ProjectService/localStorage/window has already been largely resolved. The remaining direct-path work should harden this production composition boundary and delete stale tests/assertions that encode old hidden construction.

### Runtime core and state exposed to `App.vue`

`createAppShellRuntime` consumes a single `AppShellRuntimePorts` object (`frontend/src/application/appShell/AppShellRuntime.ts:10-14`) and constructs use-case classes from those ports:

- Selection deletion port from `RuntimeSession` (`frontend/src/application/appShell/AppShellRuntime.ts:45`).
- `AutoSaveUseCases` with session, Drive port, persistence port, last-project repository, scheduler, reactive current project state, save status, signed-in state, and alert callback (`frontend/src/application/appShell/AppShellRuntime.ts:47-58`).
- `ProjectSessionUseCases` with session, auth/startup/current-project refs, autosave, and all ports (`frontend/src/application/appShell/AppShellRuntime.ts:60-71`).
- `KeyboardShortcutRouter` with command history, stores, project-session actions, selection, active-plane, fit-to-view, and rename callbacks (`frontend/src/application/appShell/AppShellRuntime.ts:73-83`).
- Runtime start installs keyboard handling on the injected target (`frontend/src/application/appShell/AppShellRuntime.ts:88-91`).
- Runtime returns explicit state/action groups to `App.vue` (`frontend/src/application/appShell/AppShellRuntime.ts:106-146`).

Residual concerns:

- `internals` exposes session and concrete use-case instances (`frontend/src/application/appShell/AppShellRuntime.ts:146`). This may be test-only convenience, but if not required it is a leakage candidate. Direct implementation should either prove it is test-only and keep typed, or delete/narrow it if dead.
- `RuntimeSession` still creates the current in-memory `World` and `CommandStack` (`frontend/src/application/appShell/RuntimeSession.ts:31-33`). The wave-plan allows this as the current runtime model if owned by one application composition contract, but proposals must document it as intentional residual application-kernel ownership, not a browser leak.

### Ports and persistence boundary

`AppShellPorts.ts` defines the app-shell ports. Current persistence shape is narrower than raw `ProjectService`, but still exposes session handles:

- `ProjectSessionPersistencePort` methods are `snapshotCurrentSession`, `validateProjectData`, and `restoreSession` (`frontend/src/application/appShell/AppShellPorts.ts:65-67`).
- The port uses opaque-ish `PersistedProjectSession` and `OpenedProjectSession` types (`frontend/src/application/appShell/AppShellPorts.ts:7-15`).
- Snapshot/restore handles are minimal at the AppShellPorts level (`frontend/src/application/appShell/AppShellPorts.ts:57-62`) and refined by `RuntimeSession` for concrete `World`/`CommandStack` (`frontend/src/application/appShell/RuntimeSession.ts:24-29`).
- `ProjectSessionPersistenceAdapter` is the only direct app-shell adapter to `ProjectService`, calling `serializeCommands`, `validateProjectData`, and `deserializeCommands` (`frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:1-20`).

Residual concerns:

- The adapter casts `ProjectData` to `PersistedProjectSession` and back (`frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:14-20`). This may be acceptable as an adapter-local cast, but direct implementation should avoid spreading this cast into use cases.
- Do not redesign `ProjectService` serialization, command descriptors, schema version, operation replay, or persistence format in Wave 020 (`frontend/src/services/ProjectService.ts:24-75`, `frontend/src/services/ProjectService.ts:80-126`).

### Last-project storage keys

The last-project keys are already centralized:

- `BrowserLastProjectRepository.ts` defines `diedrico_last_file_id` and `diedrico_last_file_name` once (`frontend/src/application/appShell/BrowserLastProjectRepository.ts:3-4`).
- It implements `getLastProject`, `setLastProject`, and `clearLastProject` against injected storage (`frontend/src/application/appShell/BrowserLastProjectRepository.ts:12-28`).
- `ProjectSessionUseCases` and `AutoSaveUseCases` now call `lastProjectRepository` rather than using localStorage string literals (`frontend/src/application/appShell/ProjectSessionUseCases.ts:27`, `frontend/src/application/appShell/ProjectSessionUseCases.ts:159-164`, `frontend/src/application/appShell/AutoSaveUseCases.ts:19`, `frontend/src/application/appShell/AutoSaveUseCases.ts:112`).

Residual concerns:

- Direct implementation should keep this repository as the single last-project-key owner and add/retain focused tests for key behavior.
- Do not fold view/tool/auth preference keys into this repository; those are separate store concerns and broader store redesign is out of scope.

### Scheduler/timer and autosave

- `createBrowserScheduler` wraps `window.setTimeout`, `clearTimeout`, `setInterval`, and `clearInterval` (`frontend/src/application/appShell/AppShellPorts.ts:141-148`).
- `AutoSaveUseCases` consumes `SchedulerPort` and owns polling/debounce/saved-status timers (`frontend/src/application/appShell/AutoSaveUseCases.ts:6-42`, `frontend/src/application/appShell/AutoSaveUseCases.ts:62-76`).
- Autosave snapshots through `RuntimeSession` and the persistence port, then updates Drive (`frontend/src/application/appShell/AutoSaveUseCases.ts:50-55`).
- It handles missing remote file recreation, auth-expiry startup UI, and quota alert policy (`frontend/src/application/appShell/AutoSaveUseCases.ts:92-121`).

Residual concerns:

- This is the correct seam for fake-scheduler testing; direct implementation should not reintroduce raw timers into use cases.
- Browser scheduler belongs in production composition/adapters, not in `App.vue` or use cases.

### Keyboard target and routing

- `KeyboardShortcutRouterTarget` is typed by add/remove keydown listener methods (`frontend/src/application/appShell/KeyboardShortcutRouter.ts:7-10`).
- The router installs/disposes against the injected target (`frontend/src/application/appShell/KeyboardShortcutRouter.ts:27-37`).
- Runtime installs the router on `ports.keyboardTarget` during `start()` (`frontend/src/application/appShell/AppShellRuntime.ts:88-91`).
- Production composition injects `window` as the target (`frontend/src/application/appShell/AppShellProductionRuntime.ts:27`).
- The router handles Escape, Delete/Backspace, F2, Tab, tool shortcuts, Ctrl/Cmd+N/O/A/0/Z/Y (`frontend/src/application/appShell/KeyboardShortcutRouter.ts:39-102`).

Residual concerns:

- Keep target installation explicit and testable.
- Do not move keyboard handling into `App.vue` or global side-effect modules.
- Protect text-input exclusion and project/session shortcuts with focused tests and e2e.

### Drive/auth/browser globals

- `GoogleDriveService` directly depends on browser `window.google`, `gapi`, `localStorage`, `navigator.onLine`, `fetch`, and Google APIs (`frontend/src/services/GoogleDriveService.ts:40-53`, `frontend/src/services/GoogleDriveService.ts:148-259`, `frontend/src/services/GoogleDriveService.ts:282-293`, `frontend/src/services/GoogleDriveService.ts:419-430`).
- This direct browser/Google dependency is acceptable inside the Drive adapter, but it must not leak into app-shell use cases.
- `authStore` directly uses browser `sessionStorage` for `diedrico_access_token`, `diedrico_user_profile`, and `diedrico_token_expiry` (`frontend/src/stores/authStore.ts:24-27`, `frontend/src/stores/authStore.ts:41-78`).

Residual concerns:

- Do not read protected env/config/secret files. Code-path evidence only.
- Do not redesign Google Drive/auth internals in Wave 020. If Drive/auth browser globals must be abstracted below `GoogleDriveService` or `authStore`, that is a plan-edit/future-wave concern.
- The app-shell port can consume the existing auth store interface; broad Pinia/store redesign is out of scope.

### Store localStorage preferences

- `toolStore` uses `localStorage` for last-used tool preferences at module initialization and update (`frontend/src/stores/toolStore.ts:49-69`).
- `viewStore` uses `localStorage` for projected-elements and 3D view display options (`frontend/src/stores/viewStore.ts:32-71`, `frontend/src/stores/viewStore.ts:164-166`).

Residual concerns:

- These are store/UI preference boundaries, not project-session/autosave boundaries. They are out of direct Wave 020 implementation except to maintain port compatibility with keyboard routing and view toggles.
- `frontend/src/stores/viewStore.ts` is currently dirty and must not be touched incidentally.

### Runtime session / World / CommandStack mutation

- `RuntimeSession` is the single owner of `World` and `CommandStack` construction (`frontend/src/application/appShell/RuntimeSession.ts:31-33`).
- It provides application read/command ports for canvas, process history, active plane, selection, command history, and Three presentation (`frontend/src/application/appShell/RuntimeSession.ts:35-190`).
- It creates candidate `World`/`CommandStack` during validated project restore before mutating the live session (`frontend/src/application/appShell/RuntimeSession.ts:202-210`).
- `SelectionUseCases` now depends on `SelectionDeletionCommandPort`, not raw `World`/`CommandStack` (`frontend/src/application/appShell/SelectionUseCases.ts:1-13`, `frontend/src/application/appShell/SelectionUseCases.ts:29-33`).

Residual concerns:

- The direct path should document `RuntimeSession` as the intentional application runtime/session owner for this wave. Do not split the command kernel or redesign command descriptors here.
- If implementation discovers that `World`/`CommandStack` ownership cannot be kept inside `RuntimeSession` without redesigning command execution/persistence, stop and run a reviewed plan-edit/delta rather than broadening Wave 020.

## Selected bounded scope for proposals

Wave 020 implementation may touch only:

- `frontend/src/application/appShell/AppShellRuntime.ts`
- `frontend/src/application/appShell/AppShellPorts.ts`
- `frontend/src/application/appShell/AppShellProductionRuntime.ts`
- `frontend/src/application/appShell/BrowserLastProjectRepository.ts`
- `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts`
- `frontend/src/application/appShell/ProjectSessionUseCases.ts`
- `frontend/src/application/appShell/AutoSaveUseCases.ts`
- `frontend/src/application/appShell/KeyboardShortcutRouter.ts`
- `frontend/src/application/appShell/SelectionUseCases.ts` only to preserve the existing port-based selection/delete seam
- `frontend/src/App.vue` only if needed to keep it a passive production shell
- focused unit tests under `frontend/tests/unit/application/appShell/` and existing e2e keyboard/current UI contract tests

Touch only by reviewed proposal, and avoid unless strictly required:

- `frontend/src/services/GoogleDriveService.ts` at DrivePort adapter typing only, not internals.
- `frontend/src/services/ProjectService.ts` at app-shell adapter typing only, not serialization/deserialization/schema/replay.
- `frontend/src/stores/authStore.ts`, `selectionStore.ts`, `toolStore.ts`, `viewStore.ts` as port consumers/adapters only, not store redesign. Current dirty `viewStore.ts` should stay untouched unless explicitly selected.

## Out of scope

- Domain realization/read-context contracts.
- Canvas presentation selectors, SVG rendering, canvas interaction, 3D presentation, Three runtime/host/registry/adapters, `ThreeView.vue`, OrbitControls, and overlay CSS/pointer behavior.
- Command descriptor serialization, command replay, operation registry, persistence schema/version, and broad ProjectService internals.
- Backend/docs/spec/package/tooling/validation-platform work.
- Google Drive internals, OAuth/GIS internals, auth token/session-storage redesign.
- Broad Pinia store redesign or UI feature work.
- Dirty unrelated `Intersections.ts`, `ActionGroup.ts`, and incidental `viewStore.ts` cleanup.

## DELETE list candidates

Implementation is incomplete if it preserves parallel/legacy surfaces after accepting a cleanup path. Delete rather than wrap:

- Tests that assert browser/global construction belongs inside `createAppShellRuntime` or app-shell use cases.
- Any duplicate production runtime factory if `AppShellProductionRuntime.ts` remains the selected production composition boundary.
- Dead exports from `AppShellPorts.ts` or app-shell adapter modules after tightening port names/shapes.
- Any compatibility path that allows both hidden global construction and explicit port injection.
- Any duplicated last-project storage key usage outside `BrowserLastProjectRepository`.
- Touched `any` / broad cast use in app-shell tests and use-case dependencies when a typed fake/dependency shape can replace it.

Do **not** delete Drive/auth internals, ProjectService serialization internals, command descriptors, renderer/Three files, backend/docs/spec files, or package/tooling files in this wave.

## Validation requirements for the implementation stage

All logs must go under `architecture-audit/cycle-020-app-shell-project-session-browser-integration/validation/`.

Required gates:

1. Pre/post static scans for browser globals/concrete construction in app-shell runtime/use cases; production composition ownership; last-project key single ownership; persistence adapter use of ProjectService; keyboard target install/dispose; direct `World`/`CommandStack` exposure; overlay pointer-boundary assertions.
2. Focused Vitest for changed app-shell runtime/use cases/adapters and keyboard/session/autosave tests, including `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`, `AppShellRuntimeUseCases.test.ts`, and `KeyboardShortcutRouter.test.ts` where still current.
3. `npm run lint` at root and `npm run lint --workspace=frontend` where defined.
4. Full Vitest at root and frontend workspace.
5. `npm run build` at root and frontend workspace.
6. Root and frontend Playwright/e2e because startup, project/session, keyboard, autosave/status, and overlay pointer behavior are user-observable.
7. Live preview refresh bound to `0.0.0.0:5173`, HTTP 200 probe, and credential-free Playwright/live browser smoke covering startup/no-credential behavior, new-project/open-dialog affordances where practical without credentials, representative keyboard shortcuts, save/status display, and 3D overlay no click-through.

## Stop conditions

Stop implementation and request a reviewed plan edit or delta proposal if any of these becomes necessary:

- Changing persistence schema, command descriptors, operation replay, or `ProjectService` serialization semantics.
- Redesigning Google Drive/OAuth/auth-store internals or reading any secret/config/env files.
- Splitting or replacing the command kernel broadly beyond documenting `RuntimeSession` ownership.
- Touching rendering/presentation/Three scene-host or overlay CSS/pointer behavior.
- Redesigning stores broadly or normalizing dirty `viewStore.ts` for unrelated reasons.
- Creating a broad `AppShellService` facade that only renames the existing concentration without deleting old paths.
- Needing backend/docs/spec/package/tooling changes to make the app-shell work compile.

## Recommendation

Proceed to `cycle-020-review-round-01-post-019` with both proposals ready. No wave-plan corrective edit is required before review, but the review should explicitly acknowledge that much of Wave 020’s target composition boundary already exists in current source and that the direct implementation should be a hardening/deletion wave rather than an artificial broad rewrite.
