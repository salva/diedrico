# Cycle 032 Round 01 Review — process-tree/dependency ownership cleanup

## Verdict

Blocking corrections required before decision. The proposal set is close and the direct path remains the preferred implementation candidate, but the current artifacts misstate scoped dirty-path attribution: `frontend/src/stores/processStore.ts` is already dirty in the working tree and is not acknowledged in `scope-check.md`'s source-control reconciliation section. Because both proposals also nominate that file for deletion, the omission matters: implementation could accidentally absorb unrelated pre-existing edits without an explicit ownership decision. Per the stage contract, the review cannot clear decision/implementation until the scoped dirt inventory is corrected in-place and the proposal handling of that file is made explicit.

## Designer/Critic protocol check

Accepted. `architecture-audit/cycle-032-process-tree-dependency-ownership-cleanup/reviews/critic-round-01.md` is present, clearly marked `synthesized_by: manager` with `reason: critic_dispatch_unavailable`, and documents two failed critic attempts before synthesis. That satisfies the required Designer/Critic failure-tolerance path for this design artifact set.

## Source-control / protected-scope check

Verified against current scoped status/diff:

- Dirty scoped paths currently include `frontend/src/domain/processTree/ActionGroup.ts`, `frontend/src/stores/processStore.ts`, and deleted e2e specs `frontend/tests/e2e/active-plane-shortcuts.spec.ts` and `frontend/tests/e2e/selection-mask.spec.ts`.
- The scout artifact only records `ActionGroup.ts` plus the two deleted e2e specs as pre-existing dirt, omitting the already-modified `processStore.ts`.
- Protected surfaces remain out of scope in both proposals: no ProjectService schema/replay redesign, no command descriptor framework redesign beyond deletion of dead registrations, no rendering/CSS/canvas/3D work, no Drive/auth/backend/specs/tooling changes, no Wave 006b panel command-controller work.

Because this is a review-only stage, no implementation/validation/preview work was performed here.

## Premise check

The narrowed premise is correct and explicitly acknowledged: active `ProcessTree.ts` already lacks `addAction()` and `getActionsDependingOnElement()`, so Cycle 032 should target current ownership seams rather than recreate stale delete work. Evidence checked:

- `frontend/src/domain/processTree/ProcessTree.ts`
- `frontend/src/application/appShell/readModels/ProcessTreeReadModel.ts`
- `frontend/src/application/processHistory/ProcessHistoryUseCases.ts`
- `frontend/src/commands/operations/processTree/registerProcessTreeOperationDescriptors.ts`
- `frontend/tests/unit/services/ProjectService.roundTrip.spec.ts`

## Proposal scoring

### Proposal-direct.md

1. **Advances target outcome:** Yes. It keeps `ProcessTree` on construction-history ownership, leaves dependency queries outside `ProcessTree`, and deletes dead process-history surfaces.
2. **Improves architecture/code quality:** Yes. Deleting `processStore.ts` if unused and deleting unimplemented process-tree removal descriptors materially reduces dead/parallel surfaces.
3. **Respects no-backcompat/aggressive deletion:** Yes. It correctly prefers deleting inactive descriptors over preserving fake extension points.
4. **Avoids overfeaturism:** Yes. It stays bounded and does not reopen Wave 006b or app-shell redesign.
5. **Risks/regressions:** Partially. It names dynamic-import risk and dirty `ActionGroup.ts` overlap, but it misses that `processStore.ts` is already dirty before implementation, so current ownership/attribution controls are incomplete.
6. **Validation sufficiency:** Yes. Static scans, focused tests, full lint/Vitest/build, Playwright, and preview refresh/probe are appropriate.

### Proposal-restructure.md

1. **Advances target outcome:** Yes. A narrow process-history/dependency read seam would strengthen ownership if the direct path is judged too local.
2. **Improves architecture/code quality:** Yes, conditionally. It could improve the `ProcessTreeReadModel`/`World` coupling but is broader than needed for the current wave.
3. **Respects no-backcompat/aggressive deletion:** Yes. It retains the same delete list and does not preserve legacy paths.
4. **Avoids overfeaturism:** Mostly. Stop conditions are good, but this path has more room to expand into app-shell/view-port refactoring.
5. **Risks/regressions:** Partially. It identifies scope-creep risk but inherits the same missing `processStore.ts` dirty-path attribution issue.
6. **Validation sufficiency:** Yes. The added architecture/static coverage for the read boundary is sensible if this path is chosen.

## Preferred direction after corrections

Prefer `proposal-direct.md` once the scoped-dirt accounting is corrected. The direct proposal already matches the current source reality: `ActionsPanel.vue` is no longer the command-construction leak described in the original wave-plan text, while dead process operations and the unused parallel process store are concrete deletion targets.

`proposal-restructure.md` should remain the alternate path only if the next round can justify that the `ProcessTreeReadModel` → `World` seam must be narrowed now rather than in a later application-shell/read-port wave.

## Non-blocking observations

- `frontend/src/commands/operations/processTree/README.md` does exist and does advertise the two unimplemented operations, so the proposal's doc cleanup target is justified.
- `frontend/src/domain/processTree/Action.ts` still contains phase-era/private-boundary wording (`world.dependencyService.getDependencies(...)`) and is a legitimate cleanup target.
- `frontend/src/domain/processTree/ProcessTree.ts` still contains debug `console.log`/`console.error` statements in toggle methods; deletion there is reasonable if that file is touched.
- The scout warning about `ActionGroup.ts` source-control attribution remains valid. The file is dirty before Cycle 032 implementation and any cleanup there must be explicitly owned, not silently folded in.

## Required corrections for round 02

1. Update `scope-check.md` source-control reconciliation to include the already-dirty `frontend/src/stores/processStore.ts` path and clarify whether Cycle 032 intends to delete that file on top of pre-existing edits or to stop if authorship cannot be cleanly attributed.
2. Update both proposals' risk/stop-condition language so deletion of `processStore.ts` explicitly requires handling the pre-existing diff without silently adopting unrelated user changes.
3. Keep the narrowed premise explicit: old deprecated `ProcessTree` APIs are already absent; remaining work is current process/dependency ownership cleanup only.
4. Preserve the existing out-of-scope guardrails, especially that Wave 006b panel command-controller work stays out of scope and Cycle 031 persistence/undo/registry boundaries remain preservation requirements verified in implementation validation.
