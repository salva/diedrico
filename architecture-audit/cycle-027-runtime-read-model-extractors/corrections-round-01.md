# Cycle 027 Corrections Round 01

## Purpose

Correct `proposals/proposal-direct.md` in place after `reviews/round-01-review.md` raised two blocking issues. This corrections round performs no production implementation and makes no implementation decision; it prepares the direct proposal for `cycle-027-review-round-02`.

## Evidence inspected first

- `architecture-audit/cycle-027-runtime-read-model-extractors/reviews/round-01-review.md`
- `architecture-audit/cycle-027-runtime-read-model-extractors/proposals/proposal-direct.md`
- `architecture-audit/cycle-027-runtime-read-model-extractors/proposals/proposal-restructure.md`
- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts`
- `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts`
- `frontend/src/application/canvasPresentation/Projected3DCanvasSelector.ts`
- `frontend/src/application/canvasPresentation/CanvasVisibilityPolicy.ts`
- `frontend/src/application/threePresentation/ThreeWorldReadPort.ts`

A scoped seam search was captured under:

- `architecture-audit/cycle-027-runtime-read-model-extractors/validation/corrections-round-01-seam-search.stdout.log`
- `architecture-audit/cycle-027-runtime-read-model-extractors/validation/corrections-round-01-seam-search.stderr.log`

Path-scoped diff for the Cycle 027 proposal files was empty before editing. A broad `git_status` call exceeded MCP output limits because the worktree is broadly dirty; no unrelated dirty work was reverted or inspected beyond the scoped evidence above.

## Blocking issue 1 — visibility seam could be mistaken for read-model mutation

### Review blocker

Round 01 said the direct proposal was not explicit enough that elements visibility is an intent boundary adjacent to, not part of, the elements read model. The reviewer required two bounded responsibilities and a stop condition for command-backed visibility/undo/persistence redesign.

### Correction made in `proposal-direct.md`

- The summary now splits elements work into:
  1. `ElementsPanelReadModel` for display DTO construction only.
  2. A small adjacent visibility intent port/service for `toggleElementVisibility` preserving current direct `visualStyle` mutation plus dirty-state semantics.
- Files-to-change now lists `ElementVisibilityIntent.ts` (or equivalent) separately from `ElementsPanelReadModel.ts` and forbids mutation methods on read-model builders/DTOs.
- `RuntimeViewPorts.ts`, Vue consumer, DELETE-list, expected behavior, risks, validation, no-backcompat, and stop-condition sections now consistently describe the visibility toggle as an adjacent intent boundary rather than read-model state.
- The stop conditions now explicitly require a reviewed plan edit for command-backed visibility, visibility undo/redo semantics, persistence schema/replay, or visibility history redesign.

### Why this resolves the blocker

The proposal no longer allows an implementation to move the existing mutation body into a misleading “read-model” module and claim success. The read side owns DTOs; the write side is a small named intent with current semantics only. Any deeper visibility semantics must stop for reviewed planning.

## Blocking issue 2 — canvas-port narrowing lacked concrete caller map/residual rule

### Review blocker

Round 01 said the direct proposal overclaimed canvas narrowing without listing caller-by-caller treatment for at least `getProcessTree()`, `getAllProjectionPlanes()`, and raw 3D collection getters.

### Correction made in `proposal-direct.md`

- Added a dedicated “Concrete caller map and residual rule for `CanvasWorldReadPort`” section.
- `getProcessTree()` is marked **delete in this wave** because its current caller is only the canvas visibility policy seam: `CanvasVisibilityPolicy.isCanvasElementVisible()` accepts `Pick<World, 'getProcessTree'>` and is used by `CanvasPresentationSelector` for point/line/circle visibility checks.
- `getAllProjectionPlanes()` is marked an **explicit residual unless fully deleted by concrete DTO selectors**, with named current callers:
  - `CanvasPresentationSelector` builds transform maps and iterates plane-owned 2D elements.
  - `Projected3DCanvasSelector` iterates planes for projected 3D rendering.
  - `CanvasWorldReadPort` realization context supplies projection-plane lookup to domain realization internals.
- `getAll3DPoints()`, `getAll3DLines()`, and `getAll3DSegments()` are marked **explicit residual unless deleted together as a complete projected-3D DTO seam**, with `Projected3DCanvasSelector` named as the caller.
- Paired 2D/3D realization methods are now governed by the same residual rule: do not claim realization narrowing while selectors still receive raw domain entities.
- Files-to-change, DELETE list, expected behavior, risks, validation, no-backcompat rationale, and stop conditions were updated to match the caller map.

### Why this resolves the blocker

The corrected proposal now gives implementation an auditable rule: `getProcessTree()` must be deleted; raw projection-plane and raw 3D collection seams may remain only as named residuals with current callers and rationale, or may be deleted only when concrete behavior-sized DTO methods replace all relevant callers in the same wave. This prevents both under-delivery and fake-facade overreach.

## Other consistency updates

- Validation now explicitly includes recursive `ProcessTreeNode.vue` DTO behavior and flags, satisfying the reviewer's non-blocking observation.
- Validation now carries forward the Cycle 026 3D hotfix lesson by requiring overlay pointer-boundary evidence if presentation-adjacent files are touched.
- No-backcompat rationale now distinguishes true compatibility shims from explicit residuals that remain only because current selector callers still require them.
- `proposal-restructure.md` was left unchanged because the review did not identify an accuracy problem in the fallback proposal; the required corrections were specific to the preferred direct proposal.

## Scope control

No production source, tests, package/tooling, backend, docs/specs, secret/config, persistence, or implementation files were edited. The only intended artifact edits are:

- `architecture-audit/cycle-027-runtime-read-model-extractors/proposals/proposal-direct.md`
- `architecture-audit/cycle-027-runtime-read-model-extractors/corrections-round-01.md`
- correction evidence logs under `architecture-audit/cycle-027-runtime-read-model-extractors/validation/`

## Recommendation

Proceed to `cycle-027-review-round-02` to review the corrected direct proposal against the round-01 blockers and the Cycle 027 stage objective.
