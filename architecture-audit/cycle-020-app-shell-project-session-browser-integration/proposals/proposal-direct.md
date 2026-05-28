# Proposal Direct — Harden existing app-shell production/browser composition boundary

## Decision summary

Select a bounded cleanup of the boundaries already present in current source. Keep `App.vue` as a passive Vue shell, keep `AppShellProductionRuntime.ts` as the production browser composition boundary, keep `RuntimeSession` as the single in-memory `World`/`CommandStack` owner, and harden tests/ports/deletes around those seams.

This proposal does **not** redesign ProjectService serialization, Drive/auth internals, command descriptors, domain realization, rendering/presentation, Three scene-host, backend/docs/specs, package/tooling, validation platform, or UI features.

## Current evidence

- `App.vue` constructs the app runtime via `createProductionAppShellRuntime`, provides runtime ports to descendants, and starts/disposes the runtime (`frontend/src/App.vue:107`, `frontend/src/App.vue:136`, `frontend/src/App.vue:151-158`, `frontend/src/App.vue:188-189`).
- Production browser composition already constructs Drive, persistence adapter, last-project repository, scheduler, and keyboard target (`frontend/src/application/appShell/AppShellProductionRuntime.ts:23-27`).
- `createAppShellRuntime` consumes injected ports and installs keyboard handling through `ports.keyboardTarget`, not through a hidden global (`frontend/src/application/appShell/AppShellRuntime.ts:10-14`, `frontend/src/application/appShell/AppShellRuntime.ts:88-91`).
- Last-project keys are centralized in `BrowserLastProjectRepository` (`frontend/src/application/appShell/BrowserLastProjectRepository.ts:3-28`).
- ProjectService static calls are localized to `ProjectSessionPersistenceAdapter` (`frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:1-20`).
- Runtime `World`/`CommandStack` construction is centralized in `RuntimeSession` (`frontend/src/application/appShell/RuntimeSession.ts:31-33`).
- 3D overlay pointer behavior is protected by source and e2e (`frontend/src/App.vue:70`, `frontend/src/App.vue:277-278`, `frontend/tests/e2e/current-ui-contract.spec.ts:92-106`).

## Target architecture after implementation

1. `App.vue` remains a Vue composition shell:
   - reads production Google config only as shell configuration;
   - passes stores and UI callbacks to production composition;
   - provides runtime ports;
   - owns no inline Drive, persistence, autosave, keyboard, project lifecycle, storage-key, or command/session logic.
2. `AppShellProductionRuntime.ts` is the only production browser composition module for app-shell runtime dependencies:
   - creates `GoogleDriveService` conditionally;
   - creates the project-session persistence adapter;
   - creates browser last-project repository against `window.localStorage`;
   - creates browser scheduler;
   - injects `window` as keyboard target;
   - receives UI callbacks from the shell.
3. `createAppShellRuntime` is environment-free runtime assembly:
   - no direct `window`, `localStorage`, `sessionStorage`, `GoogleDriveService`, or `ProjectService` imports;
   - starts/disposes use cases and keyboard installation via ports only;
   - returns a stable, typed state/actions surface to `App.vue`.
4. `ProjectSessionUseCases` and `AutoSaveUseCases` remain app-session use cases over ports:
   - no storage key literals;
   - no direct static `ProjectService` calls;
   - no raw browser timer APIs;
   - no direct browser Drive/GIS calls.
5. `RuntimeSession` is explicitly documented/tested as the application runtime-session owner for the current `World`/`CommandStack`; broader command-kernel extraction is deferred unless a reviewed future wave selects it.

## Files to change

Expected production/source files, only if needed by implementation evidence:

- `frontend/src/application/appShell/AppShellRuntime.ts`
  - Remove or narrow `internals` if tests can be updated to use public state/actions or a typed test-only accessor. If `internals` remains, type and document it as testing/introspection only; do not expose it to production UI.
  - Add no browser or concrete service imports.
- `frontend/src/application/appShell/AppShellPorts.ts`
  - Rename or tighten port comments/types if they still imply concrete ProjectService/World ownership at the use-case layer.
  - Keep `createBrowserScheduler` only if accepted as a small browser adapter; alternatively move it to production composition if tests show browser helpers should not live in the pure port file. Delete the old export path if moved.
- `frontend/src/application/appShell/AppShellProductionRuntime.ts`
  - Keep as the sole production composition boundary.
  - Optionally introduce tiny local helpers for `createDrivePort`, `createBrowserRuntimePorts`, or browser scheduler only if they reduce coupling without creating a broad facade.
  - Do not add another parallel factory.
- `frontend/src/application/appShell/BrowserLastProjectRepository.ts`
  - Preserve as the single owner of last-project storage keys.
  - Export key constants only if tests need direct assertions; otherwise keep keys private.
- `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts`
  - Keep all direct `ProjectService` calls here.
  - If touched, keep casts adapter-local and avoid exposing `ProjectData` to use cases.
- `frontend/src/application/appShell/ProjectSessionUseCases.ts`
  - Tighten dependency shape if feasible so the constructor does not need the full `AppShellRuntimePorts` bag; prefer named deps (`drive`, `authStore`, `lastProjectRepository`, `persistence`) over the full port object if the change is small and deletes tests using `as any`.
  - Preserve behavior for initialize/sign-in/sign-out/create/open/new/rename/request files.
- `frontend/src/application/appShell/AutoSaveUseCases.ts`
  - Preserve fake-scheduler and port-driven autosave behavior.
  - Tighten typed dependencies where touched; keep error policy behavior equivalent.
- `frontend/src/application/appShell/KeyboardShortcutRouter.ts`
  - Preserve explicit install/dispose target boundary and current shortcut behavior.
  - Do not move global listener ownership into `App.vue`.
- `frontend/src/application/appShell/SelectionUseCases.ts`
  - Touch only if a type rename is needed to preserve the existing selection-delete port seam.
- `frontend/src/App.vue`
  - Prefer no source change. If touched, only keep shell wiring aligned with production composition and preserve `.three-view-overlay` pointer behavior.

Expected tests:

- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`
  - Update raw-source boundary assertions to current architecture: production composition owns browser construction; pure runtime/use cases do not.
  - Delete assertions that encode obsolete hidden construction paths.
- `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts`
  - Replace `as any` app-shell dependency fixtures in touched sections with typed fake ports/builders.
  - Cover runtime start/dispose installs/removes keyboard target, fake scheduler autosave, last-project repository, create/open/rename/sign-in/sign-out, and persistence adapter boundaries.
- `frontend/tests/unit/application/appShell/KeyboardShortcutRouter.test.ts`
  - Preserve install/dispose and shortcut routing tests, including text-input exclusions.
- Existing e2e:
  - `frontend/tests/e2e/current-ui-contract.spec.ts` — protected; do not rewrite except minimal assertion updates if app shell data-test IDs change, which this proposal does not require.
  - `frontend/tests/e2e/keyboard-shortcuts.spec.ts` — run/update only if keyboard routing signatures change.

## Files/tests/docs/fixtures to DELETE

Delete, do not wrap or preserve:

- Any test expectations that `createAppShellRuntime` directly constructs `GoogleDriveService`, `ProjectSessionPersistenceAdapter`, browser localStorage, or `window` keyboard target. Under current architecture these belong only to `AppShellProductionRuntime.ts`.
- Touched app-shell test fixtures that require `as any` because the dependency object is overly broad; replace with typed fake-port builders.
- Dead exports from `AppShellPorts.ts`, `AppShellRuntime.ts`, `AppShellProductionRuntime.ts`, or adapter modules after tightening names/shapes.
- Any duplicated last-project key literals if found outside `BrowserLastProjectRepository.ts`.
- Any compatibility overload/factory that preserves both hidden-global and explicit-port runtime creation.

No backend/docs/spec/package/tooling/persistence-schema/Drive-internals/renderer files are delete candidates.

## Expected behavior change

No intentional user-visible feature change.

Behavior that must remain equivalent:

- Startup without Google credentials initializes a default local world and hides the startup dialog.
- Startup with credentials initializes Drive, restores auth profile when available, opens last project if valid, otherwise shows the startup dialog.
- Sign-in/sign-out/create/open/new/rename/request-files flows keep current visible loading/error/save-status behavior.
- Autosave debounce, saved-to-idle transition, missing remote file recreation, auth-expiry handling, and quota alert policy remain equivalent.
- Keyboard shortcuts keep current routing: Escape, Delete/Backspace, F2, Tab, tool shortcuts, Ctrl/Cmd+N/O/A/0/Z/Y.
- 3D overlay owns pointer input and does not pass drag gestures to the SVG canvas.

## No-backcompat rationale

The hidden/implicit app-shell construction paths are internal architecture, not compatibility surfaces. If implementation tightens ports or removes exposed internals, update callers/tests directly and delete old paths. Do not preserve dual factories, shims, or compatibility overloads. The value of this wave is one clear production composition boundary plus one pure runtime assembly boundary.

## Risks and mitigations

- **Risk: artificial churn.** Current source already has many target seams. Mitigation: make small hardening/deletion changes only where evidence shows leaks, weak tests, dead exports, or broad typed dependencies.
- **Risk: over-abstracting Drive/browser.** Mitigation: keep Drive internals inside `GoogleDriveService`; do not wrap every Google API method twice.
- **Risk: persistence schema drift.** Mitigation: keep all `ProjectService` calls inside `ProjectSessionPersistenceAdapter` and do not change `ProjectService` semantics.
- **Risk: autosave timing regression.** Mitigation: fake-scheduler tests plus e2e/live smoke.
- **Risk: keyboard regression.** Mitigation: focused router tests and e2e keyboard shortcut tests.
- **Risk: 3D overlay click-through regression.** Mitigation: keep App.vue overlay CSS untouched and run the protected current UI e2e.
- **Risk: dirty workspace contamination.** Mitigation: path-scoped status/diff and stage only selected Wave 020 files.

## Validation plan

Capture all logs under `architecture-audit/cycle-020-app-shell-project-session-browser-integration/validation/`.

1. Static scans:
   - `createAppShellRuntime`, `ProjectSessionUseCases`, and `AutoSaveUseCases` have no direct `window`, `localStorage`, `sessionStorage`, `GoogleDriveService`, or `ProjectService` imports.
   - `AppShellProductionRuntime.ts` is the sole app-shell production browser construction module.
   - Last-project keys occur only in `BrowserLastProjectRepository.ts`.
   - `ProjectService` is imported only by `ProjectSessionPersistenceAdapter.ts` in the app-shell area.
   - Keyboard target install/dispose remains explicit.
   - `RuntimeSession` is the single app-shell owner of `new World()`/`new CommandStack()`.
   - Overlay pointer assertions/source remain present.
2. Focused Vitest:
   - `npm run test --workspace=frontend -- tests/unit/application/appShell/AppShellBoundary.test.ts tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts tests/unit/application/appShell/KeyboardShortcutRouter.test.ts tests/unit/application/selectionDeletion/SelectionDeletionCommandService.test.ts`
3. Root/frontend lint.
4. Root/frontend full Vitest.
5. Root/frontend build.
6. Root/frontend Playwright/e2e, including `current-ui-contract.spec.ts` and `keyboard-shortcuts.spec.ts`.
7. Live preview refresh on `0.0.0.0:5173`, HTTP 200 probe, credential-free live browser smoke for app startup/canvas/status/keyboard shortcut representative path and 3D overlay no drag-through.

## Stop conditions

Stop and request reviewed delta/plan-edit if implementation requires any of these:

- Changing `ProjectService` schema, command descriptors, operation replay, or serialization output.
- Changing Google Drive/OAuth internals or auth-store session persistence.
- Moving `World`/`CommandStack` out of `RuntimeSession` into a broad command kernel.
- Touching Three runtime/host/registry/adapters, `ThreeView.vue`, overlay CSS, OrbitControls, or canvas drag behavior.
- Broad store redesign or normalizing dirty `viewStore.ts`.
- Backend/docs/spec/package/tooling changes.

## Review recommendation

Prefer this direct proposal unless review finds that remaining `RuntimeSession`/persistence handle coupling cannot be made clear without a higher-level session composition split. Current evidence supports a bounded hardening/deletion wave, not a broad restructure.
