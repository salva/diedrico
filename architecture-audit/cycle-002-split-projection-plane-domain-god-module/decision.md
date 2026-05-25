# Decision — Wave 002: Split the projection-plane domain god-module

**Stage:** `cycle-002-decision`  
**Wave:** 002 — Split the projection-plane domain god-module around stable domain responsibilities  
**Date:** 2026-05-25  
**Decision status:** review convergence complete; implementation may proceed only within the scope below.

## Evidence cited

This decision is based on the current Wave 002 artifact set:

- Scope check: `architecture-audit/cycle-002-split-projection-plane-domain-god-module/scope-check.md`
- Direct proposal: `architecture-audit/cycle-002-split-projection-plane-domain-god-module/proposals/proposal-direct.md`
- Restructure proposal: `architecture-audit/cycle-002-split-projection-plane-domain-god-module/proposals/proposal-restructure.md`
- Primary review: `architecture-audit/cycle-002-split-projection-plane-domain-god-module/reviews/round-01-review.md`
- Follow-up B1 resolution review: `architecture-audit/cycle-002-split-projection-plane-domain-god-module/reviews/round-01-follow-up-b1-resolution.md`
- Wave order and target outcome: `architecture-audit/wave-plan.md`, Wave 002

## Convergence verdict

Review convergence is complete with **NO BLOCKING ISSUES**.

The round-01 review raised one blocker, B1: both proposals needed to clarify whether `BaseProjectionPlane` test imports were current supported API or pre-existing broken test code, and name the replacement symbols. The proposals were corrected in place. The follow-up review verifies B1 as resolved and also verifies W3 incorporation for per-element realization and ID-generation methods that currently accept direct `World` parameters.

The follow-up review verdict is binding for this decision: **NO BLOCKING ISSUES** and a recommendation to implement **Proposal Direct**, with residual warnings W1 and W2 accepted as non-blocking.

## Selected implementation proposal

Wave 002 will implement **Proposal Direct**.

Rationale:

1. It matches the Wave 002 target outcome exactly: split the 1,797-line `ProjectionPlane.ts` god-module into focused projection-plane domain modules for realization value types, typed contexts, base plane abstraction, element ownership/caches, fixed planes, auxiliary planes, and construction helpers only where necessary.
2. It improves architecture and code quality without expanding into later waves: it deletes the monolith, narrows `any`/direct-`World` projection-plane contracts, updates imports, deletes stale `BaseProjectionPlane` test references, and removes debug noise in the touched auxiliary-plane path.
3. It respects the no-backcompat priority: no compatibility `ProjectionPlane.ts` barrel, no `BaseProjectionPlane` alias, no wrappers solely preserving the old monolithic import surface.
4. It is sized for one implementation cycle. The review found the alternative construction-service restructure architecturally attractive but too broad for this wave without a wave-plan split.

## Rejected/deferred alternative

**Proposal Restructure** is rejected for Wave 002 implementation and deferred as future-wave material.

Reason:

- It attempts a higher-layer entity/workflow split by moving projection-plane construction helpers into a `PlaneElementConstructionService`. That would further improve architecture, but the scout/review evidence found a large construction-helper call surface: the corrected restructure proposal cites 732 broad helper-call matches, including 34 under `frontend/src/` and 698 under `frontend/tests/`.
- Moving construction workflows now risks overflowing the one-cycle Wave 002 validation budget and pulling future command/use-case boundary work forward prematurely.
- The direct proposal creates the stable module and context boundary needed before a future construction-workflow extraction can be scoped safely.

The construction-service idea may become a later wave or a reviewed wave-plan edit after Wave 002 implementation proves the new projection-plane module boundary.

## Exact next implementation scope

The implementation stage must follow Proposal Direct and is limited to the following scope.

### Files/modules to create

Create focused projection-plane modules under:

```text
frontend/src/domain/world/projectionPlane/
  ProjectionPlaneRealization.ts
  ProjectionPlaneContext.ts
  ProjectionPlaneElementStore.ts
  ProjectionPlane.ts
  FixedProjectionPlane.ts
  AuxiliaryProjectionPlane.ts
```

Create `frontend/src/domain/world/projectionPlane/ProjectionPlaneConstruction.ts` only if the implementation would otherwise leave the new base `ProjectionPlane.ts` as a large mixed-responsibility module. If added, it must be a focused extraction of existing construction behavior, not a new service-layer redesign.

### Files/modules to update

Update imports and type references for the current direct consumers of the old monolith, including at minimum:

- `frontend/src/domain/world/World.ts`
- `frontend/src/commands/operations/world/AddAuxiliaryProjectionPlaneOp.ts`
- `frontend/src/components/panels/ThreeView.vue`
- `frontend/src/domain/world/descriptors/Element3DDescriptors.ts`
- `frontend/src/domain/world/descriptors/registerDescriptors.ts`
- `frontend/src/services/Element2DRenderer3D.ts`
- `frontend/src/types/ToolArgumentCollector.ts`
- tests importing from `@/domain/world/ProjectionPlane` or relative `ProjectionPlane` paths

Run a final grep for remaining imports from `@/domain/world/ProjectionPlane` or `./ProjectionPlane` before deleting the old file.

### Type/contract changes

The implementation must introduce typed projection-plane context interfaces and apply them to all projection-plane paths addressed by this split:

- replace `realize2D(world: any)` / `realize3D(world: any)` signatures in projection-plane classes;
- replace direct `world: import('./World').World` parameters in per-element realization helpers such as `realizePoint2D`, `realizeLine2D`, and `realizeCircle2D`;
- replace direct `World` parameters in ID-generation helpers such as `generatePoint2DId`, `generateLine2DId`, `generateSegment2DId`, `generateCircle2DId`, and `generateGuide2DId`;
- replace optional direct-`World` collection side-effect parameters with a named mutation/dependency context where those side effects remain in this wave.

`World` may satisfy the context interfaces structurally, but projection-plane modules must not import `World` solely for those contracts.

### Test updates

The implementation must treat `BaseProjectionPlane` test imports as pre-existing broken test code, not supported API. Replace them as follows:

- use `FixedProjectionPlane` for concrete P_H/P_V fixed plane instances;
- use abstract `ProjectionPlane` only where the test truly needs base-plane typing;
- do not introduce a `BaseProjectionPlane` alias, compatibility export, or wrapper.

Add or update focused tests for the extracted responsibilities, including coverage for store/delegation behavior introduced by `ProjectionPlaneElementStore`.

## DELETE list for implementation

The implementation must delete all of the following if they exist in the touched paths:

- the old all-in-one `frontend/src/domain/world/ProjectionPlane.ts` file after replacement modules and imports are updated;
- all imports from `@/domain/world/ProjectionPlane` or relative `./ProjectionPlane` that target the deleted monolith;
- `realize2D` / `realize3D` `any` context signatures in the split projection-plane classes;
- direct projection-plane helper parameters typed as `import('./World').World` where covered by the direct proposal;
- stale `BaseProjectionPlane` imports/types in tests;
- any compatibility `ProjectionPlane.ts` barrel or re-export that exists only to hide the old monolith;
- auxiliary-plane debug `console.log` noise in the split auxiliary realization path;
- same-path auxiliary-plane creation debug `console.log` noise in `AddAuxiliaryProjectionPlaneOp.ts` while updating its import;
- obsolete comments such as the current “Dual storage period” claim if still present in the moved base-plane code.

## Validation requirements for implementation stage

Capture full stdout/stderr logs under:

`architecture-audit/cycle-002-split-projection-plane-domain-god-module/validation/`

Minimum Wave 002 checks:

1. Static deletion/import checks:
   - `grep -R "from ['\"]@/domain/world/ProjectionPlane['\"]\|from ['\"]./ProjectionPlane['\"]" -n frontend/src frontend/tests || true`
   - `grep -R "realize[23]D(.*any\|world: any\|_world: any" -n frontend/src/domain/world/projectionPlane frontend/src/domain/world || true`
   - `test ! -e frontend/src/domain/world/ProjectionPlane.ts && echo deleted`
2. Focused Vitest for projection-plane behavior:
   - `npm run test --workspace=frontend -- tests/unit/projectionPlane.spec.ts tests/unit/coordinateTransform.spec.ts tests/unit/utils/coordinateTransform.spec.ts tests/unit/domain/realizationCache.spec.ts`
   - `npm run test --workspace=frontend -- tests/integration/worldInitialization.spec.ts tests/unit/commands/initializationOps.spec.ts`
   - `npm run test --workspace=frontend -- tests/unit/commands/factories/GuideSequenceFactory.spec.ts tests/unit/commands/factories/IntersectionSequenceFactory.spec.ts tests/integration/factories/AllFactories.spec.ts`
3. Mandatory cadence:
   - `npm run lint`
   - `npm run lint --workspace=frontend`
   - focused Vitest commands above
   - `npm run test`
   - `npm run build`
   - `npm run build --workspace=frontend`
   - `npm run test:e2e --workspace=frontend`
   - live preview refresh bound to `0.0.0.0` and a reachability probe

If pre-existing validation debt from earlier waves remains, the implementation log must classify it explicitly and distinguish it from Wave 002-attributable failures. Focused Wave 002 tests and the deletion/type/import checks must pass for the wave to be accepted.

## Accepted residual risks

- **W1 — mutation context as stepping stone:** Proposal Direct may leave dependency registration and dirty marking inside plane collection methods, expressed through a narrower typed context rather than a direct optional `World`. This remains a coupling smell, but it is accepted for Wave 002 because the wave target is the projection-plane module split and typed context boundary, not the full entity/workflow separation.
- **Deferred construction-service extraction:** Proposal Restructure’s entity/workflow split is deferred because of scope. A future wave may move plane-element construction workflows out of the plane entity after the module split stabilizes.
- **Import churn/regression risk:** Deleting the monolithic file and updating tests/consumers is broad enough to risk missed imports or subtle behavior drift. The validation checks above are mandatory mitigations.

## Deviation rule

No implementation may deviate from this decision or from Proposal Direct’s selected scope without a new mini-cycle: a delta proposal, one bounded review round, and sign-off before changing implementation direction.

This decision authorizes the next stage, `cycle-002-implement-split-projection-plane-domain-god-module`, to implement Proposal Direct exactly within the scope above.
