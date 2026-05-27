# Cycle 026 Scope Check — Tool interaction read context and realization adapter seam

## Stage and source-control hygiene

This scope check is planning-only for Wave 026. It does not implement source, test, package, backend, docs/spec, or tooling changes. The current wave-plan entry, Cycle 026 plan-extension note/review, and Wave 025 completion log were inspected before source scoping.

Scoped source-control evidence was captured under this directory:

- `pre-scoped-status.stdout.log`
- `pre-scoped-diff.stdout.log`

The scoped status/diff shows unrelated dirty source changes in `frontend/src/domain/calculations/Intersections.ts` and `frontend/src/domain/processTree/ActionGroup.ts`. They are outside this task's ownership and were not reverted, normalized, relied on, or incorporated.

## Wave-plan premise check

The Wave 026 entry in `architecture-audit/wave-plan.md` is still valid. Current source confirms the residual seam named by Wave 025 closure still exists: `RuntimeSession` privately owns `World`, but its canvas view port reintroduces that full domain root to active tools through `CanvasViewPort.invokeToolClick` / `ITool.ToolContext.world`.

Evidence:

- `RuntimeSession.canvasViewPort()` creates canvas/three-facing adapters from the private world and still injects it into tools: `createCanvasWorldReadPort(this.world)` at `frontend/src/application/appShell/RuntimeSession.ts:42`, and `invokeToolClick: (tool, context) => tool.handleClick({ ...context, world: this.world })` at `frontend/src/application/appShell/RuntimeSession.ts:75`.
- `CanvasToolInvocationContext` itself does not contain `world`, but `CanvasViewPort.invokeToolClick(tool, context)` remains the bridge into `ITool` at `frontend/src/application/appShell/RuntimeViewPorts.ts:25-34` and `frontend/src/application/appShell/RuntimeViewPorts.ts:52-59`.
- `ITool.ToolContext` imports concrete `World` and exposes `world: World`, plus adjacent broad `any` seams for `paperToPlaneTransform` and `getState()`: `frontend/src/tools/ITool.ts:9-29` and `frontend/src/tools/ITool.ts:42-49`.
- `ArgumentCollectorTool.handleClick()` destructures `world`, obtains the current plane from it, resolves hit-test ids with `world.getElement2D(...)`, and passes the full root to collection validators: `frontend/src/tools/ArgumentCollectorTool.ts:162-216`.
- `CollectionContext` imports and exposes concrete `World`: `frontend/src/types/ToolArgumentCollector.ts:156-164`.

No wave-plan adjustment is required before review. The narrow wave remains implementable as tool interaction/read-context cleanup, with a stop condition if implementation proves it cannot delete `ToolContext.world` without a deeper domain realization redesign.

## Current seam inventory

### Runtime tool invocation seam

- `frontend/src/application/appShell/RuntimeSession.ts:41-77` builds a canvas view port from private world state, exposes plane transforms for input, and injects raw `World` into `tool.handleClick` at line 75.
- `frontend/src/application/appShell/RuntimeViewPorts.ts:25-34` defines the Vue-facing `CanvasToolInvocationContext` without `World`, but line 58 keeps `invokeToolClick(tool, context)` as a runtime wrapper.
- `frontend/src/components/workspace/SvgCanvas.vue:651-661` calls `canvasViewPortRequired.invokeToolClick(activeTool, { ... })` with canvas/plane coordinates, command sink, interaction query, transform, viewport, and tool store. Vue does not pass `World` itself.

Classification: active construction interaction path; should be replaced by a typed tool interaction/read context supplied by runtime/session, not by Vue.

### Tool base context and argument collection

- `frontend/src/tools/ITool.ts:10-29` couples all tools to `World` and to the Pinia tool store type; it also uses `any` for `paperToPlaneTransform`.
- `frontend/src/tools/ArgumentCollectorTool.ts:162-216` uses raw world for active-plane lookup, hit-result element lookup, and validator context creation.
- `frontend/src/types/ToolArgumentCollector.ts:81`, `:120`, and `:147` still document validator/execution context as world-centric; `CollectionContext.world` is concrete at `:156-160`.

Classification: core Wave 026 target. Required capabilities are active-plane/plane lookup, element lookup by id, selected plane value, collected-argument access, and realization reads for validators/executors.

### Concrete tool world and realization reads

`residual-tool-adapter-scan.stdout.log` identifies active concrete uses:

- Circle radius validation uses `center.realize2D(context.world)` and `circumferencePoint.realize2D(context.world)` in `frontend/src/tools/CircleTool.ts:55-56`.
- 3D point/line/segment/plane tools use `context.world.getProjectionPlaneById(...)` in `Create3DPointTool.ts:58-59`, `Create3DLineTool.ts:43-44`, `Create3DSegmentTool.ts:43-44`, and `Create3DPlaneTool.ts:43-44` to validate that two projections are on different planes.
- Projection-plane creation uses `context.world`, `context.world.getLine2D(...)`, `realize2D(context.world)`, and plane lookup in `frontend/src/tools/CreateProjectionPlaneTool.ts:104`, `:113`, `:118`, and `:153-154`.
- Parallel/perpendicular tools validate reference-line feasibility through `refLine.realize2D(context.world)` in `frontend/src/tools/ParallelLineTool.ts:54` and `frontend/src/tools/PerpendicularLineTool.ts:54`.
- Tangent tools perform both validation and tangent-index selection through full world lookups and realizations: `frontend/src/tools/TangentLineToCircleParallelToLineTool.ts:61`, `:94-97`; `frontend/src/tools/TangentLineToCircleThroughPointTool.ts:60-61`, `:99-102`.

Classification: all are read/realization requirements, not command-stack mutation. They can be served by a behavior-sized `ToolInteractionReadPort` plus a small realization/query surface. Command execution already flows through `context.commandSink`.

### Canvas presentation/read adapter seam

- `CanvasWorldReadPort` returns raw `ProjectionPlane[]`, `Point3D[]`, `Line3D[]`, `Segment3D[]`, and exposes `getProcessTree()` at `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:15-29`.
- It builds a broad realization context that mirrors many `World` methods at `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:31-43` and wires those methods into realization helpers at `:46-70`.

Classification: adjacent adapter seam. It should be narrowed where directly shared with tool interaction/read contexts or active selectors. It should not become a broad rendering/domain redesign in this wave.

### Three presentation/read adapter seam

- `ThreeWorldReadPort` already returns scene-oriented read models, but its factory imports concrete `World`, builds a world-mirroring realization context at `frontend/src/application/threePresentation/ThreeWorldReadPort.ts:66-79`, and traverses/converts all projection planes and 3D elements at `:81-135`.
- It uses domain `instanceof` and domain realization calls such as `point.realize2D(realizationContext)`, `line.realize2D(realizationContext)`, and `line.realize2D(...)` for guide models at `frontend/src/application/threePresentation/ThreeWorldReadPort.ts:98-115`.

Classification: adjacent read/realization adapter seam. It is runtime-local and less urgent than `ToolContext.world`, but proposals should evaluate whether a shared realization read context avoids duplicating broad world mirrors.

### Runtime-local residuals not owned unless directly needed

- Properties dialog coordinate display uses raw lookups and `realize2D(this.world)` in `RuntimeSession.ts:301-342`.
- Process-tree infeasibility display calls `element.realize2D(this.world)` in `RuntimeSession.ts:399-408`.
- Command-producing controllers still accept `World` and `CommandStack` at `frontend/src/application/tools/CanvasToolController.ts:13-45`; this is mutation/use-case ownership and not part of the tool read-context deletion unless type alignment is required.

Classification: out of implementation scope unless required to define a reusable realization read context. These are follow-up candidates for properties/process read-model cleanup or command-controller refactoring, not blockers for deleting tool raw-world access.

## Selected bounded scope for proposals

The implementation proposals should stay within:

- `frontend/src/application/appShell/RuntimeSession.ts`
- `frontend/src/application/appShell/RuntimeViewPorts.ts`
- `frontend/src/tools/ITool.ts`
- `frontend/src/tools/ArgumentCollectorTool.ts`
- concrete active tools under `frontend/src/tools/` that read `context.world`, `CollectionContext.world`, or `realize2D(context.world)`
- `frontend/src/types/ToolArgumentCollector.ts`
- `frontend/src/application/tools/CanvasToolController.ts` / `ToolCommandIntents.ts` only for type alignment with the existing command sink
- `frontend/src/application/canvasPresentation/CanvasInteractionQuery.ts` only if hit-result read models need richer identifiers
- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts`, `CanvasPresentationSelector.ts`, and `CanvasVisibilityPolicy.ts` only for directly adjacent read/realization context narrowing
- `frontend/src/application/threePresentation/ThreeWorldReadPort.ts` only for directly adjacent read/realization context narrowing
- `frontend/src/components/workspace/SvgCanvas.vue` only for typed invocation wiring changes
- focused tests and static/architecture scans for touched tool/runtime/presentation boundaries

## Explicit out-of-scope items and stop conditions

Out of scope for Cycle 026 implementation unless a reviewed plan edit occurs:

- persistence schema, replay, ProjectService migrations, Drive/local project serialization, and `ProjectSessionPersistenceAdapter`
- command descriptors, command history, command-stack semantics, command producer redesign, undo/redo lifecycle redesign, and construction use-case semantics beyond type alignment
- backend/frontend API stance
- package/tooling churn, validation-platform framework work, and root script redesign
- docs/spec reconciliation and debug/log cleanup
- Drive/auth/browser integration internals or secret/config reads
- broad domain realization redesign, including changing `Element2D.realize2D(...)` ownership globally
- broad application-kernel/service-locator redesign
- elements visibility as a command/persistence behavior

Stop and request a reviewed wave-plan edit if deleting `ITool.ToolContext.world` requires changing the global domain realization contract rather than introducing a narrow runtime-owned read/realization context for active tools.

## Premises and invalidated assumptions

Valid premises:

- The raw `World` handoff into tools is still active and isolated enough for a bounded wave.
- Concrete tool uses are read/validation/realization uses; command mutation still flows through `ToolCommandSink`.
- Vue-facing canvas code already receives typed runtime ports and does not directly own `World` for tool clicks.
- Canvas/three adapters are adjacent because they duplicate world-mirroring realization contexts, but they can be treated as adapter-local unless directly needed by the tool context split.

No material Wave 026 premise was invalidated by current-source inspection.

## DELETE list candidates

- `world: World` and the `World` import from `frontend/src/tools/ITool.ts`.
- `CanvasViewPort.invokeToolClick` implementation that calls `tool.handleClick({ ...context, world: this.world })`.
- `CollectionContext.world` and world-centric validator/execution comments in `frontend/src/types/ToolArgumentCollector.ts`.
- Concrete `context.world` / `realize2D(context.world)` calls in active tools, replaced by named read/realization queries.
- `paperToPlaneTransform: any`, `CanvasToolInvocationContext.toolStore: any`, and `ITool.getState(): Record<string, any>` where directly touched by the tool context split.
- Canvas adapter raw domain collection returns and `getProcessTree()` exposure where selectors can consume narrower read models in this wave.
- Three adapter broad world-mirroring methods where a shared realization read context can replace duplication without redesigning domain realizations.
- Transitional raw-and-port dual paths, broad `WorldView` facades, dead exports, and tests asserting full world injection into tools.

## Validation requirements for implementation wave

The implementation stage must capture logs under `architecture-audit/cycle-026-tool-interaction-read-context/validation/` and include at minimum:

1. Pre/post scoped status and diff.
2. Static scans for `ToolContext.world`, `context.world`, `CollectionContext.world`, `realize2D(context.world)`, raw-world injection through `invokeToolClick`, broad `ToolWorld`/`WorldView` facades, and allowed runtime-local adapter residuals.
3. Focused Vitest for `ArgumentCollectorTool`, representative concrete tools using realization reads (circle, projection-plane, parallel/perpendicular, tangent, 3D construction), runtime canvas invocation wiring, canvas presentation/read context, and three presentation read model if changed.
4. Architecture/boundary test or scan proving active tools no longer receive concrete `World`.
5. Root and frontend lint where scripts exist.
6. Focused and full root/frontend Vitest.
7. Root and frontend build where scripts exist.
8. Playwright/e2e because canvas construction and 3D presentation are user-observable.
9. Live preview refresh on `0.0.0.0:5173`, HTTP reachability probe, and live/browser smoke for representative construction, tangent/parallel/perpendicular, projection-plane or 3D construction, hover/hit testing, 3D refresh, and undo/redo.

## Recommendation

Proceed to `cycle-026-review-round-01` to review `scope-check.md`, `proposal-direct.md`, and `proposal-restructure.md`. No wave-plan edit is recommended at this scout stage.
