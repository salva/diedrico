# Cycle 016 Review Round 01 — Canvas presentation / overlay interaction boundary

## Artifact authority

Authoritative inputs for this review are:

- `architecture-audit/cycle-016-canvas-presentation-overlay-boundary/scope-check.md`
- `architecture-audit/cycle-016-canvas-presentation-overlay-boundary/proposals/proposal-direct.md`
- `architecture-audit/cycle-016-canvas-presentation-overlay-boundary/proposals/proposal-restructure.md`
- `architecture-audit/wave-plan.md`
- `.saivage/stages/cycle-016-fresh-scout-proposals/summary.json`

Superseded/non-authoritative artifacts from `cycle-016-fresh-scout-proposals` must **not** be treated as proposal evidence for implementation planning:

- failed coder attempt `t1-scout-cycle-016-proposals`
- failed coder retry `t1-scout-cycle-016-proposals-retry-01`
- failed reviewer attempt `t2-review-cycle-016-artifacts`

Use the manager-created Cycle 016 artifact directory and the successful retry review/summary as the canonical basis.

## Review outcome

**BLOCKING ISSUES**

The proposals identify a real current-code problem and the direct proposal is presently the better-scoped implementation direction, but this round cannot approve implementation yet because the required wave-plan edit does not actually exist in `architecture-audit/wave-plan.md`, and the restructure proposal is under-specified about how it avoids creating a new god-module or reopening already-invalidated broad rendering extraction.

## Proposal scoring against required criteria

### Proposal Direct — `proposals/proposal-direct.md`

1. **Advances the target outcome:** **Strong**  
   It directly addresses the scoped residuals documented in the scout: full-`World` selector input, embedded projected-3D-in-2D ownership, `any` seams, and accidental overlay pointer interception.

2. **Improves architecture and code quality:** **Strong**  
   Narrowing canvas selectors to read ports and giving projected 3D-on-2D rendering an explicit owner should improve dependency direction without reopening unrelated app-shell or command boundaries.

3. **Respects no-backcompat / aggressive deletion:** **Strong**  
   The DELETE list explicitly removes `any` seams, direct projected-3D loops inside the selector, obsolete `Paper.ts` query responsibilities if unused, and overlay-workaround e2e paths rather than preserving them.

4. **Avoids overfeaturism:** **Mostly yes**  
   It stays near the active seam. The main remaining guardrail needed is that the later implementation must prove any `Paper.ts` deletion via static usage evidence, not assumption.

5. **Introduces new risks / hidden regressions:** **Manageable**  
   The proposal itself correctly notes the main regression risk: changing overlay pointer behavior without first inventorying real 3D interactivity.

6. **Validation sufficiency:** **Good but should be anchored to the wave-plan edit**  
   The proposed validation set is consistent with project rules, especially requiring focused e2e/live verification if overlay behavior changes.

### Proposal Restructure — `proposals/proposal-restructure.md`

1. **Advances the target outcome:** **Partial**  
   A shared presentation snapshot could cleanly centralize duplicated traversal, but the current scope evidence is strongest for the canvas boundary and overlay ownership, not for introducing a new shared presentation layer now.

2. **Improves architecture and code quality:** **Potentially, but under-specified**  
   It could reduce duplication across 2D and 3D, but only if the snapshot factory remains small and delegated. As written, that constraint is acknowledged but not operationalized.

3. **Respects no-backcompat / aggressive deletion:** **Moderate**  
   It does delete stale full-`World` inputs and duplicate traversal, but its broader abstraction move risks preserving more structure during transition unless the plan is tightened.

4. **Avoids overfeaturism:** **Not yet**  
   This is the main weakness. The proposal risks turning a bounded presentation-boundary cleanup into a platform-style reframe around a new shared snapshot layer.

5. **Introduces new risks / hidden regressions:** **Higher risk**  
   It expands regression surface to both canvas and three-presentation selectors at once, despite the current scout already showing that older broad 3D-wave assumptions were invalidated.

6. **Validation sufficiency:** **Strong**  
   The validation matrix is thorough, but it is proportionate only if the wave is intentionally broadened via an approved wave-plan edit.

## Wave-plan edit evaluation

**Not adequate yet.**

The scope-check and both proposals correctly say a post-Wave-015 wave-plan edit is required before implementation, but the actual required edit is missing from `architecture-audit/wave-plan.md`. The current wave plan still ends at Wave 015 and does not contain a reviewed entry for this Cycle 016 scope. That is a blocker because the project rules require an explicit ordered wave entry with scope, target outcome, DELETE list, success criteria, and dependencies before implementation.

## Required corrections before decision/implementation

1. **Add the actual Cycle 016 wave-plan entry to `architecture-audit/wave-plan.md`.**  
   The edit must add a new post-Wave-015 wave for the canvas presentation / overlay interaction boundary. It must include, at minimum:
   - short title
   - scope
   - target outcome
   - explicit DELETE list
   - success criteria
   - dependencies
   - why old Wave 007/008/009 wording is invalidated by current source and why this replacement is now the next central wave

2. **Make the proposal-to-wave-plan relationship explicit.**  
   Update the direct/restructure proposals so each one states whether it is:
   - the preferred implementation of the newly added wave entry, or
   - an intentionally broader alternative that would require broadening that wave entry before implementation.

3. **Tighten the restructure proposal if it is to remain in consideration.**  
   It must specify concrete anti-god-module constraints for the proposed snapshot factory, including which responsibilities stay delegated to style/visibility/projection/interaction modules and what files are explicitly out of scope. Without that, it is too easy to smuggle a broad rendering/platform redesign into this wave.

4. **Preserve the scout-stage authority note in the corrected artifacts or decision handoff.**  
   The corrected review/decision path must explicitly keep earlier failed worker/reviewer attempts marked as superseded/non-authoritative, as already recommended by the prior successful scout-stage review.

## Recommendation

If the above corrections are made, the most credible current direction is **Proposal Direct** as the bounded implementation candidate for this wave. In the current state, recommend **`cycle-016-corrections-round-01`**, not decision or implementation.
