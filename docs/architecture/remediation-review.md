# Architecture Remediation Review

Date: 2026-06-03

Scope reviewed:

- `frontend/src/domain`, especially `world`, `processTree`, dependency ports, ID allocation, and recent factory extraction.
- `frontend/src/application/appShell`, `frontend/src/application/canvas`, `frontend/src/application/threePresentation`.
- `frontend/src/components`, `frontend/src/composables`, `frontend/src/stores`, and current architecture tests.
- Architecture docs under `docs/architecture`.

Review criteria:

- Prefer simple, clean architecture and code over preserving old APIs.
- Remove code retained only for backward compatibility unless there is an explicit product requirement.
- Remove bridge/adaptor layers that do not reduce coupling or clarify ownership.
- Avoid replacing one god object with many thin wrappers that only satisfy tests.
- Keep domain deterministic, side-effect-light, and free of UI/runtime/browser concerns.

## Executive Summary

The recent remediation materially improved the architecture: `World` no longer owns runtime notification state, `ProcessTree` no longer owns notification state, dependency access has query/registrar surfaces, domain console side effects are gone, and `SvgCanvas` is much thinner than before.

Further cleanup is still warranted. The strongest theme is that some recent seams are useful, but a few are now thin adapters or test-enforced implementation details rather than durable architecture. There are also leftover explicit compatibility shims in coordinate transforms, selection masks, component props, and event bridges. These should be removed because the project explicitly does not value backward compatibility unless product requirements say otherwise.

Highest-priority cleanup candidates:

1. Remove explicit backward-compatibility code in coordinate transforms and selection masks.
2. Delete dead dependency debug/legacy code (`DependencyGraph`, `dumpDependencyGraph`, likely `traceInvalidation`).
3. Reconsider thin recent bridges (`WorldEntityFactory`, `ProcessTreeIdAllocator`) and over-specific architecture tests that force them to exist.
4. Remove stale UI event bridges (`update-active-plane`, highlight chain) and the leftover viewport composable path.
5. Fix `World.clear()` correctness: it does not clear all world-owned 3D storage/counters/labels.

## What Is Working Well

- Runtime notification ownership is clearer: components subscribe via runtime ports rather than domain `World` or `ProcessTree` notification APIs.
- `ProcessTree` as authoritative construction-history state is a sound decision; presentation description logic now lives in the application read model rather than in `Action.ts`.
- Dependency graph ownership is clearer than before: `DependencyQueryPort` and `DependencyRegistrarPort` are meaningful surfaces.
- Domain `console.*` side effects are now completely removed and guarded.
- `World` storage responsibilities are more explicit, and dependency registration remains close to storage mutation, which is correct for current mutable graph semantics.

## Findings

### F01. Coordinate Transform Keeps Test-Only Backward Compatibility

Severity: High

Evidence:

- [`frontend/src/domain/calculations/CoordinateTransform.ts#L44-L69`](../../frontend/src/domain/calculations/CoordinateTransform.ts#L44-L69)
- [`frontend/src/domain/calculations/CoordinateTransform.ts#L94-L114`](../../frontend/src/domain/calculations/CoordinateTransform.ts#L94-L114)

`planeToCanvas` and `canvasToPlane` still accept string plane names explicitly “for backward compatibility with tests” and “FOR TESTS ONLY”. This is exactly the kind of compatibility branch the remediation rules say should be removed. It also widens a domain API that should be matrix-based and independent of plane labels.

Recommendation:

- Remove the string overloads and branches.
- Update or delete tests that still pass plane names.
- Keep the transform API matrix-only.

Preferred fix shape:

- Change the third parameter type to `{ elements: number[] } | Float32Array | number[]`.
- Delete `canvasOriginX` / `canvasOriginY` defaults if they are only used by the string branch.
- Let tests build explicit matrices rather than using legacy plane-name behavior.

### F02. SelectionMask Retains Deprecated And Redundant Mask Concepts

Severity: High

Evidence:

- [`frontend/src/types/SelectionMask.ts#L119-L126`](../../frontend/src/types/SelectionMask.ts#L119-L126)
- [`frontend/src/types/SelectionMask.ts#L151-L158`](../../frontend/src/types/SelectionMask.ts#L151-L158)
- [`frontend/src/types/SelectionMask.ts#L258-L265`](../../frontend/src/types/SelectionMask.ts#L258-L265)

`SelectionMask.guide()` is deprecated and returns `line()`. `HierarchyMask` is explicitly “kept for backward compatibility” even though comments say it is largely redundant with `TypeMask`. `SelectionMask.anyLine()` still depends on `HierarchyMask`.

Recommendation:

- Delete `SelectionMask.guide()`.
- Replace `SelectionMask.anyLine()` with a current `TypeMask('line')` or a clear union of current exact masks, depending on intended behavior.
- Delete `HierarchyMask` and `isHierarchyMask` if no longer needed.
- Remove the hierarchy branch in `CanvasInteractionQuery` if it exists only for `HierarchyMask`.

Why this matters:

- It removes old hierarchy/type duality.
- It makes selection semantics easier to understand: masks either use current exact type logic or current `instanceof` logic, not both.

### F03. Legacy Generic Intersection Point Type Remains

Severity: Medium

Evidence:

- [`frontend/src/domain/world/Point.ts#L26-L33`](../../frontend/src/domain/world/Point.ts#L26-L33)

`POINT_2D_TYPE.INTERSECTION` is marked “kept temporarily for backward compatibility” while the current model has specific `LINE_LINE_INTERSECTION`, `LINE_CIRCLE_INTERSECTION`, `CIRCLE_CIRCLE_INTERSECTION`, and `SIBLING_INTERSECTION` types.

Recommendation:

- Search for `POINT_2D_TYPE.INTERSECTION` and string `'intersection'` usage.
- Remove the generic type if no current product behavior needs it.
- If a generic UI bucket is still needed, derive it in presentation code rather than preserving a legacy domain variant.

### F04. `World.clear()` Does Not Clear All World-Owned State

Severity: High

Evidence:

- [`frontend/src/domain/world/World.ts#L136-L142`](../../frontend/src/domain/world/World.ts#L136-L142)
- [`frontend/src/domain/world/World.ts#L170-L183`](../../frontend/src/domain/world/World.ts#L170-L183)

`World.clear()` clears projection planes, hinge lines, 3D planes, realization cache projection-plane state, ID allocator, `ProcessTree`, and `DependencyService`. It does not clear:

- `points3D`
- `lines3D`
- `segments3D`
- 3D element counters (`point3DCounter`, `line3DCounter`, `segment3DCounter`, `plane3DUserCounter`)
- `labelGenerator`
- likely all realization caches, depending on `RealizationStore.clearProjectionPlanes()` semantics

This is a correctness issue, not just cleanup. Project reset/load can leave stale 3D entities or drifted labels/IDs.

Recommendation:

- Add focused tests for `World.clear()` covering 3D points, lines, segments, planes, counters, labels, dependencies, and realizations.
- Clear all world-owned maps and reset all counters/generators.
- Prefer a single `RealizationStore.clear()` if available rather than partial cache clearing.

### F05. Public `getDependencyService()` Leaks The Full Concrete Service

Severity: Medium

Evidence:

- [`frontend/src/domain/world/World.ts#L763-L776`](../../frontend/src/domain/world/World.ts#L763-L776)

Production code now uses `getDependencyQuery()` and `getDependencyRegistrar()` for narrow access. The full `getDependencyService()` appears unnecessary for production and weakens the boundary that was just introduced.

Recommendation:

- Remove public `getDependencyService()`.
- Update tests to use `getDependencyRegistrar()` / `getDependencyQuery()`.
- If full access is genuinely needed internally, keep it private or add narrow internal methods.

This is a good candidate for immediate cleanup because it validates that the new dependency ports are actually the canonical surface.

### F06. Dead Or Legacy Dependency Graph Code Remains

Severity: Medium

Evidence:

- [`frontend/src/domain/world/DependencyService.ts#L348-L406`](../../frontend/src/domain/world/DependencyService.ts#L348-L406)
- [`frontend/src/domain/world/DependencyGraph.ts#L12`](../../frontend/src/domain/world/DependencyGraph.ts#L12)

`DependencyService.traceInvalidation()` appears unused. `dumpDependencyGraph()` was originally a console debug method; after domain console cleanup it computes values and discards them with `void`. `DependencyGraph.ts` appears unused and overlaps with `DependencyService` conceptually.

Recommendation:

- Delete `dumpDependencyGraph()`.
- Delete `traceInvalidation()` unless a current caller or test requires it.
- Delete `DependencyGraph.ts` if no imports exist.
- Add an architecture/dead-code check only if this pattern keeps recurring; otherwise direct deletion is enough.

### F07. Duplicate Dependency Registrar Interfaces

Severity: Low

Evidence:

- [`frontend/src/domain/world/DependencyPorts.ts#L15-L18`](../../frontend/src/domain/world/DependencyPorts.ts#L15-L18)
- [`frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts#L54-L57`](../../frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts#L54-L57)

`DependencyRegistrarPort` and `ProjectionPlaneDependencyRegistrar` are structurally identical. The duplication is small, but it is exactly the kind of bridge/interface clutter that accumulates during staged remediation.

Recommendation:

- Replace `ProjectionPlaneDependencyRegistrar` with `DependencyRegistrarPort`.
- Keep the projection-plane context narrow by importing the shared type, not by duplicating it.

### F08. `WorldEntityFactory` Is A Thin Bridge That May Not Be Worth Keeping

Severity: Medium

Evidence:

- [`frontend/src/domain/world/WorldEntityFactory.ts#L7-L42`](../../frontend/src/domain/world/WorldEntityFactory.ts#L7-L42)
- [`frontend/src/domain/world/World.ts#L281-L288`](../../frontend/src/domain/world/World.ts#L281-L288)
- [`frontend/src/domain/world/World.ts#L310-L331`](../../frontend/src/domain/world/World.ts#L310-L331)
- [`frontend/src/domain/world/World.ts#L348-L366`](../../frontend/src/domain/world/World.ts#L348-L366)

`WorldEntityFactory` currently wraps three constructors and is used only by `World`. It does not hide cross-layer dependencies, does not compose multiple collaborators, and does not have reuse pressure. It may be a bridge introduced to make `World` look smaller rather than to clarify a real responsibility.

Recommendation:

- Reconsider this extraction before building on it.
- If the factory remains, it should own meaningful construction policy, not only constructor forwarding.
- If no such policy exists, inline the constructors back into `World` or move construction to static/named constructors on the entities.
- Replace the current architecture guard with a simpler guard against outer-layer imports or unrelated responsibilities; do not force `WorldEntityFactory` by name.

### F09. Architecture Tests Are Overfitted To Specific Helper Classes

Severity: Medium

Evidence:

- [`frontend/tests/unit/architecture/worldBoundary.spec.ts#L92-L123`](../../frontend/tests/unit/architecture/worldBoundary.spec.ts#L92-L123)

The tests require `new ProcessTreeIdAllocator()`, specific `WorldEntityFactory` function names, and exact implementation choices. This risks preserving adapter/bridge code even if later review determines those helpers are unnecessary.

Recommendation:

- Keep tests that guard the real boundaries:
  - no notification plumbing in domain roots
  - no domain console side effects
  - no broad dependency-service method use outside `World`
  - no outer-layer imports in domain
- Avoid tests that require specific helper class/function names unless those helpers are architectural contracts.

### F10. `ProcessTreeIdAllocator` Is A Thin Wrapper Around Nondeterminism

Severity: Medium

Evidence:

- [`frontend/src/domain/processTree/ProcessTreeIdAllocator.ts#L1-L5`](../../frontend/src/domain/processTree/ProcessTreeIdAllocator.ts#L1-L5)
- [`frontend/src/domain/processTree/ProcessTree.ts#L46-L49`](../../frontend/src/domain/processTree/ProcessTree.ts#L46-L49)

`ProcessTreeIdAllocator` removed `Date.now()` and `Math.random()` from `ProcessTree.ts`, but it did not fix the underlying design concern: process-tree domain IDs are still nondeterministic. It is currently a thin bridge with no deterministic state, restore support, or testability benefit.

Recommendation:

- If process-tree IDs must be deterministic/replayable, replace it with a counter allocator that can be restored or included in persistence.
- If IDs only need local uniqueness and are not persisted as stable replay artifacts, consider whether caller-provided IDs are sufficient and remove auto-random generation.
- Avoid keeping a wrapper just to satisfy an architecture test.

### F11. `useViewport` Appears To Be A Leftover Pan/Zoom Bridge

Severity: High

Evidence:

- [`frontend/src/components/workspace/SvgCanvas.vue#L164-L167`](../../frontend/src/components/workspace/SvgCanvas.vue#L164-L167)
- [`frontend/src/components/workspace/SvgCanvas.vue#L206-L225`](../../frontend/src/components/workspace/SvgCanvas.vue#L206-L225)
- [`frontend/src/components/workspace/SvgCanvas.vue#L594-L600`](../../frontend/src/components/workspace/SvgCanvas.vue#L594-L600)
- [`frontend/src/composables/useViewport.ts#L21-L167`](../../frontend/src/composables/useViewport.ts#L21-L167)

`SvgCanvas` instantiates `useViewport`, while `CanvasInteractionController` also owns viewport pan/zoom through the viewport port. The composable registers mouse, wheel, keyboard, and window listeners against the same interaction surface. In `SvgCanvas`, it appears to be used only to inspect `isPanning` during global mouse-up.

This is likely a compatibility/leftover interaction path and may conflict with the controller-owned viewport logic.

Recommendation:

- Delete `useViewport` from `SvgCanvas`.
- Move the `ignoreNextClick` behavior fully into `CanvasInteractionController.endViewportPan()` or a controller result object.
- Delete `useViewport.ts` if no other current callers remain.

### F12. Dead `update-active-plane` Event Bridge

Severity: Medium

Evidence:

- [`frontend/src/components/workspace/SvgCanvas.vue#L172-L175`](../../frontend/src/components/workspace/SvgCanvas.vue#L172-L175)

`SvgCanvas` declares an `update-active-plane` event, and the app/runtime path still has active-plane update plumbing, but the canvas no longer appears to emit it. Active-plane state is now runtime/selector driven.

Recommendation:

- Remove the event from `SvgCanvas`.
- Remove corresponding `App.vue` wiring and any runtime action used only by that dead event.
- Keep active-plane updates through the explicit active-plane selector/control path.

### F13. Highlight Event Chain Is A No-Op Bridge

Severity: Medium

Evidence:

- [`frontend/src/components/panels/ProcessTreeNode.vue#L202-L208`](../../frontend/src/components/panels/ProcessTreeNode.vue#L202-L208)
- [`frontend/src/components/panels/ProcessTreeNode.vue#L337-L360`](../../frontend/src/components/panels/ProcessTreeNode.vue#L337-L360)
- [`frontend/src/App.vue#L191-L196`](../../frontend/src/App.vue#L191-L196)
- [`frontend/src/components/panels/ElementTypeGroup.vue#L63-L69`](../../frontend/src/components/panels/ElementTypeGroup.vue#L63-L69)

Process tree and panel components emit highlight events, but `App.vue` discards the values and does nothing. `ElementTypeGroup` also has mouse handlers that only contain TODO comments. This is a stale event bridge.

Recommendation:

- Delete the highlight/clear-highlight event chain if hover/highlight is handled elsewhere.
- If highlight is still a product feature, route it through the existing hover/highlight runtime or a real application port rather than no-op parent events.
- Remove TODO-only mouse handlers.

### F14. `ActionsPanel` Has Redundant Manual Refresh State

Severity: Medium

Evidence:

- [`frontend/src/components/panels/ActionsPanel.vue#L79-L80`](../../frontend/src/components/panels/ActionsPanel.vue#L79-L80)
- [`frontend/src/components/panels/ActionsPanel.vue#L95-L118`](../../frontend/src/components/panels/ActionsPanel.vue#L95-L118)
- [`frontend/src/components/panels/ActionsPanel.vue#L158-L195`](../../frontend/src/components/panels/ActionsPanel.vue#L158-L195)

`lastNodeCount` is assigned but not read after the previous auto-scroll cleanup. `treeVersion` is just a computed wrapper around `stackVersion`. `stackVersion` is incremented both on runtime subscription and immediately after process-history intents. If command/runtime notifications are reliable, the manual increments after local intents are redundant; if they are needed, the notification contract is incomplete.

Recommendation:

- Delete `lastNodeCount`.
- Remove `treeVersion` if child reactivity works through updated read model refs.
- Remove `refreshAfterIntent()` if runtime command notifications cover these changes.
- If a manual force counter remains necessary, centralize it as part of a small runtime-read-model composable rather than local ad-hoc state.

### F15. Repeated Subscription-To-Ref Bridges Across Components

Severity: Low

Evidence:

- `ActionsPanel.vue`, `ElementsPanel.vue`, `PlaneSelector.vue`, `SvgCanvas.vue`, and `ThreeView.vue` use local counters/refs to bridge imperative `subscribeToChanges` ports into Vue reactivity.

This is not wrong, but the pattern is duplicated. The risk is each component inventing slightly different refresh semantics.

Recommendation:

- Consider a tiny composable such as `useRuntimeReadModel(port, readFn)` or `useRuntimeVersion(port)` once the remaining direct-store cleanup is done.
- Do not introduce this prematurely if it only moves two lines around; wait until removing manual counters in `ActionsPanel` and `Toolbar` first.

### F16. `InputService` Is A Thin Leftover Adapter

Severity: Medium

Evidence:

- [`frontend/src/application/canvas/CanvasCoordinateConverter.ts#L1-L34`](../../frontend/src/application/canvas/CanvasCoordinateConverter.ts#L1-L34)
- `frontend/src/application/canvas/InputService.ts`

`CanvasCoordinateConverter` creates a singleton `InputService` only to call `canvasToPlaneCoordinates`. The converter already owns `screenToCanvasPoint`; keeping a service class for one conversion path looks like a leftover adapter from the services cleanup.

Recommendation:

- Collapse `InputService.canvasToPlaneCoordinates` into a pure function in `CanvasCoordinateConverter`.
- Delete `InputService.ts` and update tests to exercise the pure function.

### F17. Broad `ThreePresentationAdapter` Looks Like A Raw-World Facade

Severity: Medium

Evidence:

- [`frontend/src/application/threePresentation/ThreePresentationAdapter.ts#L10-L43`](../../frontend/src/application/threePresentation/ThreePresentationAdapter.ts#L10-L43)

`ThreePresentationAdapter` wraps `World` and re-exposes many raw getters. This may be a transitional facade rather than a narrow presentation boundary. It makes the adapter look more like a renamed `World` subset than a use-case-specific read model.

Recommendation:

- Review each three-presentation selector/read-port builder and give it only the minimal queries it needs.
- Collapse the adapter if it is only pass-through.
- Prefer selectors that consume `ThreeRealizationContext` plus a small object list API over a broad domain facade.

### F18. Deprecated Component Prop Remains

Severity: Low

Evidence:

- [`frontend/src/components/panels/ElementTypeGroup.vue#L45-L49`](../../frontend/src/components/panels/ElementTypeGroup.vue#L45-L49)

`selectedId` is explicitly marked deprecated and the component uses `selectionStore` instead.

Recommendation:

- Remove `selectedId` from props.
- Remove any caller that still passes it.

### F19. Stale Architecture Docs Still Mention Old/Temporary States

Severity: Low

Evidence:

- `docs/architecture/rendering.md` appears to reference older three-presentation names.
- `docs/architecture/remediation-plan.md` still contains historical workstream text that can be mistaken for current work even though the top status table is current.

Recommendation:

- Keep the historical workstreams only if clearly labelled as provenance.
- Prefer a short current-state architecture doc plus this findings file over a long plan with completed/incomplete historical steps interleaved.

## Recommended Cleanup Order

### Batch 1: Remove Explicit Compatibility Shims

1. Remove string plane-name overloads from coordinate transforms.
2. Remove deprecated `SelectionMask.guide()` and `HierarchyMask`.
3. Remove generic `POINT_2D_TYPE.INTERSECTION` if no real usage remains.
4. Remove deprecated `ElementTypeGroup.selectedId`.

Validation:

- `npm run build --workspace=frontend`
- `npm run test:architecture --workspace=frontend`
- Focused tests for coordinate transforms and selection masks.

### Batch 2: Delete Dead Domain/Dependency Code

1. Remove `DependencyService.dumpDependencyGraph()`.
2. Remove `DependencyService.traceInvalidation()` if unused.
3. Delete unused `DependencyGraph.ts`.
4. Remove public `World.getDependencyService()` and update tests to narrow ports.
5. Merge duplicate dependency registrar interfaces.

Validation:

- `npm run build --workspace=frontend`
- `npm run test:architecture --workspace=frontend`
- `npm test --workspace=frontend`

### Batch 3: Fix `World.clear()` Correctness

1. Add focused tests for stale 3D storage/counters/labels after `World.clear()`.
2. Clear all world-owned 3D maps and counters.
3. Reset or replace `labelGenerator` if needed.
4. Ensure realization stores are fully cleared.

Validation:

- Focused `World.clear()` tests.
- `npm test --workspace=frontend`

### Batch 4: Remove UI Bridge Leftovers

1. Remove `useViewport` from `SvgCanvas` and delete the composable if unused.
2. Remove `update-active-plane` event wiring if unused.
3. Remove no-op highlight event chain or replace it with a real application port.
4. Simplify `ActionsPanel` counters and manual refreshes.

Validation:

- Focused canvas interaction tests.
- `npm run build --workspace=frontend`
- `npm test --workspace=frontend`

### Batch 5: Reconsider Thin Recent Helpers

1. Decide whether `WorldEntityFactory` is real policy or just constructor forwarding.
2. Decide whether `ProcessTreeIdAllocator` should become deterministic/restorable or be removed.
3. Relax architecture tests that mandate helper names rather than true boundaries.
4. Revisit `ThreePresentationAdapter` after UI bridge cleanup.

Validation:

- `npm run test:architecture --workspace=frontend`
- `npm test --workspace=frontend`

## Suggested Architecture Test Changes

Keep:

- Domain has no outer-layer imports.
- Domain has no `console.*` side effects.
- `World` and `ProcessTree` have no notification plumbing.
- Production code outside `World` does not call broad dependency-service methods.
- Components do not import concrete tools, command construction, or deleted services.

Relax or replace:

- Tests that require `WorldEntityFactory` by exact name.
- Tests that require `ProcessTreeIdAllocator` by exact name.
- Tests that enforce helper implementation details rather than architectural boundaries.

Add:

- No explicit `backward compatibility`, `deprecated`, or `FOR TESTS ONLY` comments in active source except in an allowlisted migration document.
- No unused debug/dump methods in domain services.
- `World.clear()` resets all world-owned storage and counters.

## Conclusion

The remediation is directionally correct, but it should now pivot from adding seams to deleting compatibility and bridge code. The most valuable next work is not another abstraction layer; it is deleting old compatibility branches, removing unused debug/legacy code, simplifying UI event bridges, and tightening `World.clear()` correctness.

The current clean-architecture rule should be interpreted aggressively: if a method, prop, event, interface, or helper exists only because old tests or old wiring expected it, remove it and update the tests/wiring to current architecture.
