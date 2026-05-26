# Wave 008 Corrections Round 01 Note

Source review: `architecture-audit/cycle-008-3d-rendering-scene-adapters/reviews/round-01-review.md`.

This correction stage edited only Wave 008 proposal artifacts. No frontend/backend/specs application source files were modified.

## Blocker 1 — Make shell boundary explicit for selection and guide behavior

Reviewer blocker: both proposals needed to state that `ThreeView.vue` may read UI state but must not keep guide/perpendicular-plane geometry derivation, direct selected-element domain lookup, or raw Three.js object construction. Selected IDs must flow into `threePresentation` input and come back as DTOs.

Edits made:

- `proposals/proposal-direct.md` summary now says `ThreeView.vue` may read UI stores for display options and selected IDs, but selected IDs must cross into `threePresentation`, with guide/perpendicular-plane DTO production and scene-object construction outside the component.
- `proposals/proposal-direct.md` gained a new **Non-negotiable shell and selector boundaries** section forbidding selected-element domain lookup, guide/perpendicular-plane derivation, domain realization traversal, and raw Three.js object construction in `ThreeView.vue`.
- `proposals/proposal-direct.md` validation now requires a shell-boundary scan proving `ThreeView.vue` only passes display options, injected `World`, and selected IDs into the runtime/controller.
- `proposals/proposal-restructure.md` now states the Vue shell may read `viewStore`/`selectionStore` only for UI state and must pass selected IDs into `runtime.refresh({ world, displayOptions, selectedIds })`; guide/perpendicular-plane DTOs must be produced by `threePresentation`.
- `proposals/proposal-restructure.md` static checks now explicitly forbid `getLine2D`, guide predicates, guide normal calculation, and realization calls in `ThreeView.vue`.

## Blocker 2 — Require concern-split selectors, not one replacement god module

Reviewer blocker: projection planes, planar 2D-on-3D elements, reconstructed 3D elements, guides, and hinges must be separate selector concerns under `application/threePresentation/`; a large `ThreePresentationSelector` would merely rename the god module.

Edits made:

- `proposals/proposal-direct.md` target outcome and new boundary section now make concern-split selectors mandatory.
- `proposals/proposal-direct.md` replaced the old single-selector description with an orchestrating `ThreePresentationSelector.ts` plus `ProjectionPlane3DSelector.ts`, `PlanarElement3DSelector.ts`, `ReconstructedElement3DSelector.ts`, `Guide3DSelector.ts`, and `HingeAxis3DSelector.ts`.
- `proposals/proposal-direct.md` risk mitigation now explicitly rejects a second god selector and requires tests per concern.
- `proposals/proposal-restructure.md` rules now state `ThreePresentationSelector.ts` is an orchestrator only and that projection-plane, planar-element, reconstructed-element, guide, and hinge/axis selector concerns must remain separate.
- `proposals/proposal-restructure.md` static checks now verify selector concern split rather than only adapter/domain import direction.

## Blocker 3 — Add explicit deletion/validation for CSS2D label disposal and object-group replacement

Reviewer blocker: both proposals mentioned labels and disposal but needed explicit tests/scans for CSS2D label lifecycle, grouped replacement/disposal semantics, and removal of repeated `scene.children` clearing patterns from `ThreeView.vue`.

Edits made:

- `proposals/proposal-direct.md` now defines `ThreeSceneObjectRegistry.ts` as owner of grouped object replacement, CSS2D label ownership, and geometry/material/label disposal, with focused tests for old group and label replacement.
- `proposals/proposal-direct.md` now requires label-owning modules to own CSS2D DOM/object cleanup, and validation now tests grouped replacement, geometry/material disposal, CSS2D label removal/replacement, and absence of repeated `scene.children.filter(...).forEach(scene.remove)` in `ThreeView.vue`.
- `proposals/proposal-restructure.md` now requires `ThreeObjectRegistry.ts` to replace render groups atomically, dispose geometry/material/CSS labels, own CSS2D label cleanup/replacement, and replace repeated `scene.children` clearing patterns.
- `proposals/proposal-restructure.md` delete list and behavioral coverage now explicitly require deleting repeated `scene.children.filter(...).forEach(scene.remove)` patterns and validating grouped object replacement plus CSS2D label cleanup/replacement.

## Validation-language tightening

Additional edits made to align with the stage acceptance criteria:

- Both proposals now call out projection-plane meshes/grids/surfaces, axis/label DTOs, guide/hinge geometry, domain-to-view conversion through DTOs, scene setup extraction, ThreeView shell boundaries, live/e2e 3D smoke, and the mandatory full validation cadence.
- Proposal Restructure remains the reviewer-recommended path, with Proposal Direct corrected enough to serve as a fallback only if it enforces the same non-negotiable boundaries.
