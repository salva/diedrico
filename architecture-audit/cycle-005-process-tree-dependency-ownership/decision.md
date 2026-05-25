# Wave 005 Decision — Process-tree/dependency ownership

**Cycle:** `cycle-005-process-tree-dependency-ownership`  
**Decision stage:** `cycle-005-decision`  
**Source-code changes in this stage:** none.  
**Review convergence:** complete after round 02.  
**Selected implementation proposal:** `proposals/proposal-direct.md`.  
**Rejected/deferred alternative:** `proposals/proposal-restructure.md`.

## Artifacts considered

This decision is based on the full Wave 005 convergence set:

- `scope-check.md` — confirmed Wave 005 remains valid after Waves 001–004 and does not require a `wave-plan.md` edit.
- `proposals/proposal-direct.md` — corrected direct implementation proposal to delete deprecated process/dependency compatibility APIs while preserving the existing command/operation boundary.
- `proposals/proposal-restructure.md` — corrected higher-level alternative that records `ActionsPanel.vue` use-case extraction as future Wave 006 material, not the recommended Wave 005 path.
- `corrections-round-01.md` — documents all proposal edits made in response to round-01 blockers.
- `reviews/round-01-review.md` — raised four blocking issues: dependency-service shim deletion needed to move into Proposal Direct, broad `ActionsPanel` use-case extraction needed to be deferred, Proposal Restructure needed to be clearly marked too broad/rejected for this wave, and validation needed to prove dependency-shim deletion.
- `reviews/round-02-review.md` — rechecked all four blockers and declared **NO BLOCKING ISSUES**.

## Review convergence result

Review convergence is complete for Wave 005.

Round 01 produced blocking issues, but `corrections-round-01.md` shows that the proposals were edited in place rather than merely acknowledged. Round 02 then marked every round-01 blocker **RESOLVED** and issued the verdict **NO BLOCKING ISSUES**. The round-02 recommendation is to proceed with Proposal Direct.

## Selected proposal

Wave 005 will implement **Proposal Direct: Delete deprecated process/dependency compatibility APIs, keep existing command boundary**.

Reasons:

1. It directly advances the Wave 005 target: `ProcessTree` owns construction history only, while dependency graph queries and registrations remain in `DependencyService`.
2. It follows the no-backcompat/aggressive-deletion priority by deleting deprecated compatibility surfaces rather than wrapping or aliasing them.
3. It keeps `AddProcessTreeActionGroupOp` and `AddProcessTreeActionOp` as the explicit operation-mediated insertion path, avoiding the old implicit group creation behavior.
4. It avoids over-broad UI refactoring and leaves the known `ActionsPanel.vue` command-construction leak for Wave 006, where it can be solved consistently with the rest of the UI/tool layer.
5. Round-02 review confirmed that the corrected validation plan is sufficient for implementation.

## Rejected/deferred alternative

`proposals/proposal-restructure.md` is rejected as the Wave 005 implementation baseline.

The restructure proposal correctly identifies that `ActionsPanel.vue` directly imports concrete process-tree operation classes and that a process-history/application use-case seam is likely the right long-term direction. However, that extraction is Wave 006 scope. Pulling it into Wave 005 would blend process/dependency ownership cleanup with a broader UI command-construction refactor, increasing blast radius and risking a one-panel seam that Wave 006 would need to replace.

The useful restructure insight is retained as Wave 006 input only. Wave 005 implementation must not create a new `frontend/src/application/processTree/*UseCases.ts` or equivalent process-history use-case/controller boundary unless a mini-cycle explicitly approves that scope change.

## Exact implementation scope

The implementation stage must make the following source/test changes and no broader UI architecture extraction:

### Domain/process tree

- In `frontend/src/domain/processTree/ProcessTree.ts`:
  - Delete `ProcessTree.addAction(action, groupName?)`.
  - Delete `ProcessTree.getActionsDependingOnElement(elementId)`.
  - Keep explicit construction-history APIs such as `addActionGroup()`, `addActionToGroup()`, action-group removal, action removal/restore, subprocess stack operations, traversal, `getActionsProducingElement()`, and presentation helpers.
  - Remove stale comments implying process-tree actions own dependency edges.

### World boundary

- In `frontend/src/domain/world/World.ts`:
  - Delete `World.addAction(action: any, groupName?: string): any`.
  - Preserve `getProcessTree()` and `getDependencyService()` as separate accessors.

### Dependency boundary

- In `frontend/src/domain/world/DependencyService.ts`:
  - Delete `DependencyService.rebuildDependencyMaps()`.
  - Delete `DependencyService.getActionDependencies()`.
  - Preserve real graph operations only: node registration/unregistration, direct and transitive dependency/dependent queries, cycle detection, invalidation tracing, and debug export if still used.

### Commands/operations

- Preserve explicit `AddProcessTreeActionGroupOp` semantics for action-group creation.
- Preserve explicit `AddProcessTreeActionOp` semantics for inserting an action into an existing group.
- Do not restore or introduce any fallback that creates missing action groups implicitly.
- Update operation descriptors/tests only as needed for compilation and validation; do not add persistence/backcompat branches for the deleted APIs.

### Tests

- Rewrite or delete tests in `frontend/tests/unit/processTree.spec.ts` that call `tree.addAction(...)`.
- Delete skipped compatibility tests for `getActionsDependingOnElement()`.
- Rewrite deprecated setup in `frontend/tests/unit/commands/factories/DeletionSequenceFactory.spec.ts` and `frontend/tests/unit/commands/removeElementOps.spec.ts` to use explicit group/action setup or operation-mediated setup.
- Remove all `rebuildDependencyMaps()` fixture shortcuts and replace any needed dependency assumptions with real `DependencyService.registerNode(...)` or world/projection-plane registration paths.
- Add or update focused dependency-service coverage if needed to prove `registerNode()`/`unregisterNode()`/`getDependents()` cover behavior formerly masked by the deleted no-op shims.

### UI/panels

- Do not extract broad process-history use-cases from `ActionsPanel.vue` in Wave 005.
- Do not remove `ActionsPanel.vue` direct operation imports as a Wave 005 requirement.
- `ActionsPanel.vue` may be touched only for narrow compile fallout from deleted APIs, misleading dependency comments, or narrow debug/noisy logging cleanup.
- Broad removal of direct operation imports from `ActionsPanel.vue`, and the broader process-history/use-case/controller seam, are explicitly deferred to Wave 006.

## Exact DELETE list

The implementation must delete the following surfaces and leave no compatibility aliases, stubs, wrappers, barrels, or fixture helpers preserving the removed names:

- `ProcessTree.addAction()`.
- `World.addAction()`.
- `ProcessTree.getActionsDependingOnElement()`.
- `DependencyService.rebuildDependencyMaps()`.
- `DependencyService.getActionDependencies()`.
- All active implicit action-group tests and setup paths that rely on `addAction()`.
- Skipped dependency-query tests for `getActionsDependingOnElement()`.
- All stale source/test call sites for `rebuildDependencyMaps()` and `getActionDependencies()`.
- Any fallback branch in process-tree operations that creates action groups implicitly if found during implementation.
- Stale comments or debug notes claiming dependency edges are derived from process-tree actions.
- Any compatibility alias/stub/wrapper/helper that preserves the deleted API names.

## Implementation constraints

- Preserve explicit `AddProcessTreeActionGroupOp` / `AddProcessTreeActionOp` semantics.
- Do not restore implicit action-group creation.
- Do not restore dependency scanning from process actions.
- Do not introduce a process-history use-case/controller module in Wave 005.
- Do not broaden the wave into `ActionsPanel.vue`, `SvgCanvas.vue`, toolbar/tool handlers, or other UI command-construction surfaces beyond narrow compile/comment/debug cleanup allowed above.
- If implementation discovers that a required fix needs broader UI command-construction extraction, stop and run a mini-cycle before proceeding.

## Mandatory validation requirements

Implementation must capture full stdout/stderr under `architecture-audit/cycle-005-process-tree-dependency-ownership/validation/`.

### Static deletion checks

Run static checks proving deleted names are absent from active source/tests, including:

- `rg -n "\.addAction\(|getActionsDependingOnElement|World\.addAction|ProcessTree\.addAction|rebuildDependencyMaps\(|getActionDependencies" frontend/src frontend/tests`
- `rg -n "addAction\(|getActionsDependingOnElement" frontend/src/domain/processTree/ProcessTree.ts frontend/src/domain/world/World.ts`
- `rg -n "rebuildDependencyMaps|getActionDependencies" frontend/src/domain/world/DependencyService.ts frontend/src frontend/tests`
- `rg -n "process-history use-case|processHistoryUseCases|application/processTree" frontend/src/components/panels/ActionsPanel.vue frontend/src/application frontend/tests || true`

Any remaining `addActionToGroup` or `AddProcessTreeActionOp` hits are allowed only after manual classification that they preserve explicit insertion semantics and not the deleted compatibility API.

### Focused tests

Run focused validation for at least:

- Process-tree insertion/group behavior: `npm run test --workspace=frontend -- tests/unit/processTree.spec.ts`.
- Subprocess stack behavior: `tests/integration/processTree-stack.test.ts` and `tests/unit/services/ProjectService.subprocess.spec.ts`.
- Process-tree initialization/action-group/operation behavior, including `tests/unit/commands/initializeWorldCommand.spec.ts` and operation/registry tests if present or touched.
- Dependency/deletion behavior without rebuild shims: `tests/unit/commands/factories/DeletionSequenceFactory.spec.ts`, `tests/unit/commands/removeElementOps.spec.ts`, and `tests/integration/projectService.cascadeDeletion.spec.ts`.
- DependencyService graph behavior via an existing focused spec or a narrow added/updated unit test proving real registration/query behavior.
- Undo/redo and persistence replay if descriptors or operation serialization/restoration are touched: `tests/unit/commands/commandStack.spec.ts`, `tests/unit/services/ProjectService.roundTrip.spec.ts`, and `tests/integration/projectService.determinism.spec.ts` when applicable.
- ActionsPanel focused component behavior if `ActionsPanel.vue` is touched.

### Full cadence

Run and log:

- `npm run lint` at root and `npm run lint --workspace=frontend` where defined.
- Focused Vitest commands above.
- Full Vitest: `npm run test` at root, plus backend tests if root does not cover backend.
- Builds: `npm run build`, `npm run build --workspace=frontend`, and `npm run build --workspace=backend` where defined.
- Playwright/e2e: `npm run test:e2e --workspace=frontend`, because process-tree and UI-adjacent behavior are user-facing. If e2e is blocked by existing malformed specs/tooling debt, record exact log evidence and classification in `implementation-log.md`.
- Live preview refresh bound to `0.0.0.0` and a reachability probe, recorded in `implementation-log.md`.

## Accepted residual risks

The following risks are accepted and must be tracked during implementation, but they do not block proceeding:

- Test rewrites could weaken coverage if deleted shortcuts are replaced with poor fixtures rather than explicit public APIs.
- Deletion/factory tests may reveal hidden reliance on rebuild semantics; implementation must repair real dependency registration paths instead of restoring compatibility shims.
- `ActionsPanel.vue` remains a known cross-layer leak after Wave 005; this is intentional and deferred to Wave 006.
- Existing repository-wide validation debt may still affect lint/build/e2e outcomes; implementation must classify failures precisely as attributable or non-attributable.

## Next implementation scope

Proceed to `cycle-005-implement-process-tree-dependency-ownership` with Proposal Direct only. The implementation should delete the listed compatibility APIs, update affected tests to explicit process-tree/dependency APIs, run the mandatory validation cadence, refresh the live preview, and record results in `architecture-audit/cycle-005-process-tree-dependency-ownership/implementation-log.md`.
