# Correction Review — Round 01

**Stage:** `cycle-015-correction-review-round-01`  
**Wave:** 015 — TypeScript build contracts correction mini-cycle  
**Reviewer outcome:** **BLOCKING ISSUES**  
**Safer correction path today:** **`correction-proposals/proposal-restructure.md`**

## Scope and evidence checked

Reviewed:

- `architecture-audit/cycle-015-typescript-build-contracts/correction-diff-audit.md`
- `architecture-audit/cycle-015-typescript-build-contracts/correction-proposals/proposal-direct.md`
- `architecture-audit/cycle-015-typescript-build-contracts/correction-proposals/proposal-restructure.md`
- `.saivage/stages/cycle-015-implement-typescript-build-contracts/summary.json`
- `architecture-audit/cycle-015-typescript-build-contracts/validation/frontend-build.retry-pass2.stdout`
- `architecture-audit/cycle-015-typescript-build-contracts/decision.md`
- `architecture-audit/cycle-015-typescript-build-contracts/reviews/round-01-review.md`
- current working-tree status context sufficient to confirm the Wave 015 partial diff remains uncommitted and mixed with unrelated dirty files/artifacts

This review is limited to the correction proposal set. No implementation/revert work was performed.

## Proposal scoring

### Proposal Direct — `correction-proposals/proposal-direct.md`

1. **Advances target outcome:** **Pass with blockers**  
   It directly targets the current failed Wave 015 state and addresses the key lanes called out by the diff audit: projection-plane/world context, deletion identity, typed operation outputs, implementation-log reconciliation, and frontend build rerun.

2. **Architecture and code quality improvement:** **Pass with blockers**  
   The proposal keeps the deletion-first and owner-boundary framing. It correctly rejects restoring stale action/UI fields and rejects ad hoc singleton/service workarounds.

3. **No-backcompat / aggressive deletion alignment:** **Pass**  
   It is appropriately hostile to compatibility shims, stale process-tree fields, and contract-restoration hacks.

4. **Avoids overfeaturism:** **Pass with caution**  
   It is mostly bounded, but the direct path still risks burying two semantic decisions inside a single implementation retry: realization-context ownership and process-tree deletion identity. The proposal itself acknowledges that risk.

5. **Introduced risks / hidden regressions:** **Blocking concern**  
   The direct path is only safe if the projection-plane/world lane truly is finishable as a small owner-boundary correction. Current evidence says that lane already spread across `Element2D`, multiple world elements, `ProjectionPlaneContext`, `ProjectionPlane`, `AuxiliaryProjectionPlane`, and `World`, while the build still reports missing methods, optional/required mismatches, and accidental `World` substitution. That is too close to an unreviewed conceptual redesign unless the proposal is tightened further.

6. **Validation sufficiency:** **Pass with blocker**  
   The validation list is directionally correct and explicitly includes focused command/process-tree/world-context tests, frontend build rerun, and full wave gates. However it leaves several focused test targets as adjustable placeholders (`frontend/tests/unit/world`, `frontend/tests/unit/commands`) without requiring the implementation log to pin the actual existing test entrypoints before implementation.

### Proposal Restructure — `correction-proposals/proposal-restructure.md`

1. **Advances target outcome:** **Pass**  
   It still targets honest Wave 015 closure, but does so by enforcing the Cycle 015 expansion stop rule on the two highest-risk semantic lanes.

2. **Architecture and code quality improvement:** **Pass**  
   This is the stronger architectural framing for the current failed state. It separates safe build-contract convergence from semantic boundary decisions that should not be smuggled through a partial-diff retry.

3. **No-backcompat / aggressive deletion alignment:** **Pass**  
   It preserves deletion-first handling for stale `Action` consumers, obsolete compatibility assumptions, and meaningless context aliases.

4. **Avoids overfeaturism:** **Pass**  
   The split criteria are a good anti-overreach mechanism. They narrow the high-risk lanes instead of letting the implementation sprawl under “finish the partial diff” pressure.

5. **Introduced risks / hidden regressions:** **Pass with caution**  
   Its main risk is procedural: it could fragment the correction work if used too eagerly. But given the existing failed attempt and the semantic identity/context regressions already observed, this is the safer risk profile.

6. **Validation sufficiency:** **Pass with blocker**  
   Better than the direct proposal on lane-specific log naming, but it still needs one more level of concreteness about the exact focused test/package-script discovery step and how implementation-log reconciliation will prove protected-surface checks for Wave 014 and `ActionsPanel.vue`.

## Stage-specific checks

### Partial-diff keep/complete/revert/needs-review dispositions

**Pass with one required clarification.** The audit’s file-level dispositions are materially useful and generally safe:

- it correctly marks `DeletionSequenceFactory.ts` for revert/replacement because element ids are being passed where `RemoveActionFromProcessTreeOp(actionId)` expects action ids;
- it correctly treats `NewProjectDialog.vue` as unsafe ad hoc service creation rather than a legitimate fix;
- it correctly leaves the projection-plane/world lane in `complete or revert` territory rather than pretending it is already converged;
- it correctly protects retained process-tree `ActionNode` ownership and stale-field deletion in `ActionItem.vue`.

But the proposals should state more explicitly that implementation must start by re-checking every retained file against a fresh current `git diff`, because the working tree includes many unrelated modified artifacts and the Wave 015 partial diff is not isolated by commit.

### Projection-plane/world context correction path

**Blocking concern unless proposal text is tightened.** The evidence still shows a broad unresolved lane:

- `Element2D.ts` is missing the context import;
- `HingeLine.ts` expects `get3DPlaneRealization` and `getAllProjectionPlanes` that the context does not provide;
- `BrokenHalfHingeLine2D.ts` invokes optional methods as required;
- `AuxiliaryProjectionPlane.ts` still passes a partial context where a `World` is required;
- several world element files still have strict `plane` undefined errors.

`proposal-restructure.md` is the safer path because it explicitly allows a split if this lane cannot be completed as one narrow named context. `proposal-direct.md` needs equivalent stronger wording that the lane must stop for review if any owner choice beyond a single named read-only realization context is required.

### Process-tree deletion identity safety

**Blocking concern if not made more explicit.** Both proposals identify the semantic bug, but the review requires stronger correction language:

- the correction must use authoritative action-node ids end-to-end;
- the proposal should require a focused test that proves deleting an element removes the producing action by action-node id and undo restores the same action at the same group/index;
- the proposal should forbid substituting group ids, element ids, or inferred payload ids into `RemoveActionFromProcessTreeOp(actionId)`.

`proposal-restructure.md` is closer to sufficient because it scopes this as a bounded lane with explicit target outcome.

### Implementation-log reconciliation

**Blocking issue.** Both proposals say the log must be updated, but neither is concrete enough about what “reconciled” must include for this correction stage. Before decision/implementation, the winning proposal should explicitly require the later implementation log to:

- inventory every retained, reverted, and newly corrected Wave 015 file relative to the current dirty partial diff;
- note which audit disposition each file followed and why;
- identify any files intentionally left untouched even though they were already modified in the working tree;
- record Wave 014 protected-surface checks and `ActionsPanel.vue` protection checks by file/path, not just in summary prose.

### Focused validation requirements

**Blocking issue.** The proposal set correctly requires focused tests and a frontend build rerun, but it is still too loose on exact command discovery. The winning proposal should require the implementer to pin actual existing package scripts/test paths up front and cite package-script evidence if the placeholder command forms need adjustment. This matters because the prior implementation already failed without behavior-bearing focused test evidence.

Minimum required focused coverage remains:

- command/process-tree deletion and undo behavior;
- projection-plane/world/hinge-line realization behavior if that lane is retained;
- command-output/factory behavior where typed outputs/guards change runtime error paths;
- frontend build rerun on the active `vue-tsc && vite build` path;
- protection checks for Wave 014 surfaces and prior `ActionsPanel.vue` boundary.

### Wave 014 / ActionsPanel protection

**Blocking issue.** The proposals mention protection rules, but the correction review requires one stronger explicit statement: `frontend/src/components/panels/ActionsPanel.vue` and the Wave 014 repaired files are not just “be careful” surfaces; the implementation log must show causal justification for each protected file touched and must not use those areas for opportunistic cleanup. The build log still contains `ActionsPanel.vue` errors, so the proposal must constrain work there to direct process-tree contract alignment plus direct owners only.

## Better correction path

**Recommendation: choose `correction-proposals/proposal-restructure.md`, after in-place corrections below.**

Why it is safer:

- it handles the two dangerous semantic lanes — realization-context ownership and deletion identity — as explicit bounded decisions instead of retry noise;
- it best respects the existing Cycle 015 expansion stop rule;
- it still preserves direct owner-boundary closure for the lower-risk typed-contract fixes;
- it reduces the chance that the partial diff gets “saved” with hidden semantic regressions just to achieve a green build.

## Required in-place proposal corrections before decision/implementation

1. **Tighten projection-plane/world stop rule in the direct proposal.** Add explicit language that if the lane requires choosing between multiple conceptual owners beyond one narrow named realization context, implementation must stop and request a reviewed split rather than continuing inside the direct correction path.
2. **Strengthen deletion identity proof requirements in both proposals.** Require at least one focused test proving action-node-id-based deletion and stable undo restoration, and explicitly forbid using element ids/group ids/payload ids as substitutes for `actionId`.
3. **Make implementation-log reconciliation concrete in both proposals.** Require per-file retained/reverted/completed accounting against the current partial diff, plus explicit Wave 014 and `ActionsPanel.vue` protected-surface justification entries.
4. **Make focused validation command discovery concrete in both proposals.** Require the implementation stage to pin actual existing test/package-script entrypoints at the start of the stage and cite package-script evidence if any placeholder command form must change.
5. **Tighten protected-surface wording in both proposals.** State that Wave 014 repaired files and `frontend/src/components/panels/ActionsPanel.vue` may be touched only for current build-cited failures and direct owners, with causal notes captured in `implementation-log.md`.

## Review conclusion

**BLOCKING ISSUES.** The correction proposal set is close, and `proposal-restructure.md` is the safer path, but the proposal documents need the in-place clarifications above before decision/implementation. The blockers are proposal-document corrections only; no implementation/revert work is requested in this review stage.

---

## Follow-up re-review after in-place proposal corrections

**Follow-up reviewer outcome:** **NO BLOCKING ISSUES**  
**Recommended safer path remains:** **`correction-proposals/proposal-restructure.md`**

Re-checked the exact blocker list from the earlier portion of this review against the corrected proposal documents.

### Blocker recheck results

1. **Projection-plane/world stop rule in `proposal-direct.md`** — **Resolved.**  
   The direct proposal now states that if the lane requires choosing among multiple conceptual owners beyond one narrow named read-only realization context, implementation must stop and request the split correction path rather than continue inside the direct route.

2. **Deletion identity proof requirements in both proposals** — **Resolved.**  
   Both proposals now require authoritative action-node ids, explicitly forbid substituting element ids/group ids/subprocess ids/inferred payload ids for `RemoveActionFromProcessTreeOp(actionId)`, and require a focused deletion/undo test that proves the producing action is removed/restored by action-node identity.

3. **Implementation-log reconciliation concreteness** — **Resolved.**  
   Both proposals now require per-file accounting against the current partial diff, including retained/reverted/completed/newly corrected/untouched files, the applied correction-diff-audit disposition, and explicit protected-surface entries.

4. **Focused validation command/script discovery** — **Resolved.**  
   Both proposals now require the implementation stage to inspect actual root/frontend package scripts and test entrypoints up front, pin the chosen focused commands in `implementation-log.md`, and justify any deviation from the suggested placeholder command forms with package-script/path evidence.

5. **Wave 014 / `ActionsPanel.vue` protected-surface wording** — **Resolved.**  
   Both proposals now require per-file causal justification in `implementation-log.md` for any touched Wave 014 repaired file or `frontend/src/components/panels/ActionsPanel.vue`, and they explicitly forbid opportunistic cleanup in those protected areas.

### Final reassessment of the proposals

- **`correction-proposals/proposal-direct.md`** is now acceptable as a bounded correction path because it includes the stronger stop rule, concrete deletion-identity proof, concrete log reconciliation, exact validation-command discovery expectations, and protected-surface accounting.
- **`correction-proposals/proposal-restructure.md`** remains the safer recommendation because it keeps the two highest-risk semantic lanes — realization-context ownership and process-tree deletion identity — behind explicit split criteria instead of assuming they are small enough for one retry stage.

### Final review conclusion

**NO BLOCKING ISSUES after corrections.** The prior proposal-document blockers have been resolved in place. The proposal set is now suitable for decision/implementation, with `correction-proposals/proposal-restructure.md` still the safer path if there is any doubt about the size of the projection-plane/world or deletion-identity lanes.
