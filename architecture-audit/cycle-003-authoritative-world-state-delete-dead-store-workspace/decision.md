# Decision — Wave 003: Establish one authoritative world state and delete dead store/workspace paths

**Stage:** `cycle-003-decision`  
**Wave:** 003 — Establish one authoritative world state and delete dead store/workspace paths  
**Date:** 2026-05-25  
**Decision status:** review convergence complete; implementation may proceed only within the scope below.

## Evidence cited

This decision is based on the current Wave 003 artifact set:

- Scope check: `architecture-audit/cycle-003-authoritative-world-state-delete-dead-store-workspace/scope-check.md`
- Corrected direct proposal: `architecture-audit/cycle-003-authoritative-world-state-delete-dead-store-workspace/proposals/proposal-direct.md`
- Corrected restructure proposal: `architecture-audit/cycle-003-authoritative-world-state-delete-dead-store-workspace/proposals/proposal-restructure.md`
- Primary review and same-stage B1 follow-up recheck: `architecture-audit/cycle-003-authoritative-world-state-delete-dead-store-workspace/reviews/round-01-review.md`
- Wave order and target outcome: `architecture-audit/wave-plan.md`, Wave 003

## Convergence verdict

Review convergence is complete with **NO BLOCKING ISSUES**.

The round-01 review initially raised one blocker, B1: both proposals needed to specify that `frontend/tests/e2e/dynamic-planes.spec.ts` must be deleted rather than rewritten through a new debug-injection path, because the spec depends on the broken `window.getWorld()` / `worldStore.world` surface that this wave removes. Both proposals were corrected in place. The same reviewer rechecked the corrected artifacts and recorded:

- Proposal Direct: B1 **RESOLVED**.
- Proposal Restructure: B1 **RESOLVED**.
- New blocker check: no new blocking issues.
- Updated verdict: **NO BLOCKING ISSUES**.
- Recommended proposal: **Proposal Direct**.

The remaining review warnings are accepted as implementation-phase residual items, not blockers:

- W1: stale `Workspace2D` / `ElementRenderer` TODO comments in e2e specs must be handled during the delete sweep.
- W2: only applies if Proposal Restructure is selected, so it is not applicable to the selected direct implementation except as a reminder not to introduce a query boundary in this wave.
- W3: `DependencyGraph` remains used by domain `World` / `DependencyService` paths after `worldStore.ts` deletion, so deleting `worldStore.ts` does not orphan the domain dependency graph.

## Selected implementation proposal

Wave 003 will implement **Proposal Direct — Delete legacy store/workspace geometry path**.

Rationale:

1. It matches the Wave 003 target outcome exactly: `World` and its projection planes remain the only authoritative geometric state owners, while the duplicate Pinia `worldStore` geometry maps and dead workspace path are deleted.
2. It materially improves architecture and code quality by removing a parallel structural geometry model (`ElementTypes.ts`), broken debug helpers that read a non-existent `worldStore.world`, dead Vue components, obsolete composables with placeholder geometry, and tests/fixtures that only preserve the deleted path.
3. It respects the no-backcompat / aggressive-deletion priority: no `worldStore.world` shim, no `LegacyElementTypes`, no `Workspace2D` re-export, no adapter store, and no e2e rewrite through a replacement debug-injection path.
4. It avoids overfeaturism by not introducing the read-model/query boundary from Proposal Restructure. That boundary may be reconsidered in a later rendering-selector wave, but Wave 003 should stay focused on deleting duplicate state ownership and dead surfaces.

## Rejected/deferred alternative

**Proposal Restructure — Promote authoritative read-model boundary before deleting store/workspace path** is rejected for Wave 003 implementation and deferred.

Reason:

- The proposal is architecturally plausible, but it introduces a new `worldViewQueries.ts` / `worldReadModel.ts` boundary before the wave plan has reached the rendering-selector and tool-controller waves.
- The round-01 review found the query boundary risks pulling Wave 007 rendering selectors and possibly Wave 006 tool-controller work forward.
- The current Wave 003 target can be achieved cleanly through deletion and import-boundary tests without designing a new read-model abstraction.
- Proposal Restructure itself recommends Proposal Direct unless active `SvgCanvas`/app traversal requires a tiny query boundary; the review did not find such a requirement for this wave.

The read-model/query-boundary concept may be reconsidered during Wave 007 or a reviewed wave-plan edit if later evidence shows it is needed.

## Exact next implementation scope

The implementation stage must follow Proposal Direct and is limited to the following scope.

### Files/modules to update

Update only the active source and tests necessary to remove references to the deleted legacy state path:

- `frontend/src/main.ts`
  - Delete development helpers that dynamically import `./stores/worldStore` or read `worldStore.world`.
  - Do not replace them with a new debug helper, global `World` accessor, or compatibility shim in this wave.
- Architecture tests under `frontend/tests/unit/architecture/**`
  - Add or update a boundary test forbidding active source/test imports of the deleted store/workspace/type paths.
- E2e specs that contain stale `Workspace2D` / `ElementRenderer` TODO comments or references to `getWorld`, `worldStore`, or `useWorldStore`
  - Delete `frontend/tests/e2e/dynamic-planes.spec.ts` outright.
  - Remove or rewrite stale TODO comments in `frontend/tests/e2e/basic-construction.spec.ts`, `frontend/tests/e2e/distance-transport.spec.ts`, and `frontend/tests/e2e/infeasibility.spec.ts` so they do not reference `Workspace2D` / `ElementRenderer` integration that this wave deletes.
  - Do not rewrite dynamic-plane coverage through console injection or another debug-only API. Future dynamic-plane e2e coverage, if needed, must be UI-driven in a later wave.

### Implementation behavior requirements

After implementation:

- No source can create, mutate, or read authoritative geometry through Pinia `worldStore`.
- Active geometry ownership remains `World → ProjectionPlane → Element2D` plus existing domain-managed 3D elements, guides, dependency/process services, and realization caches.
- Existing active app behavior should remain user-visible equivalent: `App.vue` provides the `World`; `SvgCanvas.vue`, `PaperService`, tool/command paths, projection planes, selection/delete, active-plane behavior, undo/redo, and parametric updates remain the active path.
- Broken development-only `window.dumpDependencies`, `window.traceInvalidation`, and `window.getWorld` helper surfaces backed by `worldStore.world` are removed, not repaired.

## Aggressive DELETE list for implementation

The implementation must delete all of the following, with no compatibility barrels, re-export shims, adapter stores, or replacement debug-injection paths:

- `frontend/src/components/workspace/Workspace2D.vue`
- `frontend/src/components/workspace/ElementRenderer.vue`
- `frontend/src/composables/useSnapping.ts`
- `frontend/src/composables/useElementGeometry.ts`
- `frontend/src/stores/worldStore.ts`
- `frontend/src/components/dialogs/ElementPropertiesDialog.vue`
- `frontend/src/components/panels/ElementGroup.vue`
- `frontend/src/services/ValidationService.ts`
- `frontend/tests/integration/formatUtils.integration.spec.ts`
- `frontend/src/types/ElementTypes.ts`
- `frontend/tests/e2e/dynamic-planes.spec.ts`
- Any tests, fixtures, comments, or TODOs that only preserve the deleted store-backed `Workspace2D` / `ElementRenderer` / `ElementTypes` path, including stale `Workspace2D` references in e2e specs touched by the delete sweep.

The implementation must also remove all active imports/usages of these deleted symbols/paths:

- `worldStore`
- `useWorldStore`
- `Workspace2D`
- `ElementRenderer`
- `ElementTypes`
- `useSnapping`
- `useElementGeometry`
- `window.getWorld` and any debug helper that exists only to expose `worldStore.world`

## Explicit non-goals

The implementation must not perform any of the following without a new reviewed mini-cycle:

- Introduce a `worldViewQueries.ts`, `worldReadModel.ts`, or equivalent query/read-model abstraction.
- Extract rendering selectors or renderer DTOs from `SvgCanvas.vue`, `PaperService`, `SVGRenderer`, `RenderService`, or `Paper`.
- Move tool command construction into new use-cases/tool controllers.
- Add a replacement global debug API for direct `World` access.
- Preserve any deleted file through a compatibility alias, re-export barrel, adapter store, or local shim.

## Validation requirements for implementation stage

Capture full stdout/stderr logs under:

`architecture-audit/cycle-003-authoritative-world-state-delete-dead-store-workspace/validation/`

Minimum Wave 003 checks:

1. Static deletion checks:
   - `test ! -e frontend/src/components/workspace/Workspace2D.vue && echo deleted`
   - `test ! -e frontend/src/components/workspace/ElementRenderer.vue && echo deleted`
   - `test ! -e frontend/src/stores/worldStore.ts && echo deleted`
   - `test ! -e frontend/src/composables/useSnapping.ts && echo deleted`
   - `test ! -e frontend/src/composables/useElementGeometry.ts && echo deleted`
   - `test ! -e frontend/src/types/ElementTypes.ts && echo deleted`
   - `test ! -e frontend/src/components/dialogs/ElementPropertiesDialog.vue && echo deleted`
   - `test ! -e frontend/src/components/panels/ElementGroup.vue && echo deleted`
   - `test ! -e frontend/src/services/ValidationService.ts && echo deleted`
   - `test ! -e frontend/tests/integration/formatUtils.integration.spec.ts && echo deleted`
   - `test ! -e frontend/tests/e2e/dynamic-planes.spec.ts && echo deleted`
2. Forbidden import/reference checks:
   - `grep -R "worldStore\|useWorldStore\|Workspace2D\|ElementRenderer\|ElementTypes\|useSnapping\|useElementGeometry" -n frontend/src frontend/tests || true` and review every remaining match.
   - `grep -n "getWorld\|worldStore\|useWorldStore" frontend/tests/e2e/*.spec.ts || true` and confirm zero matches after deleting `dynamic-planes.spec.ts` and removing debug-helper references.
3. Focused Vitest:
   - architecture boundary test forbidding the deleted imports;
   - `frontend/tests/integration/worldInitialization.spec.ts`;
   - `frontend/tests/unit/projectionPlane.spec.ts`;
   - `frontend/tests/unit/domain/realizationCache.spec.ts`;
   - focused tests discovered during implementation for active selection/delete, active-plane, Paper/hit-test, tool construction, parametric update, and undo/redo behavior touched by this wave.
4. Mandatory cadence:
   - `npm run lint`
   - `npm run lint --workspace=frontend`
   - focused Vitest commands above
   - `npm run test`
   - backend tests/build if root scripts still skip an active backend workspace
   - `npm run build`
   - `npm run build --workspace=frontend`
   - backend build if root scripts still skip an active backend workspace
   - `npm run test:e2e --workspace=frontend`
   - live preview refresh bound to `0.0.0.0` and a reachability probe
5. Live behavior checks through Playwright/manual preview when available:
   - construct a point and a segment/line;
   - exercise guide/intersection-adjacent behavior where available;
   - switch active plane;
   - select and delete;
   - undo/redo;
   - verify a parametric move updates dependents;
   - verify the refreshed preview responds.

If pre-existing repository validation debt remains, the implementation log must classify it explicitly and distinguish it from Wave 003-attributable failures. The static deletion/import checks and focused tests for touched active behavior must pass for this wave to be accepted.

## Accepted residual risks

- **Stale e2e TODO sweep risk:** Some e2e specs contain comments referring to `Workspace2D` / `ElementRenderer`. The implementation must proactively remove or rewrite those references as part of the delete sweep; any missed reference is an implementation defect, not an accepted architectural residue.
- **Pre-existing validation debt:** Prior waves documented missing lint/build tooling issues and malformed legacy e2e specs. These may continue to affect full cadence commands. They must be logged and classified, while Wave 003 must not introduce new attributable failures.
- **Debug workflow removal:** Developer console helpers that previously attempted to expose `worldStore.world` will disappear. This is accepted because the helpers are already broken and preserve the exact duplicate-state surface this wave deletes.
- **Future read-model work deferred:** Active `SvgCanvas` / rendering traversal may still need a formal selector/read-model boundary later. That is intentionally deferred to Wave 007 or a reviewed plan edit so Wave 003 remains a focused authoritative-state deletion wave.

## Deviation rule

No implementation may deviate from this decision or from Proposal Direct’s selected scope without a new mini-cycle: a delta proposal, one bounded review round, and sign-off before changing implementation direction.

This decision authorizes the next stage, `cycle-003-implement-authoritative-world-state-delete-dead-store-workspace`, to implement Proposal Direct exactly within the scope above.
