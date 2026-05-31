# Review Round 01 — Cycle 014 Validation Contract Ownership

**Stage:** `cycle-014-review-round-01`  
**Artifacts reviewed:**
- `architecture-audit/cycle-014-validation-contract-ownership/scope-check.md`
- `architecture-audit/cycle-014-validation-contract-ownership/proposals/proposal-direct.md`
- `architecture-audit/cycle-014-validation-contract-ownership/proposals/proposal-restructure.md`
- `architecture-audit/wave-plan.md`
- `architecture-audit/post-phase-3-next-wave-scout/decision.md`

## Summary

**Recommendation:** `proposal-restructure.md` remains the stronger Wave 014 framing because it keeps the work centered on validation ownership boundaries before repair/deletion.

**Disposition:** **BLOCKING ISSUES** — both proposals are close, but each still leaves one important ambiguity that should be corrected in-place before decision/implementation.

## Proposal scoring

### Proposal: `proposal-direct.md`

1. **Advances target outcome?** **Yes, with a gap.** It covers the named red gates, includes the required intersection caller inventory precondition, and requires Playwright MCP/live preview verification.
2. **Improves architecture/code quality?** **Mostly yes.** It prefers deleting corrupted/stale validation artifacts over preserving them.
3. **Respects no-backcompat / aggressive deletion?** **Yes.** The explicit delete list is appropriately aggressive.
4. **Avoids overfeaturism?** **Mostly yes.** It forbids broad framework redesign and parallel toolchains.
5. **Introduces new risks / hidden regressions?** **Some risk remains.** The guide integration item says to “diagnose the `0 test` collection symptom” but does not explicitly constrain the outcome if the file is merely not discovered rather than invalid. That can drift into broader test-discovery work unless bounded to the file itself and its immediate discovery contract.
6. **Validation sufficient?** **Yes.** It requires focused Vitest, focused Playwright, mandatory root/frontend suites, and live preview + Playwright MCP verification.

### Proposal: `proposal-restructure.md`

1. **Advances target outcome?** **Yes.** It frames each red gate as an ownership decision first, which matches the wave-plan entry and prior decision.
2. **Improves architecture/code quality?** **Yes.** It is the clearest about deleting invalid gates that have no current owner.
3. **Respects no-backcompat / aggressive deletion?** **Yes.** It explicitly rejects skip/todo/allowlist theater and compatibility shims.
4. **Avoids overfeaturism?** **Mostly yes, with a gap.** The anti-overreach rules are strong, but the build-tooling section still allows “encode it truthfully” without explicitly forbidding a docs-only/engines-only response if the actual root/frontend mandatory build commands would still fail in the active container/runtime.
5. **Introduces new risks / hidden regressions?** **Low risk overall.** The stop/review rules for deeper geometry, guide, e2e, or build redesign are appropriately explicit.
6. **Validation sufficient?** **Yes.** It requires the full mandatory cadence, parse/zero-test discovery checks, live preview refresh, HTTP 200 proof, and Playwright MCP/live browser checks.

## Stage-specific scrutiny

### 1. Intersection caller inventory and selected result-contract safety

The scope check is strong here. It cites the actual production callers in `Point.ts` and `Guide.ts`, both of which read `.feasible`, while the unit tests still assert nullable/vector-like results. Both proposals correctly require recording the caller inventory and a selected result-contract statement before edits.

**Assessment:** sufficient and properly bounded, provided the wave stops for a reviewed mini-cycle if the selected contract cannot remain local to `Intersections.ts`, its active callers, and their tests.

### 2. Validation ownership classification

Both proposals classify the surfaces sensibly as domain, UI component, integration, e2e, and tooling. This matches the wave-plan entry and helps prevent “green by accident” fixes.

**Assessment:** acceptable.

### 3. Corrupted Playwright deletion/replacement

The cited `keyboard-shortcuts.spec.ts` and `selection-mask.spec.ts` contents are plainly corrupted/orphaned. Both proposals correctly require aggressive deletion of invalid fragments and replacement with smaller current flows, plus focused Playwright and Playwright MCP verification.

**Assessment:** acceptable and aligned with project priorities.

### 4. Guide collection ambiguity

The current `guide-creation.test.ts` includes a comment-only BrokenHalfHingeLine2D test body. The Wave 013 “(0 test)” report is suspicious, but this stage’s artifacts do not yet pin down whether that came from file collection failure, filtered execution, or stale reporting.

**Assessment:** this needs tighter wording so implementation cannot expand into generalized Vitest discovery work. The allowed response should stay limited to this file, its placeholder body, and whatever exact nearby discovery contract proves why the gate reported `0 test`.

### 5. PropertiesDialog contract handling

The proposals correctly keep this bounded to current `close`/`save` event behavior and explicitly forbid broader dialog redesign. Given the component’s broader `as any` and placeholder debt, that containment matters.

**Assessment:** acceptable.

### 6. `vue-tsc` / Node tooling scope

Both proposals correctly identify tooling ownership and forbid parallel build paths. However, the wave objective is to restore trustworthy mandatory gates. A proposal must say plainly that Wave 014 cannot be closed by only changing docs/engine declarations if `npm run build` / `npm run build --workspace=frontend` still fail in the actual required validation environment.

**Assessment:** needs explicit wording in the chosen proposal. “Truthful constraints” are acceptable only if the mandatory build contract is simultaneously made executable in the environment that will run the wave’s required validation cadence; otherwise the gate remains invalid.

### 7. Live preview / Playwright MCP verification

Both proposals require preview refresh on `0.0.0.0:5173`, HTTP 200 proof, focused Playwright, and Playwright MCP/live browser checks.

**Assessment:** acceptable and explicit enough.

### 8. Anti-overreach constraints

Both proposals explicitly forbid broad validation-framework redesign, generalized allowlists, custom runners, parallel toolchains, unrelated cleanup, dialog redesign, guide redesign, and hidden geometry redesign.

**Assessment:** acceptable.

## Required in-place corrections before decision

1. **Tighten the guide integration/detection wording in both proposals.** Add explicit language that any `0 test` diagnosis must remain limited to `frontend/tests/integration/guide-creation.test.ts`, its placeholder BHHL case, and the exact local Vitest discovery/collection contract needed to explain this file’s status. State clearly that Wave 014 must not broaden into general test-discovery/config cleanup unless the evidence forces a reviewed plan-edit mini-cycle.

2. **Tighten the build-tooling wording in the selected proposal (and preferably both).** Add explicit language that Wave 014 may not satisfy the build-tooling objective with docs-only/engines-only/runtime-policy edits if the mandatory root/frontend build commands still fail in the actual validation environment used for this wave. The proposal should state that the selected single supported contract must be executable under the environment that runs the required validation cadence, or the wave must stop for review instead of declaring success.

## Recommendation

After those wording fixes, choose **`proposal-restructure.md`**. It best matches the wave-plan framing, keeps deletion-first discipline, and provides the clearest stop/review behavior if deeper domain or tooling redesign appears.
