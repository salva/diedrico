# Research: Diedrico MVP Technical Decisions

**Date**: 2025-12-22  
**Purpose**: Resolve all technical unknowns from plan.md Technical Context section

## Research Questions

From Technical Context, we need to resolve:

1. **Backend framework**: Express vs Fastify
2. **Graphics rendering**: SVG, Canvas API, or library (Three.js for 3D)
3. **Geometry computation**: Native implementation vs library
4. **Storage format**: JSON files vs SQLite, schema versioning strategy

## Decisions

### 1. Backend Framework: Express

**Decision**: Use **Express.js**

**Rationale**:
- **Maturity**: Express is the de facto standard for Node.js web frameworks with extensive ecosystem
- **Simplicity**: For this MVP, we need only 4-5 REST endpoints (CRUD for projects). Express provides exactly what we need without ceremony
- **Learning curve**: Minimal; well-documented and widely understood
- **TypeScript support**: Excellent via `@types/express`
- **Performance**: For persistence-only API with low concurrency (single-user educational tool), Express performance is more than sufficient

**Alternatives considered**:
- **Fastify**: Faster but introduces additional API concepts (schemas, plugins). Overkill for 5 endpoints serving one user at a time
- **Raw Node http**: Too low-level; would require reimplementing routing, middleware

**Implementation notes**:
- Use Express 4.x with TypeScript
- Middleware: `express.json()`, `cors()` for frontend-backend communication
- Error handling: centralized error middleware
- No authentication in MVP (single-user, local deployment)

---

### 2. Graphics Rendering Strategy

**Decision**: 
- **2D drawing**: **SVG** (D3.js for manipulation)
- **3D overlay**: **Three.js**

**Rationale**:

**For 2D (primary workspace)**:
- **SVG chosen over Canvas** because:
  - **DOM-based selection**: SVG elements are DOM nodes, making hover, click, and selection trivial with Vue event handlers
  - **Scalability**: Vector-based; no quality loss at any zoom level (critical for technical drawing)
  - **Styling**: CSS classes for visual styles (inheritance, hover effects, infeasibility states)
  - **Pedagogical fit**: Explicit elements in DOM mirror explicit entities in domain model (pedagogical transparency)
  - **Performance**: For 200 elements (spec target), SVG rendering is well within browser capabilities (<16ms frame time)
  
- **D3.js** for SVG manipulation:
  - Industry standard for SVG data binding
  - Provides zoom/pan behavior out of the box (`d3-zoom`)
  - Geometry utilities (line generators, arc paths)
  - Can integrate with Vue reactivity (render SVG from Pinia store)

**For 3D (auxiliary overlay)**:
- **Three.js**:
  - De facto standard for WebGL in browser
  - Provides camera controls (`OrbitControls` for rotate/pan/zoom)
  - Scene graph matches our 3D element hierarchy
  - Can render 2D elements on 3D planes (project SVG onto plane geometries or use sprites)
  - Read-only requirement means we don't need complex picking/raycasting

**Alternatives considered**:
- **Canvas API for 2D**: Rejected. Pixel-based rendering loses quality on zoom. Manual hit detection for 200 elements is complex. No DOM structure for accessibility.
- **WebGL/custom 2D**: Over-engineered for technical drawing; SVG is purpose-built for this
- **Babylon.js for 3D**: Comparable to Three.js but Three.js has larger community and better Vue integration examples

**Implementation notes**:
- SVG root in `<Workspace2D>` component; D3 for zoom behavior
- Each element type (point, segment, line, circle) maps to SVG primitive (`<circle>`, `<line>`, `<path>`)
- Three.js scene in `<Workspace3D>` component; OrbitControls for camera
- 3D view renders in separate canvas overlay with CSS positioning

---

### 3. Geometry Computation Library

**Decision**: **Minimal native implementation** + **math.js** for matrix operations

**Rationale**:
- **Problem scope**: Our geometry is 2D Euclidean + basic 3D reconstruction:
  - Line-line intersection (2D)
  - Point-line perpendicular
  - Circle from 3 points
  - Point projection onto line
  - Distance, midpoint, angle calculations
  
- **Complexity assessment**: These are straightforward operations (each 10-50 lines with comments). Total geometry library ~500-1000 LOC.

- **Why NOT use a library**:
  - **Turf.js**: Geospatial focus (lat/lon, projections, GeoJSON). Overkill and wrong domain
  - **JSXGraph**: Full-featured dynamic geometry software. Too heavyweight; introduces its own rendering and interaction model that conflicts with our custom SVG + Vue architecture
  - **Paper.js**: Canvas-based vector graphics library. Again, brings its own scene graph and rendering; we need fine-grained control for pedagogical features
  - **geometry-library** (npm): Unmaintained, limited types
  
- **Why native**:
  - **Control**: Exact error handling for infeasibility (e.g., parallel lines don't intersect)
  - **Precision**: Can tune epsilon for floating-point comparisons per FR-031
  - **Learning**: 500 LOC is manageable; no hidden black box
  - **Dependencies**: Fewer moving parts
  
- **math.js** for:
  - Matrix operations (if needed for 3D transformations, projections)
  - Robust numeric operations
  - Well-maintained, TypeScript-friendly

**Implementation notes**:
- Create `frontend/src/domain/geometry/calculations.ts`
- Functions like `intersectLines()`, `perpendicularThrough()`, `circleFrom3Points()`
- Each returns `Result<T, InfeasibilityReason>` type for explicit error handling
- Unit tests for each calculation with edge cases (parallel, coincident, degenerate)

---

### 4. Storage Format and Schema Versioning

**Decision**: **JSON files** with **embedded schema version**

**Rationale**:

**JSON files over SQLite**:
- **Simplicity**: Single-user tool; no concurrent access. A project is a single JSON document
- **Portability**: Projects are just files; easy to copy, version control, share
- **Inspection**: Human-readable for debugging
- **No server setup**: SQLite would require migrations, schema management. Overkill for MVP
- **When to reconsider**: If we add multi-project search, analytics, or multi-user features

**Schema versioning strategy**:
```json
{
  "schemaVersion": "1.0.0",
  "projectId": "uuid",
  "created": "ISO8601",
  "modified": "ISO8601",
  "planes": [...],
  "elements": [...],
  "actions": [...]
}
```

- **Semantic versioning** in `schemaVersion`:
  - **Major**: Breaking changes (e.g., rename `planes` to `projectionPlanes`)
  - **Minor**: Additive changes (e.g., add `arcs` array)
  - **Patch**: Clarifications, metadata changes
  
- **Migration strategy** (for future):
  - Frontend detects old `schemaVersion` on load
  - Applies migrations sequentially (1.0.0 → 1.1.0 → 2.0.0)
  - Saves back at current version
  - MVP starts at 1.0.0; no migrations needed yet

**Autosave implementation** (FR-027):
- Debounced save on every command execution (500ms delay)
- Backend endpoint: `PUT /projects/:id` with full project JSON body
- Optimistic UI: don't block on save; show indicator on error

**Alternatives considered**:
- **SQLite**: Rejected. Adds server-side state, migrations, query complexity. Not needed for single-document storage
- **IndexedDB** (browser-local): Rejected for MVP. Requires backend for sharing/backup. Could add later as offline mode
- **Git-based storage**: Interesting for versioning but over-engineered for MVP

**Implementation notes**:
- Backend stores files in `./data/projects/{projectId}.json`
- Frontend `ProjectService` handles serialization/deserialization
- Include validation on load: check schema version, validate structure
- Separate directory per project if we add attachments (images, etc.) later

---

### 5. Proximity Detection & Snapping Architecture

**Challenge**: Implementing FR-037 (hover feedback) and FR-038 (point snapping) requires:
1. Detecting when cursor is near elements (not just hovering directly over them)
2. Finding all intersections between elements near the cursor
3. Computing distances to determine closest snap target
4. Performing this efficiently on every mousemove (60fps = 16ms budget)

**Decision**: **Grid-based spatial index** + **cached intersection computation**

---

#### Coordinate System Transformation

**Critical foundation**: All spatial queries operate in **world coordinates** (the drawing's coordinate system), not screen pixels.

**Screen to World Conversion** using SVG's built-in transformation:

```typescript
function screenToWorld(
  event: MouseEvent, 
  svgElement: SVGSVGElement
): { x: number; y: number } {
  // 1. Get screen coordinates (pixels relative to viewport)
  const screenX = event.clientX;
  const screenY = event.clientY;
  
  // 2. Create SVG point in screen space
  const point = svgElement.createSVGPoint();
  point.x = screenX;
  point.y = screenY;
  
  // 3. Get Current Transformation Matrix (CTM) from SVG
  // This matrix includes ALL transforms: pan, zoom, nested groups, rotation
  const ctm = svgElement.getScreenCTM();
  
  // 4. Invert and apply to convert screen → world
  const worldPoint = point.matrixTransform(ctm.inverse());
  
  return { x: worldPoint.x, y: worldPoint.y };
}
```

**Why this is precise**:
- `getScreenCTM()` returns the **complete transformation matrix** from world coordinates to screen coordinates
- Accounts for: zoom, pan, nested SVG groups, rotations, skews
- `.inverse()` gives the exact reverse transformation: screen → world
- **Sub-pixel accuracy**: Uses floating-point math (no rounding until final render)
- **Standard SVG feature**: Not something we implement; browser does it natively

**Example with zoom/pan**:

```
// Initial state: no zoom, no pan
Screen (500, 300) → World (500, 300)

// After zoom 2x (zoom into center)
Screen (500, 300) → World (250, 150)  ✓ Correct!

// After pan (+100, +50) then zoom 2x
Screen (500, 300) → World (200, 125)  ✓ Still correct!
```

**Integration with spatial grid**:

```typescript
function onMouseMove(event: MouseEvent) {
  // 1. Convert to world coordinates
  const world = screenToWorld(event, svgRef.value);
  
  // 2. Query spatial grid (grid uses world coordinates)
  const snapRadiusWorld = adaptiveSnapRadius / currentZoom; // Convert radius too
  const nearby = spatialGrid.queryPoint(world.x, world.y, snapRadiusWorld);
  
  // 3. Calculate distances (all in world coordinates)
  const distances = nearby.map(el => ({
    element: el,
    distance: calculateDistance(world, el) // world units
  }));
  
  // 4. Find closest target
  const closest = distances.reduce((min, curr) => 
    curr.distance < min.distance ? curr : min
  );
  
  // 5. Snap if within threshold
  if (closest.distance < snapRadiusWorld) {
    snapCursorTo(closest.element); // Renders in world, SVG transforms to screen
  }
}
```

**Key insight**: 
- **Domain models store world coordinates**: `point.x = 100` means "100 units in drawing space"
- **Spatial grid uses world coordinates**: Cell (2, 4) contains region [100-150, 200-250] in world space
- **SVG handles screen rendering**: Browser automatically transforms world → screen for display
- **User interactions convert back**: `getScreenCTM().inverse()` converts screen clicks → world coordinates

**Performance**: 
- Transformation is O(1) matrix multiplication (4x4 matrix × 2D point = ~10 floating-point ops)
- Negligible compared to spatial queries (<0.01ms)
- No precision loss: coordinates remain floating-point until final pixel rendering

**Implementation notes**:
- Store `svgElement` reference in component (via `ref`)
- Create helper composable: `useCoordinateTransform(svgRef)`
- All distance/intersection calculations work in world coordinates
- Only convert at boundaries: screen events → world, world rendering → screen (SVG does this)

---

#### Spatial Indexing Strategy

**Why spatial indexing is needed**:
- Naive approach: Check distance to every element on every mousemove
- For 200 elements: 200 distance calculations × 60fps = 12,000 calculations/sec
- Too slow, especially for complex shapes (circles, arcs)

**Grid-based spatial index** (chosen over R-tree):

```typescript
class SpatialGrid {
  private cellSize: number; // e.g., 50 pixels
  private cells: Map<string, Set<ElementId>>;
  
  // Insert element into cells it overlaps
  insert(element: Element2D): void {
    const bounds = element.getBounds(); // {minX, minY, maxX, maxY}
    const cells = this.getCellsInBounds(bounds);
    cells.forEach(cellKey => {
      if (!this.cells.has(cellKey)) this.cells.set(cellKey, new Set());
      this.cells.get(cellKey).add(element.id);
    });
  }
  
  // Query elements near a point
  queryPoint(x: number, y: number, radius: number): Element2D[] {
    const bounds = {
      minX: x - radius,
      minY: y - radius,
      maxX: x + radius,
      maxY: y + radius
    };
    const cells = this.getCellsInBounds(bounds);
    const candidateIds = new Set<ElementId>();
    cells.forEach(cellKey => {
      this.cells.get(cellKey)?.forEach(id => candidateIds.add(id));
    });
    return Array.from(candidateIds).map(id => elementsStore.get(id));
  }
  
  private getCellsInBounds(bounds: Bounds): string[] {
    const cells = [];
    const startCol = Math.floor(bounds.minX / this.cellSize);
    const endCol = Math.floor(bounds.maxX / this.cellSize);
    const startRow = Math.floor(bounds.minY / this.cellSize);
    const endRow = Math.floor(bounds.maxY / this.cellSize);
    for (let col = startCol; col <= endCol; col++) {
      for (let row = startRow; row <= endRow; row++) {
        cells.push(`${col},${row}`);
      }
    }
    return cells;
  }
}
```

**Why grid over R-tree**:
- **Simpler**: R-tree requires balancing, splitting, complex insertion logic
- **Fast updates**: Grid updates are O(1) per cell; R-tree requires tree rebalancing
- **Predictable**: Grid performance is consistent; R-tree can degrade if poorly balanced
- **Sufficient**: For 200 elements with 50px cells on 1920x1080 screen = ~800 cells; most cells have 0-3 elements
- **When to reconsider**: If we hit >1000 elements or need more sophisticated queries

**Update strategy**:
- Rebuild grid on zoom (cell size adapts to zoom level)
- Incremental update when elements move: remove from old cells, insert into new
- Full rebuild on major changes: < 1ms for 200 elements

---

#### Distance Calculation Functions

**Required distance functions** (all return distance in pixels):

```typescript
// Point to point
function distancePointToPoint(p1: Point2D, p2: Point2D): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

// Point to line segment (perpendicular distance, or to nearest endpoint)
function distancePointToSegment(p: Point2D, seg: Segment): number {
  const {point1, point2} = seg;
  const L2 = distancePointToPoint(point1, point2) ** 2;
  if (L2 === 0) return distancePointToPoint(p, point1); // Degenerate segment
  
  // Project point onto line, clamp to segment
  const t = Math.max(0, Math.min(1, 
    ((p.x - point1.x) * (point2.x - point1.x) + 
     (p.y - point1.y) * (point2.y - point1.y)) / L2
  ));
  
  const projection = {
    x: point1.x + t * (point2.x - point1.x),
    y: point1.y + t * (point2.y - point1.y)
  };
  
  return distancePointToPoint(p, projection);
}

// Point to infinite line
function distancePointToLine(p: Point2D, line: Line2D): number {
  const {point1, point2} = line;
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  // Perpendicular distance formula
  return Math.abs((dy * p.x - dx * p.y + point2.x * point1.y - point2.y * point1.x)) / length;
}

// Point to circle (distance to circumference)
function distancePointToCircle(p: Point2D, circle: Circle): number {
  const distToCenter = distancePointToPoint(p, circle.center);
  return Math.abs(distToCenter - circle.radius);
}

// Point to arc (distance to arc path, not full circle)
function distancePointToArc(p: Point2D, arc: Arc): number {
  const distToCenter = distancePointToPoint(p, arc.center);
  const angleToPoint = Math.atan2(p.y - arc.center.y, p.x - arc.center.x);
  
  // Normalize angle to [0, 2π]
  const normalizedAngle = ((angleToPoint % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  
  // Check if angle is within arc range
  const isInRange = isAngleBetween(normalizedAngle, arc.startAngle, arc.endAngle);
  
  if (isInRange) {
    // Distance to arc circumference
    return Math.abs(distToCenter - arc.radius);
  } else {
    // Distance to nearest endpoint
    return Math.min(
      distancePointToPoint(p, arc.startPoint),
      distancePointToPoint(p, arc.endPoint)
    );
  }
}
```

**Optimization**: These functions are hot paths. Considerations:
- **Avoid Math.sqrt when possible**: Compare squared distances if only checking proximity
- **Early exit**: If bounding box distance > threshold, skip detailed calculation
- **Memoization**: Cache results for same cursor position (useful during hover without movement)

---

#### Intersection Detection & Caching

**Challenge**: Finding intersections on-demand is expensive:
- Line-line: O(1) per pair
- Line-circle: O(1) per pair (quadratic formula)
- Circle-circle: O(1) per pair
- For N=200 elements: up to N²/2 = 20,000 pairs to check

**Strategy**: **Lazy computation with spatial filtering**

```typescript
class IntersectionCache {
  private cache: Map<string, Point2D[]>; // Key: "elementId1:elementId2"
  private dirtyElements: Set<ElementId>;
  
  getIntersections(element1: Element2D, element2: Element2D): Point2D[] {
    const key = this.makeKey(element1.id, element2.id);
    
    // Check cache
    if (this.cache.has(key) && 
        !this.dirtyElements.has(element1.id) && 
        !this.dirtyElements.has(element2.id)) {
      return this.cache.get(key);
    }
    
    // Compute intersections
    const intersections = this.computeIntersection(element1, element2);
    this.cache.set(key, intersections);
    
    return intersections;
  }
  
  // Find all intersections near cursor
  getNearbyIntersections(x: number, y: number, radius: number): Point2D[] {
    // 1. Query spatial grid for elements near cursor
    const nearbyElements = spatialGrid.queryPoint(x, y, radius * 2); // Wider search
    
    // 2. Check all pairs for intersections
    const intersections: Point2D[] = [];
    for (let i = 0; i < nearbyElements.length; i++) {
      for (let j = i + 1; j < nearbyElements.length; j++) {
        const pts = this.getIntersections(nearbyElements[i], nearbyElements[j]);
        intersections.push(...pts);
      }
    }
    
    // 3. Filter by distance to cursor
    return intersections.filter(pt => 
      distancePointToPoint({x, y}, pt) < radius
    );
  }
  
  // Mark element as modified (invalidate cache)
  markDirty(elementId: ElementId): void {
    this.dirtyElements.add(elementId);
  }
  
  // Clear dirty flags after recomputation
  clearDirty(): void {
    this.dirtyElements.clear();
  }
  
  private computeIntersection(el1: Element2D, el2: Element2D): Point2D[] {
    // Dispatch based on element types
    if (el1 instanceof Line && el2 instanceof Line) {
      return intersectLineLine(el1, el2);
    } else if (el1 instanceof Line && el2 instanceof Circle) {
      return intersectLineCircle(el1, el2);
    } else if (el1 instanceof Circle && el2 instanceof Circle) {
      return intersectCircleCircle(el1, el2);
    }
    // ... handle all type combinations
    return [];
  }
}
```

**Cache invalidation**:
- When element moves/changes: mark as dirty
- Before next query: recompute only dirty pairs
- Avoid full cache clear unless necessary

---

#### Hover Feedback Implementation

**Full mousemove handler**:

```typescript
function onMouseMove(event: MouseEvent, snapRadius: number) {
  const {x, y} = getSVGCoordinates(event); // Account for zoom/pan transform
  
  // 1. Query nearby elements (spatial grid)
  const nearbyElements = spatialGrid.queryPoint(x, y, snapRadius);
  
  // 2. Calculate distances to elements
  const elementDistances = nearbyElements.map(element => ({
    element,
    distance: calculateDistance({x, y}, element),
    type: 'element' as const
  }));
  
  // 3. Find nearby intersections
  const nearbyIntersections = intersectionCache.getNearbyIntersections(x, y, snapRadius);
  const intersectionDistances = nearbyIntersections.map(pt => ({
    element: pt,
    distance: distancePointToPoint({x, y}, pt),
    type: 'intersection' as const
  }));
  
  // 4. Combine and find closest
  const allTargets = [...elementDistances, ...intersectionDistances];
  const closest = allTargets.reduce((min, curr) => 
    curr.distance < min.distance ? curr : min
  , {distance: Infinity, element: null, type: null});
  
  // 5. Update UI state
  if (closest.distance < snapRadius) {
    if (closest.type === 'element') {
      highlightElement(closest.element);
      snapCursorTo(null); // Show element highlight only
    } else {
      highlightIntersection(closest.element); // Show both elements + marker
      snapCursorTo(closest.element); // Snap cursor to intersection point
    }
  } else {
    clearHighlights();
    snapCursorTo(null);
  }
}
```

**Performance targets**:
- Spatial grid query: <1ms (typical: 5-20 candidates)
- Distance calculations: <2ms (5-20 elements)
- Intersection queries: <3ms (0-10 pairs)
- Total: <6ms per mousemove (well within 16ms budget for 60fps)

---

#### Adaptive Snap Radius

**Problem**: Fixed pixel radius feels wrong at different zoom levels:
- Zoomed in (200%): 20px radius = too large (snaps to distant points)
- Zoomed out (50%): 20px radius = too small (hard to snap)

**Solution**: Scale snap radius inversely with zoom

```typescript
function getAdaptiveSnapRadius(baseRadius: number, zoomLevel: number): number {
  // baseRadius = user preference (e.g., 20px at 100% zoom)
  // zoomLevel = current zoom factor (1.0 = 100%, 2.0 = 200%, 0.5 = 50%)
  return baseRadius / zoomLevel;
}
```

**Example**:
- Base: 20px at 100% zoom
- At 200% zoom: 20 / 2 = 10px (smaller screen radius = same world-space radius)
- At 50% zoom: 20 / 0.5 = 40px (larger screen radius = same world-space radius)

**UI control**:
- Slider: "Snap sensitivity" (adjusts baseRadius: 10-50px)
- Auto-adapt to zoom (invisible to user)

---

#### Implementation Phases

**Phase 1** (Week 3-4): Basic hover without snapping
- Implement spatial grid
- Distance calculations for points and segments only
- Highlight on exact hover (DOM events)

**Phase 2** (Week 6): Proximity detection
- Add distance-based highlighting (within radius)
- Implement snap radius adaptation to zoom
- Distance calculations for lines, circles

**Phase 3** (Week 7): Intersection detection
- Implement intersection cache
- Line-line, line-circle intersections
- Auto-create points on click

**Phase 4** (Week 8-9): Full snapping
- Cursor snapping (visual feedback)
- Intersection highlighting (both elements + marker)
- Performance optimization if needed

---

#### Alternatives Considered

**Canvas-based hit testing**:
- Render each element to offscreen canvas with unique color
- Read pixel at cursor position to identify element
- **Rejected**: Doesn't give distance, only boolean "hit/no hit". Can't implement snap radius or "nearby" logic.

**R-tree spatial index**:
- More sophisticated than grid (better for non-uniform distributions)
- **Rejected for MVP**: Over-engineered. Grid is simpler and sufficient for 200 elements.
- **Reconsider**: If element count exceeds 1000 or performance issues arise.

**Pre-compute all intersections**:
- Compute all N²/2 pairs on every change
- **Rejected**: Wasteful. Most intersections are far from cursor and irrelevant.
- **Chosen instead**: Lazy computation with spatial filtering.

**Brute-force distance checks**:
- No spatial index, check all elements on mousemove
- **Rejected**: Too slow for 200 elements at 60fps (>3200 calculations/sec).

---

#### Key Takeaways

1. **Spatial grid is essential** for interactive performance at scale
2. **Intersection caching** with spatial filtering keeps N² problem manageable
3. **Adaptive snap radius** provides consistent feel across zoom levels
4. **Incremental implementation** allows early validation before full complexity
5. **Performance budget**: 6ms per mousemove leaves 10ms for rendering (60fps target)

**Implementation notes**:
- Create `frontend/src/services/SpatialService.ts` for grid and cache
- Create `frontend/src/domain/geometry/distances.ts` for distance functions
- Create `frontend/src/composables/useProximityDetection.ts` for Vue integration
- Unit test all distance functions with edge cases (coincident points, parallel lines, tangent circles)

---

## Best Practices by Technology

### Vue.js 3 + Composition API

**Patterns to follow**:

1. **Composition over Options API**: Use `<script setup>` for all components
   
2. **Single Responsibility Components**:
   - `<Workspace2D>`: Canvas only, delegates to tool components
   - `<PointTool>`, `<SegmentTool>`, etc.: Handle tool-specific interaction
   - `<ActionsPanel>`, `<ElementsPanel>`: Display only, emit events
   
3. **Computed properties for derived state**:
   - Visible elements (filtered by plane visibility)
   - Infeasible elements (from dependency graph)
   - Active tool state
   
4. **Composables for shared logic**:
   - `useSnapping()`: Snap radius calculation, nearest point detection
   - `useHoverHighlight()`: Dependency traversal, highlight styling
   - `useToolFeedback()`: Preview rendering, valid input detection

5. **Pinia stores as single source of truth**:
   - No component-local state for domain data
   - Components read from store, dispatch actions/commands
   
6. **TypeScript strict mode**: Catch errors at compile time

**Vue + D3 integration**:
- D3 manages SVG geometry (zoom behavior, path generation)
- Vue manages SVG content (data binding via v-for)
- Pattern: Vue renders elements, D3 handles transforms and interactions
- Ref: [Vue + D3 best practices](https://www.youtube.com/watch?v=Azfj_verMIU) (Shirley Wu)

---

### Command Pattern Implementation

**Structure**:
```typescript
interface ICommand {
  execute(): Result<void, string>;
  undo(): void;
  validate(): Result<void, InfeasibilityReason>;
  getInputs(): ElementId[];
  getOutputs(): ElementId[];
}

class CreateSegmentCommand implements ICommand {
  constructor(
    private point1: Point2D,
    private point2: Point2D,
    private plane: ProjectionPlane
  ) {}
  
  validate(): Result<void, InfeasibilityReason> {
    if (this.point1.equals(this.point2)) {
      return Err("Points are coincident");
    }
    return Ok(void);
  }
  
  execute(): Result<void, string> {
    const validation = this.validate();
    if (validation.isErr()) return validation;
    
    const segment = new Segment(this.point1, this.point2, this.plane);
    elementsStore.add(segment);
    dependencyGraph.addEdge(this.point1, segment);
    dependencyGraph.addEdge(this.point2, segment);
    
    return Ok(void);
  }
  
  undo(): void {
    elementsStore.remove(this.segmentId);
    dependencyGraph.removeNode(this.segmentId);
  }
  
  // ...
}
```

**Best practices**:
- Commands are serializable (for save/load)
- Validation is idempotent (can call multiple times)
- Undo mirrors execute (no hidden state)
- Composite commands for multi-step operations (create segment + auxiliary points)

**Auxiliary actions pattern**:
```typescript
class CreateSegmentWithAuxiliaryCommand implements ICommand {
  private mainCommand: CreateSegmentCommand;
  private auxiliaryCommands: ICommand[] = [];
  
  execute(): Result<void, string> {
    // Execute auxiliary commands first (create points if needed)
    for (const aux of this.auxiliaryCommands) {
      const result = aux.execute();
      if (result.isErr()) return result;
    }
    
    // Execute main command
    return this.mainCommand.execute();
  }
  
  undo(): void {
    this.mainCommand.undo();
    for (const aux of this.auxiliaryCommands.reverse()) {
      aux.undo();
    }
  }
  
  getAuxiliaryActions(): ICommand[] {
    return this.auxiliaryCommands;
  }
}
```

---

### Dependency Graph and Recomputation

**Data structure**:
- Directed Acyclic Graph (DAG)
- Nodes: Elements and Actions
- Edges: "depends on" relationships

**Recomputation strategy**:
1. **Topological sort** from changed node
2. **Breadth-first traversal** of descendants
3. For each node:
   - Call command's `validate()`
   - If valid: call `recompute()` to update outputs
   - If invalid: mark as infeasible, skip descendants
4. Update visual representation

**Infeasibility propagation**:
- Infeasible node → all descendants marked infeasible
- If input becomes feasible again, recompute descendants
- Infeasibility is temporary state, not permanent deletion

**Performance**:
- For 200 elements with avg 2 dependencies each = 400 edges
- Topological sort: O(V + E) = O(600) = <1ms
- Recomputation: O(descendants) typically <50 = <10ms per change
- Total: well within 200ms target (FR-SC-002)

---

### Testing Strategy

**Unit tests** (Vitest):
- **Domain layer**:
  - Geometry calculations (intersections, perpendiculars, circles)
  - Dependency graph (add/remove nodes, topological sort, infeasibility propagation)
  - Commands (validate, execute, undo for each command type)
- **Services**:
  - ValidationService (infeasibility detection)
  - GeometryService (wrapper around geometry calculations)
  
**Integration tests** (optional for MVP):
- Command sequences (create point → create segment → transport)
- Pinia store actions

**E2E tests** (Playwright):
- **Critical path** (SC-001): 
  1. Open app
  2. Create 2D point on H plane
  3. Create segment
  4. Create guide from HL_HV
  5. Transport point
  6. Select two projections
  7. Create 3D point
  8. Verify Actions panel shows history
  9. Hover element → dependency highlighting works
- **Infeasibility handling**:
  1. Create segment from two points
  2. Drag one point to coincide with other
  3. Verify segment marked infeasible
  4. Verify no rendering of segment
- **Autosave**:
  1. Create elements
  2. Close browser
  3. Reopen → verify elements restored

**Test data**:
- Fixtures for common scenarios (two planes, one HL, sample points/segments)
- Edge cases (parallel lines, coincident points, degenerate circles)

---

## Integration Patterns

### Frontend-Backend Communication

**API contract** (to be detailed in contracts/api.yaml):

```
GET /api/projects
  → { projects: [{ id, name, modified }] }

POST /api/projects
  ← { name }
  → { id, ...project }

GET /api/projects/:id
  → { id, schemaVersion, planes, elements, actions, ... }

PUT /api/projects/:id
  ← { schemaVersion, planes, elements, actions, ... }
  → { id, modified }

DELETE /api/projects/:id
  → 204 No Content
```

**Frontend ProjectService**:
```typescript
class ProjectService {
  async save(project: Project): Promise<void> {
    await fetch(`/api/projects/${project.id}`, {
      method: 'PUT',
      body: JSON.stringify(project)
    });
  }
  
  async load(id: string): Promise<Project> {
    const response = await fetch(`/api/projects/${id}`);
    const data = await response.json();
    return this.deserialize(data);
  }
  
  private deserialize(data: any): Project {
    // Validate schema version
    // Reconstruct domain objects from JSON
    // Rebuild dependency graph
  }
}
```

**Error handling**:
- Network errors: show non-modal notification, retry with exponential backoff
- Validation errors (bad JSON): alert user, don't save
- 404 on load: redirect to project list

---

## Open Questions for Future Iterations

*Not blocking MVP but worth tracking:*

1. **Performance at scale**: What happens with 1000+ elements? Need profiling, possible optimizations:
   - Virtual scrolling in panels
   - Spatial indexing for intersection detection
   - Incremental recomputation (skip unchanged subgraphs)

2. **Undo/redo UI**: Command history supports it, but UI design needed (Ctrl+Z, undo button, history slider?)

3. **Collaborative editing**: Would require:
   - WebSocket for real-time updates
   - Operational Transform or CRDT for conflict resolution
   - SQLite or PostgreSQL for multi-user access
   - Out of scope for educational single-user MVP

4. **Offline mode**: 
   - Use IndexedDB for local projects
   - Sync with backend when online
   - Conflict resolution strategy

5. **Export/import**:
   - Export to SVG (2D drawings)
   - Export to STL/OBJ (3D models)
   - Import from other CAD formats

6. **Accessibility**:
   - Keyboard navigation for all tools
   - Screen reader support (ARIA labels on elements)
   - High contrast mode

---

## Summary of Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Backend framework | Express | Simple, mature, sufficient for 5 endpoints |
| 2D rendering | SVG + D3.js | DOM-based, scalable, pedagogically explicit |
| 3D rendering | Three.js | Industry standard WebGL library |
| Geometry library | Native + math.js | Simple domain, 500 LOC, full control over infeasibility |
| Storage format | JSON files | Portable, human-readable, no DB needed for single-user |
| Schema versioning | Embedded version number | Enables future migrations |

**Next steps**: Proceed to Phase 1 (data model, contracts, quickstart)
