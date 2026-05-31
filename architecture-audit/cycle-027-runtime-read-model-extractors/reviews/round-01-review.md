# Cycle 027 Review Round 01 — Runtime read-model extractors and presentation DTO ports

## Review scope and evidence checked

Reviewed first:

- `architecture-audit/cycle-027-runtime-read-model-extractors/scope-check.md`
- `architecture-audit/cycle-027-runtime-read-model-extractors/proposals/proposal-direct.md`
- `architecture-audit/cycle-027-runtime-read-model-extractors/proposals/proposal-restructure.md`
- `architecture-audit/cycle-027-wave-plan-extension/plan-extension-note.md`
- `architecture-audit/cycle-026-hotfix-3d-view-interaction-regression/implementation-log.md`
- Current source seams in:
  - `frontend/src/application/appShell/RuntimeSession.ts`
  - `frontend/src/application/appShell/RuntimeViewPorts.ts`
  - `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts`
  - `frontend/src/application/threePresentation/ThreeWorldReadPort.ts`
  - `frontend/src/components/panels/ProcessTreeNode.vue`
  - `frontend/src/components/panels/ActionsPanel.vue`
  - `frontend/src/components/panels/ElementsPanel.vue`
  - `frontend/src/components/panels/ThreeView.vue`
  - `frontend/src/components/workspace/SvgCanvas.vue`

Reviewer evidence logs written under `architecture-audit/cycle-027-runtime-read-model-extractors/validation/`:

- `reviewer-runtime-session-lines.stdout.log`
- `reviewer-canvas-port-lines.stdout.log`
- `reviewer-three-port-lines.stdout.log`
- `reviewer-process-tree-node-lines.stdout.log`
- `reviewer-scoped-diff-stat.stdout.log`

## Source-control and scope-boundary check

- This review stage performed no implementation. Scoped diff-stat for the listed implementation files is empty.
- The worktree is broadly dirty per scout evidence, but this review did not accept that broad context into Wave 027 scope.
- Scope remains correctly bounded away from persistence schema/replay, backend/docs/debug/package-tooling, Drive/auth, command history/producer redesign, broad domain realization redesign, UI feature work, and broad application-kernel work.
- The in-stage `ProcessTreeNode.vue` inclusion is justified: it is a direct consumer of the process-node DTO shape and flags (`frontend/src/components/panels/ProcessTreeNode.vue:126-177`, `:188-242`).
- The 3D hotfix lesson remains a validation requirement, not a reason to widen architecture scope. Pointer-boundary preservation must be kept if presentation-adjacent files change.

## Current seam confirmation

The scoped problem is real and central:

- `RuntimeSession` still mixes runtime ownership with multiple read-model builders and adapter wiring (`frontend/src/application/appShell/RuntimeSession.ts:42-183`, `:287-442`).
- Inline properties/process/elements helpers still depend on raw world traversal, concrete type checks, `any`, and direct realization (`RuntimeSession.ts:303-362`, `:374-442`).
- `CanvasWorldReadPort` still exposes raw projection-plane/domain collections and `getProcessTree()` (`frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:15-29`, `:46-70`).
- `ThreeWorldReadPort` is DTO-facing publicly, but still centralizes broad world traversal and realization (`frontend/src/application/threePresentation/ThreeWorldReadPort.ts:56-64`, `:81-135`).

## Proposal scoring

### Proposal Direct — `proposals/proposal-direct.md`

1. **Advances target outcome:** **Pass**  
   It directly attacks the intended seams: properties/process/elements extraction out of `RuntimeSession`, bounded canvas narrowing, and only limited three-port cleanup.

2. **Improves architecture/code quality:** **Pass**  
   It removes the most obvious `RuntimeSession` god-module helper bodies and the current `any` seams without forcing a new layer first.

3. **Respects no-backcompat / aggressive deletion:** **Pass**  
   The delete list is concrete and explicitly rejects compatibility wrappers.

4. **Avoids overfeaturism:** **Mostly pass**  
   The main bounded-risk area is canvas port narrowing. The proposal already allows residual raw plane iteration to remain documented rather than forcing an invented facade.

5. **Risks / hidden regressions:** **Manageable with correction**  
   Biggest risks are (a) smuggling mutation semantics into a “read-model” extraction via `toggleVisibility`, and (b) overclaiming canvas/three narrowing without a concrete caller map.

6. **Validation sufficiency:** **Pass with one clarification needed**  
   Validation includes the mandatory cadence and carries forward the overlay pointer-boundary regression lesson. It should explicitly preserve live checks for process-tree behaviors that depend on `ProcessTreeNode.vue` DTO semantics.

### Proposal Restructure — `proposals/proposal-restructure.md`

1. **Advances target outcome:** **Partial pass**  
   It could reduce `RuntimeSession` further, but only if the composition layer stays truly narrow.

2. **Improves architecture/code quality:** **Mixed**  
   It may improve ownership, but it also risks replacing one god-module with a renamed composition facade.

3. **Respects no-backcompat / aggressive deletion:** **Pass**  
   The delete intent is clear.

4. **Avoids overfeaturism:** **Weaker**  
   Pulling active-plane and selection-read composition into the new layer is not yet justified by the wave objective and raises generic-kernel risk.

5. **Risks / hidden regressions:** **Higher risk**  
   `RuntimeReadModelContext` / `RuntimeReadModelPorts` could easily mirror `World` or become a new catch-all app-shell hub.

6. **Validation sufficiency:** **Pass**  
   Similar to the direct proposal, but with more churn to cover.

## Decision recommendation

**Preferred direction: `proposal-direct.md`** after in-place corrections below.  
`proposal-restructure.md` should remain the fallback only if the proposal authors can prove the direct path cannot materially shrink `RuntimeSession` without introducing duplicate orchestration.

## BLOCKING ISSUES

### 1) Direct proposal is not explicit enough about the visibility seam being an intent boundary, not a disguised read-model expansion

- Current problem: the proposal says the elements module will own a named `toggleElementVisibility` intent while preserving current direct style/dirty semantics, but it does not explicitly constrain this to an **intent port adjacent to** the elements read model. Without that clarification, implementation can blur read and write responsibilities or bury mutation deeper inside a misleading “read-model” module.
- Why blocking: this wave is about runtime read-model extractors and presentation DTO ports. If the proposal is accepted as written, implementation could move the same mutation body into a broader “read model” object and claim success without improving the boundary.
- Required correction: edit `proposal-direct.md` so the elements concern is described as **two bounded responsibilities**: (a) elements read-model builder, and (b) a small visibility intent port/service that preserves current semantics but is not represented as part of the read model itself. Also state that if honest cleanup requires command-backed visibility/undo/persistence changes, implementation must stop for a reviewed plan edit.

### 2) Direct proposal needs a concrete caller map / residual rule for canvas-port narrowing

- Current problem: the proposal says raw collection methods will be replaced “where directly supported by current selector call sites” and documents residuals only generally.
- Why blocking: `CanvasWorldReadPort` currently exposes `getAllProjectionPlanes()` and `getProcessTree()` (`frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:15-29`, `:49`, `:69`), and the scope-check already identifies specific selector consumers. Without a caller-by-caller rule, implementation can either overreach into a fake facade or under-deliver while still claiming port narrowing.
- Required correction: edit `proposal-direct.md` to list the intended treatment for each current broad canvas seam at minimum: `getProcessTree()`, `getAllProjectionPlanes()`, and the raw 3D collection getters. For each one, state either “delete in this wave” or “explicit residual to keep, with reason and named callers.”

## Non-blocking observations

- `proposal-restructure.md` is not preferred, but it is a legitimate fallback if a later review round demonstrates that `RuntimeSession` still retains too much read-model composition after the direct proposal is tightened.
- Validation should keep explicit evidence for `ProcessTreeNode.vue` recursive DTO behavior, not just process-port unit tests, because the stage objective called out the in-stage ProcessTreeNode correction.

## Recommended next step

**Corrections round required.**  
Revise `proposal-direct.md` in place to resolve the two blocking issues above, then run `cycle-027-review-round-02`. If those edits are made cleanly and scope remains bounded, this wave should be able to proceed to decision on the direct path.
