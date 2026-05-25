# Proposal Restructure — Wave 002: Split projection-plane responsibilities at a higher boundary

**Stage:** `cycle-002-fresh-scout-proposals`  
**Proposal type:** Higher-layer alternative  
**Expected behavior change:** none if accepted; this proposal changes where construction/mutation responsibilities live rather than only splitting files.

## Summary

The direct split reduces file size and strengthens `any` contracts, but the current monolith’s deepest smell is not only physical size. `ProjectionPlane` is both:

1. a domain entity/aggregate for plane identity, transforms, owned 2D elements, and realization caches; and
2. a construction/use-case helper that validates cross-plane state, generates IDs/labels, registers dependencies, marks `World` dirty, creates guides/intersections/half-hinge lines, and reaches through `World` for sibling/context lookups.

This proposal splits one conceptual layer higher: keep projection-plane entities small, and move construction/mutation workflows into a domain/application boundary such as `PlaneElementConstructionService` or `ProjectionPlaneElementFactory` that receives an explicit `World`/domain context. The plane entity owns collections; a separate service owns “how to create a new line/guide/intersection on a plane in the current world.”

This is architecturally cleaner than a file-only split, but larger. It should be selected only if review concludes that keeping construction helper methods on `ProjectionPlane` would immediately recreate a god-module under a new path.

## Current evidence

The base `ProjectionPlane` currently mixes stable aggregate state with broad construction workflows:

- Element maps and caches belong to plane ownership (`frontend/src/domain/world/ProjectionPlane.ts:176-198`).
- Mutation methods accept optional `World` and perform dependency registration/dirty marking (`frontend/src/domain/world/ProjectionPlane.ts:244-252`).
- Construction helpers create typed domain elements and call `world.generateDefaultLabel`, `world.getLine2D`, `world.getHingeLineById`, `world.getSiblingPlaneForIntersection`, and related cross-aggregate APIs (`frontend/src/domain/world/ProjectionPlane.ts:779-875`, `frontend/src/domain/world/ProjectionPlane.ts:938-1045`, `frontend/src/domain/world/ProjectionPlane.ts:1109-1145`, `frontend/src/domain/world/ProjectionPlane.ts:1150-1157`, `frontend/src/domain/world/ProjectionPlane.ts:1410-1413`).
- Realization methods still expose broad `any` world context (`frontend/src/domain/world/ProjectionPlane.ts:1428`, `frontend/src/domain/world/ProjectionPlane.ts:1436`, `frontend/src/domain/world/ProjectionPlane.ts:1689`, `frontend/src/domain/world/ProjectionPlane.ts:1747`).
- `AddAuxiliaryProjectionPlaneOp` directly constructs an auxiliary projection plane and mutates `world.projectionPlanes` (`frontend/src/commands/operations/world/AddAuxiliaryProjectionPlaneOp.ts:95-118`), showing that command operations already act as application/domain coordinators.

## Proposed architecture

Create a strict separation between **plane entity** and **plane construction workflows**:

```text
frontend/src/domain/world/projectionPlane/
  ProjectionPlaneRealization.ts
  ProjectionPlaneContext.ts
  ProjectionPlaneElementStore.ts
  ProjectionPlane.ts             # aggregate/entity only
  FixedProjectionPlane.ts
  AuxiliaryProjectionPlane.ts

frontend/src/domain/world/planeElements/
  PlaneElementConstructionContext.ts
  PlaneElementConstructionService.ts
  PlaneElementMutationPort.ts
```

Alternative location if reviewers consider construction closer to use-cases than domain entity logic:

```text
frontend/src/application/world/planeElements/
  PlaneElementConstructionService.ts
```

The selection criterion should be dependency direction:

- If the service only imports domain types and accepts a domain context, keep it under `domain/world/planeElements`.
- If it starts importing command stack, UI, persistence, or tool concerns, it belongs under `application/world` and must not be called from domain entities.

## Plane entity responsibilities after restructure

`ProjectionPlane` keeps only:

- identity/metadata (`id`, `name`, `isActive`, `isVisible`, `color`, `plane3DId`),
- element collection ownership (`addPoint`, `removePoint`, `getPoint`, `getAllPoints`, etc.) with no dirty/dependency side effects,
- realization caches and cache invalidation,
- abstract `clone`, `getDependencies`, `realize2D`, `realize3D` with typed context.

`ProjectionPlane` does **not** create specific `FreePoint2D`, `Line2DParallel`, `Guide2D`, `SiblingIntersectionPoint2D`, or `HalfHingeLine2D` objects.

## Construction service responsibilities

`PlaneElementConstructionService` owns methods currently embedded as plane helpers, for example:

- `addFreePoint2D(plane, position, context, id?)`,
- `addLine2DBetweenTwoPoints(plane, point1Id, point2Id, context, id?)`,
- `addLineLineIntersection(plane, line1Id, line2Id, context, index?, id?)`,
- `addCircle2DByCenterAndPoint(plane, centerPointId, circumferencePointId, context, id?)`,
- `addSegment2DBetweenPoints(plane, point1Id, point2Id, context, id?)`,
- `addGuide2D(plane, referenceLineId, throughPointId, context, id?)`,
- `addSiblingGuide2D(plane, primaryGuideId, referenceLineId, throughPointId, context, id?)`,
- `addSiblingIntersectionPoint(plane, primaryIntersectionId, context, id?)`,
- `addHalfHingeLine2D(plane, hingeLineId, context, id?)`.

A current targeted grep shows this API migration surface is large: 732 helper-call matches total, including 34 under `frontend/src/` and 698 under `frontend/tests/` (`architecture-audit/cycle-002-split-projection-plane-domain-god-module/review-correction-targeted-grep.stdout.log`). This count includes broad `addLine2D`/`addSegment2D`/`addCircle2D` patterns and should be refined before implementation, but it is already large enough that this proposal should not be selected for Wave 002 without a reviewed wave-plan split or an explicit decision accepting a much larger cycle.

The service receives a typed `PlaneElementConstructionContext` that includes ID generation, label generation, dependency registration, cross-plane lookup, sibling-plane lookup, and dirty marking. `World` can satisfy the context structurally. This makes cross-aggregate/use-case needs explicit instead of hiding them in a plane entity method.

## Compatibility stance

Because project priorities assign zero weight to backward compatibility, the implementation should not leave wrapper methods on `ProjectionPlane` just to preserve the old API. However, this restructure touches many command/factory/test call sites that currently call `plane.addFreePoint2D(...)`, `plane.addGuide2D(...)`, etc. Two options are possible:

1. **Aggressive restructure in this wave:** delete helper methods from `ProjectionPlane` and update all current call sites to the construction service in the same implementation. This best matches no-backcompat priorities but may be larger than one cycle.
2. **Reviewed mini-split:** if scout/review finds the call-site surface too broad, edit `wave-plan.md` to split Wave 002 into 002a physical module split + typed realization contexts and 002b move plane construction workflows. This requires a reviewed plan edit before implementation and should only happen if the full restructure cannot fit the one-cycle validation budget.

This proposal recommends option 1 only if a pre-implementation grep shows the helper call surface is manageable.

## Files to change

### Domain/application additions

- Add `frontend/src/domain/world/projectionPlane/ProjectionPlaneRealization.ts`.
- Add `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts`.
- Add `frontend/src/domain/world/projectionPlane/ProjectionPlaneElementStore.ts`.
- Add `frontend/src/domain/world/projectionPlane/ProjectionPlane.ts`.
- Add `frontend/src/domain/world/projectionPlane/FixedProjectionPlane.ts`.
- Add `frontend/src/domain/world/projectionPlane/AuxiliaryProjectionPlane.ts`.
- Add `frontend/src/domain/world/planeElements/PlaneElementConstructionContext.ts`.
- Add `frontend/src/domain/world/planeElements/PlaneElementConstructionService.ts`.

### Updated consumers

- Update `frontend/src/domain/world/World.ts` imports (`frontend/src/domain/world/World.ts:92`) and any calls that create fixed projection planes.
- Update all commands/factories/tests that call construction helper methods on planes.
- Update `frontend/src/commands/operations/world/AddAuxiliaryProjectionPlaneOp.ts` import, delete its auxiliary-plane creation debug `console.log` noise (`frontend/src/commands/operations/world/AddAuxiliaryProjectionPlaneOp.ts:112-114`, `frontend/src/commands/operations/world/AddAuxiliaryProjectionPlaneOp.ts:119`, `frontend/src/commands/operations/world/AddAuxiliaryProjectionPlaneOp.ts:123`), and consider replacing direct `world.projectionPlanes.set(...)` with a typed world/domain method if in scope (`frontend/src/commands/operations/world/AddAuxiliaryProjectionPlaneOp.ts:95-118`).
- Update tests importing `BaseProjectionPlane` from the old monolith to current/focused symbols (`frontend/tests/unit/coordinateTransform.spec.ts:9`, `frontend/tests/unit/projectionPlane.spec.ts:9`, `frontend/tests/unit/projectionPlane.spec.ts:180-183`).

## DELETE list

- Delete the all-in-one `frontend/src/domain/world/ProjectionPlane.ts`.
- Delete construction helper methods from the `ProjectionPlane` entity once moved to `PlaneElementConstructionService`.
- Delete optional `world?: import('./World').World` side-effect parameters from plane collection methods.
- Delete `any` projection-plane realization context signatures.
- Delete stale `BaseProjectionPlane` imports/types rather than adding aliases to preserve the old test vocabulary.
- Delete debug logging in auxiliary realization that is not behaviorally required.
- Delete same-path command debug logging in `AddAuxiliaryProjectionPlaneOp.ts` unless the implementation explicitly defers it as out of scope with rationale.
- Delete any wrappers, re-export barrels, or “old API” adapters that simply forward `plane.addX(...)` to the construction service.

## Expected behavior

No intended user-visible behavior change:

- P_H/P_V fixed plane transformations remain identical.
- Auxiliary plane realization from trace lines remains identical.
- Plane-owned point/line/circle storage and realization caches remain equivalent.
- Existing guide, intersection, sibling-guide/sibling-intersection, and half-hinge-line behaviors remain equivalent.

Internal API behavior changes intentionally:

- Plane entities no longer construct new child elements as a use-case convenience API.
- Construction workflows explicitly depend on a construction context.
- `World`/dependency/dirty side effects are no longer optional hidden behavior of a plane collection method.

## Validation plan for implementation wave

### Pre-implementation sizing check

Run and capture:

```bash
grep -R "\.addFreePoint2D\|\.addLineLineIntersection\|\.addLine2D\|\.addSegment2D\|\.addCircle2D\|\.addGuide2D\|\.addHalfHingeLine2D" -n frontend/src frontend/tests
```

Current correction evidence already found 732 broad helper-call matches (34 source, 698 test) in `architecture-audit/cycle-002-split-projection-plane-domain-god-module/review-correction-targeted-grep.stdout.log`. If a refined grep remains anywhere near this size, do **not** implement this restructure directly in Wave 002. Instead, perform a wave-plan edit to split the construction-service move into its own later wave.

### Focused tests

- `npm run test --workspace=frontend -- tests/unit/projectionPlane.spec.ts tests/unit/coordinateTransform.spec.ts tests/unit/utils/coordinateTransform.spec.ts tests/unit/domain/realizationCache.spec.ts`
- `npm run test --workspace=frontend -- tests/integration/worldInitialization.spec.ts tests/unit/commands/initializationOps.spec.ts`
- `npm run test --workspace=frontend -- tests/unit/commands/factories/GuideSequenceFactory.spec.ts tests/unit/commands/factories/IntersectionSequenceFactory.spec.ts tests/integration/factories/AllFactories.spec.ts tests/unit/commands/createGuide.spec.ts tests/unit/commands/createIntersectionPoint.spec.ts`
- If auxiliary-plane tests exist or are added, run them explicitly; otherwise add focused coverage for `AuxiliaryProjectionPlane.realize2D/realize3D` using feasible and infeasible trace contexts.

### Mandatory cadence

Same as direct proposal:

- root and frontend lint,
- focused Vitest,
- full root Vitest,
- root and frontend build,
- frontend Playwright e2e,
- live preview refresh and reachability probe.

## Risks

- **Scope risk:** deleting plane construction helpers may touch many operations/factories/tests and exceed one cycle. This is the main reason not to choose this proposal unless the call surface is manageable.
- **Behavior regression risk:** construction helpers encode many edge validations and sibling creation behaviors. Moving them can subtly alter ID/label/dependency ordering.
- **Layering ambiguity:** a construction service under `domain` is acceptable only if it remains pure domain coordination; if it imports command/application infrastructure, it must move to `application`.
- **Premature centrality expansion:** Wave 004/006 will later address command and UI use-case boundaries. This restructure must not start those waves early by rewriting command architecture wholesale.

## Recommendation

Choose **Proposal Direct** unless review determines that leaving construction helper methods on `ProjectionPlane` is an unacceptable residual god-module after the physical split.

The restructure proposal is architecturally attractive but should only be implemented in Wave 002 if the helper call-site grep is small enough for one cycle. Otherwise, the correct path is to implement the direct split now and add a reviewed follow-up wave for moving plane-element construction workflows after the module boundary is stable.
