# Rendering pipeline

Rendering is split into selection and adaptation.

## 2D canvas

`CanvasPresentationSelector` reads `World`, viewport state, active plane, selection, hover, snap, and visibility flags. It emits canvas render/query items made from paper primitives. Application canvas code prepares SVG rendering inputs, and `frontend/src/rendering/svg/SVGRenderer.ts` converts paper primitives into SVG attributes.

## 3D view

`ThreePresentationSelector` composes focused selectors for projection planes, planar elements, reconstructed 3D elements, guides, and hinges. Application read ports provide the narrow world access needed by those selectors. `frontend/src/rendering/threeView/*` scene adapters convert DTOs into Three.js objects managed by `ThreeViewRuntime` and `ThreeSceneHost`.

## Boundary

Domain objects never own SVG or Three.js scene objects. Vue components and rendering adapters consume presentation models instead of querying arbitrary domain internals for drawing policy. Coordinate conversion lives in application canvas code, not in a rendering or generic service adapter.
