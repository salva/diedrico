# Wave 008 Review — Round 02

## Reviewed artifacts

- `architecture-audit/wave-plan.md` (Wave 008 entry)
- `architecture-audit/cycle-008-3d-rendering-scene-adapters/scope-check.md`
- `architecture-audit/cycle-008-3d-rendering-scene-adapters/reviews/round-01-review.md`
- `architecture-audit/cycle-008-3d-rendering-scene-adapters/corrections-round-01-note.md`
- `architecture-audit/cycle-008-3d-rendering-scene-adapters/proposals/proposal-direct.md`
- `architecture-audit/cycle-008-3d-rendering-scene-adapters/proposals/proposal-restructure.md`

## Verdict

**NO BLOCKING ISSUES**

The round-01 blockers were substantively resolved in both corrected proposals. **Proposal Restructure remains the recommended path** and is now implementation-ready for decision. Proposal Direct is also materially improved, but it remains the weaker fallback because it still frames the work as a smaller extraction, while Proposal Restructure more clearly enforces the application read-model boundary that Wave 008 needs.

## Round-01 blocker disposition

### Blocker 1 — explicit shell boundary for selection and guide behavior

**Resolved.**

Evidence checked:

- `corrections-round-01-note.md` explicitly records the new requirement that selected IDs enter a `ThreePresentationInput`/`threePresentation` boundary and that selected-guide lookup, perpendicular-plane DTO creation, guide intersection DTO creation, and guide scene-object construction move out of `ThreeView.vue`.
- `proposal-direct.md` now contains `Non-negotiable shell and selector boundaries` plus the addendum section `Shell boundary for selection, guide behavior, and scene construction`, stating that `ThreeView.vue` may read UI state but must not perform selected-element domain lookup, guide/perpendicular-plane derivation, realization traversal, or raw Three.js object construction.
- `proposal-restructure.md` now contains the same constraint in stronger form under `Rules` and `Explicit shell boundary and selected-ID data flow`, requiring `ThreeView.vue` to pass `{ world, displayOptions, selectedIds }` into the runtime/presentation boundary and forbidding guide/perpendicular-plane derivation in the shell.

This addresses the most important architectural risk from round 01: the proposals no longer leave room for an implementation that keeps the hardest guide-selection/domain math inside `ThreeView.vue`.

### Blocker 2 — require concern-split selectors, not one replacement god-module

**Resolved.**

Evidence checked:

- `corrections-round-01-note.md` records explicit separate selector/read-model responsibilities for projection planes, planar elements, reconstructed elements, guides, hinges, and axis/label geometry.
- `proposal-direct.md` now says `ThreePresentationSelector.ts` is a thin orchestrator only and names separate focused selectors: `ProjectionPlane3DSelector`, `PlanarElement3DSelector`, `ReconstructedElement3DSelector`, `Guide3DSelector`, and `HingeAxis3DSelector`.
- `proposal-restructure.md` now makes the split non-optional under `Concern-split selectors/read models are required, not optional`, naming `ProjectionPlane3DSelector`, `PlanarElement3DSelector`, `ReconstructedElement3DSelector`, `Guide3DSelector`, `Hinge3DSelector`, and dedicated axis/label concern handling.

This resolves the round-01 concern that Wave 008 could devolve into a rename wave that moves `ThreeView.vue` + `Element2DRenderer3D` complexity into one new god selector.

### Blocker 3 — explicit CSS2D label disposal and grouped object replacement validation

**Resolved.**

Evidence checked:

- `corrections-round-01-note.md` records explicit group replacement, resource disposal, CSS2D label removal/replacement, and removal of repeated `scene.children.filter(...).forEach(scene.remove)` patterns.
- `proposal-direct.md` now requires a `ThreeSceneObjectRegistry` with grouped replacement and focused tests proving old group objects and CSS2D labels are removed/replaced and disposed; its validation plan explicitly calls for object-registry and adapter tests for grouped replacement and CSS2D label cleanup.
- `proposal-restructure.md` now requires `ThreeObjectRegistry` ownership of grouped replacement/disposal, explicit CSS2D label cleanup/replacement, lifecycle coverage for `mount()/refresh()/resize()/dispose()`, and validation proving repeated scene-child clearing patterns disappear from `ThreeView.vue`.

This closes the previous gap where lifecycle cleanup could have remained implicit and under-tested.

## Updated proposal scoring

The round-01 scoring still largely stands. Only blocker disposition changed.

### Proposal Direct

1. **Advances target outcome:** Good after correction  
   The explicit shell boundary and required selector split now make it materially closer to the wave target.
2. **Improves architecture/code quality:** Good  
   Deletes the right legacy surfaces and now rejects the replacement-god-module outcome.
3. **Respects no-backcompat/aggressive deletion:** Strong  
   Delete posture remains explicit and aligned with project priorities.
4. **Avoids overfeaturism:** Strong  
   Still stays within Wave 008 and avoids Wave 009 drift.
5. **Introduced risks / hidden regressions:** Manageable  
   Remaining risk is mostly execution complexity, not proposal ambiguity.
6. **Validation sufficiency:** Strong after correction  
   The tightened gates now explicitly cover shell-boundary scans, adapter/registry tests, CSS2D cleanup, grouped replacement, and live/e2e smoke.

### Proposal Restructure

1. **Advances target outcome:** Strong  
   Best match for turning `ThreeView.vue` into a shell and moving domain traversal into application selectors.
2. **Improves architecture/code quality:** Strong  
   Most clearly prevents `Element2DRenderer3D` from reappearing under a new filename.
3. **Respects no-backcompat/aggressive deletion:** Strong  
   Delete list remains explicit and appropriate.
4. **Avoids overfeaturism:** Good  
   Slightly broader than Direct, but still properly limited to the current 3D view and does not pull in Wave 009 or unrelated backend/persistence work.
5. **Introduced risks / hidden regressions:** Manageable  
   The main risk is implementation coordination across runtime/selectors/adapters, but the boundaries are now clear enough to make that risk acceptable.
6. **Validation sufficiency:** Strong  
   Validation now explicitly covers shell extraction, selector/adapter boundaries, disposal, CSS2D lifecycle, mandatory command cadence, and live 3D smoke.

## Acceptance-criteria check

- **Selected-guide shell boundary:** satisfied in both proposals; strongest in Proposal Restructure.
- **Concern-split selectors:** satisfied in both proposals; explicitly mandatory.
- **CSS2D/grouped-object lifecycle disposal validation:** satisfied in both proposals.
- **Wave 007 reuse:** satisfied; Proposal Restructure explicitly mirrors the Wave 007 `canvasPresentation` boundary without reopening the 2D scope.
- **Wave 009 exclusion:** satisfied; both proposals explicitly keep `App.vue`/app-shell work out of scope.

## Residual risks accepted for decision

These are not blockers, but the decision artifact should disclose them honestly:

- The restructure path is larger than the direct extraction path and will need disciplined implementation to avoid boundary drift between selectors, runtime, and adapters.
- The proposals depend on focused architecture scans to enforce import-direction and shell-boundary rules; implementation review should verify those scans are actually added to validation logs.
- Existing project-wide e2e/tooling issues may still limit Playwright evidence, so any implementation-stage failure to complete e2e must be classified with exact logs rather than silently treated as waived.

## Recommendation

**Proceed to decision with Proposal Restructure.**

It now meets the review requirements, resolves all round-01 blockers, best matches the Wave 008 target outcome, and preserves correct scope: isolate a 3D presentation/read-model boundary, delete `Element2DRenderer3D`, make `ThreeView.vue` a lifecycle shell, validate grouped replacement/CSS2D cleanup, reuse the Wave 007 selector pattern where relevant, and avoid Wave 009 app-shell drift.
