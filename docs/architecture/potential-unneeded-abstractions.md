# Potential Unneeded Abstractions Audit

Audit date: 2026-06-05.

No code changes were made as part of this audit. The goal is to collect possible stale abstractions, wrappers, legacy comments, skipped old tests, and likely-unused exports for later review.

## High Confidence

- `frontend/src/commands/factories/ProjectionSetupFactory.ts`
  - `constructProjectionPlaneSetup` appears unused.
  - Its comments reference `InteractiveProjectionSetupTool` and `QuickProjectionSetupTool`, which no longer appear in active `src`.

- `frontend/src/commands/operations/viewState/ViewStateOperations.ts`
  - `SetActivePlaneOp`, `UpdateView2DOp`, and `TogglePlaneVisibilityOp` appear test-only or unused in production.
  - No active `src` consumers or descriptor registration were found.

- `frontend/src/commands/operations/viewState/index.ts`
  - Barrel re-export for apparently unused view-state operations.
  - No imports were found.

- `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts`
  - `ProjectionOwnerPlaneQuery` appears unused.
  - Only its declaration was found.

- `frontend/src/rendering/svg/SVGRenderer.ts`
  - `renderPaper` appears unused.
  - Only its export was found.

- `frontend/src/domain/world/World.ts`
  - Lines around `458-467` contain orphaned or stale deprecated JSDoc for removed facade/getter methods.

- `frontend/src/domain/world/Line.ts`
  - Stale TODO comments for `Line2DParallel` and `Line2DPerpendicularToLine`.
  - The classes now exist and are implemented.

- `frontend/tests/unit/domain/projectionPlaneRealization.spec.ts`
  - Skipped tests preserve removed `World.get*Realization()` and dual-storage migration behavior.

- `frontend/tests/unit/domain/world.spec.ts`
  - Skipped legacy block references removed `addIntersectionPoint2DWithSibling` behavior.

- `frontend/tests/integration/pointCreation.spec.ts`
  - Entire skipped suite appears tied to old hardcoded-ID phases.

- `frontend/tests/unit/domain/plane.spec.ts`
  - Skipped tests target removed `createPH` and `createPV` static methods.

- `frontend/tests/integration/semanticReferences.spec.ts`
  - Skipped tests reference removed `world.getHorizontalOrigin()` and `world.getVerticalOrigin()` APIs.

## Medium Confidence

- `frontend/src/domain/processTree/actions/*.ts`
  - Many files are one-function convenience wrappers around generic `createAction()`.
  - Some may still provide useful semantic names, but they are thin remnants from a generic-action refactor.

- `frontend/src/domain/processTree/actions/CreateIntersectionPointAction.ts`
  - Generic `createIntersectionPointAction()` appears unused while specific intersection action creators exist.

- `frontend/tests/helpers/worldHelpers.ts`
  - Internal names such as `getLegacyWorldDependencies`, `getLegacyWorldRealizations`, and related WeakMaps are functional test shims.
  - The `LegacyWorld` naming now looks stale after explicit context cleanup.

- `frontend/src/domain/world/index.ts`
  - Barrel exports appear unused in active `src`.
  - Consumers import concrete modules directly.

- `frontend/src/commands/operations/world/index.ts`
  - Barrel appears unused and likely stale or incomplete compared to newer operation files.

- `frontend/src/application/toolbar/ToolbarHistoryController.ts`
  - `ToolbarHistoryController` and `createToolbarHistoryController` mostly pass through to `ToolbarHistoryUseCases`.

- `frontend/src/application/processHistory/ProcessHistoryController.ts`
  - Pass-through facade over `ProcessHistoryUseCases`.

- `frontend/src/application/canvas/CanvasStyleUseCase.ts`
  - One-method class wrapping a single `executeToolCommand` call.

- `frontend/src/application/canvas/CanvasPointMovementUseCase.ts`
  - Thin use case around movement preview sessions.
  - It may still be useful as a UI boundary.

- `frontend/src/application/tools/CanvasToolController.ts`
  - Aggregator facade over construction, movement, and style use cases.
  - It may still be useful as an application boundary.

- `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts`
  - `buildCanvasPresentationModel()` just instantiates `CanvasPresentationSelector`.
  - The selector class has one stateless method.

- `frontend/src/commands/factories/PointSequenceFactory.ts`
  - Static-only class with one factory method.
  - It could likely be a function.

- `frontend/src/commands/factories/CircleSequenceFactory.ts`
  - Static-only class with one factory method.
  - It could likely be a function.

## Lower Confidence

- `frontend/src/config/toolFamilies.ts`, `frontend/src/application/tools/ToolTypes.ts`, `frontend/src/tools/ToolCommandIntents.ts`
  - Tool IDs such as `transport`, `quickprojectionsetup`, `quick3dline`, `quick3dsegment`, and `interactiveprojectionsetup` appear disabled or unsupported in current creation/use-case paths.
  - These may be intentional future UI entries.

- `frontend/src/domain/world/elements/BrokenHalfHingeLine2D.ts`
  - Comment says `siblingHalfHingeLineId` uses the same field name for compatibility.
  - This may be a harmless polymorphic adapter, but it is compatibility-shaped.

- `frontend/src/utils/coordinateTransform.ts`
  - Some exported helpers appear used mostly internally and by tests.
  - They may not need to be public exports unless treated as utility API.

## Verification Notes

- Search found `0` test calls to `createProjectionConstructionService(world)` after the latest cleanup.
- Search found `7` remaining exact test calls to `buildOperationContext(world, visibilityModel)`, all in setup or fixture construction paths.
- This document is an audit list only. Each item should be reviewed before deletion or simplification.
