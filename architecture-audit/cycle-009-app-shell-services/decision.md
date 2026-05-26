# Wave 009 Decision — App shell services

## Decision status

**Convergence complete:** YES  
**Blocking issues remaining:** NO BLOCKING ISSUES after review round 02  
**Selected proposal for implementation:** `architecture-audit/cycle-009-app-shell-services/proposals/proposal-restructure.md`

Wave 009 will proceed with the restructure proposal: introduce an application runtime/shell boundary above `App.vue` so `App.vue` becomes a Vue composition/layout shell over runtime-owned state and intents.

## Artifacts considered

This decision is based on the following Wave 009 artifacts:

- `architecture-audit/wave-plan.md`, Wave 009 entry, which scopes this wave to extracting application shell services from `App.vue`, deleting inline project lifecycle/autosave/keyboard orchestration, and replacing untyped browser/global shell bridges with typed boundaries.
- `architecture-audit/cycle-009-app-shell-services/scope-check.md`, which confirms the Wave 009 premise still holds after Wave 008 and identifies `App.vue` ownership of project lifecycle, Drive/auth startup, autosave timers, selection/delete/select-all, keyboard routing, active-plane/status coordination, and browser event wiring.
- `architecture-audit/cycle-009-app-shell-services/proposals/proposal-direct.md`, the direct extraction alternative.
- `architecture-audit/cycle-009-app-shell-services/proposals/proposal-restructure.md`, the selected runtime-boundary alternative.
- `architecture-audit/cycle-009-app-shell-services/reviews/round-01-review.md`, which recommended the restructure proposal but raised blockers on single-owner keyboard routing and lifecycle/disposal ownership.
- `architecture-audit/cycle-009-app-shell-services/corrections-round-01-note.md`, which records in-place proposal corrections for those blockers.
- `architecture-audit/cycle-009-app-shell-services/reviews/round-02-review.md`, which verifies the blockers were resolved, declares **NO BLOCKING ISSUES**, and recommends `proposal-restructure.md` for decision.

## Selected approach

Implement `proposal-restructure.md`.

The implementation must create an explicit `ApplicationRuntime` / `AppShellRuntime` boundary that owns long-lived application objects and shell use cases: stable `World`, stable `CommandStack`, project session, autosave, selection orchestration, active-plane state, startup-dialog file-list state, and the single global keyboard router. `App.vue` should keep layout, child component composition, provides for stable runtime-owned instances, and adapter wiring between runtime DTOs/actions and Vue components.

This selection follows the round-02 recommendation because the core Wave 009 smell is not just `App.vue` size. `App.vue` is currently both dependency-injection root and application coordinator, including a sign-out path that replaces the provided `World` despite other code needing a stable world reference. A runtime boundary fixes that lifetime/DI problem while also extracting the shell orchestration called out by the wave plan.

## Rejected/deferred alternative

`proposal-direct.md` is rejected for this cycle.

The direct proposal would improve file organization by moving code into focused controllers, and its corrected version is viable. It is still weaker than the restructure proposal because it does not make the long-lived application runtime boundary the central architectural abstraction. That leaves more risk that `App.vue` remains the real lifetime owner of `World`, `CommandStack`, listeners, subscriptions, and timers while merely delegating method bodies to helper modules.

The direct proposal is not deferred as a separate future wave; its useful pieces are absorbed into the selected runtime implementation as child use cases/controllers beneath `AppShellRuntime`.

## Binding implementation scope

The next implementation stage must remain within Wave 009 and implement the selected restructure proposal. Expected source scope:

- `frontend/src/App.vue`
  - Reduce to layout/composition, stable runtime provides, runtime lifecycle installation/disposal, and typed event/prop/action wiring.
  - Remove inline project lifecycle, autosave, selection/delete/select-all, active-plane, and global keyboard decision logic after the runtime owns them.
- New app-shell runtime/use-case modules under `frontend/src/application/appShell/`, likely including:
  - `AppShellRuntime.ts`
  - `AppShellPorts.ts`
  - `ProjectSessionUseCases.ts`
  - `AutoSaveUseCases.ts`
  - `SelectionUseCases.ts`
  - `ActivePlaneUseCases.ts`
  - `KeyboardShortcutRouter.ts`
- `frontend/src/components/toolbars/Toolbar.vue`
  - Narrowly remove global shortcut ownership. Keep render/click behavior and passive labels/metadata only.
- `frontend/src/components/dialogs/StartupDialog.vue`
  - Replace the `window` custom-event file-list bridge with typed props/events or runtime-owned startup-dialog state.
- Focused tests under `frontend/tests/unit/application/appShell/` and focused component/static-boundary tests for `App.vue`, `Toolbar.vue`, and `StartupDialog.vue` as needed.

## Aggressive DELETE list

The implementation must delete, not wrap or shim, the following legacy surfaces:

- `App.vue` direct shell orchestration for initialize/sign-in/sign-out/create/open/new/rename project flows once moved into runtime/project-session use cases.
- `App.vue` autosave globals and timer ownership, including `window as any.__autoSaveInterval`, inline polling/debounce/status timers, and routine autosave debug logs.
- `App.vue` selection command orchestration for cascade preview, delete-selected, and select-all once moved into selection use cases.
- `App.vue` active-plane subscription/update/cycle implementation internals once moved into active-plane use cases.
- `App.vue` global keyboard decision tree and listener setup once replaced by the runtime keyboard router.
- `Toolbar.vue` global `keydown` listener, local shortcut switch/registry, watcher, fallback path, or any other component-side interpretation of Escape, D projection toggle, or tool-family shortcuts.
- `StartupDialog.vue` `window.dispatchEvent(new CustomEvent('load-files'))` bridge and the matching anonymous `App.vue` `window.addEventListener('load-files', ...)` bridge.
- The sign-out path that replaces the provided world (`world = new World(); provide('world', world)`). The runtime must preserve stable instances and reset/clear their contents through typed methods.
- Routine environment/debug logging from touched shell paths, especially `import.meta.env` dump logging.
- Obsolete App.vue-focused tests that assert the old inline ownership model, replacing them with runtime/use-case and boundary tests.

Compatibility shims, parallel keyboard paths, and moved-but-still-dead browser bridges are explicitly rejected.

## Binding keyboard ownership constraint

Wave 009 must leave exactly **one** authoritative app-shell keyboard interpreter/registry: `KeyboardShortcutRouter` or the final selected name under `frontend/src/application/appShell/`.

That router is the only module that may convert global `keydown` events into shell/tool/projection/undo/redo intents for Escape, Delete/Backspace, F2, Tab/Shift+Tab, Ctrl/Cmd+N/O/A/0, undo/redo, D projection toggle, and P/L/S/C/G/tool-family shortcuts. It must expose explicit `install/start` and `dispose/stop` ownership for the global listener, and tests/static scans must prove no competing shell shortcut tree remains in `App.vue`, `Toolbar.vue`, or another component.

`Toolbar.vue` may keep button rendering, click actions, and passive shortcut labels/metadata only. It must not retain global keydown ownership, a local keyboard shortcut switch, an active shortcut registry, or fallback shortcut interpretation.

## Binding lifecycle/disposal constraint

The app-shell runtime must have explicit ownership for every browser listener, subscription, interval, debounce timer, world subscription, auth/storage subscription, and startup-dialog file-list request path it introduces or moves.

Required lifecycle semantics:

- `AppShellRuntime.start()` installs runtime-owned keyboard routing, autosave, active-plane subscription, selection/cascade watchers, startup-dialog request state, and any project/session listeners needed at startup.
- `AppShellRuntime.dispose()` calls child disposers, removes listeners, clears polling/debounce/status timers, unsubscribes world listeners, stops selection watchers, and is safe to call repeatedly.
- `KeyboardShortcutRouter.install()` is the only global `keydown` listener registration point; `dispose()` removes it.
- `AutoSaveUseCases.start/schedule/stop/dispose` own polling, debounce, and saved/idle timers.
- `ActivePlaneUseCases.start/dispose` own world subscription and active-plane DTO updates.
- `ProjectSessionUseCases` owns Drive/project/auth/storage lifecycle through typed ports without replacing the stable `World` or `CommandStack` instances.
- StartupDialog file-list loading/request/error state is runtime-owned or expressed through typed Vue props/events with cleanup/reset semantics; no anonymous `window` custom-event bridge may remain.

## Validation requirements for implementation

The implementation stage must capture full command stdout/stderr to stable files under `architecture-audit/cycle-009-app-shell-services/validation/` and record outcomes in `implementation-log.md`.

Minimum focused validation:

- Focused app-shell Vitest, e.g. `npm run test --workspace=frontend -- appShell AppShellRuntime StartupDialog` or the exact matching project command.
- Runtime/use-case tests for stable `world`/`commandStack` identity, local-only startup, Drive/auth/profile/last-file flows through ports, create/open/new/rename, autosave debounce/status/error handling, selection cascade/delete/select-all, active-plane update/cycling, and lifecycle disposal.
- Keyboard router tests for Escape, Delete/Backspace, F2, Tab/Shift+Tab, Ctrl/Cmd+N/O/A/0, undo/redo, D projection toggle, P/L/S/C/G/tool-family shortcuts, plus text-input exemptions.
- Toolbar tests/static scans proving no global keydown listener or component-side shortcut interpreter remains.
- StartupDialog tests/static scans proving no `window.dispatchEvent` / `CustomEvent('load-files')` bridge remains.
- Boundary scans proving `App.vue` no longer imports moved shell internals such as `Command`, `DeletionSequenceFactory`, `ProjectService`, `GoogleDriveService`, or contains `window as any`, `__autoSaveInterval`, `CustomEvent('load-files')`, or environment dump logging, to the extent those responsibilities are moved by the implementation.
- Boundary scans proving `frontend/src/application/appShell/**` does not import Vue components or rendering adapters.

Mandatory cadence:

- Root lint and frontend lint where scripts exist.
- Focused Vitest for touched app-shell/runtime modules.
- Full root and frontend Vitest suites where scripts exist.
- Root and frontend build where scripts exist.
- Frontend Playwright/e2e for the user-facing shell changes. If known existing corrupted specs still block parsing, record the failure and also run a standalone live/browser smoke.
- Live preview refresh on `0.0.0.0`, reachability probe, and browser/Playwright smoke covering app root, local-only startup, startup dialog/open/new affordances where available, Ctrl/Cmd+A, Delete, Tab/Shift+Tab active-plane status, Escape behavior, 3D overlay presence, and autosave status through focused tests or smoke where feasible.

Known pre-existing validation debt from Wave 008 may be classified as unrelated only when unchanged and supported by logs: missing `eslint`, Node 24 / `vue-tsc` incompatibility, unrelated broad Vitest failures, and corrupted Playwright specs. Focused app-shell tests and static boundary checks remain required even if broad validation is noisy.

## Accepted residual risks

- The runtime restructure is broader than direct extraction and may touch more files. This risk is accepted because it resolves the central runtime lifetime/DI problem rather than preserving `App.vue` as hidden owner.
- Existing repository validation instability may complicate attribution. This risk is accepted only with strong focused app-shell tests, static boundary scans, and explicit implementation-log classification.
- StartupDialog and component-ref adaptation are change-sensitive. The runtime must not depend on Vue component instances directly; `App.vue` must adapt runtime state/actions to component props/events.
- Toolbar keyboard changes must stay narrow. Deleting duplicate global shortcut ownership is required, but broader toolbar command/controller redesign remains out of scope.

## Explicit exclusions

The implementation stage must not expand into:

- Wave 010 backend/frontend project-contract work, backend deletion, backend validation hardening, or frontend/backend contract redesign.
- Wave 011 root validation-gate hardening beyond focused app-shell architecture tests/static scans needed for Wave 009.
- Broad docs/spec cleanup, except source comments/tests directly touched by the Wave 009 implementation.
- Rewriting `GoogleDriveService` internals, except narrow typed ports/adapters needed by the runtime boundary.
- Reopening Wave 004 persistence schema, migration, or backward-compatibility decisions.
- Broad toolbar command/controller redesign outside deleting duplicate global shortcut ownership and routing retained shortcuts through the single runtime keyboard router.

## Next implementation checklist

The next Manager stage should implement the selected proposal with this checklist:

1. Create the app-shell runtime boundary and typed ports under `frontend/src/application/appShell/`.
2. Keep stable runtime-owned `World` and `CommandStack` instances and provide those stable objects from `App.vue`.
3. Move project session, autosave, selection, active-plane, startup-dialog request state, and keyboard routing into runtime/use-case modules.
4. Delete the specified inline `App.vue` orchestration and browser/global bridges.
5. Delete `Toolbar.vue` parallel global shortcut handling and route all shell shortcuts through the single keyboard router.
6. Replace StartupDialog custom-window event flow with typed props/events or runtime state.
7. Add focused runtime/use-case/component/static-boundary tests proving the new ownership and disposal contracts.
8. Run and log the full mandatory validation cadence, classify pre-existing failures precisely, refresh the live preview, and record implementation details and residual risks in `implementation-log.md`.
