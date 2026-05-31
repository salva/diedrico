# Cycle 027 Review Round 02 — Runtime read-model extractors and presentation DTO ports

## Review scope and evidence checked

Reviewed first:

- `architecture-audit/cycle-027-runtime-read-model-extractors/reviews/round-01-review.md`
- `architecture-audit/cycle-027-runtime-read-model-extractors/corrections-round-01.md`
- `architecture-audit/cycle-027-runtime-read-model-extractors/proposals/proposal-direct.md`
- `architecture-audit/cycle-027-runtime-read-model-extractors/proposals/proposal-restructure.md`
- `architecture-audit/cycle-027-runtime-read-model-extractors/scope-check.md`
- Current source seams in:
  - `frontend/src/application/appShell/RuntimeSession.ts`
  - `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts`
  - `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts`
  - `frontend/src/application/canvasPresentation/Projected3DCanvasSelector.ts`
  - `frontend/src/application/canvasPresentation/CanvasVisibilityPolicy.ts`
  - `frontend/src/application/threePresentation/ThreeWorldReadPort.ts`

Additional verification:

- Path-scoped diff for the cycle directory and named protected source files was checked and is empty, confirming this review round did not include implementation edits.

## Source-control and scope-boundary check

- No implementation source changes were accepted in this review round. The scoped diff for:
  - `architecture-audit/cycle-027-runtime-read-model-extractors`
  - `frontend/src/application/appShell/RuntimeSession.ts`
  - `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts`
  - `frontend/src/application/threePresentation/ThreeWorldReadPort.ts`
  - `frontend/src/components/panels/ElementsPanel.vue`
  - `frontend/src/components/panels/ProcessTreeNode.vue`
  is empty outside the proposal/review artifact flow.
- Scope remains bounded away from persistence schema/replay, backend/docs/debug/package-tooling, Drive/auth, command history/producer redesign, broad domain realization redesign, UI feature work, broad application-kernel work, and implementation.
- `RuntimeSession` still contains the current inline properties/process/elements seams and direct visibility mutation body (`frontend/src/application/appShell/RuntimeSession.ts:42-183`, `:287-442`), so the proposal remains a planning artifact rather than hidden implementation.

## Explicit verification of round-01 blockers

### Blocker 1 — elements visibility must be an adjacent intent boundary, not read-model mutation

**Resolved.**

`proposal-direct.md` now explicitly splits the elements concern into two responsibilities:

1. `ElementsPanelReadModel` for display DTO construction only.
2. A separate adjacent visibility intent boundary (`ElementVisibilityIntent.ts` or equivalent) for `toggleElementVisibility` with current direct style/dirty semantics.

The corrected proposal also now states all of the following clearly:

- mutation must **not** be hidden inside the read-model builder or DTOs;
- the view-port contract should describe visibility toggling as delegation to an adjacent intent boundary, not read-model state;
- if cleanup honestly requires command-backed visibility, undo/redo semantics, persistence schema/replay, or visibility history redesign, implementation must stop for a reviewed plan edit.

This satisfies the round-01 requirement and protects Wave 027 from silently expanding into command/persistence redesign.

### Blocker 2 — canvas-port narrowing needed caller-by-caller delete/residual treatment

**Resolved.**

The direct proposal now contains a concrete caller map for the required seams and it matches the current source:

- `CanvasWorldReadPort.getProcessTree()` is correctly marked **delete in this wave**. Current evidence supports that treatment because `CanvasVisibilityPolicy` still models the seam as `Pick<World, 'getProcessTree'>` (`frontend/src/application/canvasPresentation/CanvasVisibilityPolicy.ts:5-8`) and `CanvasWorldReadPort` exposes `getProcessTree()` only for that policy (`frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:15-29`, `:46-70`).
- `getAllProjectionPlanes()` is correctly treated as an **explicit residual unless both current selector callers are replaced by behavior-sized DTO methods in the same wave**. That matches `CanvasPresentationSelector`’s two plane-iteration loops (`frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts:27-37`) and `Projected3DCanvasSelector`’s per-plane projection loop (`frontend/src/application/canvasPresentation/Projected3DCanvasSelector.ts:14-18`).
- `getAll3DPoints()`, `getAll3DLines()`, and `getAll3DSegments()` are correctly grouped as an **all-or-nothing residual/delete seam** tied to `Projected3DCanvasSelector` (`frontend/src/application/canvasPresentation/Projected3DCanvasSelector.ts:19-75`).
- The proposal also correctly ties realization-method deletion to collection-seam replacement, which prevents fake narrowing while selectors still receive raw domain entities.

This satisfies the round-01 requirement and gives implementation an auditable delete/residual rule instead of vague port-narrowing claims.

## Proposal scoring update

### Proposal Direct — `proposals/proposal-direct.md`

1. **Advances target outcome:** **Pass**  
   It still directly targets the central seams in `RuntimeSession`, the canvas visibility/process-tree leak, and bounded presentation-port narrowing.

2. **Improves architecture/code quality:** **Pass**  
   The corrected boundary language now better protects against mislabeled read/write ownership while still deleting inline helper seams from `RuntimeSession`.

3. **Respects no-backcompat / aggressive deletion:** **Pass**  
   Delete intent remains concrete, especially the explicit requirement to remove `CanvasWorldReadPort.getProcessTree()` and the old inline `RuntimeSession` helper bodies.

4. **Avoids overfeaturism:** **Pass**  
   The new caller map narrows scope responsibly by allowing named residuals where current selectors still need raw traversal instead of forcing a fabricated generic facade.

5. **Introduces new risks / hidden regressions:** **Manageable**  
   Main remaining implementation risks are honest residual logging and preserving current visibility semantics without letting the adjacent intent boundary grow into command/persistence work. Those are already called out as risks and stop conditions.

6. **Validation sufficiency:** **Pass**  
   The proposal now explicitly covers recursive `ProcessTreeNode.vue` DTO behavior and carries forward overlay pointer-boundary verification if presentation-adjacent files change.

### Proposal Restructure — `proposals/proposal-restructure.md`

1. **Advances target outcome:** **Partial pass**  
   It can reduce `RuntimeSession`, but only by introducing a new composition layer that is not yet proven necessary.

2. **Improves architecture/code quality:** **Mixed**  
   It may help composition ownership, but still risks replacing the current god-module with a renamed read-model hub.

3. **Respects no-backcompat / aggressive deletion:** **Pass**

4. **Avoids overfeaturism:** **Weaker than direct**  
   Pulling broader active-plane/selection composition into a new layer is still less bounded than the wave objective requires.

5. **Introduces new risks / hidden regressions:** **Higher risk**  
   `RuntimeReadModelPorts` / `RuntimeReadModelContext` can still drift toward a world-mirroring facade.

6. **Validation sufficiency:** **Pass**

## Preferred decision consideration

**Preferred proposal remains `proposal-direct.md`.**

After corrections, it is now specific enough to support decision without reopening scope. `proposal-restructure.md` remains a plausible fallback only if implementers discover the direct path cannot materially shrink `RuntimeSession` without reintroducing duplicate composition, but that has not been demonstrated in the planning artifacts.

## Scope-boundary and protected-surface verification

The corrected direct proposal continues to respect the stage’s protected surfaces:

- no persistence schema/replay or `ProjectService` work;
- no backend, Drive/auth, package/tooling, or docs/spec churn;
- no command history/producer redesign;
- no broad domain realization redesign;
- no UI feature work;
- no broad application-kernel work;
- no implementation performed in this review stage.

The direct proposal also now has the right stop conditions for the two most dangerous expansion paths in this wave:

- command-backed visibility / undo / persistence redesign;
- broad canvas/domain DTO redesign merely to eliminate currently justified residual raw collection seams.

## NO BLOCKING ISSUES

The two round-01 blockers are resolved in `proposal-direct.md`, scope remains bounded, and no implementation source changes were made in this review stage.

## Recommended next step

Proceed to **`cycle-027-decision`** and select **`proposal-direct.md`** as the preferred implementation path.
