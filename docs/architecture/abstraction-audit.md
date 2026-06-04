# Diedrico Abstraction Audit

Date: 2026-06-04

Scope: `frontend/src/domain/`, `frontend/src/application/`, `frontend/src/commands/`, `frontend/src/stores/`, `frontend/src/tools/`, `frontend/src/composables/`, `frontend/src/types/`, `frontend/src/rendering/`

Goal: identify classes, interfaces, and patterns that add complexity without proportional benefit, and suggest simplifications that make the architecture cleaner — not just smaller.

---

## How to Read This Report

Each finding includes:
- **What** the abstraction is
- **Why** it is questionable
- **What to do** — a concrete simplification

Priority ratings:
- **Remove** — dead code or pure indirection with no test or substitution benefit
- **Merge** — multiple files/classes that should be one
- **Simplify** — keep the concept but reduce layers
- **Reconsider** — architectural question worth a deliberate decision

---

## 1. Dead Code

### D01. `perpendiculars.ts` and `distances.ts` — entire files are dead

**What**: `frontend/src/domain/calculations/perpendiculars.ts` (89 lines) and `frontend/src/domain/calculations/distances.ts` (134 lines) define their own `Point2D`/`Line2D` interfaces (different from the domain types) and export geometry functions. Zero files outside `calculations/` import them.

**Why**: These modules shadow the real domain types with local interfaces that are never connected to the rest of the codebase.

**What to do**: Delete both files.

---

### D02. `QuickToolUseCases.ts` — stub that always returns failure

**What**: `frontend/src/application/construction/QuickToolUseCases.ts` (12 lines) exports `executeQuickToolIntent`, which always returns `{ success: false, message: "...was removed..." }`. It has exactly one call site in `CanvasToolController`.

**Why**: A permanent error-returning stub is noise. If quick tools are not a feature, the call site should not exist.

**What to do**: Remove the file and the `executeQuickIntent` path in `CanvasToolController`. If quick tools return later, add them fresh.

---

### D03. `Process` interface — never used

**What**: `frontend/src/domain/processTree/Process.ts` defines `Process` and `createProcess()`. The `Process` type is used nowhere outside `ProcessTree`'s root initialization, and `createProcess()` is never called.

**Why**: Tree roots use `Subprocess`; `Process` adds a `type: 'process'` discriminator that nothing checks.

**What to do**: Delete `Process.ts`. The root already uses `createSubprocess`.

---

### D04. `ActionGroup.ts` — re-export of ProcessTree's inner type

**What**: `frontend/src/domain/processTree/ActionGroup.ts` (21 lines) imports `ActionGroup` from `ProcessTree.ts` and re-exports it. No additional types or logic.

**Why**: Re-export indirection with no added value.

**What to do**: Delete the file. Update consumers to import directly from `ProcessTree`.

---

### D05. `DependencyEdge` — zero-usage interface

**What**: `DependencyEdge` in `DependencyService.ts` is a 3-field interface never referenced outside its own file.

**Why**: Dead type definition.

**What to do**: Remove it.

---

### D06. Store dead exports

**What**: Multiple stores export functions and state that are never called outside the store:

- `settingsStore`: `gridColor`, `updateSetting`, `resetToDefaults`, `resetCategory`, `Settings` interface
- `toolStore`: `getToolFamily`, `getToolConfig`, `getCompletionBehavior`
- `viewStore`: `resetViewport`, `setGridVisible`, `setThreeViewOptions`, `ViewportState` interface, `PROJECTION_DISPLAY_KEY`, `THREE_VIEW_OPTIONS_KEY`
- `authStore`: `isTokenExpired`, `tokenExpiry`
- `processTreeStore`: `ensureExpanded`, `setCollapsed`, `collapsedCount`
- `selectionStore`: `removeFromSelection`, `toggleSelection`, `hasSelection`, `selectionCount`, `isCascadeHighlighted`

**Why**: Dead exports increase surface area and confusion.

**What to do**: Remove all dead exports. If `toggleSelection` or `removeFromSelection` might be needed later, add them then. Do not keep unused API surface "just in case."

---

### D07. `ITool.activate()` and `ITool.deactivate()` — never called

**What**: The `ITool` interface defines `activate()` and `deactivate()` lifecycle hooks. No code in the project calls them.

**Why**: Dead protocol adds confusion about how tools actually start/stop.

**What to do**: Remove both methods from `ITool` and `BaseTool`.

---

### D08. Handling completion — `'return-to-selection'` mode is dead

**What**: `BaseTool.handleCompletion()` checks `this.completionBehavior === 'return-to-selection'` and calls `completeTool?.()`. Every single tool sets `completionBehavior = 'stay-active'`. The `return-to-selection` branch never fires.

**Why**: Complete dead branch in tool lifecycle.

**What to do**: Default `completionBehavior` to `'stay-active'` in `ArgumentCollectorTool`. Remove the override from all 15 tool files. Remove the `return-to-selection` branch from `handleCompletion`. Remove `completeTool` callback from the tool protocol if it is only used by this dead branch.

---

### D09. `SelectionMask.intersection()` and `IntersectionMask` — constructible but never constructed

**What**: `SelectionMask.intersection()` factory (0 external calls), `IntersectionMask` class (used only in a type guard `isIntersectionMask` that can never match because nothing creates an `IntersectionMask`), and `isIntersectionMask()` guard.

**Why**: After the Phase 1 remediation removed `HierarchyMask`, `IntersectionMask` is now the only remaining mask subclass that is never instantiated.

**What to do**: Remove `IntersectionMask`, `isIntersectionMask`, and `SelectionMask.intersection()`. Remove the `isIntersectionMask` branch from `CanvasInteractionQuery`.

---

### D10. `SelectionMask.guide()` — still present

**What**: `SelectionMask.guide()` was marked `@deprecated` in the review. The earlier remediation plan called for its removal but it may still be present.

**Why**: Zero production callers.

**What to do**: Remove it.

---

### D11. `SelectionMask.anyLine()` is identical to `line()`

**What**: `anyLine()` returns `new TypeMask('line')` which is the same object `SelectionMask.line()` returns.

**Why**: The name `anyLine` implies it matches more element types than `line`, but both produce the exact same mask.

**What to do**: Remove `anyLine()`. Replace its 4 callers with `SelectionMask.line()`.

---

### D12. `useHoverHighlight` factory — never called

**What**: `useHoverHighlight()` is a composable factory function that creates a new HoverState instance. Only `useGlobalHoverHighlight()` (the singleton) is actually used.

**Why**: The factory function is dead API surface.

**What to do**: Inline the singleton creation. Remove the factory function and the `HoverState` export. Keep only `useGlobalHoverHighlight`.

---

## 2. Over-Abstracted Layers

### A01. ThreePresentation adapter chain — 6 files of pure indirection

**What**: The data path from domain to Three.js rendering passes through:
1. `ThreePresentationAdapter` (5 sub-interfaces aggregated into 1 union interface)
2. 5 `Three*ReadPort` factory files (`ThreeProjectionPlaneReadPort`, `ThreePlanarElementReadPort`, `ThreeReconstructedElementReadPort`, `ThreeGuideReadPort`, `ThreeHingeReadPort`)
3. 5 `*3DSelector` classes
4. `ThreePresentationSelector`
5. `ThreePresentationController`

Every interface has exactly one implementation. None are mocked in tests. The controller (`ThreePresentationController`, 7 lines) just delegates to the selector with no added logic. The adapter's sub-interfaces each forward one or two methods from `World`.

**Why**: This is the most extreme port-adapter chain in the codebase. Each layer adds indirection but zero behavioral variation or test substitution.

**What to do — Simplify**: Collapse the 5 adapter sub-interfaces into a single concrete `ThreePresentationReadContext` type (not an interface). Merge each ReadPort factory into its selector file. Remove `ThreePresentationController` and call the selector directly. This reduces ~265 lines of pure delegation to ~80 lines of concrete context + selectors.

---

### A02. `CanvasPresentationController` — pure delegation

**What**: `CanvasPresentationController` (10 lines) calls `this.selector.select(readPort, viewport, state)`. No added logic.

**Why**: Indirection without benefit.

**What to do**: Remove the class. Call `CanvasPresentationSelector.select()` directly.

---

### A03. `CanvasVisibilityPolicy` — wraps one function call

**What**: `isCanvasElementVisible(element, visibility)` returns `visibility.isElementVisible(element)`. The `CanvasElementVisibilityPort` interface has one method and one implementor.

**Why**: The real visibility logic is `resolveVisibility` in `domain/world/styleService.ts`. This wrapper adds nothing.

**What to do**: Remove `CanvasVisibilityPolicy.ts`. Call `resolveVisibility` directly where needed, or use the store's visibility state.

---

### A04. `ProjectSessionPersistenceAdapter` — pure forwarding

**What**: Every method just calls `ProjectService.staticMethod(...)`. The adapter exists solely to implement `ProjectSessionPersistencePort`, which is mocked in tests.

**Why**: The interface is justified for test seams. The concrete adapter class is boilerplate.

**What to do**: Keep the port interface for testing. Replace the class with an object literal at the composition root (`{ snapshotCurrentSession: (w, c, n) => ProjectService.serializeCommands(w, c, n), ... }`).

---

### A05. `AutoSaveRuntimeSessionPort` — type alias for another interface

**What**: `AutoSaveRuntimeSessionPort` is literally `SnapshotCapableProjectSessionKernel`. No added meaning.

**What to do**: Use `SnapshotCapableProjectSessionKernel` directly.

---

### A06. `RuntimeSessionSnapshotHandle` / `RuntimeSessionRestoreHandle` — unused base interfaces

**What**: These are defined in `AppShellPorts.ts` but only ever used as bases for the extended versions in `ProjectSessionPersistenceTargets.ts`. No code references the base versions directly.

**What to do**: Merge each base interface into the extended version in `ProjectSessionPersistenceTargets.ts`. Remove the base interfaces from `AppShellPorts.ts`.

---

### A07. 15 anonymous port objects in `RuntimeSession`

**What**: `RuntimeSession` creates anonymous objects implementing `ActivePlanePort`, `SelectionReadPort`, `CommandHistoryPort`, `CanvasViewPort`, `ProcessTreeReadPort`, `ElementsPanelPort`, `ThreePresentationPort`, `ActivePlaneSelectorPort`, `ToolRuntimePort`, `CanvasWorldReadPort`, `ActivePlaneUseCases`, etc. Each anonymous object just delegates back into `RuntimeSession`, `World`, `CommandStack`, or stores.

**Why**: This is an extreme port-and-adapter pattern for internal decomposition. None of these ports are independently substituted in tests — the test seams are at the `RuntimeSession` level or through Pinia stores.

**What to do — Simplify**: Instead of creating 15 anonymous adapter objects, expose `RuntimeSession` methods directly via a narrower facade type. Replace anonymous port objects with direct method references or thin facade interfaces that `RuntimeSession` itself implements. Reduce the total port count to the ones that actually have test alternatives: `DrivePort`, `SchedulerPort`, `LastProjectRepositoryPort`, `ChangeNotifier`, and the Pinia store ports.

---

### A08. `CanvasWorldReadPort` — interface + factory for single impl

**What**: `CanvasWorldReadPort` interface (102 lines) has exactly one factory (`createCanvasWorldReadPort`) that assembles an object from `World`. Never mocked.

**What to do — Simplify**: Replace the interface with a concrete return type from the factory. Call the factory directly where needed. No need for a separate interface when there is one implementation and no test mocking.

---

## 3. Domain Hierarchy Over-Engineering

### H01. `Element3D` — adds nothing beyond `Element`

**What**: `Element3D` extends `Element` but adds zero properties. It only adds `abstract realize3D()`, which could be on `Element` itself. The type guard `isElement3D()` is used once (in its own definition).

**What to do**: Remove `Element3D`. Move `realize3D()` to `Element` as an optional or abstract method. The concrete 3D types (`Plane3D`, `Point3D`, `Line3D` variants) already have `realize3D()`.

---

### H02. `Element2DRealization2D` and `Element3DRealization3D` — empty intermediates

**What**: Both add zero methods or properties beyond `Realization`. They are pure empty intermediate classes between `Realization` and concrete realizations.

**What to do**: Remove both. Have concrete realizations (`Point2DRealization2D`, `Line2DRealization2D`, `Circle2DRealization2D`, `Point3DRealization3D`, `Line3DRealization3D`, `Segment3DRealization3D`, `Plane3DRealization3D`) extend `Realization` directly.

---

### H03. `Realization` abstract class — 1 boolean field and 1 getter

**What**: `Realization` adds `feasible: boolean` and `isFeasible()`. The 7 concrete realizations each store `feasible` in their constructor.

**What to do — Simplify**: Keep the `feasible` field but consider making `Realization` a simple interface or removing the abstract class entirely and letting each concrete realization hold its own `feasible` field. The class hierarchy (abstract Realization → empty Element2DRealization2D/Element3DRealization3D → concrete) gives no runtime or type-safety benefit over a flat structure with a `feasible` field.

---

### H04. `Segment3D` type alias — wraps one class

**What**: `type Segment3D = Segment3DFromProjections`. There is only one implementation.

**What to do**: Use `Segment3DFromProjections` directly. Remove the alias unless a second variant is expected soon.

---

### H05. `Line2DPerpendicularToLine` — intermediate class for one subclass

**What**: Only `Guide2D` extends `Line2DPerpendicularToLine`. The perpendicular-to-line logic could be in `Guide2D` directly.

**What to do**: Merge into `Guide2D`.

---

### H06. `Line3D` abstract class — one abstract method between Element3D and 2 subclasses

**What**: If `Element3D` (H01) is removed, `Line3D` becomes a thin layer. Even with `Element3D` kept, it only adds one abstract method.

**What to do**: Move `realize3D()` to `Element` or `Element2D`'s level. Let `HingeLine` and `Line3DFromProjections` implement it directly.

---

### H07. `Subprocess` duplication — two interfaces that differ by one field

**What**: `frontend/src/domain/processTree/Subprocess.ts` defines a `Subprocess` interface with `defaultStyle?`. `ProcessTree.ts` defines its own internal `Subprocess` that lacks `defaultStyle`.

**Why**: Two types with the same name but different shapes in the same module hierarchy is confusing.

**What to do**: Unify into one canonical `Subprocess` type. If `defaultStyle` is sometimes absent, make it optional in the single type.

---

## 4. Command/Operation Boilerplate

### C01. Near-duplicate `AddIntersectionPoint2DOp` ≡ `AddLineLineIntersectionPoint2DOp`

**What**: Both call `plane.addLineLineIntersection(line1Id, line2Id, world, this.outputs.pointId)`. They differ only in class name, opType string, and output type wrapper (`OperationOutputBag` vs typed `LineLineIntersectionOutput`).

**Why**: Two separate operation classes and two separate registry entries for the same behavior creates persistence ambiguity and maintenance burden.

**What to do**: Remove `AddIntersectionPoint2DOp`. Use `AddLineLineIntersectionPoint2DOp` (or rename it to `AddIntersectionPoint2DOp` for clarity). Update the operation registry.

---

### C02. 2D element creation operations share ~80% boilerplate

**What**: `AddFreePoint2DOp`, `AddLine2DByTwoPointsOp`, `AddLine2DParallelToLineOp`, `AddLine2DPerpendicularToLineOp`, `AddCircle2DByCenterAndPointOp`, `AddSegment2DByPointsOp`, `AddLineLineIntersectionPoint2DOp`, `AddLineCircleIntersectionPoint2DOp`, `AddCircleCircleIntersectionPoint2DOp` all follow the same validate-plane → call-factory-method → store-outputs → serialize pattern. Only the factory method call and parameter names differ.

**What to do — Simplify**: Introduce a parameterized base class or helper that handles the common plane-validation, ID-storage, and serialization logic. Each operation would specify only its factory method reference and parameter schema. This would reduce ~700 lines of near-identical code to ~150 lines of shared logic plus per-operation configuration.

---

### C03. 3D projection operations share ~70% boilerplate

**What**: `Add3DPointOp`, `Add3DLineOp`, `Add3DSegmentOp` duplicate the same two-plane validation, feasibility check, and ID-allocation preamble.

**What to do — Simplify**: Extract a shared `validateProjectionSetup(plane1Id, plane2Id, world)` helper and a shared ID-generation/restore pattern. Each operation keeps its realization-specific logic but delegates the common preamble.

---

### C04. Toggle operations are interchangeable templates

**What**: `ToggleEncapsulationOp` and `ToggleOutputOp` are structurally identical (38 lines each), differing only in which ProcessTree method they call.

**Why**: Low cost (76 total lines) but high similarity.

**What to do — Simplify**: Optionally merge into a single `TogglePropertyOp` parameterized by method name. Given the low line count, this is low priority.

---

### C05. Single-operation factories that add no sequencing logic

**What**: `PointSequenceFactory.createFreePoint()` and `CircleSequenceFactory.createCircleByCenterAndPoint()` each wrap one operation plus one ProcessTree action. `LineSequenceFactory.createTangentToCircleThroughPoint()` and `createTangentToCircleParallelToLine()` call exactly one operation with no ProcessTree action.

**Why**: The factory pattern is justified when it sequences multiple dependent operations (like `HingeLineSequenceFactory`). For single-operation calls, it adds indirection.

**What to do**: Keep the factories for now (they provide a consistent API), but document that single-op factories are thin wrappers. Do not add new single-op factories; instead, call the operation directly.

---

## 5. Tool Boilerplate

### T01. All 15 tools hardcode `completionBehavior = 'stay-active'`

**What**: Every concrete tool repeats `readonly completionBehavior = 'stay-active' as const;`. The `return-to-selection` mode from `toolFamilies.ts` is defined but never used by any tool instance.

**What to do**: Default `completionBehavior` to `'stay-active'` in `ArgumentCollectorTool`. Remove the override from all 15 tool files. Remove the dead `return-to-selection` branch from `handleCompletion()`.

---

### T02. Near-identical tool pairs

**What**:
- `ParallelLineTool` ≡ `PerpendicularLineTool` (differ in 4 string literals)
- `Create3DLineTool` ≡ `Create3DSegmentTool` ≡ `Create3DPlaneTool` (differ in mask, argument names, error strings)

**What to do — Simplify**: For `ParallelLineTool`/`PerpendicularLineTool`, introduce a parameterized `DirectionalLineTool` factory or merge them. For the 3D tools, extract a shared `setValidator` (distinct-plane check) and create tools via a factory function parameterized by mask type and intent name.

---

## 6. Rendering Duplication

### R01. `vec()` helper copy-pasted across 5 files

**What**: The same `const vec = (v: Vec3) => new THREE.Vector3(v.x, v.y, v.z)` helper appears in `HingeSceneAdapter`, `ProjectionPlaneSceneAdapter`, `GuideSceneAdapter`, `ReconstructedElementSceneAdapter`, and `PlanarElementSceneAdapter`.

**What to do**: Extract to a shared `threeUtils.ts` or similar utility.

---

## 7. ProjectionPlane Layer

### P01. `ProjectionPlaneElementStore` — 84 lines of CRUD over 6 Maps

**What**: `ProjectionPlaneElementStore` wraps 6 Maps (points, lines, circles, segments, guides, halfHingeLines) with add/remove/get methods. Only used by `ProjectionPlane`.

**Why**: The store adds an indirection layer that obscures where elements live rather than clarifying it.

**What to do — Simplify**: Inline the Maps into `ProjectionPlane`. The 6 Maps are the natural state of a projection plane; wrapping them in a separate class adds no behavioral benefit. `ProjectionPlane` already manages its own factory methods and would be simpler with direct Map access.

---

### P02. `ProjectionPlane` itself — 1335 lines

**What**: `ProjectionPlane` is a god class combining element storage, element creation (factory methods), realization caching, and context management.

**Why**: Factory methods that create elements and register dependencies are important domain logic. But mixing storage, creation, and caching in one class makes it hard to test and change independently.

**What to do — Long term**: Extract factory methods into a `ProjectionPlaneFactory` or command operations (which is partially done already). Let `ProjectionPlane` become a data-oriented aggregate root. This is a larger refactor and should be done incrementally.

---

## 8. Large Classes Worth Decomposing

### L01. `World` — 1215 lines

**Why it is large**: World is the aggregate root for all domain elements, dependency registration, realization management, and ID allocation. It has already been decomposed to extract notification (RuntimeChangePublisher), ID allocation (WorldIdAllocator), entity construction (WorldEntityFactory, now removed), and dependency ports (DependencyQueryPort/RegistrarPort).

**What to do — Not now but worth tracking**: The remaining responsibilities are element storage (6+ Maps), element creation convenience methods, and realization coordination. A future decomposition could extract element storage into a dedicated `WorldElementRepository`, but this is not a high-priority simplification after the recent remediation.

---

### L02. `ProcessTree` — 527 lines

**Why it is large**: It aggregates nodes, manages nesting, and supports undo/redo operations. Recent remediation already removed notification plumbing.

**What to do**: Accept current size. Merit lies in keeping all tree mutation logic together.

---

## 9. Port Interfaces — Which to Keep

### Keep (genuine test seams or cross-boundary contracts)

- `DrivePort` — external service dependency, genuinely mocked
- `SchedulerPort` — time dependency, genuinely mocked
- `ChangeNotifier` — command replay needs silent notification
- `Pinia store ports` (`SelectionStorePort`, `ToolStorePort`, `ViewStorePort`, `AuthStorePort`) — Vue reactivity boundary, genuinely mocked in component tests
- `ProjectSessionPersistencePort` — serialisation boundary, genuinely mocked
- `DependencyQueryPort` / `DependencyRegistrarPort` — read/write split of mutable graph, prevents broad access
- `LastProjectRepositoryPort` — storage boundary, mocked

### Remove or simplify (single implementation, no test substitution)

- `ActivePlanePort`, `SelectionReadPort`, `CommandHistoryPort` — anonymous objects in RuntimeSession
- `CanvasViewPort`, `ProcessTreeReadPort`, `ElementsPanelPort`, `ThreePresentationPort`, `ActivePlaneSelectorPort` — anonymous objects in RuntimeSession
- `CanvasWorldReadPort` — single factory, no mocks
- All 5 `Three*ReadPort` interfaces — single factories, no mocks
- All 5 `ThreePresentationAdapter` sub-interfaces — single implementation
- `CanvasPresentationController` — pure delegation
- `ThreePresentationController` — pure delegation
- `CanvasVisibilityPolicy` — single-function forwarding
- `RuntimeSessionSnapshotHandle` / `RuntimeSessionRestoreHandle` — unused base interfaces
- `CanvasElementVisibilityPort` — single implementation, single function

---

## 10. Prioritized Simplification Sequence

### Immediate (high impact, low risk)

1. **D01** — Delete `perpendiculars.ts` and `distances.ts`
2. **D02** — Delete `QuickToolUseCases.ts` and its call site
3. **D03** — Delete `Process.ts`
4. **D04** — Delete `ActionGroup.ts` re-export; import directly from ProcessTree
5. **D05** — Delete `DependencyEdge` interface
6. **D06** — Remove all dead store exports
7. **D09** — Delete `IntersectionMask`, `isIntersectionMask`, `SelectionMask.intersection()`
8. **D10** — Delete `SelectionMask.guide()` (if still present)
9. **D11** — Replace `SelectionMask.anyLine()` callers with `line()` and delete `anyLine()`
10. **D12** — Simplify `useHoverHighlight` to exported singleton only
11. **R01** — Extract shared `vec()` helper for Three.js adapters
12. **A03** — Delete `CanvasVisibilityPolicy`
13. **A05** — Remove `AutoSaveRuntimeSessionPort` type alias
14. **A06** — Merge base/extended persistence interfaces

### Short-term (moderate effort, clear benefit)

15. **A02** — Delete `CanvasPresentationController`; call selector directly
16. **A04** — Replace `ProjectSessionPersistenceAdapter` class with object literal
17. **H01** — Remove `Element3D`; move `realize3D()` to `Element`
18. **H02** — Remove `Element2DRealization2D` and `Element3DRealization3D`; extend `Realization` directly
19. **H04** — Remove `Segment3D` type alias; use `Segment3DFromProjections` directly
20. **H07** — Unify `Subprocess` interfaces
21. **C01** — Remove duplicate `AddIntersectionPoint2DOp`
22. **T01** — Default `completionBehavior` to `'stay-active'`; remove dead `return-to-selection` branch
23. **D07** — Remove `activate()`/`deactivate()` from ITool

### Medium-term (larger refactor, high clarity payoff)

24. **A01** — Collapse ThreePresentation adapter chain into concrete context and selectors
25. **A07** — Reduce anonymous port objects in RuntimeSession to direct method references
26. **A08** — Replace `CanvasWorldReadPort` interface with concrete factory return type
27. **C02** — Extract shared 2D element creation boilerplate into parameterized base
28. **C03** — Extract shared 3D projection validation helpers
29. **P01** — Inline `ProjectionPlaneElementStore` into `ProjectionPlane`
30. **H01/H06** — Flatten `Line3D` into direct `realize3D()` implementation on subclasses
31. **T02** — Parameterize near-duplicate tools

### Long-term (architectural, track but do not rush)

32. **P02** — Extract ProjectionPlane factory methods into a dedicated factory or operations
33. **L01** — Consider extracting World element storage into a dedicated repository
34. **A07 full** — Revisit the entire port-and-adapter pattern in Application Shell; replace most anonymous port factories with direct RuntimeSession method references

---

## Testing Impact

Each "Remove" or "Delete" item should have tests updated or removed in the same commit. Architecture boundary tests in `importBoundaries.spec.ts` and `worldBoundary.spec.ts` should be audited after each batch to ensure they still guard the real boundaries (no outer imports, no domain side effects) rather than deleted helper/class names.

For port removals (A01–A08): when collapsing a port interface, its usage sites (selectors, controllers, RuntimeSession) need direct dependency on the concrete factory return type instead. Tests that currently mock the port can either mock at a higher level (RuntimeSession) or use real World instances.