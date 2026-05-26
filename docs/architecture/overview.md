# Architecture overview

Diedrico is currently a frontend-only Vue 3 + TypeScript application. The root `package.json` declares only the `frontend` workspace; root scripts are wrappers for frontend validation/build tasks and VitePress documentation tasks.

## Layers

1. **Vue shell (`frontend/src/components`)** renders panels, canvas, header, and dialogs. Components receive presentation data and forward events to stores/controllers.
2. **Stores (`frontend/src/stores`)** hold UI/runtime state such as active tool, selection, settings, process-tree panel state, auth/session state, and service instances.
3. **Application layer (`frontend/src/application`)** owns use cases, controllers, and presentation selectors. It translates UI/tool intents into command operations and converts domain state into renderable DTOs.
4. **Commands (`frontend/src/commands`)** group serializable operations, enforce undo/redo, and provide descriptors for persistence replay.
5. **Domain (`frontend/src/domain`)** owns geometry, projection planes, process tree, dependency graph, realizations, and pure calculations.
6. **Rendering (`frontend/src/rendering`)** adapts presentation DTOs to Three.js scene objects; 2D canvas rendering consumes paper primitives selected by the application layer.
7. **Services (`frontend/src/services`)** provide persistence, Drive integration, SVG/input helpers, and orchestration around domain/application objects.

## Boundary rules

- UI tools create typed intents, not direct domain mutations.
- Application use cases build commands and push committed commands to `CommandStack`.
- Stores do not own `World` geometry or command construction policy.
- Selectors are the boundary between domain state and rendering adapters.
- Persistence uses the current command descriptor schema only; old project formats are not active compatibility surfaces.
