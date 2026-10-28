# Paper Plane Implementation Design

Status: design, no implementation.

Related proposal: `docs/architecture/paper-level-drawing-proposal.md`.

## Goal

Implement the special `Paper` plane cleanly while reusing as much existing geometry, tool, command, realization, presentation, and persistence infrastructure as possible.

The key implementation idea is:

- Keep `Paper` as a reserved active-plane option, not a fake `ProjectionPlane`.
- Store paper-native elements in a small domain model parallel to projection-plane elements.
- Realize both paper-native elements and projection-plane element representations into existing realization shapes where possible.
- Reuse existing intersection functions by adapting paper geometry into `Line2DRealization2D`, `Circle2DRealization2D`, and `Point2DRealization2D` in paper coordinates.
- Create projection-plane sibling points only as secondary outputs of explicit paper intersections, one per unique real target projection plane represented by the intersection arguments.

## Design Constraints

1. Do not make `Paper` a `ProjectionPlane`.
2. Do not duplicate line-line intersection math.
3. Do not let pure-paper elements become 3D reconstruction inputs. Only projection-plane sibling outputs created from paper intersections may feed 3D tools.
4. Do not rewrite existing plane tools all at once internally, but preserve the user concept that geometric tools work on the selected active plane when they have paper semantics. Projection-specific tools can be disabled on `Paper`.
5. Keep command persistence parametric: store refs and rules, not computed coordinates.
6. Keep paper-to-plane sibling points real `Point2D` objects so existing plane tools can use them.
7. Do not preserve backward compatibility at the cost of design clarity. Old persistence or replay assumptions can be changed or removed.

## High-Level Shape

```text
UI active plane selector
  -> activePlaneId = projection plane id | "__paper__"

Canvas interaction
  -> projection plane path when activePlaneId is real
  -> paper path when activePlaneId is "__paper__"

Paper tool intents
  -> command sequence
  -> PaperElement(s)
  -> optional Point2D sibling(s)

Presentation
  -> projection-plane items as today
  -> paper element items from paper realization builder
  -> paper query items when "__paper__" is active
```

## Reserved Paper Plane

Add a single constant near active-plane/runtime code:

```ts
export const PAPER_PLANE_ID = '__paper__';
```

The active-plane runtime port should expose `Paper` in `planeOptions`:

```ts
{ id: PAPER_PLANE_ID, label: 'Paper' }
```

Important rule: any code path that needs a real `ProjectionPlane` must check `activePlaneId !== PAPER_PLANE_ID` before calling `world.getProjectionPlaneById(activePlaneId)`.

This keeps the UI model simple while protecting domain geometry from fake projection-plane semantics.

## 3D Boundary

Pure-paper elements are permanently flat construction geometry. They should never be promoted into 3D elements and should never be accepted directly by 3D reconstruction tools.

The only bridge from `Paper` into 3D workflows is indirect:

1. The user explicitly creates a paper intersection.
2. The command creates projection-plane sibling `Point2D` outputs for the relevant real projection planes.
3. Existing projection-plane and 3D construction tools use those sibling points as ordinary plane-owned elements.

This means no `PaperLine3D`, no `PaperPoint3D`, and no special-case 3D reconstruction from paper-native elements.

## Domain Model

Add a new folder:

```text
frontend/src/domain/world/paper/
  PaperElement.ts
  PaperGeometryRef.ts
  PaperPoint.ts
  PaperLine.ts
  PaperSegment.ts
  PaperIntersection.ts
  PaperRealization.ts
  PaperRealizationContext.ts
```

### Paper Element Base

Paper elements should be domain elements with IDs, labels, visual style, clone, and dependency declarations. They should not extend `Element2D`, because they are not owned by a projection plane.

Recommended base:

```ts
abstract class PaperElement extends Element {
  abstract realizePaper(context: PaperRealizationContext): PaperRealization;
}
```

### Paper Refs

Paper elements should depend on refs instead of copying realized coordinates:

```ts
type PaperGeometryRef =
  | { kind: 'paper-element'; elementId: string }
  | { kind: 'projection-element'; elementId: string; planeId: string };
```

For projection-plane refs, `planeId` is not redundant. It makes persistence clear, supports validation, and avoids guessing from ID format in command descriptors.

### First Paper Classes

Start with the narrow set:

- `PaperFreePoint`: stores a paper-space `Vector3`.
- `PaperLineByTwoPoints`: stores two point refs.
- `PaperSegmentByTwoPoints`: stores two point refs.
- `PaperLineLineIntersection`: stores two line-like refs and selected target plane IDs for siblings, if any.

Use explicit classes rather than a generic "paper shape" bag. That matches existing domain patterns and keeps realization behavior close to the rule.

## Paper Realizations

Reuse existing realization classes where they fit:

- Paper point: `Point2DRealization2D`.
- Paper line: `Line2DRealization2D` with `point2.z === 0`.
- Paper segment: `Line2DRealization2D` with `point2.z === 1`.
- Paper intersection point: `Point2DRealization2D`.

This is intentionally a reuse of numeric realization shapes, not a claim that paper elements are `Element2D`.

For paper-specific typing, wrap the reused realization in a small discriminated union:

```ts
type PaperRealization =
  | { kind: 'point'; value: Point2DRealization2D }
  | { kind: 'line'; value: Line2DRealization2D }
  | { kind: 'segment'; value: Line2DRealization2D };
```

## Paper Realization Context

The context should adapt existing world and realization services:

```ts
interface PaperRealizationContext {
  getPaperElement(id: string): PaperElement | undefined;
  realizePaperElement(element: PaperElement): PaperRealization;
  getProjectionPlaneById(id: string): ProjectionPlane | undefined;
  getProjectionPlane2DRealization(id: string): ProjectionPlaneRealization2D | undefined;
  getPoint2D(id: string): Point2D | undefined;
  getLine2D(id: string): Line2D | undefined;
  getCircle2D(id: string): Circle2D | undefined;
  realizePoint2D(point: Point2D): Point2DRealization2D;
  realizeLine2D(line: Line2D): Line2DRealization2D;
  realizeCircle2D(circle: Circle2D): Circle2DRealization2D;
}
```

The implementation can be created beside `createWorldRealizationContext`.

Do not add paper capabilities to `ProjectionElementRealizationContext`; that would make existing projection-plane geometry depend on paper concepts.

## Projection Element To Paper Adapter

Add one focused helper:

```ts
realizePaperRef(ref: PaperGeometryRef, context: PaperRealizationContext): PaperRealization
```

For `paper-element` refs:

1. Lookup the paper element.
2. Realize it through the paper context.
3. Return the paper realization.

For `projection-element` refs:

1. Lookup the real projection plane.
2. Realize the projection plane's `planeToPaper2D`.
3. Lookup and realize the referenced point, line/segment, or circle in plane coordinates.
4. Transform the numeric realization into paper coordinates.

### Transforming Points

```ts
paperPoint = planePoint.position.clone().applyMatrix3(planeToPaper2D)
```

### Transforming Lines And Segments

For `Line2DRealization2D`:

- Transform finite `point1` by `planeToPaper2D`.
- If `point2.z === 0`, transform the direction with the linear part of the matrix.
- If `point2.z === 1`, transform finite `point2` by `planeToPaper2D`.

Use a helper so both presentation and realization paths share it:

```ts
transformLineRealizationToPaper(line, planeToPaper): Line2DRealization2D
```

Important: directions must not receive translation. If using `Vector3.applyMatrix3`, ensure the direction has `z = 0`.

### Transforming Circles

Do not support paper circle construction in the first implementation. A general matrix can turn a circle into an ellipse. Rendering existing circles can remain as today, but paper intersection tools should reject circle refs until ellipse/conic support is designed.

## Reusing Intersection Calculations

The existing `frontend/src/domain/calculations/Intersections.ts` functions should be reused.

For line-line paper intersection:

1. Resolve both selected paper refs to `Line2DRealization2D` in paper coordinates.
2. Call `intersectLineLine(line1, line2)`.
3. Store the result as the realization of `PaperLineLineIntersection`.

This avoids new math.

For future line-circle or circle-circle paper intersections:

- Reuse `intersectLineCircle` and `intersectCircleCircle` only when both inputs are valid circle realizations in paper coordinates.
- If projection-plane circles can become ellipses, reject them until ellipse support exists.

### Bounded Segment Semantics

`intersectLineLine` treats bounded segments as their supporting infinite lines. Existing plane intersections appear to do the same for line-like elements. For paper V1, follow that behavior for consistency.

If the product later needs "intersection must lie on segment bounds", add a separate bounded-intersection validator rather than changing `intersectLineLine`.

## Projection-Plane Sibling Points

Sibling points are real projection-plane `Point2D` objects generated from a paper intersection.

Add a domain class under normal point classes:

```ts
class Point2DFromPaperIntersection extends Point2D {
  readonly paperIntersectionId: string;

  realize2D(context: ProjectionElementRealizationContext): Point2DRealization2D {
    // Needs paper realization capability through an adapter, not broad context pollution.
  }
}
```

Avoid adding paper methods to `ProjectionElementRealizationContext`. Instead, the class can use a small bridge context or the realization service can special-case this point type through a composed context. The cleanest implementation is likely:

```ts
interface PaperBackedPointRealizationContext extends ProjectionElementRealizationContext {
  getPaperIntersectionPoint(id: string): Point2DRealization2D | undefined;
}
```

Then only `Point2DFromPaperIntersection` asks for that capability and fails structurally if it is not present.

Sibling realization:

1. Realize the paper intersection point in paper coordinates.
2. Realize the target projection plane's `paperToPlane2D`.
3. Transform the paper point back to plane coordinates.
4. Return `Point2DRealization2D`.

```ts
planePoint = paperPoint.position.clone().applyMatrix3(paperToPlane2D)
```

### Sibling Target Selection

The construction use case should derive sibling target planes from the intersection arguments.

Rules:

- Pure paper-paper intersection: zero siblings.
- Paper element plus one projection-plane representation: one sibling in that projection plane.
- Two representations from different projection planes: two siblings.
- Hinge/shared representation: one sibling per adjacent projection plane.
- Multiple arguments representing the same projection plane: one sibling for that plane.

Represent this as:

```ts
type PaperIntersectionSourceTarget = {
  readonly planeId: string;
  readonly sourceElementId: string;
};
```

The command use case deduplicates by `planeId` before creating sibling operations.

## World Storage

Extend `World` with storage-only paper collections:

```ts
private paperPoints = new Map<string, PaperPoint>();
private paperLines = new Map<string, PaperLine>();
private paperSegments = new Map<string, PaperSegment>();
```

Add direct storage methods matching current world style:

```ts
putPaperPoint(point: PaperPoint): void;
getPaperPoint(id: string): PaperPoint | undefined;
getAllPaperPoints(): PaperPoint[];
deletePaperPoint(id: string): boolean;
```

Repeat for paper lines and segments.

Do not introduce a generic repository or registry layer. Existing architecture favors direct world storage plus explicit helpers.

## Realization Service

Extend `RealizationService` with paper caches:

```ts
private paper = new Map<string, PaperRealization>();
```

Add:

```ts
realizePaperElement(element: PaperElement, context: PaperRealizationContext): PaperRealization;
clearPaperElement(id: string): void;
```

`invalidateElement` should clear paper caches for affected paper elements. Since paper elements participate in dependency registration, the existing dependency traversal can drive this if paper element IDs are registered like other nodes.

Projection-plane sibling points must also be invalidated when their paper intersection changes.

## Dependency Registration

Each paper element should expose `getDependencies()` like other domain elements.

Examples:

- `PaperLineByTwoPoints`: dependencies are all element IDs in both point refs.
- `PaperLineLineIntersection`: dependencies are both line refs.
- `Point2DFromPaperIntersection`: dependency is the paper intersection ID and target projection plane ID.

Projection-plane refs should include:

- Source element ID.
- Source projection plane ID, because changing an auxiliary plane transform changes the paper representation.

For base planes the plane ID dependency is harmless. For auxiliary planes it is essential.

## Commands

Add paper operations under `frontend/src/commands/operations/world/` at first, because they mutate the world aggregate. A later folder split can happen if the operation family grows.

V1 operations:

- `AddPaperFreePointOp`
- `AddPaperLineByTwoPointsOp`
- `AddPaperSegmentByTwoPointsOp`
- `AddPaperLineLineIntersectionOp`
- `AddPoint2DFromPaperIntersectionOp`
- `UpdatePaperFreePointPositionOp`
- `RemovePaperPointOp`
- `RemovePaperLineOp`
- `RemovePaperSegmentOp`

Keep operation descriptors explicit and JSON-shaped:

```ts
interface PaperGeometryRefDescriptor {
  kind: 'paper-element' | 'projection-element';
  elementId: string;
  planeId?: string;
}
```

The sibling op descriptor:

```ts
interface AddPoint2DFromPaperIntersectionDescriptor {
  opType: 'AddPoint2DFromPaperIntersection';
  planeId: string;
  paperIntersectionId: string;
  pointId?: string;
}
```

Register descriptors in `registerWorldOperationDescriptors`.

## Command Sequencing

Follow the existing construction use case pattern:

1. Tool emits typed intent.
2. `executeConstructionIntent` dispatches to a paper executor.
3. The executor opens an action group.
4. The executor adds paper operations.
5. If the paper operation requires siblings, the executor adds one sibling op per unique target plane.
6. Process-tree actions are added for the paper primary output and secondary sibling outputs.
7. Feasibility is checked after command execution.

For a `P_H` line representation intersected with a `P_V` line representation:

```text
AddPaperLineLineIntersection
AddPoint2DFromPaperIntersection(P_H)
AddPoint2DFromPaperIntersection(P_V)
AddProcessTreeAction(...)
```

Do not have `AddPaperLineLineIntersectionOp` create siblings internally. Keeping siblings as explicit operations makes persistence, undo, redo, and test expectations clearer.

## Tool Intents

Add paper intent variants to `ToolConstructionIntent`:

```ts
| { type: 'paper-point'; position: Vector3; description: string }
| { type: 'paper-line'; point1: PaperGeometryRefDescriptor; point2: PaperGeometryRefDescriptor; description: string }
| { type: 'paper-segment'; point1: PaperGeometryRefDescriptor; point2: PaperGeometryRefDescriptor; description: string }
| { type: 'paper-intersection'; element1: PaperGeometryRefDescriptor; element2: PaperGeometryRefDescriptor; description: string }
```

Avoid overloading existing `point`, `line`, `segment`, and `intersection` intents with optional paper fields. Separate intent types make command dispatch safer.

Projection-specific tools should advertise that they are unavailable on `Paper` rather than trying to produce paper intents. The first disabled tool should be Guide, because the current guide semantics depend on projection-plane transfer through hinge/sibling behavior.

## Tool Reuse

The existing `ArgumentCollectorTool` can be reused if its argument value can represent paper selections.

Current `ArgumentValue` stores:

```ts
element: Element2D | null;
planeCoords: Vector3;
```

Add a paper-aware field without breaking plane tools:

```ts
paperRef?: PaperGeometryRefDescriptor;
paperCoords?: Vector3;
```

When `activePlaneId !== PAPER_PLANE_ID`, tools behave exactly as today.

When `activePlaneId === PAPER_PLANE_ID`:

- `PointTool` builds `paper-point`.
- `LineTool` builds `paper-line`.
- `SegmentTool` builds `paper-segment`.
- `IntersectionTool` builds `paper-intersection`.
- `GuideTool` is disabled with a clear reason.

The base collector can branch once when creating the `ArgumentValue`:

- Plane path: use existing hit testing and `Element2D`.
- Paper path: use paper hit testing and `PaperGeometryRefDescriptor`.

This allows the same tool classes to remain thin and declarative.

If this branch makes `ArgumentCollectorTool` too muddy, create `PaperArgumentCollectorTool` only for the four paper tools. Start with shared helpers either way; do not duplicate validators and status text more than needed.

## Hit Testing And Selection

Add paper query items alongside current canvas query items:

```ts
interface PaperQueryItem {
  id: string;
  kind: 'point' | 'line' | 'segment';
  ref: PaperGeometryRefDescriptor;
  sourcePlaneIds: readonly string[];
  geometry:
    | { type: 'point'; position: Vector3; visualRadiusPixels: number }
    | { type: 'line'; point: Vector3; direction: Vector3 }
    | { type: 'segment'; point1: Vector3; point2: Vector3 };
}
```

`sourcePlaneIds` is how the construction use case knows which sibling targets are available for projection-plane representations. For a hinge representation, this can contain two plane IDs.

Add a method rather than changing current hit-test semantics:

```ts
hitTestPaper(canvasPos, snapRadiusPixels, viewport, selectionMask)
```

Current `hitTest` remains projection-plane scoped.

Paper hit testing:

1. Convert canvas to paper coordinates.
2. Search all paper query items.
3. Apply selection mask adapted for paper item kinds.
4. Return the closest paper snap result with `paperRef` and `sourcePlaneIds`.

## Presentation

The current canvas presentation already builds render items in paper coordinates. Add a paper source builder to render stored paper elements:

```ts
buildPaperCanvasItems({ world, paperContext, visibility }): CanvasRenderItem[]
```

These items should be added after projection-plane items and before sorting.

For query:

- Current projection-plane query items stay in plane coordinates for normal mode.
- Paper query items should be generated in paper coordinates for `Paper`.
- For projection-plane representations, reuse the same transformed paper geometry used for rendering.

Avoid reading SVG or viewport state from domain/paper builders.

## Properties And Elements Panel

Add a "Paper" group to the Elements panel:

- Points
- Lines
- Segments

Projection-plane sibling points appear under their real projection plane, because they are real plane points.

Properties:

- Paper free point: editable paper `(x, y)`.
- Paper line/segment/intersection: dependencies and style.
- Projection-plane sibling point: read-only position or normal point properties, depending on existing dependent point behavior.

## Deletion

Extend deletion lookup to include paper elements and projection-plane siblings.

The dependency graph should make most cascade behavior automatic:

- Deleting a source projection line cascades to paper intersections depending on its paper representation.
- Deleting a paper intersection cascades to its sibling points.
- Deleting a sibling point should either delete only that point or be rejected if the app wants to preserve action integrity. For V1, allow normal cascade deletion and rely on process-tree grouping for traceability.

## Feasibility

Add feasibility checks equivalent to existing construction feasibility checks:

- Paper line from coincident points is infeasible.
- Paper line-line intersection of parallel lines is infeasible.
- Sibling point is infeasible if the paper intersection is infeasible.
- Sibling point is infeasible if the target plane's `paperToPlane2D` is infeasible.

Do not render infeasible paper elements or siblings, but keep their process-tree status visible.

## Suggested Implementation Phases

### Phase 1: Paper Plane Selection And Query

- Add `PAPER_PLANE_ID`.
- Add `Paper` to plane options.
- Branch canvas click/hover to paper hit testing when selected.
- Generate paper query items for existing projection-plane point/line/segment representations.
- No paper commands yet.

### Phase 2: Paper Domain And Presentation

- Add paper element classes for free point, line, segment.
- Add world storage and realization service cache.
- Add presentation builder for stored paper elements.
- Add operation descriptors for paper point/line/segment.

### Phase 3: Reuse Existing Tools For Paper Point/Line/Segment

- Extend argument values with paper refs.
- Route Point/Line/Segment tools to paper intent types when `Paper` is selected.
- Add command executors and process-tree actions.
- Validate save/load, undo/redo.

### Phase 4: Paper Intersection

- Add `PaperLineLineIntersection`.
- Resolve refs into `Line2DRealization2D` in paper coordinates.
- Reuse `intersectLineLine`.
- Add paper intersection command and presentation/query support.

### Phase 5: Projection-Plane Siblings

- Add `Point2DFromPaperIntersection`.
- Add sibling creation command.
- Add target-plane derivation from paper intersection arguments.
- Create zero, one, or multiple siblings per explicit paper intersection.
- Validate `P_H`/`P_V` line intersection and hinge representation cases.

## Test Plan

Focused unit tests:

- Transform projection-plane point to paper coordinates.
- Transform projection-plane line to paper coordinates.
- Transform paper intersection back into target plane coordinates.
- `PaperLineLineIntersection` uses `intersectLineLine` and matches expected result.
- Pure paper-paper intersection creates zero sibling targets.
- `P_H` line plus `P_V` line creates sibling targets for both planes.
- Hinge representation creates sibling targets for adjacent planes.
- Duplicate target planes are deduplicated.
- Paper element descriptors round trip through `OperationRegistry`.

Integration-style unit tests:

- Build canvas presentation with `Paper` selected and query items from multiple planes are hittable.
- Create paper segment between two projection-plane points and move one source point.
- Create paper intersection with two projection-plane line representations and verify both sibling `Point2D` realizations.
- Delete source line and verify paper intersection and siblings appear in cascade preview.

E2E tests:

- Select `Paper`, draw a segment between `P_H` and `P_V`.
- Select `Paper`, intersect a `P_H` line representation and a `P_V` line representation, then use the generated sibling points with existing 3D point creation.
- Save and reload a project containing paper elements and siblings.

## Open Engineering Decisions

1. Exact code name for projection-plane sibling point: `Point2DFromPaperIntersection`, `SiblingPaperIntersectionPoint2D`, or historical name if recovered.
2. Whether to allow direct deletion of sibling points independent of their paper intersection.
3. Whether paper query items should live in `CanvasPresentationModel` or a sibling `PaperInteractionQueryModel`.
4. Whether paper element IDs should use the shared numeric allocator or a paper-specific prefix counter.
5. Whether existing `SelectionMask` should grow paper-aware types or whether paper tools should use a parallel paper selection mask.

## Recommendation

Build the feature by adapting paper geometry into existing realization types. That gives immediate reuse of the current intersection math and keeps the domain consistent with the app's definition/realization pattern.

The cleanest first useful slice is:

1. `Paper` active-plane option.
2. Paper query items for projection-plane point/line/segment representations.
3. Paper free point, line, segment.
4. Paper line-line intersection using existing `intersectLineLine`.
5. `Point2DFromPaperIntersection` siblings created as explicit secondary command outputs.

This gets the bidirectional workflow working without fake projection planes, duplicated calculations, or a large tool rewrite.
