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
