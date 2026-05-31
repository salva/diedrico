# Review — Round 01

**Stage:** `cycle-015-review-round-01`  
**Wave:** 015 — Converge frontend TypeScript contracts around owned boundaries  
**Reviewer outcome:** **NO BLOCKING ISSUES**  
**Recommended implementation framing:** **`proposal-restructure.md`**

## Scope and evidence checked

Reviewed:

- `architecture-audit/cycle-015-typescript-build-contracts/scope-check.md`
- `architecture-audit/cycle-015-typescript-build-contracts/proposals/proposal-direct.md`
- `architecture-audit/cycle-015-typescript-build-contracts/proposals/proposal-restructure.md`
- `architecture-audit/wave-plan.md` (Wave 015 entry)
- `architecture-audit/cycle-014-build-contract-plan-edit/decision.md`

The proposal set matches the Wave 015 plan-edit decision: exact current `vue-tsc` backlog only, six owner-boundary lanes, anti-suppression and anti-overreach constraints, explicit Wave 014 repair protection, expansion stop rule, mandatory validation, and return-to-Wave-014 closure plan.

## Proposal scoring

### Proposal Direct — `proposals/proposal-direct.md`

1. **Advances target outcome:** **Pass**  
   Strongly tied to the current `vue-tsc` backlog and direct owner dependencies. It preserves the required bounded scope and targets build restoration through owned contract fixes rather than arbitrary cleanup.

2. **Architecture and code quality improvement:** **Pass**  
   The proposal pushes repeated errors back to owner contracts and explicitly prefers deletion of stale surfaces over compatibility restoration. This is aligned with the project’s deletion-first and no-backcompat priorities.

3. **No-backcompat / aggressive deletion alignment:** **Pass**  
   The explicit DELETE list rejects re-adding removed action fields, preserving dead descriptor fields, stale singleton imports, and renderer/store compatibility reads.

4. **Avoids overfeaturism:** **Pass**  
   The build-log-bounded framing, direct-owner rule, protected-surface rule, and mini-cycle stop rule keep the wave from expanding into general cleanup.

5. **Risks / hidden regressions:** **Pass with caution**  
   The main risk is that a “direct closure” approach could degrade into call-site casting or piecemeal local fixes. The proposal does acknowledge this risk and forbids suppressions and broad casts. Manager should still enforce owner-first implementation discipline during execution.

6. **Validation sufficiency:** **Pass**  
   Includes fresh failing frontend-build baseline, focused behavior-bearing tests, root/frontend lint/test/build/e2e, preview refresh, Playwright/live smoke, and explicit return to Wave 014 validation closure.

### Proposal Restructure — `proposals/proposal-restructure.md`

1. **Advances target outcome:** **Pass**  
   It reaches the same bounded build-restoration target while framing the work as convergence of six owned boundaries rather than independent compiler silencing.

2. **Architecture and code quality improvement:** **Pass**  
   This is the stronger architectural framing. It consistently identifies authoritative owners for app-shell ports, operation outputs, process-tree action types, projection-plane/world contexts, UI DTOs, and service/domain strictness.

3. **No-backcompat / aggressive deletion alignment:** **Pass**  
   The proposal explicitly prefers deleting stale reads, stale exports, duplicate models, and debug-only compatibility assumptions over keeping both old and new contracts alive.

4. **Avoids overfeaturism:** **Pass**  
   It keeps the exact same build-log/direct-owner guard as the direct proposal, forbids broad cleanup, and requires a reviewed mini-cycle if any category turns into a larger redesign.

5. **Risks / hidden regressions:** **Pass with caution**  
   The boundary-first framing is architecturally better, but the projection-plane/world context category could still expose a deeper redesign. The proposal handles this correctly with an explicit stop rule instead of hiding it behind casts.

6. **Validation sufficiency:** **Pass**  
   Validation is complete and stage-appropriate: fresh build baseline, focused Vitest for behavior-bearing changes, full lint/test/build/e2e, preview refresh, HTTP probe, Playwright/live smoke, and return-to-Wave-014 closure.

## Stage-specific checks

### Build-log bounded scope

**Pass.** Both proposals stay anchored to the current frontend build logs and direct owner dependencies only. Neither authorizes broad arbitrary cleanup or unrelated refactors.

### Six owner-boundary mapping

**Pass.** Both proposals fully preserve the six-category map from `scope-check.md` and require implementation ownership notes by category.

### Preservation of Wave 014 repairs and prior ActionsPanel boundaries

**Pass.** Both proposals explicitly protect the Wave 014 repaired surfaces and correctly treat `ActionsPanel.vue` as reopenable only because the current build directly cites it, and only for the cited type-contract failures plus direct owners.

### Anti-suppression / anti-overreach constraints

**Pass.** Both proposals clearly forbid `@ts-ignore`, `@ts-expect-error`, broad `any`/double-cast compatibility escapes, tsconfig weakening, alternate build paths, restored legacy fields, and adjacency cleanup.

### Expansion stop rule

**Pass.** Both proposals correctly require a reviewed delta/mini-cycle if any owner boundary cannot be converged without broader redesign than honest Wave 015 closure.

### Validation sufficiency and return-to-Wave-014 closure

**Pass.** Both proposals require: fresh failing frontend-build baseline; focused tests for behavior-bearing changes; root/frontend lint, test, build, and e2e where defined; preview refresh and reachability probe; Playwright/live smoke; and explicit re-entry to `cycle-014-validation-and-preview-refresh` after Wave 015.

## Better implementation framing

**Recommendation: choose `proposal-restructure.md`.**

Why it is better:

- It treats the backlog as a contract-ownership problem, not a collection of isolated line fixes.
- It better supports the project’s top priority of architecture before local patching.
- It still preserves the hard scope bound and anti-overreach limits from the direct proposal.
- It is less likely to drift into per-call-site casts or local silencing.

`proposal-direct.md` remains acceptable and materially aligned, but `proposal-restructure.md` provides the clearer guardrail for implementation behavior.

## Residual cautions for decision/implementation

These are not blockers, but the Manager should preserve them in the decision and implementation discipline:

- Projection-plane/world context convergence must not be “solved” with structural-typing escape hatches or publicizing methods solely to satisfy accidental shape compatibility.
- Process-tree and panel consumers should be statically checked for dead paths; delete obsolete consumers rather than restoring removed `Action` fields.
- Command descriptor/result fixes can affect undo/persistence behavior; focused command/serialization/undo tests are required wherever behavior changes.
- `PropertiesDialog.vue` remains a protected Wave 014 surface except for the directly cited DTO mismatch.

## Review conclusion

**NO BLOCKING ISSUES.** The proposal set satisfies the review criteria and stage-specific constraints.

**Recommended decision:** select `proposal-restructure.md` as the winning implementation framing, while carrying forward the direct proposal’s strict build-log bound, deletion-first stance, protected-surface rule, validation cadence, and return-to-Wave-014 closure requirement.
