# Cycle 021 Implementation Log — Selection/delete command-kernel boundary

## Selected path followed

Implemented the decision-selected direct path from `proposal-direct.md`: `SelectionUseCases` remains the selection orchestration owner, while a new narrow selection/delete command service owns the command-kernel lifecycle for this slice only. No `proposal-restructure.md` generic `ApplicationCommandExecutor`, application kernel, persistence/replay work, backend/docs/tooling change, or broad non-selection command migration was introduced.

## Source files changed

Production:

- `frontend/src/application/selectionDeletion/SelectionDeletionPorts.ts` — added the narrow `SelectionDeletionCommandPort` with only `execute(selectedIds)`.
- `frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts` — added the focused service that creates `Command`, delegates cascade construction to `DeletionSequenceFactory`, commits, and pushes to `CommandStack` for selection/delete only. Test-only injectable internals are private to this class and do not widen the public application boundary.
- `frontend/src/application/appShell/SelectionUseCases.ts` — removed direct imports/use of `Command`, `CommandStack`, and `DeletionSequenceFactory`; `deleteSelected()` now reads selection ids, no-ops on empty selection, invokes the narrow delete command port, and clears selection only after the port returns successfully. Existing cascade preview and select-all active-plane behavior remain in place.
- `frontend/src/application/appShell/AppShellRuntime.ts` — wires `SelectionDeletionCommandService` at the existing runtime composition point using the current `world` and `commandStack`, then passes it into `SelectionUseCases`.

Tests:

- `frontend/tests/unit/application/selectionDeletion/SelectionDeletionCommandService.test.ts` — new focused tests for cascade deletion, lifecycle ordering, failure propagation, empty/no-op behavior, undo/redo counts, redo invalidation, notification timing, committed-only push behavior, non-undoable commands, and boundary scope.
- `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts` — updated `SelectionUseCases` construction for the new port and added tests proving successful deletion clears selection, failure preserves selection, and empty selection does not call the command boundary.
- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts` — replaced the Cycle 020 residual assertion with a prohibition on `SelectionUseCases` command-kernel construction and positive assertions that only the new service owns `DeletionSequenceFactory`, `new Command`, `commit()`, and `commandStack.push()` for this slice.
- `frontend/tests/e2e/keyboard-shortcuts.spec.ts` — added credential-free user-observable coverage for create/select, Ctrl+A, Escape, Delete, undo, and redo keyboard behavior.

Audit/log artifacts:

- `architecture-audit/cycle-021-selection-delete-command-kernel-boundary/validation/*` — stable stdout/stderr and scan logs for required validation.
- `architecture-audit/cycle-021-selection-delete-command-kernel-boundary/implementation-log.md` — this log.

## DELETE/proof list

Deleted from `SelectionUseCases.ts`:

- `Command` import.
- `CommandStack` import and constructor dependency.
- `DeletionSequenceFactory` import.
- Direct `new Command(...)` call.
- Direct `DeletionSequenceFactory.createCascadeDeletion(...)` call.
- Direct `deleteCommand.commit()` call.
- Direct `commandStack.push(deleteCommand)` call.

Deleted from tests:

- The `AppShellBoundary.test.ts` expectation that `SelectionUseCases` still matches `DeletionSequenceFactory|new Command` as accepted residual debt.

No compatibility wrapper, overload, or dual active selection-delete path was added. No broad fake helper casts were added solely to inspect command internals from `SelectionUseCases`; command lifecycle inspection lives in the focused service tests.

## Semantic-preservation evidence

Focused tests in `focused-vitest.stdout` prove:

- Empty selection remains a no-op: service does not create/commit/push, `SelectionUseCases` does not clear selection, and undo/redo counts are unchanged.
- Successful selection deletion removes selected and cascade-dependent elements through existing `DeletionSequenceFactory` ordering and pushes one committed delete command.
- Selection clears only after the command port returns successfully.
- Failure during command creation, cascade building, commit, or push propagates and does not clear selection at the `SelectionUseCases` boundary.
- Undo/redo counts, redo invalidation, notification timing, committed-only push behavior, and non-undoable command handling continue to be enforced by the existing `CommandStack` path.
- Cascade preview still reads dependency deletion order while selection is active.
- Ctrl/Cmd+A select-all-in-active-plane and Escape/Delete/undo/redo keyboard routing remain covered.

Focused e2e in `focused-e2e-keyboard.stdout` provides credential-free browser evidence for create/select/delete/undo/redo plus Ctrl+A and Escape status/keyboard behavior.

## Validation log index

All logs are under `architecture-audit/cycle-021-selection-delete-command-kernel-boundary/validation/`.

Source-control/static scans:

- `pre-edit-scoped-status.stdout` / `.stderr` — captured scoped status before editing.
- `pre-edit-scoped-diff-stat.stdout` / `.stderr` — captured scoped diff stat before editing.
- `pre-edit-static-scan.stdout` / `.stderr` — captured initial direct command-kernel references.
- `post-edit-scoped-status.stdout` / `.stderr` and `post-edit-scoped-diff-stat.stdout` / `.stderr` — captured post-edit scoped status/diff.
- `post-edit-static-scan.stdout` / `.stderr` — captured post-edit direct reference scan.
- `final-scoped-status.stdout` / `.stderr`, `final-scoped-diff-stat.stdout` / `.stderr`, `final-static-scan.stdout` / `.stderr` — final scoped source-control and boundary evidence before report/commit.

Green validation gates:

- `root-lint.stdout` / `.stderr` — `npm run lint` from root: pass.
- `frontend-lint.stdout` / `.stderr` — `npm run lint` from `frontend/`: pass.
- `focused-vitest.stdout` / `.stderr` — focused service/app-shell/boundary/keyboard unit tests: pass.
- `root-vitest.stdout` / `.stderr` — root `npm run test`: pass.
- `frontend-vitest.stdout` / `.stderr` — frontend `npm run test`: pass.
- `root-build.stdout` / `.stderr` — root `npm run build`: pass.
- `frontend-build.stdout` / `.stderr` — frontend `npm run build`: pass.
- `focused-e2e-keyboard.stdout` / `.stderr` — focused keyboard selection/delete e2e: pass.
- `root-e2e.stdout` / `.stderr` — root `npm run test:e2e`: pass.
- `frontend-e2e.stdout` / `.stderr` — frontend `npm run test:e2e`: pass.

Live preview:

- `live-preview.stdout` / `.stderr` — refreshed persistent Vite preview with `npm run dev --workspace=frontend -- --host 0.0.0.0`.
- `live-preview-probe.stdout` — reachable at `http://127.0.0.1:5173/` on attempt 1, pid `556868`.
- `live-preview-probe.html` / `.stderr` — HTTP probe artifact.

## Protected-surface checks

No backend, docs/specs, package metadata, lockfiles, Vite/Vitest/Playwright config, persistence schema/replay internals, `ProjectService`/Drive/auth internals, rendering/domain layers, canvas/tool command producers, process-history/toolbar producers, or secret/config/env files were read or modified. The e2e spec change was directly required by the Cycle 021 validation requirement for user-visible selection/delete/keyboard behavior.

## Source-control reconciliation

Pre-edit scoped evidence was captured because full `git_status` exceeded MCP output limits. The implementation touched only the selected Cycle 021 production/test/audit paths listed above. Adjacent dirty files outside this scoped implementation were not inspected for content, incorporated, reformatted, or reverted.

## Residual risks

- Other direct command-construction sites remain known residuals outside Cycle 021 scope.
- `SelectionDeletionCommandService` intentionally depends internally on concrete `World`, `CommandStack`, `Command`, and `DeletionSequenceFactory`; this is accepted by the decision for the direct path and should be revisited only in a later reviewed wave if a broader command lifecycle boundary is selected.

## Next-wave candidates observed

- Consider a future reviewed wave for other command-producing use cases if repeated command lifecycle choreography remains a central architectural leak.

## t1b finish verification

The follow-up finish task re-read the Cycle 021 decision, selected direct proposal, round-02 review, implementation sources, tests, existing implementation log, prior task report, and validation artifacts without reading protected secret/config files. It did not broaden the implementation beyond the reviewed direct selection/delete service path.

Additional finish-task evidence captured under `architecture-audit/cycle-021-selection-delete-command-kernel-boundary/validation/`:

- `t1b-pre-status.stdout` / `.stderr` — scoped status for Cycle 021 implementation/audit/report paths at task start.
- `t1b-static-selection-scan.stdout` / `.stderr` — selection/delete call-site scan confirming current app-shell/service references.
- `t1b-pre-diff.stdout` / `.stderr` — scoped diff check for implementation paths at finish-task start.
- `t1b-focused-vitest.stdout` / `.stderr` — reran focused service/app-shell/boundary/keyboard unit tests: 4 files passed, 36 tests passed.
- `t1b-final-boundary-scan.stdout` / `.stderr` — confirms `SelectionUseCases.ts` has no `DeletionSequenceFactory`, `new Command`, `CommandStack`, `commandStack.push`, or `.commit(` references; command-kernel ownership remains in `SelectionDeletionCommandService` and runtime composition remains in `AppShellRuntime`.
- `t1b-existing-validation-summary.stdout` / `.stderr` — summarized previously captured mandatory gates showing root/frontend lint, root/frontend Vitest, root/frontend build, focused e2e, and root/frontend e2e all passed.
- `t1b-live-preview-probe.stdout` / `.stderr` — HTTP probe confirmed the existing live preview still answers `HTTP/1.1 200 OK` at `http://127.0.0.1:5173/`.

No additional production or test source changes were required during t1b. The new files from t1b are validation/report/log artifacts only.

## Manager source-control correction after stage review

The first implementation-stage reviewer report (`.saivage/stages/cycle-021-implement-selection-delete-command-kernel-boundary/reports/t2-review-stage.json`) flagged stale final source-control evidence showing the new implementation files as untracked/modified. The implementation commits already present in git history reconcile the production/test implementation files:

- `1a71997 [tsk-t1-implement-selection-delete-boundary] Extract selection delete command service`
- `4b18667 [t1b-finish-selection-delete-boundary] Finish Cycle 021 validation evidence`
- subsequent t1b metadata commits recorded report/log metadata only.

Refreshed evidence was captured after the reviewer blocker:

- `validation/final-scoped-status.stdout` / `.stderr` — now shows no uncommitted `frontend/src/application/appShell/SelectionUseCases.ts`, `frontend/src/application/appShell/AppShellRuntime.ts`, `frontend/src/application/selectionDeletion/`, `frontend/tests/unit/application/selectionDeletion/`, app-shell unit tests, or keyboard e2e implementation files. Remaining entries are audit/stage artifacts plus pre-existing proposal/corrections edits.
- `validation/final-scoped-diff-stat.stdout` / `.stderr` — confirms the current scoped diff is limited to audit/stage/log artifacts and pre-existing proposal/corrections edits, not implementation source/test files.
- `validation/final-implementation-commits.stdout` / `.stderr` — records the relevant implementation commits touching the app-shell/selection-deletion implementation and implementation log.

This correction did not change production or test source. It only refreshed reconciliation evidence and documents that the reviewer’s source-control blocker has been addressed by current committed state.

## Validation/preview closure — Wave 021 COMPLETE

Status: **Wave 021 COMPLETE** as of `cycle-021-validation-and-preview-refresh`.

The validation/preview closure task independently re-read the Cycle 021 decision, implementation log, validation directory, current `wave-plan.md`, package scripts, and the implemented selection/delete boundary sources without reading protected secret/config/env files. No production source refactor, package/tooling change, next-wave implementation, or unrelated source edit was made during closure.

### Fresh closure evidence captured

Additional closure logs are under `architecture-audit/cycle-021-selection-delete-command-kernel-boundary/validation/`:

- `t1-close-scoped-status.stdout` / `.stderr` — scoped source-control status/diff at validation-close start. It shows production/test implementation source paths are not dirty; remaining scoped dirty entries are audit/stage artifacts plus pre-existing Cycle 021 planning/proposal edits.
- `t1-close-evidence-summary.stdout` / `.stderr` — static boundary scan and existing stable validation summary. `SelectionUseCases.ts` has no `DeletionSequenceFactory`, `new Command`, `CommandStack`, `commandStack.push`, or `.commit(` references. Command-kernel lifecycle ownership for this slice is isolated in `SelectionDeletionCommandService.ts`; `AppShellRuntime.ts` only composes `CommandStack` and wires the service.
- `t1-close-root-lint.stdout` / `.stderr` — root `npm run lint`: pass, 4 architecture test files and 11 tests passed.
- `t1-close-frontend-lint.stdout` / `.stderr` — frontend `npm run lint`: pass, 4 architecture test files and 11 tests passed.
- `t1-close-focused-vitest.stdout` / `.stderr` — focused selection/delete/app-shell/keyboard Vitest: pass, 4 files and 36 tests passed.
- `t1-close-root-vitest.stdout` / `.stderr` — root `npm run test`: pass, 110 files passed, 1 skipped, 1257 tests passed, 45 skipped, 11 todo.
- `t1-close-frontend-vitest.stdout` / `.stderr` — frontend `npm run test`: pass, 110 files passed, 1 skipped, 1257 tests passed, 45 skipped, 11 todo.
- `t1-close-root-build.stdout` / `.stderr` — root `npm run build`: pass; Vite emitted only the existing large-chunk warning.
- `t1-close-frontend-build.stdout` / `.stderr` — frontend `npm run build`: pass; Vite emitted only the existing large-chunk warning.
- `t1-close-focused-e2e-keyboard.stdout` / `.stderr` — focused keyboard/selection/delete Playwright: pass, 3 tests passed, including Delete/undo/redo/Escape/Ctrl+A behavior.
- `t1-close-root-e2e.stdout` / `.stderr` — root `npm run test:e2e`: pass, 9 Playwright tests passed.
- `t1-close-frontend-e2e.stdout` / `.stderr` — frontend `npm run test:e2e`: pass, 9 Playwright tests passed.
- `t1-close-live-preview-probe.stdout` / `.stderr` — preview reachability check found a listener on `0.0.0.0:5173` and HTTP 200 at `http://127.0.0.1:5173/`; it also detected a duplicate non-listening dev process group.
- `t1-close-live-preview-singleton.stdout` / `.stderr` — terminated the duplicate preview process group, confirmed the remaining Vite dev server listens on `0.0.0.0:5173`, and captured HTTP 200 from `http://127.0.0.1:5173/`.
- `t1-close-validation-summary.stdout` / `.stderr` — combined tail summary of all fresh closure gates.
- `t1-close-wave-plan-next.stdout` / `.stderr` — wave-plan reread/search evidence for post-Wave-021 recommendation.

### Semantic-preservation closure

The fresh focused and full validation proves the reviewed semantic-preservation requirements are green:

- Empty/no-op selection deletion remains covered by `SelectionDeletionCommandService` and `SelectionUseCases` tests.
- Successful deletion clears selection only after the command boundary succeeds.
- Failure behavior preserves selection and propagates from command creation/cascade/commit/push paths in focused tests.
- Undo/redo counts, redo invalidation, committed-only push behavior, non-undoable command handling, and command-stack notification timing remain exercised by focused service tests through the existing `CommandStack` path.
- Cascade preview and select-all active-plane behavior remain covered by app-shell tests.
- Credential-free Playwright covers Delete, undo, redo, Escape, Ctrl+A, and app-shell/current UI behavior.

### Stale/harness evidence reconciliation

Earlier stale failing validation attempts or worker/reviewer schema-mismatch envelopes are superseded by the green source validation logs listed above. They are treated as harness/reporting artifacts only, not source failures. Current closure evidence is source-owned: static scans, focused tests, full lint/test/build/e2e gates, and live preview reachability all pass.

### Final source-control reconciliation

The closure status evidence distinguishes Cycle 021 implementation source from adjacent audit/planning dirt. The implementation source/test files for `SelectionUseCases`, `AppShellRuntime`, `selectionDeletion/`, app-shell unit tests, selection-deletion unit tests, and keyboard e2e are already committed from the implementation stage and are not dirty in the scoped closure status. Current uncommitted changes from this closure are validation/report/log artifacts only, plus pre-existing Cycle 021 planning/proposal artifact edits that were not modified as production code.

### Next-wave recommendation after rereading `wave-plan.md`

`wave-plan.md` currently contains Wave 021 as the latest concrete wave entry and does not define a reviewed Wave 022 implementation target. Because Wave 021 is now complete and no next-wave source implementation is authorized in this stage, the next bounded action should be a planning/scout stage to extend or re-rank the wave plan based on current source evidence and Wave 021 learnings. Recommended next canonical stage: `cycle-022-fresh-scout-proposals` if the Planner/Manager adds a concrete Wave 022 entry first, or a reviewed `wave-plan-extension` mini-cycle if the plan must be extended before scouting. Candidate central residuals to consider, without implementing here: other command-producing use cases that still construct/push commands directly, broader app-shell/runtime command-kernel ownership, persistence/project-session concrete `World`/`CommandStack` contract residue, and lower-priority placeholder/debug cleanup only after central command/persistence boundaries are ordered.
