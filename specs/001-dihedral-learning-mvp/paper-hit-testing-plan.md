# Paper Layer Hit Testing - Implementation Plan

## Overview

Move snapping/selection logic from Tools to Paper layer. Paper becomes the spatial query engine that handles coordinate transformations and proximity detection.

## Architecture

### Current (Broken)
```
Tools → World.getAllPoints()
     → Manually iterate points
     → Compare in WRONG coordinate space (plane vs pixels)
     → Return point ID
```

### New (Correct)
```
Tools → Paper.hitTest(canvasPos: Vector2, snapRadius: number)
     → Paper applies inverse transforms (canvas → paper → plane)
     → Paper searches primitives in paper space
     → Paper returns HitResult with elementId
     → Tools use elementId to create commands
```

## Key Principle: Use Vectors, Not (x, y)

**Always pass coordinates as Vector2/Vector3:**
```typescript
// ✓ Good
Paper.hitTest(canvasPos: Vector2, snapRadius: number)

// ✗ Bad  
Paper.hitTest(x: number, y: number, snapRadius: number)
```

## Data Structures

### HitResult
```typescript
interface HitResult {
  elementId: string;      // Source element ID (e.g., "point_1", "line_2")
  elementType: string;    // "point" | "line" | "circle" | "segment"
  primitiveId: string;    // Primitive ID (e.g., "point-point_1")
  distance: number;       // Distance in canvas pixels
  snapPoint?: Vector2;    // Where to snap (canvas coords)
}
```

### Paper State
```typescript
class Paper {
  private primitives: Primitive[] = [];
  private viewportTransform: ViewportTransform;
  private planeTransforms: Map<string, Matrix3>;
  private hoveredElementId?: string;  // For visual feedback
  
  hitTest(canvasPos: Vector2, snapRadius: number): HitResult | null
  setHoveredElement(elementId: string | undefined): void
}
```

## Implementation Steps

### T046: Paper.hitTest() Implementation

**1. Add HitResult interface** (frontend/src/domain/presentation/Paper.ts)
```typescript
export interface HitResult {
  elementId: string;
  elementType: string;
  primitiveId: string;
  distance: number;
  snapPoint?: Vector2;
}
```

**2. Add Paper.hitTest() method** (frontend/src/domain/presentation/Paper.ts)
```typescript
class Paper {
  hitTest(canvasPos: Vector2, snapRadius: number): HitResult | null {
    // 1. Transform snap radius through inverse viewport
    //    snapRadiusPaper = snapRadius / viewport.zoom
    
    // 2. Transform canvas position to paper space
    //    paperPos = inverseViewport(canvasPos)
    
    // 3. Search primitives for closest within radius
    let closestHit: HitResult | null = null;
    let minDistance = snapRadius;
    
    for (const primitive of this.primitives) {
      if (primitive.type === 'point') {
        const distance = this.distanceToPoint(paperPos, primitive);
        if (distance < minDistance) {
          closestHit = {
            elementId: primitive.sourceEntityId,
            elementType: 'point',
            primitiveId: primitive.id,
            distance: distance * viewport.zoom, // Convert back to canvas pixels
            snapPoint: new Vector2(primitive.x, primitive.y) // Paper coords
          };
          minDistance = distance;
        }
      }
      // TODO: Add line, circle distance checks
    }
    
    return closestHit;
  }
  
  private distanceToPoint(pos: Vector2, primitive: PointPrimitive): number {
    const dx = primitive.x - pos.x;
    const dy = primitive.y - pos.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
```

**3. Store transforms in Paper**
Paper needs viewport and plane transforms to do inverse transformations:
```typescript
class Paper {
  updateTransforms(
    viewport: ViewportTransform,
    planeTransforms: Map<string, Matrix3>
  ): void {
    this.viewportTransform = viewport;
    this.planeTransforms = planeTransforms;
  }
}
```

### T047: Refactor Tools to Use Paper.hitTest()

**LineTool refactor:**
```typescript
// Old (broken):
handleClick(context: ToolContext): ToolResult {
  const nearestPoint = this.findNearestPoint(
    context.canvasCoords, 
    context.planeId, 
    context.world,
    context
  );
  // ...
}

// New (clean):
handleClick(context: ToolContext): ToolResult {
  const hit = paper.hitTest(
    new Vector2(context.canvasCoords.x, context.canvasCoords.y),
    20 // snap radius in pixels
  );
  
  if (!hit || hit.elementType !== 'point') {
    return this.failure('Click near a point to select it');
  }
  
  // Use hit.elementId directly
  if (this.state === 'waiting-first') {
    this.firstPointId = hit.elementId;
    // ...
  }
}
```

**Remove:** LineTool.findNearestPoint() method (no longer needed)

### T048: Hover Visual Feedback

**1. Track mouse movement in SvgCanvas:**
```typescript
function handleMouseMove(event: MouseEvent) {
  if (!svgElement.value) return;
  
  const canvasPos = screenToCanvas(event.clientX, event.clientY);
  const hit = paper.hitTest(new Vector2(canvasPos.x, canvasPos.y), 20);
  
  paper.setHoveredElement(hit?.elementId);
  // Trigger re-render to show hover styling
}
```

**2. PaperService uses hovered state:**
```typescript
generatePrimitives(context: PrimitiveContext): Primitive[] {
  // ...
  const isHovered = context.hoveredElementId === point.id;
  const style = this.resolvePointStyle(point, isHighlighted, isSnapTarget, isHovered);
}
```

**3. SVG renders with hover class:**
```vue
<circle
  v-for="{ primitive, attrs } in renderedPoints"
  :key="primitive.id"
  v-bind="attrs"
  :class="{ 'hovered': primitive.sourceEntityId === hoveredElementId }"
/>

<style>
circle.hovered {
  fill: orange !important;
  stroke-width: 2.5 !important;
  cursor: pointer;
}
</style>
```

## Coordinate Transformation Details

### Inverse Viewport Transform
```typescript
// Forward: paper → canvas
// x_canvas = (x_paper + panX) * zoom
// y_canvas = (y_paper + panY) * zoom

// Inverse: canvas → paper
function canvasToPaper(canvasPos: Vector2, viewport: ViewportTransform): Vector2 {
  return new Vector2(
    canvasPos.x / viewport.zoom - viewport.panX,
    canvasPos.y / viewport.zoom - viewport.panY
  );
}

// Transform snap radius
const snapRadiusPaper = snapRadiusCanvas / viewport.zoom;
```

### Why Paper Space is Correct

**Option 1: Check in Paper Space** (✓ Chosen)
- Canvas → Paper transformation is simple (just zoom + pan)
- Primitives already in paper coordinates
- One transformation, one distance check
- Fast and accurate

**Option 2: Check in Plane Space** (✗ More complex)
- Would need Canvas → Paper → Plane
- Different plane transforms for each element
- Multiple coordinate systems
- Slower

**Option 3: Check in Canvas Space** (✗ Most complex)
- Would need to transform ALL primitives to canvas space
- Wasteful (already done for rendering)
- Would need to store transformed positions

## Extension: Distance to Lines

For future line/circle snapping:

```typescript
// Distance from point to line segment
private distanceToLine(pos: Vector2, primitive: LinePrimitive): number {
  // Parametric line: P(t) = point + t * direction
  // Find closest point on line to pos
  
  const lineStart = new Vector2(primitive.point.x, primitive.point.y);
  const lineDir = new Vector2(primitive.direction.x, primitive.direction.y);
  
  // Project pos onto line
  const toPos = pos.clone().sub(lineStart);
  const t = toPos.dot(lineDir); // lineDir is normalized
  
  // Closest point on line
  const closest = lineStart.clone().add(lineDir.multiplyScalar(t));
  
  // Distance
  return pos.distanceTo(closest);
}
```

## Testing Strategy

**Unit Tests:**
```typescript
describe('Paper.hitTest', () => {
  it('finds point within snap radius', () => {
    const paper = new Paper();
    paper.setPrimitives([/* point primitive */]);
    
    const hit = paper.hitTest(new Vector2(105, 205), 20);
    expect(hit?.elementId).toBe('point_1');
  });
  
  it('returns null when no element nearby', () => {
    const hit = paper.hitTest(new Vector2(500, 500), 20);
    expect(hit).toBeNull();
  });
  
  it('transforms snap radius correctly with zoom', () => {
    paper.updateTransforms({ zoom: 2, panX: 0, panY: 0 });
    // At 2x zoom, 20px radius = 10 paper units
    const hit = paper.hitTest(new Vector2(210, 200), 20);
    expect(hit).not.toBeNull();
  });
});
```

**Integration Test:**
```typescript
it('line tool snaps to nearby point', () => {
  // Create point
  // Switch to line tool
  // Click near point (within 20px)
  // Verify point was snapped (hover feedback)
  // Click second point
  // Verify line created
});
```

## Benefits

1. **Correct coordinate space** - All distance checks in paper space with properly scaled snap radius
2. **Tool simplification** - Tools just call `paper.hitTest()`, no coordinate math
3. **Extensibility** - Easy to add line/circle snapping by adding more distance functions
4. **Performance** - Single pass through primitives, efficient spatial queries
5. **Separation of concerns** - Paper handles rendering/selection, tools handle logic
6. **Testability** - Paper.hitTest() can be unit tested independently

## Migration Path

1. **T046**: Implement Paper.hitTest() (new code, doesn't break anything)
2. **T047**: Refactor LineTool to use hitTest() (replace findNearestPoint)
3. **T048**: Add hover feedback using hitTest() (new feature)
4. **Future**: Add line/circle/segment hit testing as needed
