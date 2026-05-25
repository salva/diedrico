# Scope Check — Wave 002: Split the projection-plane domain god-module

**Stage:** `cycle-002-fresh-scout-proposals`  
**Wave:** 002 — Split the projection-plane domain god-module around stable domain responsibilities  
**Date:** 2026-05-25  
**Source-code changes in this stage:** none intended; this artifact is a scout/proposal artifact only.

## Verdict

Wave 002 can proceed **without a wave-plan edit**.

Wave 001 changed the highest-priority `World`/application boundary, but it did not split or materially reduce `frontend/src/domain/world/ProjectionPlane.ts`. The Wave 002 premise still holds: `ProjectionPlane.ts` remains a 1,797-line domain god-module that combines realization value types, base plane element ownership/caches, construction/factory helpers, fixed planes, auxiliary planes, dependency registration side effects, and weak `any` realization context signatures.

## Wave 001 accounting

Wave 001 moved initialization orchestration out of `World` and relocated `DependencyService` into the domain world package. The Wave 001 implementation log records deletion of `World.initialize(commandStack)`, deletion of domain imports of command/application initialization infrastructure, creation of `frontend/src/application/world/initializeWorld.ts`, and movement of `DependencyService` to `frontend/src/domain/world/DependencyService.ts` (`architecture-audit/cycle-001-invert-world-application-boundary/implementation-log.md`, “Source files changed” and “Legacy surfaces deleted”).

The relevant current source tree reflects that boundary cleanup:

- `World.ts` now imports projection-plane types from `./ProjectionPlane` and domain-local `DependencyService` from `./DependencyService`, not the old service-layer path (`frontend/src/domain/world/World.ts:92`, `frontend/src/domain/world/World.ts:95`).
- Initialization tests now exercise the application initializer `initializeWorld(world, commandStack)` rather than `world.initialize(commandStack)` (`frontend/tests/integration/worldInitialization.spec.ts:11-13`, `frontend/tests/integration/worldInitialization.spec.ts:20-23`).

Wave 001 did **not** alter the core Wave 002 problem:

- `ProjectionPlane.ts` is still 1,797 lines (`architecture-audit/cycle-002-split-projection-plane-domain-god-module/validation/read-only-scout.stdout.log`).
- It still exports realization value classes before the base class (`frontend/src/domain/world/ProjectionPlane.ts:80-116`, `frontend/src/domain/world/ProjectionPlane.ts:126-162`).
- It still owns 2D element maps and realization caches directly in the base plane (`frontend/src/domain/world/ProjectionPlane.ts:176-198`).
- It still performs dependency registration/dirty marking as optional `World` side effects in add/remove methods (`frontend/src/domain/world/ProjectionPlane.ts:244-252`, `frontend/src/domain/world/ProjectionPlane.ts:292-293`).
- It still combines construction helper methods for points/lines/segments/circles/guides/intersections/half-hinge lines with plane ownership (`frontend/src/domain/world/ProjectionPlane.ts:779-820`, `frontend/src/domain/world/ProjectionPlane.ts:842-875`, `frontend/src/domain/world/ProjectionPlane.ts:1109-1145`, `frontend/src/domain/world/ProjectionPlane.ts:1150-1157`, `frontend/src/domain/world/ProjectionPlane.ts:1410-1413`).
- It still has broad `any` realization context signatures (`frontend/src/domain/world/ProjectionPlane.ts:1428`, `frontend/src/domain/world/ProjectionPlane.ts:1436`, `frontend/src/domain/world/ProjectionPlane.ts:1578`, `frontend/src/domain/world/ProjectionPlane.ts:1600`, `frontend/src/domain/world/ProjectionPlane.ts:1689`, `frontend/src/domain/world/ProjectionPlane.ts:1747`).

## Current responsibility map

| Responsibility | Current evidence | Architectural concern |
| --- | --- | --- |
| Projection-plane realization value types | `ProjectionPlaneRealization2D` and `ProjectionPlaneRealization3D` live at the top of `ProjectionPlane.ts` (`frontend/src/domain/world/ProjectionPlane.ts:80-116`, `frontend/src/domain/world/ProjectionPlane.ts:126-162`). | Value types are independent of base-plane ownership and should be importable without pulling all plane classes/helpers. |
| Base plane abstraction and element ownership | `ProjectionPlane` extends `Element`, stores metadata, element maps, and realization caches (`frontend/src/domain/world/ProjectionPlane.ts:176-198`). | This is a stable core responsibility but currently shares a file with every construction helper and subclass. |
| Dependency side effects inside plane add/remove | `addPoint` accepts optional `world?: import('./World').World`, registers dependencies, and marks dirty (`frontend/src/domain/world/ProjectionPlane.ts:244-252`); similar patterns exist for removal and line/circle additions (`frontend/src/domain/world/ProjectionPlane.ts:292-293`, `frontend/src/domain/world/ProjectionPlane.ts:329-357`, `frontend/src/domain/world/ProjectionPlane.ts:395-423`). | The base plane owns collections but also knows enough about `World` to perform graph/reaction side effects. Wave 002 can introduce a narrower collection mutation context. |
| Construction helpers | Plane methods construct specific `Point`, `Line`, `Segment`, `Circle`, `Guide`, and hinge-line subclasses (`frontend/src/domain/world/ProjectionPlane.ts:45-65`, `frontend/src/domain/world/ProjectionPlane.ts:779-875`, `frontend/src/domain/world/ProjectionPlane.ts:938-1045`, `frontend/src/domain/world/ProjectionPlane.ts:1109-1145`, `frontend/src/domain/world/ProjectionPlane.ts:1150-1157`, `frontend/src/domain/world/ProjectionPlane.ts:1410-1413`). | Construction policy and cross-plane lookup/validation are mixed into the ownership abstraction. This is the largest split decision for Wave 002. |
| Fixed projection plane | `FixedProjectionPlane` stores predetermined forward matrices, has no dependencies, and computes realization matrices using base helpers (`frontend/src/domain/world/ProjectionPlane.ts:1533-1615`). | A focused module can expose fixed/base plane behavior without importing auxiliary-plane trace logic. |
| Auxiliary projection plane | `AuxiliaryProjectionPlane` stores trace IDs, computes matrices via `computeProjectionPlaneMatrices`, and logs debug messages during realization (`frontend/src/domain/world/ProjectionPlane.ts:1635-1797`). | Dynamic trace realization is distinct from fixed plane behavior and should be isolated with a typed realization context. Debug logging is a deletion candidate if not needed. |
| Weak realization context | Abstract and concrete `realize2D`/`realize3D` use `any` (`frontend/src/domain/world/ProjectionPlane.ts:1428`, `frontend/src/domain/world/ProjectionPlane.ts:1436`, `frontend/src/domain/world/ProjectionPlane.ts:1689`, `frontend/src/domain/world/ProjectionPlane.ts:1747`). | Weak central contract flagged in baseline remains current. |

## Import and test surface

Current direct imports of `ProjectionPlane.ts` are limited enough for a bounded implementation:

- `World.ts` imports `ProjectionPlane`, `ProjectionPlaneRealization2D`, `ProjectionPlaneRealization3D`, and `FixedProjectionPlane` from `./ProjectionPlane` (`frontend/src/domain/world/World.ts:92`).
- `AddAuxiliaryProjectionPlaneOp.ts` imports `AuxiliaryProjectionPlane` from the monolith and constructs it directly (`frontend/src/commands/operations/world/AddAuxiliaryProjectionPlaneOp.ts:21-24`, `frontend/src/commands/operations/world/AddAuxiliaryProjectionPlaneOp.ts:95-108`).
- `ToolArgumentCollector.ts` and `realizationCache.spec.ts` import `ProjectionPlane` type from the monolith (`architecture-audit/cycle-002-split-projection-plane-domain-god-module/validation/read-only-scout.stdout.log`).
- Several tests import `BaseProjectionPlane`, but current `ProjectionPlane.ts` does not export a `BaseProjectionPlane` class; the symbol only appears in comments and tests (`architecture-audit/cycle-002-split-projection-plane-domain-god-module/validation/symbol-surfaces.stdout.log`; `frontend/tests/unit/coordinateTransform.spec.ts:9`, `frontend/tests/unit/projectionPlane.spec.ts:9`, `frontend/tests/unit/projectionPlane.spec.ts:180-183`). This is likely stale test/type drift and must be handled deliberately during implementation.

Focused behavior coverage exists and should be preserved/updated:

- Plane transform tests in `frontend/tests/unit/projectionPlane.spec.ts` exercise P_H/P_V 2D transform matrix round-trips (`frontend/tests/unit/projectionPlane.spec.ts:16-178`).
- Plane element storage tests cover adding/removing points and realization caches (`frontend/tests/unit/projectionPlane.spec.ts:180-240`).
- Initialization tests verify fixed P_H/P_V plane creation, origin points, and half-hinge lines after `initializeWorld` (`frontend/tests/integration/worldInitialization.spec.ts:17-96`).
- Initialization operation tests cover fixed projection-plane operation behavior (`frontend/tests/unit/commands/initializationOps.spec.ts:183-229`).
- Guide/intersection factories and integration tests exercise plane helper behavior around guides and half-hinge-line sibling creation (`architecture-audit/cycle-002-split-projection-plane-domain-god-module/validation/read-only-scout.stdout.log`).

## Re-rank of remaining waves after Wave 001

No re-rank is required before Wave 002. The centrality order remains:

1. **Wave 002** remains next: the projection-plane god-module still carries core domain ownership and realization contracts.
2. **Wave 003** remains after Wave 002: duplicate store/workspace state should target the cleaned plane/domain shape, not the current monolith.
3. **Wave 004+** remain later: command/persistence and process dependencies should not be hardened before the domain plane modules and contracts are stabilized.

Wave 001 did introduce useful context for Wave 002: because initialization orchestration now lives in `initializeWorld`, fixed-plane construction can be split without preserving a `World.initialize` compatibility surface.

## Proceed / defer boundaries

Wave 002 should proceed, but stay bounded:

- Proceed with splitting the monolithic file into focused projection-plane domain modules and updating imports/tests.
- Proceed with deleting `any` from projection-plane realization context where the split touches it.
- Proceed with extracting element ownership/caches into a focused helper or module if this avoids copying the current base class wholesale.
- Do **not** attempt to solve all `World` facade, command operation, persistence, process-tree, rendering, or UI-tool coupling in this wave. Those remain planned later waves.
- Do **not** preserve a re-export barrel solely to hide the old monolith. A temporary `ProjectionPlane.ts` compatibility barrel would violate the Wave 002 delete priority unless a reviewer explicitly accepts it as transitional; the direct proposal below avoids it.
