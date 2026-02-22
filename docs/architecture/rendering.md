# Rendering Pipeline

Diedrico uses a multi-stage rendering pipeline that transforms domain definitions into visual output.

## 2D Pipeline

```
Domain definitions
  → realize2D(): plane-intrinsic (u, v) coordinates
  → planeToPaper2D (Matrix3): paper coordinates
  → PaperService: drawing primitives
  → SVGRenderer: SVG elements with viewport transform
  → Browser: rendered pixels
```

### Stage 1: Realization

Each element computes its geometry in the plane's intrinsic coordinate system:

- `Point2DRealization2D` → `position: Vector3` (u, v, 1)
- `Line2DRealization2D` → `point1, point2: Vector3`
- `Circle2DRealization2D` → `center: Vector3`, `radiusVector: Vector3`

### Stage 2: Paper Transform

The `planeToPaper2D` matrix transforms plane-intrinsic coordinates to a common **paper space** where all planes coexist in a single SVG canvas.

### Stage 3: PaperService

`PaperService.generatePrimitives()` walks the world:

1. Iterate each `ProjectionPlane`
2. For each plane: iterate points, lines, circles
3. Skip invisible elements (encapsulation, visibility flags)
4. Generate `DrawingPrimitive`s with resolved styles

**Drawing Primitives:**

| Primitive | SVG Output |
|-----------|-----------|
| `PointPrimitive` | Circle (small dot) |
| `LinePrimitive` | Line clipped to viewport |
| `SegmentPrimitive` | Line between two endpoints |
| `CirclePrimitive` | Circle |
| `ArcPrimitive` | Arc path |
| `PathPrimitive` | Polyline, polygon, or Bezier path |
| `TextPrimitive` | KaTeX-rendered label |

### Stage 4: SVG Rendering

`SVGRenderer` converts paper primitives to SVG attributes:

- `transformPoint(point, viewport)` applies pan + zoom: `(paper + pan) × zoom`
- `inverseTransformPoint()` maps mouse clicks back to paper space
- Lines are clipped to the visible viewport before rendering

### Render Layers

Primitives are ordered by `RenderLayer`:

| Layer | Value | Content |
|-------|-------|---------|
| Grid | 0 | Background grid |
| HingeLines | 5 | Hinge line traces |
| Guides | 10 | Guide lines |
| Elements | 20 | Points, lines, circles, segments |
| Highlights | 30 | Selection/hover highlights |
| Handles | 40 | Drag handles |
| Labels | 50 | Element labels |

### Style Resolution

`PaperService` resolves visual styles based on element state:

- **Default**: from `settingsStore` defaults
- **Custom**: per-element `visualStyle` overrides
- **Hover**: brightened on mouse-over
- **Selected**: accent color highlight
- **Cascade highlight**: secondary highlight for dependents
- **Snap**: visual feedback when near a snap target
- **Active plane**: enhanced visibility on the active plane

## 3D Pipeline

```
Domain definitions
  → realize3D(): 3D world coordinates (Vector4)
  → Three.js geometry (SphereGeometry, TubeGeometry, etc.)
  → PerspectiveCamera + OrbitControls
  → WebGLRenderer + CSS2DRenderer (labels)
```

### Element2DRenderer3D

Transforms 2D elements to 3D space for rendering on planes:

```
2D position (u, v)
  → applyMatrix4x3(planeTo3D)
  → Three.js Vector3
  → Three.js mesh (sphere, tube, ring)
```

### Projected Elements

3D elements can be projected back onto 2D planes (Phase 106):

- Uses `threeDToPlane` matrix
- Rendered with distinct style (purple, thicker, 35% opacity)
- Toggle via `showProjectedElements` option
