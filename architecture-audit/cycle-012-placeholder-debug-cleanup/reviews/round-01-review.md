# Wave 012 Review — Round 01

**Stage:** `cycle-012-review-round-01`  
**Wave:** `cycle-012-placeholder-debug-cleanup`  
**Reviewer task:** `t1-review-wave-012-proposals`  
**Artifacts reviewed:**
- `architecture-audit/cycle-012-placeholder-debug-cleanup/scope-check.md`
- `architecture-audit/cycle-012-placeholder-debug-cleanup/proposals/proposal-direct.md`
- `architecture-audit/cycle-012-placeholder-debug-cleanup/proposals/proposal-restructure.md`
- `architecture-audit/wave-plan.md`
- referenced source under `frontend/src/**` and architecture tests under `frontend/tests/unit/architecture/**`

## Source checks performed

Verified current tree state against proposal claims:

- `frontend/src/commands/operations/paper/` contains only `README.md` and is a README-only placeholder.
- `frontend/src/commands/operations/toolbar/` contains only `README.md` and is a README-only placeholder.
- `frontend/src/commands/operations/processTree/`, `world/`, and `viewState/` all contain source files beside their READMEs, so they are not eligible for blanket placeholder deletion.
- `frontend/src/commands/operations/OperationRegistry.ts` currently registers only world and process-tree descriptors.
- `frontend/tests/unit/architecture/importBoundaries.spec.ts` already contains the Wave 011 deleted-debug-surface assertion and is a plausible narrow extension point for Wave 012 hygiene gating.
- The cited routine `console.log` noise is present in `GoogleDriveService.ts`, `rectangleGrid.ts`, `projectionPlaneUtils.ts`, `HingeLine.ts`, `Guide.ts`, `UpdateElementStyleOp.ts`, `RemoveElementOps.ts`, `ToggleOutputOp.ts`, and `ToggleEncapsulationOp.ts`.
- `App.vue` currently has no routine console logging; `ProjectService.ts` currently has no routine console logging.

## Proposal scoring

### Proposal Direct — `proposal-direct.md`

1. **Advances wave target outcome:** **Pass**  
   It directly deletes the two README-only placeholder operation families and removes routine debug logging from concretely cited runtime files, which matches Wave 012's target outcome.

2. **Improves architecture / code quality:** **Pass**  
   Deleting nonexistent architectural surfaces and normal-flow console noise improves source readability without adding abstractions that would preserve the smell.

3. **Respects no-backcompat / aggressive deletion priorities:** **Pass**  
   It deletes placeholder families rather than wrapping them and explicitly avoids preserving debug paths behind configuration.

4. **Avoids overfeaturism:** **Pass**  
   It stays intentionally small and avoids turning debug-noise cleanup into a logging-service project.

5. **Introduced risks / hidden regressions:** **Warning**  
   The proposal is mostly safe, but its optional static gate language is too broad as written because a repo-wide `console.log/debug/info` ban over `frontend/src/**` would immediately collide with still-existing routine logs outside the enumerated Wave 012 target set unless the proposal first defines the intended enforcement scope precisely.

6. **Validation sufficiency:** **Pass with correction needed for precision**  
   The validation list is strong: placeholder directory checks, preserved README-family checks, deleted-surface scans, architecture gates, focused tests, mandatory cadence classification, and focused Playwright/live smoke. However, if the proposal keeps the optional architecture/static gate, it must say exactly whether the gate covers only the touched files or all active frontend source.

**Direct proposal summary:** good direction, but needs one precision correction on the hygiene-gate scope before implementation review can sign off cleanly.

### Proposal Restructure — `proposal-restructure.md`

1. **Advances wave target outcome:** **Pass**  
   It still performs the required deletions and log cleanup while adding a narrow hygiene boundary.

2. **Improves architecture / code quality:** **Pass**  
   Extending the Wave 011 architecture/static-gate mechanism is a sensible higher-level improvement and is better justified than adding a logger abstraction.

3. **Respects no-backcompat / aggressive deletion priorities:** **Pass**  
   It deletes the placeholder/debug surfaces and explicitly rejects compatibility-preserving logging infrastructure.

4. **Avoids overfeaturism:** **Pass with caution**  
   The proposal correctly rejects a logging service, but the new source-hygiene boundary must remain narrow. A broad allowlist-driven console policy would be scope creep.

5. **Introduced risks / hidden regressions:** **Blocker**  
   The proposed architecture test says to fail on `console.log`, `console.debug`, or `console.info` across `frontend/src/**`, but the current scope evidence already shows many such statements outside the exact touched files and does not prove the full-tree rule is ready. As written, this can force an unreviewed broad cleanup or a policy/allowlist framework, both of which violate the wave's intended bounded scope.

6. **Validation sufficiency:** **Pass with correction needed for precision**  
   The proposed static scans, architecture tests, focused behavior tests, mandatory cadence, and focused Playwright/live preview checks are all appropriate, but the console-hygiene test needs a concrete, bounded enforcement target.

**Restructure proposal summary:** architecturally stronger than the direct proposal, but currently has one blocking scoping issue in the static console-hygiene rule.

## Explicit checks requested by the stage

### README-bearing operation-directory classification

Confirmed against the current tree:

- `paper/`: **delete** — README-only placeholder.
- `toolbar/`: **delete** — README-only placeholder.
- `processTree/`: **preserve** — active implementation family with README.
- `world/`: **preserve** — active implementation family with README.
- `viewState/`: **out of deletion scope unless separately justified** — not README-only, contains `ViewStateOperations.ts` and `index.ts`, and its registration/contract status is a different problem than placeholder deletion.

Both proposals classify these directories correctly.

### Routine debug-log / TODO cleanup scope

Both proposals are concrete enough on the log-removal targets and correctly distinguish routine normal-flow `console.log` noise from `console.warn` / `console.error` in genuine failure paths. Both also correctly avoid incidental expansion into `App.vue` and `ProjectService.ts`, whose current files do not contain the targeted routine logs.

### Source-hygiene gate scope

This is the key issue in round 01.

- The **direct proposal** treats the gate as optional and partially hedged, which is safer but still too ambiguous.
- The **restructure proposal** is clearer about intent but overreaches by proposing a full-tree `console.log/debug/info` architecture failure without first bounding the enforcement set to the enumerated Wave 012 targets or proving the rest of `frontend/src/**` is already clean.

A corrected proposal must choose one of these bounded approaches:

1. restrict the static guard to the specific touched files / targeted paths evidenced in the scope check; or
2. if the author wants a broader tree-wide guard, first amend the proposal with explicit evidence that all remaining `console.log/debug/info` occurrences in `frontend/src/**` are either included in this wave's delete list or intentionally excluded with a very small named exception set.

What is **not** acceptable is a vague “full-tree guard plus maybe allowlist later” plan.

### Wave 013 docs/spec scope boundary

Both proposals respect the boundary correctly. They limit this wave to placeholder docs and comments directly adjacent to removed debug/placeholder code and explicitly defer broad `specs/001-dihedral-learning-mvp` / “Phase N” reconciliation to Wave 013.

## Recommendation

**BLOCKING ISSUES**

- `proposal-direct.md`: needs one in-place correction clarifying the exact scope of any new console/source-hygiene architecture gate.
- `proposal-restructure.md`: needs one in-place correction narrowing the proposed console-hygiene architecture test so it cannot silently expand Wave 012 into a broad repo cleanup or an allowlist framework.

If corrected, the restructure proposal is the more compelling direction because it keeps the deletion-first implementation while turning the Wave 011 static-gate infrastructure into a small, enforceable hygiene boundary.

## Required in-place corrections for round 02

1. **Narrow the console/source-hygiene gate scope explicitly.**  
   State whether the architecture/static rule applies only to the enumerated touched files or to a proven-clean broader set. Do not leave this as an optional or open-ended full-tree policy.

2. **Make the enforcement mechanism deterministic without scope creep.**  
   If directory absence is enforced by shell validation rather than Vitest, say so plainly. If console hygiene is enforced in Vitest, define the exact scan roots and any named exceptions up front rather than deferring to implementation.

3. **Keep `viewState/` out of placeholder deletion scope.**  
   Preserve the current wording that `viewState/` is not a README-only placeholder and should not be pulled into this wave absent a separately reviewed delta.

## Stage hygiene note

No `frontend/`, `backend/`, `specs/`, or `docs/` application source changes were made by this review stage. The worktree does contain many unrelated pre-existing `.saivage/` and audit artifacts, so implementation must continue to inspect and stage only Wave 012-relevant changes.
