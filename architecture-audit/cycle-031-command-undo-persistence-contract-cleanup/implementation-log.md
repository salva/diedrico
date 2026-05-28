# Cycle 031 Implementation Log — Command/undo persistence contract cleanup

## Scope followed

Implemented the decision-selected direct path from `decision.md` / `proposals/proposal-direct.md`: current-schema command-stream persistence was retained, ProjectService remains the envelope/replay orchestrator, and descriptor restoration/validation remains owned by OperationRegistry and registration modules.

No schema migration, compatibility path, domain snapshot persistence, monolithic ProjectService reconstruction switch, rendering/CSS/canvas/3D behavior change, Drive/auth/backend/docs/spec/package-tooling change, or app-shell composition redesign was introduced.

## Source-control baseline and attribution

Pre-edit evidence was captured before source edits:

- `validation/pre-edit-status.txt`
- `validation/pre-edit-diffstat.txt`
- `validation/pre-edit-forbidden-scan.txt`

Pre-existing dirty context present before this implementation and not silently normalized:

- `architecture-audit/cycle-031-command-undo-persistence-contract-cleanup/decision.md` was already modified.
- `frontend/src/commands/Command.ts` was already modified.
- `frontend/src/commands/factories/DeletionSequenceFactory.ts` was already modified.
- `frontend/src/commands/factories/PointSequenceFactory.ts` was already modified.
- `frontend/src/commands/operations/IOperation.ts` was already modified; this implementation additionally touched it for the typed output alias.
- Several intersection/free-point operation files were already modified; this implementation additionally touched persisted operation implementations as part of the selected scope.
- `frontend/tests/e2e/active-plane-shortcuts.spec.ts` and `frontend/tests/e2e/selection-mask.spec.ts` were already deleted before implementation and were not staged or adopted as Cycle 031 changes.
- Untracked `reviews/` artifacts were already present and were not staged by this implementation.

Post-edit evidence:

- `validation/post-edit-status.txt`
- `validation/post-edit-diffstat.txt`

## Source files changed by Cycle 031 implementation

Core contracts / registry / service:

- `frontend/src/commands/operations/IOperation.ts`
- `frontend/src/commands/operations/OperationRegistry.ts`
- `frontend/src/services/ProjectService.ts`

Process-tree operation contract cleanup:

- `frontend/src/commands/operations/processTree/AddProcessTreeActionGroupOp.ts`
- `frontend/src/commands/operations/processTree/AddProcessTreeActionOp.ts`
- `frontend/src/commands/operations/processTree/PopSubprocessOp.ts`
- `frontend/src/commands/operations/processTree/ProcessTreeOperations.ts`
- `frontend/src/commands/operations/processTree/PushSubprocessOp.ts`
- `frontend/src/commands/operations/processTree/RenameSubprocessOp.ts`
- `frontend/src/commands/operations/processTree/ToggleEncapsulationOp.ts`
- `frontend/src/commands/operations/processTree/ToggleOutputOp.ts`
- `frontend/src/commands/operations/processTree/registerProcessTreeOperationDescriptors.ts`

World operation contract cleanup:

- `frontend/src/commands/operations/world/Add3DLineOp.ts`
- `frontend/src/commands/operations/world/Add3DPlaneOp.ts`
- `frontend/src/commands/operations/world/Add3DPointOp.ts`
- `frontend/src/commands/operations/world/Add3DSegmentOp.ts`
- `frontend/src/commands/operations/world/AddAuxiliaryProjectionPlaneOp.ts`
- `frontend/src/commands/operations/world/AddBrokenHingeLineOp.ts`
- `frontend/src/commands/operations/world/AddCircleCircleIntersectionPoint2DOp.ts`
- `frontend/src/commands/operations/world/AddCircleOp.ts`
- `frontend/src/commands/operations/world/AddFreePointOp.ts`
- `frontend/src/commands/operations/world/AddIntersectionPointOp.ts`
- `frontend/src/commands/operations/world/AddLineCircleIntersectionPoint2DOp.ts`
- `frontend/src/commands/operations/world/AddLineLineIntersectionPoint2DOp.ts`
- `frontend/src/commands/operations/world/AddLineOp.ts`
- `frontend/src/commands/operations/world/AddSegmentOp.ts`
- `frontend/src/commands/operations/world/AddSiblingIntersectionPoint2DOp.ts`
- `frontend/src/commands/operations/world/InitializationOps.ts`
- `frontend/src/commands/operations/world/RemoveElementOps.ts`
- `frontend/src/commands/operations/world/UpdateElementStyleOp.ts`
- `frontend/src/commands/operations/world/UpdateFreePoint2DPositionOp.ts`

Focused tests:

- `frontend/tests/unit/services/ProjectService.roundTrip.spec.ts`
- `frontend/tests/unit/services/ProjectService.subprocess.spec.ts`

## Contract changes and delete/proof evidence

Implemented:

- Added `OperationOutputBag` as a named operation-output contract instead of repeating broad `outputs: Record<string, any>` in converted persisted operations.
- Removed converted operation `parameters: Record<string, any>` bags and constructor-time parameter mirrors from active persisted operation classes under selected world/process-tree operation scope.
- Updated operation serializers to read constructor-owned fields and typed outputs directly.
- Replaced the process-tree restore seam `obj(d, 'action') as unknown as Action` with an explicit current-schema action descriptor validator/rehydrator for `{ elementId, description, isOutput }`.
- Added registry-owned `assertRestorableOperationDescriptor(...)` so ProjectService can validate operation descriptors through the registry boundary before replay without importing concrete operation classes.
- Updated ProjectService validation to reject malformed current-schema operation descriptors at the registry/descriptor boundary while preserving strict schema-version rejection and command-stream replay semantics.
- Updated ProjectService round-trip/subprocess tests to assert serialized operation descriptors rather than deleted `operation.parameters` internals.

Delete/proof status:

- Converted persisted operation source no longer contains `parameters: Record<string, any>` or `outputs: Record<string, any>`.
- The process-tree `obj(d, 'action') as unknown as Action` cast is removed.
- ProjectService contains no concrete operation imports, migration helpers, compatibility helpers, or reconstruction switch.
- Remaining `parameters: Record<string, any>` / `outputs: Record<string, any>` matches in `validation/static-scans-final.txt` are test-local fake operations in command/commandStack tests, not persisted operation classes and not ProjectService persistence seams.
- Phantom ProjectService migration/switch delete targets remain absent and were not reintroduced.
- The pre-existing deleted e2e specs were not normalized or staged.

## Validation log index

All validation logs are under `architecture-audit/cycle-031-command-undo-persistence-contract-cleanup/validation/`.

Baseline / scans:

- `pre-edit-status.txt`
- `pre-edit-diffstat.txt`
- `pre-edit-forbidden-scan.txt`
- `static-scans-final.txt`
- `post-edit-status.txt`
- `post-edit-diffstat.txt`

Focused tests:

- Initial failing focused run while tests still asserted deleted parameter bags: `focused-vitest.out`, `focused-vitest.err`
- Rerun after test updates with one copied expectation failure: `focused-vitest-rerun.out`, `focused-vitest-rerun.err`
- Final focused green run: `focused-vitest-final.out`, `focused-vitest-final.err` — 6 files, 82 tests passed.

Build/typecheck iterations:

- `build-after-mechanical-cleanup.out/.err` — expected intermediate type failures after mechanical cleanup.
- `build-after-output-alias.out/.err` — expected intermediate type failures while replacing remaining parameter references.
- `build-after-parameter-ref-cleanup.out/.err` — expected intermediate type failures until explicit action descriptor serialization was added.
- `build-after-action-descriptor.out/.err` — green frontend build.

Mandatory cadence:

- Root lint: `root-lint.out`, `root-lint.err` — green.
- Frontend lint: `frontend-lint.out`, `frontend-lint.err` — green.
- Root Vitest: `root-vitest.out`, `root-vitest.err` — green.
- Frontend Vitest: `frontend-vitest.out`, `frontend-vitest.err` — green.
- Root build: `root-build.out`, `root-build.err` — green.
- Frontend build: `frontend-build.out`, `frontend-build.err` — green.
- Root e2e / Playwright: `root-e2e.out`, `root-e2e.err` — green, 10 tests passed.
- Frontend e2e / Playwright: `frontend-e2e.out`, `frontend-e2e.err` — green, 10 tests passed.
- Wrapper: `mandatory-validation-wrapper.out`, `mandatory-validation-wrapper.err` — green.

Preview / live evidence:

- Initial preview refresh scripts: `live-preview-refresh.out/.err`, `live-preview-refresh-rerun.out/.err` recorded process-script issues only; the second attempt started the server but the wrapper timed out because the background process kept the shell alive.
- Final server log: `live-preview-final.out`, `live-preview-final.err` — Vite ready with `--host 0.0.0.0`.
- Port/process evidence: `live-preview-port-state.out`, `live-preview-port-state.err` — listener on `0.0.0.0:5173`.
- Final reachability: `live-preview-probe-final.out`, `live-preview-probe-final.html`, `live-preview-probe-final.err` — reachable at `http://127.0.0.1:5173/` with server bound to `0.0.0.0`.

## Behavior / preservation evidence

- Current-schema command-stream persistence was preserved; no domain snapshot persistence was introduced.
- ProjectService still rejects unsupported schema versions and replays operation descriptors into a fresh World before restoring committed command history.
- Command/undo public APIs remain the persistence surface: `CommandSnapshot`, `Command.restore(...)`, `Command.toSnapshot()`, `CommandStack.getCommittedCommands()`, and `CommandStack.restoreCommittedCommands(...)` remain intact.
- OperationRegistry remains the descriptor restore/serialize owner and still rejects unknown and duplicate operation registrations, covered by focused registry tests.
- Round-trip/determinism/subprocess tests validate descriptor persistence and command replay behavior after the cleanup.
- E2e tests validate current UI contract, keyboard shortcuts, app shell chooser, selection behavior, active-plane/status behavior, and 3D overlay pointer preservation.

## Protected-surface checks

- No protected config/secret files were read.
- No backend/docs/specs/package-tooling files were modified.
- No Drive/auth internals were modified.
- No rendering/CSS/canvas/3D implementation files were modified.
- No app-shell production composition redesign was performed.
- No stale cycle artifacts were mined beyond the Cycle 031 decision/proposal/review inputs.

## Residual risks / notes

- `OperationRegistry.register(...)` still contains one validation-boundary cast when storing generic restorers in a `Map<string, OperationRestorer>`. The cast is isolated inside the registry boundary; ProjectService and callers do not receive broad `any` or concrete operation imports.
- Test-local fake operations still use broad parameter/output bags in command/commandStack tests. They are non-persistence fakes and remain outside the converted persisted operation scope.
- The preview refresh had two wrapper-script hiccups before final success; final Vite process and reachability evidence are green.
- The pre-existing deleted e2e specs remain dirty and unstaged; validation succeeded against the current test set without needing to normalize them.

## Next-wave candidates

- Introduce operation-family-specific descriptor type aliases to replace remaining generic `OperationDescriptor` annotations where useful.
- Replace isolated registry storage cast with a typed descriptor/restorer registry table if a later wave chooses to split descriptor contracts by operation family.
- Clean non-persistence test fake operation contracts separately if broad `Record<string, any>` test fixtures become confusing.
