# Parameterized Geometric Tools Design Plan

Status: partially implemented. Direct scalar collection, radius-vector circles, relative-angle lines and property edits exist in the current candidate. Preview handles and the remaining proposals below are not a delivery claim.

## Summary

Add support for tools that collect geometric parameters, not only selected elements or free plane positions.

The first two user-facing outcomes are:

- the existing `Circle` toolbar button gains a second construction chain: center plus radius;
- a new explicit line tool creates a line through a point at a chosen angle relative to a reference line.

Both constructions must support mouse input and numeric input. Both must also support later parameter editing through visual handles and properties.

The important architectural choice is that radius and angle are stored as real construction parameters. They are not represented as ordinary auxiliary points in the world. Editing controls are visual handles derived from the selected element and its realization.

## Goals

1. Keep the current circle construction unchanged: center plus circumference point still creates a circle dependent on both points.
2. Add a second circle construction under the same `Circle` button: center plus radius.
3. Add a separate, clearly intentional line tool for point plus reference line plus relative angle.
4. Support both mouse input and numeric input for radius and angle parameters.
5. Store parameterized constructions in the domain model so undo, redo, persistence, dependency tracking, and realization work like other constructions.
6. Add a reusable parameter-handle mechanism for editing radius and angle graphically.
7. Keep parameter handles out of normal geometry: they are not points, do not appear in the element panel, and do not participate in intersections.
8. Extend the argument collection system rather than creating command shortcuts that bypass tools.

## Non-Goals

This plan does not replace the current circle-by-point construction.

This plan does not make every tool accept numeric input immediately. It introduces the generic mechanism and implements only the first parameterized cases.

This plan does not add formulas, expressions, named variables, constraints, dimension annotations, or a general CAD constraint solver.

This plan does not require a new circle toolbar button. The circle variant is selected by the argument path the user takes after selecting the center.

## Current State

`ArgumentCollectorTool` currently works around `ToolArgumentSet[]` and `SelectionMask`.

Current circle tool:

```ts
center: point
circumferencePoint: point
```

It creates:

```ts
Circle2DByCenterAndPoint
```

This means the radius is the distance from the center point to a real circumference point. If the center moves while the circumference point stays fixed, the radius changes. That is correct for this construction, but not for a center-plus-radius construction.

The status-bar input added by `docs/architecture/plane-position-input-widget-plan.md` currently targets free plane positions. The next step is to generalize that idea into a tool argument input that can submit coordinates, distances, or angles depending on the active argument.

## Review-Driven Refinements

The architecture review in `docs/architecture/parameterized-geometric-tools-design-plan-review.md` raises several sound issues that this plan adopts:

- parameter edits must never commit zero-length radius vectors or non-finite angles;
- angle sign must be defined in intrinsic plane coordinates, not by SVG screen orientation;
- handle drags may snap to existing geometry, but snapping copies a coordinate only and never changes the construction type;
- parameterized elements must register dependencies correctly so normal cascade deletion removes dependents before a parent disappears;
- the argument model should avoid a large one-type-per-parameter hierarchy.

One review recommendation is only partially adopted: distances and angles are not modeled as unrelated bare numbers because mouse input needs geometric context. Instead, the collector uses a single scalar argument type whose numeric value can also be derived from a geometric mouse resolver.

## User Experience

### Circle Tool

The toolbar still has one `Circle` button.

Initial state:

```text
Circle: pick center
```

After the center is selected, two chains remain viable:

```text
Circle: pick circumference point or enter radius
```

Supported inputs:

- click an existing point: create `Circle2DByCenterAndPoint`;
- click free space: create `Circle2DByCenterAndRadiusVector` using the distance from center to click;
- type a number such as `90` and press Enter: create `Circle2DByCenterAndRadiusVector`;
- paste/type decimal values such as `90.5` or `90,5`, depending on the numeric parser rules.

During mouse movement after center selection, the app should preview the radius circle and show a concise measurement, for example:

```text
Radius: 90.00
```

Numeric radius input needs a direction because the domain stores a radius vector, not just a scalar. The rules should be:

1. If the user has a current mouse preview direction, preserve it.
2. Otherwise use the positive `u` direction of the active plane.
3. When editing an existing radius numerically, preserve the current radius-vector direction and only change its length.

### Line With Angle Tool

This is a new toolbar tool in the line family, with a clear icon and label such as `Line with angle`.

The first two arguments can be collected in either order:

```text
referenceLine: line
throughPoint: point
angle: angle
```

After the reference line and through point are known, the tool accepts:

- click free space: compute a signed angle from the reference line to the vector from through point to click;
- type `30`: create the line at `+30 degrees`;
- type `-30`: create the line at `-30 degrees`.

While choosing the angle with the mouse, the app previews the line and shows:

```text
Angle: 30.0 deg
```

The stored angle should be in radians. The text input should use degrees because that is the expected drafting UI.

Positive typed and displayed angles use the mathematical counter-clockwise convention in the active projection plane's intrinsic `(u, v)` coordinate system. The SVG/canvas presentation may have a y-down screen orientation, but that must not define angle sign. Mouse positions are first converted back to plane coordinates; all angle calculations and previews then use the same plane-coordinate convention.

### Editing

Parameterized elements show handles when selected or hovered.

Circle-by-radius:

- one radius handle appears at `center + radiusVector`;
- dragging it previews and then commits a new radius vector;
- numeric property editing changes the radius length while preserving direction.

Line-with-angle:

- one angular handle appears on the parameterized line at a fixed screen or plane distance from the through point;
- dragging it previews and then commits a new relative angle;
- numeric property editing changes `angleRadians`.

Handles should have their own styling and cursor. They should look like edit controls, not construction points.

## Domain Model

### Circle By Center And Radius Vector

Add to `frontend/src/domain/world/Circle.ts`:

```ts
export class Circle2DByCenterAndRadiusVector extends Circle2D {
  readonly centerPointId: string;
  readonly radiusVector: Vector3;
}
```

Construction dependencies:

```ts
getDependencies(): string[] {
  return [this.centerPointId];
}
```

Realization:

```ts
center = realize(centerPointId).position
radiusVector = this.radiusVector.clone()
```

Validation:

- `radiusVector.z` should be forced to `0`;
- `radiusVector.lengthSq()` must be above a shared minimum threshold;
- infeasible center realization propagates infeasibility.

Use a named threshold, for example:

```ts
const MIN_PARAMETER_RADIUS = 1e-6;
```

Construction and update operations must reject radius vectors shorter than this threshold. Drag previews may visually clamp to the threshold along the last valid direction to avoid flicker, but commit must still go through the same operation validation. Numeric radius input below the threshold should show a validation error and keep the current construction unchanged.

The radius vector is stored in the projection plane's intrinsic coordinates. Moving the center point translates the circle without changing `radiusVector`. When the plane is rendered through `planeToPaper`, the center point and radius vector are transformed consistently for presentation. If a future feature mutates a projection plane's intrinsic basis, that feature must define whether existing intrinsic construction parameters are preserved or migrated; this plan assumes projection plane coordinate systems are stable after creation.

The scalar radius remains derived from the realization:

```ts
realization.getRadius()
```

### Line By Point And Relative Angle

Add to `frontend/src/domain/world/Line.ts`:

```ts
export class Line2DByPointAndRelativeAngle extends Line2D {
  readonly referenceLineId: string;
  readonly throughPointId: string;
  readonly angleRadians: number;
}
```

Dependencies:

```ts
getDependencies(): string[] {
  return [this.referenceLineId, this.throughPointId];
}
```

Realization:

```ts
baseDirection = referenceLine.realize2D(context).getDirection()
direction = rotate2D(baseDirection, angleRadians)
point1 = throughPoint.realize2D(context).position
```

The resulting line is infinite:

```ts
new Line2DRealization2D(point1, direction, true)
```

Normalize `angleRadians` to `(-Math.PI, Math.PI]` when constructing or updating. This avoids unstable values like `450 deg` being serialized forever as large angles.

If either parent realization is infeasible, return an infeasible line realization. If a parent element is missing entirely, that is an internal dependency invariant failure and may throw, matching existing `Line2DByTwoPoints`, `Line2DParallel`, and `Circle2DByCenterAndPoint` behavior. Missing parents should not occur after normal user deletion because the dependency graph must cascade-delete dependent parameterized elements first.

## Operations

Add persistible operations:

```ts
AddCircle2DByCenterAndRadiusVectorOp
UpdateCircle2DRadiusVectorOp
AddLine2DByPointAndRelativeAngleOp
UpdateLine2DRelativeAngleOp
```

Descriptors should use flat fields, matching newer world operations:

```ts
{
  opType: 'AddCircle2DByCenterAndRadiusVector',
  planeId,
  centerPointId,
  radiusVector: [x, y, z],
  circleId
}
```

```ts
{
  opType: 'UpdateCircle2DRadiusVector',
  planeId,
  circleId,
  newRadiusVector: [x, y, z]
}
```

```ts
{
  opType: 'AddLine2DByPointAndRelativeAngle',
  planeId,
  referenceLineId,
  throughPointId,
  angleRadians,
  lineId
}
```

```ts
{
  opType: 'UpdateLine2DRelativeAngle',
  planeId,
  lineId,
  newAngleRadians
}
```

Register all four in:

```text
frontend/src/commands/operations/world/registerWorldOperationDescriptors.ts
```

Undo strategy:

- add operations remove the created element;
- update operations store the previous parameter value on first apply and restore it on undo;
- update operations invalidate the edited element realization and all dependents through the existing dependency invalidation helper.

## Construction Service And Factories

Extend `ProjectionConstructionService`:

```ts
addCircle2DByCenterAndRadiusVector(...)
addLine2DByPointAndRelativeAngle(...)
```

Validation belongs here:

- center point must exist on the target plane;
- through point must exist on the target plane;
- reference line must exist and be realizable;
- radius must be finite and at least `MIN_PARAMETER_RADIUS`;
- angle must be finite and normalized.

The construction service must also register dependencies for the new elements. This is required for cascade deletion, dependency invalidation, and process-tree consistency:

- circle by radius depends on `centerPointId`;
- line by angle depends on `referenceLineId` and `throughPointId`.

Extend sequence factories:

```ts
CircleSequenceFactory.createCircleByCenterAndRadiusVector(...)
LineSequenceFactory.createLineByPointAndRelativeAngle(...)
```

Process tree actions can initially reuse:

```ts
createCircleAction(circleId)
createLineAction(lineId)
```

Element descriptors should distinguish construction descriptions:

- circle by radius: `center at point A with radius 90.00`;
- line with angle: `through point A at 30.0 deg to line r`.

## Tool Argument Model

Replace the implicit assumption that every argument is an element selection with a tagged argument spec.

Proposed shape:

```ts
export type ToolArgumentSpec =
  | ElementArgumentSpec
  | PlanePositionArgumentSpec
  | ScalarArgumentSpec;
```

Element arguments:

```ts
interface ElementArgumentSpec {
  kind: 'element';
  name: string;
  mask: SelectionMask;
  validator?: ...;
}
```

Free plane positions:

```ts
interface PlanePositionArgumentSpec {
  kind: 'plane-position';
  name: string;
}
```

Scalar parameters:

```ts
interface ScalarArgumentSpec {
  kind: 'scalar';
  name: string;
  valueKind: 'distance' | 'angle';
  unit: 'plane-units' | 'degrees';
  min?: number;
  max?: number;
  numericInput: boolean;
  mouseInput: boolean;
  mouseResolver?: ScalarMouseResolverSpec;
}
```

Mouse resolvers are the geometric bridge between a scalar parameter and a plane position:

```ts
type ScalarMouseResolverSpec =
  | {
      kind: 'distance-from-point';
      fromArgument: string;
      defaultDirection?: 'positive-u';
    }
  | {
      kind: 'angle-from-line';
      vertexArgument: string;
      referenceLineArgument: string;
    };
```

This keeps text parsing and status-bar state generic while still giving mouse input enough geometric context to derive a radius or relative angle.

An angle scalar's numeric input unit is degrees, but its collected domain value is radians.

Collected values should also be tagged:

```ts
export type ArgumentValue =
  | { kind: 'element'; element: Element2D; planeCoords: Vector3 }
  | { kind: 'plane-position'; planeCoords: Vector3 }
  | {
      kind: 'scalar';
      valueKind: 'distance';
      value: number;
      direction?: Vector3;
      planeCoords?: Vector3;
    }
  | {
      kind: 'scalar';
      valueKind: 'angle';
      radians: number;
      planeCoords?: Vector3;
    };
```

Examples:

```ts
{
  kind: 'scalar',
  name: 'radius',
  valueKind: 'distance',
  unit: 'plane-units',
  min: MIN_PARAMETER_RADIUS,
  numericInput: true,
  mouseInput: true,
  mouseResolver: {
    kind: 'distance-from-point',
    fromArgument: 'center',
    defaultDirection: 'positive-u'
  }
}
```

```ts
{
  kind: 'scalar',
  name: 'angle',
  valueKind: 'angle',
  unit: 'degrees',
  numericInput: true,
  mouseInput: true,
  mouseResolver: {
    kind: 'angle-from-line',
    referenceLineArgument: 'referenceLine',
    vertexArgument: 'throughPoint'
  }
}
```

The rejected alternative was one dedicated argument spec per parameter type. That split is unnecessary. Distance and angle are both scalar arguments from the collector's point of view; the resolver determines how a mouse position turns into the scalar.

The angle resolver computes:

```ts
signedAngleCCW(referenceDirection, mousePosition - vertexPosition)
```

in projection-plane coordinates.

The distance resolver computes:

```ts
distance = length(mousePosition - fromPosition)
direction = normalize(mousePosition - fromPosition)
```

and rejects or clamps preview when the distance is below `MIN_PARAMETER_RADIUS`.

For numeric distance input, the value is complete but the direction may need to be inferred:

1. current mouse preview direction if one exists;
2. existing parameter direction for edits;
3. resolver default direction, usually positive `u`.

For numeric angle input, the scalar is complete and no plane position is required.

The collector must validate resolver prerequisites before making a scalar argument viable. For example, `radius` is not viable until `center` is collected, and `angle` is not viable until both `referenceLine` and `throughPoint` are collected.

The collector must be able to answer three separate questions:

1. Which element masks are currently viable?
2. Can a free canvas click currently submit a plane position or scalar parameter?
3. What text input kind is currently expected?

This replaces the current narrower capability:

```ts
acceptsPlanePositionInput()
```

with a generic one:

```ts
getActiveToolArgumentInput(): ToolArgumentInputRequest | null
handleToolArgumentTextInput(value: ParsedToolArgumentInput): ToolResult
```

`ParsedToolArgumentInput` should be typed around the status-bar input kind:

```ts
type ParsedToolArgumentInput =
  | { kind: 'plane-position'; position: Vector3 }
  | { kind: 'scalar'; valueKind: 'distance'; value: number }
  | { kind: 'scalar'; valueKind: 'angle'; radians: number };
```

The collector then maps parsed text input to the currently viable `ScalarArgumentSpec`.

Free-click handling should stay channel-aware:

- element hit matching a viable element argument consumes that element argument;
- free click can consume a viable plane-position argument;
- free click can consume a viable scalar argument only when `mouseInput` is enabled and the resolver prerequisites are satisfied;
- text input can consume a viable scalar argument only when `numericInput` is enabled.

This preserves the circle disambiguation rule: after the center is selected, a click on an existing point creates the point-dependent circle, while a free click or numeric input creates the radius-parameter circle.

## Status Bar Input

Generalize `PlanePositionInput` into a reusable argument input component.

Proposed UI state:

```ts
interface ToolArgumentInputState {
  enabled: boolean;
  kind: 'plane-position' | 'scalar';
  valueKind?: 'distance' | 'angle';
  label: string;
  placeholder: string;
  error?: string;
}
```

Parsing:

- `plane-position`: keep the existing coordinate parser;
- scalar `distance`: parse a positive finite number, accept decimal dot and decimal comma;
- scalar `angle`: parse a finite number in degrees, then convert to radians.

Suggested accepted angle forms:

```text
30
-30
30deg
30°
0.5rad
```

For first implementation, degrees-only is acceptable if the UI placeholder makes that clear:

```text
angle deg
```

Keyboard routing should continue the current rule:

- digits, decimal separators, sign keys, delete, cursor movement, Enter, paste, and copy go to the widget when the active tool expects textual input;
- non-text tool shortcuts continue to work when the widget is blurred;
- focused inputs keep browser-native editing behavior.

## Mouse Input And Preview

Add a generic preview path for parameter arguments.

During hover/mouse move, the active tool should be able to receive the current plane position and return a preview model:

```ts
interface ToolPreview {
  primitives: PreviewPrimitive[];
  message: string;
}
```

Circle radius preview:

- preview circle centered at the selected center;
- radius from center to current plane position;
- message `Radius: ...`.

Line angle preview:

- preview infinite line through selected point;
- direction from reference direction rotated by computed signed angle;
- optional small angle arc;
- message `Angle: ... deg`.

The existing render pipeline may need a dedicated transient preview layer. It should not create world elements or command operations while the user is merely moving the mouse.

Preview generation must avoid creating temporary world elements. It should produce primitives or presentation DTOs only. Keep the preview item count small and recompute from current collected arguments rather than maintaining a parallel preview world; this prevents the preview layer from becoming a performance-heavy second realization pipeline.

## Editable Parameter Handles

Add a presentation/read-model layer that derives handles from selected or hovered parameterized elements.

Suggested model:

```ts
interface EditableParameterHandle {
  id: string;
  ownerElementId: string;
  planeId: string;
  kind: 'radius' | 'angle';
  position: Vector3;
  label: string;
}
```

The handle system needs:

- selector: selected/hovered elements to handles;
- rendering: handle primitive, probably crosshair or small square/circle with distinct styling;
- hit-test: handle hit-test before normal element hit-test;
- interaction: start preview command, update on mouse move, commit on mouse up, cancel on Escape;
- command sink: new update operations.

This should live near existing canvas interaction code, but not inside domain geometry:

```text
frontend/src/application/canvasPresentation/EditableParameterHandleSelector.ts
frontend/src/application/canvas/CanvasParameterHandleUseCase.ts
frontend/src/application/canvas/CanvasInteractionController.ts
```

Handles are not part of `World`. They are derived UI affordances.

Handle drag snapping policy:

- a handle drag may snap its cursor position to an existing point or element snap point;
- snapping only supplies the plane coordinate used to compute the new parameter;
- snapping never changes the selected element's construction type;
- dragging a circle-by-radius handle onto an existing point updates `radiusVector = snapPoint - center`, but the circle remains `Circle2DByCenterAndRadiusVector`;
- dragging below the minimum radius threshold previews a minimum-radius fallback or shows an invalid preview, and commit is rejected by the update operation.

## Tool Intents

Extend `ToolConstructionIntent`:

```ts
| {
    type: 'circle-by-radius';
    planeId: string;
    centerPointId: string;
    radiusVector: Vector3;
    description: string;
  }
| {
    type: 'line-with-angle';
    planeId: string;
    referenceLineId: string;
    throughPointId: string;
    angleRadians: number;
    description: string;
  }
```

Add executors in `ConstructionUseCases.ts`:

```ts
executeCircleByRadiusIntent(...)
executeLineWithAngleIntent(...)
```

The current `circle` intent remains center plus circumference point.

## Circle Tool Design

The existing `CircleTool` should expose two argument sets:

```ts
[
  {
    label: 'center and point',
    arguments: [
      { kind: 'element', name: 'center', mask: SelectionMask.point() },
      { kind: 'element', name: 'circumferencePoint', mask: SelectionMask.point() }
    ]
  },
  {
    label: 'center and radius',
    arguments: [
      { kind: 'element', name: 'center', mask: SelectionMask.point() },
      {
        kind: 'scalar',
        name: 'radius',
        valueKind: 'distance',
        unit: 'plane-units',
        min: MIN_PARAMETER_RADIUS,
        numericInput: true,
        mouseInput: true,
        mouseResolver: {
          kind: 'distance-from-point',
          fromArgument: 'center',
          defaultDirection: 'positive-u'
        }
      }
    ]
  }
]
```

Completion rules:

- if `circumferencePoint` is collected, build the existing `circle` intent;
- if `radius` is collected, build `circle-by-radius`;
- if both chains are viable after center selection, element hits should prefer the point chain and free clicks should prefer the radius chain.

This preserves the current point-based circle workflow.

## Line With Angle Tool Design

Add a new tool class:

```text
frontend/src/tools/LineWithAngleTool.ts
```

Argument set:

```ts
[
  {
    label: 'point and angle to line',
    arguments: [
      { kind: 'element', name: 'referenceLine', mask: SelectionMask.line() },
      { kind: 'element', name: 'throughPoint', mask: SelectionMask.point() },
      {
        kind: 'scalar',
        name: 'angle',
        valueKind: 'angle',
        unit: 'degrees',
        numericInput: true,
        mouseInput: true,
        mouseResolver: {
          kind: 'angle-from-line',
          referenceLineArgument: 'referenceLine',
          vertexArgument: 'throughPoint'
        }
      }
    ]
  }
]
```

The first two arguments should be order-flexible. The angle argument is only viable once both required element arguments are collected.

Add a toolbar entry in the line family with its own icon. The icon should communicate a reference line, a point, and an angle arc.

## Properties Editing

Extend `PropertiesDialogReadModel` with optional parameter fields:

```ts
parameter?: {
  kind: 'radius' | 'angle';
  value: number;
  units: 'plane-units' | 'degrees';
  editable: boolean;
}
```

Circle-by-radius:

- show radius as editable;
- save by dispatching `UpdateCircle2DRadiusVectorOp`;
- preserve current direction.

Line-with-angle:

- show angle in degrees as editable;
- save by dispatching `UpdateLine2DRelativeAngleOp`.

Do not show editable radius for `Circle2DByCenterAndPoint` in the first pass. Its radius is dependent on another point, and editing it would require moving that point or changing the construction type.

## Implementation Plan

### Phase 1: Argument Input Generalization

1. Rename or wrap `PlanePositionInput` as a generic status-bar argument input.
2. Add scalar parsers for distance and angle.
3. Replace the plane-position-only tool capability with a generic active input capability.
4. Keep the existing point-coordinate behavior working through the new generic path.
5. Add unit tests for parser behavior, scalar routing, and keyboard routing.

### Phase 2: Domain And Operations

1. Add `Circle2DByCenterAndRadiusVector`.
2. Add `Line2DByPointAndRelativeAngle`.
3. Add construction service methods.
4. Add add/update operations with descriptors and registry entries.
5. Add sequence factory methods.
6. Add descriptor registrations for process tree/read-model descriptions.
7. Add dependency registration and cascade-deletion coverage for the new element types.
8. Add domain and operation tests, including serialization/deserialization.

### Phase 3: Circle Tool Variant

1. Extend `CircleTool` to define both argument sets.
2. Add scalar distance resolver support in `ArgumentCollectorTool`.
3. Implement mouse-derived radius collection.
4. Implement numeric radius collection.
5. Add preview circle and radius status message.
6. Add validation for minimum radius in mouse, numeric, and operation paths.
7. Add unit tests for choosing point chain vs radius chain.
8. Add e2e test for creating a circle by typed radius.
9. Add e2e test for creating a circle by free click radius.

### Phase 4: Line With Angle Tool

1. Add `LineWithAngleTool`.
2. Add toolbar family entry and shortcut if desired.
3. Add scalar angle resolver support in `ArgumentCollectorTool`.
4. Implement mouse-derived signed angle collection in plane coordinates.
5. Implement numeric angle collection in degrees.
6. Add line preview and angle status message.
7. Add unit tests for angle sign, normalization, y-down presentation independence, and realization.
8. Add e2e test for creating a line by typed angle.

### Phase 5: Editable Handles

1. Add editable-parameter handle read model.
2. Render handles on selected parameterized circles and lines.
3. Add handle hit-testing before normal geometry hit-testing.
4. Add drag sessions for radius-vector updates.
5. Add drag sessions for angle updates.
6. Add snap-coordinate integration without construction-type conversion.
7. Add preview-command support and commit/cancel behavior.
8. Add e2e tests for handle dragging, snapping, invalid minimum radius, and undo/redo.

### Phase 6: Properties Editing

1. Extend properties read model with editable parameter fields.
2. Add UI controls for radius and angle.
3. Dispatch update operations on save.
4. Ensure editing a point-based circle does not show a misleading editable radius.
5. Add unit and e2e tests for parameter edits.

## Testing Matrix

Unit tests:

- distance parser accepts positive numbers and rejects invalid values;
- angle parser converts degrees to radians and supports negative values;
- radius vector is preserved when the center moves;
- radius vectors below `MIN_PARAMETER_RADIUS` are rejected by construction and update operations;
- circle-by-radius realization is infeasible for degenerate radius vectors;
- angle sign is counter-clockwise positive in plane coordinates, independent of SVG y-down presentation;
- line-with-angle follows reference line changes;
- line-with-angle returns infeasible realization when a parent realization is infeasible;
- operation serialization/restoration works;
- update operations undo correctly;
- `CircleTool` disambiguates point click vs free click/numeric radius.

Integration tests:

- command execution creates parameterized circle and line;
- project save/load restores parameterized constructions;
- dependency invalidation updates dependents after parameter edits;
- cascade deletion removes parameterized dependents when their center, reference line, or through point is removed.

E2E tests:

- create circle by center plus existing point;
- create circle by center plus typed radius;
- create circle by center plus free click radius;
- create line with angle by typed value;
- drag radius handle and undo;
- drag radius handle onto an existing point without converting the circle to point-dependent construction;
- drag angle handle and undo;
- edit radius/angle in properties.

## Risks And Decisions

### Direction For Numeric Circle Radius

Numeric radius alone does not define a radius vector direction. The plan deliberately uses a stable default direction and preserves existing preview/current direction whenever possible.

### Radius Degeneracy

Zero-length or near-zero radius vectors are invalid. The UI may clamp preview for visual stability, but operations must reject invalid commits rather than silently storing degenerate parameters.

### Angle Sign Convention

Positive angles are counter-clockwise in projection-plane coordinates. Screen-space orientation and SVG y-down rendering must never invert this convention.

### Argument Set Ambiguity

After selecting a circle center, both point and radius chains are viable. The collector must route input by channel:

- element hit matching `point` consumes `circumferencePoint`;
- free click consumes `radius`;
- numeric input consumes `radius`.

### Handles Versus Geometry

Handles must not become world points. That avoids accidental intersections, panel clutter, and dependency confusion. It does require new hit-test and drag infrastructure.

Handle snapping copies a plane coordinate into the parameter update. It does not create dependencies and does not morph the edited element into another construction type.

### Dependency Collapse

Parameterized elements rely on ordinary dependency registration. Parent deletion should cascade-remove dependents before realization sees a missing parent. If a missing parent is encountered anyway, it is an internal invariant failure, consistent with existing domain classes.

### Editing Dependent Constructions

Only parameterized constructions should expose direct parameter editing. Existing point-based constructions remain dependency-driven.

### Scope Control

The highest-risk piece is the generic handle system. Implement the creation path before handle editing so the domain and command model can settle first.
