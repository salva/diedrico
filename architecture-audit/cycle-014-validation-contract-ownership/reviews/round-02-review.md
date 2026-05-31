# Review Round 02 — Cycle 014 Validation Contract Ownership

**Stage:** `cycle-014-review-round-02`  
**Artifacts reviewed:**
- `architecture-audit/cycle-014-validation-contract-ownership/reviews/round-01-review.md`
- `architecture-audit/cycle-014-validation-contract-ownership/corrections-round-01-note.md`
- `architecture-audit/cycle-014-validation-contract-ownership/proposals/proposal-direct.md`
- `architecture-audit/cycle-014-validation-contract-ownership/proposals/proposal-restructure.md`
- `architecture-audit/cycle-014-validation-contract-ownership/scope-check.md`

## Summary

**Recommendation:** `proposal-restructure.md` remains the recommended Wave 014 proposal.

**Disposition:** **NO BLOCKING ISSUES** — the round-01 blockers were substantively resolved in both proposals, and the corrected proposal set can proceed to decision.

## Round-01 blocker recheck

### 1. Guide integration / `(0 test)` ambiguity

**Round-01 requirement:** bind any diagnosis/fix to `frontend/tests/integration/guide-creation.test.ts`, its placeholder BrokenHalfHingeLine2D/BHHL case, and the exact local Vitest collection/discovery contract; forbid drift into general discovery/config cleanup without a reviewed mini-cycle.

**Corrections note evidence:** `corrections-round-01-note.md` explicitly says both proposals were rewritten to impose that file-local boundary and add a stop/review rule for broader discovery/config work.

**Proposal recheck:**
- `proposal-direct.md` decision 3 now limits the work to `frontend/tests/integration/guide-creation.test.ts`, its placeholder BHHL case, and the exact local Vitest collection/discovery contract needed to explain that file’s status; it also adds a matching scope-guard stop rule.
- `proposal-restructure.md` guide layer decision now imposes the same file-local boundary and adds a matching stop/review bullet.

**Disposition:** resolved. The guide integration/`0 test` scope is now explicitly locally bounded.

### 2. Build tooling / runtime-policy ambiguity

**Round-01 requirement:** make explicit that docs-only, engines-only, or runtime-policy edits cannot satisfy Wave 014 if `npm run build` and `npm run build --workspace=frontend` still fail in the actual validation environment; require the selected single supported contract to be executable there or stop for review.

**Corrections note evidence:** `corrections-round-01-note.md` says both proposals were rewritten to impose that executable-in-validation-environment requirement, and `proposal-restructure.md` success criteria/risk text were tightened accordingly.

**Proposal recheck:**
- `proposal-direct.md` decision 6 now states docs-only, engines-only, or runtime-policy edits cannot satisfy the wave if the mandatory root/frontend build commands still fail in the actual validation environment, and its scope guard requires stopping for review instead of declaring success.
- `proposal-restructure.md` build tooling decision now imposes the same requirement; its stop/review behavior, success criteria, and risk note also now explicitly require actual mandatory root/frontend build success in the validation environment.

**Disposition:** resolved. Mandatory root/frontend build success is now required as the closure condition for the build-tooling portion of Wave 014.

## Proposal scoring update

Round-01 scoring remains materially unchanged except for blocker disposition. The proposals still score as follows:

### Proposal: `proposal-direct.md`
1. **Advances target outcome?** Yes.
2. **Improves architecture/code quality?** Mostly yes.
3. **Respects no-backcompat / aggressive deletion?** Yes.
4. **Avoids overfeaturism?** Yes after the guide/build wording corrections.
5. **Introduces new risks / hidden regressions?** Low to moderate, appropriately bounded by scope guards.
6. **Validation sufficient?** Yes.

### Proposal: `proposal-restructure.md`
1. **Advances target outcome?** Yes.
2. **Improves architecture/code quality?** Yes.
3. **Respects no-backcompat / aggressive deletion?** Yes.
4. **Avoids overfeaturism?** Yes after the build wording correction.
5. **Introduces new risks / hidden regressions?** Low, with explicit stop/review rules.
6. **Validation sufficient?** Yes.

## Stage-specific verification

### Guide integration / `0 test` scope remains bounded

Verified: both corrected proposals now constrain the guide issue to the local integration file, placeholder BHHL case, and exact nearby collection/discovery contract, with explicit stop/review behavior if the problem expands into general Vitest discovery/config work.

### Build-tooling success requires actual mandatory builds

Verified: both corrected proposals now require `npm run build` and `npm run build --workspace=frontend` to pass in the actual validation environment. Policy-only edits are explicitly rejected as sufficient if those commands still fail.

### Intersection contract / caller inventory requirements remain intact

Verified: both proposals still require the audited active caller inventory from `scope-check.md` to be recorded before edits and keep the line-line result-contract decision explicit and bounded.

### Validation ownership classifications remain intact

Verified: both proposals still preserve the domain / UI component / integration / e2e / tooling ownership framing that anchors Wave 014.

### Playwright MCP / live preview requirements remain intact

Verified: both proposals still require preview refresh on `0.0.0.0:5173`, HTTP 200 proof, focused Playwright, and Playwright MCP/live browser verification for the repaired/replaced flows.

### Anti-overreach constraints remain intact

Verified: both proposals still forbid generalized framework redesign, custom runners, parallel toolchains, unrelated cleanup, hidden geometry redesign, dialog redesign, and broad guide redesign.

## Residual risks accepted for decision

- The likely selected line-line contract remains the current infeasible-realization model; that is acceptable for this wave because the proposals preserve explicit caller inventory and stop/review rules if deeper geometry redesign appears necessary.
- Build-tooling repair may still require dependency/runtime alignment work, but the proposals now correctly prevent declaring success without mandatory root/frontend build success in the real validation environment.
- Corrupted Playwright artifacts may reveal selector drift after parse repair; both proposals appropriately keep that repair bounded to current keyboard shortcut and selection-mask contracts.

## Recommendation

Proceed to decision and select **`proposal-restructure.md`**.

It remains the stronger framing because it treats Wave 014 as a validation-ownership boundary pass first, preserves aggressive deletion of invalid gates, and has the clearest stop/review behavior if any surface turns out to require deeper architectural movement.
