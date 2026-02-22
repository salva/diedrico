# Hinge Lines

Hinge lines (also called fold lines) are the intersection lines between paired projection planes. They are fundamental to the dihedral system, connecting two views of the same 3D space.

## Concept

When two projection planes share an edge, the **hinge line** is where they fold. In classical descriptive geometry, this is the "ground line" (*línea de tierra*) between the horizontal and vertical planes.

## Structure

Each `HingeLine` creates **two** `HalfHingeLine2D` objects — one per plane:

```
HingeLine (3D)
├── HalfHingeLine2D on Plane 1
└── HalfHingeLine2D on Plane 2
```

### HingeLine (3D)

- Extends `Line3D` (an `Element3D`)
- Stores references to both planes: `plane1Id`, `plane2Id`
- `realize3D(world)` computes the 3D line of intersection
- `getOtherPlane(planeId)` navigates to the paired plane

### HalfHingeLine2D

- Extends `Line2D` (an `Element2D`)
- The 2D representation of the hinge on each plane
- **Plane 1**: canonical coordinates — origin `(0, 0)`, direction along u-axis
- **Plane 2**: 3D line projected back via `applyMatrix3x4()`
- `realize2D(world)` produces a `HalfHingeLineRealization2D` that includes a `guideVector` (perpendicular to the hinge)

### Sibling Navigation

`getSiblingInfo(world, halfHingeLineId, currentPlaneId)` navigates from one half-hinge line to its sibling on the paired plane. This enables:

- Guide construction (perpendicular to a hinge, with sibling auto-creation)
- Distance transport between planes

## Broken Hinge Lines

When a new auxiliary projection plane is created, a **broken hinge line** is added where the new plane meets an existing one. This extends the folding system beyond two planes.

## Guides and Hinges

Guides are constructed perpendicular to half-hinge lines:

1. Select the **Guide** tool
2. Click a half-hinge line (or broken hinge line)
3. Click a through-point

A **sibling guide** is automatically created on the paired plane, enabling distance transport across views.

## Visual Rendering

- **2D Canvas**: Hinge lines render as dashed lines separating plane regions
- **3D View**: Hinge lines render as highlighted edges at the fold between planes
- Render layer: `HingeLines` (layer 5), below regular elements
