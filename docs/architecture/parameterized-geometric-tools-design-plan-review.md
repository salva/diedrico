# Architecture Review: Parameterized Geometric Tools Design Plan

An in-depth, critical architectural review of the proposed [docs/architecture/parameterized-geometric-tools-design-plan.md](docs/architecture/parameterized-geometric-tools-design-plan.md).

---

## 1. General Assessment

The overall direction of the plan is correct and highly aligned with clean drafting/CAD system mechanics. **Defining geometric parameters (like radii and relative angles) as explicit construction types stored directly in the domain model** (instead of fabricating dummy auxiliary points) is the correct architectural choice. It preserves true semantic dependencies, avoids polluting intersections/element lists with dummy markers, and ensures robust CAD-like editing.

However, the plan has major gaps regarding **mathematical constraints**, **potential realization instability (jumping/flip issues)**, **the performance overhead of the preview layer**, and **interaction layout inconsistencies** that must be resolved prior to implementation.

---

## 2. High-Severity Structural & Realization Risks

### 2.1. The Radius Vector Degeneracy and Inversion Risk
The plan proposes storing radius as a 2D `Vector3` on the plane (`Circle2DByCenterAndRadiusVector`), where:
$$\text{center} \equiv (u_c, v_c, 1) \quad \text{and} \quad \vec{r} \equiv (u_r, v_r, 0)$$
This has a classic coordinate-jumping risk when users edit center coordinates or drag elements:
1.  **Center translation**: If the center point is translated to another location, what happens to the on-disk `radiusVector`? Its intrinsic vector orientation remains unchanged. However, if the user rotates the coordinate system or flips planes in auxiliary projections, absolute 2D vectors can lose their semantic meaning relative to surrounding elements.
2.  **Zero-Length Degeneracy**: When dragging visual handles, the user might drag the handle directly onto the center, creating a radius vector of $[0, 0, 0]$. This will break Division-by-Zero protections in circle realizations, resulting in extreme geometric errors, `NaN` propagates, or runtime crashes.
3.  **Corrective Mitigation**:
    *   The domain model *must* strictly clamp `radiusVector.length()` to a safe minimal threshold (e.g., $10^{-6}$ units) during all operational edits to prevent zero-length degeneracy.
    *   Define clearly how `radiusVector` behaves when parent projection planes undergo transformations.

### 2.2. The Line-by-Angle Reference-Line Realization Collapse
The new parameterized line type is proposed as:
```typescript
export class Line2DByPointAndRelativeAngle extends Line2D {
  readonly referenceLineId: string;
  readonly throughPointId: string;
  readonly angleRadians: number;
}
```
If the parent `referenceLineId` becomes **infeasible** or is **deleted** under a process tree action, the realization of the parameterized line faces a critical dependency collapse:
*   Currently, the realization computes direction by rotating the parent's base direction:
    $$\vec{d}_{\text{new}} = \mathbf{R}(\theta) \vec{d}_{\text{ref}}$$
*   If `referenceLine` is infeasible, the parameterized line is also infeasible.
*   **Missing Dependency Fail-Safe**: If `referenceLineId` is entirely removed by an undo or operation, the dependency tracker needs to automatically cascade removal or flag the element as dangling and infeasible, rather than throwing uncaught "Element not found" errors during world sweeps.

---

## 3. Short-Sighted UX & Tooling Constraints

### 3.1. Angle Direction Ambiguity (Degrees vs. Clockwise Direction)
In 2D web workspaces, $y$-down coordinates can flip conventional mathematical trigonometry rules (where positive angle is counter-clockwise):
*   Svg paths and canvas matrices typically treat clockwise (CW) as positive when $y$ is pointing down.
*   Standard CAD uses anticlockwise (CCW) as positive.
*   **The Conflict**: If the user types `30`, does the line rotate 30 degrees counter-clockwise or clockwise relative to the reference line? A mismatch between typed degree signs and visual feedback frustrates draftspersons.
*   **Mitigation**: The design plan must clearly specify that the geometry engine computes relative angles consistently using **counter-clockwise (CCW) positive mathematical convention**, regardless of the underlying $y$-down canvas SVG presentation layer coordinate conversion.

### 3.2. Handle Snampping and "Argument Collector" Interaction Loops
If a user is dragging a parameterized handle (such as the radius handle of a circle), can they snap it to existing points/elements on the canvas?
*   **The problem**: While dragging the circle radius handle, the standard snap test can easily snap to a nearby intersection or point. If it does, does the circle convert *back* to a point-dependent construction (`Circle2DByCenterAndPoint`)? Or does it remain a radius construction with the radius vector snapped to that instantaneous static length?
*   **Desired UX Rule**: Sticking to strict separation is vital. A handle drag edits the *existing* parameters of the same construction. Snapping should only copy the coordinate value (calculating $\vec{r} = \mathbf{P}_{\text{snap}} - \mathbf{P}_{\text{center}}$) without changing the construction type of the element.

---

## 4. Architectural Cleanliness & Refinements

### 4.1. ToolArgumentSpec Type Explosion
The proposal introduces a massive polymorphic expansion to `ToolArgumentSpec`:
```typescript
export type ToolArgumentSpec =
  | ElementArgumentSpec
  | PlanePositionArgumentSpec
  | DistanceArgumentSpec
  | AngleArgumentSpec;
```
This requires rewrite of `ArgumentCollectorTool`'s core loop, making it much more complex. We should follow a simpler, more composable pattern by splitting numeric parameters from geometric selections.

#### Better Architectural Approach: Coordinate and Numeric Promporters
Instead of treating `Distance` and `Angle` as separate, fully polymorphic argument specs inside the collector hierarchy, observe that they are merely **Numeric scalars**.
A cleaner, highly reusable definition is:
```typescript
interface NumericArgumentSpec {
  kind: 'numeric';
  name: string;
  unit: 'length' | 'angle-deg';
  min?: number;
  max?: number;
  placeholder?: string;
}
```
This single type covers radii, angles, offsets, array counts, and ratios under a unified parsing and state management strategy, dramatically reducing boilerplate code inside the collector framework.

---

## 5. Summary of Recommended Implementation Tasks

Integrate these structural safeguards into your implementation roadmap:

1.  **Clamp Zero-Degeneracies**: Force a strict threshold validation on all manual length entries and handle drags to block $\vec{r} = \mathbf{0}$ states.
2.  **Unify Math Conventions**: Enforce counter-clockwise (CCW) positive trigonometry rotation coordinates across all 2D calculations, with robust mapping from the SVG $y$-down canvas.
3.  **Specify Dependency Collapse Fail-Safes**: Ensure that if parent lines are deleted, parameterized segments cascade logical infeasibility cleanly instead of crashing the realization pipeline.
4.  **Consolidate to a unified `NumericArgumentSpec`**: Prevent polymorpic tool argument spec explosion by treating distances and angles as generic numeric definitions.
5.  **Clean Handle Snap Isolation**: Maintain element type stability during handle drags—snapping updates the radius vector length/orientation statically and does not morph the construction type back to a point-dependence.
