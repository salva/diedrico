# Wave 007 current rendering evidence — 2D selectors and renderer adapters

Access date: 2026-05-26. Scope: current post-Waves 006a/006b source tree only; no application source was modified.

## Executive summary

Wave 007 premises still hold. The active 2D rendering path is `SvgCanvas.vue → PaperService → Paper primitives → SVGRenderer`, but it is not yet a clean selector/adapter boundary:

- `SvgCanvas.vue` already delegates command construction through Wave 006a controllers, but still builds rendering context directly from `World`, `Paper`, selection/view stores, and plane transforms, then stores generated primitives back into `Paper` for hit testing (`frontend/src/components/workspace/SvgCanvas.vue:566-609`).
- `PaperService` is the main raw-domain rendering hotspot: its public `PrimitiveContext` takes `world: World`, it iterates `context.world.projectionPlanes`, calls `plane.realize*2D(..., context.world)`, resolves visibility via `styleService`, branches on domain classes with `instanceof`, and contains TODO/debug branches (`frontend/src/services/PaperService.ts:59-71`, `frontend/src/services/PaperService.ts:117-207`).
- `Paper.ts` is not a pure presentation primitive collection: hit testing takes `world: World`, reaches back into `world.projectionPlanes`, and recomputes point/line/circle realizations from the active domain plane (`frontend/src/domain/presentation/Paper.ts:331-460`). This is a second raw-domain leak in the canvas/hit path.
- `SVGRenderer` is comparatively close to a renderer adapter: it imports only primitives/util vectors, applies viewport transforms, and maps `Primitive` variants to SVG attributes (`frontend/src/services/SVGRenderer.ts:24-38`, `frontend/src/services/SVGRenderer.ts:423-462`). It still has a hardcoded infinite-line clipping viewport TODO (`frontend/src/services/SVGRenderer.ts:203-220`).
- `RenderService.ts` is explicitly obsolete/test-oriented production code: `renderPlane()` and `renderLine()` comments state production uses `SVGRenderer`, while tests still import and exercise it (`frontend/src/services/RenderService.ts:111-119`, `frontend/src/services/RenderService.ts:163-184`; `frontend/tests/unit/services/renderService.spec.ts:14-21`). It is a strong DELETE candidate.
- Existing tests cover current `PaperService` behavior but encode raw-domain service/context shapes and include placeholder/skipped rendering tests, so Wave 007 should replace or refocus them around selector DTOs and renderer adapters (`frontend/tests/unit/services/paperService.spec.ts:9-16`, `frontend/tests/unit/services/paperService.spec.ts:497-516`, `frontend/tests/unit/services/renderService.spec.ts:107-124`).

## Current active 2D rendering pipeline

1. `SvgCanvas.vue` imports `World`, `Paper`, `PaperService`, `SVGRenderer`, tools, stores, and controller boundaries in one component (`frontend/src/components/workspace/SvgCanvas.vue:181-213`).
2. Template rendering is split by primitive type: lines, segments, guides, circles, arcs, and points are rendered via `rendered*` computed arrays (`frontend/src/components/workspace/SvgCanvas.vue:29-69`).
3. The `primitives` computed builds `PrimitiveContext` directly from the domain `world`, plane transforms, hover/selection/cascade IDs, active plane, and projected-3D toggle, calls `paperService.generatePrimitives(context)`, sorts by layer/z-index, and writes the primitives into `paper` for spatial queries (`frontend/src/components/workspace/SvgCanvas.vue:566-609`).
4. Each `rendered*` computed filters primitives by type/id and calls `svgRenderer.renderPrimitive(p, viewport.value)` (`frontend/src/components/workspace/SvgCanvas.vue:1076-1156`).
5. Selection, dragging, double-click properties, and hover/snap use `paper.hitTest(..., world, selectionMask)` from the canvas event handlers (`frontend/src/components/workspace/SvgCanvas.vue:1210-1227`, `frontend/src/components/workspace/SvgCanvas.vue:1350-1370`, `frontend/src/components/workspace/SvgCanvas.vue:1541-1567`).

Wave 006a/006b impact: command construction has been moved out of `SvgCanvas.vue`, `ActionsPanel.vue`, and `Toolbar.vue` according to the implementation logs. Therefore Wave 007 should not preserve any old UI command-construction responsibility in rendering selectors; selectors should consume read-only domain/application state and emit render/hit DTOs only.

## PaperService evidence

`PaperService` is currently both selector and primitive factory:

- `PrimitiveContext` exposes the raw `World`, `Matrix3` plane transforms, hover/selection/cascade IDs, active plane, snap target, and projected-3D toggle (`frontend/src/services/PaperService.ts:59-68`).
- It imports concrete domain classes/types (`HalfHingeLine2D`, `FreePoint2D`, `Segment2DByPoints`, `Guide2D`, `SiblingGuide2D`, `World`) plus presentation primitives and visibility service (`frontend/src/services/PaperService.ts:32-43`, `frontend/src/services/PaperService.ts:71-72`).
- `generatePrimitives()` directly walks `context.world.projectionPlanes.values()`, then `plane.getAllPoints()`, `plane.getAllLines()`, and `plane.getAllCircles()` (`frontend/src/services/PaperService.ts:117-142`, `frontend/src/services/PaperService.ts:186-199`).
- It calls `resolveVisibility(element, context.world)` and `plane.realizePoint2D/realizeLine2D/realizeCircle2D(..., context.world)` inside rendering (`frontend/src/services/PaperService.ts:127-131`, `frontend/src/services/PaperService.ts:143-151`, `frontend/src/services/PaperService.ts:188-192`).
- It branches on raw domain subclasses for half-hinge lines, segments, guides/sibling guides, and free points (`frontend/src/services/PaperService.ts:145-166`, `frontend/src/services/PaperService.ts:241`, `frontend/src/services/PaperService.ts:274-284`).
- It still uses `any` to read guide `arcGeometry`, another raw-domain special case (`frontend/src/services/PaperService.ts:169-172`).
- It contains routine debug logging for half-hinge rendering (`frontend/src/services/PaperService.ts:145-158`) and TODOs for element visibility and missing element-type updates (`frontend/src/services/PaperService.ts:202`, `frontend/src/services/PaperService.ts:238`, `frontend/src/services/PaperService.ts:343`, `frontend/src/services/PaperService.ts:437`, `frontend/src/services/PaperService.ts:610`, `frontend/src/services/PaperService.ts:888`).
- `updateEntity()` is point-only incremental update code and explicitly TODOs lines/circles (`frontend/src/services/PaperService.ts:866-889`).
- 3D projection display is embedded in the 2D PaperService and directly iterates `world.getAllProjectionPlanes()`, `world.getAll3DPoints()`, `world.getAll3DLines()`, and `world.getAll3DSegments()` (`frontend/src/services/PaperService.ts:902-990`). Wave 007 should decide whether this remains a selector output or becomes a separate projected-3D selector feeding the same primitive adapter.

## SVGRenderer evidence

`SVGRenderer` is already close to the desired adapter layer:

- It imports primitive types from `domain/presentation/Paper` and a vector utility, not domain world types (`frontend/src/services/SVGRenderer.ts:21-38`).
- `ViewportTransform` is a narrow DTO with `zoom`, `panX`, and `panY` (`frontend/src/services/SVGRenderer.ts:45-48`).
- `renderPrimitive()` maps discriminated primitive variants to SVG element/attribute records (`frontend/src/services/SVGRenderer.ts:423-450`).
- `renderPaper()` filters visible primitives and renders each primitive (`frontend/src/services/SVGRenderer.ts:454-462`).
- The main adapter smell is hardcoded infinite-line viewport bounds with a TODO to get actual canvas dimensions (`frontend/src/services/SVGRenderer.ts:203-220`). Wave 007 selectors/adapters should make clipping bounds explicit.

## Paper presentation model and hit testing evidence

`Paper.ts` defines the current primitive DTOs, but also owns domain-aware hit testing:

- Primitive interfaces include `sourceEntityId`, optional `planeId`, `layer`, `visible`, and fully resolved `style` (`frontend/src/domain/presentation/Paper.ts:79-88`).
- Point/line/segment/circle/path/arc/text primitives are already discriminated by `type` and use paper-space coordinates (`frontend/src/domain/presentation/Paper.ts:94-180`).
- `Paper.hitTest()` accepts raw `World`, `activePlaneId`, `paperToPlaneTransform`, and selection mask (`frontend/src/domain/presentation/Paper.ts:331-338`).
- Hit testing reaches into `world.projectionPlanes.get(activePlaneId)` and iterates active-plane points, lines, and circles, recomputing realizations with `activePlane.realize*2D(..., world)` (`frontend/src/domain/presentation/Paper.ts:363-379`, `frontend/src/domain/presentation/Paper.ts:401-441`).
- Comments state segments, guides, and hinge lines are handled through the line subclass path (`frontend/src/domain/presentation/Paper.ts:459-460`), so hit DTOs must preserve those selection semantics if raw-domain hit testing is extracted.

Implication: a complete Wave 007 should not stop at `PaperService`; it should introduce render/hit selector DTOs or a presentation read model so `Paper` no longer requires `World` for hit testing in the active canvas path.

## Style and visibility selector evidence

`styleService.ts` is already a domain-level visibility resolver, but not a rendering selector DTO:

- It imports `Element`, `World`, and `ProcessTree` structures (`frontend/src/domain/world/styleService.ts:12-14`).
- `resolveVisibility(element, world)` checks element `visualStyle.visible`, queries `world.getProcessTree()`, and walks subprocess/action paths (`frontend/src/domain/world/styleService.ts:58-110`).
- `PaperService` calls this resolver inline while rendering points, lines, and circles (`frontend/src/services/PaperService.ts:127-128`, `frontend/src/services/PaperService.ts:143-148`, `frontend/src/services/PaperService.ts:187-190`).

Implication: Wave 007 should make visibility/style an explicit selector output (for example `Renderable2DItem.visible`, `style`, `interactionRole`, `planeId`) rather than leaving process-tree visibility scattered through renderer internals.

## RenderService deletion evidence

`RenderService.ts` is active source but appears to be a test-only/legacy production rendering surface:

- It imports raw domain point/plane/world types and transforms domain objects directly to SVG attributes (`frontend/src/services/RenderService.ts:22-33`, `frontend/src/services/RenderService.ts:58-89`).
- Comments on `renderPlane()` and `renderLine()` explicitly say they are only used in tests and production rendering uses `SVGRenderer` (`frontend/src/services/RenderService.ts:111-119`, `frontend/src/services/RenderService.ts:163-184`).
- `frontend/tests/unit/services/renderService.spec.ts` imports `renderPoint`, `renderPlane`, `renderLine`, `applyHoverState`, and `applySelectionState` from `RenderService` (`frontend/tests/unit/services/renderService.spec.ts:14-21`).
- Several `renderPlane` tests are skipped because plane rendering moved to view/config layers (`frontend/tests/unit/services/renderService.spec.ts:107-124`, `frontend/tests/unit/services/renderService.spec.ts:300-304`).

DELETE recommendation for proposals: remove `RenderService.ts` and `renderService.spec.ts` or replace with adapter tests against the new SVG renderer/selector DTO contract. Do not preserve a compatibility shim.

## Current rendering test coverage and gaps

Current coverage:

- `paperService.spec.ts` builds a full `World`, constructs `PrimitiveContext`, and asserts point primitive generation, hover/snap styling, transform presence, style differences, `Paper` integration, and active-plane opacity (`frontend/tests/unit/services/paperService.spec.ts:9-16`, `frontend/tests/unit/services/paperService.spec.ts:40-219`, `frontend/tests/unit/services/paperService.spec.ts:272-335`, `frontend/tests/unit/services/paperService.spec.ts:346-565`).
- `projectionDisplay.spec.ts` covers `PaperService` projected-3D primitive generation and directly imports command/operation classes in test helpers (`frontend/tests/unit/services/projectionDisplay.spec.ts:9-18`, `frontend/tests/unit/services/projectionDisplay.spec.ts:86-247`).
- `canvasToolControllers.spec.ts` includes a Wave 006a static assertion that `SvgCanvas` remains on the command-controller boundary for movement/style delegation (`frontend/tests/unit/application/canvasToolControllers.spec.ts:239-261`).

Gaps/smells:

- Tests mostly assert the current raw `World → PrimitiveContext → PaperService.generatePrimitives()` contract, not a selector DTO boundary.
- `paperService.spec.ts` has a placeholder guide opacity test (`frontend/tests/unit/services/paperService.spec.ts:497-516`).
- `renderService.spec.ts` preserves a legacy/test-only renderer and skipped tests (`frontend/tests/unit/services/renderService.spec.ts:107-124`, `frontend/tests/unit/services/renderService.spec.ts:300-304`).
- Existing e2e suite remains known malformed from Wave 006a/006b validation logs, so Wave 007 proposals must include focused Vitest plus mandatory attempted Playwright/e2e/live-preview validation with blocker classification if unchanged.

## Proposal inputs for coder

A direct proposal should likely change or add:

- New selector/read-model module(s), e.g. `frontend/src/application/rendering/Rendering2DSelectors.ts` or `frontend/src/domain/presentation/Renderable2D.ts`, producing explicit DTOs for renderable points/lines/segments/circles/guides/hinges/arcs/projected-3D items and hit-test candidates.
- Refactor `PaperService.ts` into a renderer adapter that maps selector DTOs to `Paper` primitives, or rename/split it so selector and primitive adapter responsibilities are separate.
- Refactor `Paper.ts` hit testing to consume hit-test DTOs/primitives, not `World`.
- Keep `SVGRenderer.ts` as the SVG adapter but make clipping bounds explicit instead of hardcoded.
- Update `SvgCanvas.vue` to request selector DTOs and pass them to renderer/hit adapters, without direct raw-domain rendering walks.
- Update tests from `PaperService` raw-world tests to selector contract tests, adapter tests, Paper hit tests, and SvgCanvas static boundary tests.

Aggressive DELETE candidates:

- `frontend/src/services/RenderService.ts` and `frontend/tests/unit/services/renderService.spec.ts`.
- `PaperService.updateEntity()` point-only incremental path if no active caller needs it after full selector regeneration (`frontend/src/services/PaperService.ts:866-889`).
- Half-hinge debug logging in `PaperService` and `SvgCanvas` (`frontend/src/services/PaperService.ts:145-158`, `frontend/src/components/workspace/SvgCanvas.vue:1090-1100`).
- Obsolete rendering TODO branches replaced by explicit selector behavior.
- Placeholder/skipped tests that encode deleted render-plane behavior.

Validation to require in proposals:

- Focused Vitest for selector DTO generation, Paper primitive adapter mapping, SVGRenderer viewport/clipping, Paper/hit behavior, style/visibility outputs, and projected-3D toggle behavior.
- Static architecture tests or focused source assertions proving `SvgCanvas.vue`, `Paper.ts`, and renderer adapters do not reach through to raw domain internals for rendering/hit paths beyond the intended selector boundary.
- Existing canvas behavior coverage: construction, selection, snap-adjacent/hit behavior, style/property updates, undo/redo, active-plane opacity, projected-3D toggle.
- Mandatory full cadence: root/workspace lint, focused Vitest, full Vitest, root/workspace build, frontend e2e/Playwright or explicit classification if the known e2e parse blockers remain, and live preview refresh/reachability probe.

## Remaining wave ordering / rerank note

After Waves 006a/006b, command-controller leaks in the active canvas/panel/toolbar surfaces are no longer the central blocker. Wave 007 can proceed without a wave-plan edit: rendering selectors/adapters are now the next central presentation boundary before Wave 008 3D rendering adapters and Wave 009 app shell extraction. The only scope caution is that Wave 007 should not accidentally resurrect or preserve old command-construction responsibilities in selectors; it should treat the Wave 006 controller/use-case boundary as fixed input.
