# Abstraction Simplification Plan

Date: 2026-06-04

Source audit: [`abstraction-audit.md`](./abstraction-audit.md)

Deletion value review: [`abstraction-deletion-value-review.md`](./abstraction-deletion-value-review.md)

Objective: simplify Diedrico's architecture and code while preserving clean boundaries. The target is not fewer abstractions at any cost; the target is abstractions that clearly pay for themselves through domain meaning, test seams, state ownership, or complexity reduction.

## Design Principles

1. Keep abstractions that protect real boundaries: browser/storage/Drive/time dependencies, Vue store boundaries, command replay notification, and dependency graph read/write separation.
2. Remove abstractions that only forward to one implementation and are not independently substituted in tests.
3. Prefer concrete functions and return types over one-implementation interfaces.
4. Prefer domain language over design-pattern language. A class named after a domain concept is more valuable than a generic `Port`, `Controller`, or `Adapter` with no variation.
5. Keep large aggregate roots only when they own real invariants. `World`, `ProcessTree`, and `ProjectionPlane` may be large, but should not also contain dead helper layers.
6. Avoid speculative compatibility. If no current caller needs an API, remove it.
7. Change architecture in small, validated batches with regular commits.

## Finding Evaluation

| Finding | Decision | Rationale |
| --- | --- | --- |
| D01 dead `perpendiculars.ts` / `distances.ts` | Accept, remove | Zero consumers and duplicate local geometry types. |
| D02 `QuickToolUseCases` stub | Accept, remove | Permanent failure path is not product behavior. |
| D03 `Process.ts` | Accept, remove after confirming no active import | Redundant with root `Subprocess`. |
| D04 `ActionGroup.ts` re-export | Modify, not delete outright | Type re-export is ceremony, but `createActionGroup()` is active factory behavior. Move/co-locate the factory rather than deleting the concept. |
| D05 `DependencyEdge` | Accept, remove | Dead type. |
| D06 store dead exports | Accept, remove with store tests | Reduces public store API surface. |
| D07 tool `activate` / `deactivate` hooks | Accept, remove | Protocol methods are never called. |
| D08 `return-to-selection` completion mode | Accept, remove if all tools remain stay-active | Dead lifecycle branch. |
| D09 `IntersectionMask` | Accept, remove if no factory caller exists | Defensive branch cannot match without constructed instances. |
| D10 `SelectionMask.guide()` | Verify, remove if still present | Earlier cleanup may already have removed it. |
| D11 `SelectionMask.anyLine()` alias | Accept, replace with `line()` | Current implementation equals `line()`. |
| D12 `useHoverHighlight` factory | Modify | Export singleton API only; keep an unexported factory helper if useful. |
| A01 ThreePresentation adapter/read-port chain | Accept, simplify carefully | High payoff, but preserve concern selectors and avoid raw `World` leakage. |
| A02 `CanvasPresentationController` | Accept, remove | Pure delegation. |
| A03 `CanvasVisibilityPolicy` | Accept, remove | Pure pass-through. |
| A04 `ProjectSessionPersistenceAdapter` | Accept, simplify not delete port | Port is useful; concrete class is not. |
| A05 autosave type alias | Accept, remove | Exact alias with no semantics. |
| A06 snapshot/restore base interfaces | Accept, merge | Base types unused independently. |
| A07 anonymous RuntimeSession ports | Defer to later design pass | High risk; simplify only after smaller port removals. |
| A08 `CanvasWorldReadPort` one-impl interface | Modify/defer | The read boundary is useful. Simplify interface form only if selectors still avoid raw `World`. |
| H01 `Element3D` | Defer, reconsider design | Removing may force awkward optional `realize3D` on `Element`; needs domain-shape design. |
| H02 empty realization intermediates | Accept, remove | Clear hierarchy flattening with low conceptual risk. |
| H03 `Realization` base | Defer | Small abstraction but meaningful common `isFeasible()` API. Remove only after H02. |
| H04 `Segment3D` alias | Accept, remove | One-class alias. |
| H05 `Line2DPerpendicularToLine` | Keep | It names a real ordinary perpendicular-line construction and separates it from guide-specific behavior. |
| H06 `Line3D` | Defer with H01 | Depends on 3D element hierarchy decision. |
| H07 duplicate `Subprocess` | Accept, unify | Same concept, two shapes. |
| C01 duplicate intersection op | Modify with compatibility review | Remove duplicate implementation only; keep a registry alias for old serialized op type if needed. |
| C02 2D operation boilerplate | Reconsider | A base class may be worse than repetition. Prefer small helpers over parameterized mega-op. |
| C03 3D projection boilerplate | Accept, extract helpers | Shared validation helpers reduce risk without hiding behavior. |
| C04 toggle op template | Defer/skip | Low line count; generic toggle op may reduce clarity. |
| C05 single-op factories | Defer/skip | Consistent factory API may be cleaner than local inlining. |
| T01 completion behavior boilerplate | Accept | Same as D08. |
| T02 near-duplicate tools | Modify carefully | Keep explicit tool classes for product readability; extract shared validators/spec helpers only where obvious. |
| R01 duplicated `vec()` helper | Optional | Extraction is worthwhile only if it improves local readability; one-line local helpers are acceptable. |
| P01 `ProjectionPlaneElementStore` | Defer | Recent cleanup extracted it; inlining may make `ProjectionPlane` worse unless paired with larger design. |
| P02 `ProjectionPlane` god class | Defer to long-term | Needs separate domain-design effort. |
| L01 `World` | Defer | Recent remediation reduced non-domain concerns; further decomposition should be evidence-driven. |
| L02 `ProcessTree` | Keep | Cohesive aggregate; no action. |

## Target Architecture Designs

### Design A: Lean Active Source Surface

Purpose: remove dead exports/files and redundant aliases without changing behavior.

Target shape:

- Active source has no files with zero importers unless they are documented entry points.
- Stores expose only state/actions actually consumed by components/runtime.
- Selection masks contain only constructible masks used by current tools.
- Tool protocol contains only lifecycle methods that runtime actually calls.

Key changes:

- Delete dead files: `perpendiculars.ts`, `distances.ts`, `QuickToolUseCases.ts`, and `Process.ts`.
- Remove `ActionGroup.ts` only as type-only indirection; preserve/move `createActionGroup()` because it is active factory behavior.
- Remove dead exports from stores and composables.
- Remove dead selection masks and redundant `anyLine()`.
- Remove dead tool lifecycle/completion protocol.

Why this design is clean:

- It does not add abstraction.
- It reduces API surface and makes real product paths easier to see.
- It is low risk because behavior should be unchanged except removing unreachable paths.

### Design B: Concrete Presentation Read Models

Purpose: keep presentation selectors, but remove one-implementation port chains.

Target shape:

```text
RuntimeSession / World
  -> createCanvasPresentationContext(world, stores)
  -> CanvasPresentationSelector.select(context, viewport, state)

RuntimeSession / World
  -> createThreePresentationContext(world)
  -> ThreePresentationSelector.select(context, displayOptions)
```

Rules:

- Selectors stay because they contain useful transformation logic.
- Pure delegation controllers go away.
- One-implementation `ReadPort` interfaces become concrete context return types only when that does not leak raw `World` into selectors.
- External/test seams stay only where there are real alternatives.

Canvas design:

- Remove `CanvasPresentationController`.
- Keep a canvas presentation read context so selectors do not consume raw `World`.
- Prefer `type CanvasPresentationContext = ReturnType<typeof createCanvasPresentationContext>` or an exported concrete object type over a one-implementation interface.
- Remove `CanvasVisibilityPolicy`; visibility comes from the actual visibility resolver/context.

Three design:

- Remove `ThreePresentationController`.
- Replace `ThreePresentationAdapter` sub-interfaces with a single concrete `ThreePresentationContext` object.
- Move each `createThree*ReadPort` function into the selector file that uses it, or remove it if it only forwards calls.
- Keep `ProjectionPlane3DSelector`, `PlanarElement3DSelector`, `Guide3DSelector`, `Hinge3DSelector`, and `ReconstructedElement3DSelector` if they continue to contain real projection/render-model logic.
- Do not pass raw `World` into every selector; keep a presentation read boundary.

Why this design is clean:

- It keeps meaningful transformations separate from Vue and Three.js rendering.
- It removes faux polymorphism.
- It still prevents components from reaching directly into `World`.

### Design C: Flat Realization And Element Hierarchy

Purpose: simplify domain inheritance where intermediate classes have no domain behavior.

Target shape:

```text
Realization
  -> Point2DRealization2D
  -> Line2DRealization2D
  -> Circle2DRealization2D
  -> ProjectionPlaneRealization2D
  -> ProjectionPlaneRealization3D
  -> Point3DRealization3D
  -> Line3DRealization3D
  -> Segment3DRealization3D
  -> Plane3DRealization3D
```

Rules:

- Remove empty intermediate classes first.
- Keep `Realization` until all call sites are audited; `isFeasible()` may be worth keeping.
- Do not remove `Element3D` or `Line3D` until a separate design confirms the replacement does not make `Element` semantically muddy.

Accepted immediate hierarchy simplifications:

- Remove `Element2DRealization2D` and `Element3DRealization3D`.
- Remove `Segment3D` alias.
- Keep `Line2DPerpendicularToLine`; it is a real ordinary perpendicular-line construction. Extract shared perpendicular geometry only if needed.
- Unify `Subprocess` interfaces.

Deferred hierarchy questions:

- Whether `Element3D` should be a class, interface, or deleted.
- Whether `Line3D` is useful as a domain concept independent of `HingeLine`.
- Whether `Realization` should stay as a base class.

Why this design is clean:

- It removes non-semantic inheritance while preserving domain vocabulary.
- It avoids a premature flattening that could make `Element` too broad.

### Design D: Explicit Command Helpers, Not Generic Mega-Operations

Purpose: reduce operation boilerplate without hiding domain-specific operations behind configuration objects.

Rejected design:

- A generic `Add2DElementOp` class parameterized by factory method names and parameter schemas.

Reason:

- That would reduce lines but obscure command semantics, operation registry entries, and serialization behavior.
- It would make debugging saved commands harder.

Preferred design:

- Keep named operation classes.
- Extract small shared helpers for repeated validation and serialization pieces.

2D operation helper design:

```ts
function requireProjectionPlane(world: World, planeId: string): ProjectionPlane
function removeElementFromPlane(plane: ProjectionPlane, kind: 'point' | 'line' | ... , id: string): void
```

3D projection helper design:

```ts
type ProjectionPair = {
  plane1: ProjectionPlane
  plane2: ProjectionPlane
}

function requireDistinctProjectionPlanes(world: World, plane1Id: string, plane2Id: string): ProjectionPair
function requireFeasibleProjection<T>(label: string, realization: T | null): T
```

Operation registry design:

- Remove duplicate `AddIntersectionPoint2DOp` only after deciding whether old saved projects need that op type.
- If persisted compatibility is required, keep a registry alias that deserializes old `AddIntersectionPoint2D` into `AddLineLineIntersectionPoint2DOp`, but do not keep two implementation classes.

Why this design is clean:

- It keeps command classes readable and domain-specific.
- It removes repeated validation code.
- It avoids generic abstractions that are harder to understand than repeated code.

### Design E: Tool Protocol As Data-Driven Argument Collection

Purpose: reduce tool boilerplate while preserving each tool's readability.

Target shape:

- `ArgumentCollectorTool` provides default `completionBehavior = 'stay-active'`.
- `ITool` contains only methods runtime calls: `name`, `handleClick`, `getSelectionMask`, `cancel?`, `getState?` if needed.
- Concrete tools define argument sets and construction intent.
- Shared validators are extracted as small functions.

Tool simplification rules:

- Extract shared validators first, especially distinct projection-plane validation for 3D tools.
- Do not immediately replace all tools with a generic factory; tool classes are product-facing and readable.
- Consider parameterized factories only for pairs that are truly identical after validator extraction.

Why this design is clean:

- Removes dead lifecycle protocol.
- Keeps explicit tool names/classes where they express user-facing behavior.
- Avoids over-collapsing into opaque config objects.

## Execution Plan

### Phase 1: Dead Surface Removal

Findings: D01, D02, D03, D04, D05, D06, D09, D10, D11, D12, A05, A06, R01

Steps:

1. Delete dead calculation modules and their tests if any.
2. Delete `QuickToolUseCases.ts` and remove the quick-intent path from `CanvasToolController`.
3. Delete `Process.ts` if it has no active imports.
4. Move/co-locate `createActionGroup()` with the canonical `ActionGroup` type; remove only type-only re-export indirection.
5. Remove dead store exports and update store tests.
6. Remove dead selection mask classes/factories and update `CanvasInteractionQuery`.
7. Simplify hover highlight exported API to singleton-only; keep an unexported factory helper if useful.
8. Optionally extract shared `vec()` helper only if it improves rendering adapter readability.
9. Remove autosave alias and merge persistence base interfaces.

Validation:

```bash
npm run build --workspace=frontend
npm run test:architecture --workspace=frontend
npm test --workspace=frontend -- SelectionMask stores processTree hoverHighlight threeView
npm test --workspace=frontend
```

Commit message:

```text
Remove dead abstraction surface
```

### Phase 2: Presentation Layer Simplification

Findings: A01, A02, A03, A08

Steps:

1. Remove `CanvasPresentationController`; use `CanvasPresentationSelector` directly.
2. Remove `CanvasVisibilityPolicy`.
3. Preserve the canvas presentation read boundary while simplifying `CanvasWorldReadPort` to a concrete context type/factory return type if that makes code clearer.
4. Remove `ThreePresentationController`; use `ThreePresentationSelector` directly.
5. Collapse `ThreePresentationAdapter` sub-interfaces into one concrete `ThreePresentationContext`.
6. Inline or colocate one-implementation `Three*ReadPort` factories with selectors.
7. Keep selector classes that contain real transformation logic.
8. Do not replace selector dependencies with raw `World` access.

Validation:

```bash
npm test --workspace=frontend -- canvasPresentation threePresentation ThreeView SvgCanvas
npm run build --workspace=frontend
npm run test:architecture --workspace=frontend
npm test --workspace=frontend
```

Commit message:

```text
Simplify presentation read contexts
```

### Phase 3: Domain Hierarchy Flattening

Findings: H02, H04, H05, H07

Steps:

1. Remove `Element2DRealization2D` and `Element3DRealization3D`; concrete realization classes extend `Realization` directly.
2. Remove `Segment3D` alias and update imports/types to `Segment3DFromProjections`.
3. Keep `Line2DPerpendicularToLine`; add/extract a shared perpendicular geometry helper only if current code duplication warrants it.
4. Unify duplicate `Subprocess` interfaces.
5. Leave `Element3D`, `Line3D`, and `Realization` base class for a later decision.

Validation:

```bash
npm test --workspace=frontend -- realization Point3D Line3D Segment3D guide processTree
npm run build --workspace=frontend
npm test --workspace=frontend
```

Commit message:

```text
Flatten empty domain hierarchy layers
```

### Phase 4: Tool Protocol Cleanup

Findings: D07, D08, T01, T02 partial

Steps:

1. Remove `activate()` and `deactivate()` from `ITool` and base classes.
2. Default `completionBehavior` to `'stay-active'` in `ArgumentCollectorTool`.
3. Remove repeated `completionBehavior` declarations from all tools.
4. Remove dead `return-to-selection` branch and `completeTool` callback if no longer used.
5. Extract shared 3D projection-plane distinct validator.
6. Keep explicit tool classes unless a pair remains trivially identical after validator/spec helper extraction.
7. Do not replace tools with a generic config-driven mega-tool.

Validation:

```bash
npm test --workspace=frontend -- tools canvasToolControllers canvasInteractionController
npm run build --workspace=frontend
npm test --workspace=frontend
```

Commit message:

```text
Trim unused tool protocol
```

### Phase 5: Command Helper Cleanup

Findings: C01, C03, cautious subset of C02

Steps:

1. Review operation registry and saved-project expectations for `AddIntersectionPoint2D`.
2. Remove duplicate `AddIntersectionPoint2DOp` implementation only after confirming how old serialized op types are handled.
3. If old serialized op type exists or may exist, keep a registry alias that deserializes `AddIntersectionPoint2D` to `AddLineLineIntersectionPoint2DOp`.
4. Extract 3D projection validation helpers.
5. Extract small 2D plane lookup/helper functions only where they reduce repeated error-prone code.
6. Do not introduce a generic operation class unless a later review proves it is simpler than named operations.

Validation:

```bash
npm test --workspace=frontend -- operations operationRegistry initializationOps ProjectService
npm test --workspace=frontend -- projectService
npm run build --workspace=frontend
npm test --workspace=frontend
```

Commit message:

```text
Reduce command operation duplication
```

### Phase 6: RuntimeSession Port Simplification Design Spike

Findings: A07

This is intentionally a design spike before implementation.

Steps:

1. List all RuntimeSession-created anonymous port objects and their consumers.
2. Classify each as:
   - external/test seam to keep,
   - component read model to expose directly,
   - use-case dependency that RuntimeSession itself can implement,
   - dead.
3. Draft a target `RuntimeSessionFacade` interface that components can consume directly.
4. Implement only one low-risk slice first, such as `CommandHistoryPort` or `ActivePlanePort`.
5. Validate whether the result is genuinely simpler before continuing.

Acceptance criteria for continuing:

- Fewer anonymous objects.
- No loss of testability.
- Components remain decoupled from raw `World` and `CommandStack`.

Constrained spike result, 2026-06-04:

| RuntimeSession-created object | Classification | Decision |
| --- | --- | --- |
| `canvasViewPort()` object | Component read model | Keep for now. It is a component-facing read/intent facade over canvas presentation, input transforms, point movement, properties, and coordinate conversion. It must continue hiding raw `World`. |
| `processTreeReadPort()` object | Component read model | Keep for now. It exposes process-tree DTOs and related-action lookup without exposing `World` or dependency graph internals. |
| `elementsPanelPort()` object | Component read model | Keep for now. It pairs an elements-panel DTO with the adjacent visibility intent and keeps components away from raw elements. |
| `threePresentationPort()` object | Component read model | Keep for now. It preserves the Three presentation boundary and should be revisited with the deferred presentation-context work, not in this runtime-session slice. |
| `activePlaneSelectorPort()` object | Component read model | Keep for now. It serves the active-plane selector component directly and is separate from active-plane lifecycle use cases. |
| `activePlanePort()` object | Use-case dependency RuntimeSession can implement | Candidate next slice. `RuntimeSession` already owns active-plane state and change notifications, but this slice stopped after command history. |
| `selectionReadPort()` object | Use-case dependency | Keep for now. It remains a narrow read seam for selection use cases and deletion preview behavior. RuntimeSession could implement it later, but the benefit is smaller than command history. |
| `commandHistoryPort()` object | Use-case dependency RuntimeSession can implement | Implemented first slice. `RuntimeSession` now implements `CommandHistoryPort` directly, removing one anonymous object while keeping `CommandStack` private and retaining the `CommandHistoryPort` seam for keyboard/toolbar tests. |
| `snapshotHandle()` object | External/test seam | Keep. This is an adapter-local persistence handle and intentionally exposes concrete runtime internals only to `ProjectSessionPersistenceAdapter`, not to general app-shell ports or components. |
| `restoreTarget()` object | External/test seam | Keep. This is the paired persistence restore handle needed for project loading and validation isolation. |

Target facade direction:

- Let `RuntimeSession` directly implement small use-case dependency ports only when that removes an anonymous object and keeps the same narrow consumer type.
- Keep component read-model ports as explicit returned objects until a separate facade design can group them without exposing raw `World` or weakening presentation boundaries.
- Keep external/test seams, especially persistence handles and browser/service ports, as explicit boundaries.

Commit message for first slice:

```text
Simplify runtime session read ports
```

### Phase 7: Deferred Domain Decisions

Findings: H01, H03, H06, P01, P02, L01

Do not execute until earlier phases are complete.

Decision topics:

1. Should `Element3D` stay as a domain concept, become an interface, or disappear?
2. Should `Line3D` stay as a domain concept independent of `HingeLine`?
3. Should `Realization` remain a base class because `isFeasible()` is a useful shared API?
4. Should `ProjectionPlaneElementStore` be inlined or does it prevent `ProjectionPlane` from becoming worse?
5. Should `ProjectionPlane` factory methods move to commands/factories?
6. Should `World` element storage be extracted only if future changes require it?

Deliverable:

- A short decision record for each topic before code changes.

## Architecture Test Updates

Add or keep tests that enforce principles, not helper names:

- No active source files with zero importers except allowlisted entry points/config/docs.
- No `FOR TESTS ONLY` or `backward compatibility` comments in active source.
- No domain imports from application/components/stores.
- No domain `console.*` side effects.
- No one-implementation controller classes that simply delegate to a selector.
- No stores exporting dead actions/getters if a static grep check can be made reliable.

Avoid tests that require exact helper names, factory names, or class names unless those names are product architecture contracts.

## Validation Matrix

Always run after each phase:

```bash
npm run build --workspace=frontend
npm run test:architecture --workspace=frontend
npm test --workspace=frontend
```

Run docs after documentation updates:

```bash
npm run docs:build
```

Run lint before final completion:

```bash
npm run lint --workspace=frontend
```

## Commit Cadence

Commit after each phase once validation passes.

Before every commit:

```bash
git status --short
git diff
git log --oneline -10
```

Recommended commit sequence:

1. `Remove dead abstraction surface`
2. `Simplify presentation read contexts`
3. `Flatten empty domain hierarchy layers`
4. `Trim unused tool protocol`
5. `Reduce command operation duplication`
6. `Simplify runtime session read ports`
7. `Record deferred domain simplification decisions`

## Success Criteria

The simplification work is complete when:

1. Dead files and exports identified in accepted findings are gone.
2. Presentation paths no longer use controller/read-port layers that only delegate to one implementation.
3. Empty domain hierarchy layers are removed.
4. Tool protocol contains only runtime-used behavior.
5. Command duplication is reduced by helpers, not hidden behind opaque generic operations.
6. RuntimeSession port simplification has either a validated first slice or a decision to stop.
7. Deferred domain hierarchy decisions are documented before any risky flattening.
8. Full validation passes.

## What Not To Do

- Do not collapse meaningful domain concepts just because they are classes.
- Do not delete active factory behavior when only a type re-export is redundant.
- Do not replace explicit operation classes with a generic config-driven command system unless it is demonstrably easier to read and debug.
- Do not remove ports that represent real external/test seams.
- Do not remove presentation read boundaries by passing raw `World` deep into selectors.
- Do not delete `Line2DPerpendicularToLine`; it names a real ordinary perpendicular-line construction.
- Do not inline `World`, `ProcessTree`, or `ProjectionPlane` responsibilities without a separate invariant-focused design.
- Do not add compatibility aliases for removed APIs unless saved project data or current product behavior requires them.
