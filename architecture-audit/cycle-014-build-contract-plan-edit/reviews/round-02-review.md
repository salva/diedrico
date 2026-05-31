# Review — Round 02

**Stage:** `cycle-014-build-contract-plan-edit-review-round-02`  
**Scope reviewed:** `reviews/round-01-review.md`, `corrections-round-01-note.md`, `proposal-direct.md`, `proposal-restructure.md`, and `scope-check.md`.

## Recommendation

**NO BLOCKING ISSUES** — the corrections round resolves all four round-01 blockers. The proposal set is now sufficiently bounded for decision and the subsequent `wave-plan.md` edit.

## Blocker disposition

### 1. Tighten Wave 015 scope bound

**Resolved.** Both corrected proposals now bind Wave 015 to the **exact current** `frontend-build.after5.stdout` / `vue-tsc` error set and to only the **direct type/contract-owner dependencies** needed to eliminate those exact errors honestly.

Evidence:

- `proposal-direct.md` scope and target-outcome sections now explicitly limit Wave 015 to fixing or deleting the exact current build errors and exclude nearby files, adjacent TODOs, stylistic cleanup, and unrelated normalization.
- `proposal-restructure.md` now applies the same exact-build-log/direct-owner boundary in its scope, target outcome, anti-overreach constraints, and success criteria.
- `corrections-round-01-note.md` accurately records this tightening as an intentional response to blocker 1.

Result: Wave 015 is now build-log/direct-dependency bounded rather than an opportunistic cleanup license.

### 2. Add mandatory expansion stop rule

**Resolved.** Both proposals now state that if a fix requires broader redesign than honest closure of the current build errors, implementation must stop for a reviewed delta/mini-cycle rather than widening Wave 015 in place.

Evidence:

- `proposal-direct.md` risks/anti-overreach sections now require a reviewed delta/mini-cycle if a category needs conceptual redesign beyond current compilation closure.
- `proposal-restructure.md` anti-overreach constraints now require the same stop rule for deeper redesign in rendering, process-tree, command/undo, projection-plane, or other categories.
- `corrections-round-01-note.md` records this change directly under blocker 2.

Result: the expansion stop rule is now explicit and reviewable.

### 3. Protect Wave 014 repaired surfaces explicitly

**Resolved.** Both proposals now name the protected Wave 014 surfaces and require any reopening to cite a specific current build error and causal link.

Protected surfaces now explicitly listed in both proposals:

- `frontend/tests/unit/calculations/intersections.spec.ts`
- `frontend/src/components/dialogs/PropertiesDialog.vue`
- `frontend/tests/unit/components/propertiesDialog.spec.ts`
- `frontend/tests/integration/guide-creation.test.ts`
- `frontend/tests/e2e/keyboard-shortcuts.spec.ts`
- `frontend/tests/e2e/selection-mask.spec.ts`
- `frontend/package.json` build-gate upgrade

`corrections-round-01-note.md` correctly documents that these were added to both proposals in response to blocker 3.

Result: Wave 014 repaired files/commits are now concretely protected rather than only implied.

### 4. Clarify residual handling for non-build discoveries

**Resolved.** Both proposals now defer non-build discoveries to future waves instead of letting Wave 015 absorb them.

Evidence:

- `proposal-direct.md` now states that unreachable/non-build discoveries are future-wave candidates and do not expand Wave 015.
- `proposal-restructure.md` now states that residual architectural questions are deferred and that boundary notes do not authorize unrelated API normalization.
- `corrections-round-01-note.md` accurately records these edits under blocker 4.

Result: non-build architectural discoveries are now explicitly deferred.

## Updated proposal scoring

| Criterion | Proposal Direct | Proposal Restructure |
| --- | --- | --- |
| 1. Advances target outcome | **Pass** — now properly bounded to the current build backlog and return-to-Wave-014 closure. | **Strong pass** — same boundedness, with clearer architecture-owner framing. |
| 2. Improves architecture / code quality | **Pass** — preserves owner-contract repair and deletion-first discipline. | **Strong pass** — best expresses contract ownership as the architectural unit of repair. |
| 3. Respects no-backcompat / aggressive deletion | **Pass** | **Pass** |
| 4. Avoids overfeaturism | **Pass** — expansion stop rule and exact-build-log bound resolve the prior blocker. | **Pass** — same, while still keeping boundary-first reasoning. |
| 5. Introduced risks / hidden regressions | **Pass with accepted residual risk** — broad backlog still needs disciplined implementation, but the proposal now states the right stop conditions and protected surfaces. | **Pass with accepted residual risk** — same; reviewer should still enforce against casts/suppressions during implementation review. |
| 6. Validation sufficiency | **Pass** | **Pass** |

## Recommendation for decision

**Recommend `proposal-restructure.md`.** It remains the stronger planning artifact because it treats the build backlog as owned cross-layer contract convergence rather than isolated error silencing, while the round-02 corrections now prevent that framing from turning into a catch-all cleanup wave.

## Accepted residual risks for decision

These are not blockers, but should be cited honestly in the decision artifact:

1. The current build backlog is still broad enough that implementation discipline will matter; reviewers should reject suppressions, compatibility shims, and adjacency cleanup not tied to current build errors.
2. Projection-plane/world and process-tree categories may still reveal deeper redesign pressure; if so, the new mini-cycle stop rule must be enforced rather than waived.
3. Because protected Wave 014 surfaces include one frontend component file (`PropertiesDialog.vue`), any Wave 015 reopening there must be justified against a specific current build error, not convenience.

## Final review status

**NO BLOCKING ISSUES**
