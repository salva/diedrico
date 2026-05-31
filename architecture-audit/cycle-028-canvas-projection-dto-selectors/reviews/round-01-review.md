# Cycle 028 Review — Round 01

## Scope and evidence checked

Reviewed against:

- `architecture-audit/cycle-028-canvas-projection-dto-selectors/scope-check.md`
- `architecture-audit/cycle-028-canvas-projection-dto-selectors/proposals/proposal-direct.md`
- `architecture-audit/cycle-028-canvas-projection-dto-selectors/proposals/proposal-restructure.md`
- `architecture-audit/cycle-028-canvas-projection-dto-selectors/critique/round-01-critique.md`
- `architecture-audit/wave-plan.md` Wave 028 entry
- `architecture-audit/cycle-028-wave-plan-extension/plan-extension-note.md`
- `architecture-audit/cycle-027-runtime-read-model-extractors/implementation-log.md`
- current source seams in:
  - `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts`
  - `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts`
  - `frontend/src/application/canvasPresentation/Projected3DCanvasSelector.ts`
  - `frontend/src/application/threePresentation/ThreeWorldReadPort.ts`
  - `frontend/src/application/appShell/RuntimeSession.ts`

Path-scoped source-control checks confirm unrelated dirty source remains in `frontend/src/domain/calculations/Intersections.ts` and `frontend/src/domain/processTree/ActionGroup.ts`; this review does not incorporate or ask to revert those edits. No implementation/source changes were made for this review.

## Source-control and protected-scope assessment

- Path-scoped `git status --short` shows only unrelated dirty source in `Intersections.ts` and `ActionGroup.ts`, plus the untracked Cycle 028 critique directory.
- Path-scoped diff stat shows only those two unrelated source files currently differ in the inspected scope.
- The proposals correctly keep protected surfaces out of scope: persistence schema/replay, backend/docs/specs/package tooling, Drive/auth, command history/producer redesign, broad app-kernel/generic facade work, UI feature work, and broad domain rewrite.
- The proposal set also respects the Wave 027 residual boundary: `CanvasWorldReadPort.getProcessTree()` remains deleted, and no proposal reopens process-tree-shaped canvas visibility.

## Current seam verification

The current-source evidence supports the wave premise:

- `CanvasWorldReadPort` still publicly exposes raw projection-plane traversal, raw 3D collection getters, and public realization methods (`frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:16-29`).
- `CanvasPresentationSelector` still loops raw projection planes and per-plane raw 2D entities, performs `instanceof` classification, and builds render/query primitives directly (`frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts:27-89`).
- `Projected3DCanvasSelector` still owns the nested plane × raw-3D traversal and realization/projection loop (`frontend/src/application/canvasPresentation/Projected3DCanvasSelector.ts:14-70`).
- `RuntimeSession.getPlaneTransformsForInput()` still duplicates raw projection-plane traversal for input transforms (`frontend/src/application/appShell/RuntimeSession.ts:44-51`).
- `ThreeWorldReadPort` remains internally broad and duplicates realization-context assembly, but its public surface is already behavior-named (`frontend/src/application/threePresentation/ThreeWorldReadPort.ts:56-79`, `81-135`).

## Proposal scoring

### Proposal Direct — `proposals/proposal-direct.md`

1. **Advances the wave target outcome:** PASS  
   Directly targets the residual public raw canvas seams and keeps the design centered on behavior-sized canvas DTO/read methods rather than a generic world facade.

2. **Improves architecture and code quality:** PASS  
   Moves traversal, realization ownership, and line-kind classification behind a narrower adapter/selector boundary; this matches the next central cleanup left by Wave 027.

3. **Respects no-backcompat / aggressive deletion priorities:** PASS  
   Explicitly deletes raw getter seams, public `realize*` methods, raw selector loops, stale mocks, and any dual raw-and-DTO paths.

4. **Avoids overfeaturism:** PASS  
   Stays out of persistence, command history, broad domain redesign, UI features, package/tooling, and large 3D scene work.

5. **Risks / hidden regressions:** PASS WITH CAUTION  
   Correctly identifies transform/input drift, render/query drift, visibility regression, DTO-facade risk, and pointer-boundary regression. The proposal stays safe as long as implementation preserves all-or-nothing deletion for the raw 3D getter trio and does not broaden into unrelated read-model cleanup.

6. **Validation sufficiency:** PASS  
   Validation plan is consistent with the required runbook: focused Vitest, full lint/test/build, e2e/overlay coverage, static scans, preview refresh, and live smoke evidence.

### Proposal Restructure — `proposals/proposal-restructure.md`

1. **Advances the wave target outcome:** PASS, but less directly  
   It can still achieve the target, but only if duplicate realization-context ownership is proven to be the actual blocker to deleting the canvas raw seams.

2. **Improves architecture and code quality:** PASS  
   A narrow shared realization-context factory could remove duplicated adapter setup cleanly.

3. **Respects no-backcompat / aggressive deletion priorities:** PASS  
   Keeps the same canvas seam deletions mandatory and also deletes duplicate local context helpers if introduced.

4. **Avoids overfeaturism:** PASS WITH CAUTION  
   The proposal includes explicit stop conditions, but it is inherently easier to over-expand because it touches a higher conceptual layer and may pull `ThreeWorldReadPort` into the wave.

5. **Risks / hidden regressions:** WARNING  
   The highest risk is architectural broadening into a new application-level facade or a de facto general `World` helper. This proposal is acceptable only if implementation can prove the shared factory remains a tiny typed context factory and does not start collecting world-shaped convenience behavior.

6. **Validation sufficiency:** PASS  
   Includes the direct proposal’s validation plus extra scans for the shared factory boundary.

## Preferred decision direction

Prefer **Proposal Direct** for `cycle-028-decision` unless a follow-up design edit proves that direct canvas DTO deletion cannot be done cleanly without first extracting a tiny shared realization-context factory. Current source evidence shows the sharper central seam is the active canvas raw traversal contract, while `ThreeWorldReadPort` is still a residual rather than the main public leak.

## Blocking issues

None.

## Non-blocking concerns / decision notes

- If the Manager selects Proposal Restructure, the decision must restate that the shared realization-context module is allowed only as a tiny typed factory and not as a broad read facade.
- Implementation must preserve Wave 025–027 invariants explicitly: no process-tree visibility leak, no generic `RuntimeWorld`/`WorldReadModel`, no Vue concrete `World`, no partial deletion of the raw 3D getter trio, and no regression of the 3D overlay pointer-boundary contract.
- `RuntimeSession.getPlaneTransformsForInput()` is a legitimate adjacent seam for de-duplication, but proposals correctly keep `screenTo3D`, tool command producers, and other command/runtime concerns out of scope.

## Recommendation

Round 01 returns **no blocking issues**. Proceed to `cycle-028-decision`, with **Proposal Direct** as the preferred implementation choice and Proposal Restructure kept as fallback only if a tiny shared realization-context factory is proven necessary during decision/implementation planning.
