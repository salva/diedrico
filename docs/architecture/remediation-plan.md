# Architecture Remediation Plan

Date: 2026-06-04 (revised)

Source: current codebase review, `docs/architecture/data-structure-review.md`, and direct verification of the current tree.

This plan replaces the previous draft. It reflects only the current codebase state, removes stale items, drops items that reduce readability without improving cleanliness, and applies corrections from the review cycle.

## What Changed From the Previous Draft

- Removed P1.1 (inline action factories): calling `createPointAction("point5")` is more readable than `createAction("point5", "Create point point5")`. Removing named wrappers reduces readability without improving the architecture.
- Marked P1.3 (realization parameter names) as partially done; reduced scope to what remains.
- Added P1.4 (remove `Segment2D` alias), P1.5 (document `Element3D` as intentional seam), P1.6 (remove vestigial `type` fields from Line2D).
- Added P5.3 (remove non-null assertions for non-optional element IDs outside the domain paths already cleaned).
- Added cross-phase dependency notes: P2/P5, P1.3/P4.3.
- Added numeric target for P4: reduce `ProjectionPlane.ts` from 1,338 lines to approximately 600-800.
- Flagged P6.1 serialization risk explicitly.
- Marked P6.3 as partially done (styleService already moved).
- Explicitly noted `Element3D` needs no action.

## Already Resolved

- `styleService.ts` moved from `domain/world` to `application/canvasPresentation`.
- `ViewportTransform` consolidated to one definition in `domain/presentation/Paper.ts`.
- stale `domain/viewState/HingeLine.ts` deleted.
- obvious `id!` assertions removed in 3D/domain presentation paths.
- `ProjectionPlane.clearRealizationCaches(id)` and `ProjectionPlaneElementStore.clearRealizationCaches(id)` facade added.
- `AddFreePoint2D` and `UpdateFreePoint2DPosition` now have explicit descriptor/output interfaces.
- `World.ts` no longer imports command or services modules.
- deprecated `ProcessTree.addAction()` and `getActionsDependingOnElement()` already removed.
- `Workspace2D.vue`, `ElementRenderer.vue`, `worldStore.ts`, `commands/operations/paper/`, `commands/operations/toolbar/` already removed.

## Explicitly Skipped

These items do not improve cleanliness or would reduce readability:

- Inlining trivial ProcessTree action wrappers: named wrappers like `createPointAction(id)` are more readable at call sites than raw `createAction(id, description)`. Removing them is a net negative for clarity.
- Batch-removing `console.warn`/`console.error` statements: current statements are error-path reporting, not debug noise. Individual cleanup is fine; blanket removal is not.

These items target files or methods that no longer exist:

- `Workspace2D.vue`, `ElementRenderer.vue`, `worldStore.ts`, `commands/operations/paper/`, `commands/operations/toolbar/`, deprecated `ProcessTree.addAction()`, deprecated `ProcessTree.getActionsDependingOnElement()`, direct command/service imports in `World.ts`, `PaperService.ts`, `RenderService.ts`.

---

## Phase 1: Quick Wins

### P1.1 Extract Duplicated Segment-Bounds Utility

Problem: `Point2DLineLineIntersection` and `Point2DLineCircleIntersection` duplicate an `isPointOnSegment()` helper in `frontend/src/domain/world/Point.ts`.

Action:
- Extract a small pure utility to `frontend/src/domain/calculations/SegmentUtils.ts`.
- Keep the function domain-calculation focused and independent of `World`.

Validation:
- `npm run test -- tests/unit/domain/point.spec.ts tests/unit/domain/segmentIntersections.spec.ts tests/unit/calculations/intersections.spec.ts`
- `npm run build`

Effort: 30-60 minutes.

### P1.2 Remove `Segment2D` Type Alias

Problem: `type Segment2D = Segment2DByPoints` is a single-implementation alias that forces two names for the same type. The data-structure review flagged this as cosmetic but genuine.

Action:
- Rename `Segment2DByPoints` to `Segment2D`.
- Remove the type alias.
- Update all import sites.

Note: this is a rename-only change with no behavior impact. The class is stored in the same line map as infinite lines, but the name `Segment2D` is more natural.

Validation:
- `npm run build`
- `npm run test`
- grep for any remaining `Segment2DByPoints` references

Effort: 15-30 minutes.

### P1.3 Document `Element3D` as Intentional Seam

Problem: `Element3D extends Element` adds no stored properties. The data-structure review considered calling it a "zero-value abstraction" but confirmed it serves as the 3D reconstruction contract. Future audits keep rediscovering it as suspicious.

Action:
- Add a class-level JSDoc to `Element3D.ts` explicitly stating it is an intentional seam between 2D definitions and 3D reconstruction, and listing the concrete 3D element types it covers.
- No structural change.

Validation:
- `npm run build`

Effort: 10 minutes.

### P1.4 Remove Vestigial `type` Fields from Line2D

Problem: `Line2DPerpendicularToLine`, `Line2DTangentToCircleThroughPoint`, `Line2DTangentToCircleParallelToLine`, and `SiblingGuide2D` have `readonly type: Line2DType` fields that are not used for runtime discrimination (all dispatch uses `instanceof`). These are dead data that create confusion alongside the `kind` fields on some 3D elements.

Action:
- Remove the `type` field from the four classes listed above.
- Remove the `LINE_2D_TYPE` enum values that only these classes use (`PERPENDICULAR`, `TANGENT_TO_CIRCLE_THROUGH_POINT`, `TANGENT_TO_CIRCLE_PARALLEL`, `SIBLING_GUIDE`), or document them as unused if any serialization path relies on them.
- Verify that no serialization path depends on these `type` values (check `registerWorldOperationDescriptors.ts` and `ProjectService`).

This is independent of P5 (discrimination policy). Even if `kind` is later added to all elements, removing dead `type` fields that duplicate `instanceof` is unambiguously cleaner.

Validation:
- `npm run test`
- `npm run build`
- grep for any remaining references to the removed type values

Effort: 30-60 minutes.

### P1.5 Complete Realization Parameter/Comment Cleanup

Problem: Some `realize*()` parameter names and comments still say `world` where the type is now a narrow realization context. The recent commit fixed the most visible cases (`ProjectionPlane.ts`, `Point.ts`, `AuxiliaryProjectionPlane.ts`, `Element3D.ts`), but others remain.

Action:
- Inventory all remaining `realize2D(`, `realize3D(`, and `realize*(` signatures across the domain layer.
- Rename local parameters from `world` to `context` where the type is a context, not `World`.
- Update stale comments that describe passing `World`.

Validation:
- `npm run build`
- `npm run test`

Effort: 30-60 minutes for remaining cases.

### P1.6 Remove Remaining Non-Null Assertions on Non-Optional Element IDs

Problem: The recent commit removed `id!` assertions in 3D/domain presentation paths. Other `id!` uses may still exist in startup/factory utilities or 3D element clone methods.

Action:
- Audit all remaining `id!` uses in `frontend/src/domain/`.
- Remove assertions where `Element.id` is provably set before use (construction paths).
- Keep assertions where IDs may genuinely be unset at the type level.

Validation:
- `npm run test`
- `npm run build`

Effort: 30-60 minutes.

---

## Phase 2: Persistence Type Safety

### P2.1 Descriptor Shape Policy Decision

Status: prerequisite for P2.2 and all subsequent descriptor work.

Problem: Some descriptors use flat top-level fields (the recently typed ones), while some operations use `payload` objects. This inconsistency will grow as more descriptors are typed.

Action:
- Document the chosen policy: new descriptors should follow the `AddFreePoint2DDescriptor` pattern (flat top-level fields matching the operation constructor parameters).
- Note cross-phase dependency: if element `kind` fields are later added (P5), descriptors constructing those elements would need their descriptor types updated to include `kind`.

Validation:
- Architecture decision note in code comments or docs.
- `ProjectService.roundTrip.spec.ts` still passes.

Effort: 30 minutes to document.

### P2.2 Add Explicit Descriptor Types to High-Value Operations

Already done:
- `AddFreePoint2D`
- `UpdateFreePoint2DPosition`

Recommended next batches:

1. Basic 2D construction operations:
   - `AddLine2DByTwoPoints`
   - `AddLine2DParallelToLine`
   - `AddLine2DPerpendicularToLine`
   - `AddSegment2DByPoints`
   - `AddCircle2DByCenterAndPoint`

2. Intersection operations:
   - `AddLineLineIntersectionPoint2D`
   - `AddLineCircleIntersectionPoint2D`
   - `AddCircleCircleIntersectionPoint2D`
   - `AddSiblingIntersectionPoint2D`

3. 3D reconstruction operations:
   - `Add3DPoint`
   - `Add3DLine`
   - `Add3DSegment`
   - `Add3DPlane`

Note: total operation count in `frontend/src/commands/operations/world/` is approximately 25. These 13 operations cover the most frequently replayed construction commands. The remaining 12 (guide, style, view state, initialization, removal, projection plane, hinge line) can be typed incrementally as needed.

Action per batch:
- Add operation-specific descriptor/output interfaces for each operation.
- Register restorers with typed descriptors in `registerWorldOperationDescriptors.ts`.
- Preserve current serialized shape.

Validation:
- `npm run test -- tests/unit/commands/operations/operationRegistry.spec.ts tests/unit/application/appShell/ProjectService.roundTrip.spec.ts tests/integration/projectService.determinism.spec.ts`
- `npm run build`

Effort: 2-4 hours per batch.

---

## Phase 3: Descriptor Registry Boundary

### P3.1 Convert DescriptorRegistry Away From Static Global State

Problem: `DescriptorRegistry` stores descriptors in a `static Map<Function, ElementDescriptor>`. Registration happens via `registerAllDescriptors()` at `main.ts` startup. This is global mutable state that prevents test isolation and is fragile under code splitting or minification.

Before starting, audit all call sites of `DescriptorRegistry.get()` and `getDescriptor()` to understand the consumer surface.

Action:
- Convert `DescriptorRegistry` to instance-based, constructed and populated at `RuntimeSession` creation.
- Inject the registry through read-model constructors that need it.
- Maintain a test helper that creates a pre-registered registry for unit tests.

Likely affected files:
- `frontend/src/domain/world/descriptors/DescriptorRegistry.ts`
- `frontend/src/domain/world/descriptors/registerDescriptors.ts`
- `frontend/src/main.ts`
- `frontend/src/application/appShell/RuntimeSession.ts`
- application read models that call `DescriptorRegistry.getDescriptor()`
- tests that depend on global registration

Validation:
- `npm run test:architecture`
- `npm run test -- tests/unit/application/appShell reads and descriptor tests`
- `npm run build`

Effort: 2-4 hours depending on call-site count.

---

## Phase 4: ProjectionPlane Responsibility Split

`ProjectionPlane.ts` is 1,338 lines and combines element storage, creation, realization, and identity. This phase reduces it through tested extractions.

### P4.1 Add Characterization Tests

Prerequisite before any extraction.

Action:
- Write tests covering: point/line/circle addition, dependency registration, realization cache invalidation, fixed and auxiliary plane realization, element lookup, `getAll*()` methods.
- Run full `npm run test` to establish baseline.

Effort: 2-3 hours.

### P4.2 Extract Creation/Validation Helpers

Safest first extraction.

Action:
- Extract repeated validation and lookup helpers used by `add*()` methods to `frontend/src/domain/world/projectionPlane/ProjectionPlaneElementCreation.ts`.
- Keep public `ProjectionPlane.add*()` methods as delegation wrappers initially.
- Preserve `clearRealizationCaches(id)` facade on `ProjectionPlane`.

Validation:
- `npm run test -- tests/unit/domain tests/unit/commands/factories`
- `npm run build`

Target: `ProjectionPlane.ts` reduced by approximately 200-300 lines.

Effort: 2-4 hours.

### P4.3 Extract 2D Realization Calculation Helpers

Second extraction.

Action:
- Move pure realization logic (`realizePoint2D`, `realizeLine2D`, `realizeCircle2D` helpers) out of `ProjectionPlane.ts` into small pure functions in `frontend/src/domain/world/projectionPlane/ProjectionPlaneRealization.ts` or similar.
- Prefer small pure functions over a monolithic `ProjectionPlaneRealizationCalculator` class.
- Do not change realization method signatures on `ProjectionPlane` itself initially.

Cross-phase note: P1.5 (realization parameter names) should complete before P4.3 so extracted functions have clean signatures.

Validation:
- `npm run test -- tests/unit/domain tests/unit/application/canvasPresentation`
- `npm run build`

Target: `ProjectionPlane.ts` reduced to approximately 600-800 lines total after P4.2 and P4.3 combined.

Effort: 3-5 hours.

Success criteria:
- `ProjectionPlane.ts` is smaller and easier to navigate.
- Public API remains stable.
- No new generic factory layer or registry is introduced.
- `clearRealizationCaches(id)` facade preserved on `ProjectionPlane`.

---

## Phase 5: Element Type Discrimination Policy

### P5.1 Inventory Current Type-Discrimination Sites

Required before choosing implementation.

Action:
- Grep all `instanceof` checks involving `Element`, `Element2D`, `Element3D`, `Point2D`, `Line2D`, `Circle2D`, `Segment2D`, `Guide2D`, `HalfHingeLine2D`, `ProjectionPlane`, and their subclasses.
- Count total sites by category: domain realization, presentation selectors, command operations, other.
- Document the inventory in an architecture note.

Validation:
- Architecture note with site count.

Effort: 1-2 hours.

### P5.2 Decide Policy

Choose one of:

Option A: Standardize on `kind` discriminated union.
- Add `kind` string literal to ALL concrete element subclasses.
- Convert presentation selectors to exhaustive `switch`.
- Remove vestigial `type` fields (P1.4 already removes the Line2D ones).
- Keep `instanceof` in domain realization code (no need to change working code).

Option B: Keep `instanceof`, document and remove vestigial fields.
- Remove `type` (P1.4) and document `kind` fields on 3D elements as serialization-only.
- Add class-level JSDoc explaining the discrimination strategy.
- Keep `instanceof` as the canonical dispatch everywhere.
- Do not add new `kind` fields.

Recommendation: Option B is lower risk and sufficient for cleanliness. Option A is more TypeScript-idiomatic but has cascading impact on selectors, operations, and tests. The choice should be documented before P5.3 begins.

Effort: decision only, no code change.

### P5.3 Implement Chosen Policy

If Option B (recommended):
- P1.4 already removes `type` fields.
- P1.5 already documents `Element3D` as intentional seam.
- Add JSDoc to `Element2D` and `Element3D` explaining that `instanceof` is the canonical dispatch.
- Document `kind` fields on `Point3D*`, `Line3DFromProjections`, `Segment3DFromProjections`, `Plane3DFromTraces` as serialization-only discrimination, not runtime dispatch.

If Option A:
- Add `kind` to Point2D family first, then Line2D, then Circle2D.
- Convert presentation selectors to exhaustive switches.
- Leave domain realization code on `instanceof` initially.
- Cross-phase dependency: P2.2 descriptor types that construct these elements would need updating if `kind` is added to the element interface.

Validation:
- `npm run test`
- `npm run build`

Effort: 30 minutes for Option B documentation; 4-8 hours for Option A depending on scope.

---

## Phase 6: Naming and Presentation Contracts

### P6.1 Audit `name` vs `label`

Problem: `Element.label` overlaps with `ProjectionPlane.name` and `Point3DByCoordinates.name`.

Warning: `ProjectionPlane.name` is serialized in project persistence files. Removing or renaming `name` requires a schema version bump and migration logic. This is a serialization-breaking change.

Action:
- Scope the audit specifically to `ProjectionPlane.name` and `Point3DByCoordinates.name` vs `Element.label`. Do not grep all `.name` and `.label` across the entire codebase (that would return hundreds of unrelated hits).
- Determine whether `name` serves a different purpose than `label` (e.g., stable user-facing identifier vs changeable display label).
- If redundant: consolidate to `label`, bump project schema version, add migration in `ProjectService`.
- If not redundant: document the distinction in code comments.

Validation:
- `npm run test -- tests/unit/application/appShell/ProjectService.roundTrip.spec.ts tests/integration/projectService.determinism.spec.ts`
- `npm run build`

Effort: 1-3 hours for audit; additional 2-4 hours if schema migration is needed.

### P6.2 Document and Test Canvas Render/Query Contracts

Problem: `CanvasPlaneItem.kind`, `CanvasRenderItem.kind`, and `CanvasQueryItem.kind` serve different purposes but the mapping is implicit. `CanvasRenderItem.kind` and `primitive.type` can disagree at compile time.

Action:
- Add comments to `CanvasPresentationModel.ts` documenting the three kind layers.
- Add selector tests asserting that selectable render items get corresponding query items.
- Consider stricter discriminated unions only if tests expose mistakes.

Validation:
- `npm run test -- tests/unit/application/canvasPresentation`
- `npm run build`

Effort: 1-2 hours.

### P6.3 Clarify ProcessTree Visibility/Style Semantics

Problem: `Subprocess` and `ActionGroup` carry `showIntermediates`, `isOutput`, `isAuxiliary`, `defaultStyle` flags. These are presentation state in the domain write model.

Note: the style resolution function has already been moved from `domain/world` to `application/canvasPresentation/`. The remaining concern is whether the flags themselves belong in the domain model.

Action:
- Document that these flags are construction-history display semantics, not geometric dependencies.
- Add JSDoc to `Subprocess` and `ActionGroup` clarifying this.
- Do not migrate fields until there is a clear target application-layer model and tests.

Validation:
- `npm run build`

Effort: 30-60 minutes for documentation.

---

## Phase 7: Dependency Registration Ownership

### P7.1 Standardize Dependency Registration Pattern

Problem: `World` calls `this.dependencyService.registerNode()` directly while `ProjectionPlaneElementStore` calls `context.getDependencyRegistrar().registerNode()` through a port. The registration contract is working but distributed.

Current state: `ProjectionPlaneElementStore` already uses `DependencyRegistrarPort` (a port interface). `World` is the sole `DependencyService` owner. The pattern is partially in place.

Action:
- Keep the port-based pattern for projection-plane registration.
- Document in `DependencyPorts.ts` that `World` is the sole dependency-graph owner and projection-plane storage uses the registrar port.
- Confirm that no new direct `DependencyService` callers are added outside `World`.

This is a documentation-only change to formalize the current working pattern.

Validation:
- `npm run build`

Effort: 30 minutes.

---

## Recommended Order

1. P1 quick wins (extract utility, remove alias, document, remove vestigial fields, complete parameter names, clean assertions).
2. P2.1 descriptor shape policy decision.
3. P2.2 descriptor typing, batch by batch as needed.
4. P3 descriptor registry boundary.
5. P4 characterization tests, then P4.2 extraction, then P4.3 extraction.
6. P5 discrimination inventory, policy decision, implementation.
7. P6 naming/presentation contracts.
8. P7 dependency registration documentation.

Phases 2-4 can proceed in parallel where they don't overlap. P5 implementation should wait until P1.4 and P5.1/P5.2 are complete.

## Validation Baseline

For most phases:
- `npm run build`
- `npm run test:architecture`
- focused tests for touched areas

For persistence or command changes:
- `npm run test -- tests/unit/commands/operations/operationRegistry.spec.ts tests/unit/application/appShell/ProjectService.roundTrip.spec.ts tests/integration/projectService.determinism.spec.ts`

For broad domain changes:
- `npm run test`

## Success Metrics

- `ProjectionPlane.ts` reduced to approximately 600-800 lines through tested extractions.
- Operation descriptors become progressively more typed while preserving current persistence behavior.
- Descriptor lookup no longer depends on hidden global static registration.
- Element type-discrimination policy is documented and vestigial `type` fields are removed.
- Segment/`Element3D`/parameter naming clarity improvements are in place.
- Stale baseline-era targets stay out of future plans.