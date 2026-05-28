# Cycle 022 Implementation Log — Runtime session kernel and persistence port boundary

## Scope followed

Implemented the decision-selected direct path from `decision.md` / `proposals/proposal-direct.md`: a named app-shell `RuntimeSession` now owns the current `World`/`CommandStack` lifecycle, and project/session/autosave use cases consume session-oriented methods instead of passing raw runtime pairs to persistence.

No reviewed delta was needed. The implementation did not modify backend, docs/spec source, package/tooling, persistence schema/replay internals, operation descriptors, Drive/auth internals, rendering/domain layers, debug files, environment/provider/secret config, or broad command-kernel/keyboard/active-plane/selection APIs.

## Source-control reconciliation

Pre-edit evidence:

- `validation/pre-edit-scoped-status-diff.stdout`
- `validation/pre-edit-scoped-status-diff.stderr`

The workspace already contained adjacent Cycle 022 audit/stage artifacts and a tracked `decision.md` diff before implementation. Those pre-existing artifacts were not reverted or used as implementation authority. The implementation intentionally changed only app-shell source/tests and this cycle's validation/log artifacts.

Final scoped evidence:

- `validation/final-scoped-status-diff.stdout`
- `validation/final-scoped-status-diff.stderr`
- `validation/final-boundary-scan.stdout`
- `validation/final-boundary-scan.stderr`

## Production files changed

- `frontend/src/application/appShell/RuntimeSession.ts` — new focused runtime-session boundary. Owns `World` and `CommandStack`, default initialization, clear/reset, version observation, snapshot delegation, validation, and atomic restore by replaying into an isolated candidate runtime before clearing active state.
- `frontend/src/application/appShell/AppShellRuntime.ts` — composes one `RuntimeSession`; wires active-plane, selection deletion, keyboard, view-facing `world`/`commandStack`, project session, and autosave through named session accessors.
- `frontend/src/application/appShell/AppShellPorts.ts` — narrows app-shell persistence contract to `SerializedProjectSession`, `RuntimeSessionSnapshotHandle`, and `RuntimeSessionRestoreHandle`; no longer imports or exposes `World`, `CommandStack`, `ProjectData`, or `ProjectService`.
- `frontend/src/application/appShell/ProjectSessionUseCases.ts` — removed direct `World`, `CommandStack`, `ProjectData`, and `initializeWorld` dependencies; uses `RuntimeSession` for local startup initialization, sign-out clear, create/new reset, open validation, atomic restore, and snapshot flows.
- `frontend/src/application/appShell/AutoSaveUseCases.ts` — removed direct `World`/`CommandStack` dependencies; polls `session.getVersion()` and snapshots through `session.snapshot(...)`.
- `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts` — remains the only app-shell `ProjectService` bridge; concrete `ProjectData`, `World`, and `CommandStack` awareness is adapter-private casting from opaque session handles.

## Tests changed

- `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts` — updated fakes to the narrowed persistence port; added failure-path coverage for invalid project data, restore/deserialization failure isolation, command-stack/world state preservation after failed open, project metadata preservation, and autosave snapshot exception status behavior.
- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts` — added Cycle 022 static boundary assertions: ports do not import concrete runtime/persistence DTOs; project session and autosave do not call raw-pair persistence; `ProjectSessionPersistenceAdapter` is the only app-shell `ProjectService` import; selection deletion wiring remains explicit.

## DELETE list / proofs

Deleted legacy raw app-shell persistence surfaces:

- Removed `ProjectSessionPersistencePort.snapshotCurrentSession(deps: { commandStack; world; projectName })`.
- Removed `ProjectSessionPersistencePort.restoreSession(data, deps: { world; commandStack })` from the public app-shell port.
- Removed app-shell port imports of `CommandStack`, `World`, and `ProjectData`.
- Removed direct `ProjectSessionUseCases` imports/dependencies on `CommandStack`, `World`, `ProjectData`, and `initializeWorld`.
- Removed direct `AutoSaveUseCases` imports/dependencies on `CommandStack` and `World`.
- Updated tests/fakes that asserted or depended on raw concrete persistence arguments.

No transitional overloads, compatibility wrappers, or parallel raw-pair public persistence paths were added. The only remaining concrete runtime object use is inside `RuntimeSession` and the adapter-private `ProjectSessionPersistenceAdapter`, plus reviewed existing consumers (`ActivePlaneUseCases`, `KeyboardShortcutRouter`, `SelectionUseCases`, and `SelectionDeletionCommandService`) wired by named session accessors.

## Atomic restore / failure-path evidence

Atomicity is implemented in `RuntimeSession.restoreValidatedProject()`:

1. `ProjectSessionUseCases.openProject()` loads data and calls `session.validateProjectData(...)` before any destructive reset.
2. `RuntimeSession.restoreValidatedProject()` restores into a new isolated `World`/`CommandStack` candidate first.
3. If candidate restore or fallback initialization throws, the active session is never cleared or partially replaced.
4. Only after candidate restore succeeds does the method clear and restore the active session, preserving current successful-flow behavior including fallback plane initialization and dirty marking.

Focused tests prove:

- invalid project data does not clear or partially replace active world/command-stack state;
- restore/deserialization failure calls restore only on the isolated candidate and leaves active state, project metadata, undo/redo state, and autosave start state intact;
- autosave snapshot failure returns save status to `idle` without disabling polling/future autosave.

## Validation log index

All commands were run from `/work/diedrico` unless otherwise noted.

- Pre-edit scoped status/diff: `validation/pre-edit-scoped-status-diff.stdout`, `validation/pre-edit-scoped-status-diff.stderr` — pass.
- Initial focused Vitest with wrong workspace-relative paths: `validation/focused-appshell-vitest-01.stdout`, `validation/focused-appshell-vitest-01.stderr` — failed with `No test files found`; command was corrected and rerun.
- Focused Vitest after path correction: `validation/focused-appshell-vitest-02.stdout`, `validation/focused-appshell-vitest-02.stderr` — failed on overly strict new test assumptions about initialization undo count; tests were corrected to compare captured pre-open state.
- Focused Vitest final: `validation/focused-appshell-vitest-03.stdout`, `validation/focused-appshell-vitest-03.stderr` — pass, 30 tests.
- Static app-shell scan: `validation/static-appshell-scan.stdout`, `validation/static-appshell-scan.stderr` — inspected; remaining concrete imports are in existing reviewed consumers, new `RuntimeSession`, and adapter-private bridge.
- Root lint: `validation/root-lint-01.stdout`, `validation/root-lint-01.stderr` — pass.
- Frontend lint: `validation/frontend-lint.stdout`, `validation/frontend-lint.stderr` — pass.
- Frontend build first attempt: `validation/frontend-build-01.stdout`, `validation/frontend-build-01.stderr` — failed due `SerializedProjectSession` index-signature typing; fixed by narrowing the DTO shape and adapter cast.
- Frontend build: `validation/frontend-build-02.stdout`, `validation/frontend-build-02.stderr` — pass with existing Vite large-chunk warning.
- Focused test + build after opaque port adjustment: `validation/focused-and-build-after-opaque-port.stdout`, `validation/focused-and-build-after-opaque-port.stderr` — pass.
- Root full Vitest: `validation/root-full-vitest.stdout`, `validation/root-full-vitest.stderr` — pass via root `npm run test` (frontend suite), 110 passed / 1 skipped test files; 1263 passed / 45 skipped / 11 todo tests.
- Frontend full Vitest: `validation/frontend-full-vitest.stdout`, `validation/frontend-full-vitest.stderr` — pass, same suite counts.
- Root build: `validation/root-build.stdout`, `validation/root-build.stderr` — pass with existing Vite large-chunk warning.
- Root e2e/Playwright: `validation/root-e2e.stdout`, `validation/root-e2e.stderr` — pass, 9/9 Chromium tests including startup/project chooser and delete/undo behavior.
- Live preview restart/probe attempts: `validation/live-preview-probe.stdout`, `validation/live-preview-probe.stderr` and `validation/live-preview-probe-02.stdout`, `validation/live-preview-probe-02.stderr` — failed because the restart command's `pkill` pattern matched its own shell.
- Live preview refresh/probe final: `validation/live-preview-refresh-03.stdout`, `validation/live-preview-refresh-03.stderr`, `validation/live-preview-probe-03.stdout`, `validation/live-preview-probe-03.stderr` — pass; dev server bound on `0.0.0.0` and `curl http://127.0.0.1:5173/` returned HTTP 200.
- Final scoped status/diff: `validation/final-scoped-status-diff.stdout`, `validation/final-scoped-status-diff.stderr` — captured.
- Final boundary scan: `validation/final-boundary-scan.stdout`, `validation/final-boundary-scan.stderr` — captured.

## Live preview / credential-free behavior evidence

The live preview was refreshed with:

```sh
nohup npm run dev --workspace=frontend -- --host 0.0.0.0 > validation/live-preview-refresh-03.stdout 2> validation/live-preview-refresh-03.stderr &
```

Reachability probe returned HTTP 200 in `validation/live-preview-probe-03.stdout`.

Credential-free user-observable behavior was covered by `npm run test:e2e` in `validation/root-e2e.stdout`, including startup without Google credentials, app-shell project chooser access without backend project API calls, selection deletion, undo/redo, keyboard shortcuts, and canvas/status interactions. No real Drive credentials were used.

## Protected-surface checks

Not modified:

- backend files;
- docs/spec source files;
- package/tooling files;
- persistence schema version, command snapshot shape, operation descriptors, `OperationRegistry`, replay algorithm, migration behavior;
- Drive/auth internals or credential behavior;
- rendering/domain layers;
- protected config/env/provider/secret files.

No secret/config/env/provider file contents were read, logged, copied, or included.

## Residual risks and next-wave candidates

- `RuntimeSession` now contains narrow raw-object accessors for existing consumers. This is intentional for Cycle 022, but a future wave should continue shrinking direct `World`/`CommandStack` dependencies for active-plane, keyboard/history, selection, and rendering-facing consumers.
- `ProjectSessionPersistenceAdapter` uses private casts from opaque session handles to concrete runtime objects. This preserves the public app-shell contract, but future persistence-port work could replace the private cast with a package-private adapter interface if TypeScript module boundaries become stricter.
- Successful active restore still clears and replays the active session after candidate validation. This keeps `World`/`CommandStack` object identity stable for current consumers; a later deeper session replacement design may be cleaner but would require reviewed migration of all raw-object consumers.

## Correction round — t3 review blockers

Reviewer blocker corrections were applied without broadening Cycle 022 scope.

### Serialized DTO leakage correction

Changed the app-shell persistence boundary so use cases no longer consume the serialized project DTO shape:

- `AppShellPorts.ts` no longer exposes `SerializedProjectSession` or DTO fields such as schema/version/commands/timestamps. It now exposes an opaque `PersistedProjectSession` payload and an `OpenedProjectSession` result containing only app-shell metadata (`projectName`) plus the opaque payload.
- `ProjectSessionUseCases.openProject()` no longer reads `projectData.name`; it consumes `openedSession.projectName` returned by the session/persistence boundary.
- `RuntimeSession` restores only the opaque validated payload, preserving validation-before-destructive-reset and isolated candidate restore semantics.
- `ProjectSessionPersistenceAdapter` remains the only app-shell bridge that reads `ProjectData.name` and casts the opaque payload back to `ProjectData` for `ProjectService.deserializeCommands()`.
- `AppShellBoundary.test.ts` now asserts that `AppShellPorts.ts` does not expose `SerializedProjectSession` or serialized DTO fields, and that `ProjectSessionUseCases.ts` does not read serialized project shape directly.

### Additional validation evidence

New correction-round logs under `validation/`:

- `t3-prepatch-symbol-scan.stdout`, `t3-prepatch-symbol-scan.stderr` — pre-correction symbol scan for obsolete DTO-boundary names.
- `t3-obsolete-symbol-scan-01.stdout`, `t3-obsolete-symbol-scan-01.stderr` — intermediate scan after first patch.
- `t3-root-workspace-frontend-lint.stdout`, `t3-root-workspace-frontend-lint.stderr` — pass; missing mandatory root workspace frontend lint evidence (`npm run lint --workspace=frontend`) captured from repository root.
- `t3-focused-appshell-vitest.stdout`, `t3-focused-appshell-vitest.stderr` — failed once because the new boundary assertion also rejected the legitimate `nextElementId` snapshot handle; assertion was corrected.
- `t3-focused-vitest-and-frontend-build.stdout`, `t3-focused-vitest-and-frontend-build.stderr` — pass; focused app-shell Vitest 30/30 and frontend build pass with the existing Vite large-chunk warning.
- `t3-final-boundary-scan.stdout`, `t3-final-boundary-scan.stderr` — confirms obsolete `SerializedProjectSession`, `assertProjectData`, and use-case `projectData.name` usage are gone from app-shell production files; remaining DTO field mentions are adapter-private or test fixtures/boundary assertions.

No protected out-of-scope surfaces were modified during this correction.


## Validation-and-preview closure — t1 independent verification

**Wave 022 COMPLETE.** The validation-and-preview stage independently rechecked the Cycle 022 implementation evidence and supplemented it with fresh closure logs. No production source, tests, package/tooling, backend, docs/spec source, protected config/env/provider files, or next-wave implementation changes were made during closure.

### Fresh closure validation log index

All commands were run from `/work/diedrico` and captured under `architecture-audit/cycle-022-runtime-session-kernel-persistence-port-boundary/validation/`.

- Static app-shell/session boundary scan: `closure-static-boundary-scan.stdout`, `closure-static-boundary-scan.stderr` — pass. `AppShellPorts.ts` does not expose concrete `World`, `CommandStack`, `ProjectData`, `ProjectService`, or serialized DTO names/fields; `ProjectSessionUseCases.ts` and `AutoSaveUseCases.ts` do not pass raw world/command-stack pairs to persistence; `ProjectSessionPersistenceAdapter.ts` is the only app-shell `ProjectService` import; `RuntimeSession.ts` is the explicit allowed owner of `World`, `CommandStack`, and initialization/restore lifecycle.
- Root lint: `closure-root-lint.stdout`, `closure-root-lint.stderr` — pass, 4 architecture test files / 11 tests.
- Root workspace frontend lint: `closure-root-workspace-frontend-lint.stdout`, `closure-root-workspace-frontend-lint.stderr` — pass, 4 architecture test files / 11 tests.
- Focused app-shell Vitest: `closure-focused-appshell-vitest.stdout`, `closure-focused-appshell-vitest.stderr` — pass, `AppShellBoundary` + `AppShellRuntimeUseCases`, 30/30 tests.
- Root full Vitest: `closure-root-full-vitest.stdout`, `closure-root-full-vitest.stderr` — pass via root `npm run test`; stderr contains expected exercised warning/error paths from existing negative tests, not command failure.
- Frontend full Vitest: `closure-frontend-full-vitest.stdout`, `closure-frontend-full-vitest.stderr` — pass via `npm run test --workspace=frontend`; stderr contains the same expected negative-test warnings.
- Root build: `closure-root-build.stdout`, `closure-root-build.stderr` — pass with existing Vite large-chunk warning only.
- Frontend build: `closure-frontend-build.stdout`, `closure-frontend-build.stderr` — pass with existing Vite large-chunk warning only.
- Root e2e/Playwright: `closure-root-e2e.stdout`, `closure-root-e2e.stderr` — pass, 9/9 Chromium tests including startup/project chooser without Google credentials and delete/undo/keyboard behavior.
- Existing preview probe before refresh: `closure-live-preview-existing-probe.stdout`, `closure-live-preview-existing-probe.stderr` — no server was reachable; this supersedes stale earlier preview process assumptions.
- Live preview refresh/probe: `closure-live-preview-refresh.stdout`, `closure-live-preview-refresh.stderr`, `closure-live-preview.pid`, `closure-live-preview-probe.stdout`, `closure-live-preview-probe.stderr` — pass. A fresh Vite dev server was started with `npm run dev --workspace=frontend -- --host 0.0.0.0`; `curl` probes to `http://127.0.0.1:5173/` and `http://localhost:5173/` returned HTTP 200.
- Final source-control reconciliation: `closure-final-status-diff.stdout`, `closure-final-status-diff.stderr` — captured. The workspace still contains broad pre-existing dirty/untracked audit, stage, protected-config, and adjacent source changes. Closure intentionally changed only this implementation log and validation/report artifacts; no protected file contents were read or copied.
- Wave-plan reread/index: `closure-wave-plan-index.stdout`, `closure-wave-plan-index.stderr` — captured. The current plan ends at Wave 022; the next bounded action should be a wave-plan-extension/scout stage, not implementation.

### Atomic restore / failure-path verification

Focused app-shell tests and boundary tests remain green and cover the required Cycle 022 failure paths: invalid/corrupt payload validation before destructive reset, isolated candidate restore/deserialization failure without clearing active runtime state, command-stack/world/session metadata preservation after failed open, autosave snapshot exception status recovery, and explicit selection-delete runtime wiring. The fresh static scan confirms the implementation still places raw runtime ownership only in `RuntimeSession` and the adapter-private `ProjectSessionPersistenceAdapter` bridge.

### Stale/non-source evidence disposition

Earlier failed validation attempts in this cycle are superseded by the green closure logs above: wrong focused-test paths, overly strict intermediate assertions, an earlier `SerializedProjectSession` typing/build failure, and unsafe preview restart commands. Nonstandard worker/reviewer envelope issues are harness-only/stage-artifact concerns and are not source validation failures.

### Source-control and protected-surface reconciliation

The final status evidence is intentionally noisy because the repository contains many pre-existing deleted/modified/untracked files outside Cycle 022, including protected `.saivage` config paths listed only by name in `git status`. This closure did not inspect protected file contents and did not revert, incorporate, or normalize unrelated dirty work. Cycle 022 source changes remain limited to the reviewed app-shell runtime/session/persistence boundary and tests from the implementation stage; closure added only validation artifacts, this log update, and the task report.

### Next-wave recommendation / re-rank

After rereading `architecture-audit/wave-plan.md`, Wave 022 is the last currently defined wave. Because Wave 022 establishes the runtime-session/persistence boundary and intentionally leaves leaf command producers plus private persistence casts as residual debt, the next canonical action should be a bounded **cycle-023-wave-plan-extension / scout-proposals** stage before any implementation. Recommended highest-centrality candidates for that plan extension are:

1. shrink remaining direct `World`/`CommandStack` dependencies behind the new `RuntimeSession` for active-plane, keyboard/history, selection, canvas/tool, and rendering-facing consumers;
2. remove the adapter-private `ProjectSessionPersistenceAdapter` casts by defining a stricter package-private persistence/runtime adapter contract, if that proves more central than leaf command cleanup;
3. then resume leaf command-producer cleanup for canvas/style/construction/process-history only after the runtime-session boundary is stable.

Do not implement any of these next-wave candidates in the validation closure stage.

## Validation-and-preview closure — t1 post-021 plan correction verification (fresh rerun)

**Wave 022 remains COMPLETE after independent closure verification.** This task rechecked the decision-selected direct implementation against `decision-post-021-plan-correction.md` and `proposals/proposal-direct.md`, reran the mandatory validation/preview evidence, and did not change production source, test source, package/tooling, backend, docs/spec source, persistence schema/replay, command descriptors, Drive/auth, rendering/Three/canvas/CSS, or protected config/env/provider files.

### Source-control reconciliation

Fresh scoped evidence:

- `validation/t1-closure-scoped-status-diff.stdout`, `.stderr` — captured path-scoped status/diff for the Cycle 022 audit directory and the Wave 022 app-shell source/test files. The selected production/test source files were not modified during closure. Existing adjacent audit/decision/review/validation noise remains attributed to prior stages and was not reverted, normalized, or incorporated.
- A first status-capture wrapper using `/bin/sh` failed on `set -o pipefail`; it produced only `.saivage` command logs and was rerun under bash. This was harness-command noise, not source validation evidence.

### Protected boundary verification

Fresh static scan:

- `validation/t1-static-boundary-scan.sh`
- `validation/t1-static-boundary-scan.stdout`, `.stderr` — pass after tightening two scan predicates to avoid false positives on the abstract `validateProjectData` method name and on new target-module type imports.

The final scan confirms:

- `ProjectSessionPersistenceAdapter.ts` no longer imports `./RuntimeSession`.
- `ProjectSessionUseCases.ts` no longer imports the concrete `RuntimeSession` class.
- `AppShellPorts.ts` has no concrete `World`, `CommandStack`, or `ProjectData` imports.
- `ProjectService` imports remain isolated to `ProjectSessionPersistenceAdapter.ts` among app-shell modules.
- `RuntimeSession.ts` no longer exports the old runtime persistence handle interfaces.
- `SelectionUseCases.ts` does not construct delete commands; command construction remains in `SelectionDeletionCommandService.ts`.
- `ProjectSessionKernel.ts` and `ProjectSessionPersistenceTargets.ts` exist as the reviewed kernel/adapter-facing target modules.

This matches the selected direct proposal: RuntimeSession/session-kernel ownership, app-shell persistence/session port narrowing, adapter-private ProjectService boundary, ProjectSessionUseCases/AutoSaveUseCases dependency narrowing, initializeWorld ownership preservation, and corrected Wave 021 selection-delete wiring preservation are all still intact.

### Fresh mandatory validation evidence

All defined commands were rerun and passed, with full stdout/stderr captured under `architecture-audit/cycle-022-runtime-session-kernel-persistence-port-boundary/validation/`:

- Root lint: `t1-root-lint.stdout`, `.stderr` — PASS.
- Frontend lint: `t1-frontend-lint.stdout`, `.stderr` — PASS.
- Focused app-shell/selection Vitest: `t1-focused-appshell-selection-vitest.stdout`, `.stderr` — PASS, 3 files / 44 tests.
- Root full Vitest: `t1-root-full-vitest.stdout`, `.stderr` — PASS.
- Frontend full Vitest: `t1-frontend-full-vitest.stdout`, `.stderr` — PASS.
- Root build: `t1-root-build.stdout`, `.stderr` — PASS, with only the existing Vite large-chunk warning where emitted.
- Frontend build: `t1-frontend-build.stdout`, `.stderr` — PASS, with only the existing Vite large-chunk warning where emitted.
- Root e2e/Playwright: `t1-root-e2e.stdout`, `.stderr` — PASS, 10 Chromium tests.
- Frontend e2e/Playwright: `t1-frontend-e2e.stdout`, `.stderr` — PASS.

### Live preview refresh and credential-free smoke

Preview evidence:

- Existing reachability was first confirmed with HTTP 200 on `http://127.0.0.1:5173/`.
- `validation/t1-live-preview.stdout`, `.stderr`, `.pid`, and `t1-live-preview-probe.stdout`, `.stderr` record an attempted refresh that fell back to port 5177 because stale preview listeners were already occupying 5173–5176; the 5173 probe still returned HTTP 200 from the existing listener.
- `validation/t1-live-preview-refresh-5173.stdout`, `.stderr`, `t1-live-preview-5173.stdout`, `.stderr`, `.pid`, and `t1-live-preview-5173-probe.stdout`, `.stderr` record the follow-up reconciliation: listeners were inspected, `0.0.0.0:5173` was confirmed reachable, and `curl -I http://127.0.0.1:5173/` returned HTTP 200. The captured listener line shows `0.0.0.0:5173`.
- `validation/t1-live-browser-smoke.stdout`, `.stderr` — PASS; credential-free Playwright smoke exercised startup/status, point creation, Delete/Ctrl+Z behavior, and 3D overlay pointer ownership/no SVG pan against `127.0.0.1:5173`.

No Google/Drive credentials or protected config/env/provider contents were read or used.

### Out-of-scope/protected surfaces

Closure verified but did not modify ProjectService schema/replay, command descriptors, OperationRegistry, Drive/auth internals, rendering/Three/canvas/CSS, backend, docs/specs, package/tooling, broad app-kernel facades, app-shell production composition redesign, or unrelated dirty files. The remaining scoped status noise is audit/stage artifact noise and pre-existing decision/review context; it is intentionally not normalized here.

### Residual risks and next canonical stage

Residual Wave 022 risks remain the same as implementation: `RuntimeSession` is still a large runtime owner by design, and deeper cleanup of runtime consumers plus adapter-private persistence casts is deferred to future reviewed waves.

The current wave plan includes subsequent central waves. `validation/t1-wave-plan-index.stdout` shows Wave 023 is **Runtime-session consumer ports and command-history boundary**, followed by Wave 024 command-producer runtime ports and later rendering/read-model waves. Therefore the next canonical stage should be:

`cycle-023-fresh-scout-proposals-runtime-session-consumer-ports-command-history-boundary`

That stage should re-read the Wave 023 entry against current source and produce scope-check/proposals before any implementation.
