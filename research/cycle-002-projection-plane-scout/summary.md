# Wave 002 ProjectionPlane Scout Summary

**Task:** `t1-scope-check-and-proposals`  
**Stage:** `cycle-002-fresh-scout-proposals`  
**Date:** 2026-05-25

## Findings

- Wave 002 premises still hold after Wave 001. `frontend/src/domain/world/ProjectionPlane.ts` remains a 1,797-line god-module.
- Wave 001 removed `World.initialize(commandStack)` and moved initialization orchestration to `frontend/src/application/world/initializeWorld.ts`, but it did not split `ProjectionPlane.ts` or fix projection-plane `any` realization contexts.
- Current `ProjectionPlane.ts` combines:
  - realization value classes,
  - base plane metadata/collection ownership,
  - element realization caches,
  - dependency/dirty side effects through optional `World` parameters,
  - point/line/segment/circle/guide/intersection/half-hinge construction helpers,
  - fixed projection plane implementation,
  - auxiliary projection plane trace realization logic.
- Direct import surface is manageable, but tests include stale `BaseProjectionPlane` imports even though current source does not export that symbol.

## Artifacts written

- `architecture-audit/cycle-002-split-projection-plane-domain-god-module/scope-check.md`
- `architecture-audit/cycle-002-split-projection-plane-domain-god-module/proposals/proposal-direct.md`
- `architecture-audit/cycle-002-split-projection-plane-domain-god-module/proposals/proposal-restructure.md`

## Recommendation

Proceed with Wave 002 without editing `wave-plan.md`. Prefer Proposal Direct for the implementation cycle; keep Proposal Restructure as the conceptual alternative if review decides plane construction helpers must move out of the entity in the same wave.
