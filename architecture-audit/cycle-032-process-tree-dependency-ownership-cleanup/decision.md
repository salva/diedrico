# Cycle 032 Decision — Process-tree/dependency ownership cleanup

## Decision status

Cycle 032 review convergence is complete. `architecture-audit/cycle-032-process-tree-dependency-ownership-cleanup/reviews/round-02-review.md` reports **no blocking issues remain** and explicitly recommends proceeding to this decision stage with `proposal-direct.md` preferred.

The round-01 blocker about dirty `frontend/src/stores/processStore.ts` attribution is resolved. `round-02-review.md` confirms that the corrections added a coherent delete-or-stop rule for the pre-existing dirty store in `scope-check.md`, `proposal-direct.md`, and `proposal-restructure.md`. The implementation stage must preserve that rule exactly.

This decision performs no source implementation, validation, preview refresh, package/tooling churn, or unrelated dirty-file normalization.

## Inspected current state

Before writing this decision, the stage inspected the current path-scoped source-control state and reviewed Cycle 032 artifacts.

Path-scoped status captured in `.saivage/stages/cycle-032-decision-process-tree-dependency-ownership-cleanup/scoped-status.log`:

```text
 M frontend/src/domain/processTree/ActionGroup.ts
 M frontend/src/stores/processStore.ts
 D frontend/tests/e2e/active-plane-shortcuts.spec.ts
 D frontend/tests/e2e/selection-mask.spec.ts
?? architecture-audit/cycle-032-process-tree-dependency-ownership-cleanup/reviews/
```

Path-scoped diff stat captured in `.saivage/stages/cycle-032-decision-process-tree-dependency-ownership-cleanup/scoped-diff-stat.log`:

```text
 frontend/src/domain/processTree/ActionGroup.ts    | 22 ++++++-------------
 frontend/src/stores/processStore.ts               | 20 ++++++++---------
 frontend/tests/e2e/active-plane-shortcuts.spec.ts | 26 -----------------------
 frontend/tests/e2e/selection-mask.spec.ts         | 25 ----------------------
 4 files changed, 16 insertions(+), 77 deletions(-)
```

Reviewed artifacts:

- `scope-check.md`
- `proposals/proposal-direct.md`
- `proposals/proposal-restructure.md`
- `reviews/critic-round-01.md`
- `reviews/round-01-review.md`
- `reviews/critic-corrections-round-01.md`
- `reviews/round-02-review.md`
- `architecture-audit/wave-plan.md` Wave 005 entry

## Selected implementation path

Selected path: **`proposals/proposal-direct.md`**.

Rationale:

1. It matches the current code reality. The originally named deprecated `ProcessTree.addAction()` and `ProcessTree.getActionsDependingOnElement()` targets are already absent from active `ProcessTree.ts`; Cycle 032 must not chase them as phantom delete targets.
2. It advances Wave 005 by cleaning the remaining concrete ownership seams: unused parallel process store, unimplemented process-tree operation placeholders, stale process-operation documentation, and process/dependency comments.
3. It best respects the project priority order: deletion of dead/parallel surfaces over shims or compatibility branches, while avoiding unnecessary app-shell or panel-controller broadening.
4. `round-02-review.md` scores the direct proposal as sufficient, bounded, and preferred after resolving the dirty-file blocker.

Rejected default path: **`proposals/proposal-restructure.md`**.

Rejection rationale: the restructure path is a valid fallback/stop path if implementation proves the direct cleanup cannot maintain the ownership boundary, but it is broader than necessary now. It risks pulling `ProcessTreeReadModel`/`World` read-port work and app-shell wiring into Cycle 032 when the reviewed direct path can remove dead surfaces without changing user-observable behavior. Do not implement the restructure path unless a stop condition below fires and a reviewed delta/plan correction selects it.

## Bound implementation scope

The next implementation stage must implement only the selected direct path.

### Required source/update targets

Implementation may change only what is necessary for the following targets:

1. **ProcessTree construction-history ownership**
   - Keep `frontend/src/domain/processTree/ProcessTree.ts` as construction-history/tree/stack ownership only.
   - Do not add dependency-service imports or dependency-query APIs to `ProcessTree`.
   - If `ProcessTree.ts` is touched for nearby cleanup, delete routine debug logging from domain mutation methods when safe.
   - Prove the absence of `ProcessTree.addAction()` and `ProcessTree.getActionsDependingOnElement()` with static scans/tests; do not recreate or chase those already-absent APIs.

2. **Process action/dependency comments**
   - Normalize `frontend/src/domain/processTree/Action.ts` and action-creator comments away from phase-era/private-service wording.
   - Preserve the contract that process actions store action metadata, while dependency relations are queried through the dependency boundary.

3. **Unused legacy process store**
   - Delete `frontend/src/stores/processStore.ts` only after a fresh implementation-stage usage scan confirms no active imports/usages beyond its own export.
   - Treat this as deletion of the whole unused legacy parallel process-history store, not preservation or merging of its pre-existing local edits.
   - If active usage, dynamic registration evidence, or authorship uncertainty appears, stop for reviewed narrowing instead of editing the store in place.

4. **Unimplemented process-tree operation placeholders**
   - Delete `RemoveActionGroupFromProcessTreeOp` and `RemoveSubprocessFromProcessTreeOp` from `frontend/src/commands/operations/processTree/ProcessTreeOperations.ts`.
   - Delete their descriptor registrations/imports from `frontend/src/commands/operations/processTree/registerProcessTreeOperationDescriptors.ts`.
   - Update `frontend/src/commands/operations/processTree/index.ts` only as needed for removed exports.
   - Keep `RemoveActionFromProcessTreeOp` if active deletion flows still use it.

5. **Process operation README/doc cleanup**
   - Update or delete `frontend/src/commands/operations/processTree/README.md` so it no longer advertises the removed unimplemented operation placeholders.
   - If the README becomes stale/noisy placeholder documentation after removing those entries, delete it rather than preserving obsolete documentation.

6. **Tests tied to removed dead descriptors/surfaces**
   - Delete or update tests that assert serialization/registration support for the removed unimplemented process-tree operation descriptors.
   - Retain and update active process-tree, process-history, undo/redo, panel, and ProjectService round-trip coverage for remaining active operations.

### Coupling limits

- `frontend/src/components/panels/ActionsPanel.vue` is already at the desired component boundary: it consumes injected read/intent ports. Do not redesign it. Touch it only for small import/type fallout directly caused by the selected cleanup.
- Application-layer `ProcessHistoryUseCases` may continue to construct concrete process-tree operations for this wave. Broad panel command-controller work belongs to later Wave 006b scope.
- `ProcessTreeReadModel` may continue joining process history with dependency data outside `ProcessTree` for this direct path. A narrow read-port split is not selected in this decision.

## Explicit delete/update list

Implementation must delete/update these surfaces if the preconditions above remain true:

- Delete `frontend/src/stores/processStore.ts` after fresh no-usage confirmation, with explicit pre-dirty deletion attribution.
- Delete `RemoveActionGroupFromProcessTreeOp` and `RemoveSubprocessFromProcessTreeOp` classes.
- Delete their descriptor registrations/imports.
- Delete their exports if present.
- Delete/update ProjectService round-trip tests that cover only those removed unimplemented descriptors.
- Delete/update README bullets for those removed operations, or delete the README if it becomes obsolete.
- Delete any discovered tests that assert deprecated implicit process-tree `addAction()` behavior, if any still exist.

Non-delete clarification: `ProcessTree.addAction()` and `ProcessTree.getActionsDependingOnElement()` are already absent and are not implementation delete targets.

## Source-control hygiene and attribution

The implementation stage must capture a fresh scoped baseline before modifying source files.

### `frontend/src/stores/processStore.ts`

This file is currently dirty before implementation. The implementation may delete it only as a deliberate Cycle 032-owned whole-file deletion of an unused legacy process store. The implementation log must state:

- the file was pre-dirty before Cycle 032 implementation;
- a fresh usage scan showed no active imports/usages;
- Cycle 032 intentionally deleted the whole legacy surface;
- pre-existing local edits inside that file were superseded by deletion, not silently merged, normalized, or adopted.

If those statements cannot be made truthfully, stop for a reviewed delta or narrow the scope by removing the file from the delete list.

### `frontend/src/domain/processTree/ActionGroup.ts`

This file is also pre-existing dirty context. Implementation must not silently adopt, revert, normalize, or depend on unrelated edits in it. If implementation needs to touch it, the implementation log must explain exactly which changes are Cycle 032-owned and why they are required by the selected proposal. Otherwise leave it untouched.

### Pre-existing deleted e2e specs

The deleted `frontend/tests/e2e/active-plane-shortcuts.spec.ts` and `frontend/tests/e2e/selection-mask.spec.ts` are unrelated pre-existing dirt. Cycle 032 implementation must not adopt, restore, normalize, or rely on those deletions unless a reviewed delta explicitly brings them into scope.

### Review artifacts directory

The untracked `architecture-audit/cycle-032-process-tree-dependency-ownership-cleanup/reviews/` directory contains review-convergence evidence for this cycle and is part of audit history, not source implementation.

## Protected surfaces / forbidden broadening

Cycle 032 implementation must not broaden into:

- Wave 006b panel command-controller implementation;
- ProjectService schema/replay semantics, migrations, corrupted-operation compatibility, domain snapshot persistence, or concrete operation imports;
- command descriptor framework redesign beyond deleting the dead process-tree registrations;
- rendering, CSS, canvas, 3D behavior, 3D overlay behavior, or preview UI features;
- Drive/auth internals or protected config/secret reads;
- backend, docs/specs outside the named process-operation README, package/tooling, or validation-platform work;
- app-shell production composition redesign or generalized selector/read-port framework;
- UI feature changes;
- stale audit-history mining;
- unrelated dirty-file normalization.

Secret/config safety remains binding: do not read or cite `.saivage/auth-profiles.json`, `.saivage/saivage.json`, env files, provider configs, OAuth/Drive credentials, shell history, or keychain material.

## Preservation requirements

Implementation must preserve:

- current user-visible Actions panel push/pop/toggle/rename behavior;
- related-action highlighting behavior;
- undo/redo behavior for active process-tree operations;
- current-schema project save/open replay for active process operations;
- OperationRegistry descriptor boundary established by prior waves;
- no ProjectService concrete operation imports;
- current 2D/3D rendering and 3D overlay behavior;
- live preview reachability after validation/refresh.

Persisted command streams containing the deleted unimplemented operation types may fail as unknown current-schema operations. That is acceptable under the no-backcompat priority because those descriptors represented inactive/failure placeholders, not supported behavior.

## Validation requirements for implementation

Implementation must capture full stdout/stderr logs under:

`architecture-audit/cycle-032-process-tree-dependency-ownership-cleanup/validation/`

Required validation set:

1. **Static scans**
   - prove no active `ProcessTree.addAction(`;
   - prove no active `getActionsDependingOnElement`;
   - prove no active `useProcessStore`/`processStore.ts` imports before deletion and no remaining references after deletion;
   - prove no active `RemoveActionGroupFromProcessTree` or `RemoveSubprocessFromProcessTree` references after deletion.

2. **Focused tests**
   - process tree unit tests;
   - process-tree stack integration tests;
   - process-history/panel toolbar intent controller tests;
   - panel toolbar/component behavior tests;
   - ProjectService round-trip/operation registry tests for remaining active operations;
   - any deletion/selection dependency tests touched by the cleanup.

3. **Mandatory suite commands**
   - root lint where defined;
   - frontend/workspace lint where defined;
   - focused Vitest commands above;
   - full root Vitest where defined;
   - full frontend/workspace Vitest where defined;
   - root build where defined;
   - frontend/workspace build where defined.

4. **User-observable validation**
   - Playwright e2e because process panel, undo/redo, persistence, and panel behavior are user-observable;
   - live application exercise through Playwright MCP if frontend/user behavior is touched;
   - live preview refresh bound on `0.0.0.0`, with a reachability probe recorded in `implementation-log.md`;
   - smoke verification that the construction history panel and 3D overlay still render.

Any skipped command must be explicitly justified in `implementation-log.md`. The wave must be rejected if validation fails for reasons attributable to the implementation.

## Stop conditions

Stop and request a reviewed delta proposal or wave-plan correction if implementation requires any of the following:

- preserving, rewriting, or migrating `processStore.ts` instead of deleting the whole unused store;
- any active usage of `processStore.ts` that cannot be cleanly removed within the direct proposal;
- adoption/reversion/normalization of unrelated dirty `ActionGroup.ts` or e2e deletions;
- broad ActionsPanel, toolbar, or command-controller redesign;
- ProjectService migration/backcompat/schema/replay redesign;
- operation descriptor framework redesign beyond deleting dead process registrations;
- moving or redesigning `DependencyService`;
- generalized process-history read-port/app-shell/RuntimeSession restructuring;
- rendering/CSS/canvas/3D changes;
- Drive/auth/backend/package/tooling/config work;
- source-control uncertainty that prevents clean attribution of Cycle 032 changes.

## Residual risks accepted for implementation

- Static scans may miss unusual dynamic imports of the legacy store; build/tests/e2e and implementation-stage grep must mitigate this before deletion.
- Removing dead descriptor registrations changes behavior for files containing those operation type names; this is accepted as no-backcompat deletion of unsupported placeholder behavior.
- `ActionGroup.ts` and `processStore.ts` are pre-dirty and require careful attribution in the implementation log.
- The direct path intentionally leaves `ProcessTreeReadModel` coupled to `World`; a future wave may narrow that read boundary if it remains architecturally important.

## Next-stage recommendation

Proceed to the unique implementation stage:

`cycle-032-implement-process-tree-dependency-ownership-cleanup`

Recommended objective: implement the selected `proposal-direct.md` exactly as bound by this decision, then produce `implementation-log.md` and validation logs under `architecture-audit/cycle-032-process-tree-dependency-ownership-cleanup/`.
