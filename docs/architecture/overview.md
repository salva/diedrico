# Architecture Overview

Diedrico follows a layered architecture with clear separation between domain logic, state management, commands, and UI.

## Layer Diagram

```
┌─────────────────────────────────────────────────┐
│                  Components (Vue)                │
│  CanvasPanel · ThreeView · ElementsPanel · ...   │
├─────────────────────────────────────────────────┤
│                 Stores (Pinia)                   │
│  toolStore · selectionStore · viewStore · ...    │
├─────────────────────────────────────────────────┤
│               Commands & Operations              │
│  CommandStack · Command · IOperation impls       │
├─────────────────────────────────────────────────┤
│                   Services                       │
│  PaperService · SVGRenderer · ProjectService     │
├─────────────────────────────────────────────────┤
│                Domain Model                      │
│  World · ProjectionPlane · Element2D/3D          │
└─────────────────────────────────────────────────┘
```

## Data Flow

### User Action → Domain Change

```
User clicks canvas
  → InputService detects click target
  → Active Tool receives argument (point, line, etc.)
  → Tool creates Command with Operations
  → Operations mutate World (add element, update position)
  → World.markDirty() increments version
  → Observers re-render (2D canvas, 3D view, panels)
```

### Rendering Pipeline

```
Domain (definitions)
  → realize2D() computes intrinsic (u, v) coordinates
  → planeToPaper2D matrix transforms to paper space
  → PaperService generates drawing primitives
  → SVGRenderer converts to SVG elements with viewport transform
```

## Key Design Decisions

### Definition vs Realization

Elements store **what they are** (definition), not **where they are** (coordinates). Coordinates are computed lazily via `realize()` and cached. This enables:

- Clean undo/redo (only definitions change)
- Efficient recomputation (only dirty elements re-realize)
- Consistent serialization (save definitions, not coordinates)

### Command Sourcing

Persistence saves the command sequence, not world state. On load, commands replay to reconstruct everything. This ensures perfect fidelity and enables schema migration.

### Plane Ownership

Each 2D element belongs to exactly one projection plane. Elements use hierarchical IDs (`{planeId}/{localId}`) to encode this relationship. This avoids cross-plane ambiguity and simplifies lookup.

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Vue 3 (Composition API) |
| State | Pinia stores |
| 2D Rendering | D3.js + SVG |
| 3D Rendering | Three.js + CSS2DRenderer |
| Math Labels | KaTeX |
| Build | Vite |
| Testing | Vitest + Playwright |
| Backend | Express (minimal REST API) |
