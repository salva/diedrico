# Deep Design And Implementation Audit - 2026-06-05

This document records a focused audit of bad design, weak abstractions, and implementation risks in the current frontend codebase. It is intentionally diagnostic: it does not propose a full rewrite, and it does not treat every imperfection as urgent. Findings are grouped by impact and confidence.

## Executive Summary

The codebase has moved in the right direction by extracting runtime services from `World`, passing explicit `OperationContext` dependencies, and deleting several stale wrappers. The remaining design debt is now concentrated in a smaller number of seams:

- `World` is still partly a storage class and partly a cross-storage query/domain helper facade.
- Presentation code has several read-port/selector layers that mostly transform data for a single consumer.
- Construction execution still relies on a large switch and unchecked intent argument extraction.
- Some internal geometry paths still use non-null assertions instead of explicit invariant checks.
- Test helpers preserve legacy world-to-service associations that can hide production wiring problems.
- A meaningful amount of source text still explains historical phases rather than current invariants.

## Highest Priority Findings

### 1. `World` still mixes storage with query/domain behavior

Files:

- `frontend/src/domain/world/World.ts:93-170`
- `frontend/src/domain/world/World.ts:221-267`

Problem:

`World` has been simplified, but it still does more than storage. It owns maps, exposes storage mutation, performs cross-plane lookup, parses hierarchical element IDs, and offers semantic lookup helpers. Examples include `getPlaneForElement`, `getElement2D`, `getPoint2D`, `getLine2D`, and similar type-specific lookup helpers.

Why this is bad design:

- It keeps `World` as the convenient place to add more behavior.
- It makes the boundary between storage and query service unclear.
- It couples callers to the internal storage shape, especially projection-plane-owned 2D elements.
- It makes later fail-fast policy harder because some methods return `undefined`, while similar methods throw for corrupted container IDs.

Recommended direction:

- Keep `World` as map-backed storage with `put`, `delete`, `get by id`, and collection methods.
- Move cross-storage lookups such as `getPlaneForElement` and polymorphic element lookup into explicit query services or context objects.
- Make missing element behavior consistent by separating external lookup boundaries from internal invariant lookups.

### 2. `World.projectionPlanes` leaks internal storage

Files:

- `frontend/src/domain/world/World.ts:97`
- `frontend/src/commands/operations/world/operationHelpers.ts:22-23`
- `frontend/src/commands/operations/world/RemoveElementOps.ts:40`
- `frontend/src/commands/factories/DeletionSequenceFactory.ts:94`

Problem:

`projectionPlanes` is public. Several callers directly pass or inspect the map instead of using a storage/query port.

Why this is bad design:

- It exposes the concrete storage representation as public API.
- It makes cache invalidation and dependency logic depend on `World` internals.
- It blocks replacing storage or adding invariants around projection-plane mutation.

Recommended direction:

- Make `projectionPlanes` private.
- Add the narrow query or iteration method that invalidation/deletion actually needs.
- Prefer a `ProjectionPlaneCollectionPort` if callers should not depend on `World` directly.

### 3. Construction execution is too centralized and weakly typed

File:

- `frontend/src/application/construction/ConstructionUseCases.ts:50-161`

Problem:

`executeConstructionOperations` is a large switch over all tool intent types. Most branches use unchecked `args.get(...)!`, `.element!`, and ad hoc casts.

Why this is bad implementation:

- Intent validation and intent execution are separated by convention only.
- Invalid or drifted tool intents fail as generic runtime crashes.
- Adding a new construction type requires editing a central high-churn function.
- The function mixes validation, operation creation, process-tree action creation, and geometry feasibility handling.

Recommended direction:

- Introduce typed intent-specific executors or a registry keyed by intent type.
- Replace `Map<string, ArgumentValue>` extraction with intent-specific argument objects before this layer.
- Keep command grouping and process-tree recording in one small orchestration helper, not repeated across branches.

### 4. Projection-plane matrix computation still uses unsafe internal assertions

File:

- `frontend/src/utils/projectionPlaneUtils.ts:180-207`

Problem:

`computeProjectionPlaneMatrices` uses chained non-null assertions for lines, projection planes, plane IDs, and realizations:

```ts
const t1Line = context.getLine2D(t1HingeTraceId)!;
const planeP1 = context.getProjectionPlaneById(t1Line.planeId!)!;
const planeP1Realization3D = context.getProjectionPlane3DRealization(planeP1.id!)!;
```

Why this is bad implementation:

- This is core geometry construction code, not a leaf UI helper.
- Missing references should fail with domain-specific invariant errors.
- Nearby `computeExpectedT2Prime` performs explicit checks for comparable lookups, so behavior is inconsistent in the same module.
- Non-null assertion crashes obscure which dependency was missing.

Recommended direction:

- Replace each non-null assertion with explicit `throw new Error(...)` for missing internal references.
- Continue returning `null` only for legitimate geometric infeasibility, such as parallel traces or infeasible realizations.
- Consider returning a typed result if callers need to distinguish invalid construction input from internal corruption.

## Medium Priority Findings

### 5. Three presentation read ports are transformation services, not simple read ports

Files:

- `frontend/src/application/threePresentation/ThreeWorldReadPort.ts:28-45`
- `frontend/src/application/threePresentation/ThreeProjectionPlaneReadPort.ts:18-37`
- `frontend/src/application/threePresentation/ThreePlanarElementReadPort.ts:15-58`
- `frontend/src/application/threePresentation/ThreePresentationSelector.ts:16-34`

Problem:

The read-port layer constructs render-facing DTOs, realizes geometry, applies styling, generates grid segments, lifts 2D geometry into 3D, and filters visibility. The selector then performs another aggregation step.

Why this is a bad abstraction:

- The name `ReadPort` understates the amount of transformation happening.
- There appears to be one factory and one primary consumer.
- The split creates navigation overhead without a clear alternative implementation boundary.
- The extra interfaces show up as unused exported types in static analysis, indicating surface area larger than actual use.

Recommended direction:

- Either rename these modules as builders/projectors, or merge thin read-port interfaces into the selector layer.
- Keep seams only where they isolate rendering framework code, test a meaningful unit, or support multiple implementations.
- Avoid exporting read-port types unless another module truly consumes them as an abstraction.

### 6. Projected 3D canvas presentation has a similar port/selector split

Files:

- `frontend/src/application/canvasPresentation/Projected3DCanvasSelector.ts:29-38`
- `frontend/src/application/canvasPresentation/Projected3DCanvasReadPort.ts:6-25`
- `frontend/src/application/canvasPresentation/CanvasPresentationContext.ts:20-22`

Problem:

`Projected3DCanvasReadPort` wraps `World`, `RealizationService`, and realization context, then immediately feeds `Projected3DCanvasSelector`.

Why this is a weak abstraction:

- It is a single-use port with little policy of its own.
- It mostly adapts local data into another local object.
- It may exist primarily to satisfy a previous architecture shape rather than current needs.

Recommended direction:

- Inline it into the canvas presentation context or rename it as a concrete source builder.
- Keep the selector pure if that is still useful, but avoid a port unless there is a real boundary.

### 7. RuntimeSession is a composition root, but it is becoming a broad facade

File:

- `frontend/src/application/appShell/RuntimeSession.ts:28-145`

Problem:

`RuntimeSession` owns domain context, command stack, descriptor registry, visibility model, change publisher, project service access, presentation ports, tool ports, process history, selection, and deletion wiring.

Why this is risky:

- It is the central place where every application concern becomes reachable.
- Port objects are created as inline anonymous objects, making dependencies less explicit than the newer service direction suggests.
- It can become difficult to test individual runtime compositions without constructing the full session.

Recommended direction:

- Keep `RuntimeSession` as the composition root, but extract coherent port factories when they stabilize.
- Group related runtime adapters by concern, such as canvas, tools, process, project, and three presentation.
- Avoid adding business decisions directly to `RuntimeSession` methods.

### 8. Storage port abstractions are inconsistent

Files:

- `frontend/src/domain/world/GeometryStoragePorts.ts`
- `frontend/src/domain/world/ReconstructionConstructionService.ts`
- `frontend/src/domain/world/ProjectionPlaneConstructionService.ts`

Problem:

Some construction services use narrow storage ports, while others still depend directly on concrete services or a broader storage shape.

Why this is a weak abstraction:

- It looks like an unfinished refactor rather than a deliberate boundary.
- If only `World` implements the ports, the ports may be ceremony.
- Inconsistent use makes it unclear where new construction behavior should depend.

Recommended direction:

- Decide whether construction services should depend on ports or direct runtime services.
- If ports remain, make all construction services follow the same style.
- If ports are unnecessary, simplify toward direct explicit dependencies.

## Implementation Smells

### 9. Broad catch in projection-plane tool validation allows internal errors to proceed

File:

- `frontend/src/tools/CreateProjectionPlaneTool.ts:100-132`

Problem:

The tool catches all errors while validating expected `T2'` position and returns a valid result with a warning.

Why this is risky:

- Geometric non-computation is a reasonable warning.
- Missing internal references, broken realizations, or programming errors should not be converted into a user-warning success path.
- This conflicts with the current fail-fast policy for internal impossible states.

Recommended direction:

- Return warnings only for known geometric cases.
- Let unexpected exceptions propagate.
- If user-facing validation must never crash, classify errors explicitly before converting them to warnings.

### 10. Command rollback can mask the original failure

File:

- `frontend/src/commands/Command.ts:170-193`

Problem:

`addAndExecute` catches operation errors, calls rollback, and rethrows. If rollback throws, the rollback failure can hide the original operation failure.

Why this is risky:

- The original invariant failure is usually the useful debugging signal.
- Rollback failures are important but secondary.
- Debugging becomes harder if errors are replaced during recovery.

Recommended direction:

- Preserve the original error.
- If rollback fails, throw an aggregate error or attach rollback failure as cause/context.
- Add a focused test for operation failure followed by rollback failure.

### 11. Remove-element operations contain high duplication

File:

- `frontend/src/commands/operations/world/RemoveElementOps.ts`

Problem:

Remove operations repeat similar apply/undo/result/invalidation/dependency patterns across points, lines, circles, guides, and projection planes.

Why this is bad implementation:

- Invalidation ordering is important and easy to accidentally diverge.
- Error handling and result shape can drift between element types.
- New deletion cases will likely copy/paste existing patterns.

Recommended direction:

- Extract only the invariant-preserving pieces, such as invalidate-before-remove and unregister-after-remove.
- Avoid a generic deletion framework unless it clearly reduces duplication without hiding ordering.
- Add tests around invalidation ordering if extraction happens.

### 12. Canvas item types encode required fields as optional

Files:

- `frontend/src/application/canvasPresentation/CanvasPresentationModel.ts:80-87`
- `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts:46-50`

Problem:

The `finite-segment` item kind requires `point1` and `point2`, but the model type marks them optional and the selector uses non-null assertions.

Why this is bad implementation:

- The type system does not encode the invariant.
- Consumers can construct invalid items without a compile-time error.
- Non-null assertions make failures later and less local.

Recommended direction:

- Convert canvas plane items into a discriminated union where each `kind` has exactly its required geometry fields.
- Remove `item.point1!` and `item.point2!` after the type change.

## Test And Documentation Debt

### 13. Test helpers recreate production composition with hidden WeakMap state

File:

- `frontend/tests/helpers/worldHelpers.ts:36-190`

Problem:

Test helpers maintain WeakMap associations from `World` to `DependencyService`, `ProcessTree`, `WorldIdAllocator`, `LabelGenerator`, and `RealizationService`. They also reconstruct projection, reconstruction, and projection-plane construction services.

Why this is bad test design:

- Tests can pass with helper-only wiring that production does not use.
- Hidden state tied to a `World` instance is easy to forget when clearing or rebuilding state.
- The helper becomes a parallel composition root that must track production changes.

Recommended direction:

- Prefer constructing `RuntimeDomainContext` or a dedicated test runtime context.
- Keep small helpers for semantic access, but avoid hidden service associations.
- Make tests pass explicit context objects instead of recovering services from `World`.

### 14. Skipped tests preserve removed behavior

Files:

- `frontend/tests/integration/pointCreation.spec.ts`
- `frontend/tests/unit/domain/world.spec.ts`

Problem:

Some skipped tests reference removed APIs, hardcoded old IDs, or old sibling/intersection behavior.

Why this is harmful:

- Skipped tests look like pending work but actually describe obsolete behavior.
- They increase cognitive noise for future refactors.
- They can mislead contributors about supported APIs.

Recommended direction:

- Delete skipped tests that target removed APIs.
- Rewrite only tests that still express current behavior.
- Avoid keeping historical behavior in active test directories.

### 15. Architecture tests rely on source-text assertions

Files:

- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`
- `frontend/tests/unit/application/appShell/Cycle027Architecture.test.ts`
- `frontend/tests/unit/architecture/helpers/sourceScanner.ts`

Problem:

Some tests assert raw source text, regex import extraction, or absence of specific names.

Why this is brittle:

- They encode refactor history instead of stable architecture policy.
- Regex import scanners do not have TypeScript parser semantics.
- Tests can fail on harmless rewrites or pass despite architectural violations hidden in syntax they do not parse.

Recommended direction:

- Keep only architecture tests that enforce current boundaries with clear rules.
- Prefer TypeScript-aware tooling or Knip/ESLint-style checks where possible.
- Move historical assertions to documentation if they are still useful context.

### 16. Historical phase comments obscure current design

Files:

- `frontend/src/domain/world/Element2D.ts:16-36`
- `frontend/src/domain/world/World.ts:94-140`
- `frontend/src/utils/projectionPlaneUtils.ts:1-16`
- Many other files with `Phase N` comments

Problem:

Many comments explain when or why something changed during earlier phases rather than the current invariant.

Why this matters:

- Historical comments become stale faster than invariant comments.
- They make files look more complex than they are.
- They preserve old mental models after the implementation has moved on.

Recommended direction:

- Replace phase history with current responsibility and invariant comments.
- Keep historical detail in architecture docs, not inline implementation comments.
- Delete comments that restate obvious code or removed behavior.

## Lower Priority Findings

### 17. Process tree tombstones are intentional but contagious

File:

- `frontend/src/domain/processTree/ProcessTree.ts`

Problem:

Action deletion uses `null` tombstones to preserve stable indices.

Why this is a mixed design:

- The rationale is valid if stable indices are required.
- The sentinel leaks into traversal and read-model logic.
- Every consumer must remember to filter tombstones.

Recommended direction:

- Keep tombstones if stable indices are truly required.
- Encapsulate traversal so consumers do not inspect raw children arrays.
- Consider a small `ActionSlot` type if null handling continues to spread.

### 18. DTO and exported type surface is larger than actual usage

Evidence:

- Knip reports many unused exported types in presentation model and port files.

Problem:

The project exports many interfaces and DTO aliases that appear to have only local or no consumption.

Why this matters:

- It increases API surface without real external consumers.
- It makes dead-code tools noisy.
- It encourages preserving types after implementation changes.

Recommended direction:

- Make DTO and port types file-local by default.
- Export only types consumed across module boundaries.
- Treat broad type-surface cleanup as a separate low-risk pass after runtime code settles.

## Recommended Remediation Order

1. Fix internal assertion paths in `computeProjectionPlaneMatrices`.
2. Split or type `ConstructionUseCases` intent execution so unchecked `args.get(...)!` disappears.
3. Make `World.projectionPlanes` private and introduce the narrow invalidation/deletion query needed by callers.
4. Decide whether three/canvas read-port layers should be renamed, merged, or kept as explicit builders.
5. Replace hidden WeakMap service associations in test helpers with explicit test runtime contexts.
6. Delete or rewrite skipped tests that preserve removed APIs.
7. Convert canvas item models to discriminated unions with required fields per kind.
8. Clean stale phase comments and move durable historical context into architecture docs.
9. Run a type-surface cleanup pass using Knip results, but only after runtime abstractions are settled.

## What Not To Do

- Do not introduce a broad generic framework for all construction or deletion operations just to reduce duplication.
- Do not remove ports merely because they have one implementation if they protect a real boundary.
- Do not convert legitimate user/input boundary errors into fail-fast crashes.
- Do not keep skipped tests as historical documentation in active test directories.
- Do not make `World` a service locator again while trying to simplify call sites.
