# Review Round 02 — Post-Phase-3 Next-Wave Scout

## Verdict

**NO BLOCKING ISSUES**

Round-01 blockers were substantively resolved in both corrected proposals. The proposal set is now decision-ready for a Wave 014 plan extension, with **`proposal-restructure.md` still recommended** as the stronger framing.

## Round-01 blocker disposition

### Blocker 1 — Intersection contract work not bounded tightly enough

**Status: resolved**

Checked against `corrections-round-01-note.md` and both corrected proposals.

What changed:
- Both proposals now require an **audited active caller inventory** and a **selected result-contract statement** before any intersection behavior changes.
- Both proposals now explicitly limit Wave 014 intersection work to **contract alignment** and require implementation to **stop and trigger a reviewed plan-edit mini-cycle** if the caller inventory shows a deeper geometry/domain-model redesign is needed.

Evidence:
- `proposals/proposal-direct.md` now adds this requirement in **Scope**, **Scope guard**, **Target outcome**, **Success criteria**, **Validation plan**, and **Risks**.
- `proposals/proposal-restructure.md` now adds the same boundary in **Scope**, **Scope guard**, **Target outcome**, **Success criteria**, **Validation plan**, and **Risks**.

Disposition: this closes the main scope-safety concern from round 01.

### Blocker 2 — Playwright MCP/live behavioral verification missing

**Status: resolved**

What changed:
- Both proposals now explicitly require **Playwright MCP/live browser verification** after e2e repair/replacement.
- Both proposals now require the preview to be refreshed on **`0.0.0.0:5173`** with **HTTP 200 probe evidence** captured in validation logs.

Evidence:
- `proposals/proposal-direct.md` adds Playwright MCP/live verification and refreshed preview/probe requirements in **Success criteria** and **Validation plan**.
- `proposals/proposal-restructure.md` adds the same requirements in **Success criteria** and **Validation plan**.

Disposition: this satisfies the project requirement for live behavioral verification on frontend/user-observable validation surfaces.

### Blocker 3 — Scope guard did not explicitly forbid broad validation redesign/toolchain overreach

**Status: resolved**

What changed:
- Both proposals now explicitly forbid **broad validation-framework redesign**, **generalized allowlists**, **custom runners**, **parallel build/test toolchains**, and **sweeping unrelated cleanup**.
- Both proposals now allow recurrence checks only for the **exact evidenced invalid artifact classes**: corrupted Playwright parse artifacts, zero-test/placeholder integration files, and unsupported build-tool/runtime combinations.

Evidence:
- `proposals/proposal-direct.md` adds these limits in **Scope guard** and **Explicit DELETE list**.
- `proposals/proposal-restructure.md` adds the same limits in **Scope guard**, **Explicit DELETE list**, **Success criteria**, and **Risks**.

Disposition: this closes the overreach concern from round 01.

## Updated proposal assessment

Round-01 scoring remains directionally valid. No criterion regressed; blocker corrections improve the prior weak areas enough for decision.

### Proposal Direct — updated disposition

1. **Advances target outcome:** still strong.  
2. **Improves architecture/code quality:** improved slightly because the contract/deletion boundaries are now clearer.  
3. **Respects no-backcompat / aggressive deletion:** still strong.  
4. **Avoids overfeaturism:** improved because broad validation/toolchain redesign is now explicitly forbidden.  
5. **Introduces risks / hidden regressions:** improved because intersection work is now caller-inventory-gated.  
6. **Validation sufficiency:** improved because Playwright MCP/live preview verification is now explicit.

### Proposal Restructure — updated disposition

1. **Advances target outcome:** remains strongest.  
2. **Improves architecture/code quality:** remains stronger than Direct because it treats invalid gates as ownership debt to delete/replace, not just failures to patch.  
3. **Respects no-backcompat / aggressive deletion:** remains strongest.  
4. **Avoids overfeaturism:** improved because the proposal now explicitly forbids broad validation-platform work.  
5. **Introduces risks / hidden regressions:** improved because intersection work is bounded by caller inventory, selected contract, and stop/review escalation.  
6. **Validation sufficiency:** improved because Playwright MCP/live preview verification and preview probe requirements are now explicit.

## Required checks from the stage brief

### 1) Do corrected proposals now safely bound intersection contract work?

**Yes.**

Both proposals now require:
- audited active caller/test inventory,
- a selected result contract for non-intersection cases,
- updates limited to directly affected source/tests,
- stop-and-review escalation if a deeper geometry redesign is required.

That is sufficient to keep Wave 014 from smuggling an unreviewed domain redesign into a validation-focused wave.

### 2) Do corrected proposals now require Playwright MCP/live preview verification?

**Yes.**

Both proposals explicitly require:
- refreshed preview on `0.0.0.0:5173`,
- HTTP 200 reachability evidence,
- Playwright MCP/live browser verification of repaired/replaced keyboard shortcut and selection-mask flows.

### 3) Do corrected proposals now forbid broad validation-framework/toolchain/test-cleanup overreach?

**Yes.**

Both proposals explicitly forbid:
- broad validation-framework redesign,
- generalized allowlists,
- custom runners,
- parallel build/test toolchains,
- sweeping unrelated cleanup.

Both also constrain recurrence checks to the exact invalid artifact classes evidenced by current red gates.

## Residual risks accepted for decision

These are no longer blockers, but decision should cite them honestly:

1. **Intersection contract may still expose broader domain-model debt.** The proposals now handle this correctly by requiring stop/review escalation if caller inventory shows the wave premise is false.
2. **Build-tooling repair may still require dependency/runtime decisions.** This is acceptable as long as implementation does not preserve parallel toolchains or suppress failures.
3. **Playwright cleanup may reduce historical coverage count.** That is acceptable because corrupted parse-failing specs currently provide no executable coverage and should be deleted/replaced aggressively.

## Recommendation for decision / wave-plan extension

**Recommend `proposal-restructure.md`.**

Why it remains preferable:
- It matches the observed systemic issue more accurately: broad gates exist but are not trustworthy because ownership/contracts are stale or invalid.
- It better aligns with project priorities by preferring **deletion/replacement of invalid validation surfaces** over patching coverage theater.
- After corrections, it now has the necessary scope brakes to stay bounded: caller-inventory-gated intersection work, mandatory Playwright MCP/live verification, and explicit prohibition on broad validation-platform redesign.

`proposal-direct.md` is now viable and non-blocking, but `proposal-restructure.md` still provides the clearer architectural framing for extending the wave plan.

## Decision readiness

The proposal set can proceed to the **decision / wave-plan extension** stage.
