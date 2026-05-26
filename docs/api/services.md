# Services API

Services are frontend TypeScript helpers around persistence, Drive, input, SVG, and geometry orchestration.

## ProjectService

`ProjectService` persists only the current project schema. It serializes project metadata, `nextElementId`, and committed command snapshots. Loading validates the schema, deserializes operation descriptors through `OperationRegistry`, replays them into `World`, and restores committed command history.

Unsupported schema versions are rejected. There is no active automatic migration framework for old project formats.

## Rendering and presentation

Rendering-facing APIs are split between application selectors and adapters:

- `CanvasPresentationSelector` produces 2D canvas render/query models.
- `ThreePresentationSelector` produces the 3D presentation model.
- `rendering/threeView/*` adapters convert 3D presentation DTOs to Three.js scene objects.
- `SVGRenderer` remains a helper for SVG-oriented output and transforms where used.

## Drive and input

`GoogleDriveService` encapsulates Google Drive integration. `InputService` and canvas/tool controllers translate browser input into application-level requests.
