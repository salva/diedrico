# Cycle 032 Implementation Log — Process-tree/dependency ownership cleanup

## Decision/proposal conformance

Implemented the decision-selected direct path from `decision.md` and `proposals/proposal-direct.md` only. No proposal-restructure work, Wave 006b panel-controller work, ProjectService schema/replay changes, command descriptor framework redesign beyond dead process-tree registration deletion, rendering/CSS/canvas/3D behavior changes, Drive/auth/backend/package tooling work, app-shell redesign, or protected config/secret reads were performed.

## Source-control attribution

Pre-implementation evidence was captured in `validation/00-pre-status-diffstat.log` and `validation/01-pre-static-scans.log`.

Pre-existing dirty/unrelated state before Cycle 032 implementation:

- `frontend/src/domain/processTree/ActionGroup.ts` was already dirty before implementation. Cycle 032 did not edit or stage this file; the existing diff remains unrelated pre-dirty context.
- `frontend/src/stores/processStore.ts` was already dirty before implementation. Fresh scan showed the only `useProcessStore`/`processStore` match was its own export at `frontend/src/stores/processStore.ts:14`. Cycle 032 intentionally deleted the whole unused legacy parallel process store; pre-existing local edits inside that file were superseded by whole-file deletion, not merged, normalized, or adopted.
- `frontend/tests/e2e/active-plane-shortcuts.spec.ts` and `frontend/tests/e2e/selection-mask.spec.ts` were already deleted before implementation. Cycle 032 did not adopt, restore, stage, normalize, or rely on those deletions.
- `architecture-audit/cycle-032-process-tree-dependency-ownership-cleanup/reviews/` was already untracked review-convergence evidence and was not part of this implementation change.

## Files changed by Cycle 032

Source/test/doc changes owned by this implementation:

- `frontend/src/domain/processTree/Action.ts`: replaced phase-era/private-service action comments with current contract language: actions store metadata/output flag, dependency relations are queried through the dependency boundary.
- `frontend/src/domain/processTree/ProcessTree.ts`: removed routine debug `console.log`/`console.error` calls from toggle mutation methods and normalized nearby phase-era comments; no dependency-service imports or dependency-query APIs were added.
- `frontend/src/stores/processStore.ts`: deleted the pre-dirty unused legacy Pinia process store after fresh no-usage scan.
- `frontend/src/commands/operations/processTree/ProcessTreeOperations.ts`: deleted `RemoveActionGroupFromProcessTreeOp` and `RemoveSubprocessFromProcessTreeOp`; kept active `RemoveActionFromProcessTreeOp`.
- `frontend/src/commands/operations/processTree/registerProcessTreeOperationDescriptors.ts`: removed descriptor imports/registrations for `RemoveActionGroupFromProcessTree` and `RemoveSubprocessFromProcessTree`; retained active process-tree descriptors.
- `frontend/src/commands/operations/processTree/README.md`: removed stale placeholder operation bullets and clarified ProcessTree operations mutate construction history only while dependencies are queried through the dependency boundary.
- `frontend/tests/unit/services/ProjectService.roundTrip.spec.ts`: removed round-trip assertions/imports for the deleted unimplemented descriptors while retaining `RemoveActionFromProcessTree` coverage and other active operation coverage.

## Deletes and proof evidence

Deleted surfaces:

- `frontend/src/stores/processStore.ts`
- `RemoveActionGroupFromProcessTreeOp` class
- `RemoveSubprocessFromProcessTreeOp` class
- Descriptor registrations for `RemoveActionGroupFromProcessTree` and `RemoveSubprocessFromProcessTree`
- README/test references that advertised or asserted those unimplemented descriptors

Static scan evidence:

- `validation/01-pre-static-scans.log`: before deletion, no `ProcessTree.addAction(`, no `getActionsDependingOnElement`, only `processStore.ts` self-export for `useProcessStore`, and removed operation names limited to targeted files.
- `validation/03-post-static-scans.log`: after deletion, no active `ProcessTree.addAction(`, no `getActionsDependingOnElement`, no `useProcessStore`/`processStore` references, no `RemoveActionGroupFromProcessTree`/`RemoveSubprocessFromProcessTree` references.
- `validation/91-protected-surface-scans.log`: no ProjectService direct process-operation imports or diff, and no active references to removed operation names.

## Validation log index

Logs are under `architecture-audit/cycle-032-process-tree-dependency-ownership-cleanup/validation/`.

- `00-pre-status-diffstat.log`: captured scoped pre-change status/diffstat.
- `01-pre-static-scans.log`: captured pre-change static scans and no-usage precondition for deleting `processStore.ts`.
- `02-edit-script.stdout` / `.stderr`: edit script execution log.
- `03-post-static-scans.log`: post-change static scans; passed.
- `10-focused-vitest.stdout` / `.stderr`: focused Vitest passed, 5 files / 56 tests.
- `20-root-lint.stdout` / `.stderr`: `npm run lint` passed.
- `21-frontend-lint.stdout` / `.stderr`: `npm run lint --workspace=frontend` passed.
- `30-root-vitest.stdout` / `.stderr`: `npm run test` failed in pre-existing/unrelated `tests/unit/commands/initializationOps.spec.ts` parameter-property assertions; failures do not reference touched Cycle 032 modules.
- `31-frontend-vitest.stdout` / `.stderr`: `npm run test --workspace=frontend` failed with the same five unrelated initialization operation parameter-property assertions.
- `40-root-build.stdout` / `.stderr`: `npm run build` passed; Vite emitted the existing large-chunk warning.
- `41-frontend-build.stdout` / `.stderr`: `npm run build --workspace=frontend` passed; same Vite large-chunk warning.
- `50-root-e2e.stdout` / `.stderr`: `npm run test:e2e` passed, 10/10 Playwright tests.
- `51-frontend-e2e.stdout` / `.stderr`: `npm run test:e2e --workspace=frontend` passed, 10/10 Playwright tests.
- `60-preview-refresh-probe.stdout` / `.stderr`: live preview refreshed with `npm run dev --workspace=frontend -- --host 0.0.0.0`; HTTP probe returned `HTTP/1.1 200 OK` and page HTML smoke was captured.
- `60-live-preview-server.stdout` / `.stderr`, `60-live-preview.pid`: live preview server evidence.
- `90-post-status-diffstat.log`: final scoped status/diffstat.
- `91-protected-surface-scans.log`: protected-surface scan evidence.

## Validation summary

Passed:

- Static scans for absent deprecated APIs/dead operation names/store references.
- Focused Vitest for process tree, stack, panel intent/controller behavior, component toolbar behavior, and ProjectService round-trip coverage.
- Root/frontend lint (architecture tests).
- Root/frontend builds.
- Root/frontend Playwright e2e.
- Live preview refresh and HTTP reachability on `0.0.0.0`-bound Vite server.

Failed / residual validation issue:

- Full root/frontend Vitest suites fail in `frontend/tests/unit/commands/initializationOps.spec.ts` because several initialization operation tests expect a `parameters` property that is `undefined` on the current operation classes. This failure appears unrelated to Cycle 032: touched modules are process-tree/domain comments/dead descriptors/store deletion, while failures are initialization operations (`CreateInitializationSubprocessOp`, `AddPlane3DFixedOp`, `AddProjectionPlaneFixedOp`, `AddOriginPoint2DOp`, `AddHalfHingeLine2DOp`). The failures were recorded and not fixed because changing initialization operation contracts is outside reviewed Cycle 032 scope.

## Preview/live evidence

The live preview was refreshed by starting:

```sh
npm run dev --workspace=frontend -- --host 0.0.0.0
```

Evidence in `validation/60-preview-refresh-probe.stdout` shows Vite reporting `Network: http://10.0.3.113:5173/` and the reachability probe returned `HTTP/1.1 200 OK` from `http://127.0.0.1:5173/`.

Playwright e2e covered current app shell, canvas, toolbar, status bar, plane selector, selection masks, 3D coordinate status, 3D overlay pointer behavior, keyboard shortcuts, delete/undo/redo/selection behavior, and project chooser startup.

## Protected-surface checks

- No changes to `frontend/src/services/ProjectService.ts`.
- No concrete process-tree operation imports added to ProjectService.
- No dependency-service import or dependency-query API added to `ProcessTree`.
- No `ActionsPanel.vue` redesign or edit.
- No rendering/CSS/canvas/3D source changes.
- No backend/docs/specs/package/tooling changes.
- No Drive/auth/protected config reads.

## Residual risks

- Full Vitest remains red due to unrelated initialization operation tests; this must be resolved in a separate reviewed scope before a fully green validation gate can be claimed.
- Persisted command streams containing deleted unimplemented descriptor names now fail as unknown operations; this is accepted by the Cycle 032 no-backcompat decision.
- `ActionGroup.ts` and two deleted e2e specs remain pre-existing workspace dirt outside this implementation.

## Next-wave candidates

- Resolve the unrelated initialization operation parameter/test contract mismatch in a dedicated validation/command-contract wave or correction.
- Consider a future read-port split for `ProcessTreeReadModel` if `World` coupling remains architecturally central after the cleanup.

## Corrective validation addendum — initialization operation contract

A narrow correction stage resolved the full Vitest blocker recorded above without changing the reviewed Cycle 032 process-tree/dependency cleanup.

### Root cause

`frontend/tests/unit/commands/initializationOps.spec.ts` still contained five obsolete assertions against `op.parameters` on initialization operation instances (`CreateInitializationSubprocessOp`, `AddPlane3DFixedOp`, `AddProjectionPlaneFixedOp`, `AddOriginPoint2DOp`, and `AddHalfHingeLine2DOp`). The active operation boundary no longer exposes a generic `parameters` property: `frontend/src/commands/operations/IOperation.ts` defines `type`, `apply`, `undo`, optional `serialize`, and `outputs`; initialization operation replay/persistence is represented by each operation's typed `serialize()` descriptor plus `registerWorldOperationDescriptors.ts`. The tests already covered apply/undo behavior and typed serialization descriptors, so the parameter-property checks were stale parallel-contract expectations.

### Correction and rationale

Changed only `frontend/tests/unit/commands/initializationOps.spec.ts` by deleting the five parameter-property-only tests. No initialization operation source, ProjectService replay/schema code, process-tree cleanup files, rendering/UI/backend/docs/specs/package tooling, Drive/auth internals, or protected configuration were touched.

This deliberately deletes obsolete test expectations rather than restoring a `parameters` shim because adding `parameters` back to these classes would introduce a second mutable descriptor surface beside the active `serialize()`/OperationRegistry contract, contrary to the current clean-architecture boundary and no-backcompat priority.

### Corrective validation evidence

All logs below are under `architecture-audit/cycle-032-process-tree-dependency-ownership-cleanup/validation/`:

- `correction-00-parameters-grep.stdout` / `.stderr`: confirmed `op.parameters` references were limited to the obsolete initializationOps assertions, view-state operations that intentionally expose parameters, and unrelated command test doubles.
- `correction-01-ioperation-grep.stdout` / `.stderr`: confirmed `IOperation` does not require or define a generic `parameters` property.
- `correction-02-edit-tests.stdout` / `.stderr`: test edit script completed.
- `correction-10-focused-initializationOps-vitest.stdout` / `.stderr`: `npm run test --workspace=frontend -- tests/unit/commands/initializationOps.spec.ts` passed, 15/15 tests.
- `correction-20-root-lint.stdout` / `.stderr`: root `npm run lint` passed, 11/11 architecture tests.
- `correction-21-frontend-lint.stdout` / `.stderr`: frontend `npm run lint --workspace=frontend` passed, 11/11 architecture tests.
- `correction-30-root-vitest.stdout` / `.stderr`: root `npm run test` passed.
- `correction-31-frontend-vitest.stdout` / `.stderr`: frontend `npm run test --workspace=frontend` passed.
- `correction-40-root-build.stdout` / `.stderr`: root `npm run build` passed; Vite emitted the existing large-chunk warning.
- `correction-41-frontend-build.stdout` / `.stderr`: frontend `npm run build --workspace=frontend` passed; same large-chunk warning.
- `correction-90-static-invariant-scans.stdout` / `.stderr`: static scans found no `ProcessTree.addAction`, no `getActionsDependingOnElement`, no `useProcessStore`/`processStore` references, no removed process-tree operation names, and no ProjectService concrete process-operation imports.

No additional e2e or live-preview refresh was run for this correction because it is a unit-test-only deletion of obsolete assertions and does not change production source or user-observable behavior. The prior Cycle 032 root/frontend e2e and preview refresh evidence remains applicable.

### Residual risks

No new architectural risk was introduced by the correction. Existing residuals remain: persisted streams using the deleted unimplemented process-tree descriptor names fail as unknown operations by accepted no-backcompat decision, and unrelated pre-existing workspace dirt (`ActionGroup.ts` plus two deleted e2e specs) remains outside this correction.
