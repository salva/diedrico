# Cycle 017 Review Round 01 — Three presentation read ports and realization boundary

## Verdict

**BLOCKING ISSUES**

Cycle 017 artifacts are canonical and aligned to the existing Wave 017 entry. The direct proposal is currently the preferred path because it advances the target boundary without prematurely reopening Wave 016. However, both proposals need correction before decision because they under-specify the realization boundary and validation evidence required to prove the wave actually removes full-`World` consumption from three presentation without creating a broader god-port.

## Artifact consistency and wave-plan alignment

- Canonical artifact directory is correct: `architecture-audit/cycle-017-three-presentation-read-port-realization-boundary/` contains `scope-check.md` and both proposals.
- `scope-check.md` correctly states no wave-plan edit is currently required; the existing Wave 017 entry already covers this scope (`architecture-audit/wave-plan.md:944-993`).
- The current source evidence supports the selected wave: three-presentation still takes `World` directly via `ThreePresentationInput` and forwards it through concern selectors (`frontend/src/application/threePresentation/ThreePresentationModel.ts:1-10`, `frontend/src/application/threePresentation/ThreePresentationSelector.ts:15-23`).
- The residual realization leak also remains real: `CanvasWorldReadPort` is a presentation boundary wrapper but still realizes through concrete `World` (`frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:14-28`, `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:30-54`).

## Proposal scoring

### Proposal Direct — `proposals/proposal-direct.md`

1. **Advances target outcome?** **Yes, with gaps.** It targets the main seam named by Wave 017: replacing three-presentation full-`World` input with a narrower read port while limiting canvas alignment.
2. **Improves architecture/code quality?** **Mostly yes.** It should sharpen the presentation boundary and remove direct `World` dependency from `ThreePresentationInput`/selectors. But it does not yet define how realization methods are narrowed enough to avoid simply renaming `World` access.
3. **Respects no-backcompat/aggressive deletion?** **Yes.** It explicitly deletes old full-`World` APIs and rejects compatibility wrappers.
4. **Avoids overfeaturism?** **Mostly yes.** This is the least risky option, but only if it stays selector-owned and does not grow into a second broad presentation snapshot.
5. **Avoids new risks/regressions?** **Partially.** The proposal notes the main risk, but it does not require proof that all touched selectors can consume a narrowed contract without hidden backsliding through helper methods.
6. **Validation sufficient?** **Not yet.** It asks for focused tests but does not explicitly require updating/adding the existing `threePresentationSelector.spec.ts` and `threePresentationConcernSelectors.spec.ts` coverage that currently guards selector composition.

### Proposal Restructure — `proposals/proposal-restructure.md`

1. **Advances target outcome?** **Potentially.** A shared context could remove duplication across 2D/3D presentation boundaries.
2. **Improves architecture/code quality?** **Unclear.** It could improve ownership, but in current form it risks centralizing unrelated concerns into a broader presentation god-module.
3. **Respects no-backcompat/aggressive deletion?** **Yes.** It is explicit about deleting duplicate paths if chosen.
4. **Avoids overfeaturism?** **No, not yet.** The proposal itself admits overreach risk and does not bound the shared-context surface tightly enough.
5. **Avoids new risks/regressions?** **Not sufficiently.** It may reopen Wave 016 decisions by reshaping canvas presentation ownership beyond what this wave needs.
6. **Validation sufficient?** **Not yet.** Same test-gap as the direct proposal, plus it needs a stricter requirement to prove the shared context did not absorb unrelated scene/policy concerns.

## Preferred decision considerations

If corrected, **Proposal Direct** should remain the default winning option. The current code shows the active leak is the direct `World` dependency at the three-presentation boundary, while the shared-context restructure is only justified if review of concrete method overlap proves the direct option would duplicate read/realization ownership in a material way.

## Required corrections before decision

1. **Define the intended realization/read surface explicitly in both proposals.** Each proposal must list the exact categories of data/realization operations the new port/context is allowed to expose for each selector family (projection planes, planar elements, reconstructed elements, guides, hinges), and explicitly forbid becoming a general `World` facade. This is needed because current selectors span both collection reads and realization calls, and the proposal text is too abstract to judge whether the result would actually improve the boundary.
2. **Tighten validation requirements to name the current selector test surfaces.** Both proposals must explicitly require focused coverage for `frontend/tests/unit/application/threePresentation/threePresentationSelector.spec.ts` and `frontend/tests/unit/application/threePresentation/threePresentationConcernSelectors.spec.ts`, plus any new read-port/shared-context tests, so decision and implementation can prove the boundary change did not silently regress selector composition.
3. **Bound the restructure option more concretely or demote it.** `proposal-restructure.md` must either (a) enumerate a minimal shared surface and explicit non-owned concerns it will not absorb, or (b) state more clearly that it should be rejected unless the direct proposal encounters proven duplication during implementation planning. As written, it is too open-ended to pass bounded review.

## Recommendation

Recommend **`cycle-017-corrections-round-01`**. After the above artifact-only corrections, a second review should be able to decide between the direct path and the bounded restructure fallback without needing a wave-plan edit.

## Follow-up re-review after corrections

### Re-check of prior blockers

1. **Explicit realization/read surface in both proposals — RESOLVED.**
   - `proposal-direct.md` now defines selector-family slices (projection planes, planar elements, reconstructed elements, guides, hinges), plus explicit forbidden capabilities and facade guardrails.
   - `proposal-restructure.md` now defines a minimal shared surface, canvas-specific and three-presentation slices, and a concrete exclusion list for non-owned concerns.

2. **Focused validation naming the current three-presentation tests — RESOLVED.**
   - Both proposals now explicitly require `frontend/tests/unit/application/threePresentation/threePresentationSelector.spec.ts` and `frontend/tests/unit/application/threePresentation/threePresentationConcernSelectors.spec.ts`.
   - Both also name new adapter/context tests, and both reference `frontend/tests/unit/application/canvasPresentation/canvasWorldReadPort.spec.ts` when canvas alignment changes.

3. **Bound or demote restructure option — RESOLVED.**
   - `proposal-restructure.md` is now explicitly demoted behind the direct proposal.
   - It also includes concrete stop conditions: choose it only if direct planning proves material duplication, and reject/escalate if the change widens into broader canvas or presentation ownership.

### Updated verdict

**NO BLOCKING ISSUES**

The prior round-01 blockers are resolved by artifact-only proposal edits. The proposals now give enough bounded contract detail and validation specificity for decision-making within Cycle 017 without requiring a wave-plan edit.

### Updated decision considerations

- **Preferred option remains Proposal Direct.** It directly addresses the active leak: `ThreePresentationInput` and the three-presentation selectors currently depend on full `World`, while Wave 017 only requires a narrow read/realization boundary and limited typed alignment with `CanvasWorldReadPort`.
- **Proposal Restructure is now a bounded fallback, not a co-equal default.** It is acceptable only if a concrete pre-implementation inventory shows that the direct path would duplicate materially identical realization/transform ownership already present in canvas presentation.
- **Do not widen the chosen boundary during implementation.** If implementation discovers a need for command/process/persistence/scene-host ownership or a broader realization redesign, stop for a reviewed delta/wave-plan update rather than widening the port/context.

### Recommendation

Recommend **`cycle-017-decision`**. The stage now has adequate reviewed proposals for bounded decision and subsequent implementation planning.
