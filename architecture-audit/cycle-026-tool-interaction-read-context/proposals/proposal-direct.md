# Proposal Direct — Replace tool raw-world context with behavior-sized read/realization ports

## Summary

Implement Wave 026 by deleting `ITool.ToolContext.world` and replacing it with a narrow runtime-owned tool interaction/read context. The new context supplies only the behaviors current tools actually use: active projection-plane lookup, element lookup by id for hit-test results, 2D realization reads for selected elements, projection-plane relation checks for 3D/projection-plane tools, and the existing command sink for mutations.

This is the direct implementation of the wave-plan entry. It keeps `RuntimeSession` as the private `World` owner, preserves command execution through `ToolCommandSink`, and avoids changing persistence, command history, backend, package/tooling, or global domain realization ownership.

## Current evidence

- `RuntimeSession.canvasViewPort()` injects raw world into tools at `frontend/src/application/appShell/RuntimeSession.ts:75`.
- `CanvasToolInvocationContext` is world-free, but `CanvasViewPort.invokeToolClick` remains the bridge at `frontend/src/application/appShell/RuntimeViewPorts.ts:25-34` and `:58`.
- `ITool.ToolContext` imports and exposes `World` at `frontend/src/tools/ITool.ts:10` and `:24`.
- `ArgumentCollectorTool` uses raw world for active-plane lookup, element lookup, and collection validator context at `frontend/src/tools/ArgumentCollectorTool.ts:162-216`.
- `CollectionContext.world` is concrete at `frontend/src/types/ToolArgumentCollector.ts:156-160`.
- Concrete tools use `context.world`/`realize2D(context.world)` for circle, 3D construction, projection-plane creation, parallel/perpendicular validation, and tangent variant selection; see `residual-tool-adapter-scan.stdout.log`.
- Adjacent adapter duplication remains in `CanvasWorldReadPort` (`frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:15-70`) and `ThreeWorldReadPort` (`frontend/src/application/threePresentation/ThreeWorldReadPort.ts:66-135`).

## Target outcome

- Tools no longer import, receive, or read concrete `World`.
- `RuntimeSession` creates a `ToolInteractionReadPort` / `ToolRealizationReadPort` from private world and passes that into `ToolContext`.
- `ArgumentCollectorTool` resolves hit-test element ids and validators through the new port.
- Concrete tools perform realization/plane checks through named methods rather than `context.world`.
- Canvas/three adapters optionally share the same realization-read adapter where it avoids duplicated world mirrors, but only along directly touched seams.
- Vue wiring remains thin: `SvgCanvas.vue` still passes event-derived coordinates, command sink, interaction query, transform, viewport, and tool store; runtime supplies read capabilities.

## Proposed design

Introduce a small tool read-context module, for example `frontend/src/application/tools/ToolInteractionReadPort.ts` or `frontend/src/tools/ToolInteractionReadContext.ts` depending on dependency direction chosen during implementation.

Suggested contract shape:

```ts
export interface ToolInteractionReadPort {
  getProjectionPlaneById(id: string): ProjectionPlane | undefined;
  getElement2D(id: string): Element2D | undefined;
  getPoint2D(id: string): Point2D | undefined;
  getLine2D(id: string): Line2D | undefined;
  getCircle2D(id: string): Circle2D | undefined;
  realizePoint2D(point: Point2D): Point2DRealization2D | undefined;
  realizeLine2D(line: Line2D): Line2DRealization2D | undefined;
  realizeCircle2D(circle: Circle2D): Circle2DRealization2D | undefined | null;
  getProjectionPlane2DTransform(planeId: string): Matrix3 | undefined;
  getProjectionPlane3DRealization(planeId: string): ProjectionPlaneRealization3D | undefined;
  areProjectionPlanesDistinct(firstPlaneId: string, secondPlaneId: string): boolean;
}
```

Implementation may split this into smaller interfaces (`ToolElementLookupPort`, `ToolRealizationReadPort`, `ToolProjectionPlaneReadPort`) if that keeps methods behavior-sized. The key rule: do not create a generic `WorldView`/`ToolWorld` facade that mirrors `World` wholesale.

`ToolContext` then becomes:

```ts
export interface ToolContext {
  planeId: string;
  planeCoords: Vector3;
  canvasCoords: { x: number; y: number };
  commandSink: ToolCommandSink;
  readPort: ToolInteractionReadPort;
  interactionQuery: CanvasInteractionQuery;
  paperToPlaneTransform: Matrix3 | undefined;
  viewport: { zoom: number; panX: number; panY: number };
  toolStore: ReturnType<typeof useToolStore>;
}
```

`CollectionContext` should expose the same bounded read capabilities plus current plane and collected arguments, not `World`.

## Files to change

Production source:

- `frontend/src/application/appShell/RuntimeSession.ts`
  - Build the tool read/realization port from private world.
  - Replace `tool.handleClick({ ...context, world: this.world })` with a call that supplies the bounded read port.
  - Keep command producer, persistence restore/snapshot, selection deletion, active-plane, properties/process residuals unchanged unless needed for type alignment.
- `frontend/src/application/appShell/RuntimeViewPorts.ts`
  - Update `CanvasToolInvocationContext` and/or `CanvasViewPort.invokeToolClick` typing to the new world-free tool context.
  - Replace `toolStore: any` with the existing typed tool-store surface if touched.
- `frontend/src/tools/ITool.ts`
  - Delete `World` import and `world: World` from `ToolContext`.
  - Type `paperToPlaneTransform` as `Matrix3 | undefined` if touched.
  - Narrow `getState()` if directly touched, or document any remaining `Record<string, any>` residual.
- `frontend/src/tools/ArgumentCollectorTool.ts`
  - Replace `world.getProjectionPlaneById`, `world.getElement2D`, and `CollectionContext.world` with the new read port.
- `frontend/src/types/ToolArgumentCollector.ts`
  - Delete `World` import and `CollectionContext.world`.
  - Update validator, set-validator, and execute comments/types to name the read context.
- Concrete tools under `frontend/src/tools/` that currently use `context.world` or `CollectionContext.world`:
  - `CircleTool.ts`
  - `Create3DPointTool.ts`
  - `Create3DLineTool.ts`
  - `Create3DSegmentTool.ts`
  - `Create3DPlaneTool.ts`
  - `CreateProjectionPlaneTool.ts`
  - `ParallelLineTool.ts`
  - `PerpendicularLineTool.ts`
  - `TangentLineToCircleThroughPointTool.ts`
  - `TangentLineToCircleParallelToLineTool.ts`
  - Any additional concrete tools found by final static scan.
- `frontend/src/application/tools/CanvasToolController.ts` / `ToolCommandIntents.ts` only if imports/types need alignment with the world-free tool context; do not redesign command execution.
- `frontend/src/components/workspace/SvgCanvas.vue`
  - Adjust invocation typing only if `CanvasToolInvocationContext` changes at the call site.
- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts`
  - Optional: reuse/extract the read/realization adapter from the tool read port if that eliminates direct duplication without changing selector output.
- `frontend/src/application/threePresentation/ThreeWorldReadPort.ts`
  - Optional: reuse/extract the read/realization adapter where it removes duplicate world-mirroring realization context without changing 3D read models.
- Focused tests under `frontend/tests/unit/**` for tool context, argument collection, concrete tools, runtime invocation, and presentation adapters where touched.
- Architecture/static boundary test if a suitable existing file exists; otherwise add focused scan coverage in validation logs.

Audit artifacts:

- `architecture-audit/cycle-026-tool-interaction-read-context/implementation-log.md`
- stable validation logs under `architecture-audit/cycle-026-tool-interaction-read-context/validation/`

## Files/tests/docs/fixtures to DELETE

- Delete `world: World` from `frontend/src/tools/ITool.ts` and the corresponding import.
- Delete `CollectionContext.world` from `frontend/src/types/ToolArgumentCollector.ts`.
- Delete all active production `context.world` and `realize2D(context.world)` tool usages.
- Delete the raw-world injection implementation in `RuntimeSession.canvasViewPort().invokeToolClick`.
- Delete transitional dual raw-world/read-port paths and compatibility wrappers if any appear during implementation.
- Delete tests that construct tool contexts with full `World` only to inspect command internals; replace with read-port test doubles and command-sink behavior tests.
- Delete broad `any` types (`paperToPlaneTransform: any`, `CanvasToolInvocationContext.toolStore: any`, maybe `getState(): Record<string, any>`) only where directly touched by the tool context split.
- Do not delete backend files, docs/spec files, package scripts, persistence tests, command-history tests, Drive/auth tests, or broad domain realization code in this wave.

## Expected behavior change

User-visible behavior should remain equivalent. Construction tools should still support:

- point, line, segment, circle, guide, intersection flows
- 3D point/line/segment/plane construction from projections/traces
- auxiliary projection-plane creation
- parallel/perpendicular construction
- tangent-through-point and tangent-parallel-to-line variant selection
- any-order argument collection, dynamic selection masks, null-position arguments, and set-validator pruning
- existing command-sink execution, undo/redo, selection, hover/hit testing, style update, and point drag behavior

Architectural behavior changes:

- Tool code cannot bypass runtime/application boundaries by reading arbitrary `World` methods.
- Runtime/session remains the only concrete `World` owner for tool reads.
- Read needs become explicit and testable through small ports.

## Risks

- The read port can become a renamed `World` facade if too many root methods are added. Mitigation: each method must map to a concrete current tool use from the inventory.
- `ArgumentCollectorTool` interleaves hit testing, selection masks, validators, and completion logic. Mitigation: focused tests must cover any-order collection, null click/`SelectionMask.none`, validator failure messages, and completed-set execution.
- Tangent tools use click position and realization geometry to choose tangent index. Mitigation: focused tests must cover both tangent variants and representative click-side selection.
- Projection-plane and 3D construction validations depend on plane relationships. Mitigation: provide explicit plane relation methods instead of leaking full plane/world traversal where possible.
- Canvas/three adapter sharing could overreach into domain realization redesign. Mitigation: if adapter narrowing requires changing `Element2D.realize2D(...)` ownership globally, stop for a reviewed plan edit.

## Validation plan

Implementation must capture logs under `architecture-audit/cycle-026-tool-interaction-read-context/validation/`:

1. Pre/post scoped `git status --short` and `git diff` for touched paths.
2. Static scans proving absence of `ToolContext.world`, `CollectionContext.world`, production tool `context.world`, `realize2D(context.world)`, raw injection via `invokeToolClick`, and broad `WorldView`/`ToolWorld` facades.
3. Focused Vitest:
   - `ArgumentCollectorTool` behavior.
   - Concrete tools listed above.
   - Runtime canvas invocation wiring.
   - Canvas/three read adapter tests if changed.
   - Existing canvas tool controller/use-case tests to prove command sink behavior remains intact.
4. Root and frontend lint where defined.
5. Full root and frontend Vitest where defined.
6. Root and frontend build where defined.
7. Root/frontend Playwright e2e because canvas construction and 3D behavior are user-observable.
8. Live preview refresh on `0.0.0.0:5173`, HTTP 200 probe, and live/browser smoke for representative 2D construction, tangent/parallel/perpendicular, projection-plane/3D construction, hover/hit testing, 3D refresh, and undo/redo.

## No-backcompat rationale

`ToolContext.world` is an internal architecture leak, not a compatibility contract. Keeping both raw world and a new read port would preserve the bypass and weaken Wave 025's private-world boundary. Delete the raw field and update active tools/tests directly; do not retain overloads, shims, or dual paths.

## Stop conditions

Stop and request reviewed plan edit if implementation requires any of the following:

- changing persistence schema/replay or ProjectService contracts
- redesigning command descriptors/history/undo/redo semantics
- changing backend/frontend API stance
- package/tooling or validation-platform restructuring
- docs/spec cleanup beyond implementation log
- Drive/auth/browser adapter changes
- global `Element2D.realize2D(...)` / domain realization ownership redesign
- broad application-kernel/service-locator redesign
- command-backed visibility redesign
