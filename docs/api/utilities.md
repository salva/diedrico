# Utilities API

Utility modules provide focused helpers that should remain free of UI ownership.

- `frontend/src/utils/coordinateTransform.ts` and `domain/calculations/CoordinateTransform.ts` handle coordinate conversions.
- `frontend/src/utils/threeUtils.ts` supports Three.js/vector transformations used by presentation selectors and adapters.
- `frontend/src/utils/arcGeometry.ts`, `rectangleGrid.ts`, and `projectionPlaneUtils.ts` support drawing and plane calculations.
- `frontend/src/utils/assert.ts` centralizes small runtime assertions.

Prefer placing pure geometry in `domain/calculations` and UI/rendering adaptation helpers in `utils` or `rendering` only when they do not belong to the domain model.
