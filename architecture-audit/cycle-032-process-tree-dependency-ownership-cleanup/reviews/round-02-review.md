# Cycle 032 Round 02 Review — process-tree/dependency ownership cleanup

## Verdict

No blocking issues remain in the corrected proposal set. The round-01 `processStore.ts` dirty-file/deletion blocker is **resolved**: `scope-check.md` now explicitly records the pre-existing dirty state and ownership implications for `frontend/src/stores/processStore.ts`, and both proposals now carry a coherent delete-or-stop rule for that file. The cycle can proceed to `cycle-032-decision-process-tree-dependency-ownership-cleanup`, with `proposal-direct.md` preferred.

## Source-control / review-only scope check

Verified first against `.saivage/stages/cycle-032-review-round-02-process-tree-dependency-ownership-cleanup/path-scoped-status-diff.log`:

- Scoped dirt remains limited to pre-existing changes in `frontend/src/domain/processTree/ActionGroup.ts`, `frontend/src/stores/processStore.ts`, and deleted e2e specs `frontend/tests/e2e/active-plane-shortcuts.spec.ts` / `frontend/tests/e2e/selection-mask.spec.ts`.
- The diff stat still shows only those four production/test paths changed; no new implementation churn appears in scoped source files.
- The `architecture-audit/cycle-032-process-tree-dependency-ownership-cleanup/reviews/` directory is present for review artifacts.

This remained a review-only pass: no production source/test implementation, validation/preview execution, protected config/secret reads, or unrelated dirty-file normalization were performed in this stage.

## Round-01 blocker resolution

Resolved.

What changed and why it is now sufficient:

1. `scope-check.md` now lists `frontend/src/stores/processStore.ts` in source-control reconciliation, summarizes the pre-existing diff, and ties the file to the remaining unused parallel process-history/store ownership smell rather than to current `ProcessTree` APIs.
2. `scope-check.md` now states the required ownership decision: Cycle 032 may delete the whole pre-dirty file only if implementation re-verifies no active imports/usage; otherwise it must stop or narrow scope rather than silently absorb unrelated edits.
3. `proposal-direct.md` now carries the same rule across files-to-change, delete list, risks, validation, and stop conditions.
4. `proposal-restructure.md` coherently inherits the same rule and does not reopen the earlier attribution gap.

That closes the specific round-01 concern that implementation could accidentally absorb unrelated pre-existing edits in `processStore.ts` without an explicit ownership rule.

## Premise / current-source fit

The narrowed premise remains correct and is preserved by the corrected artifacts:

- Active `ProcessTree.ts` already lacks `addAction()` and `getActionsDependingOnElement()`.
- The only remaining `addAction(` match is in the unused legacy `frontend/src/stores/processStore.ts` surface.
- `ActionsPanel.vue` already consumes injected read/intent ports instead of concrete process-tree command operations.

So Cycle 032 is correctly framed as current-source ownership cleanup, not stale-API archaeology.

## Proposal scoring

### Proposal-direct.md

1. **Advances target outcome:** Yes. It keeps construction-history ownership in `ProcessTree`, keeps dependency queries outside it, and targets concrete remaining dead/parallel surfaces.
2. **Improves architecture/code quality:** Yes. Deleting the unused parallel store and the unimplemented process-tree removal descriptors would reduce dead paths and false extension points.
3. **Respects no-backcompat / aggressive deletion:** Yes. It explicitly prefers deleting inactive descriptors and the legacy store over preserving compatibility shims.
4. **Avoids overfeaturism:** Yes. It stays bounded and does not expand into Wave 006b panel command-controller redesign or broader app-shell restructuring.
5. **Risks / regressions:** Acceptable. The prior attribution gap is now closed by the explicit delete-or-stop rule for pre-dirty `processStore.ts`; remaining risk is implementation-time re-verification of non-usage and explicit deletion attribution in the implementation log.
6. **Validation sufficiency:** Yes. Static scans, focused Vitest, full lint/Vitest/build, Playwright, and preview refresh/probe remain appropriate for the eventual implementation stage.

### Proposal-restructure.md

1. **Advances target outcome:** Yes. A narrow process-history/dependency read seam could strengthen ownership at a higher layer.
2. **Improves architecture/code quality:** Yes, conditionally. It could reduce `ProcessTreeReadModel` → `World` coupling, but it is broader than the current minimum necessary cleanup.
3. **Respects no-backcompat / aggressive deletion:** Yes. It retains the same delete list and does not preserve legacy surfaces.
4. **Avoids overfeaturism:** Mostly. The stop conditions are good, but this path still carries more expansion risk into app-shell/read-port work than the direct path.
5. **Risks / regressions:** Acceptable but higher than direct. It now inherits the same explicit `processStore.ts` attribution rule, but still has greater scope-creep risk.
6. **Validation sufficiency:** Yes. The additional architecture/static checks are sensible if this path were chosen.

## Protected-scope / no-broadening check

Verified acceptable. The corrected artifacts do **not** broaden into:

- Wave 006b panel command-controller implementation,
- ProjectService schema/replay changes,
- command descriptor redesign beyond deleting dead process registrations,
- rendering/CSS/canvas/3D behavior,
- Drive/auth internals,
- backend/docs/specs/package-tooling churn,
- app-shell production composition redesign,
- new UI features,
- validation-platform work,
- stale audit-history mining,
- or normalization/adoption of unrelated dirty files.

## ActionGroup.ts attribution and README cleanup check

- **ActionGroup.ts attribution:** Acceptable. The corrected `scope-check.md` still treats `frontend/src/domain/processTree/ActionGroup.ts` as pre-existing dirt that must not be silently adopted; any implementation cleanup there must be explicitly owned.
- **processTree README cleanup justification:** Acceptable. Round-01 already established that `frontend/src/commands/operations/processTree/README.md` advertises the two unimplemented operation placeholders, so deleting/updating those README entries remains justified if the operations are removed.

## Decision recommendation

Recommend proceeding to `cycle-032-decision-process-tree-dependency-ownership-cleanup`.

Preferred proposal: **`proposal-direct.md`**.

Decision considerations to record:

- The direct path best matches the current code reality and Wave 005’s bounded intent.
- The restructure path is a valid fallback only if the decision-maker explicitly prefers paying extra scope now to narrow the `ProcessTreeReadModel`/`World` seam immediately.
- If implementation proceeds with the direct path, it must re-run usage scans for `useProcessStore` immediately before deletion and record `processStore.ts` as a deliberate deletion of a pre-dirty unused legacy file rather than a merge of its local edits.

## Residual non-blocking cautions for implementation

1. Re-verify `processStore.ts` non-usage immediately before deletion.
2. Record pre-dirty whole-file deletion attribution explicitly in `implementation-log.md`.
3. Preserve Cycle 031 boundaries: no ProjectService concrete operation imports, no migration/backcompat work, and no descriptor-framework redesign beyond removing dead process registrations.

With those controls, the corrected proposal set clears review.
