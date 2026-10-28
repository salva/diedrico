# Paper-Level Drawing Proposal

Status: proposal, no implementation.

## Summary

Add a special `Paper` plane to the existing plane selector, beside `P_H`, `P_V`, and auxiliary projection planes. When `Paper` is selected, the canvas sheet itself becomes the active geometric workspace. Elements from every projection plane are available through their already-flattened paper representation, and new paper-level objects can be constructed from them even when their sources belong to different projection planes.

The motivating example is drawing a line or segment between a point on `P_H` and a point on `P_V`. Today, normal 2D tools are scoped to the active projection plane, so the two points cannot be used together. In paper-level mode, both points are simply selectable points on the same paper sheet.

The feature should not replace the existing projection-plane workflow. It should add a second construction context through the same active-plane concept:

- Projection-plane context: constructs mathematically meaningful objects inside one projection plane.
- Paper context: constructs flat 2D objects on the drawing sheet from paper positions and paper representations when the selected plane is `Paper`.

## Current State

The code already has a paper coordinate system in the presentation layer:

- Projection planes realize `planeToPaper2D` and `paperToPlane2D` transforms.
- Canvas rendering converts plane-domain geometry into paper primitives.
- The viewport then maps paper coordinates to SVG canvas coordinates.
- The grid is already selected against the active plane transform, not a separate paper grid.
- The current plane selector lists real projection planes only. It does not expose `Paper` as an active-plane target.

However, paper is currently a rendering coordinate space, not a construction domain:

- Tools receive `planeId` and active-plane coordinates.
- Hit testing filters query items by active plane.
- Selection masks match `Element2D` classes stored inside a projection plane.
- Construction intents such as point, line, segment, circle, guide, and intersection require one target `planeId`.
- The world stores projection-plane 2D elements, 3D elements, hinge lines, and projection planes, but not paper-native elements.

So the feature is not "create paper coordinates"; those exist. The feature is "make paper coordinates a first-class construction level."

## Functional Goals

1. Let the user switch between projection-plane drawing and paper-level drawing.
2. In paper mode, allow all visible/selectable plane elements to be treated as their paper-space 2D representations.
3. Allow paper-level constructions whose arguments may come from different projection planes.
4. Keep paper-level constructions reactive to their dependencies when source plane elements move or auxiliary plane transforms change.
5. Render, select, style, hide, undo, redo, save, and load paper-level elements consistently with other construction outputs.
6. Avoid implying that paper-level constructions are projection-plane geometry unless explicitly converted or used by a later feature.

## Non-Goals For The First Version

Pure-paper geometry should never participate directly in 3D reconstruction. A paper line between a `P_H` point and a `P_V` point is a flat drawing construction, not a projection of a 3D line. The bridge into 3D workflows is the sibling mechanism: explicit paper intersections can create real projection-plane `Point2D` outputs, and those sibling points can then be used by normal projection-plane and 3D construction tools.

From the user's point of view, the familiar geometric tools should keep working when `Paper` is selected when they have a clear paper-level meaning. Point, line, segment, circle, perpendicular, parallel, and intersection tools should feel like the same tools operating on a different active plane. Projection-specific tools may be disabled on `Paper`; guides are the clearest example because their current meaning is tied to projection-plane transfer/hinge behavior. The implementation may route supported tools through paper-specific intents internally, but the conceptual UI should not present paper drawing as a separate, reduced toolset.

Backward compatibility is not a constraint for this feature. If existing project replay, persistence descriptors, command schemas, or active-plane assumptions get in the way of a clean `Paper` implementation, they can be changed or removed. The implementation should prefer a simple current model over preserving old project formats.

## Proposed User Model

Add `Paper` as a special plane option in the existing plane selector.

When the selected plane is a projection plane such as `P_H`, `P_V`, or an auxiliary plane, the app keeps the current behavior: the selected projection plane receives new 2D constructions.

When the selected plane is `Paper`, the app routes supported tools through paper-level construction semantics:

- Clicking an existing plane point selects its paper representation.
- Clicking an existing plane line selects its flattened paper line.
- Clicking an existing plane segment selects its flattened paper segment.
- Clicking an existing plane circle selects its flattened paper circle, provided the transform preserves circle shape or the app has an ellipse representation.
- Clicking empty paper can create a paper free point.
- Tools can combine arguments from different planes.

The `Paper` option should appear visually distinct inside the plane selector because it is a special construction plane, not a projection plane backed by a 3D plane. A divider or icon would be enough:

- `P_H`
- `P_V`
- auxiliary projection planes
- divider
- `Paper`

The active-plane label should say `Paper` while selected. Tool status text and command descriptions should then use paper terms, such as "Create paper segment" rather than "Create segment".

This keeps the mental model simple: the user always chooses where they are drawing by selecting a plane. `Paper` is simply the flattened drawing plane.

## Special Plane Identity

`Paper` should be a first-class selectable plane option, but it does not have to be a `ProjectionPlane` domain object.

Recommended model:

- The active-plane runtime port exposes `Paper` alongside projection-plane options.
- Internally, `Paper` uses a reserved ID such as `paper` or `__paper__`.
- Code paths that require a real projection plane must branch before calling `world.getProjectionPlaneById(activePlaneId)`.
- Paper-level tools and presentation use paper coordinates directly.
- Projection-plane tools and presentation continue using `ProjectionPlane` realizations.

This avoids giving `Paper` fake `planeTo3D`, `threeDToPlane`, hinge, or auxiliary-plane semantics. It also keeps 3D reconstruction tools from accidentally treating paper geometry as a real projection plane.

## Core Concepts

### Paper Space

Paper space is the global 2D coordinate system used by the SVG presentation layer before viewport pan and zoom. It is not screen pixels. It is stable under panning and zooming.

### Paper Representation

A paper representation is a derived geometry obtained by realizing a source element and applying its projection plane's `planeToPaper2D` transform.

Examples:

- A plane point becomes a paper point.
- A plane line becomes a paper line.
- A plane segment becomes a paper segment.
- A plane circle becomes a paper circle only if the transform is similarity-like; otherwise it becomes a paper conic/ellipse or should be rejected until ellipse support exists.

### Paper-Native Element

A paper-native element is an element stored in paper coordinates. It has no projection-plane owner. It can depend on paper references or other paper-native elements.

Examples:

- Paper free point at `(x, y)` in paper coordinates.
- Paper line by two paper points.
- Paper segment by two paper points.
- Paper intersection point between two paper lines.
- Paper intersection point between a paper element and the paper representation of a projection-plane element.

### Paper Reference

A paper reference is not a copied element. It is a stable reference to an existing source element plus a rule for obtaining its paper representation.

Examples:

- `PaperRef("PH/A")` realizes to the paper position of point `A` on `P_H`.
- `PaperRef("PV/l1")` realizes to the paper line of line `l1` on `P_V`.

This distinction matters because if the original plane point moves, paper constructions depending on it should update.

### Projection-Plane Sibling

A projection-plane sibling is a secondary, plane-owned object created as an output of an explicit paper-level construction.

It is only created when at least one argument of the explicit paper intersection is the paper representation of an element from a real projection plane. A pure paper-paper intersection remains only a paper element and does not create a projection-plane sibling.

The important ordering is:

1. The user explicitly creates an intersection on `Paper`.
2. The paper intersection is stored as the primary construction output.
3. If at least one intersected argument is the paper representation of an element from a real projection plane, the app creates sibling point output inside each relevant real projection plane.
4. Each sibling point realizes by taking the paper intersection position and mapping it back through its target plane's `paperToPlane2D` transform.

This is similar in spirit to existing sibling concepts such as sibling guides or sibling intersection points, but the source construction lives on `Paper` rather than inside the projection plane.

Most paper intersections produce zero or one projection-plane sibling. Some intersections produce more than one. If the user intersects a line representation from `P_H` with a line representation from `P_V`, the paper intersection should create one sibling point in `P_H` and one sibling point in `P_V`. A hinge line is another important example: because it is shared by two projection planes, a paper intersection involving a hinge representation may create one sibling point in each adjacent projection plane. The rule should be one sibling per unique target projection plane, not one sibling per selected argument.

## Recommended Scope: Version 1

Version 1 should support:

- Paper free points.
- Paper lines through two paper points.
- Paper segments between two paper points.
- Paper intersections between paper lines and paper segments.
- Projection-plane sibling points created from explicit paper intersections involving a projection-plane element representation.
- Hit testing paper representations of plane points, lines, and segments.
- Styling and visibility for paper elements.
- Process-tree actions for paper constructions.
- Undo, redo, save, and load for paper commands.

Version 1 may defer implementation details for:

- Paper circles when a projection-plane circle would become an ellipse under paper transform.
- Paper tangents when circle/ellipse semantics are unresolved.
- Paper parallel/perpendicular internals if paper-metric behavior needs extra validation.
- Conversion between paper elements and projection-plane elements.
- Using pure-paper elements as 3D reconstruction inputs. Only projection-plane sibling outputs may feed 3D reconstruction.
- Full support for paper representations of 3D-rendered overlays.

The "conversion" deferred above means arbitrary conversion. V1 should still support the targeted sibling behavior for paper intersections because that is the bridge that makes the feature useful for real projection-plane construction.

## User Workflows

### Draw A Segment Between Projections On Different Planes

1. User selects the `Paper` plane.
2. User selects the Segment tool.
3. User clicks a point on `P_H`.
4. User clicks a point on `P_V`.
5. App creates a paper segment whose endpoints are references to those two source points.
6. If either source point later moves, the paper segment endpoint follows.

### Draw A Paper Line From A Plane Point To Empty Paper

1. User selects the `Paper` plane.
2. User selects a paper line tool.
3. User clicks a plane point.
4. User clicks empty paper.
5. App creates a paper free point at the second click and a paper line depending on both endpoints.

This behavior should be considered carefully. It is convenient, but it creates hidden intermediate objects. The process tree should show the paper free point unless the app intentionally hides it as an intermediate.

### Use Auxiliary Plane Geometry In Paper Mode

1. User creates or unfolds an auxiliary projection plane.
2. User selects the `Paper` plane.
3. User clicks an element on the auxiliary plane and an element on a base plane.
4. App creates paper geometry between their flattened representations.
5. If the auxiliary plane's defining traces change and the unfolded transform changes, dependent paper geometry updates.

This is one of the most important tests for the feature.

### Create A Paper Intersection With A Projection-Plane Sibling

1. User selects the `Paper` plane.
2. User selects the Intersection tool.
3. User selects a paper line.
4. User selects the paper representation of a line from `P_H`.
5. App creates an explicit paper intersection point at the crossing.
6. App also creates a sibling point inside `P_H` by transforming the paper intersection through `P_H.paperToPlane2D`.
7. The sibling point can be used by normal projection-plane tools and 3D reconstruction tools because it is a real `Point2D` owned by `P_H`.

If the paper line moves, the paper intersection updates and the `P_H` sibling follows. If the `P_H` line moves, the paper representation changes, the paper intersection updates, and the sibling follows.

### Intersect Lines From Two Projection Planes On Paper

1. User selects the `Paper` plane.
2. User selects the Intersection tool.
3. User selects the paper representation of a line from `P_H`.
4. User selects the paper representation of a line from `P_V`.
5. App creates one explicit paper intersection point.
6. App creates one sibling point inside `P_H` and one sibling point inside `P_V`.
7. Each sibling lies on its source line when realized in that plane's intrinsic coordinates.

This does not automatically create a 3D point. It creates the two projection-plane point outputs needed for later plane-level or 3D construction tools.

## Selection And Snapping

Selecting the `Paper` plane needs a paper-space hit-test path.

Current hit testing converts canvas coordinates to active-plane coordinates and filters query items by `activePlaneId`. When `activePlaneId` resolves to the special `Paper` plane, hit testing should instead:

1. Convert canvas coordinates to paper coordinates.
2. Search paper query items without active-plane filtering.
3. Measure distance in paper units, with a snap radius derived from viewport zoom.
4. Return a paper snap target that may reference either a plane element or a paper-native element.

Suggested query item shape:

```ts
type PaperSelectableKind =
  | 'paper-point'
  | 'paper-line'
  | 'paper-segment'
  | 'plane-point-representation'
  | 'plane-line-representation'
  | 'plane-segment-representation';
```

The query result should preserve both:

- The selectable paper geometry.
- The source identity, if any.

For example, selecting point `PH/A` in paper mode should return a paper point argument whose source is `{ kind: 'plane-element', elementId: 'PH/A', planeId: 'PH' }`.

## Tool Behavior

There are two viable UX approaches.

### Option A: Shared Tools Change Behavior By Active Plane

The existing Point, Line, Segment, and Intersection tools operate on a normal active projection plane when `P_H`, `P_V`, or an auxiliary plane is selected, and on the paper sheet when `Paper` is selected.

Advantages:

- Simple toolbar.
- User does not need duplicate tools.
- The existing plane selector clearly changes the construction context.

Risks:

- Users may accidentally create paper elements when they expected projection-plane elements.
- Tool status messages must be very explicit.
- Some tools have no obvious paper equivalent.

### Option B: Dedicated Paper Tool Family

Add a Paper family or Paper subtools such as Paper Point, Paper Line, Paper Segment, Paper Intersection.

Advantages:

- No ambiguity about what will be created.
- Easier to incrementally ship a small set.
- Existing plane tools remain untouched.

Risks:

- Toolbar grows.
- Switching between plane and paper workflows may feel heavier.

Recommendation: use Option A conceptually for tools with paper semantics. The special `Paper` plane should make the existing geometric tools operate on paper. Projection-specific tools should be disabled while `Paper` is active with a clear tooltip or status message, for example "Guides are only available on projection planes." Internally, the implementation can phase support by routing each tool through paper-specific intents, but unsupported paper-capable tools should be treated as temporary implementation gaps rather than separate user concepts. Tool status text and command descriptions should still say "Paper line" or "Paper segment" so the active construction context is clear.

This approach fits the user's intended model better than a separate workspace mode toggle.

## Domain Model Proposal

Add paper-level domain classes under a dedicated namespace, not inside `ProjectionPlane`.

Possible structure:

```text
frontend/src/domain/world/paper/
  PaperElement.ts
  PaperPoint.ts
  PaperLine.ts
  PaperSegment.ts
  PaperRealization.ts
```

World storage would gain:

```ts
private paperPoints: Map<string, PaperPoint>;
private paperLines: Map<string, PaperLine>;
private paperSegments: Map<string, PaperSegment>;
```

Paper elements should follow the same definition/realization split as existing domain geometry:

- Definitions store IDs and construction rules.
- Realizations compute numeric paper geometry.
- Presentation selectors render realizations.

Suggested classes:

- `PaperFreePoint`: stores a paper `Vector3`.
- `PaperPointFromSource`: references a plane point or another paper construction output. This may be unnecessary if paper references remain argument values instead of stored points.
- `PaperLineByTwoPoints`: references two paper point references.
- `PaperSegmentByTwoPoints`: references two paper point references.
- `PaperLineLineIntersection`: references two paper line references. It may be pure paper-paper, or it may involve one or more projection-plane element representations.
- `PaperIntersectionWithPlaneSibling`: or equivalent split classes, where the paper intersection is primary and one or more plane sibling points are secondary outputs only when at least one source reference belongs to a real projection plane.

The key abstraction is probably not a `PaperPoint` base class alone, but a `PaperGeometryRef` value:

```ts
type PaperGeometryRef =
  | { kind: 'paper-element'; elementId: string }
  | { kind: 'plane-element'; elementId: string; planeId: string };
```

Paper elements can depend on these refs and realize them through a paper realization context.

For sibling outputs, add a plane-owned dependent point class rather than storing a copied coordinate. This class is only valid when the paper intersection records a source projection-plane representation for the target plane. A single paper intersection may create multiple instances of this class when the source representation belongs to multiple projection planes, such as a hinge line:

```ts
class Point2DFromPaperIntersection extends Point2D {
  readonly paperIntersectionId: string;
  readonly planeId: string;
}
```

The exact name can follow the existing sibling naming conventions, but the semantics should be unambiguous: it is a real projection-plane point whose definition is a paper-level intersection result.

## Realization Rules

Paper realization context should provide:

- Plane lookup.
- Projection-plane 2D realization lookup.
- Existing plane element realization lookup.
- Paper element lookup.
- Paper element realization lookup.

For a plane element reference:

1. Locate the source projection plane.
2. Realize the source element in plane coordinates.
3. Realize the projection plane in paper coordinates.
4. Transform the source realization by `planeToPaper2D`.
5. Return a paper realization.

For a paper-native element reference:

1. Locate the paper element.
2. Realize it in paper coordinates.
3. Return the realization directly.

If a source element or plane transform is infeasible, dependent paper elements should be infeasible and should not render, matching current domain style.

For each projection-plane sibling created from a paper intersection involving at least one projection-plane element representation:

1. Realize the paper intersection in paper coordinates.
2. Realize the sibling's target projection plane in 2D.
3. Apply the target plane's `paperToPlane2D` transform to the paper point.
4. Return a normal `Point2DRealization2D` in that plane's intrinsic coordinates.

The sibling should be infeasible when the paper intersection is infeasible or its target plane transform is infeasible.

The sibling creation rule must reject pure paper-paper intersections because there is no real projection plane to receive the mapped point.

## Dependency Behavior

Paper elements should participate in the dependency graph.

Examples:

- A paper segment from `PH/A` to `PV/B` depends on `PH/A` and `PV/B`.
- A paper line using an auxiliary plane point depends on that source point and, indirectly, on the auxiliary plane transform. The implementation must decide whether transform dependencies are tracked directly through the auxiliary projection plane ID or indirectly through the source element's plane.
- A paper intersection depends on both source paper lines.
- Each projection-plane sibling depends on its paper intersection and on its target projection plane transform.

Recommended dependency IDs:

- Direct source element IDs for all referenced plane elements.
- Direct paper element IDs for referenced paper elements.
- Projection plane ID when the paper realization depends on the plane's `planeToPaper2D`, especially for auxiliary planes.
- Paper intersection ID and target projection plane ID for each projection-plane sibling.

Tracking projection-plane transform dependencies is important. If an auxiliary plane moves because its traces change, paper constructions based on its flattened representation must invalidate.

## Rendering And Styling

Paper elements should render through the existing canvas presentation path, not through ad hoc SVG logic.

Add paper canvas source builders analogous to the current plane item builders:

- Build paper element source DTOs.
- Convert source DTOs into `CanvasRenderItem`.
- Add paper query items for selection.

Suggested styling:

- Paper-native elements should be visually distinguishable but not loud.
- Plane-derived references should keep their normal appearance; paper constructions can use a separate default color.
- Selected, hovered, cascade-highlight, hidden, and process-tree visibility states should behave like current elements.

Layering should place paper constructions with ordinary elements unless there is a clear reason to separate them:

- Hinge lines and grid stay behind.
- Guides stay guide-like.
- Paper elements sit in `RenderLayer.Elements`.
- Highlights and handles remain above.

## Properties Panel

Paper elements need properties.

For a paper free point:

- Show paper coordinates `(x, y)`.
- Allow numeric editing of paper coordinates.

For a paper line or segment:

- Show type and dependencies.
- Show source endpoints if applicable.
- Allow style and visibility edits.

For a plane element selected while `Paper` is active:

- The existing properties should still show plane coordinates.
- A later enhancement could additionally show its paper coordinates as read-only.

Open question: when `Paper` is selected, should double-clicking a plane element representation open the source element properties or a paper-representation inspector? Recommendation for V1: open source element properties.

## Process Tree

Paper constructions should be recorded as ordinary construction actions.

Suggested action names:

- Create paper point
- Create paper line
- Create paper segment
- Create paper intersection
- Create paper intersection sibling on projection plane

Descriptions should include source labels and plane names when source elements come from projection planes:

- "Paper segment from A on P_H to B on P_V"
- "Paper line through C on Q and D on P_V"

Visibility toggles should hide/show paper outputs. If paper tools create intermediate paper points from empty clicks, those should either appear as normal actions or be grouped inside a subprocess if the tool is intentionally macro-like.

When an explicit paper intersection creates projection-plane siblings, all outputs should be recorded in the same action group. The paper intersection is the primary action output. Each sibling point is a secondary output on a real projection plane and should be visible/selectable unless the user or process-tree policy hides secondary outputs. Pure paper-paper intersections should record only the paper intersection action.

## Commands And Persistence

Add serializable operations for paper elements.

Likely operations:

- `AddPaperFreePoint`
- `UpdatePaperFreePointPosition`
- `AddPaperLineByTwoPoints`
- `AddPaperSegmentByTwoPoints`
- `AddPaperLineLineIntersection`
- `AddPoint2DFromPaperIntersection`
- `RemovePaperPoint`
- `RemovePaperLine`
- `RemovePaperSegment`

Each descriptor should store stable paper refs, not computed coordinates, except free paper points.

Example descriptor idea:

```json
{
  "opType": "AddPaperSegmentByTwoPoints",
  "point1": { "kind": "plane-element", "planeId": "PH", "elementId": "PH/A" },
  "point2": { "kind": "plane-element", "planeId": "PV", "elementId": "PV/B" },
  "segmentId": "paper-segment-12"
}
```

This keeps saved projects parametric. Replaying the project recomputes paper geometry from current source definitions.

Paper intersections with projection-plane siblings likely need a command sequence rather than a single operation:

1. `AddPaperLineLineIntersection` creates the explicit paper intersection.
2. One or more `AddPoint2DFromPaperIntersection` operations create sibling points inside the target projection plane(s).
3. Process-tree operations record both outputs under one action group.

Each sibling operation descriptor should store the paper intersection ID and target projection plane ID, not the computed plane coordinates. The construction use case should emit one operation for each unique target projection plane represented by the selected paper intersection arguments.

## Deletion And Cascades

Deletion must understand paper dependencies.

If the user deletes a source plane point used by a paper segment, the paper segment should be included in cascade deletion preview.

If the user deletes a paper point used by a paper line, the paper line should cascade.

If the user deletes an auxiliary plane whose paper elements are referenced, dependent paper elements should cascade or become infeasible. Existing deletion policy should drive this, but the dependency graph must include paper references for the preview to be honest.

If the user deletes a paper intersection that produced a projection-plane sibling, the sibling should cascade. If the user deletes the sibling directly, the app should either delete only that secondary output or reject the deletion unless the whole paper-intersection action is deleted. Recommendation: treat the sibling as an ordinary dependent point for deletion previews, but keep the process-tree grouping visible so the user understands it came from the paper intersection.

## Visibility And Hidden Intermediates

Paper presentation should honor the same effective visibility rules as plane and 3D presentation.

There are two separate visibility checks:

1. The paper element itself must be visible.
2. Any source element used as a paper representation should be visible, unless the product decision is that paper constructions remain visible even when sources are hidden.

Recommendation: if a paper element depends on hidden source geometry, the paper element should still render if it is an output, but its missing/hidden dependency should not render independently. This matches mathematical dependency behavior better than making downstream outputs disappear unexpectedly. However, this needs a product decision because current presentation builders often skip elements whose own effective visibility is hidden.

## Grid And Coordinates

Normal projection-plane selection currently shows grid labels in active-plane coordinates. Selecting `Paper` needs a clear coordinate story.

Options:

1. Show paper-coordinate grid and labels when `Paper` is selected.
2. Keep the most recently selected projection-plane grid labels while `Paper` is selected.
3. Hide coordinate labels while `Paper` is selected until a paper grid is designed.

Recommendation: show a paper-coordinate grid when `Paper` is selected. Otherwise a paper point's numeric `(x, y)` position would not correspond to the visible grid labels, which would be confusing.

This implies `CanvasGridSelector` should accept either a projection-plane transform or an identity paper transform depending on whether the selected plane is `Paper`.

## Interaction With 3D View

Pure-paper elements should not appear in the 3D view because they have no 3D meaning.

Projection-plane sibling points created from paper intersections are different: they are real plane-owned `Point2D` outputs and can participate in later 3D reconstruction exactly like other projection-plane points.

## Ambiguous Geometry Cases

### Circles

Current plane-to-paper transforms appear to be translation, rotation, and reflection for base and unfolded auxiliary planes, but the type system allows a general `Matrix3`. A circle under a general affine transform can become an ellipse.

V1 options:

- Support paper circles only when the transform preserves circle radius.
- Render transformed circles as paths/ellipses and introduce paper ellipse geometry.
- Defer circles from paper construction.

Recommendation: defer paper circle construction, but allow selecting/rendering existing plane circles as render-only until ellipse semantics are settled.

### Infinite Lines

A paper line derived from a plane line is infinite in paper space. It can be hit-tested and used for paper intersections. Rendering can reuse existing viewport clipping.

### Metrics

Parallel and perpendicular while `Paper` is selected are paper-metric concepts. They may not match projection-plane metric concepts after unfolding/reflection. This is acceptable if the UI calls them paper parallel/perpendicular, but it should be explicit.

## Implementation Plan

### Phase 1: Read-Only Paper Query Layer

- Add paper query items derived from current render items.
- Add a paper hit-test method used when the selected plane is `Paper`.
- Add tests proving points from different planes can both be selected in paper query context.
- No new commands yet.

### Phase 2: Paper Domain Storage And Realization

- Add paper element classes and realization context.
- Add world storage and lookup for paper elements.
- Add dependency registration for paper refs.
- Add presentation builder for paper elements.

### Phase 3: Paper Point And Segment

- Add paper free point and paper segment by two paper point refs.
- Add tool intents and command operations.
- Add process-tree actions.
- Add save/load descriptors.
- Add deletion cascade support.

This phase delivers the motivating cross-plane connection workflow.

### Phase 4: Paper Line And Intersection

- Add paper line through two paper points.
- Add paper intersection between two paper lines or segments.
- Add paper intersection between a paper element and a projection-plane element representation.
- Add projection-plane sibling point output for those explicit paper intersections only when at least one source argument comes from a real projection plane; create multiple sibling outputs when the source representation belongs to multiple planes.
- Add query/hit testing for paper line outputs.

### Phase 5: UI Polish And Properties

- Add `Paper` to the active-plane selector with special-plane presentation.
- Add paper coordinate grid.
- Add properties view support.
- Add visual distinction for paper elements.
- Add docs/user guide updates.

## Validation Plan

Unit tests:

- Paper ref realization from base plane point.
- Paper ref realization from auxiliary plane point.
- Paper segment updates when source point moves.
- Paper segment becomes infeasible or updates when source plane transform changes.
- Paper hit testing runs when the selected plane is `Paper` and does not filter by projection-plane ID.
- Plane-mode hit testing remains active-plane scoped.
- Operation descriptor round trips.
- Dependency cascade includes paper dependents.
- Projection-plane sibling realizes by applying `paperToPlane2D` to its paper intersection.
- Projection-plane sibling updates when the paper intersection or its target plane transform changes.
- Effective visibility decisions are covered for paper elements and source refs.

Architecture tests:

- Paper presentation builders should not import Vue components or stores.
- Tools should emit typed intents rather than commands.
- Domain paper classes should not import rendering or application code.

E2E tests:

- Select `Paper`, create segment between `P_H` and `P_V` points, undo, redo.
- Select `Paper`, intersect a paper line with a `P_H` line representation, and use the generated `P_H` sibling point in a normal plane construction.
- Select `Paper`, intersect a `P_H` line representation with a `P_V` line representation, and verify generated sibling points exist in both source planes.
- Select `Paper`, intersect a paper element with a hinge representation, and verify generated sibling points exist in both adjacent projection planes.
- Save and reload a project with paper segment.
- Move source point and confirm dependent paper segment endpoint follows.
- Use auxiliary plane point as source and confirm paper geometry follows after changing the auxiliary setup.

Manual checks:

- Grid labels match paper coordinates when `Paper` is selected.
- Selection, hover, snap, properties, and visibility feel distinct but not surprising.

## Risks

- The `Paper` plane may confuse users if it looks too similar to real projection planes.
- Dependency invalidation can miss auxiliary plane transform changes unless plane transform dependencies are explicitly represented.
- General affine transforms can make circle semantics more complex than expected.
- Existing selection masks are class-based around `Element2D`; paper selections need a parallel representation or selection masks need broadening.
- Process-tree visibility behavior for source-hidden dependencies needs a product decision.
- Paper intersections with generated projection-plane siblings create multi-output commands; undo, redo, deletion, and visibility need careful grouping.
- Adding world storage for paper elements broadens deletion, properties, elements panel, and persistence surfaces.

## Clarification Questions

1. Should paper-level drawing be mathematically meaningful construction geometry, or should some paper objects be annotation-only?
2. When a paper element depends on a source projection element that is later hidden, should the paper element remain visible?
3. Should tools reuse the existing Point/Line/Segment buttons when `Paper` is selected, or should there be a dedicated Paper tool family?
4. Should empty clicks during a two-point paper construction automatically create paper free points?
5. Should paper coordinates be exposed to users as a real coordinate system with numeric input/editing?
6. Should paper elements appear in the Elements panel, and if so, as a separate "Paper" group?
7. Should paper circles/ellipses be in scope soon, or should V1 deliberately focus on points, lines, segments, and intersections?
8. Should pure-paper geometry be allowed as auxiliary projection-plane construction aid in any non-3D sense, or should every paper-to-plane bridge go through explicit sibling outputs?
9. What should the projection-plane sibling be named in UI and code: "sibling intersection", "paper sibling", "projected paper intersection", or another historical term?
10. Should generated projection-plane sibling points be visible by default, or should they follow a secondary-output visibility policy?

## Recommendation

Treat this as a new first-class paper construction layer, not as a rendering shortcut. The existing paper transforms make the visual part tractable, but the user-visible feature requires new paper elements, paper refs, paper hit testing, commands, persistence, process-tree actions, deletion dependencies, projection-plane sibling outputs, and properties.

Ship the feature incrementally:

1. Add paper query/hit testing.
2. Add paper free points and paper segments.
3. Add paper line and intersection support.
4. Add projection-plane sibling output for explicit paper intersections.
5. Add richer tools and coordinate editing once the core model is stable.

The first user-visible milestone should be: "Select `Paper`, create a paper segment between a point on `P_H` and a point on `P_V`, save/reload it, and have it update when either source point moves."

The second milestone should be: "Select `Paper`, explicitly create a paper intersection involving a projection-plane element representation, and receive generated sibling point(s) inside the relevant real projection plane(s)."
