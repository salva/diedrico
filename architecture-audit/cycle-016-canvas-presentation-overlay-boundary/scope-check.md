# Cycle 016 Scope Check — Canvas presentation and overlay interaction boundary

## Status

- **Cycle:** `cycle-016-canvas-presentation-overlay-boundary`
- **Stage:** fresh scout/proposals only
- **Source implementation:** none in this stage
- **Next canonical stage:** `cycle-016-review-round-01`
- **Wave-plan disposition:** the existing `architecture-audit/wave-plan.md` entries through Wave 015 have already been materially executed by prior cycles. This scope is now represented by a corrected post-Wave-015 Wave 016 entry in `architecture-audit/wave-plan.md`; the corrected entry and proposals require `cycle-016-review-round-02` before any source change.

## Workspace and recent completion evidence inspected first

Current dirty-work inspection was performed before selecting scope. The narrow diff stat captured in `architecture-audit/cycle-016-scout-source-probes/git-diff-stat.stdout` showed only the selected inspected paths with changes in `frontend/src/App.vue` and two deleted stale e2e specs; broad inherited dirty Saivage/audit/source work exists and was not reverted.

Recent completion logs establish that Wave 014 validation-contract ownership and Wave 015 TypeScript/build-contract convergence are closed:

- Wave 014 final closure reports root/frontend lint, focused Vitest, full Vitest, root/frontend build, root/frontend e2e, focused Playwright, invalid-artifact audit, and live preview evidence green under `architecture-audit/cycle-014-validation-contract-ownership/implementation-log.md`.
- Wave 015 final retry reports root/frontend lint, focused Wave 015 Vitest, full root/frontend Vitest, root/frontend build, root/frontend e2e, frontend e2e, and live preview refresh/reachability green under `architecture-audit/cycle-015-typescript-build-contracts/implementation-log.md`.
- Wave 015 also records an explicit residual user-observable behavior: the current 3D overlay occupies lower-right canvas area and intercepts pointer events there; e2e was adjusted to click outside the overlay rather than fixing the boundary in the validation-contract cleanup.

## Re-ranked remaining risks after Wave 015

1. **Canvas presentation / overlay interaction boundary (selected).** Central because it sits between active user input, 2D rendering selectors, 3D overlay behavior, hit-testing, snapping, and validation. Current code has extracted selectors/controllers, but the 2D selector still receives the raw `World`, imports concrete domain classes, contains `any` helper seams, and couples projected 3D element rendering into the 2D selector. Current runtime behavior also has overlay hit interception that tests route around rather than owning as an app interaction boundary.
2. **App-shell services residuals.** Current `App.vue` is much smaller than the baseline god-shell and composes `runtime.world` plus `runtime.actions` (`frontend/src/App.vue:30`, `frontend/src/App.vue:142`), so this is less central than the still-active canvas/overlay interaction boundary.
3. **Backend contract stance.** Current script discovery during Wave 015 found `backend/package.json` missing, and root scripts delegate to frontend only (`package.json:13`, `package.json:16`, `package.json:21`). This looks mostly resolved by deletion/contract convergence rather than the next central runtime risk.
4. **Root validation gates.** Wave 014/015 logs show root/frontend lint/build/test/e2e green; remaining validation work should follow source-boundary changes rather than precede them.
5. **Placeholder/debug surfaces and docs/spec drift.** Earlier cycles already deleted large stale e2e validation theater and docs/spec work was completed in Cycle 013. Remaining docs updates should follow new structural changes, not lead them.

## Current-code evidence for selected scope

The selected scope is grounded in current source, not stale baseline assumptions:

- `SvgCanvas.vue` is now a shell over a canvas presentation controller, but still injects the raw `World` and passes it directly to presentation and interaction surfaces (`frontend/src/components/workspace/SvgCanvas.vue:411`, `frontend/src/components/workspace/SvgCanvas.vue:417`, `frontend/src/components/workspace/SvgCanvas.vue:550`).
- `SvgCanvas.vue` constructs SVG primitives through `SVGRenderer` from the presentation model (`frontend/src/components/workspace/SvgCanvas.vue:183`, `frontend/src/components/workspace/SvgCanvas.vue:254`, `frontend/src/components/workspace/SvgCanvas.vue:574`, `frontend/src/components/workspace/SvgCanvas.vue:586`, `frontend/src/components/workspace/SvgCanvas.vue:598`).
- `CanvasPresentationController` exposes a `buildModel(world: World, ...)` API rather than a narrow canvas read port (`frontend/src/application/canvasPresentation/CanvasPresentationController.ts:1`, `frontend/src/application/canvasPresentation/CanvasPresentationController.ts:7`).
- `CanvasPresentationSelector` imports concrete domain classes and the full `World` (`frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts:2`, `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts:3`, `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts:4`, `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts:5`) and directly builds primitives/styles/visibility in one selector (`frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts:30`, `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts:39`, `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts:46`, `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts:62`).
- `CanvasPresentationSelector` still has broad helper seams: `item(primitive: any, kind: any)` and `projected3D(world: World, planeTransforms: Map<string, any>)` (`frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts:76`, `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts:77`).
- Projected 3D drawing is embedded inside the 2D selector (`frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts:67`, `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts:82`, `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts:83`, `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts:84`), which makes the 2D canvas selector the owner of a cross-view projection concern.
- 3D presentation has its own DTO/controller boundary but still takes full `World` in the input model (`frontend/src/application/threePresentation/ThreePresentationModel.ts:1`, `frontend/src/application/threePresentation/ThreePresentationModel.ts:10`) and is consumed by a small `ThreeView.vue` runtime shell (`frontend/src/components/panels/ThreeView.vue:29`, `frontend/src/components/panels/ThreeView.vue:42`, `frontend/src/components/panels/ThreeView.vue:46`).
- `SVGRenderer` is now a focused primitive-to-SVG adapter (`frontend/src/services/SVGRenderer.ts:2`, `frontend/src/services/SVGRenderer.ts:23`, `frontend/src/services/SVGRenderer.ts:423`, `frontend/src/services/SVGRenderer.ts:457`), so the remaining risk is not SVG attribute rendering but selector/input/overlay boundary ownership.
- `Paper.ts` says the primitive module intentionally has no `World` dependency (`frontend/src/domain/presentation/Paper.ts:6`), but the mutable `Paper` collection still includes spatial-query responsibilities (`frontend/src/domain/presentation/Paper.ts:163`, `frontend/src/domain/presentation/Paper.ts:169`, `frontend/src/domain/presentation/Paper.ts:172`). Current canvas hit-testing now lives in `CanvasInteractionQuery`, so this mutable query collection may be an obsolete residual to delete or shrink.

## Premises

- Command/use-case leaks in `SvgCanvas.vue`, `ActionsPanel.vue`, and `Toolbar.vue` have been materially reduced by earlier cycles; current evidence shows toolbar history uses an application controller (`frontend/src/components/toolbars/Toolbar.vue:129`, `frontend/src/components/toolbars/Toolbar.vue:164`) and actions panel consumes current world/process state without command imports in the inspected lines.
- Rendering architecture has moved beyond the baseline `PaperService`/`RenderService` shape: `PaperService.ts` and `RenderService.ts` were not present in current source during the source probe, while `SVGRenderer.ts`, `canvasPresentation/*`, and `threePresentation/*` are active.
- The next meaningful improvement should not reopen broad rendering extraction. It should close the specific remaining boundary: selectors should consume narrow read ports/DTOs, cross-view projected 3D rendering should have an explicit owner, and overlay pointer interception should be either designed behavior or eliminated by layout/event-boundary ownership.

## Invalidated assumptions from the existing wave plan

- The original Wave 007 framing named `PaperService.ts` and `RenderService.ts`, but those files are absent in current source. A literal Wave 007 continuation is invalid.
- The original Wave 008 framing named a 1,201-line `ThreeView.vue`; current `ThreeView.vue` is a small runtime shell, so a broad 3D component extraction is invalid.
- The original Wave 009 app-shell god-component framing is mostly invalidated by current `App.vue` composition around `runtime` and `runtime.actions`.
- Therefore Cycle 016 requires a wave-plan edit entry before implementation rather than pretending to implement an already-completed/invalidated old wave.

## Selected bounded scope

Target files for proposal review:

- `frontend/src/application/canvasPresentation/CanvasPresentationController.ts`
- `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts`
- `frontend/src/application/canvasPresentation/CanvasPresentationModel.ts`
- `frontend/src/application/canvasPresentation/CanvasInteractionQuery.ts`
- `frontend/src/application/canvasPresentation/CanvasVisibilityPolicy.ts`
- `frontend/src/application/canvasPresentation/CanvasStylePolicy.ts`
- `frontend/src/application/threePresentation/*` only where needed to define shared projection/overlay DTO ownership
- `frontend/src/rendering/threeView/*` only where needed to align overlay event/layer behavior
- `frontend/src/components/workspace/SvgCanvas.vue`
- `frontend/src/components/panels/ThreeView.vue`
- `frontend/src/domain/presentation/Paper.ts`
- focused unit tests under `frontend/tests/unit/application/canvasPresentation/`, `frontend/tests/unit/application/threePresentation/`, and focused e2e/current UI contract tests if overlay behavior changes

## Explicit out of scope

- No command/operation/persistence refactor.
- No broad app-shell runtime redesign.
- No backend resurrection or backend validation work.
- No docs/spec reconciliation except a small implementation-log note for any deleted obsolete rendering/query surface.
- No broad visual redesign of the 3D panel. The user-visible behavior should remain equivalent except for making pointer ownership of overlapping 2D/3D regions deliberate and testable.
- No stale e2e coverage restoration; add only current-contract e2e if overlay/user behavior changes.

## Validation requirements for implementation stage

- Root and frontend lint.
- Focused Vitest for canvas presentation selector/query and any three-presentation shared DTO/overlay boundary changes.
- Full root/frontend Vitest.
- Root and frontend build.
- Root and frontend Playwright e2e if pointer/overlay/user-facing behavior changes.
- Live preview refresh on `0.0.0.0:5173`, HTTP reachability probe, and Playwright/live browser check for the canvas area currently affected by the 3D overlay.

## Recommendation

Proceed to `cycle-016-review-round-02` to review the corrected Wave 016 wave-plan entry and revised proposals in this directory. Do not implement until the review/decision stages accept the corrected Cycle 016 scope.
