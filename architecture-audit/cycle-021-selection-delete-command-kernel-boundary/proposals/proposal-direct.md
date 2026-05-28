# Proposal Direct — Close Wave 021 as already satisfied; perform corrective plan edit before implementation

## Decision intent

Do **not** implement source changes for Wave 021 as written. The direct, least-risk, architecture-honest path is to record that the selection/delete command-kernel boundary already exists in current source and to schedule a reviewed plan-edit stage that supersedes the stale Wave 021 entry.

This proposal advances the project priorities by avoiding fake churn, avoiding a broad command-kernel facade, and preserving the no-backcompat/aggressive-deletion posture: stale plan claims should be deleted or corrected rather than implemented around.

## Current source conclusion

The Wave 021 target state is already present:

- `SelectionUseCases` receives a `SelectionDeletionCommandPort` and delegates delete execution (`frontend/src/application/appShell/SelectionUseCases.ts:1-3`, `frontend/src/application/appShell/SelectionUseCases.ts:8-13`, `frontend/src/application/appShell/SelectionUseCases.ts:30-35`).
- `SelectionUseCases` cascade preview uses a narrow `SelectionReadPort`, not direct `World` access (`frontend/src/application/appShell/AppShellPorts.ts:45-48`; `frontend/src/application/appShell/SelectionUseCases.ts:48-55`).
- `SelectionDeletionCommandService` owns `new Command`, `DeletionSequenceFactory`, `commit()`, and `commandStack.push()` for selection delete (`frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts:1-5`, `frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts:12-17`, `frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts:30-37`).
- `RuntimeSession` wires the service behind `selectionDeletionCommandPort()` while retaining private `World` / `CommandStack` ownership (`frontend/src/application/appShell/RuntimeSession.ts:31-33`, `frontend/src/application/appShell/RuntimeSession.ts:170-172`).
- `AppShellBoundary.test.ts` already encodes the desired boundary (`frontend/tests/unit/application/appShell/AppShellBoundary.test.ts:62-69`).

## Files to change

In this fresh-scout stage only:

- `architecture-audit/cycle-021-selection-delete-command-kernel-boundary/scope-check.md`
- `architecture-audit/cycle-021-selection-delete-command-kernel-boundary/proposals/proposal-direct.md`
- `architecture-audit/cycle-021-selection-delete-command-kernel-boundary/proposals/proposal-restructure.md`
- stage logs/reports under `.saivage/stages/cycle-021-fresh-scout-proposals-post-020/`

For the next corrective plan-edit stage, if this proposal is approved:

- `architecture-audit/wave-plan.md` only.

Do not modify production source/tests during Wave 021 implementation, because there is no remaining Wave 021 implementation target.

## Files/tests/docs/fixtures to DELETE

For this design-only stage: none.

For the follow-up plan-edit stage:

- Delete or rewrite stale Wave 021 plan text claiming `SelectionUseCases` still imports `Command`, `CommandStack`, `DeletionSequenceFactory`, and `World` and directly constructs/commits/pushes delete commands.
- Delete stale Wave 021 delete-list items already satisfied by current source rather than leaving them as future work.
- Delete any future-stage wording that would preserve a no-op Wave 021 implementation gate after the review accepts this evidence.

No production files, tests, fixtures, docs/specs, package files, or validation scripts should be deleted for Wave 021 itself.

## Expected behavior change

None. This is a design/plan correction only.

Current behavior to preserve:

- Empty selection remains a no-op (`frontend/src/application/appShell/SelectionUseCases.ts:30-33`; `frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts:30-31`).
- Delete/Backspace routes through keyboard shortcut handling and selection use cases (`frontend/src/application/appShell/KeyboardShortcutRouter.ts:40-54`).
- Selected and cascade-dependent elements are deleted through `SelectionDeletionCommandService` / `DeletionSequenceFactory` and undo/redo remains command-stack based (`frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts:33-37`; `frontend/tests/unit/application/selectionDeletion/SelectionDeletionCommandService.test.ts:66-95`).
- Cascade preview remains selection-store UI state backed by a narrow read port (`frontend/src/application/appShell/SelectionUseCases.ts:48-55`; `frontend/src/stores/selectionStore.ts:96-107`).

## No-backcompat / aggressive-deletion rationale

The no-backcompat priority applies to stale architecture artifacts too. Keeping a Wave 021 implementation step whose delete list is already absent would create process debt and invite artificial wrappers or a new command-kernel facade. The correct deletion is to remove stale plan claims in a reviewed plan edit, not to preserve both stale and current interpretations.

## Boundary preservation

This proposal preserves Wave 020 boundaries:

- no changes to `AppShellProductionRuntime.ts`, browser composition, Drive/auth, localStorage, app-shell production wiring, or project-session persistence;
- no hidden browser defaults introduced into `createAppShellRuntime()`;
- keyboard installation remains through injected `ports.keyboardTarget` (`frontend/src/application/appShell/AppShellRuntime.ts:91-94`).

It also preserves protected 3D overlay behavior:

- no changes to `ThreeView.vue`, OrbitControls, scene-host, overlay CSS, or canvas drag behavior;
- any later source implementation must keep the current e2e overlay assertion (`frontend/tests/e2e/current-ui-contract.spec.ts:89-117`).

## Validation plan

For this design-only stage:

- No lint/build/test/e2e/preview execution is required or appropriate because no production/test source is changed.
- Evidence is static/source inspection plus path-scoped git status/diff logs.

For the follow-up plan-edit stage:

- path-scoped diff of `architecture-audit/wave-plan.md`;
- review/critic of the plan edit;
- no application validation unless the plan edit itself changes implementation scope.

If any later reviewed source wave touches selection/delete/keyboard/runtime behavior, use the full validation cadence listed in `scope-check.md`.

## Risks

- The worktree has relevant dirty changes in `frontend/src/commands/Command.ts` and `frontend/src/commands/factories/DeletionSequenceFactory.ts`. This proposal treats them as protected context and does not stage or depend on them.
- The current `wave-plan.md` contains future-looking entries that mention Wave 021 as completed. The plan-edit stage must reconcile current authoritative plan order carefully rather than mining stale cycle history.
- Review may prefer to use this cycle to immediately scout the next command-producer boundary. That should happen only after a reviewed plan edit/re-rank, not by silently broadening Wave 021.

## Stop conditions

Stop and write a plan-edit recommendation, not source code, if reviewers ask this proposal to:

- migrate canvas/tool, construction, process-history, panel/toolbar, or initialization command producers;
- redesign command descriptors, operation registry, replay, persistence schema, or `ProjectService`;
- touch app-shell browser composition, Drive/auth, rendering/Three/canvas, backend/docs/specs, package/tooling, validation-platform work, UI features, or protected dirty files;
- create a generic application command-kernel facade in the name of finishing Wave 021.
