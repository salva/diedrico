# Wave 008 Corrections Round 01 Note

## Source review

Corrections are based on `architecture-audit/cycle-008-3d-rendering-scene-adapters/reviews/round-01-review.md`.

Reviewer verdict: **BLOCKING ISSUES**. Proposal Restructure remains the recommended path, but both proposals needed in-place tightening before round-02 review.

## Blocker-to-edit mapping

### Blocker 1 — Make the shell boundary explicit for selection and guide behavior

**Reviewer requirement:** both proposals must state that `ThreeView.vue` may read UI state (`viewStore`, `selectionStore`) but must not contain guide/perpendicular-plane geometry derivation, direct selected-element domain lookup, or raw Three.js object construction. Selected IDs must cross into the `threePresentation` boundary as input and guide/perpendicular-plane DTO production plus scene-object construction must live outside `ThreeView.vue`.

**Edits made in `proposals/proposal-direct.md`:**

- Updated the summary to state that `ThreeView.vue` may read UI stores for display options and selected IDs, but selected IDs cross into `threePresentation`, while guide/perpendicular-plane DTO production and scene-object construction live outside the component.
- Added/confirmed `Non-negotiable shell and selector boundaries` with explicit prohibitions on direct selected-element lookup, guide/perpendicular-plane geometry derivation, domain realization traversal, and raw Three.js object construction in `ThreeView.vue`.
- Added/confirmed `Guide3DSelector.ts` as the module that receives selected IDs through presentation input and emits guide/perpendicular-plane and intersection DTOs.
- Tightened validation assertions so shell-boundary scans must prove `ThreeView.vue` no longer imports domain projection/guide/hinge types for geometry derivation, performs selected-element domain lookup, or constructs Three.js/CSS2D objects.

**Edits made in `proposals/proposal-restructure.md`:**

- Added/confirmed the `Why this is higher-level than the direct extraction` boundary bullets: domain/application read side receives `World + display state + selected IDs`, scene adapters consume DTOs, and Vue shell controls lifecycle/UI options only.
- Added/confirmed target-architecture rules requiring `runtime.refresh({ world, displayOptions, selectedIds })` and making guide/perpendicular-plane DTOs flow from `threePresentation` through runtime/adapters.
- Added/confirmed explicit deletion of direct selected-element lookup and guide/perpendicular-plane math from `ThreeView.vue`.
- Tightened behavioral coverage expectations for selected IDs producing guide DTOs/objects while guide/perpendicular-plane derivation is absent from `ThreeView.vue` and adapters.

### Blocker 2 — Require concern-split selectors, not one replacement god-module

**Reviewer requirement:** both proposals must make concern-split selectors non-optional for projection planes, planar 2D-on-3D elements, reconstructed 3D elements, guides, and hinges/axes. A single `ThreePresentationSelector` must not absorb all current `ThreeView.vue` and `Element2DRenderer3D` traversal.

**Edits made in `proposals/proposal-direct.md`:**

- Added/confirmed target outcome language that the read-model boundary is not a single replacement god selector.
- Added/confirmed `Non-negotiable shell and selector boundaries` rejecting a monolithic `ThreePresentationSelector` and requiring separate focused selector/read-model concerns.
- Expanded the file plan under `frontend/src/application/threePresentation/` to include `ProjectionPlane3DSelector.ts`, `PlanarElement3DSelector.ts`, `ReconstructedElement3DSelector.ts`, `Guide3DSelector.ts`, and `HingeAxis3DSelector.ts`, with `ThreePresentationSelector.ts` only as a thin orchestrator.
- Added/confirmed focused selector tests split by projection planes, elements, guides, and hinges.

**Edits made in `proposals/proposal-restructure.md`:**

- Added/confirmed the target architecture rule that `ThreePresentationSelector.ts` is an orchestrator only.
- Added/confirmed separate files for `ProjectionPlane3DSelector.ts`, `PlanarElement3DSelector.ts`, `ReconstructedElement3DSelector.ts`, `Guide3DSelector.ts`, and `Hinge3DSelector.ts`.
- Added/confirmed static architecture checks that selector files remain concern-split and that one god selector is not acceptable.
- Added/confirmed risk mitigation explicitly calling out raw domain traversal moving to one giant selector as a risk blocked by required concern splitting.

### Blocker 3 — Add explicit deletion/validation for CSS2D label disposal and object-group replacement

**Reviewer requirement:** both proposals must explicitly require tests/scans for CSS2D label lifecycle and grouped replacement/disposal semantics, replacing repeated `scene.children.filter(...).forEach(scene.remove)` cleanup in `ThreeView.vue`.

**Edits made in `proposals/proposal-direct.md`:**

- Added/confirmed `ThreeSceneObjectRegistry.ts` as the owner of grouped object replacement, `userData.type` normalization, CSS2D label ownership, and geometry/material/label disposal.
- Added/confirmed adapter and registry tests proving old group objects and CSS2D labels are removed/replaced and disposed during group refresh.
- Added/confirmed deletion list entries for inline cleanup implementation and repeated scene-child clearing patterns.
- Tightened validation assertions requiring object-registry/adapter tests for grouped scene-object replacement, old geometry/material disposal, CSS2D label removal/replacement, and absence of repeated `scene.children.filter(...).forEach(scene.remove)` clearing in `ThreeView.vue`.

**Edits made in `proposals/proposal-restructure.md`:**

- Added/confirmed target-architecture rule that CSS2D labels and scene-object groups are owned by scene host/registry/adapters with explicit replacement/disposal semantics.
- Added/confirmed `ThreeObjectRegistry.ts` responsibilities for atomic group replacement and CSS2D cleanup/replacement so labels cannot leak stale DOM nodes or scene objects.
- Added/confirmed deletion of repeated `scene.children.filter(...).forEach(scene.remove)` clearing patterns from `ThreeView.vue`.
- Tightened behavioral coverage expectations for mount, scene setup extraction, refresh, resize, grouped object replacement, CSS2D label cleanup/replacement, and full disposal.

## Validation-language tightening

Both proposals now require validation coverage for:

- `ThreeView.vue` shell boundaries and forbidden imports/constructors/domain traversal.
- Scene setup extraction into a host/runtime.
- Projection-plane meshes/grids and labels.
- Guide, hinge, and axis geometry through DTOs/adapters.
- Domain-to-view conversion only in `application/threePresentation` selectors, never in scene adapters or `ThreeView.vue`.
- Lifecycle/disposal semantics for grouped scene objects and CSS2D labels.
- Live/e2e 3D smoke plus the mandatory full validation cadence with logs under `architecture-audit/cycle-008-3d-rendering-scene-adapters/validation/`.

## Scope guard

No frontend, backend, specs, docs, or application source files were changed for this corrections task. The edits are limited to Wave 008 proposal/correction artifacts and the Saivage task report.
