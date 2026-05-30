# Proposal Direct — Bounded process-tree/dependency cleanup

## Summary

Implement Wave 005 as a deletion-focused cleanup of the remaining current-source seams. Do not chase already-deleted `ProcessTree.addAction()` or `getActionsDependingOnElement()`; instead prove they are absent, delete remaining dead process-history surfaces, and clarify the single ownership split:

- `ProcessTree` owns construction-history tree/stack state only.
- `DependencyService` owns dependency graph queries and deletion order.
- Application read/use-case modules may join history plus dependency data for UI, but ProcessTree must not regain dependency APIs.

## Files to change

Expected source changes:

- `frontend/src/domain/processTree/Action.ts` and action creator comments: remove phase-era/deprecated wording and state that dependency relations are queried through the dependency boundary, not stored on actions.
- `frontend/src/domain/processTree/ProcessTree.ts`: delete routine debug `console.log`/`console.error` from toggle methods if touched; optionally add comments/tests documenting absence of dependency query APIs. Do not add new dependency-service imports.
- `frontend/src/stores/processStore.ts`: delete after confirming no active imports. It is an unused parallel process store with its own `CommandStack` and `addAction` mutator. The file is already dirty before Cycle 032 implementation; deletion is still owned by this proposal because the whole legacy surface is being removed, but the implementation log must call out the pre-dirty state and must not rewrite or preserve its local edits.
- `frontend/src/commands/operations/processTree/ProcessTreeOperations.ts`: delete `RemoveActionGroupFromProcessTreeOp` and `RemoveSubprocessFromProcessTreeOp`; keep `RemoveActionFromProcessTreeOp` because deletion flows use it.
- `frontend/src/commands/operations/processTree/registerProcessTreeOperationDescriptors.ts`: delete registrations/imports for the removed unimplemented operations.
- `frontend/src/commands/operations/processTree/README.md`: round-01 review confirmed this README advertises the removed unimplemented operations; delete those bullets with the operations, or delete the README if it becomes stale/noisy placeholder documentation.
- `frontend/src/commands/operations/processTree/index.ts`: update exports if needed.
- Focused tests under `frontend/tests/unit/processTree.spec.ts`, `frontend/tests/integration/processTree-stack.test.ts`, `frontend/tests/unit/application/panelToolbarIntentControllers.spec.ts`, `frontend/tests/unit/components/panelToolbarBehavior.spec.ts`, `frontend/tests/unit/services/ProjectService.roundTrip.spec.ts`, and architecture tests: update coverage to assert current boundaries and remove tests for deleted descriptors.

No expected changes to `ActionsPanel.vue` unless a small import/type adjustment is required after deleting the unused legacy store; it already uses injected read/intent ports.

## Files/tests/docs/fixtures to DELETE

- `frontend/src/stores/processStore.ts` if static import scan remains empty. This deletion intentionally supersedes the pre-existing type/null-safety edits in that unused file; if any active usage appears, remove this deletion from scope via reviewed delta instead of partially migrating the store.
- `RemoveActionGroupFromProcessTreeOp` and `RemoveSubprocessFromProcessTreeOp` classes from `frontend/src/commands/operations/processTree/ProcessTreeOperations.ts`.
- Their descriptor registrations in `registerProcessTreeOperationDescriptors.ts`.
- Their serialization round-trip tests in `frontend/tests/unit/services/ProjectService.roundTrip.spec.ts`.
- README entries advertising those unimplemented operations; delete `frontend/src/commands/operations/processTree/README.md` if after cleanup it only repeats obvious implementation details.
- Any stale tests asserting implicit process-tree `addAction()` creation if discovered during implementation.

## Expected behavior change

No intended user-visible behavior change. Construction history panel push/pop/toggle/rename, related-action highlighting, deletion cascade, undo/redo, project save/open replay, and 2D/3D rendering should remain equivalent. Behavior change is limited to removing inactive APIs/descriptors: persisted command streams containing the deleted unimplemented operation types should be rejected as unknown current-schema operations, consistent with no-backcompat priorities.

## Risks and mitigations

- **Risk:** ProjectService round-trip tests currently assert descriptor support for the dead operations. **Mitigation:** delete those tests with the operations and retain active process operation round-trip coverage.
- **Risk:** `processStore.ts` may be dynamically imported. **Mitigation:** require static search and build; if any active import appears, stop and revise scope rather than partially migrating a parallel store.
- **Risk:** Removing registry entries changes open-project behavior for current files containing dead operation types. **Mitigation:** accepted by no-backcompat priorities because those operations never implemented successful behavior.
- **Risk:** `processStore.ts` is already dirty before implementation. **Mitigation:** treat deletion as a deliberate Cycle 032-owned deletion of the whole unused legacy store only after confirming no active imports; record the pre-dirty deletion in `implementation-log.md`; do not edit the file in place or silently merge its local changes. If ownership cannot be cleanly attributed, stop for reviewed narrowing.
- **Risk:** Dirty `ActionGroup.ts` may overlap. **Mitigation:** inspect diff before implementation; do not adopt unrelated changes without explicit attribution.

## Validation plan

1. Static scans:
   - no `ProcessTree.addAction(` in active source,
   - no `getActionsDependingOnElement`,
   - no `useProcessStore` imports,
   - no `RemoveActionGroupFromProcessTree` / `RemoveSubprocessFromProcessTree` active source references after deletion.
2. Focused Vitest:
   - `frontend/tests/unit/processTree.spec.ts`,
   - `frontend/tests/integration/processTree-stack.test.ts`,
   - `frontend/tests/unit/application/panelToolbarIntentControllers.spec.ts`,
   - `frontend/tests/unit/components/panelToolbarBehavior.spec.ts`,
   - `frontend/tests/unit/services/ProjectService.roundTrip.spec.ts`,
   - deletion/selection tests touched by process/dependency assertions.
3. Mandatory root/frontend lint, full Vitest, root/frontend build.
4. Root/frontend Playwright e2e because process panel and undo/redo flows are user-observable.
5. Live preview refresh on `0.0.0.0:5173`, HTTP reachability probe, and smoke check that the construction history panel and 3D overlay still render.

## Protected surfaces

Do not modify ProjectService schema/replay semantics, OperationRegistry architecture beyond deleting dead process registrations, command/undo APIs, rendering/CSS/canvas/3D, Drive/auth, backend/docs/specs/package tooling, app-shell production composition, or unrelated dirty e2e files.

## Stop conditions

Stop for a reviewed delta/plan correction if cleanup requires broad ActionsPanel command-controller redesign, ProjectService migrations/backcompat, operation descriptor framework redesign, DependencyService relocation, app-shell RuntimeSession rewrite, adoption of pre-existing dirty files outside the selected cleanup, or rewriting/preserving the dirty `processStore.ts` edits instead of deleting the unused store outright.

## No-backcompat rationale

Deleting unimplemented operations and unused parallel process store is preferable to wrapping or preserving false extension points. Current-schema files that mention removed no-op/failure operation descriptors should fail rather than maintain dead compatibility branches.
