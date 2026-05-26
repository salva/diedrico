# Wave 007 Scope Check — Extract 2D rendering selectors and renderer adapters

**Stage:** `cycle-007-fresh-scout-proposals`  
**Wave:** 007 — Extract 2D rendering selectors and renderer adapters  
**Result:** Wave 007 can proceed without editing `architecture-audit/wave-plan.md`.

## Scope verdict

The Wave 007 premise still holds after Waves 006a and 006b: the active 2D canvas path no longer owns central command construction for tools/panel/toolbar, but it still couples Vue, domain traversal, Paper primitives, SVG conversion, style/visibility resolution, and hit-testing through raw `World`/projection-plane access. The next central improvement is therefore to extract explicit 2D render-selector DTOs and renderer adapters rather than preserving `PaperService` as the domain-to-SVG decision point.

No application source should be changed in this scout/proposal stage. The implementation wave should target source changes only after review convergence.

## Current rendering path evidence

### `SvgCanvas.vue` remains the orchestration point

- The component template renders SVG groups by primitive buckets (`renderedLines`, `renderedSegments`, `renderedGuides`, `renderedCircles`, `renderedArcs`, `renderedPoints`) directly in `frontend/src/components/workspace/SvgCanvas.vue:31`, `:38`, `:45`, `:52`, `:59`, and `:66`.
- Its file-level comments describe the current pipeline as `World → PaperService → SVGRenderer → SVG elements` (`frontend/src/components/workspace/SvgCanvas.vue:166`-`169`) and claim all rendering goes through the Paper abstraction (`frontend/src/components/workspace/SvgCanvas.vue:173`-`176`).
- It imports `World`, `PaperService`, and `SVGRenderer` directly (`frontend/src/components/workspace/SvgCanvas.vue:183`, `:185`, `:186`), instantiates both services inside the component (`frontend/src/components/workspace/SvgCanvas.vue:256`-`257`), creates a `Paper` instance for rendering/spatial queries (`frontend/src/components/workspace/SvgCanvas.vue:420`-`421`), and injects the raw world (`frontend/src/components/workspace/SvgCanvas.vue:414`-`417`).
- It builds plane transforms by iterating `world.getAllProjectionPlanes()` and asking `world.getProjectionPlane2DRealization()` (`frontend/src/components/workspace/SvgCanvas.vue:541`-`544`, `:555`-`:557`).
- It generates primitives by building a `PrimitiveContext` with raw `world`, active plane, selection/hover sets, and view flags, then calls `paperService.generatePrimitives(context)` (`frontend/src/components/workspace/SvgCanvas.vue:566`-`595`). It then mutates the `Paper` query object via `paper.setPrimitives(prims)` (`frontend/src/components/workspace/SvgCanvas.vue:606`-`607`).
- It still contains large active-plane grid computations that read plane realization/domain transforms directly (`frontend/src/components/workspace/SvgCanvas.vue:677`-`706`, `:836`-`:854`), so the rendering selector boundary must include grid/plane-view inputs or explicitly defer grid extraction as a residual.
- It renders each primitive bucket by mapping `svgRenderer.renderPrimitive(p, viewport.value)` inside component computed values (`frontend/src/components/workspace/SvgCanvas.vue:1077`-`1150`).
- It uses `Paper.hitTest()` with raw `world` and paper-to-plane transforms for selection, drag, hover, snap-preview, and properties dialogs (`frontend/src/components/workspace/SvgCanvas.vue:1212`-`1227`, `:1350`-`:1357`, `:1411`-`:1418`, `:1531`-`:1547`). Hit behavior must therefore be preserved by selector/query DTOs, not treated as visual-only output.

### `PaperService.ts` mixes selector, style, realization, and primitive construction concerns

- `PaperService` imports concrete domain classes (`HalfHingeLine2D`, `FreePoint2D`, `Segment2DByPoints`, `Guide2D`, `SiblingGuide2D`) and domain types (`Point2D`, `Line2D`, `Circle2D`, `World`) together with Paper primitive types (`frontend/src/services/PaperService.ts:32`-`54`).
- `PrimitiveContext` carries the raw `World` (`frontend/src/services/PaperService.ts:60`) and the service imports `resolveVisibility` from the domain style service (`frontend/src/services/PaperService.ts:71`).
- The main generation loop walks `context.world.projectionPlanes.values()` (`frontend/src/services/PaperService.ts:120`-`121`), gets all points/lines/circles from each plane, calls `resolveVisibility` (`frontend/src/services/PaperService.ts:127`, `:143`-`:148`, `:186`-`:189`), asks planes to realize elements with the raw world (`frontend/src/services/PaperService.ts:151`, `:191`), and branches by concrete classes for half-hinge lines, segments, guides, arc geometry via `(line as any).arcGeometry`, and normal lines (`frontend/src/services/PaperService.ts:155`-`178`).
- Primitive construction embeds style decisions and state-specific emphasis (`frontend/src/services/PaperService.ts:229`-`241`, `:246`-`:292`, `:335`-`:391`, `:429`-`:485`, `:513`-`:568`, `:601`-`:653`). These are selector/view-model responsibilities, not low-level renderer-adapter responsibilities.
- Multiple primitives still set `visible: true` with TODOs to compute subprocess visibility/infeasibility (`frontend/src/services/PaperService.ts:238`, `:343`, `:437`, `:610`) even though visibility was already used to skip some raw domain elements. Wave 007 should replace this split behavior with explicit selector visibility outputs.
- The service still contains normal-rendering console/debug output around hinge lines (`frontend/src/services/PaperService.ts:146`, `:156`-`:158`) and TODO branches for missing element types (`frontend/src/services/PaperService.ts:202`, `:888`).
- Projected 3D-on-2D output is generated by a second method that again walks `world.getAllProjectionPlanes()`, reads plane realizations, and realizes 3D points/lines/segments through raw world (`frontend/src/services/PaperService.ts:893`-`984`). Wave 007 should either include projected-3D DTOs in the 2D selector or leave an explicit residual for Wave 008 if review narrows scope.

### `SVGRenderer.ts` is closer to an adapter, but still has primitive-specific special cases

- `SVGRenderer` imports Paper primitive types, not raw domain model classes (`frontend/src/services/SVGRenderer.ts:24`-`33`), so it is the best existing seed for the renderer-adapter side.
- It converts each primitive kind to SVG attributes (`frontend/src/services/SVGRenderer.ts:88`-`110`, `:114`-`:160`, `:163`-`:188`, `:192`-`:313`, `:317`-`:340`, `:344`-`:378`, `:384`-`:401`) and dispatches on `primitive.type` (`frontend/src/services/SVGRenderer.ts:423`-`450`).
- Its line clipping still uses a hard-coded viewport-bound TODO (`frontend/src/services/SVGRenderer.ts:220`) and returns an invisible line when clipping misses (`frontend/src/services/SVGRenderer.ts:274`). The implementation should make viewport/canvas bounds an explicit adapter input rather than a TODO branch.
- `renderPaper()` filters `p.visible` before rendering (`frontend/src/services/SVGRenderer.ts:456`-`462`), so visibility can be represented as DTO state and then consumed generically by the adapter.

### `RenderService.ts` is a production dead/parallel rendering path

- `RenderService` imports domain classes/types and a raw world lookup path (`frontend/src/services/RenderService.ts:22`-`28`, `:53`-`:68`).
- It explicitly states `renderPlane()` and `renderLine()` are only used in tests and that production rendering uses `SVGRenderer` (`frontend/src/services/RenderService.ts:111`, `:163`).
- `renderLine()` retains a `planeName` field only for test compatibility (`frontend/src/services/RenderService.ts:181`). Under no-backcompat priorities, Wave 007 should delete this test-only production rendering service and replace/adjust obsolete tests rather than preserving a shim.

### `Paper.ts` couples presentation primitives to raw domain hit-testing

- `Paper.ts` imports `World`, realization types, `Element2D`, and selection-mask helpers (`frontend/src/domain/presentation/Paper.ts:46`-`50`) even though it also defines pure primitive/style DTO shapes (`frontend/src/domain/presentation/Paper.ts:56`-`174`).
- Comments acknowledge direct active-plane access for hit testing (`frontend/src/domain/presentation/Paper.ts:9`-`19`).
- `Paper.hitTest()` takes `World`, active plane ID, paper-to-plane transform, and optional selection mask (`frontend/src/domain/presentation/Paper.ts:331`-`340`), then reaches into `world.projectionPlanes` (`frontend/src/domain/presentation/Paper.ts:363`), iterates active-plane points/lines/circles (`frontend/src/domain/presentation/Paper.ts:366`, `:403`, `:435`), realizes line/circle geometry through `activePlane.realizeLine2D(..., world)` and `activePlane.realizeCircle2D(..., world)` (`frontend/src/domain/presentation/Paper.ts:413`, `:441`), and uses raw domain entities for selection-mask classification (`frontend/src/domain/presentation/Paper.ts:405`-`410`, `:475`-`:486`).
- Because selection, hover, snap preview, and drag movement depend on this behavior, the target selector must produce hit/query DTOs or a dedicated `PaperHitQuery` model alongside visual DTOs.

### Style/visibility selectors are still domain-coupled

- `styleService.ts` imports `World` and `ProcessTree` (`frontend/src/domain/world/styleService.ts:13`-`14`) and resolves visibility by reading element `visualStyle.visible`, then `world.getProcessTree()`, process tree actions, and action path state (`frontend/src/domain/world/styleService.ts:58`-`96`).
- `ElementsPanel.vue` and `PropertiesDialog.vue` also write/read `visualStyle.visible` through UI-facing flows (`frontend/src/components/panels/ElementsPanel.vue:297`, `:351`-`:360`; `frontend/src/components/dialogs/PropertiesDialog.vue:126`-`:134`, `:454`-`:455`). Wave 007 should consume current style/visibility behavior through selector outputs; it should not create new UI command-construction paths.

## Waves 006a/006b accounting

- Wave 006a moved active canvas/tool command construction, point movement, and style update execution behind `createCanvasToolController()` and application use-cases. The implementation log records that `SvgCanvas.vue` now delegates through `createCanvasToolController()` and no longer imports concrete move/style operations or constructs commands directly (`architecture-audit/cycle-006a-canvas-tool-command-controllers/implementation-log.md`, “Source files changed” and “Explicit DELETE / retain-or-delete completion”). Current code confirms the controller is imported and created at `frontend/src/components/workspace/SvgCanvas.vue:212` and `:423`-`:425`.
- Wave 006b moved `ActionsPanel.vue` and `Toolbar.vue` command/history paths behind typed application intent controllers and deleted the Alt+E example/debug shortcut (`architecture-audit/cycle-006b-panel-toolbar-command-intents/implementation-log.md`, “Source files changed” and “Explicit DELETE / retain completion”). Therefore Wave 007 must not preserve or recreate UI command-construction responsibilities while extracting rendering. Style/properties changes should keep using the Wave 006a `CanvasStyleUseCase` boundary (`frontend/src/components/workspace/SvgCanvas.vue:1433`-`:1443`), not a renderer-owned mutation path.

## Remaining-wave re-rank after 006b

The remaining wave order still looks correct and does not require a plan edit:

1. **Wave 007 — 2D rendering selectors/adapters** now becomes the most central remaining issue because the command-controller leaks targeted by 006a/006b are resolved enough for rendering extraction to avoid preserving stale UI operation construction.
2. **Wave 008 — 3D rendering scene adapters** should still follow 007, because 3D rendering can share selector/read-model patterns after 2D render DTOs exist.
3. **Wave 009 — App shell services** remains after rendering, because project lifecycle/keyboard/selection orchestration should delegate to stable rendering and use-case boundaries.
4. **Wave 010 — Backend/frontend project-contract architecture** remains dependent on the persistence and app-shell stance.
5. **Wave 011 — Architecture tests/root validation gates** should freeze cleaned boundaries only after the central rendering/app/backend decisions are made.
6. **Waves 012–013 — debug/docs cleanup** remain last.

## Proceed / edit decision

Proceed with Wave 007 without a wave-plan edit. The planned target outcome is still accurate: 2D rendering should consume explicit selector/view-model DTOs derived from the domain, and renderer adapters should convert DTOs into Paper/SVG primitives without ad hoc raw-domain leakage in the canvas path.

## Scope boundaries for implementation proposals

In scope for Wave 007 proposals:

- Introduce 2D render/read-model selector DTOs for planes, primitives, style, visibility, layers, hit/query geometry, projected 3D-on-2D output if retained, and active-plane emphasis.
- Make `SvgCanvas.vue` consume selector DTOs and renderer/query adapters instead of assembling raw `PrimitiveContext` and passing raw `World` into `PaperService`/`Paper.hitTest()`.
- Split or replace `PaperService` so domain traversal/style/visibility decisions move into selectors, while Paper/SVG adapters only map DTOs to primitives/attributes.
- Delete `RenderService.ts` if confirmed only tests use it, and update/delete the obsolete tests.
- Remove obsolete rendering TODO branches, duplicate special cases, console debug output, and compatibility shims.

Out of scope unless a reviewed mini-cycle broadens the wave:

- Reopening Wave 006a/006b command-controller changes.
- Extracting all 3D scene/Three.js rendering from `ThreeView.vue` (Wave 008), except for a shared DTO contract or explicit residual note.
- App-shell lifecycle/persistence/keyboard extraction (Wave 009).
