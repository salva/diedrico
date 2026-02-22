# Operations API

Reference for all `IOperation` implementations.

## Interface

```typescript
interface IOperation {
  type: string
  parameters: Record<string, unknown>
  outputs: Record<string, unknown>
  apply(world: World): OperationResult
  undo(world: World): void
  serialize?(): SerializedOperation
}

interface OperationResult {
  success: boolean
  error?: string
}
```

## 2D Element Operations

### AddFreePoint2DOp

Creates a free point on a projection plane.

| Parameter | Type | Description |
|-----------|------|-------------|
| `planeId` | `string` | Target projection plane |
| `u` | `number` | Plane-intrinsic u coordinate |
| `v` | `number` | Plane-intrinsic v coordinate |
| `label?` | `string` | Optional label |

| Output | Type | Description |
|--------|------|-------------|
| `pointId` | `string` | Hierarchical ID of created point |

### AddLine2DByTwoPointsOp

Creates a line through two points.

| Parameter | Type | Description |
|-----------|------|-------------|
| `planeId` | `string` | Target projection plane |
| `point1Id` | `string` | First point ID |
| `point2Id` | `string` | Second point ID |

| Output | Type |
|--------|------|
| `lineId` | `string` |

### AddSegment2DByPointsOp

Creates a finite segment between two points.

| Parameter | Type | Description |
|-----------|------|-------------|
| `planeId` | `string` | Target projection plane |
| `point1Id` | `string` | Start point ID |
| `point2Id` | `string` | End point ID |

| Output | Type |
|--------|------|
| `segmentId` | `string` |

### AddCircle2DByCenterAndPointOp

Creates a circle from center and perimeter point.

| Parameter | Type |
|-----------|------|
| `planeId` | `string` |
| `centerId` | `string` |
| `radiusPointId` | `string` |

| Output | Type |
|--------|------|
| `circleId` | `string` |

### AddGuide2DPerpendicularToLineOp

Creates a guide perpendicular to a hinge line through a point.

| Parameter | Type |
|-----------|------|
| `planeId` | `string` |
| `lineId` | `string` |
| `throughPointId` | `string` |

| Output | Type |
|--------|------|
| `guideId` | `string` |

### AddSiblingGuide2DOp

Auto-creates the paired guide on the sibling plane.

| Parameter | Type |
|-----------|------|
| `originalGuideId` | `string` |
| `siblingPlaneId` | `string` |

| Output | Type |
|--------|------|
| `siblingGuideId` | `string` |

## Intersection Operations

### AddLineLineIntersectionPoint2DOp

| Parameter | Type |
|-----------|------|
| `planeId` | `string` |
| `line1Id` | `string` |
| `line2Id` | `string` |

### AddLineCircleIntersectionPoint2DOp

| Parameter | Type |
|-----------|------|
| `planeId` | `string` |
| `lineId` | `string` |
| `circleId` | `string` |
| `index` | `0 \| 1` |

### AddCircleCircleIntersectionPoint2DOp

| Parameter | Type |
|-----------|------|
| `planeId` | `string` |
| `circle1Id` | `string` |
| `circle2Id` | `string` |
| `index` | `0 \| 1` |

## 3D Element Operations

### Add3DPointOp

| Parameter | Type | Description |
|-----------|------|-------------|
| `projection1PointId` | `string` | 2D point on plane 1 |
| `projection2PointId` | `string` | 2D point on plane 2 |
| `plane1Id` | `string` | First projection plane |
| `plane2Id` | `string` | Second projection plane |

### Add3DLineOp

| Parameter | Type |
|-----------|------|
| `line1Id` | `string` |
| `line2Id` | `string` |

### Add3DSegmentOp

| Parameter | Type |
|-----------|------|
| `segment1Id` | `string` |
| `segment2Id` | `string` |

### Add3DPlaneOp

| Parameter | Type |
|-----------|------|
| `point3D1Id` | `string` |
| `point3D2Id` | `string` |
| `point3D3Id` | `string` |

## Mutation Operations

### UpdateFreePoint2DPositionOp

| Parameter | Type |
|-----------|------|
| `pointId` | `string` |
| `newU` | `number` |
| `newV` | `number` |

### UpdateElementStyleOp

| Parameter | Type |
|-----------|------|
| `elementId` | `string` |
| `style` | `Partial<VisualStyle>` |

### RemovePoint2DOp / RemoveLine2DOp / RemoveCircle2DOp

| Parameter | Type |
|-----------|------|
| `elementId` | `string` |

## Process Tree Operations

### AddProcessTreeActionOp / AddProcessTreeActionGroupOp

Records construction actions in the process tree for history tracking.

### PushSubprocessOp / PopSubprocessOp

Manages the subprocess nesting stack.

### ToggleEncapsulationOp / ToggleOutputOp

Toggles visibility and output flags on tree nodes.
