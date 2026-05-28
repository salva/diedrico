# Cycle 020 Implementation Log post-019 — App-shell project session / browser integration boundary

## Status

**COMPLETE.** Implemented the decision-selected direct path from `decision-post-019.md` / `proposals/proposal-direct.md` without broadening scope.

## Source-control reconciliation

Pre-edit path-scoped diff for Wave 020 app-shell paths was clean. Full worktree status was too large for the MCP status buffer, so this implementation used path-scoped diffs and did not inspect or normalize unrelated dirty source.

Known unrelated dirty/protected context from the decision/review artifacts remains excluded from this wave:

- `frontend/src/domain/calculations/Intersections.ts` — not touched.
- `frontend/src/domain/processTree/ActionGroup.ts` — not touched.
- `frontend/src/stores/viewStore.ts` — not touched.
- unrelated e2e/audit/validation noise — not incorporated or reverted.

## Files changed

Production source:

- `frontend/src/application/appShell/ProjectSessionUseCases.ts`
  - Replaced the broad `AppShellRuntimePorts` dependency bag with explicit app-session dependencies: `drive`, `authStore`, `lastProjectRepository`, and `persistence`.
  - Preserved existing startup, sign-in/out, create/open/new/rename/request-files, last-project, and persistence behavior.
  - Kept the use case free of browser globals, storage-key literals, `GoogleDriveService`, and `ProjectService`.
- `frontend/src/application/appShell/AppShellRuntime.ts`
  - Updated runtime assembly to pass the narrowed `ProjectSessionUseCases` dependencies from injected ports.
  - Kept `createAppShellRuntime` environment-free and keyboard installation through `ports.keyboardTarget`.
- `frontend/src/application/appShell/AutoSaveUseCases.ts`
  - Introduced `AutoSaveRuntimeSessionPort`, a narrow autosave session contract containing only `getVersion()` and `snapshot(...)`.
  - Removed the direct `RuntimeSession` type dependency from autosave so autosave tests can use typed fake sessions without `as any`.
  - Behavior for debounce, polling, save, auth-expiry, quota, and missing-remote-file fallback remains unchanged.

Tests:

- `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts`
  - Replaced touched broad `as any` autosave session fixtures with typed `AutoSaveRuntimeSessionPort` builders.
  - Replaced `ProjectSessionUseCases` test construction via `deps as any` with typed narrowed dependencies.
  - Replaced touched ActivePlane/Selection fixture casts with typed fixtures where feasible.
  - Preserved production composition, last-project repository, autosave, project-session, selection, and runtime lifecycle coverage.

No changes were made to `App.vue`, `AppShellProductionRuntime.ts`, `BrowserLastProjectRepository.ts`, `ProjectSessionPersistenceAdapter.ts`, `KeyboardShortcutRouter.ts`, `RuntimeSession.ts`, Three/rendering/canvas files, stores, backend, docs, specs, package metadata, lockfiles, or e2e specs.

## Deletes / proofs

Deleted active broad dependency path:

- `ProjectSessionUseCases` no longer accepts `ports: AppShellRuntimePorts`.

Deleted weak touched test fixtures:

- Touched autosave session fixtures no longer rely on raw `as any` objects with fake `commandStack` fields.
- Touched project-session use-case construction no longer casts the dependency object with `as any`.

Proven absent / inapplicable:

- No hidden/global `createAppShellRuntime` browser defaults existed; none were added.
- No duplicate production runtime factory existed; none was added.
- No duplicate last-project key literals exist in production outside `BrowserLastProjectRepository.ts`.
- No stale tests asserted hidden `GoogleDriveService`, `ProjectSessionPersistenceAdapter`, localStorage, or window construction in `createAppShellRuntime`.
- `createAppShellRuntime().internals` remains for current focused tests; it was not removed because the direct proposal allowed narrowing instead when removal would add unrelated churn. It remains unused by production `App.vue`.

## Boundary evidence

Static scan log: `validation/static-boundary-scans.stdout.log`.

Results:

- `AppShellRuntime.ts`, `ProjectSessionUseCases.ts`, and `AutoSaveUseCases.ts` contain no direct `window`, `localStorage`, `sessionStorage`, `GoogleDriveService`, or `ProjectService` usage.
- `GoogleDriveService` construction remains only in `AppShellProductionRuntime.ts`; `AppShellPorts.ts` has type-only Drive DTO imports.
- `ProjectService` import in app-shell remains isolated to `ProjectSessionPersistenceAdapter.ts`.
- Last-project production key literals occur only in `BrowserLastProjectRepository.ts`; test references are boundary assertions / repository behavior checks.
- Keyboard target install/dispose remains explicit: runtime calls `keyboard.install(ports.keyboardTarget)`, production injects `window`, and router owns add/remove listener calls.
- `RuntimeSession.ts` remains the app-shell owner of `new World()` / `new CommandStack()`; candidate restore isolation allocations remain inside `RuntimeSession`.
- `.three-view-overlay { pointer-events: auto; }` and the current UI contract e2e `elementFromPoint` assertion remain present.

## Validation log index

All logs are under `architecture-audit/cycle-020-app-shell-project-session-browser-integration/validation/`.

- `focused-appshell-vitest.stdout.log` / `.stderr.log` — initial focused app-shell Vitest: **PASS**, 38 tests.
- `static-boundary-scans.stdout.log` / `.stderr.log` — static boundary scan: **PASS** after rerun under bash. The first attempted scan log failed because `/bin/sh` did not support `set -o pipefail`; the valid rerun overwrote the stable scan log and exited 0.
- `root-lint.stdout.log` / `.stderr.log` — `npm run lint`: **PASS**, architecture tests 11/11.
- `frontend-lint.stdout.log` / `.stderr.log` — `npm run lint --workspace=frontend`: **PASS**, architecture tests 11/11.
- `root-vitest.stdout.log` / `.stderr.log` — `npm run test`: **PASS**, 114 files passed, 1 skipped; 1283 tests passed, 45 skipped, 11 todo.
- `frontend-vitest.stdout.log` / `.stderr.log` — `npm run test --workspace=frontend`: **PASS**, 114 files passed, 1 skipped; 1283 tests passed, 45 skipped, 11 todo.
- `vitest-summaries.stdout.log` / `.stderr.log` — tail summaries for the two full Vitest runs.
- `root-build.stdout.log` / `.stderr.log` — `npm run build`: **PASS**. Vite emitted the pre-existing large chunk warning only.
- `frontend-build.stdout.log` / `.stderr.log` — `npm run build --workspace=frontend`: **PASS**. Same chunk-size warning only.
- `root-e2e.stdout.log` / `.stderr.log` — `npm run test:e2e`: **PASS**, 10/10 Playwright tests including current UI contract, keyboard shortcuts, app-shell project flow, and 3D overlay no click-through.
- `frontend-e2e.stdout.log` / `.stderr.log` — `npm run test:e2e --workspace=frontend`: **PASS**, 10/10 Playwright tests.
- `focused-appshell-vitest-post-cleanup.stdout.log` / `.stderr.log` — post-cleanup focused app-shell Vitest: **PASS**, 38 tests.

## Live preview / browser smoke

Preview refresh evidence:

- `validation/live-preview-refresh.stdout.log` — restarted Vite dev server from `frontend/` with `npm run dev -- --host 0.0.0.0`; HTTP probe to `http://127.0.0.1:5173/` succeeded on attempt 1.
- `validation/live-preview.stdout.log` / `.stderr.log` — live preview process logs.
- `validation/live-preview-probe.html` — captured reachable HTML response.

Credential-free live browser smoke:

- `validation/live-browser-smoke.stdout.log` — Playwright launched Chromium against `http://127.0.0.1:5173/`, verified app/status visibility, keyboard `p` selects Point, Escape returns to Select, overlay pointer-events are `auto`, and `document.elementFromPoint` resolves within `[data-testid="three-view-overlay"]`.
- Result: **PASS**.

## Protected-surface confirmation

- `App.vue` remained a thin shell and was not changed.
- `AppShellProductionRuntime.ts` remains the sole production browser composition boundary and was not changed.
- `BrowserLastProjectRepository.ts` remains the last-project key owner and was not changed.
- `ProjectSessionPersistenceAdapter.ts` remains the only app-shell `ProjectService` bridge and was not changed.
- `KeyboardShortcutRouter.ts` behavior and explicit target install/dispose were not changed.
- `RuntimeSession.ts` remains current `World`/`CommandStack` owner and was not changed.
- Wave 019 / Cycle 026 protected Three/rendering/canvas/overlay surfaces were not changed; e2e and live smoke verified overlay pointer ownership.

## Residual risks / caveats

- `createAppShellRuntime().internals` remains as a test/introspection surface. Removing it would require a broader test-access strategy and was not necessary for the selected direct path.
- `AutoSaveUseCases` now exports a narrow session port; this is an intentional boundary improvement but leaves broader `RuntimeSession` ownership for a future centrality-ranked wave.
- Vite build still reports the existing large chunk warning; no package/tooling or code-splitting work was in scope.

## Next-wave candidates

- Decide in a future reviewed wave whether runtime test introspection should move away from `createAppShellRuntime().internals` entirely.
- Consider a future command-kernel/session-port wave if `RuntimeSession` ownership becomes the next central architecture bottleneck.
