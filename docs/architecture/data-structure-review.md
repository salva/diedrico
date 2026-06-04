# Data Structure Review - diedrico

Date: 2026-06-04

Scope: all data structures (interfaces, types, classes, enums) across `frontend/src/domain`, `frontend/src/commands`, `frontend/src/application`, `frontend/src/stores`, `frontend/src/rendering`, and `frontend/src/components`.

This document incorporates a current-code review against the architecture overview and baseline audit. Resolved or obsolete findings have been removed or reframed so the remaining items describe active execution value rather than historical refactor notes.

## 1. Element Hierarchy: Inconsistent Discrimination Strategy

**Problem:** The codebase uses *three* different discrimination mechanisms for element types simultaneously:

| Mechanism | Used by |
|---|---|
| `instanceof` checks | Most element-class branching paths (`World`, presentation selectors/read models, construction use cases, `SelectionMask`) |
| `readonly type` field | `Line2DPerpendicularToLine`, `Line2DTangent*`, `SiblingGuide2D` |
| `readonly kind` field | `Point3DByCoordinates`, `Point3DFromProjections`, `Line3DFromProjections`, `Segment3DFromProjections`, `Plane3DFromTraces` |

None of these are applied consistently. Most `Line2D` subclasses have no `type` field at all; most `Element3D` subclasses have no `kind` field.

**Recommendation:** Pick one strategy and apply it uniformly. A discriminated union with a `kind` string literal is the most TypeScript-idiomatic approach and would enable exhaustive `switch` checks. If the team chooses `instanceof` as the canonical strategy, remove the vestigial `type`/`kind` fields or document them as serialization-only fields. The current mix forces readers to know *which* mechanism each class uses.

---

## 2. `name` vs `label` Duplication

**Problem:** `Element` defines `label?: string`. But `ProjectionPlane` declares its own `name: string` field (and passes `name` to `super(id, name)` setting `Element.label`). `Point3DByCoordinates` also has its own `name: string` separate from `Element.label`. This means the same semantic concept (human-readable identifier) is stored in two different fields on the same object.

**Recommendation:** Do not delete `name` blindly. First audit all `.name` and `.label` consumers and decide whether they represent the same semantic concept. If they do, eliminate the redundant `name` fields and use `Element.label` consistently. If they do not, document the distinction explicitly, for example: `name` as stable user-facing plane name and `label` as generic element label.

---

## 3. `Element3D` is a Lightweight Seam With Mostly Contract Value

**Problem:** `Element3D extends Element` adds zero properties. Its only additions are `abstract realize3D()` and `abstract getDependencies()` - but `getDependencies()` is already declared on `Element`. It currently acts as a lightweight seam between planar-only elements and reconstructable 3D elements.

This seam is defensible in a geometry app because 2D definitions and 3D reconstruction are different domains. The current implementation now uses a narrow `Element3DRealizationContext`, so the seam has real contract value even if it has no extra stored state.

**Recommendation:** Keep `Element3D` as the 3D reconstruction contract. Its comments now describe the current 3D element set and the realization-context seam. Consider adding a uniform `kind` discriminator only if exhaustive handling becomes valuable.

---

## 4. Realization Caching Still Has Two Owners, But Invalidation Facade Exists

**Problem:** Realization caches still live in:
1. `RealizationStore` (owned by `World`) - 3D realizations + projection-plane realizations
2. `ProjectionPlaneElementStore` (owned by each `ProjectionPlane`) - 2D element realizations

The previous direct coupling has been reduced. `ProjectionPlane` and `ProjectionPlaneElementStore` now expose `clearRealizationCaches(id)`, and `World.invalidateRealization()` uses that facade instead of reaching into plane-local cache details.

The remaining issue is ownership clarity: adding a new cacheable entity can still require changes in multiple places, and readers must still know which cache owner handles which realization type.

**Recommendation:** Keep the facade. If cache invalidation remains easy to reason about, no immediate refactor is needed. If more realization caches are added, prefer centralizing them into `RealizationStore` (or a dedicated `RealizationCache`) rather than adding another owner.

---

## 5. `ViewportTransform` Duplication Is Resolved

**Status:** Resolved. `ViewportTransform` is now declared once in `domain/presentation/Paper.ts` and imported/re-exported by consumers instead of being redeclared.

**Remaining concern:** `CanvasViewportModel` still embeds the same transform fields plus dimensions, which is acceptable as a richer viewport state model. Avoid reintroducing separate `ViewportTransform` declarations in application or rendering modules.

---

## 6. Style Resolution Has Moved Out of `domain/world`

**Status:** Partially resolved. `styleService.ts` now lives in `application/canvasPresentation/`, which is the right layer for process-tree-driven presentation/style resolution.

**Remaining concern:** The process tree/domain model still carries visibility/style fields such as `defaultStyle`, `showIntermediates`, `isOutput`, and `isAuxiliary`. That may be intentional construction-history display state, but it should be documented as such. Keep presentation resolution in `application/canvasPresentation`; do not move it back into `domain/world`.

---

## 7. Dependency Registration is Split Between Two Callers

**Problem:** When `ProjectionPlane.addPoint/addLine/addCircle` adds an element, `ProjectionPlaneElementStore` calls `context.getDependencyRegistrar().registerNode()`. When `World.add3DPoint/add3DLine/etc.` adds an element, `World` calls `this.dependencyService.registerNode()` directly. This is not a correctness bug by itself: `World` is the dependency-service owner and `ProjectionPlaneElementStore` uses a port. The problem is that registration responsibility is distributed across storage classes instead of being clearly owned by one aggregate boundary.

**Recommendation:** Unify dependency registration behind one pattern. The cleanest approach is for `World` to remain the sole dependency-graph owner and for projection-plane storage to report element additions through a narrow mutation context. Avoid adding new direct callers of the full `DependencyService`; prefer `DependencyRegistrarPort` / `DependencyQueryPort` surfaces.

---

## 8. `Segment2D` Type Alias Adds Confusion

**Problem:** `type Segment2D = Segment2DByPoints`. There is only one segment implementation. The alias forces readers to understand two names for the same type.

This is a low-risk issue. The alias can also be read as a self-documenting marker that "segments are segments," even though they are currently implemented as bounded `Line2D` objects and stored in the same line map as infinite lines.

**Recommendation:** If the team values minimal naming, rename `Segment2DByPoints` to `Segment2D` and delete the alias. If readability is more important, keep the alias and treat it as intentional domain vocabulary. This should not be prioritized ahead of boundary and persistence issues.

---

## 9. `isPointOnSegment()` is Copy-Pasted

**Problem:** The same ~20-line `isPointOnSegment()` method is identically implemented in both `Point2DLineLineIntersection` and `Point2DLineCircleIntersection` (`Point.ts`).

**Recommendation:** Extract to a shared utility in `domain/calculations/` and call it from both classes only if this remains copy-pasted as the calculation set grows. This is a true duplication, but it is small and self-contained.

---

## 10. `HingeLine` Name Collision Is Resolved

**Status:** Resolved. The stale `domain/viewState/HingeLine.ts` file has been deleted. `domain/world/HingeLine.ts` is now the only active `HingeLine` domain type.

**Remaining concern:** If a future view-state hinge model is needed, introduce it under a non-colliding name such as `HingeLineViewModel`.

---

## 11. ProcessTree Action Factories are Mostly Boilerplate

**Problem:** Most files under `processTree/actions/` are thin wrappers around `createAction(elementId, descriptionString)`. Some grouped files, such as initialization and 3D element action helpers, are more substantial, so a blanket deletion recommendation would be too broad.

**Recommendation:** Delete only the trivial one-function wrappers and call `createAction()` directly from the sequence factories/use cases that currently import them. Keep grouped helpers if they encode meaningful shared construction-history vocabulary.

---

## 12. Realization Context Adoption is Incomplete in Comments and Some Signatures

**Problem:** The base `Element2D.realize2D()` signature has been fixed: it now accepts `ProjectionElementRealizationContext`, and `Element2D.ts` no longer imports `World`. However, several implementations and comments still name the parameter `world`, and `ProjectionPlane`/`World` comments still describe passing a `World` instance. Projection-plane realization also still relies on broad context objects, and `World.getProjectionPlane3DRealization()` still calls `plane.realize3D(this)`.

**Recommendation:** Treat the main `Element2D` to `World` cycle as resolved. Clean up stale comments/parameter names and continue narrowing projection-plane and 3D realization contexts where practical. Do not prioritize this as a high-risk circularity item anymore.

---

## 13. Operation Serialization is Registry-Based but Still Loosely Shaped

**Problem:** The persistence model has improved since the baseline audit. `ProjectService` now serializes `CommandSnapshot`s, restores through `OperationRegistry`, validates current schema version, and no longer contains a monolithic operation reconstruction switch or private command-stack casts. `OperationDescriptor<TType, TPayload>` is generic.

The remaining weakness is that many operation classes still serialize ad-hoc flat objects, several implement `IOperation<OperationDescriptor, ...>` instead of operation-specific descriptor types, `OperationOutputBag` still uses `Record<string, any>`, and registry restorers parse generic `JsonObject`s with small helper functions. Compatibility is therefore enforced at runtime rather than exhaustively by TypeScript.

`AddFreePoint2D` and `UpdateFreePoint2DPosition` now have explicit descriptor/output interfaces, which is the desired direction.

**Recommendation:** Continue defining explicit descriptor/output interfaces for high-value operations, then register restorers against those typed descriptors. Prefer one descriptor shape (`{ opType, payload }` or flat fields) consistently. Keep the registry; the issue is descriptor precision, not the restoration architecture.

---

## 14. Canvas Render and Query Kind Systems Need an Explicit Contract

**Problem:** `CanvasElementKind` defines `'projected-3d-point' | 'projected-3d-line' | 'projected-3d-segment' | 'arc'` but `CanvasPlaneLineItem.kind` does not include those - it uses `'finite-segment' | 'guide' | 'sibling-guide' | 'half-hinge-line' | 'infinite-line'`. There are *two different kind systems* for canvas items: one for render items, one for plane items. Projected 3D elements bypass the plane-item system entirely.

**Recommendation:** Do not force a single kind union unless it simplifies selectors. Instead, document the current contract: `CanvasPlaneItem.kind` is an intermediate plane-derived selector model, `CanvasRenderItem.kind` is a render/read-model category, and `CanvasQueryItem.kind` intentionally excludes arcs and projected 3D items. Add selector tests to lock the intended mapping.

There is also an unenforced invariant: `CanvasRenderItem.kind` and `CanvasRenderItem.primitive.type` can disagree at compile time. For example, TypeScript does not prevent `kind: 'point'` from being paired with a line primitive. A stricter discriminated union could encode the valid `kind`/`primitive` combinations.

---

## 15. `DescriptorRegistry` Uses Global Mutable Static State

**Problem:** `DescriptorRegistry` stores its mapping in a `static Map<Function, ElementDescriptor>`. Registration happens at app startup (`main.ts`). This means:
- Tests must either register descriptors or skip descriptor-dependent features
- The mapping is invisible from the type system
- The `Function` key (constructor reference) is fragile under code splitting or minification

This is not currently known to be causing failures. It is a testability and robustness smell rather than an urgent correctness bug.

**Recommendation:** Convert to an instance-based registry, injected at `World` or `RuntimeSession` creation, or use stable string keys instead of constructor references. This makes dependencies explicit and testable.

---

## 16. Obvious Non-Null Assertions on Non-Optional Element IDs Are Resolved

**Status:** Resolved for the reviewed 3D/domain paths. The obvious `id!` assertions on non-optional `Element.id` have been removed from those areas.

**Remaining concern:** A few `id!` uses remain outside that narrow issue, such as startup/factory utilities and external API result handling. Do not treat all of them as equivalent: Google Drive IDs and other external response fields may genuinely be optional at the type level, while projection-plane IDs should be audited only if they continue to look like guaranteed `Element.id` values.

---

## 17. `ProjectionPlane` is Still a Domain God Class

**Problem:** `ProjectionPlane` combines several responsibilities:
- Projection-plane identity and metadata
- 2D element collection and lookup
- 2D element creation helpers
- Realization caching
- Fixed-plane and auxiliary-plane behavior
- Dependency registration hooks through mutation contexts

This makes the projection-plane data structure hard to reason about because it is both an entity, a collection, a factory, and part of the realization cache boundary.

**Recommendation:** Split by responsibility without introducing an abstract factory layer. The current `ProjectionPlaneElementStore` extraction is a good direction. Continue moving storage/caching details into dedicated classes and keep `ProjectionPlane` focused on plane identity, dependencies, and realization behavior.

---

## 18. ProcessTree Still Mixes Write Model With UI Visibility Flags

**Problem:** The earlier deprecated `addAction()` and process-tree dependency-query paths are no longer present. `styleService.ts` has moved to `application/canvasPresentation/`, so the style resolver itself is no longer a domain-layer violation. The remaining data-structure concern is that `Subprocess` and `ActionGroup` still contain UI/presentation visibility flags such as `showIntermediates`, `isOutput`, `isAuxiliary`, and `defaultStyle`.

**Recommendation:** Keep command-driven process-tree writes as the domain construction-history model, but decide whether visibility/style flags belong in the process tree or in an application read model. If they stay in the process tree, document them as construction-history display semantics rather than geometric dependencies.

---

## 19. Render and Query Models Duplicate Domain-Derived Geometry Without a Shared Contract

**Problem:** `CanvasPresentationModel` contains both `renderItems` and `queryItems`. This separation is conceptually good: rendering and hit-testing need different shapes. However, both are derived from the same domain elements and there is no explicit contract that guarantees they stay aligned.

**Recommendation:** Keep the separation, but document the invariant that every selectable render item should have a corresponding query item unless explicitly marked non-selectable/projected/decorative. Consider adding tests around selector output rather than merging the models.

---

## Priority Summary

| Priority | Issue | Impact |
|---|---|---|
| **High** | #13 Loosely shaped operation descriptors | Persistence correctness |
| **High** | #17 ProjectionPlane god class | Data ownership and readability |
| **Medium** | #1 Inconsistent discrimination | Maintenance burden, type safety |
| **Medium** | #2 name vs label duplication | Confusion, subtle bugs |
| **Medium** | #4 Realization caching ownership | Ownership clarity |
| **Medium** | #6 Process-tree style state | Boundary ambiguity |
| **Medium** | #7 Split dependency registration | Correctness risk |
| **Medium** | #12 Incomplete realization-context cleanup | Documentation and context-boundary drift |
| **Medium** | #14 Dual canvas-kind systems | Confusion |
| **Medium** | #18 ProcessTree visibility/style flags | Boundary ambiguity |
| **Medium** | #19 Render/query model alignment | Selector invariant risk |
| **Low** | #3 Element3D lightweight seam | Value should be documented |
| **Low** | #5 ViewportTransform duplication | Resolved; guard against regression |
| **Low** | #8 Segment2D alias | Cosmetic |
| **Low** | #9 Copy-pasted isPointOnSegment | DRY violation |
| **Low** | #10 HingeLine name collision | Resolved; guard against regression |
| **Low** | #11 Action factory boilerplate | Noise |
| **Low** | #15 Global DescriptorRegistry | Testability |
| **Low** | #16 Non-null ID assertions | Resolved in 3D/domain paths; watch remaining contextual uses |

The high-priority items (#13, #17) are structural: they affect persistence correctness and the ability to reason about projection-plane ownership. The medium items are consistency improvements that would reduce drift, stale ownership paths, boundary ambiguity, and selector mistakes. The low items are cleanup or resolved-regression guards that should not lead the refactor sequence.
