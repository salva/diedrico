# Post-Phase-3 Next-Wave Scout Decision

**Stage:** `post-phase-3-decision-wave-plan-extension`  
**Decision:** extend `architecture-audit/wave-plan.md` with exactly one bounded Wave 014 entry.  
**Selected proposal:** `architecture-audit/post-phase-3-next-wave-scout/proposals/proposal-restructure.md`  
**Rejected/deferred alternative:** `architecture-audit/post-phase-3-next-wave-scout/proposals/proposal-direct.md`  
**Source-code changes in this stage:** none.

## Evidence and artifacts cited

This decision is based on the full reviewed post-Phase-3 scout packet:

- `architecture-audit/post-phase-3-next-wave-scout/scope-check.md`
- `architecture-audit/post-phase-3-next-wave-scout/candidate-risks.md`
- `architecture-audit/post-phase-3-next-wave-scout/proposals/proposal-direct.md`
- `architecture-audit/post-phase-3-next-wave-scout/proposals/proposal-restructure.md`
- `architecture-audit/post-phase-3-next-wave-scout/corrections-round-01-note.md`
- `architecture-audit/post-phase-3-next-wave-scout/reviews/round-01-review.md`
- `architecture-audit/post-phase-3-next-wave-scout/reviews/round-02-review.md`
- `architecture-audit/wave-plan.md`

No secret/provider/env files were read or cited.

## Review convergence

Review convergence is complete. Round 01 returned blocking issues, all limited to proposal wording and scope safety: intersection contract work needed caller-inventory gating, Playwright MCP/live behavioral verification needed to be explicit, and the scope guard needed to forbid broad validation-framework/toolchain overreach. `corrections-round-01-note.md` records in-place edits to both proposals addressing those blockers.

Round 02 reviewed the corrected proposals and returned **NO BLOCKING ISSUES**. It explicitly verified that all three round-01 blockers were resolved: intersection work is bounded by audited active caller inventory plus selected contract statement; Playwright MCP/live preview verification and `0.0.0.0:5173` HTTP 200 probe evidence are required; and broad validation-framework redesign, generalized allowlists, custom runners, parallel build/test toolchains, and unrelated cleanup are forbidden.

## Why PLAN_COMPLETE is inappropriate

The original Waves 001–013 are complete, but `PLAN_COMPLETE` is not appropriate because the project objective is open-ended and meaningful architecture/correctness work remains. The scope check and candidate-risk artifacts show that mandatory validation gates are still red after Wave 013:

- full Vitest remains red on intersection, PropertiesDialog, and guide integration surfaces;
- root/frontend build remains red due to the `vue-tsc`/Node 24 failure before Vite starts;
- broad Playwright remains red before browser execution due to corrupted parse artifacts in keyboard shortcut and selection-mask specs.

Because future refactor waves depend on trustworthy validation, carrying these failures as accepted background debt would weaken the architecture loop. A reviewed Wave 014 extension is therefore required before any further implementation.

## Selected proposal

`proposal-restructure.md` is selected as the Wave 014 framing: **Establish validation contract ownership and delete invalid gates**.

This framing is stronger than direct repair because the observed failures are systemic validation-ownership debt, not merely isolated broken tests. The selected proposal forces each red surface to have a current owner and executable contract, or to be deleted/replaced if stale. It aligns with the project priorities by preferring deletion of corrupted specs, placeholder tests, stale expectations, compatibility shims, and unsupported toolchain paths over preserving coverage theater.

The appended Wave 014 entry in `architecture-audit/wave-plan.md` follows the corrected restructure proposal and includes scope, scope guard, target outcome, explicit DELETE list, success criteria, validation plan, risks, and dependencies.

## Rejected/deferred alternative

`proposal-direct.md` is rejected/deferred as the weaker framing. After corrections it is viable and non-blocking, but it still frames the work primarily as restoring mandatory validation gates. That is too local for the evidence: the e2e specs are structurally corrupted, the guide integration surface includes invalid/placeholder test collection, the build gate is blocked by tool/runtime ownership, and the intersection tests expose an unresolved domain result contract. The direct proposal's useful operational details are incorporated through the selected restructure entry's success criteria and validation plan, but the wave itself should be owned as validation contract architecture.

## Accepted residual risks and constraints

Accepted residual risks for the future implementation cycle:

1. Intersection caller inventory may reveal broader geometry/domain-model debt. If so, Wave 014 implementation must stop and trigger a reviewed plan-edit mini-cycle rather than smuggling a redesign into validation work.
2. Build-tooling repair may require dependency/runtime decisions. The implementation must not preserve parallel build paths, compatibility shims, or suppressed failures.
3. Deleting stale e2e coverage may reduce historical test count, but corrupted parse-failing specs currently provide no executable coverage and should be deleted/replaced aggressively.

Implementation constraints for Wave 014:

- Start with a fresh `cycle-014-fresh-scout-proposals` stage; do not implement from this decision artifact alone.
- Preserve the corrected scope guard: no broad validation platform, custom runner, generalized allowlist, parallel toolchain, unrelated test-suite cleanup, dialog redesign, guide-domain redesign, or hidden geometry redesign.
- Require intersection active-caller inventory and selected result-contract statement before intersection source/test changes.
- Require Playwright MCP/live browser verification against the refreshed preview and HTTP 200 probe evidence for `0.0.0.0:5173`.
- Keep deletion aggressive: remove invalid gates, stale expectations, placeholders, corrupted spec fragments, and shims instead of wrapping them.

## Next stage recommendation

Proceed to `cycle-014-fresh-scout-proposals` using the new Wave 014 entry as the authoritative scope. That stage should re-read the Wave 014 entry against the current tree, write the cycle scope check, and prepare direct/restructure proposals before any source, test, package, or validation-tooling implementation edits occur.
