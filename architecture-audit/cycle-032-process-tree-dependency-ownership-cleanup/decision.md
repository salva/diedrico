# Cycle 032 Decision — Process-tree/dependency ownership cleanup

## Decision status

Cycle 032 is approved to proceed to implementation. Review convergence is complete with no remaining blockers.

Evidence used for this decision:

- `scope-check.md`
- `proposals/proposal-direct.md`
- `proposals/proposal-restructure.md`
- `reviews/critic-round-01.md`
- `reviews/critic-corrections-round-01.md`
- `reviews/round-01-review.md`
- `reviews/round-02-review.md`
- `architecture-audit/wave-plan.md` Wave 005 entry
- Current path-scoped status/diff captured during this decision stage for the Cycle 032 paths and scoped source files.

`reviews/round-02-review.md` is the canonical convergence artifact for this decision. It reports: “No blocking issues remain in the corrected proposal set,” states that the round-01 `processStore.ts` dirty-file/deletion blocker is resolved, and recommends proceeding with `proposal-direct.md` as the preferred path.

This decision stage performed design/decision work only. It did not implement source/test changes, run validation, refresh preview, inspect protected secrets/configs, normalize unrelated dirty files, or mine stale audit history.

## Selected implementation path

Selected path: **`proposals/proposal-direct.md` — Bounded process-tree/dependency cleanup**.

Rationale:

1. It best matches the current source reality discovered in `scope-check.md`: active `ProcessTree.ts` already lacks the historical `ProcessTree.addAction()` and `ProcessTree.getActionsDependingOnElement()` targets, so Cycle 032 must not chase phantom stale delete work.
2. It advances Wave 005’s target outcome with the least scope: `ProcessTree` remains construction-history ownership; dependency queries remain outside `ProcessTree`; dead/parallel process-history surfaces are deleted.
3. It respects the project’s no-backcompat/aggressive-deletion priorities by deleting the unused legacy process store and unimplemented operation descriptors rather than preserving shims, placeholders, or false compatibility branches.
4. It avoids over-broad app-shell/read-port restructuring and keeps Wave 006b panel command-controller work out of this cycle.

Rejected path: **`proposals/proposal-restructure.md`** for this implementation cycle.

`proposal-restructure.md` remains a valid fallback/stop path if direct implementation proves that the process-history/dependency read seam must be split now. It is rejected as the default because it has higher scope-creep risk into `ProcessTreeReadModel`/`World` read-port and app-shell wiring work, while round-02 review found the direct deletion-focused cleanup sufficient and no longer blocked.

## Exact implementation scope

Implementation must stay within the direct proposal’s bounded scope.

### Required source cleanup targets

1. **Construction-history/dependency ownership boundary**
   - Preserve `ProcessTree` as a construction-history tree/stack owner only.
   - Do not add dependency-service imports or dependency-query APIs to `ProcessTree`.
   - Normalize process/dependency comments only where they are stale or phase-era and directly touched by this cleanup.

2. **Already-absent deprecated ProcessTree APIs**
   - Treat `ProcessTree.addAction()` and `ProcessTree.getActionsDependingOnElement()` as already absent.
   - Do not recreate, migrate, wrap, or search for implementation work around those phantom targets beyond static proof of absence.
   - Any tests added/updated should assert the current boundary/absence rather than preserve old names.

3. **`frontend/src/stores/processStore.ts` delete-or-stop rule**
   - Immediately before deletion, re-run a usage scan for `processStore.ts` / `useProcessStore`.
   - If no active import/usage exists, delete the whole file as a Cycle 032-owned removal of an unused parallel process-history store.
   - The implementation log must explicitly state that the file was pre-dirty before Cycle 032 implementation and that deletion intentionally superseded the whole unused legacy surface, not that the local edits were merged or adopted.
   - If any active import, dynamic registration, user-owned purpose, or attribution uncertainty appears, stop for a reviewed delta or narrow the scope by removing this deletion target. Do not rewrite the store in place.

4. **Unimplemented process-tree operation placeholders**
   - Delete `RemoveActionGroupFromProcessTreeOp` and `RemoveSubprocessFromProcessTreeOp` from `frontend/src/commands/operations/processTree/ProcessTreeOperations.ts`.
   - Delete their descriptor registrations/imports from `frontend/src/commands/operations/processTree/registerProcessTreeOperationDescriptors.ts`.
   - Update `frontend/src/commands/operations/processTree/index.ts` if exports reference the removed classes.
   - Keep behavior-bearing active operations, including `RemoveActionFromProcessTreeOp`.

5. **Process-tree README cleanup/update target**
   - Update `frontend/src/commands/operations/processTree/README.md` to remove bullets or descriptions for the deleted unimplemented operations.
   - Delete the README only if, after removing stale operation-placeholder content, it becomes placeholder-only/noisy documentation. Record the choice in `implementation-log.md`.

6. **Action contract/comment cleanup**
   - `frontend/src/domain/processTree/Action.ts` and action creator comments may be updated to remove phase-era/private-boundary wording and clarify that dependency relations are queried through the dependency boundary rather than stored on actions.
   - Do not redesign the action descriptor model in this cycle.

7. **`ProcessTree.ts` cleanup limits**
   - Remove routine debug `console.log` / `console.error` leakage from touched process-tree mutation methods if implementation touches the file.
   - Do not broaden into subprocess API redesign or dependency-query reinvention.

8. **`ActionsPanel.vue` coupling limits**
   - No expected changes to `frontend/src/components/panels/ActionsPanel.vue`.
   - It may receive only minimal import/type fallout if direct deletion requires it.
   - Do not implement Wave 006b panel command-controller work here; the panel already consumes injected read/intent ports for this cycle’s target.

9. **Focused tests**
   - Remove tests that assert the deleted unimplemented operation descriptors.
   - Keep or update coverage for active process-tree insertion, stack behavior, action-group behavior, process-history use cases, undo/redo, ProjectService round-trip for active descriptors, and dependency/update behavior.
   - Do not perform a broad test rewrite unrelated to this cleanup.

### Dirty-file attribution requirements

Current path-scoped status/diff during this decision stage showed pre-existing dirt in:

- `frontend/src/domain/processTree/ActionGroup.ts`
- `frontend/src/stores/processStore.ts`
- the untracked `architecture-audit/cycle-032-process-tree-dependency-ownership-cleanup/reviews/` artifacts

Implementation must capture a fresh scoped baseline before editing and must preserve source-control hygiene:

- `processStore.ts`: may be deleted whole only under the delete-or-stop rule above, with explicit pre-dirty deletion attribution in `implementation-log.md`.
- `ActionGroup.ts`: treat as pre-existing dirty context. Do not silently adopt, revert, normalize, or depend on its local changes. Any cleanup there requires explicit reviewed need and implementation-log attribution.
- Deleted or dirty e2e specs from prior context remain unrelated; do not adopt, restore, or normalize them in Cycle 032 unless a reviewed delta explicitly brings them into scope.

## Protected surfaces and explicit exclusions

Cycle 032 implementation must not broaden into:

- Wave 006b panel command-controller implementation.
- ProjectService schema/replay semantics, migrations, compatibility fallbacks, domain snapshot persistence, or concrete operation imports.
- Command descriptor framework redesign beyond deleting the two dead process-tree registrations.
- Rendering, CSS, canvas, 3D behavior, 3D overlay behavior, or visual UI feature work.
- Drive/auth internals, backend, docs/specs outside the named process-tree README, package/tooling churn, validation-platform work, or app-shell production composition redesign.
- Toolbar/example setup, generalized selector/read-port framework, RuntimeSession rewrite, DependencyService relocation, or broad `World` read-port restructuring.
- Protected config/secret reads, including `.saivage/auth-profiles.json`, `.saivage/saivage.json`, env files, provider configs, tokens, Drive credentials, shell history, or keychain material.
- Stale audit-history mining or unrelated dirty-file normalization.

## Preservation requirements

Implementation must preserve:

- User-visible process panel push/pop/toggle/rename behavior.
- Related-action highlighting behavior.
- Active process-tree action insertion and action-group behavior.
- Undo/redo behavior for active process-history operations.
- Current-schema command-stream persistence and ProjectService save/open replay for active operations.
- OperationRegistry descriptor boundary from Cycle 031.
- Current 2D/3D rendering and live preview behavior, including the 3D overlay.

Persisted command streams containing the removed unimplemented operation types may fail as unknown current-schema operations. That is accepted under no-backcompat priorities because those descriptors represented unimplemented/failure placeholders, not working behavior.

## Validation requirements for implementation

The implementation stage must capture full stdout/stderr to stable files under:

`architecture-audit/cycle-032-process-tree-dependency-ownership-cleanup/validation/`

Minimum required evidence:

1. **Static scans**
   - No `ProcessTree.addAction(` in active source.
   - No `getActionsDependingOnElement` in active source.
   - No active `useProcessStore` / `processStore.ts` import after deletion.
   - No active `RemoveActionGroupFromProcessTree` or `RemoveSubprocessFromProcessTree` references after deletion.

2. **Focused tests**
   - `frontend/tests/unit/processTree.spec.ts`
   - `frontend/tests/integration/processTree-stack.test.ts`
   - `frontend/tests/unit/application/panelToolbarIntentControllers.spec.ts`
   - `frontend/tests/unit/components/panelToolbarBehavior.spec.ts`
   - `frontend/tests/unit/services/ProjectService.roundTrip.spec.ts`
   - Any deletion/selection/dependency tests touched by the cleanup.

3. **Mandatory validation cadence**
   - Root lint where defined.
   - Frontend/workspace lint where defined.
   - Focused Vitest for touched modules.
   - Full root/frontend Vitest suite as applicable.
   - Root/frontend build where defined.
   - Playwright e2e because process panel, undo/redo, persistence, and user-observable flows are in the protected behavior set.

4. **Live preview refresh**
   - Refresh the live Diedrico preview bound on `0.0.0.0` after successful validation.
   - Record the refresh command and an HTTP reachability probe in `implementation-log.md`.
   - Confirm construction history panel and 3D overlay remain available; any skipped live check requires explicit justification.

## Stop conditions

Stop and request a reviewed delta proposal, plan correction, or fallback decision if implementation requires any of the following:

- Preserving, migrating, or rewriting `processStore.ts` instead of deleting the unused pre-dirty file whole.
- Any active usage of `processStore.ts` that cannot be deleted within the direct path.
- Adoption, reversion, or normalization of unrelated dirty `ActionGroup.ts` edits.
- ProjectService migration/backcompat work or command descriptor redesign beyond removing dead registrations.
- Broad `ActionsPanel.vue` command-controller work or UI feature changes.
- App-shell/RuntimeSession/read-port redesign, generalized selector framework, or DependencyService relocation.
- Rendering/CSS/canvas/3D changes.
- Protected config/secret inspection.
- Validation failures attributable to the change that cannot be fixed within the selected direct scope.

## Residual risks accepted for implementation

1. `processStore.ts` non-use must still be re-verified immediately before deletion; current evidence is static and time-sensitive.
2. Deleting a pre-dirty file is source-control-sensitive and must be documented precisely.
3. Removing unimplemented operation descriptors changes handling of any current-schema files that contain those placeholder operation types; this is accepted because the operations were not working behavior and no-backcompat priorities favor deletion.
4. `ProcessTreeReadModel` still couples related-action lookup to broader `World` access. This is accepted as out of direct scope and may become a later read-port/app-shell wave if it remains architecturally central after this cleanup.
5. Existing `ActionGroup.ts` dirty context may overlap with future process-tree type cleanup; this cycle must not silently absorb it.

## Next stage recommendation

Proceed to the unique next stage:

`cycle-032-implement-process-tree-dependency-ownership-cleanup`

That stage should implement `proposal-direct.md` exactly as constrained by this decision, then write `architecture-audit/cycle-032-process-tree-dependency-ownership-cleanup/implementation-log.md` with changed files, deleted legacy surfaces, validation log paths, preview refresh/probe evidence, dirty-file attribution, residual risks, and any newly observed candidate waves.
