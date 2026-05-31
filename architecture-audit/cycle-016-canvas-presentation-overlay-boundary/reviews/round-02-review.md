# Cycle 016 Review Round 02 — Canvas presentation / overlay interaction boundary

## Reviewed inputs

- `architecture-audit/wave-plan.md`
- `architecture-audit/cycle-016-canvas-presentation-overlay-boundary/scope-check.md`
- `architecture-audit/cycle-016-canvas-presentation-overlay-boundary/proposals/proposal-direct.md`
- `architecture-audit/cycle-016-canvas-presentation-overlay-boundary/proposals/proposal-restructure.md`
- `architecture-audit/cycle-016-canvas-presentation-overlay-boundary/reviews/round-01-review.md`
- `architecture-audit/cycle-016-canvas-presentation-overlay-boundary/corrections-round-01-note.md`
- `architecture-audit/cycle-016-canvas-presentation-overlay-boundary/reviews/corrections-round-01-synthesized-review.md`
- targeted artifact diff captured at `.saivage/stages/cycle-016-review-round-02/reviews/round-02-targeted-diff.stdout`

## Round-01 blocker recheck

1. **Missing Wave 016 wave-plan entry:** **Resolved.** `architecture-audit/wave-plan.md` now contains `Wave 016 — Canvas presentation read ports and overlay interaction boundary` after Wave 015, with scope, scope guard, target outcome, explicit DELETE list, success criteria, dependencies, validation requirements, and risks.
2. **Proposal-to-wave-plan relationship unclear:** **Resolved.** `proposal-direct.md` now states it is the preferred bounded implementation of Wave 016, and `proposal-restructure.md` now states it is the broader alternative requiring explicit wave broadening before implementation.
3. **Restructure anti-god-module constraints under-specified:** **Resolved.** `proposal-restructure.md` now defines delegated responsibilities, explicit out-of-scope areas, hard size/shape limits, and stop conditions that prevent the snapshot factory from turning into a new rendering platform or policy sink.
4. **Scout-stage authority note preservation:** **Resolved.** `corrections-round-01-note.md` preserves the superseded failed scout/reviewer attempts as non-authoritative.

## Review outcome

**NO BLOCKING ISSUES**

The corrected artifacts satisfy the review-round-01 blockers and now provide a valid reviewed basis for a decision stage. The direct proposal remains the better fit for the bounded Wave 016 entry; the restructure proposal is now acceptable as a documented broader alternative, but it should be selected only if the decision intentionally broadens the wave despite the larger regression surface.

## Proposal scoring against required criteria

### Proposal Direct — `proposals/proposal-direct.md`

1. **Advances the target outcome:** **Strong**  
   It directly matches the Wave 016 target outcome: narrow canvas read ports, explicit projected-3D-on-2D ownership, deletion of `any` seams, and deliberate overlay pointer ownership.

2. **Improves architecture and code quality:** **Strong**  
   It sharpens dependency direction at the active presentation seam without reopening already-invalidated large-scale rendering or app-shell extractions.

3. **Respects no-backcompat / aggressive deletion:** **Strong**  
   The delete list removes obsolete selector APIs, untyped helper seams, stale `Paper` query ownership if proven unused, and overlay-workaround tests rather than preserving parallel paths.

4. **Avoids overfeaturism:** **Strong**  
   The scope remains bounded to the current central defect surface and includes explicit warnings against drifting into a broader rendering redesign.

5. **Introduces new risks / hidden regressions:** **Manageable**  
   The main risk remains overlay interaction changes affecting legitimate 3D input, but the proposal names that risk and requires inventory plus e2e/live verification before changing pointer behavior.

6. **Validation sufficiency:** **Strong**  
   The plan covers static seam checks, focused unit tests, e2e/live verification where overlay behavior changes, mandatory lint/full Vitest/build gates, and preview refresh.

### Proposal Restructure — `proposals/proposal-restructure.md`

1. **Advances the target outcome:** **Moderate to strong**  
   It could address the target outcome from a higher conceptual layer by unifying presentation traversal before overlay ownership is finalized.

2. **Improves architecture and code quality:** **Moderate**  
   The anti-god-module constraints make it materially safer than in round 01, but it still expands the change surface to both 2D and 3D presentation flows.

3. **Respects no-backcompat / aggressive deletion:** **Strong**  
   It explicitly rejects dual APIs and calls for deleting direct `World` inputs, duplicated traversal, `any` seams, and obsolete `Paper` query surfaces.

4. **Avoids overfeaturism:** **Borderline but acceptable as an alternative**  
   The revised constraints keep it reviewable, but it remains broader than the bounded wave and should not be chosen accidentally.

5. **Introduces new risks / hidden regressions:** **Higher risk than direct**  
   The regression surface still spans both canvas and three-presentation selectors, so the architecture upside must justify that extra churn.

6. **Validation sufficiency:** **Strong**  
   The snapshot/shared-fixture test plan plus full mandatory validation is proportionate to its broader scope.

## Decision guidance

- **Preferred proposal for the current bounded Wave 016:** `proposal-direct.md`
- **Status of broader alternative:** `proposal-restructure.md` is now sufficiently constrained to serve as a real alternative, but it should be selected only through an explicit decision to broaden Wave 016 and accept the wider regression surface.
- **Recommended next stage:** `cycle-016-decision`

## Notes for decision stage

- Keep the wave bounded unless there is a strong, explicit reason to absorb 2D and 3D presentation traversal together now.
- Preserve the non-authoritative status of failed scout/reviewer attempts in the decision artifact.
- If the direct proposal wins, implementation should treat `Paper.ts` deletion and overlay pointer changes as proof-required items, not assumptions.
