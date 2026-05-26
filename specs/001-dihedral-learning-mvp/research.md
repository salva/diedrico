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

### 5. Hinge Lines (HL) vs Broken Hinge Lines (BHL)

**Critical Distinction**: A common source of confusion in dihedral projection systems is distinguishing between:
1. **Hinge Lines (HL)**: The physical fold lines between **projection planes**
2. **Broken Hinge Lines (BHL)**: Intersection lines between arbitrary 3D planes, appearing as projections on projection planes

**Definition**:

**Hinge Line (HL)**:
- The intersection line between two **projection planes** (the drawing surfaces themselves)
- Example: `HL_HV` is where the Horizontal (P_H) and Vertical (P_V) projection planes fold together (the "ground line")
- These are structural features of the projection system itself
- Used to create guides for transporting points and distances

**Broken Hinge Line (BHL)**:
- When two arbitrary 3D planes intersect, their intersection line is called a broken hinge line
- This 3D line is **projected** onto each relevant projection plane as a 2D line (Element2D)
- The "broken" terminology reflects that it's not a physical fold, but a geometric construct
- BHL projections are stored as regular Element2D lines, not as HingeLine entities

**Example with Three Planes (A, B, C)**:

Consider working with three auxiliary planes A, B, and C:

1. **HL_AB**: Hinge line between projection plane A and B (if A and B are projection planes)
2. **HL_AC**: Hinge line between projection plane A and C (if A and C are projection planes)
3. **BHL_BC**: Broken hinge line (the 3D line where planes B and C intersect)
   - This is **NOT** stored as a HingeLine entity
   - Instead, BHL_BC appears as:
     - One Element2D line on projection plane B (the projection of BHL_BC onto B)
     - One Element2D line on projection plane C (the projection of BHL_BC onto C)

**Distance Transport Between BHL Projections**:

The classical dihedral technique:
1. Find the projections of BHL_BC on both planes B and C
2. These projections are regular 2D line elements (Element2D, not HingeLine entities)
3. Transport distances **between these BHL projections** using guides
4. The guides are perpendicular to the relevant hinge lines (HL_AB or HL_AC)

**Data Model Implications**:

```typescript
// ✓ Correct: HingeLine entities only for projection plane folds
interface Project {
  planes: ProjectionPlane[];        // P_H, P_V, maybe P_A1
  hingeLines: HingeLine[];          // HL_HV, HL_HA1, HL_VA1
  elements2D: Element2D[];          // Includes BHL projections
}

// ✗ Wrong: Don't create HingeLine entities for BHLs
// BHL_BC projections are stored as Element2D lines, not as HingeLine entities
```

**Why This Matters**:

1. **Correct modeling**: HingeLine entities represent physical folds. BHL projections are geometric constructs.
2. **Transport operations**: Most distance transport in practice occurs between **BHL projections** (Element2D lines), not between regular HLs
3. **Scalability**: With N projection planes, you have N(N-1)/2 hinge lines, but potentially hundreds of BHL projections
4. **Automatic transport**: Guides created from BHL projections automatically appear on both planes, eliminating the need for explicit multi-step transport tools

**Implementation Note**:

Guide creation automatically handles transport across BHL projections:
- User creates guide perpendicular to BHL projection on plane A
- System automatically creates corresponding guide on plane B (perpendicular to BHL_AB projection on B)
- Both guide projections appear atomically as single operation
- No need for separate "chained transport" tool—the guide itself establishes the correspondence
- Optionally: Add metadata to Element2D to tag BHL projections for visual distinction (e.g., dashed lines)

---

### 6. Proximity Detection & Snapping Architecture

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

#### Visual Feedback System for Snapping

**Requirement** (FR-037): As cursor moves, highlight valid snap targets to guide user interaction.

**Types of snap targets**:
1. **Existing points**: Real point entities in the drawing
2. **Intersections**: Where two elements cross (computed on-demand)
3. **Reference elements**: Lines for perpendicular/parallel, circles for tangent, etc.
4. **Empty space**: Indicates free point will be created

---

**Visual States & Rendering**:

```typescript
enum SnapTargetType {
  ExistingPoint = 'existing-point',
  Intersection = 'intersection',
  ReferenceElement = 'reference-element',
  EmptySpace = 'empty-space'
}

interface SnapTarget {
  type: SnapTargetType;
  position?: { x: number; y: number }; // World coordinates
  elements?: Element2D[];                // Reference elements for intersection/perpendicular
  distance: number;                      // Distance to cursor
}
```

**Visual feedback by type**:

1. **Existing Point** (within snap radius):
   ```vue
   <!-- Highlight point with larger radius + glow -->
   <circle 
     :cx="point.x" 
     :cy="point.y" 
     :r="8"
     class="snap-highlight"
     stroke="blue"
     stroke-width="2"
     fill="none"
   />
   <!-- Original point remains visible underneath -->
   <circle :cx="point.x" :cy="point.y" :r="3" fill="black" />
   ```

2. **Intersection** (where two elements cross):
   ```vue
   <!-- Highlight BOTH intersecting elements near intersection -->
   <line 
     v-if="snapTarget.type === 'intersection'"
     :x1="element1.x1" :y1="element1.y1" 
     :x2="element1.x2" :y2="element1.y2"
     class="snap-highlight-element"
     stroke="orange"
     stroke-width="3"
     opacity="0.6"
   />
   <line 
     :x1="element2.x1" :y1="element2.y1" 
     :x2="element2.x2" :y2="element2.y2"
     class="snap-highlight-element"
     stroke="orange"
     stroke-width="3"
     opacity="0.6"
   />
   
   <!-- Show intersection marker (crosshair or circle) -->
   <g :transform="`translate(${snapTarget.position.x}, ${snapTarget.position.y})`">
     <circle r="6" stroke="red" stroke-width="2" fill="white" />
     <line x1="-8" y1="0" x2="8" y2="0" stroke="red" stroke-width="1" />
     <line x1="0" y1="-8" x2="0" y2="8" stroke="red" stroke-width="1" />
   </g>
   ```

3. **Reference Element** (e.g., line for perpendicular tool):
   ```vue
   <!-- Highlight the reference line -->
   <line 
     v-if="activeTool === 'perpendicular-line'"
     :x1="referenceLine.x1" :y1="referenceLine.y1"
     :x2="referenceLine.x2" :y2="referenceLine.y2"
     class="snap-highlight-reference"
     stroke="green"
     stroke-width="3"
     opacity="0.5"
   />
   
   <!-- Show preview of perpendicular result -->
   <line 
     :x1="throughPoint.x" :y1="throughPoint.y"
     :x2="previewEnd.x" :y2="previewEnd.y"
     class="construction-preview"
     stroke="gray"
     stroke-width="1"
     stroke-dasharray="5,5"
   />
   ```

4. **Empty Space** (will create free point):
   ```vue
   <!-- Change cursor appearance -->
   <circle 
     :cx="cursorWorld.x" 
     :cy="cursorWorld.y" 
     :r="3"
     class="free-point-cursor"
     stroke="gray"
     stroke-width="1"
     fill="lightgray"
     opacity="0.7"
     pointer-events="none"
   />
   ```

---

**Cursor Snapping Behavior**:

When snap target is found, **visually move cursor** to snap position:

```typescript
function snapCursorTo(target: SnapTarget | null) {
  if (!target || target.type === SnapTargetType.EmptySpace) {
    // No snapping, cursor follows mouse naturally
    cursorIndicator.style.display = 'none';
    return;
  }
  
  // Snap cursor to target position
  const screenPos = worldToScreen(target.position);
  cursorIndicator.style.left = `${screenPos.x}px`;
  cursorIndicator.style.top = `${screenPos.y}px`;
  cursorIndicator.style.display = 'block';
  
  // Visual feedback based on type
  if (target.type === SnapTargetType.ExistingPoint) {
    cursorIndicator.className = 'cursor-snap-point';
  } else if (target.type === SnapTargetType.Intersection) {
    cursorIndicator.className = 'cursor-snap-intersection';
  }
}
```

**Alternative approach** (CSS-only, simpler):
- Don't move cursor visually
- Highlight snap target intensely
- Show tooltip: "Click to select point A" / "Click to create intersection"

---

**Multi-stage highlighting priority**:

When multiple snap targets are near cursor, prioritize:

1. **Existing points** (highest priority) - within snap radius
2. **Intersections** (medium) - slightly larger radius
3. **Reference elements** (low) - highlight on hover, no snap

```typescript
function selectSnapTarget(
  existingPoints: SnapTarget[],
  intersections: SnapTarget[],
  referenceElements: SnapTarget[]
): SnapTarget | null {
  
  // 1. Check for existing points first (smallest snap radius)
  const nearestPoint = findNearest(existingPoints);
  if (nearestPoint && nearestPoint.distance < snapRadius) {
    return nearestPoint;
  }
  
  // 2. Check for intersections (slightly larger radius)
  const nearestIntersection = findNearest(intersections);
  if (nearestIntersection && nearestIntersection.distance < snapRadius * 1.5) {
    return nearestIntersection;
  }
  
  // 3. Check for reference elements (hover only, no snap)
  const nearestReference = findNearest(referenceElements);
  if (nearestReference && nearestReference.distance < hoverRadius) {
    return nearestReference;
  }
  
  // 4. Empty space (default)
  return { type: SnapTargetType.EmptySpace };
}
```

---

**Performance considerations**:

**Rendering updates**:
- Mousemove fires at ~60fps (every 16ms)
- Re-rendering highlight overlays must be fast

**Optimization strategies**:
1. **Separate SVG layers**:
   ```vue
   <svg>
     <!-- Base layer: actual drawing elements (rarely changes) -->
     <g id="base-layer">
       <circle v-for="point in points" ... />
       <line v-for="segment in segments" ... />
     </g>
     
     <!-- Highlight layer: snap targets (changes on mousemove) -->
     <g id="highlight-layer">
       <circle v-if="snapTarget" :cx="snapTarget.x" :cy="snapTarget.y" ... />
     </g>
     
     <!-- Cursor layer: cursor indicator (changes on mousemove) -->
     <g id="cursor-layer" pointer-events="none">
       <circle v-if="cursorVisible" :cx="cursor.x" :cy="cursor.y" ... />
     </g>
   </svg>
   ```
   - Vue only diffs/updates changed layers
   - Base layer remains untouched during mousemove

2. **Throttle highlight updates** (if needed):
   ```typescript
   const debouncedHighlight = throttle((target: SnapTarget) => {
     currentSnapTarget.value = target;
   }, 16); // Max 60fps
   ```

3. **CSS transitions for smooth feedback**:
   ```css
   .snap-highlight {
     transition: opacity 0.1s ease-in-out, r 0.1s ease-in-out;
   }
   ```
   - Smooth appearance/disappearance
   - Reduces jarring visual changes

---

**Tool-specific feedback examples**:

**Segment tool** (needs two points):
- **Step 1** (first point):
  - Hover over point → highlight point (blue glow)
  - Hover over intersection → highlight both elements + marker
  - Hover empty space → show gray dot preview
- **Step 2** (second point, after first selected):
  - Show preview line from first point to cursor
  - Highlight valid second point candidates
  - Preview updates in real-time as cursor moves

**Perpendicular line tool** (needs reference line + point):
- **Step 1** (select reference line):
  - Hover over line → highlight line (green)
  - Show tooltip: "Select reference line"
- **Step 2** (select point):
  - Hover over point → highlight point + show perpendicular preview
  - Preview line extends from point perpendicular to reference
  - Updates in real-time

**Circle by three points**:
- **Steps 1-3** (selecting points):
  - Highlight available points
  - Show partial circle preview after 2 points selected
  - Preview updates as cursor moves (dynamic radius)
  - Gray out if points are collinear (infeasible)

---

**Accessibility considerations**:

1. **Color is not the only indicator**:
   - Combine color with shape changes (thicker lines, larger radius)
   - Use patterns (dashed vs solid) for different states

2. **Tooltips for clarity**:
   - Show what will happen on click
   - "Click to select point A"
   - "Click to create intersection of line r1 and circle c1"
   - "Click to create free point"

3. **Keyboard navigation** (future):
   - Tab to cycle through snap targets
   - Enter to select
   - Escape to cancel tool

---

**Implementation phases**:

**Phase 1** (Week 4): Basic element highlighting
- Highlight elements on mouseover (DOM events)
- CSS hover states

**Phase 2** (Week 6): Proximity-based highlighting
- Highlight existing points within snap radius
- Show "snap glow" effect
- Adaptive radius based on zoom

**Phase 3** (Week 7): Intersection highlighting
- Compute nearby intersections
- Highlight both intersecting elements
- Show intersection marker (crosshair)

**Phase 4** (Week 8): Full visual feedback
- Tool-specific previews (segment preview, perpendicular preview)
- Multi-stage priority system
- Cursor snapping visual indicator
- Empty space indicator

**Phase 5** (Week 9): Polish
- Smooth CSS transitions
- Tooltips for snap targets
- Performance optimization (separate SVG layers)

---

**Key implementation files**:

```
frontend/src/
├── composables/
│   ├── useSnapFeedback.ts         # Main snap feedback logic
│   └── useToolPreview.ts          # Tool-specific preview rendering
├── components/
│   ├── workspace/
│   │   ├── HighlightLayer.vue     # Snap target highlights
│   │   ├── CursorIndicator.vue    # Cursor snap visual
│   │   └── ToolPreview.vue        # Dynamic preview (segment, perpendicular, etc.)
└── styles/
    └── snap-feedback.css          # Highlight animations and transitions
```

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
Wave 010 note: the disconnected backend `the removed backend project route` project CRUD/storage contract was deleted. Active project persistence is the frontend app-shell ProjectPersistencePort backed by ProjectService and Drive/local startup behavior.

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

## 6. Icon Resources: GeoGebra Classic Icons

**Research Date**: 2025-12-28  
**Question**: Can we use GeoGebra's toolbar icon imagery in our GPL 3+ application?

### License Compatibility Analysis

**GeoGebra Licensing**:
- **Source code**: Licensed under EUPL v1.2 (European Union Public License)
- **UI image files, icons, and style sheets**: Licensed under **Creative Commons Attribution-NonCommercial-ShareAlike 4.0** (CC BY-NC-SA 4.0)
- **Language files**: Also CC BY-NC-SA 4.0

**Our Project**:
- Licensed under **GPL 3+**
- Intended use: **Non-commercial educational tool**

### Compatibility Assessment

**CRITICAL FINDINGS:**

**1. EUPL v1.2 IS GPL-Compatible ✓**
- GeoGebra source code is licensed under **EUPL v1.2**
- EUPL v1.2 **explicitly includes GPL v2 and GPL v3** in its downstream compatibility list (Appendix)
- According to the [EU EUPL compatibility matrix](https://interoperable-europe.ec.europa.eu/collection/eupl/matrix-eupl-compatible-open-source-licences): "the EUPL v1.2 is compatible with the GPLv3... you may distribute under the GPLv3 a larger derivative work integrating components covered by the EUPL and by the GPLv3"
- **Conclusion**: EUPL-licensed source code CAN be used in GPL 3+ projects

**2. Icons Are NOT Under EUPL - They're CC BY-NC-SA 4.0 ✗**
- GeoGebra's license explicitly states: "all GeoGebra user interface image and style files **(including logos, icons and style sheets)** (together 'the Language Files') are licensed to you under the terms of the Creative Commons Attribution-NonCommercial-ShareAlike license (version 4.0)"
- Toolbar icons are classified as **"user interface image files"**, NOT source code
- Therefore icons fall under **CC BY-NC-SA 4.0**, not EUPL v1.2

**3. CC BY-NC-SA 4.0 is NOT GPL-Compatible ✗**
- The **NonCommercial (NC)** restriction is incompatible with GPL
- GPL requires freedom to use software commercially
- CC licenses with NC restrictions cannot be combined with GPL-licensed works
- Even for non-commercial projects, mixing GPL with NC-licensed assets creates licensing conflicts

**FINAL VERDICT: CANNOT USE GEOGEBRA ICONS IN GPL 3+ PROJECT ✗**

**Reasoning:**
1. Icons are under CC BY-NC-SA 4.0 (not EUPL)
2. CC BY-NC-SA 4.0 is incompatible with GPL due to NonCommercial restriction
3. GPL requires all components allow commercial use
4. Mixing GPL code with NC-licensed assets violates GPL terms

**Alternative Solutions:**
1. **Create original icons** - Design custom toolbar icons for Diedrico
2. **Use GPL-compatible icon sets**: MIT, Apache 2.0, CC-BY (without NC/SA)
3. **Use public domain icons**: CC0, Unlicense
4. **For inspiration only**: Study GeoGebra's icon design but create original artwork

**Attribution NOT Sufficient:**
- Proper attribution to GeoGebra does NOT resolve the license incompatibility
- The NC restriction fundamentally conflicts with GPL freedoms

### Icon Location in GeoGebra Repository

**GitHub Repository**: https://github.com/geogebra/geogebra

**Icon Paths**:
```
source/web/web/src/main/java/org/geogebra/web/full/css/ToolbarSvgResources.java
  → References: org/geogebra/common/icons/svg/web/toolIcons/*.svg

Actual SVG files located at:
  source/[platform]/[module]/src/main/resources/org/geogebra/common/icons/svg/web/toolIcons/
```

**Key Directories**:
- **Toolbar icons (SVG)**: `org/geogebra/common/icons/svg/web/toolIcons/`
  - Example files:
    - `mode_point.svg` - Point tool icon
    - `mode_segment.svg` - Segment tool icon
    - `mode_circle2.svg` - Circle (center + point) icon
    - `mode_parallel.svg` - Parallel line icon
    - `mode_perpendicular.svg` - Perpendicular line icon
    - `mode_intersect.svg` - Intersection icon
    - `mode_polygon.svg` - Polygon tool icon
- **Menu icons**: `org/geogebra/common/icons/svg/web/menuIcons*/`
- **Material Design icons**: `org/geogebra/common/icons/svg/web/matDesignIcons/`
- **PNG fallbacks (deprecated)**: `org/geogebra/common/icons_toolbar/p32/` and `/p64/`

**Resource Bundle Files** (for reference):
- `ToolbarSvgResources.java` - Maps mode constants to SVG file paths
- `ToolbarResources.java` - Interface defining all toolbar icon resource methods
- SVG files are loaded via GWT `@Resource` and `@Source` annotations

### How to Download Icons

**Option 1: Clone Repository**
```bash
git clone https://github.com/geogebra/geogebra.git
cd geogebra
# Icons located in various modules under source/*/src/main/resources/
find . -path "*/org/geogebra/common/icons/svg/web/toolIcons/*.svg"
```

**Option 2: Direct GitHub Download**
Navigate to specific icon files:
```
https://github.com/geogebra/geogebra/tree/main/source/web/web/src/main/resources/org/geogebra/common/icons/svg/web/toolIcons/
```
Download individual SVG files by viewing raw content.

**Option 3: Selective Extraction**
Use sparse checkout to get only icons:
```bash
git clone --filter=blob:none --sparse https://github.com/geogebra/geogebra.git
cd geogebra
git sparse-checkout add "source/*/src/main/resources/org/geogebra/common/icons"
```

### Integration Recommendation

**Best Approach for Our Project**:

1. **Create Icon Asset Directory**:
   ```
   frontend/src/assets/icons/geogebra/
     ├── attribution.md        # Required: Credit and license info
     ├── tools/               # Toolbar icons
     │   ├── point.svg
     │   ├── segment.svg
     │   ├── circle.svg
     │   ├── parallel.svg
     │   └── ...
     └── ui/                  # Menu/UI icons (if needed)
   ```

2. **Attribution File** (`attribution.md`):
   ```markdown
   # GeoGebra® Icon Attribution
   
   Icons in this directory are from GeoGebra Classic
   Licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0
   
   © GeoGebra GmbH
   https://www.geogebra.org/
   
   These icons are used for non-commercial educational purposes only.
   ```

3. **Import in Vue Components**:
   ```typescript
   import pointIcon from '@/assets/icons/geogebra/tools/point.svg?raw';
   // Use inline in <svg> element or as background-image
   ```

4. **Alternative: Icon Component Wrapper**:
   ```vue
   <template>
     <span class="geogebra-icon" v-html="iconSvg"></span>
   </template>
   <script setup lang="ts">
   import pointSvg from '@/assets/icons/geogebra/tools/point.svg?raw';
   const iconSvg = ref(pointSvg);
   </script>
   ```

5. **UI Attribution** (in app footer or about dialog):
   ```
   "Toolbar icons © GeoGebra® (https://www.geogebra.org/), 
    used under CC BY-NC-SA 4.0 license"
   ```

### Icons Needed for Diedrico MVP

Based on our spec.md tool requirements:

**Essential Toolbar Icons**:
- `mode_point.svg` - Free point tool (or variants: point on object, intersection)
- `mode_segment.svg` - Segment tool
- `mode_join.svg` - Line tool (line through 2 points)
- `mode_circle2.svg` - Circle (center + point on circumference)
- `mode_circlepointradius.svg` - Circle (center + radius)
- `mode_parallel.svg` - Parallel line tool
- `mode_orthogonal.svg` - Perpendicular line tool
- `mode_intersect.svg` - Intersection point tool
- `mode_midpoint.svg` - Midpoint tool (if used)

**Dihedral-Specific** (may need custom icons):
- Guide creation (perpendicular to HL)
- Point transport via guide
- Distance transport
- 3D element creation from projections

**Navigation/UI Icons**:
- `mode_translateview.svg` - Pan tool
- `mode_zoomin.svg` - Zoom in
- `mode_zoomout.svg` - Zoom out
- `mode_delete.svg` - Delete tool
- Undo/redo icons from Material Design set

**Recommendation**: Start with exact GeoGebra icons for standard geometric operations. Create custom SVG icons only for dihedral-specific tools not present in GeoGebra (guides, transports, 3D derivation).

### Legal Summary

**CRITICAL UPDATE - GeoGebra 4 License Investigation**

**GeoGebra 4.0.34.0 (Debian Package) License Analysis:**

Examined the GeoGebra 4.0.34.0+dfsg1 source package (from ~/src) which reveals:

**From _LICENSE.txt (GeoGebra 4):**
1. **GeoGebra Source Code License**: GNU General Public License v3 or later
2. **GeoGebra Language Files, Documentation, and Installers License**: Creative Commons Attribution-Share Alike 3.0 or later

**Key Finding**: Toolbar icons are defined as **GeoGebra construction files (.ggb)** and rendered to PNG/GIF.

**Icon Generation Process:**
1. **Source**: .ggb files in `/icons/` directory (e.g., `mode_point.ggb`, `mode_segment.ggb`)
2. **Format**: .ggb files are ZIP archives containing XML (`geogebra.xml`)
3. **Content**: XML defines geometric construction (points, segments, circles, etc.)
4. **Rendering**: GeoGebra renders construction to PNG/GIF for use in toolbars
5. **Count**: 47 .ggb icon source files in GeoGebra 4

**Example XML Structure** (from `mode_point.ggb`):
```xml
<construction title="" author="" date="">
  <element type="point" label="A">
    <show object="true" label="true"/>
    <coords x="1.697" y="3.764" z="1.0"/>
    <pointSize val="3"/>
  </element>
</construction>
```

**License Classification:**
- .ggb files are **NOT explicitly mentioned** in the license
- Icons rendered from .ggb constructions are also **NOT explicitly categorized**

**Critical Ambiguity:**
- .ggb construction files could be "source code" (GPL v3+) → **GPL-compatible** ✓
- Rendered icons (PNG/GIF) could be "part of installers" (CC-BY-SA 3.0) → **GPL-compatible** ✓
- Both interpretations are GPL-compatible (CC-BY-SA 3.0 has NO NonCommercial restriction)

**GeoGebra v4 vs Modern GeoGebra Licensing:**
- **Version 4** (2012): GPL v3+ source, CC-BY-SA 3.0 other assets (NO "NC")
- **Modern GeoGebra** (2025): EUPL 1.2 source, CC BY-NC-SA 4.0 icons (WITH "NC")
- **License Change**: GeoGebra added NonCommercial restriction sometime after v4

**README.txt also mentions**: "Tango Icon Gallery, http://tango.freedesktop.org (Public Domain)"

**Version 4 Icon Verdict: POTENTIALLY GPL-COMPATIBLE** ✓

**However:**

**✗ NOT APPROVED FOR USE in GPL 3+ Project (Modern GeoGebra)**

**Modern GeoGebra License Incompatibility:**
- Current GeoGebra toolbar icons are under **CC BY-NC-SA 4.0**
- GPL 3+ requires all components allow commercial use
- **NonCommercial restriction is incompatible with GPL**
- Cannot legally combine GPL code with NC-licensed assets

**Required Actions:**

**FOR GEOGEBRA 4 ICONS (if using v4.0.34.0 from Debian):**

**Recommended Approach - Use the .ggb Source Files:**

1. **Extract Icon Constructions**:
   - .ggb files are in `~/src/geogebra-4.0.34.0+dfsg1/icons/`
   - Each .ggb is a ZIP containing `geogebra.xml` with geometric construction
   - These are the **source files** for icons (likely GPL v3+ as "source code")

2. **Render Icons Programmatically**:
   - Parse the XML construction definition
   - Render geometric elements (points, segments, circles) to SVG/Canvas
   - Create modern SVG icons from the construction data
   - This is a **derivative work** transforming GPL source into your GPL project ✓

3. **Legal Advantages**:
   - Using construction data (XML) as source = clearly GPL v3+
   - Your SVG rendering is derivative work under GPL v3+ ✓
   - No ambiguity about image file licensing
   - Maintains GPL compatibility throughout

4. **Technical Advantages**:
   - Vector-based (XML construction → SVG rendering)
   - Scalable to any size
   - Can customize colors, stroke widths programmatically
   - Modern web-friendly format

**Alternative: Use Pre-Rendered Icons**:

1. **Verify Ambiguous Licensing**:
   - Contact GeoGebra or Debian maintainers to clarify if v4 toolbar icons are GPL v3+
   - If GPL v3+: Can use icons directly ✓
   - If CC-BY-SA 3.0 (without NC): Can use with attribution ✓
   - Document license determination in project

2. **If Using GeoGebra 4 Icons**:
   - Maintain attribution: "Toolbar icons from GeoGebra 4.0.34.0 (GPL v3+)"
   - Include copy of GPL v3 license
   - Ensure dfsg1 package used (Debian Free Software Guidelines compliant)

**FOR MODERN GEOGEBRA OR IF V4 UNCLEAR:**
1. **Create Original Icons**:
   - Design custom SVG toolbar icons for Diedrico
   - License under GPL 3+ or compatible license (MIT, Apache 2.0, CC-BY)
   - Can study GeoGebra's design for inspiration (visual reference)

2. **Alternative Icon Sources**:
   - **Material Design Icons** (Apache 2.0): https://materialdesignicons.com/
   - **Font Awesome Free** (CC BY 4.0): https://fontawesome.com/
   - **Feather Icons** (MIT): https://feathericons.com/
   - **Heroicons** (MIT): https://heroicons.com/
   - Search for "geometric construction icons" on icon repositories

3. **What You CAN Do**:
   - Study GeoGebra's icon design principles
   - Use similar visual metaphors (point as dot, line as stroke, circle as outline)
   - Match the general style (minimalist, geometric, clear)
   - Create original artwork that serves the same function

4. **What You CANNOT Do**:
   - Copy, trace, or directly use GeoGebra SVG files
   - Modify GeoGebra icons and claim they're derivative
   - Include GeoGebra icons in GPL-licensed distribution

**Why EUPL Compatibility Doesn't Help:**
- While EUPL v1.2 (source code license) IS compatible with GPL 3+
- Icons are explicitly **NOT** under EUPL - they're under CC BY-NC-SA 4.0
- License compatibility applies to source code, not to icon assets

**Contact for Questions**: office@geogebra.org (for commercial licensing only)

**Updated Decision**: Remove Section 6 recommendation to use GeoGebra icons. Icons must be created from scratch or sourced from GPL-compatible icon libraries.

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
| Icon resources | **GPL-compatible icon libraries** | ✗ GeoGebra icons are CC BY-NC-SA 4.0 (incompatible with GPL). Use Material Design Icons (Apache 2.0), Font Awesome (CC BY 4.0), or create original icons |

**Next steps**: Proceed to Phase 1 (data model, contracts, quickstart)

