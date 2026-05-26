# Rendering pipeline

Rendering is split into selection and adaptation.

## 2D canvas

`CanvasPresentationSelector` reads `World`, viewport state, active plane, selection, hover, snap, and visibility flags. It emits canvas render/query items made from paper primitives. Vue canvas components render those DTOs and use query items for hit testing and interaction.

## 3D view

`ThreePresentationSelector` composes focused selectors for projection planes, planar elements, reconstructed 3D elements, guides, and hinges. `frontend/src/rendering/threeView/*` scene adapters convert those DTOs into Three.js objects managed by `ThreeViewRuntime` and `ThreeSceneHost`.

## Boundary

Domain objects never own Three.js scene objects. Vue components and rendering adapters should consume presentation models instead of querying random domain internals for drawing policy.
