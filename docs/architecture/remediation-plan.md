# Architecture remediation plan

This plan records the recommended architecture cleanup for the current Diedrico frontend codebase. The priority is simple, clean architecture and code. Backward compatibility with old tests, old on-disk formats, existing layer boundaries, or current component shapes has no weight unless a concrete product requirement says otherwise.

The current application has several strong foundations: a frontend-only Vue 3 + TypeScript stack, operation-backed commands, a mostly isolated domain layer, presentation selectors for rendering, and useful architecture tests. The remediation should preserve those strengths only where they continue to support clarity. Existing design is not protected by default.

## Implementation Status

- Workstreams 1, 3, 4, 10, and 11 have been implemented for their current scope and are guarded by tests where practical. The overview now records the current boundary state, and stale `tests/unit/services/` coverage has been moved beside the layers it exercises.
- Workstream 2 is implemented for the current canvas-shell cleanup batch: component-level concrete tool construction has moved behind `createCanvasTool()`, and select-click/free-point drag policy now lives in `CanvasInteractionController`. Tool lifecycle, tool click dispatch, viewport pan/zoom, hover/snap, fit-to-view, direct renderer/input construction, and screen/canvas-to-plane coordinate conversion have moved out of `SvgCanvas.vue`. Further cleanup is opportunistic around presentation/store reads, properties-dialog orchestration, and controller/composition placement.
- Workstream 5 is partially implemented: tools no longer depend on Pinia stores or application modules. `ITool.ts`, `ToolCommandIntents.ts`, and `ToolInteractionReadPort.ts` are now owned by the tools layer; application code depends on those tool contracts. `ArgumentCollectorTool` no longer maps tool names through application construction-intent taxonomy; basic construction tools declare their intent type directly, and metadata tools still override intent construction. Remaining tool work is mainly reducing command-intent coupling further if a cleaner neutral command boundary emerges.
- Workstream 6 is implemented for the current store cleanup batch: selected application-owned selection mutations now go through `SelectionActionPort`, and `SvgCanvas.vue` no longer imports the tool store. Browser persistence has been extracted from `toolStore` and `viewStore` module-level init into explicit `initFromStorage()` / save wiring in App.vue. `ThreeView.vue` no longer uses v-model to directly mutate store reactive state; it uses `:checked` + `updateThreeViewOption()`. Remaining store work is low priority and focused on `settingsStore` persistence placement plus process-tree/view/settings ownership classification.
- Workstream 7 is implemented for the current domain cleanup batch: active-plane UI state moved from `World` to `RuntimeSession`, runtime subscription wiring moved behind `RuntimeChangePublisher`, and realization cache maps moved into `RealizationStore`. ProcessTree notification (`_version`, `listeners`, `subscribe`, `getVersion`, `notifyChange`) removed — `ProcessTreeReadPort` now uses inherited `subscribeToChanges`. `ProcessTreeIdAllocator` owns process-tree node ID generation. DependencyService port interfaces (`DependencyQueryPort`, `DependencyRegistrarPort`) created; stale reverse-edge bug in `registerNode()` fixed; application and command callers now use `getDependencyQuery()` / `getDependencyRegistrar()` when they only need those narrowed surfaces. Presentation description logic moved from domain `Action.ts` to application read model. `WorldEntityFactory` now owns concrete construction of fixed planes, projection planes, and hinge-line entities. Domain `console.*` side effects have been removed and guarded. Remaining notification debt is low priority.
- Workstream 8 is partially implemented: rollback/cancel notification behavior has tests, and `SvgCanvas.vue` now keeps only its runtime-subscription `renderTick` increment. `ThreeView.vue` still has a runtime-subscription refresh tick, and broader notification ownership remains open.
- Workstream 9 is implemented for the current port cleanup batch: `RuntimeViewPorts.ts` no longer imports store modules, rendering implementation types, or `CanvasTool`, `ToolType` moved to an application tool contract, and `AppShellPorts.ts` is guarded from importing stores. The former `invokeToolClick(tool, context)` leak has been removed; tool invocation now happens in `CanvasInteractionController` with an injected `ToolInteractionReadPort`. Remaining port work is focused on view/selection/store presentation reads and avoiding unnecessary app-shell exposure.

## Revised Remaining Plan

The original workstreams remain useful as historical structure, but remaining execution should be organized by current coupling hotspots. The next work should not continue linearly through the old numbering. Architectural leverage is now concentrated in canvas orchestration, runtime/tool port shape, store ownership, and the domain `World` aggregate.

### Priority 1: Finish The Thin Canvas Shell

This combines the remaining parts of Workstreams 2, 6, and 9. `SvgCanvas.vue` is still the largest cross-layer pressure point, so it should be reduced before deeper runtime or domain redesign.

Target state:

- `SvgCanvas.vue` renders SVG/presentation data and forwards normalized events.
- Tool instance lifecycle, active tool switching, command invocation, select-click, drag, hover/snap, viewport pan/zoom, fit-to-view, and coordinate conversion live in application/controller code.
- Rendering/input adapters such as `SVGRenderer` and `InputService` are constructed by application/rendering composition or controller code, not directly by the component.
- Direct store reads in `SvgCanvas.vue` are limited to clearly visual UI state, or replaced by injected runtime/application ports where the state is application-owned.
- Canvas behavior is covered by focused application/controller tests, not large component orchestration tests.

Recommended steps:

1. Move remaining coordinate conversion and normalized event construction out of `SvgCanvas.vue` into `application/canvas` helpers or `CanvasInteractionController`.
2. Move active tool instance lifecycle and tool invocation into application/canvas code so `SvgCanvas.vue` no longer owns current tool instances.
3. Move hover/snap and selection-mask policy into the same controller or a small sibling selector if combining them would make one object too broad.
4. Move viewport drag, wheel zoom, and fit-to-view policy out of the component.
5. Move direct `SVGRenderer` and `InputService` construction out of `SvgCanvas.vue`.
6. Remove remaining manual `renderTick` refresh workarounds once runtime notifications cover the behavior.
7. Add architecture tests for the resulting component boundary only after the replacement ports/controllers exist, including guards for component imports from application tool factories and rendering adapters where those imports have been removed.

### Priority 2: Narrow Canvas Runtime And Tool Ports

Do this after Priority 1, when the controller shape is clear. Avoid premature DTO churn.

Target state:

- `RuntimeViewPorts.ts` exposes intent/event-level canvas operations, not `CanvasTool` object invocation.
- `CanvasViewPort` does not contain `invokeToolClick(tool, context)`. This is now implemented and guarded.
- Concrete tool classes remain hidden behind application/controller construction.
- `ITool.ts` does not import application-layer tool protocols; shared tool protocols are owned by the tools layer. This is implemented and guarded.
- Tool protocols stay minimal: collect arguments, emit construction intents/status, and use explicit callbacks for completion.

Recommended steps:

1. Replace `invokeToolClick(tool, context)` with controller-owned event handling or an intent-level method. Done: `CanvasInteractionController` invokes active tools directly.
2. Keep `CanvasTool` types out of app-shell runtime ports if the canvas controller can own tool object interaction. Done and guarded by architecture tests.
3. Move the shared `CanvasTool` / `ToolContext` protocol out of `application/tools` or invert the dependency so tools do not import application-owned protocol types. Done: `ITool.ts` owns the protocol.
4. Replace `ArgumentCollectorTool`'s base-class dependency on application construction-intent taxonomy with a cleaner contract, such as per-tool intent builders or a neutral tool-intent descriptor mapped by the application controller. Done for the base-class mapping: basic tools declare `constructionIntentType`; metadata tools override construction intent creation.
5. Keep `ToolCommandSink` only as the command-intent boundary if it remains simpler than introducing another adapter.
6. Strengthen architecture tests around app-shell/runtime port imports once the new seam is stable.

### Priority 3: Resolve Store Ownership And Browser Persistence

Store cleanup should be ownership-driven, not a blanket import ban. Some stores are valid UI adapters; others currently hide application or browser-persistence policy.

Target state:

- Application-owned state is accessed through runtime/application ports.
- Stores hold UI-only reactive state or production adapter state.
- Browser persistence is initialized by production composition/adapters where practical, not arbitrary module top-level store code.

Store classification:

| Store | Classification | Persistence | Remaining issues |
| --- | --- | --- | --- |
| `toolStore` | UI interaction state (active tool, step message, sub-tool preferences). Not a Pinia store; module-level refs. | `initFromStorage()` in App.vue loads sub-tool preferences; `selectSubTool` still writes to localStorage inline. | Inline `localStorage.setItem` in `selectSubTool` should move to an external watcher or callback. |
| `selectionStore` | UI selection state. Pinia store. Read-only in all components; mutations go through `SelectionActionsInjectionKey` port. | None. | Clean: no persistence, mutations already behind port. |
| `viewStore` | Viewport state and 3D display options. Not Pinia; module-level refs. | `initFromStorage()` in App.vue loads projection/3D-view preferences; mutation methods still write to localStorage inline. | Inline `localStorage.setItem` in `toggleProjectedElements`, `setThreeViewOptions`, `updateThreeViewOption` should move to an external watcher. `ThreeView.vue` v-model anti-pattern fixed: now uses `:checked` + `updateThreeViewOption()`. |
| `processTreeStore` | UI panel collapse state. Not Pinia; module-level refs. No domain data. | None. | Clean: pure UI state, no persistence, two component consumers. |
| `settingsStore` | User preferences with auto-persist. Pinia store. Deep watcher auto-saves to localStorage. | Module-level `loadSettings()` on store creation; deep watcher auto-saves. Only consumed in App.vue for init side effects. | Module-level init still runs on store creation (Pinia, not module scope). Consider extracting init to App.vue explicit call. |
| `authStore` | Google Drive auth session state. Not Pinia; module-level refs. | sessionStorage (not localStorage). Init and clear methods handle session persistence. | Clean: session-scoped persistence is appropriate for auth state. No module-level side effects; `restoreSession()` is called explicitly. |

Completed steps:

1. ✅ Classified all 6 stores field-by-field.
2. ✅ Preserved direct store use for clearly visual component state.
3. ✅ Extracted browser preference persistence from `toolStore` and `viewStore` module-level init into explicit `initFromStorage()` calls in App.vue. Exported storage key constants for future external persistence wiring.
4. ✅ Fixed `ThreeView.vue` v-model anti-pattern: replaced direct mutation of `threeViewOptions` reactive properties with `:checked` + `viewStore.updateThreeViewOption()`.

Remaining steps:

5. ✅ Extracted inline localStorage writes from `viewStore.toggleProjectedElements`, `viewStore.setThreeViewOptions`, and `viewStore.updateThreeViewOption`. These now delegate to `viewStore.saveToStorage()` via App.vue watchers. `toolStore.selectSubTool` calls `saveToStorage()` internally because the underlying `lastUsedByFamily` ref is not exposed reactively.
6. Extract `settingsStore` module-level `loadSettings()` + auto-save watcher into explicit App.vue composition. Low priority: only consumed in App.vue for init side effects.
7. Decide whether `processTreeStore` is UI panel state or an application projection after process-tree ownership is clarified.
8. Add narrow architecture tests for components that have been migrated, not a broad no-store rule that blocks valid UI state.

### Priority 4: Decompose `World.ts` Further

Do this after canvas/runtime/store boundaries are clearer. The domain aggregate should shrink around real domain responsibilities instead of compensating for unclear callers.

Target state:

- `World` owns geometry/construction state, not UI or rendering notification policy.
- ID allocation, process-tree ownership, dependency graph ownership, and factory-style construction are explicit responsibilities, not incidental fields on a god object.
- Domain code has no routine logging side effects.

Completed steps:

1. ✅ Replaced World-owned mutation notification with a standalone `RuntimeChangePublisher` / `ChangeNotifier` seam.
2. ✅ Removed `World.markDirty()`, `notifyChange()`, `changeListeners`, `_version`, `getVersion()`, `subscribeToChanges()`, and `unsubscribeFromChanges()`.
3. ✅ Routed `Command.addAndExecute()`, `rollback()`, `undo()`, and `redo()` through `ChangeNotifier.notifyChange()` instead of `world.markDirty()`.
4. ✅ Removed redundant operation-level `world.markDirty()` calls from `UpdateFreePoint2DPositionOp`, `AddBrokenHingeLineOp`, and `AddAuxiliaryProjectionPlaneOp`.
5. ✅ Removed `ProjectionPlaneElementStore` mutation-context `markDirty()` and kept dependency registration only.
6. ✅ Kept runtime-level notifications in `RuntimeSession` for active-plane changes, project restore, visibility toggle, and other application-owned changes.
7. ✅ Updated behavior and architecture tests so components still subscribe through runtime ports and World remains free of rendering notification policy.
8. ✅ Extracted generated-ID counter ownership into `WorldIdAllocator`; `World` keeps the public ID API but no longer stores the raw `nextId` counter.
9. ✅ ProcessTree notification removed: `_version`, `listeners`, `subscribe()`, `getVersion()`, `notifyChange()` removed from `ProcessTree`. UI re-reads tree model through `ProcessTreeReadPort.subscribeToChanges`. `version` field removed from `ProcessTreeReadModel`. `ActionsPanel.vue` uses single `subscribeToChanges` subscription through `RuntimeChangePublisher`.
10. ✅ DependencyService ownership decided: keep mutable graph in World, split surfaces incrementally. `DependencyQueryPort` and `DependencyRegistrarPort` interfaces created in `DependencyPorts.ts`. Application read models use `DependencyQueryPort`. Stale reverse edges in `registerNode()` fixed.
11. ✅ Presentation description logic moved: `getActionDescriptionParts(action, world)` moved from domain `Action.ts` to application read model `ProcessTreeReadModel.ts`. Domain `Action.ts` no longer imports `World` or `DescriptorRegistry`.
12. ✅ ProcessTree ID allocation moved to `ProcessTreeIdAllocator`; architecture tests now guard `ProcessTree` against inline Date/random ID generation.
13. ✅ Dependency accessors narrowed: `World.getDependencyQuery()` and `World.getDependencyRegistrar()` expose query/write surfaces; production callers that only need those surfaces no longer call full-service `getDependencyService()` methods.
14. ✅ Concrete World entity construction moved to `WorldEntityFactory`: `createFixed3DPlane`, `createFixedProjectionPlane`, and `createHingeLineEntity`. `World` keeps storage, dependency registration, ID assignment, and its public convenience APIs.
15. ✅ Domain logging cleanup completed: all `console.log`, `console.debug`, `console.info`, `console.warn`, and `console.error` calls removed from `frontend/src/domain`; architecture tests guard the boundary.

Remaining steps:

16. Review non-domain `console.warn` / `console.error` usage separately if operator-facing diagnostics need consolidation.

#### ProcessTree Ownership Decision

Current responsibilities:

- `ProcessTree` is durable construction-history state: subprocesses, action groups, action nodes, output/encapsulation flags, tombstones, and active subprocess stack.
- Command operations mutate it through `world.getProcessTree()` so undo/redo/replay keep process history consistent with geometry operations.
- Application read models project it into UI DTOs with descriptions, related actions, infeasibility, and missing-element display state.

Options considered:

| Option | Pros | Cons | Decision |
| --- | --- | --- | --- |
| Keep `ProcessTree` in `World` unchanged | Minimal migration; replay and undo/redo already work; process operations already receive `World`. | `World` remains broad; live mutable tree leaks through `getProcessTree()`; process tree still owns some presentation-ish details. | Not enough cleanup. |
| Move `ProcessTree` to `CommandStack` / command history | Sounds conceptually aligned with “history”; could reduce duplicated state. | `CommandStack` is intentionally generic; `ProcessTree` is not just a list of commands; active subprocess stack is needed while commands are being built; bootstrap/non-undoable flows become awkward. | Rejected. |
| Move `ProcessTree` to application read model | Removes UI-ish state from domain. | Current tree is authoritative write state, not just a projection; deletion, visibility, process-history commands, undo/redo, and replay depend on it. | Rejected. |
| Split write model and read model | Preserves working command semantics; clarifies durable state vs UI projection; low migration risk; supports future narrowing. | `World` still owns tree for now; requires incremental caller cleanup. | Chosen. |

Chosen direction:

- Keep authoritative `ProcessTree` state in domain/World for now because it is durable construction-history state, not merely UI panel state.
- Treat `ProcessTreeReadModel.ts` and related application code as the owner of presentation descriptions, missing-element flags, related-action display, and infeasibility display.
- Move `getActionDescriptionParts(action, world)`-style presentation description logic out of domain `Action.ts` when possible, because it needs `World` lookup and DTO/presentation concepts.
- Avoid adding new broad `world.getProcessTree()` consumers. Prefer process-history use cases/ports and read models for UI callers.
- Reconcile duplicate process-tree interfaces (`ProcessTree.ts`, `Subprocess.ts`, `Process.ts`) only when doing focused process-tree cleanup.

#### DependencyService Ownership Decision

Current responsibilities:

- `DependencyService` stores a mutable bidirectional element dependency graph.
- Operations and projection-plane element storage register/unregister graph nodes.
- Deletion, cascade preview, and realization invalidation query the graph.
- The graph is currently duplicated mutable state alongside element definitions, so consistency depends on correct registration/unregistration.

Options considered:

| Option | Pros | Cons | Decision |
| --- | --- | --- | --- |
| Keep full mutable `DependencyService` exposed from `World` | Minimal migration; current invalidation/deletion flows work. | Any caller can mutate graph; missed unregisters create stale graph state; ownership remains unclear. | Not enough cleanup. |
| Move graph to `RuntimeSession` | Separates session/runtime from `World`; selection preview already lives near runtime. | Splits domain invariants across runtime and domain; realization invalidation and projection-plane mutation need graph access; tests/replay would need extra graph plumbing. | Rejected. |
| Fully derive graph from element definitions/history | Eliminates duplicate mutable graph and stale edge risk. | Requires complete dependency extraction for every element kind; broad and risky; may be expensive without caching; process history can diverge from current storage. | Attractive long-term, rejected for current wave. |
| Split registrar/query/invalidation ports while keeping graph World-owned | Clarifies who can mutate; preserves behavior; existing projection-plane registrar is a partial seam; enables future derived graph work. | Still mutable duplicate state; requires caller cleanup and graph consistency fixes. | Chosen. |

Chosen direction:

- Keep the actual graph implementation World-owned for now because it supports domain invalidation, deletion, and projection-plane mutation invariants.
- Stop treating `world.getDependencyService()` as a general-purpose public escape hatch.
- Split surfaces incrementally:
  - Registrar surface: `registerNode` / `unregisterNode`, used by World/projection-plane mutation and operations.
  - Query surface: dependency/dependent lookup and deletion order, used by application deletion and cascade preview.
  - Invalidation surface: kept inside World methods such as `invalidateRealization` and `invalidateLineRealization`.
- Fix graph consistency before broader moves: `registerNode()` should remove stale reverse edges before re-registering a node, and add-operation undo paths should consistently pass mutation context when removing projection-plane elements.

### Priority 5: Keep Boundaries Executable

Every completed boundary should get a focused architecture or behavior test. Do not add broad tests before the replacement design exists.

Recommended steps:

1. Keep `npm run test:architecture` as the minimum boundary gate.
2. Add tests after each migration that would fail if the old coupling returns.
3. Prefer narrow assertions tied to actual completed boundaries over speculative global bans.
4. Update `docs/architecture/overview.md` with concrete current violations after each reassessment, not just high-level cleanup priorities.

## Objectives

- Make ownership obvious: UI renders and forwards events, application orchestrates use cases, commands mutate state, domain models geometry, rendering adapts presentation DTOs.
- Remove cross-layer shortcuts that make the codebase harder to reason about.
- Prefer fewer, clearer abstractions over many small indirection layers.
- Keep domain code free of UI state, browser concerns, logging side effects, and rendering notification policy.
- Make component, store, tool, service, command, and domain boundaries executable through tests.
- Keep validation scripts honest: command names should describe what they actually verify.

## Scope Boundaries

- Do not introduce a backend as part of this remediation.
- Do not replace Vue, TypeScript, Pinia, Three.js, Vitest, or Playwright unless a specific task proves the tool itself is blocking clean architecture.
- Do not preserve old project formats or compatibility shims unless there is an explicit product requirement.
- Do not keep a current boundary, schema, test shape, or component API just because changing it is large.

## Current Strengths To Preserve When Useful

- Commands are operation-backed, serializable, undoable, and explicitly not subclassed.
- Current-schema persistence restores command streams through operation descriptors.
- Domain modules are already guarded from importing application, command, service, UI, store, and persistence layers.
- Canvas and 3D rendering already have presentation/read-model DTO seams.
- `App.vue` mostly composes runtime ports instead of directly owning business orchestration.
- Existing architecture tests are useful and should be strengthened.

## Target Architecture

| Area | Target ownership |
| --- | --- |
| Vue components | Template rendering, lifecycle hooks, event forwarding, injected port consumption. No command construction, no concrete tool factories, no domain mutation policy. |
| Stores | UI-only reactive state or adapter state. Stores should not become alternate domain/application models. Components should prefer injected ports over direct global-store access where the state is application-owned. |
| Application | Use cases, controllers, runtime composition, command production, selection policy, tool interaction policy, persistence orchestration. |
| Tools | UI interaction argument collectors that emit typed intents. Tools should not depend on stores or command stacks directly. |
| Commands | Operation sequencing, undo/redo, persistence descriptors, rollback. Commands should not contain domain policy beyond sequencing operations. |
| Domain | Geometry definitions, construction relationships, pure calculations, realization definitions. No UI active-tool/active-plane state, browser state, console logging, or rendering subscription policy. |
| Rendering | SVG/Three adapters that consume presentation DTOs and produce rendered objects/attributes. |
| Services | Real external I/O only, such as Drive and browser persistence adapters. Avoid using `services/` as a dumping ground for factories, renderers, or geometry helpers. |

## Workstream 1: Update Current-State Architecture Docs

### Problem

The current architecture overview is concise but does not fully describe the actual dependency rules, known boundary exceptions, and areas being cleaned up. Historical audit artifacts are useful provenance but too noisy as day-to-day architecture guidance.

### Target State

- `docs/architecture/overview.md` describes the current architecture honestly before code refactors start.
- The docs include a clear boundary table for components, stores, application, tools, commands, domain, rendering, and services.
- Known violations are called out as remediation targets, not normalized as acceptable patterns.

### Steps

1. Fix the root VitePress dependency issue that currently prevents `npm run docs:build` from resolving `vite`.
2. Update `docs/architecture/overview.md` with the target boundary table from this plan.
3. Add a short section for current violations and cleanup priorities.
4. Clarify that `architecture-audit/` is provenance, not the primary source for contributors.
5. Link this remediation plan from the architecture overview.
6. Add a concise current-violations table to the overview for still-open boundary problems, including canvas store/tool/rendering imports and runtime tool-object invocation.

### Acceptance Criteria

- Contributors can understand the intended architecture without reading historical audit cycles.
- The overview distinguishes intended boundaries from current violations.
- `npm run docs:build` passes.

## Workstream 2: Extract Canvas Orchestration From `SvgCanvas.vue`

### Problem

`frontend/src/components/workspace/SvgCanvas.vue` is a 1240-line orchestration component. It imports concrete tools, services, stores, runtime ports, hit-testing, coordinate conversion, rendering grouping, selection policy, drag policy, viewport policy, properties interactions, and fit-to-view behavior. This is the largest current architecture pressure point.

### Target State

- `SvgCanvas.vue` is a thin SVG shell.
- It renders already-prepared SVG view data and forwards normalized user events.
- It does not import concrete tools from `@/tools/*`.
- It does not own selection, drag, tool lifecycle, command invocation, or coordinate-conversion policy.

### Recommended Approach

Use the fewest new abstractions possible. Do not introduce a registry, runtime port, selection controller, drag controller, and coordinate service all at once unless each is independently necessary.

The likely clean shape is one application-level canvas interaction controller plus existing presentation/read ports:

- `CanvasInteractionController` owns tool instance lifecycle, click handling, select-mode behavior, point drag, and viewport drag decisions.
- `SvgCanvas.vue` forwards events and receives render state.
- Existing `CanvasViewPort`, `CanvasToolController`, and `CanvasInteractionQuery` should be reused or simplified instead of duplicated.

### Steps

1. Add failing architecture tests that demonstrate `SvgCanvas.vue` must not import concrete tools or forbidden services.
2. Extract the local `toolFactories` map into a minimal application-level factory function or controller. Avoid a class registry unless there is more than one caller or real mutable registry behavior.
3. Move select-click policy and free-point drag policy into the same controller if practical.
4. Move repeated screen-to-canvas and canvas-to-plane conversion into application/canvas utilities or the controller.
5. Keep `SVGRenderer` use temporary if needed, then move it under rendering in Workstream 4.
6. Delete component-level workarounds once controller/runtime notifications are reliable.
7. Keep tests focused on behavior: tool selection, argument collection, select-click, shift-select, drag commit, drag cancel, viewport pan.

### Acceptance Criteria

- `SvgCanvas.vue` imports no concrete tool classes.
- `SvgCanvas.vue` does not contain a tool factory map.
- Selection and drag behavior are unit-tested outside the component.
- Component tests verify only rendering/event-forwarding responsibilities.
- New architecture tests fail if concrete tools are reintroduced into components.

## Workstream 3: Define And Enforce Component Boundaries

### Problem

Current architecture tests block component imports of command construction surfaces, but they do not enforce the broader component rule. Components can still import concrete tools, services, and potentially domain concepts.

### Target State

- Components do not import command construction, concrete tools, business services, or domain mutation surfaces.
- Any exception is explicit, narrow, and documented.
- Boundary tests are added before cleanup so violations are visible and intentional.

### Steps

1. Extend `frontend/tests/unit/architecture/importBoundaries.spec.ts` with failing checks for current violations.
2. Forbid `src/components` imports from `@/tools`.
3. Forbid `src/components` imports from `@/services` after `SVGRenderer` and `InputService` move out of services.
4. Forbid `src/components` imports from `@/commands` and command operation paths, preserving the existing guard.
5. Forbid `src/components` imports from domain mutation modules. If a component needs a presentation type, expose it from application/presentation instead.
6. Keep exception predicates narrow and named.

### Acceptance Criteria

- Architecture tests describe the desired boundary even before all code is fixed.
- After remediation, no component imports concrete tools or forbidden services.
- Boundary exceptions are documented in both tests and architecture docs.

## Workstream 4: Clean Up The `services/` Directory

### Problem

`frontend/src/services` mixes unrelated concepts:

- `GoogleDriveService.ts`: external I/O service.
- `ProjectService.ts`: persistence schema/replay orchestration.
- `SVGRenderer.ts`: rendering adapter.
- `InputService.ts`: coordinate conversion helper.
- `GeometryService.ts`: wrapper around pure domain calculations.
- `factories/PlaneSequenceFactory.ts`: command/domain sequence factory.

This directory hides ownership and encourages components to import things called services even when they are rendering, application, command, or domain helpers.

### Target State

- `services/` contains only external I/O or browser-facing services.
- `GoogleDriveService.ts` remains a service only if `services/` is kept as the external I/O layer.
- `ProjectService.ts` either moves to an explicit persistence module or remains as the persistence service with that ownership documented.
- Rendering code lives under `rendering/`.
- Input/coordinate conversion lives under `application/canvas` or `utils`.
- Command sequence factories live under `commands/factories` or `application/construction`.
- Thin wrappers around pure domain calculations are deleted unless they add real policy.

### Steps

1. Move `SVGRenderer.ts` to `frontend/src/rendering/svg/` or `frontend/src/rendering/canvas/`.
2. Move `InputService.ts` to `frontend/src/application/canvas/` or convert it into pure utility functions.
3. Move `PlaneSequenceFactory.ts` out of `services/factories` into `commands/factories` if it remains command-sequence oriented, or into `application/construction` if it becomes use-case oriented.
4. Review `GeometryService.ts` callers. Prefer direct imports from `domain/calculations/*`; delete `GeometryService` if it adds no policy.
5. Decide whether `ProjectService.ts` belongs under `application/persistence`, `persistence/`, or `services/ProjectService.ts`. Prefer the location that makes command-stream persistence ownership obvious.
6. Keep `GoogleDriveService.ts` as external I/O, or move it under a more explicit `services/drive/` path if `services/` remains too broad.
7. Add architecture tests that reject `src/services/factories` and reject rendering helpers under `services`.

### Acceptance Criteria

- `frontend/src/services` no longer contains rendering adapters, coordinate helpers, command factories, or domain calculation wrappers.
- Components do not import from `@/services` except explicitly allowed external I/O adapters, if any.
- Architecture tests enforce the cleaned directory ownership.

## Workstream 5: Clarify The Tools Layer

### Problem

`frontend/src/tools` is currently an ambiguous layer. Tools collect interaction arguments and emit construction intents, but `ITool.ToolContext` imports application read ports, canvas interaction queries, matrices, and `useToolStore`. This makes tools depend on stores and application details, while application/runtime code also knows about concrete `ITool`.

`ArgumentCollectorTool.buildConstructionIntent()` also hard-codes application intent typing through `ConstructionIntentType` casts. That makes the base tool class know too much about the application command-intent taxonomy.

### Target State

- Tools are UI interaction argument collectors.
- Tools emit typed construction intents and status messages.
- Tools do not depend on Pinia stores.
- Application code does not need to know concrete tool classes.
- Tool context contains only the minimal read/query/emit capabilities needed for argument collection.
- Tool intent typing is simple and owned by the tool/application boundary, not by casts in a base class.

### Steps

1. Remove `ReturnType<typeof useToolStore>` from `ToolContext`.
2. Replace store mutation in tools with explicit callbacks such as `completeTool()` or return values interpreted by the canvas interaction controller.
3. Replace the `ConstructionIntentType` cast in `ArgumentCollectorTool` with a cleaner tool-intent contract. Either each tool provides its exact intent type, or the base class emits a generic construction request that the application maps explicitly.
4. Keep `ToolCommandSink` as the command-intent boundary only if it remains clean after the intent contract is simplified.
5. Move concrete tool construction behind the canvas interaction controller or a pure factory function.
6. Ensure application ports no longer expose `ITool` unless there is a strong reason.
7. Add architecture tests preventing `frontend/src/tools` from importing `@/stores`.

### Acceptance Criteria

- `ITool.ts` imports no Pinia store types.
- Tool implementations do not import stores.
- `ArgumentCollectorTool` does not cast through application intent unions to build commands.
- Components do not construct tools directly.
- Application/runtime code interacts with tool intents, not concrete tool classes, wherever practical.

## Workstream 6: Resolve Store And Port Dual Access

### Problem

Stores such as `toolStore`, `selectionStore`, `viewStore`, `processTreeStore`, and `settingsStore` hold state that components can access globally. Some of that state is UI-only, but some is application-owned or browser-persisted. At the same time, app-shell ports define store-like interfaces. This creates two access paths: direct `useStore()` imports and injected runtime ports.

### Target State

- Application-owned state is accessed through runtime/application ports.
- Stores are either UI adapter state or internal implementation details of production composition.
- Components do not bypass application policy by directly mutating application-owned stores.

### Steps

1. Classify each field in `toolStore`, `selectionStore`, `viewStore`, `processTreeStore`, `settingsStore`, and `authStore` as UI-only, application state, browser preference, external-session state, or runtime session state.
2. Move selection policy behind injected selection/application ports where components currently mutate selection directly.
3. Move active-tool completion behavior behind the canvas interaction controller or tool runtime port.
4. Keep purely visual viewport state in `viewStore` only if it remains UI state; otherwise expose it through a view port.
5. Decide where process-tree panel state belongs after `ProcessTree` ownership is clarified in Workstream 7.
6. Move localStorage persistence out of module top-level store initialization where possible; production composition should own browser storage defaults. Include `settingsStore`, `toolStore`, and `viewStore` persistence keys in this review.
7. Add architecture tests that prevent selected components from importing stores once ports exist.

### Acceptance Criteria

- Components cannot directly mutate application-owned state through stores.
- Store access rules are documented and test-enforced.
- Browser persistence keys live in adapter/composition code, not arbitrary stores.
- `processTreeStore` ownership is consistent with the final process-tree ownership decision.

## Workstream 7: Decompose `World.ts`

### Problem

`frontend/src/domain/world/World.ts` is a large god object. It owns geometry storage, ID generation, process tree, dependency service, change listeners, labels, element factory methods, and realization lookup orchestration. Some of these are domain responsibilities; some are application or runtime responsibilities. Active-plane UI state has moved to `RuntimeSession`, and direct realization cache map storage has moved to `RealizationStore`, but the other ownership questions remain.

### Target State

- `World` is a domain aggregate for geometry and construction state, not UI state or runtime notification plumbing.
- Active plane state moves out of `World` into application/runtime state.
- Change notification policy moves out of the domain root or becomes a thin runtime wrapper around domain mutations.
- Realization caches are separated from element definitions.
- Process tree and dependency graph ownership is explicit and not hidden as incidental fields on `World`.

### Steps

1. Extract active-plane state from `World` into `RuntimeSession` or an `ActivePlaneState` application object.
2. Replace `World.subscribeToChanges()` with a runtime-level change publisher if feasible. Domain mutations should not know about UI subscribers.
3. Extract ID generation into a small domain ID allocator if keeping generated IDs in domain remains necessary.
4. Extract realization caches into a `RealizationStore` or computed realization service. Keep definitions and computed values separate.
5. Review whether `ProcessTree` belongs in `World` or in construction history/application state. Move if cleaner.
6. Review whether `DependencyService` should be an owned mutable service or a derived graph from current construction definitions.
7. Split large element factory methods into cohesive modules if they remain on the domain side.

### Acceptance Criteria

- `World` no longer owns active UI state.
- Domain change notification is not coupled to rendering/component refresh needs.
- Realization caches are not mixed with element definition storage in the same god object.
- `World.ts` is materially smaller and has fewer unrelated responsibilities.
- Architecture tests guard domain independence and forbid reintroducing UI/runtime state into `World`.

## Workstream 8: Fix Command And Notification Semantics Simply

### Problem

`Command.addAndExecute()` marks the world dirty after each operation. `undo()`, `redo()`, and rollback/cancel paths now have targeted notification coverage, but components still compensate with manual `renderTick` increments in several canvas interaction paths.

This is two separate concerns: missing rollback/cancel notifications are correctness bugs; excessive intermediate notifications are a possible performance issue.

### Target State

- Rollback and preview cancel notify subscribers when they undo applied state.
- Components do not force refresh to compensate for command/runtime gaps.
- No batching API is added to `World` unless a measured performance problem requires it.

### Steps

1. Add tests for notifications on commit, rollback after applied operations, preview update, preview cancel, undo, and redo.
2. Keep tests for `Command.rollback()` and preview cancel notification behavior.
3. Identify every remaining `renderTick.value++` use and classify it as either legitimate local UI invalidation or compensation for command/runtime notification gaps.
4. Remove component-level `renderTick` increments that only compensate for command/runtime notification uncertainty.
5. If too many renders occur, debounce or batch at the subscriber/rendering layer, not by adding transaction state to `World`.

### Acceptance Criteria

- Notification behavior is specified by tests.
- Rollback and preview cancel refresh views without component workarounds.
- No new `World.beginBatch()` or equivalent domain batching API exists unless justified by measured performance evidence.

## Workstream 9: Narrow Runtime And App Ports Without Extra Indirection

### Problem

Central port files leak avoidable concrete types. Store imports and rendering implementation types have been removed from the most important app-shell ports, but `RuntimeViewPorts.ts` still exposes `CanvasTool` object invocation through `invokeToolClick(tool, context)`. However, over-abstracting Vue refs or translating every DTO would add complexity without improving clarity.

### Target State

- Ports expose operations and intent-level DTOs.
- Implementation-specific types stay in implementation/composition files where possible.
- Vue-specific types are acceptable in Vue runtime implementation files, but not in generic operation-port contracts unless there is no simpler alternative.
- Do not create DTO translation layers unless they remove a real dependency problem.

### Steps

1. Remove `useToolStore` and `ITool` from `RuntimeViewPorts.ts` through Workstreams 2 and 5.
2. Replace `ViewportTransform` imported from `SVGRenderer` with a local `CanvasViewport` type or move the type to a shared presentation module.
3. Remove `CanvasTool` and `invokeToolClick(tool, context)` from `RuntimeViewPorts.ts` after canvas interaction handling moves fully into application/controller code.
4. Keep `ProjectData` as a persistence contract if it remains the only current schema. Do not wrap it in a duplicate DTO just to avoid a type import.
5. Keep Vue refs in runtime implementation where they simplify Vue integration; avoid pretending the Vue app shell is framework-neutral.
6. Split port files only where it clarifies ownership. Do not split files solely for aesthetics.

### Acceptance Criteria

- Runtime view ports no longer import stores, concrete tools, or rendering implementation types.
- Port changes reduce coupling without adding duplicate DTOs or unnecessary adapters.
- Architecture tests cover the most important forbidden imports.

## Workstream 10: Remove Routine Console Noise

### Problem

Routine `console.log`, `console.debug`, and `console.info` calls remain in UI, command factories, services, stores, and domain geometry code. Domain code should not have side-effect logging.

### Target State

- Active source has no routine production console noise.
- Domain computations return structured results, not console traces.
- `console.warn` and `console.error` remain only for explicit failure reporting where there is no better UI path.

### Steps

1. Add an architecture test that scans all `frontend/src` files for `console.log`, `console.debug`, and `console.info`.
2. Delete routine logs rather than introducing a logger abstraction.
3. If a diagnostic trace is truly needed, make it returned data or a test helper, not a domain side effect.
4. Review `console.warn` and `console.error` separately; do not remove useful failure reports blindly.

### Acceptance Criteria

- Architecture tests reject routine `console.log`, `console.debug`, and `console.info` in active source.
- Browser console is quiet during normal startup, tool selection, zooming, and rendering.
- Domain files do not log as a side effect of geometry calculation.

## Workstream 11: Make Validation Scripts Honest

### Problem

`frontend/package.json` maps `lint` to `npm run test:architecture`. That command is useful, but it is not linting. The project also lacks a clear routine validation script.

### Target State

- `test:architecture` remains the architecture boundary gate.
- `lint` runs real ESLint-based TypeScript/Vue static analysis.
- A routine validation script runs architecture tests, unit tests, and build.

### Steps

1. Add ESLint for TypeScript/Vue and make `npm run lint` run real lint/static analysis.
2. Add `validate:routine` at the root for `test:architecture`, frontend unit tests, and frontend build.
3. Add `validate:docs` if docs builds remain part of routine contributor workflow.
4. Update `docs/contributing/testing.md` with exact script meanings.
5. Keep docs validation wired to the VitePress dependency fix completed in Workstream 1.

### Acceptance Criteria

- `npm run lint` means ESLint-based TypeScript/Vue static analysis.
- `npm run test:architecture` means architecture boundary tests.
- Contributors have a single routine validation command for implementation changes.
- Docs build runs successfully after dependency cleanup.

## Preferred Implementation Order

This order supersedes the original workstream order and prioritizes current architectural leverage.

1. Finish the thin canvas shell: remove remaining orchestration, store policy, event normalization, coordinate conversion, viewport policy, hover/snap, and tool lifecycle from `SvgCanvas.vue`.
2. Narrow canvas runtime/tool ports after the controller shape is clear, especially by removing tool-object invocation from app-shell runtime ports.
3. Resolve remaining store ownership and browser persistence placement based on field-level classification.
4. Decompose `World.ts` further: notification plumbing, ID allocation, process-tree ownership, dependency graph ownership, factory methods, and remaining domain logging.
5. Strengthen architecture tests for each completed boundary.
6. Keep documentation and validation status current after each wave.

The completed workstreams remain part of the historical plan below, but new implementation should follow this revised order unless a concrete blocker makes a different sequence cleaner.

## Validation Cadence

Minimum gate for architecture-boundary work:

```bash
npm run test:architecture
```

Recommended gate for source refactors:

```bash
npm run test:architecture
npm run test --workspace=frontend
npm run build --workspace=frontend
```

Recommended gate for interaction-heavy canvas changes:

```bash
npm run test:architecture
npm run test --workspace=frontend
npm run build --workspace=frontend
npm run test:e2e --workspace=frontend
```

Recommended gate for docs changes after dependency cleanup:

```bash
npm run docs:build
```

## Risk Rules

- Do not preserve old interfaces, schemas, files, tests, or formats just because changing them is large.
- Prefer fewer concepts over more concepts.
- Add failing boundary tests first, then fix the code.
- Delete unnecessary wrappers before adding new abstractions.
- Do not add logger, transaction, registry, or adapter abstractions unless a concrete need remains after simpler cleanup.
- Keep domain code deterministic and side-effect-light.

## Definition Of Done

The remediation is complete when:

- `SvgCanvas.vue` is a thin SVG shell and no longer owns tool factories or business interaction policy.
- Components cannot import concrete tools, forbidden services, command construction, or domain mutation surfaces.
- `services/` contains only true external/browser-facing services.
- Tools emit intents, no longer depend on stores, and do not cast through application intent unions from base tool classes.
- Application-owned state is not mutated through direct component store access.
- `World` no longer owns active UI state, rendering notification policy, or unrelated realization/process/dependency responsibilities in one god object.
- Command rollback/cancel/preview/undo/redo notifications are specified by tests and behave consistently.
- Runtime/app ports no longer leak avoidable store/tool/rendering implementation types.
- Active source has no routine production `console.log`, `console.debug`, or `console.info` calls.
- Validation scripts are accurately named and documented.
- Architecture docs describe the current and target architecture without relying on historical audit artifacts.
