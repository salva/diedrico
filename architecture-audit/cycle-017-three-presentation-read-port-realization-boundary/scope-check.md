# Cycle 017 Scope Check — Three presentation read ports and realization boundary

## Status and source-control hygiene

This scout inspected current status/diff before writing proposals. The workspace is heavily dirty from pre-existing unrelated work: `git status --short` produced 1,219 entries in the targeted status log (`.saivage/tmp/command-logs/cycle017-status-head.stdout`), including unrelated `.saivage/*` plan/stage files, older audit artifacts, source changes under command/process/UI files, deleted e2e files, and forbidden secret/config paths listed as untracked. Those unrelated files were not read or reverted. A targeted diff stat over `architecture-audit`, `frontend/src`, `frontend/tests`, packages, backend, docs, and specs showed 50 dirty paths before this scout wrote Cycle 017 artifacts (`.saivage/tmp/command-logs/cycle017-diff-stat.stdout`).

This task made no production source changes, package/tooling changes, validation-run changes, backend changes, docs/spec changes, or secret/config reads. It only writes Cycle 017 audit artifacts and appends a proposed Wave 017 entry to `architecture-audit/wave-plan.md` because the current plan ends at Wave 016.

## Current plan and Wave 016 completion evidence

Wave 016 is explicitly complete: `architecture-audit/cycle-016-canvas-presentation-overlay-boundary/implementation-log.md` begins with `WAVE 016 COMPLETE`, says the selected direct path was implemented, lists green root/frontend lint, focused Vitest, full root/frontend Vitest, root/frontend build, root/frontend e2e, preview refresh, and focused live overlay/canvas browser evidence, and records no Wave 017 implementation was started. The same log names residual candidates in order: remaining concrete-`World` realization delegation inside `CanvasWorldReadPort`, typed interaction-query/test fixtures, and 3D scene interaction ownership.

The current `architecture-audit/wave-plan.md` tail contains Wave 016 as the final authored wave and has no Wave 017 entry (`.saivage/tmp/command-logs/cycle017-wave-plan-tail.stdout`). Therefore Cycle 017 must add a reviewed plan entry before any implementation can occur; this scope check/proposal set is the proposed plan edit plus implementation proposal set for review, not implementation.

## Re-ranked remaining risks after Wave 016

1. **Most central: 3D presentation/read-port and domain realization boundary.** Wave 016 put the 2D canvas presentation selector behind `CanvasWorldReadPort`, but 3D presentation still accepts the full mutable `World` and every 3D selector receives it. `ThreePresentationInput` is `{ world: World; displayOptions; selectedIds }` (`frontend/src/application/threePresentation/ThreePresentationModel.ts:1`, `frontend/src/application/threePresentation/ThreePresentationModel.ts:10`), and `ThreePresentationSelector` passes that full `World` into projection-plane, planar-element, reconstructed-element, guide, and hinge selectors (`frontend/src/application/threePresentation/ThreePresentationSelector.ts:17`, `frontend/src/application/threePresentation/ThreePresentationSelector.ts:20`, `frontend/src/application/threePresentation/ThreePresentationSelector.ts:21`, `frontend/src/application/threePresentation/ThreePresentationSelector.ts:22`, `frontend/src/application/threePresentation/ThreePresentationSelector.ts:23`, `frontend/src/application/threePresentation/ThreePresentationSelector.ts:24`). This is the closest remaining rendering/read-model analogue to Wave 016 and directly affects active user-visible 3D rendering.
2. **Still central and coupled to #1: duplicated realization read adapters.** `CanvasWorldReadPort` now exposes 2D/3D realization methods but its adapter still calls concrete runtime `World` through entity realization methods (`frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:14`, `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:21`, `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:24`, `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:46`, `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:49`, `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:50`, `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:51`). A domain-owned realization context already exists for projection-plane elements (`frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts:9`, `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts:14`, `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts:15`, `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts:16`, `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts:17`, `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts:18`, `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts:19`), but presentation adapters do not yet share a clear read-context boundary.
3. **Important but less central for the next wave: `styleService`/visibility cast.** `CanvasVisibilityPolicy` narrows the input to `Pick<World, 'getProcessTree'>` but immediately casts it back to `World` for `resolveVisibility` (`frontend/src/application/canvasPresentation/CanvasVisibilityPolicy.ts:1`, `frontend/src/application/canvasPresentation/CanvasVisibilityPolicy.ts:5`, `frontend/src/application/canvasPresentation/CanvasVisibilityPolicy.ts:7`, `frontend/src/application/canvasPresentation/CanvasVisibilityPolicy.ts:8`). This should be addressed only if it falls naturally out of the presentation read-context boundary; otherwise it risks broadening into process/style ownership.
4. **Deferred: 3D scene host interaction ownership.** `ThreeSceneHost` still owns `OrbitControls`, camera, renderer, labels, lights, animation, and registry access in one host (`frontend/src/rendering/threeView/ThreeSceneHost.ts:9`, `frontend/src/rendering/threeView/ThreeSceneHost.ts:10`, `frontend/src/rendering/threeView/ThreeSceneHost.ts:11`, `frontend/src/rendering/threeView/ThreeSceneHost.ts:12`, `frontend/src/rendering/threeView/ThreeSceneHost.ts:15`, `frontend/src/rendering/threeView/ThreeSceneHost.ts:37`, `frontend/src/rendering/threeView/ThreeSceneHost.ts:70`). However Wave 016 already made overlay pointer ownership explicit, and scene interaction is less central than removing full-`World` dependencies from 3D presentation selectors.
5. **Deferred: test-helper `any` seams.** Existing three-presentation tests inject selector spies using `as any` and local `any` helpers (`frontend/tests/unit/application/threePresentation/threePresentationSelector.spec.ts:12`, `frontend/tests/unit/application/threePresentation/threePresentationSelector.spec.ts:15`, `frontend/tests/unit/application/threePresentation/threePresentationSelector.spec.ts:18`). These should be fixed where touched by the 3D read-port boundary, not as a standalone test-cleanup wave.

## Selected Wave 017 scope

**Selected title:** Three presentation read ports and realization boundary.

**Scope:** active 3D presentation selectors/controllers/runtime and the minimum canvas read-port/domain realization context surface needed to avoid inventing a second full-World presentation adapter. The wave should align canvas and 3D presentation around explicit read ports/realization contexts while preserving existing rendering behavior.

**Why this is next by centrality:** It directly continues the central rendering/application boundary created in Wave 016. Leaving 3D presentation on full mutable `World` while 2D canvas uses a read port creates parallel presentation boundaries and preserves broad domain access in active selectors. Fixing this now gives later scene-host interaction and style/visibility cleanup a stable read model rather than another raw `World` path.

## Current-code premises

- `ThreeView.vue` is now a small shell and passes full `world` into `ThreeViewRuntime.refresh` (`frontend/src/components/panels/ThreeView.vue:28`, `frontend/src/components/panels/ThreeView.vue:41`, `frontend/src/components/panels/ThreeView.vue:42`, `frontend/src/components/panels/ThreeView.vue:46`).
- `ThreeViewRuntime.refresh` accepts `ThreePresentationInput` and delegates model building to `ThreePresentationController` before replacing scene groups (`frontend/src/rendering/threeView/ThreeViewRuntime.ts:1`, `frontend/src/rendering/threeView/ThreeViewRuntime.ts:10`, `frontend/src/rendering/threeView/ThreeViewRuntime.ts:21`, `frontend/src/rendering/threeView/ThreeViewRuntime.ts:22`, `frontend/src/rendering/threeView/ThreeViewRuntime.ts:23`, `frontend/src/rendering/threeView/ThreeViewRuntime.ts:27`).
- `ThreePresentationModel.ts` imports `World` and embeds it in `ThreePresentationInput` (`frontend/src/application/threePresentation/ThreePresentationModel.ts:1`, `frontend/src/application/threePresentation/ThreePresentationModel.ts:10`).
- `ProjectionPlane3DSelector`, `PlanarElement3DSelector`, and `ReconstructedElement3DSelector` currently import `World` and call broad world/domain methods directly (`frontend/src/application/threePresentation/ProjectionPlane3DSelector.ts:2`, `frontend/src/application/threePresentation/ProjectionPlane3DSelector.ts:11`, `frontend/src/application/threePresentation/ProjectionPlane3DSelector.ts:15`, `frontend/src/application/threePresentation/PlanarElement3DSelector.ts:2`, `frontend/src/application/threePresentation/PlanarElement3DSelector.ts:8`, `frontend/src/application/threePresentation/ReconstructedElement3DSelector.ts:2`, `frontend/src/application/threePresentation/ReconstructedElement3DSelector.ts:8`).
- Existing projection realization context interfaces already describe the read capabilities needed by many 2D realization methods, but presentation read ports still couple to concrete runtime `World` for adapter realization (`frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts:9`, `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts:20`, `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:46`, `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:51`).

## Invalidated assumptions from older plan entries

The old baseline risks remain directionally useful, but the literal old Wave 007/008/009 premises are already invalidated by Waves 015–016: the active 2D presentation path is already `canvasPresentation/*`, `ThreeView.vue` is already a shell over `ThreeViewRuntime`, and the current next risk is not another broad rendering extraction. Wave 017 must not revive obsolete assumptions about `PaperService`, a 1,200-line `ThreeView.vue`, or `App.vue` as the next central god-module.

## Explicit out of scope

- No source implementation in this scout stage.
- No command/undo/persistence, backend, docs/spec, package/tooling, validation-platform, Drive/local project, or app-shell redesign.
- No broad scene-host/OrbitControls redesign except recording it as a residual.
- No broad process-tree/style-service redesign unless the selected reviewed proposal explicitly narrows `CanvasVisibilityPolicy`/visibility port as a tiny deletion with focused tests.
- No sweeping `any` cleanup outside touched presentation tests/selectors.
- No deletion/rewrite of unrelated dirty files or forbidden `.saivage` secret/config reads.

## Validation requirements for the future implementation stage

- Pre-edit static scans for full-`World` imports/API in `frontend/src/application/threePresentation`, remaining concrete realization delegation in `CanvasWorldReadPort`, presentation `as any` seams, and 3D scene interaction residuals.
- Focused Vitest for three-presentation selectors/controller/runtime boundary and canvas read-port/realization-context behavior if touched.
- Root and frontend lint where defined.
- Full root and frontend Vitest.
- Root and frontend build.
- Root/frontend Playwright e2e because active 3D/canvas rendering is user-observable.
- Live preview refresh on `0.0.0.0:5173`, HTTP 200 probe, and focused live browser evidence for 3D view rendering plus 2D canvas still rendering projected/planar objects.

## Wave-plan edit status

A Wave 017 entry is appended to `architecture-audit/wave-plan.md` in this scout task because the current plan ends at Wave 016. That edit is a proposal and requires canonical review in `cycle-017-review-round-01` before any implementation.
