# Wave 008 Corrections Round 01 Note

## Source review

Corrects blockers from `architecture-audit/cycle-008-3d-rendering-scene-adapters/reviews/round-01-review.md` for:

- `proposals/proposal-direct.md`
- `proposals/proposal-restructure.md`

No application source implementation is part of this corrections stage.

## Blocker 1 — shell boundary for selection and guide behavior

Reviewer requirement: both proposals must state that `ThreeView.vue` may read UI state but must not contain guide/perpendicular-plane geometry derivation, direct selected-element domain lookup, or raw Three.js object construction; selected IDs must enter the `threePresentation` boundary and return as DTOs.

Edits made:

- Added `Round 01 correction addendum — non-negotiable implementation constraints` to `proposal-direct.md`, section `Shell boundary for selection, guide behavior, and scene construction`.
- Added `Round 01 correction addendum — resolved blockers for the recommended path` to `proposal-restructure.md`, section `Explicit shell boundary and selected-ID data flow`.
- Both sections now require a `ThreePresentationInput`/`threePresentation` input carrying `world`, `displayOptions`, and `selectedIds` and explicitly move selected-guide lookup, perpendicular-plane DTO creation, guide intersection DTO creation, and guide scene-object construction out of `ThreeView.vue`.

## Blocker 2 — concern-split selectors, not one replacement god-module

Reviewer requirement: projection planes, planar 2D-on-3D elements, reconstructed 3D elements, guides, and hinges must be separate selector concerns under `application/threePresentation/`, even if an orchestrator composes them.

Edits made:

- Added `Required concern-split 3D read models` to `proposal-direct.md`.
- Added `Concern-split selectors/read models are required, not optional` to `proposal-restructure.md`.
- Both proposals now name separate selector/read-model responsibilities for projection planes, planar elements, reconstructed elements, guides, hinges, and axis/label geometry and prohibit a single renamed god selector from absorbing all traversal.
- Direct remains a corrected fallback only if it preserves these same split-boundary rules; Restructure remains the recommended path.

## Blocker 3 — CSS2D label disposal and grouped object replacement

Reviewer requirement: both proposals must explicitly require tests/scans for CSS2D label lifecycle and grouped replacement/disposal semantics, replacing repeated `scene.children.filter(...).forEach(scene.remove)` patterns.

Edits made:

- Added `Lifecycle, grouped replacement, and CSS2D label disposal requirements` to `proposal-direct.md`.
- Added `Lifecycle, grouped replacement, and CSS2D label cleanup validation` to `proposal-restructure.md`.
- Both proposals now require scene-object registry/group replacement, resource disposal, CSS2D label removal/replacement, and explicit removal of repeated scene-child clearing patterns from `ThreeView.vue`.

## Validation language tightened

Stage expected outcome also required tighter validation language around ThreeView shell boundaries, scene setup extraction, projection-plane meshes, labels, guide/hinge geometry, domain-to-view conversion, live/e2e 3D smoke, and mandatory full cadence.

Edits made:

- Added `Tightened validation gates for the direct fallback` to `proposal-direct.md`.
- Added `Tightened validation gates for implementation readiness` to `proposal-restructure.md`.
- Both now require static shell-boundary scans, scene setup extraction checks, selector tests, adapter/registry tests, full root/frontend lint/test/build cadence, e2e/Playwright or classified pre-existing blockers, and live 3D smoke/probe evidence.

## Scope and deletion posture

The corrections preserve Wave 008 scope:

- No Wave 009 app-shell work is introduced.
- No backend, persistence, command/tool, or broad 2D canvas restructuring is introduced.
- No compatibility shim is accepted as a completed wave artifact.
- The aggressive delete list remains binding for `Element2DRenderer3D`, inline `ThreeView.vue` geometry/mesh helpers, raw-`World` scene adapters, duplicated 2D/3D render special cases, obsolete tests/fixtures, debug logs, and any temporary shim/barrel.

## Files intentionally edited

- `architecture-audit/cycle-008-3d-rendering-scene-adapters/proposals/proposal-direct.md`
- `architecture-audit/cycle-008-3d-rendering-scene-adapters/proposals/proposal-restructure.md`
- `architecture-audit/cycle-008-3d-rendering-scene-adapters/corrections-round-01-note.md`
