# Proposal Restructure — Split application session composition before app-shell cleanup only if current seams prove too coupled

## Decision summary

This proposal tests whether Wave 020 should move one conceptual layer higher than the direct cleanup: create an explicit application-session composition boundary that owns `RuntimeSession`, project-session persistence handles, browser adapters, and runtime factory assembly, leaving `AppShellRuntime` as a smaller state/action coordinator.

This is **not** the preferred path under current evidence. Current source already has `AppShellProductionRuntime`, `BrowserLastProjectRepository`, `ProjectSessionPersistenceAdapter`, typed app-shell ports, and `RuntimeSession` ownership. Choose this restructure only if review/implementation proves the direct path cannot remove the remaining leaks without broad constructor/dependency confusion or continued exposure of concrete session internals.

## Trigger for selecting this proposal

Select restructure only if at least one of these is true after review:

1. `createAppShellRuntime` cannot be kept environment-free without exposing a broad `internals` object or concrete session handles to tests/UI.
2. The persistence port cannot remain understandable while `RuntimeSession` both owns `World`/`CommandStack` and mediates snapshot/restore handles.
3. Production composition cannot remain a small `AppShellProductionRuntime.ts` without growing into a hidden god module.
4. Testability still depends on broad `as any` dependency bags and runtime internals after the direct cleanup.
5. Review decides the existing app-shell/session boundary should be renamed/split for architecture clarity before implementation proceeds.

If none of these conditions holds, use `proposal-direct.md`.

## Current evidence prompting this fallback

- `RuntimeSession` owns concrete `World`/`CommandStack` and many read/command ports (`frontend/src/application/appShell/RuntimeSession.ts:31-190`). This is acceptable but central.
- `RuntimeSession` also mediates snapshot/validate/restore through `ProjectSessionPersistencePort` and creates candidate `World`/`CommandStack` during restore (`frontend/src/application/appShell/RuntimeSession.ts:194-210`).
- `createAppShellRuntime` returns `internals` with concrete use-case/session instances (`frontend/src/application/appShell/AppShellRuntime.ts:146`). If production/test callers depend on this, runtime assembly may be less clean than desired.
- `ProjectSessionUseCases` still receives the whole `AppShellRuntimePorts` bag (`frontend/src/application/appShell/ProjectSessionUseCases.ts:7-22`), which can blur dependency ownership.
- `AppShellProductionRuntime.ts` is currently small, but it already owns Drive, persistence adapter, browser storage, scheduler, keyboard target, stores, and callbacks (`frontend/src/application/appShell/AppShellProductionRuntime.ts:20-31`).

## Target architecture after restructure

Introduce or rename a small application-session composition layer with sharper boundaries:

- `ApplicationSession` or `ProjectRuntimeSession` owns `RuntimeSession` plus project-session persistence handle creation/restore orchestration.
- `AppShellRuntime` receives an already-composed session facade and app-shell ports; it does not expose raw `RuntimeSession` internals.
- `AppShellProductionRuntime` delegates browser adapter construction to a small `createBrowserAppShellPorts`/`createBrowserProjectSessionAdapters` helper and then calls the pure runtime factory.
- `ProjectSessionUseCases` receives a narrower `ProjectSessionDependencies` object, not the full `AppShellRuntimePorts` bag.
- Tests use typed fake application-session and port builders rather than `as any` against large constructor shapes.

This restructure must still keep `RuntimeSession` as the current `World`/`CommandStack` owner unless a separate reviewed plan edit selects a command-kernel wave. It must not alter persistence schema, command descriptors, rendering, Three runtime, Drive internals, or store internals.

## Files to change

Possible production/source files:

- `frontend/src/application/appShell/AppShellRuntime.ts`
  - Depend on a narrower session facade and remove public `internals` if feasible.
  - Keep public state/actions API stable for `App.vue` unless tests show a small rename is cleaner.
- `frontend/src/application/appShell/RuntimeSession.ts`
  - Rename/extract only facade methods needed by app shell if it improves clarity.
  - Do not change domain/session semantics, command stack behavior, or read-port behavior.
- New small module under `frontend/src/application/appShell/`, for example one of:
  - `AppShellSession.ts`
  - `ProjectRuntimeSession.ts`
  - `BrowserAppShellPorts.ts`
  - `AppShellComposition.ts`
  The chosen name must reflect real ownership and must not become a broad `AppShellService` facade.
- `frontend/src/application/appShell/AppShellProductionRuntime.ts`
  - Delegate browser adapter creation to the new helper if it prevents production factory growth.
  - Delete any old parallel production composition path.
- `frontend/src/application/appShell/AppShellPorts.ts`
  - Split pure app-shell ports from browser adapter helpers if `createBrowserScheduler` living in the port file is judged a layering smell.
  - Delete old exports after moving them; do not preserve re-export shims.
- `frontend/src/application/appShell/ProjectSessionUseCases.ts`
  - Replace full `ports` dependency with named typed dependencies.
- `frontend/src/application/appShell/AutoSaveUseCases.ts`
  - Adjust only for renamed/narrower session facade or persistence ports.
- `frontend/src/application/appShell/BrowserLastProjectRepository.ts`
  - Keep as browser storage adapter.
- `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts`
  - Keep as persistence adapter; adapter-local casts only.
- `frontend/src/App.vue`
  - Prefer no change beyond import/function name if production runtime factory is renamed.

Expected tests:

- Unit tests under `frontend/tests/unit/application/appShell/` for new composition/session helper.
- Update `AppShellBoundary.test.ts` raw-source assertions to enforce the new layer boundaries.
- Update app-shell use-case tests to use typed fake builders and delete broad `as any` fixtures.
- Preserve keyboard tests and e2e tests.

## Files/tests/docs/fixtures to DELETE

Delete, do not preserve:

- The old production composition function if a renamed/split composition function replaces it.
- Re-export shims for moved `createBrowserScheduler` or moved browser port builders.
- Public `internals` exposure from `createAppShellRuntime` if tests can use typed fakes or a named test factory instead.
- Full-port-bag `ProjectSessionUseCases` constructor usage if narrowed dependencies replace it.
- Tests that assert old module names/hidden internals rather than ownership contracts.
- Touched `as any` app-shell fixtures once typed builders exist.

Do not delete `GoogleDriveService`, `ProjectService`, Drive/auth code, command descriptors, renderer/Three files, backend/docs/spec files, package files, or lockfiles.

## Expected behavior change

No intended user-visible behavior change. This proposal changes internal composition/module ownership only.

Required unchanged flows:

- Startup with/without credentials.
- Sign-in/sign-out/create/open/new/rename/request-files.
- Autosave debounce/status/error policies.
- Keyboard shortcuts and text-input exclusions.
- App shell/canvas/status/toolbar rendering.
- 3D overlay pointer ownership and no drag-through.

## No-backcompat rationale

If a higher-level session composition split is selected, old module/function names and exposed internals are internal architecture surfaces. Delete them outright and update imports/tests. Do not preserve re-export shims or dual factories. Clean architecture has priority over compatibility.

## Risks and mitigations

- **Risk: restructure becomes a god facade.** Mitigation: new module must have one narrow purpose: compose browser adapters or expose a session facade. It must not absorb use-case behavior, Drive internals, persistence schema, command execution, rendering, or store logic.
- **Risk: too much churn for little gain.** Mitigation: use this only if direct cleanup cannot remove real leaks. Otherwise reject in favor of direct.
- **Risk: persistence redesign by accident.** Mitigation: `ProjectSessionPersistenceAdapter` remains the only `ProjectService` bridge and serialization output is unchanged.
- **Risk: command-kernel creep.** Mitigation: keep `RuntimeSession` as owner of `World`/`CommandStack`; create a future wave if command kernel boundaries need work.
- **Risk: test overreach.** Mitigation: update only app-shell/composition tests; do not rewrite broad e2e or renderer tests.
- **Risk: 3D regression.** Mitigation: do not touch overlay CSS or Three scene-host; run protected e2e/live smoke.

## Validation plan

Same mandatory gates as the direct proposal, with additional static scans for the new layer:

1. Static scans:
   - new composition/session module imports only allowed dependencies for its role;
   - no old re-export shim or parallel factory remains;
   - `App.vue` imports exactly one production runtime factory;
   - pure runtime/use cases have no browser globals or concrete Drive/ProjectService imports;
   - last-project keys remain single-owner;
   - `RuntimeSession` remains single owner of `new World()`/`new CommandStack()`;
   - overlay pointer source/e2e assertions remain unchanged.
2. Focused Vitest for all changed app-shell/composition modules plus keyboard and selection deletion.
3. Root/frontend lint.
4. Root/frontend full Vitest.
5. Root/frontend build.
6. Root/frontend e2e including current UI and keyboard shortcuts.
7. Live preview refresh, HTTP 200 probe, and credential-free live browser smoke.

## Stop conditions

Stop and request a reviewed plan edit if restructure requires:

- Changing persistence schema or command descriptors.
- Replacing `RuntimeSession` with a command kernel or broad application kernel.
- Redesigning Google Drive/OAuth/auth-store internals.
- Broad store redesign or touching unrelated dirty `viewStore.ts`.
- Touching Three scene-host/rendering/overlay CSS/canvas interaction.
- Backend/docs/spec/package/tooling changes.

## Recommendation

Reject this proposal unless the critic/reviewer identifies a blocking flaw in the direct path. It is useful as a guardrail: if the implementation cannot stay bounded, do not silently broaden the direct path; pause for reviewed selection of this restructure or a plan-edit split.
