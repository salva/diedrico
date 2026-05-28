# Cycle 022 Implementation Log — Runtime session kernel / persistence port boundary (post-021 plan correction)

## Scope and source-control reconciliation

Implemented the decision-selected direct path from `decision-post-021-plan-correction.md` and `proposals/proposal-direct.md`. Pre-edit scoped status/diff showed no existing modifications in the selected source/test files; it did show pre-existing/unrelated Cycle 022 validation artifacts around this audit directory. Those unrelated validation/status files were not used as source inputs or normalized.

Evidence:

- `validation/pre-edit-path-scoped-status-diff.stdout`
- `validation/pre-edit-path-scoped-status-diff.stderr`
- `validation/post-edit-path-scoped-status-diff.stdout`
- `validation/post-edit-path-scoped-status-diff.stderr`

No branches were switched, no protected secret/config/env/provider files were read, and no backend/docs/spec/package/tooling/rendering/Three/CSS/canvas source files were edited.

## Source files changed

Production:

- Added `frontend/src/application/appShell/ProjectSessionKernel.ts` with the narrow project-session kernel contract and snapshot-capable subset.
- Added `frontend/src/application/appShell/ProjectSessionPersistenceTargets.ts` with adapter-facing `World`/`CommandStack` persistence handle types.
- Updated `frontend/src/application/appShell/RuntimeSession.ts` to implement `ProjectSessionKernel`, keep ownership of `World`, `CommandStack`, initialization, restore isolation, command history, and selection-delete wiring, and import persistence target types from the dedicated adapter-facing module.
- Updated `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts` to import persistence target types from `ProjectSessionPersistenceTargets.ts` instead of `RuntimeSession.ts`; `ProjectService` serialization/validation/restore calls are otherwise unchanged.
- Updated `frontend/src/application/appShell/ProjectSessionUseCases.ts` so its session dependency is `ProjectSessionKernel`, not concrete `RuntimeSession`.
- Updated `frontend/src/application/appShell/AutoSaveUseCases.ts` so `AutoSaveRuntimeSessionPort` aliases the snapshot-capable kernel subset while still exposing only `getVersion()` and `snapshot(...)` to autosave.

Tests:

- Updated `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts` fixture typing to prove `RuntimeSession` satisfies the new kernel contract while preserving existing behavior tests.
- Updated `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts` static assertions for the new kernel module, adapter-facing target module, removed adapter/runtime cross-import, removed concrete use-case dependency, and deleted old runtime-exported persistence handle interfaces.

## Deleted / replaced legacy surfaces

Deleted/replaced as required:

- `RuntimeSessionPersistenceSnapshotHandle` export from `RuntimeSession.ts`.
- `RuntimeSessionPersistenceRestoreHandle` export from `RuntimeSession.ts`.
- `ProjectSessionPersistenceAdapter.ts` import from `./RuntimeSession`.
- `ProjectSessionUseCases.ts` concrete `RuntimeSession` import/dependency.
- The autosave-only duplicate method shape was replaced by `SnapshotCapableProjectSessionKernel` without adding restore, Drive, browser, command-history, or rendering responsibilities to autosave.

Proven inapplicable/not deleted:

- No e2e specs, backend/docs/specs/package files, ProjectService schema/replay functions, command descriptors, `OperationRegistry`, `SelectionDeletionCommandService`, `SelectionDeletionCommandPort`, app-shell production composition, or `createAppShellRuntime().internals` were deleted or changed.

## Runtime/session/persistence ownership evidence

- `RuntimeSession` remains the only owner of the live `World` and `CommandStack` instances and still calls `initializeWorld(world, commandStack)` for command-backed initialization.
- `RuntimeSession.restoreValidatedProject(...)` still restores into candidate `World`/`CommandStack` objects before clearing active state, then restores into active runtime state and initializes empty projects when needed.
- `ProjectSessionPersistenceAdapter` is still the only app-shell module importing `ProjectService`; it continues to delegate to `ProjectService.serializeCommands`, `ProjectService.validateProjectData`, and `ProjectService.deserializeCommands` unchanged.
- Selection deletion remains wired through `RuntimeSession.selectionDeletionCommandPort()` and `SelectionDeletionCommandService`; `SelectionUseCases` still does not construct delete commands.

## Protected-surface checks

Captured in `validation/static-boundary-scans.stdout`:

- `ProjectSessionPersistenceAdapter.ts` no longer imports `./RuntimeSession`.
- `ProjectSessionUseCases.ts` no longer imports `./RuntimeSession`.
- `AppShellPorts.ts` has no concrete `World`, `CommandStack`, or `ProjectService` imports.
- `ProjectService` import is isolated to `ProjectSessionPersistenceAdapter.ts` among app-shell modules.
- `SelectionUseCases.ts` has no delete command construction; command construction remains in `SelectionDeletionCommandService.ts`.
- Old `RuntimeSessionPersistence*Handle` exports are absent from `RuntimeSession.ts`.

## Validation log index

All commands completed successfully unless noted.

- Pre-edit scoped status/diff: `validation/pre-edit-path-scoped-status-diff.stdout`, `.stderr` — PASS.
- Focused app-shell/selection Vitest: `validation/focused-appshell-selection-vitest.stdout`, `.stderr` — PASS, 44 tests.
- Static boundary scans: `validation/static-boundary-scans.stdout`, `.stderr` — PASS.
- Root lint: `validation/root-lint.stdout`, `.stderr` — PASS.
- Frontend lint: `validation/frontend-lint.stdout`, `.stderr` — PASS.
- Root full Vitest: `validation/root-vitest.stdout`, `.stderr` — PASS, 114 files passed / 1 skipped; 1283 passed / 45 skipped / 11 todo.
- Frontend full Vitest: `validation/frontend-vitest.stdout`, `.stderr` — PASS, same suite totals.
- Root build: `validation/root-build.stdout`, `.stderr` — PASS; Vite emitted only the existing chunk-size warning.
- Frontend build: `validation/frontend-build.stdout`, `.stderr` — PASS; Vite emitted only the existing chunk-size warning.
- Root e2e/Playwright: `validation/root-e2e.stdout`, `.stderr` — PASS, 10 tests.
- Frontend e2e/Playwright: `validation/frontend-e2e.stdout`, `.stderr` — PASS, 10 tests.
- Live preview refresh/probe: `validation/live-preview-refresh-and-probe.stdout`, `.stderr`, `validation/live-preview-server.pid`, `validation/live-preview-server.stdout`, `validation/live-preview-server.stderr` — PASS; preview started/refreshed on `0.0.0.0:5173` and answered `http://127.0.0.1:5173/`.
- Credential-free live browser smoke: `validation/live-browser-smoke.stdout`, `.stderr` — PASS on rerun after correcting the script to use the current `svg-canvas` test id; exercised startup, point creation, Delete/Ctrl+Z/Escape keyboard behavior, status/project text, and 3D overlay pointer ownership/no SVG pan.
- Post-edit scoped status/diff: `validation/post-edit-path-scoped-status-diff.stdout`, `.stderr` — PASS.

A transient first live smoke attempt failed because the ad hoc script used stale `drawing-canvas` instead of current `svg-canvas`; the script was corrected to mirror `current-ui-contract.spec.ts`, rerun, and passed. This was validation-script error, not source behavior.

## Residual risks

- `ProjectSessionPersistencePort` still exposes abstract runtime snapshot/restore handle names from `AppShellPorts.ts`; concrete `World`/`CommandStack` handle typing is now adapter-facing, but deeper persistence contract reshaping remains a future-wave concern.
- `RuntimeSession` remains a large concrete runtime owner because broader view/command-producer/rendering extraction was explicitly out of scope for this wave.
- Vite build continues to warn about a large generated chunk; unchanged and not attributable to this refactor.

## Next-wave candidates

- Continue with the planned centrality order: split additional `RuntimeSession` consumer/view/command producer responsibilities only through a reviewed future wave.
- Consider a future persistence-port cleanup that renames the remaining abstract `RuntimeSessionSnapshotHandle`/`RuntimeSessionRestoreHandle` in `AppShellPorts.ts` if the wave plan selects persistence contract language refinement.

## Retry-1 validation reconciliation

This retry found the Wave 022 implementation source already committed in `4269eb39d2bf89ccfd753ec7785a051059622b01`; path-scoped source diff for the decision-selected source/test files was empty. The retry therefore re-validated the committed implementation and added retry-specific validation evidence without changing production or test source.

Additional retry evidence:

- `validation/static-boundary-scan.stdout`, `.stderr` — PASS; adapter no longer imports `RuntimeSession`, project-session use cases no longer import concrete `RuntimeSession`, `AppShellPorts.ts` has no concrete `World`/`CommandStack`/`ProjectService` imports, `ProjectService` remains adapter-private, and selection-delete command construction remains in `SelectionDeletionCommandService`.
- `validation/focused-app-shell-vitest-rerun.stdout`, `.stderr` — PASS for app-shell runtime/use-case boundary tests and selection-deletion service tests. The first focused command log (`focused-app-shell-vitest.stdout`, `.stderr`) records a non-source invocation mistake from running a workspace command inside the workspace; the root rerun passed.
- `validation/root-lint.stdout`, `frontend-lint.stdout`, `root-full-vitest.stdout`, `frontend-full-vitest.stdout`, `root-build.stdout`, `frontend-build.stdout` — PASS.
- `validation/frontend-e2e.stdout`, `.stderr` — PASS, 10 tests. Initial `root-e2e.stdout`, `.stderr` recorded a preview-port collision with stale listeners; after refreshing the live preview on `0.0.0.0:5173`, `validation/root-e2e-rerun.stdout`, `.stderr` passed.
- `validation/live-preview-refresh-probe.stdout`, `.stderr` — PASS; stale `5173` listeners were replaced and the refreshed Vite preview answered `HTTP/1.1 200 OK` on `127.0.0.1:5173` while bound to `0.0.0.0:5173`.
- `validation/live-smoke-rerun3.stdout`, `.stderr` — PASS after correcting the validation-only smoke helper to use the current `svg-canvas` selector; exercised startup/status, point creation, Delete/Ctrl+Z keyboard behavior, and 3D overlay hit-testing/no SVG pan.

No additional production source, test source, package/tooling, backend/docs/specs, rendering/Three/canvas/CSS, Drive/auth, ProjectService schema/replay, command descriptor, or OperationRegistry changes were made by this retry.
