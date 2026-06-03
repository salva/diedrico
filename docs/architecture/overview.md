# Architecture overview

Diedrico is currently a frontend-only Vue 3 + TypeScript application. The root `package.json` declares only the `frontend` workspace; root scripts are wrappers for frontend validation/build tasks and VitePress documentation tasks.

## Layers

1. **Vue shell (`frontend/src/components`)** renders panels, canvas, header, and dialogs. Components should receive presentation data and forward events to injected ports/controllers; current canvas orchestration is being remediated.
2. **Stores (`frontend/src/stores`)** hold UI/runtime state such as active tool, selection, settings, process-tree panel state, and auth/session state. Application-owned state should move behind runtime/application ports instead of being globally mutated by components.
3. **Application layer (`frontend/src/application`)** owns use cases, controllers, and presentation selectors. It translates UI/tool intents into command operations and converts domain state into renderable DTOs.
4. **Commands (`frontend/src/commands`)** group serializable operations, enforce undo/redo, and provide descriptors for persistence replay.
5. **Domain (`frontend/src/domain`)** owns geometry, projection planes, process tree, dependency graph, realizations, and pure calculations.
6. **Rendering (`frontend/src/rendering`)** adapts presentation DTOs to Three.js scene objects; 2D canvas rendering consumes paper primitives selected by the application layer.
7. **Infrastructure/adapters** provide external I/O or browser-facing integration such as Drive and browser persistence. Rendering, coordinate conversion, command sequence factories, and command-stream persistence now live in explicit rendering/application/command locations instead of a generic services bucket.

## Target ownership

| Area | Target ownership |
| --- | --- |
| Vue components | Template rendering, lifecycle hooks, event forwarding, injected port consumption. No command construction, no concrete tool factories, no domain mutation policy. |
| Stores | UI-only reactive state or adapter state. Stores should not become alternate domain/application models. |
| Application | Use cases, controllers, runtime composition, command production, selection policy, tool interaction policy, persistence orchestration. |
| Tools | UI interaction argument collectors that emit typed intents. Tools should not depend on stores or command stacks directly. |
| Commands | Operation sequencing, undo/redo, persistence descriptors, rollback. |
| Domain | Geometry definitions, construction relationships, pure calculations, realization definitions. No UI active-tool/active-plane state, browser state, console logging, or rendering subscription policy. |
| Rendering | SVG/Three adapters that consume presentation DTOs and produce rendered objects/attributes. |
| Services | Real external I/O only, such as Drive and browser persistence adapters. |

## Boundary rules

- UI tools create typed intents, not direct domain mutations.
- Application use cases build commands and push committed commands to `CommandStack`.
- Stores do not own `World` geometry or command construction policy.
- Selectors are the boundary between domain state and rendering adapters.
- Persistence uses the current command descriptor schema only; old project formats are not active compatibility surfaces.

## Current cleanup status

| Area | Current state | Next decision |
| --- | --- | --- |
| Canvas shell | `SvgCanvas.vue` delegates tool lifecycle, event handling, coordinate conversion, rendering adapters, hover/snap, viewport pan/zoom, and fit-to-view to application canvas code. | Continue moving remaining presentation/store reads behind ports only where it reduces coupling. |
| Tool protocol | Tool contracts and command-intent types are owned by `frontend/src/tools`; tools no longer import application modules. | Reduce command-intent coupling further only if a simpler neutral boundary emerges. |
| Store ownership | Store fields have been classified. `toolStore` and `viewStore` no longer read browser storage at module import time; `ThreeView.vue` updates view options through store actions. | Decide whether to extract `settingsStore` persistence from Pinia setup; current priority is low because it is only initialized in `App.vue`. |
| Runtime notifications | `RuntimeChangePublisher` owns runtime change notification. `World` no longer owns `markDirty`, subscribers, or render-version state. | None for notification ownership; keep guarding the boundary. |
| ID allocation | `WorldIdAllocator` owns the World generated-ID counter; `ProcessTreeIdAllocator` owns process-tree node ID generation. `World` and `ProcessTree` keep their public ID APIs for now. | Revisit only if projection-plane ID allocation or process-tree restoration needs a stronger deterministic allocator. |
| Process tree | `ProcessTree` no longer owns notification plumbing. `_version`, `listeners`, `subscribe()`, `getVersion()`, `notifyChange()` removed. UI re-reads tree model through `ProcessTreeReadPort.subscribeToChanges` (inherited from `RuntimeChangeSubscriptionPort`). Presentation description logic (`getActionDescriptionParts`) moved from domain `Action.ts` to application read model. ID generation moved to `ProcessTreeIdAllocator`. | Split write/read responsibilities: keep command-driven ProcessTree writes in domain, move remaining presentation concerns to application read models, and avoid adding broad mutable tree callers. |
| Dependency graph | `World` still owns the mutable `DependencyService`. `DependencyQueryPort` and `DependencyRegistrarPort` interfaces defined in `DependencyPorts.ts`; `DependencyService` implements both. Application and command callers use `getDependencyQuery()` / `getDependencyRegistrar()` instead of the full service when they only need those surfaces. Stale reverse edges in `registerNode()` fixed. | Invalidations stay inside `World` methods. Keep the full `getDependencyService()` escape hatch internal and avoid adding new broad callers. |
| World factories | `WorldEntityFactory` owns concrete construction of fixed 3D planes, fixed projection planes, and hinge-line entities. `World` still owns storage, ID assignment, dependency registration, and public convenience methods. | Continue splitting only where doing so reduces coupling and improves readability; do not introduce a registry or abstract factory layer. |
| Domain logging | Domain modules under `frontend/src/domain` contain no `console.*` side effects. Geometry infeasibility is represented through returned infeasible/null realizations or thrown structural errors. | Keep domain logging-free; logging or diagnostics should live in application/infrastructure paths with explicit operator value. |

Use `docs/architecture/remediation-plan.md` as the current remediation plan; `architecture-audit/` remains provenance for prior refactor waves.
