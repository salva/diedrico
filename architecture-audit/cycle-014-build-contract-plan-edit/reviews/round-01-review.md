# Review — Round 01

**Stage:** `cycle-014-build-contract-plan-edit-review-round-01`  
**Scope reviewed:** `scope-check.md`, `proposal-direct.md`, `proposal-restructure.md`, `wave-plan.md`, prior Wave 014 `decision.md`, `implementation-log.md`, and `frontend-build.after5.stdout`.

## Recommendation

**BLOCKING ISSUES** — both proposals are directionally correct and correctly preserve the need for a new Wave 015 plus a return to Wave 014 closure, but they are still too permissive about what Wave 015 may absorb. Before decision, the chosen proposal should be corrected in-place to bind Wave 015 explicitly to the *current build-error categories and their direct contract owners only*, and to state that any non-build architectural expansion must stop for another reviewed mini-cycle.

## Proposal scoring

| Criterion | Proposal Direct | Proposal Restructure |
| --- | --- | --- |
| 1. Advances target outcome | **Pass with blocker** — correctly adds Wave 015 and preserves return to Wave 014 closure, but success criteria still allow a very broad repair sweep under “service/domain strictness” and UI/store/rendering buckets. | **Pass with blocker** — best matches the architectural nature of the build backlog, but the six-boundary framing risks turning Wave 015 into an opportunistic cleanup wave unless tied more tightly to the current `vue-tsc` evidence. |
| 2. Improves architecture / code quality | **Pass** — prefers owner-contract fixes and deletion over shims. | **Strong pass** — best owner-boundary framing; most aligned with architectural cleanup over patching. |
| 3. Respects no-backcompat / aggressive deletion | **Pass** — explicitly forbids compatibility shims, parallel build paths, and suppressions. | **Pass** — same, with stronger deletion language for stale surfaces. |
| 4. Avoids overfeaturism | **Blocker** — names many broad areas without an explicit stop rule when fixes stop being direct build-error ownership. | **Blocker** — boundary-first framing is good, but without a tighter stop rule it can justify redesigning process-tree, rendering DTOs, or projection-plane contracts beyond what the current build log forces. |
| 5. Introduced risks / hidden regressions | **Concern** — risk is acknowledged, but proposal should explicitly preserve Wave 014-owned repaired files as out of scope unless a cited current build error requires touching them. | **Concern** — same; also needs stronger wording that boundary notes in the implementation log do not authorize unrelated API normalization work. |
| 6. Validation sufficiency | **Pass** — validation is appropriately strict and returns to Wave 014 closure after Wave 015. | **Pass** — same; includes the right build/e2e/preview requirements. |

## Cross-proposal findings

### 1. Is a new Wave 015 required?

**Yes.** The evidence supports adding a new Wave 015 rather than extending Wave 014 in place.

Why:

- Wave 014’s reviewed scope was validation-contract ownership for specific repaired files plus the active build-tool gate.
- `frontend-build.after5.stdout` shows the active build now reaches real type checking and fails across many modules outside the approved Wave 014 implementation file list.
- The prior `decision.md` stop rule explicitly disallows broad source cleanup or source-contract repair under the Wave 014 validation-only label.

Both proposals are correct to add Wave 015 and correct to require a return to `cycle-014-validation-and-preview-refresh` after Wave 015 completes.

### 2. Is the proposed type-contract scope evidence-bound rather than arbitrary cleanup?

**Not yet tightly enough.** Both proposals cite the actual build log well, but they remain too open-ended in phrases such as:

- “service/domain strictness surfaced by the build”
- “UI/store/rendering contracts surfaced by the build”
- “direct dependencies required to make those errors honest”

Those phrases are directionally reasonable, but without a stricter constraint they can be used to justify opportunistic cleanup in adjacent modules that are not required for the current build gate.

Required correction: the selected proposal should state that Wave 015 is limited to:

1. fixing or deleting the exact current `vue-tsc` build errors recorded in `frontend-build.after5.stdout`; and
2. touching only the direct type/contract owner modules needed to eliminate those exact errors.

It should also state that if resolving one category reveals a larger redesign not necessary to make the current build pass honestly, implementation must stop for another reviewed mini-cycle rather than continue widening Wave 015.

### 3. Are Wave 014 scoped repairs preserved?

**Mostly yes, but the proposals should say this more concretely.**

The scope-check and both proposals correctly say Wave 014’s scoped repairs stay preserved and should not be reopened casually. However, because the proposed Wave 015 touches `PropertiesDialog.vue` and broad UI areas, the proposal should explicitly restate the protected Wave 014-owned surfaces:

- `frontend/tests/unit/calculations/intersections.spec.ts`
- `frontend/src/components/dialogs/PropertiesDialog.vue`
- `frontend/tests/unit/components/propertiesDialog.spec.ts`
- `frontend/tests/integration/guide-creation.test.ts`
- `frontend/tests/e2e/keyboard-shortcuts.spec.ts`
- `frontend/tests/e2e/selection-mask.spec.ts`
- `frontend/package.json` build-gate upgrade

These should be treated as preserved unless a specific current build error in the after5 log directly requires further change, and any such reopening should be documented against the cited error category.

### 4. Is the return-to-Wave-014 closure plan adequate?

**Yes.** Both proposals correctly require Wave 015 to finish first and then explicitly return to Wave 014 validation/preview closure rather than skipping ahead to a later wave. This is consistent with the Wave 014 acceptance criteria and stop rule.

## Required proposal corrections before decision

1. **Tighten the Wave 015 scope bound.** Add explicit language that Wave 015 may fix/delete only the exact current `frontend-build.after5.stdout` errors and the direct contract-owner dependencies necessary to eliminate them; it is not permission for adjacent cleanup just because a file is nearby.
2. **Add a mandatory expansion stop rule.** State that if any category requires broader redesign beyond honest closure of the current build errors, implementation must stop for a reviewed delta/mini-cycle instead of expanding Wave 015 in place.
3. **Protect Wave 014 repaired surfaces explicitly.** Name the existing Wave 014 repaired files as preserved scope and require any reopening to cite the specific current build error that forces it.
4. **Clarify residual handling for non-build issues discovered during Wave 015.** Require newly noticed but non-blocking architectural issues to be logged as future-wave candidates, not folded into Wave 015.

## Preferred proposal after corrections

**Prefer `proposal-restructure.md`** once the blockers above are corrected. It better recognizes that the backlog is a set of cross-layer contract ownership failures, not just isolated TypeScript syntax fixes, while still supporting the required Wave 015 insertion and return to Wave 014 closure.

## Final review status

**BLOCKING ISSUES**
