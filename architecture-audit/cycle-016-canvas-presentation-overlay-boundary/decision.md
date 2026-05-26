# Cycle 016 Decision — Canvas presentation read ports and overlay interaction boundary

## Decision status

- **Cycle:** `cycle-016-canvas-presentation-overlay-boundary`
- **Decision stage:** `cycle-016-decision`
- **Source implementation in this stage:** none
- **Review convergence:** complete
- **Blocking issues before implementation:** none
- **Recommended next stage:** `cycle-016-implement-canvas-presentation-overlay-boundary`

Cycle 016 may proceed to implementation because review round 02 explicitly returned **NO BLOCKING ISSUES** after the corrected wave-plan entry and revised proposal relationship were reviewed. This decision is limited to selecting the implementation path and binding constraints; it does not authorize source edits during the decision stage.

## Inputs inspected

Decision inputs inspected for this stage:

- `architecture-audit/wave-plan.md`, especially `Wave 016 — Canvas presentation read ports and overlay interaction boundary`
- `architecture-audit/cycle-016-canvas-presentation-overlay-boundary/scope-check.md`
- `architecture-audit/cycle-016-canvas-presentation-overlay-boundary/proposals/proposal-direct.md`
- `architecture-audit/cycle-016-canvas-presentation-overlay-boundary/proposals/proposal-restructure.md`
- `architecture-audit/cycle-016-canvas-presentation-overlay-boundary/reviews/round-02-review.md`
- `architecture-audit/cycle-016-canvas-presentation-overlay-boundary/corrections-round-01-note.md`
- bounded workspace inspection logs created for this decision stage:
  - `architecture-audit/cycle-016-canvas-presentation-overlay-boundary/decision-status.stdout`
  - `architecture-audit/cycle-016-canvas-presentation-overlay-boundary/decision-diff-stat.stdout`

The bounded status/diff inspection was used only to confirm the relevant Cycle 016 artifact area and avoid broad unrelated workspace churn. No source, test, package, runtime configuration, environment, provider, or secret files were read or modified for this decision.

## Wave-plan correction and review convergence

Round 01 identified that Cycle 016 needed an explicit post-Wave-015 wave-plan entry before implementation. Corrections added `Wave 016 — Canvas presentation read ports and overlay interaction boundary` to `architecture-audit/wave-plan.md` and revised both proposals to state their relationship to that bounded entry.

Review round 02 rechecked the round-01 blockers and marked them resolved:

1. Missing Wave 016 wave-plan entry — resolved.
2. Proposal-to-wave-plan relationship unclear — resolved.
3. Restructure anti-god-module constraints under-specified — resolved.
4. Scout-stage authority note preservation — resolved.

Review round 02 then returned **NO BLOCKING ISSUES** and recommended `cycle-016-decision`. Therefore this decision records that Cycle 016 is converged and unblocked for implementation.

## Selected implementation path

**Selected path:** `architecture-audit/cycle-016-canvas-presentation-overlay-boundary/proposals/proposal-direct.md`

### Rationale

The direct proposal is selected because it is the strongest match for the corrected bounded Wave 016 entry. It addresses the currently evidenced central defect surface without broadening into a new shared presentation platform:

- narrow canvas presentation read ports instead of full mutable `World` selector APIs;
- deletion of active `any` seams in canvas presentation helper signatures;
- explicit ownership for projected-3D-on-2D selection outside the general 2D selector loop;
- deliberate, inventoried, test-covered overlay pointer ownership;
- proof-based deletion or narrowing of obsolete `Paper.ts` query responsibilities;
- no command, persistence, backend, package/tooling, app-shell, broad rendering, broad 3D scene, or docs/spec redesign.

Review round 02 scored the direct proposal **Strong** for advancing the target outcome, architecture/code quality, no-backcompat deletion, avoiding overfeaturism, and validation sufficiency, with only manageable overlay-interaction risk.

## Rejected/deferred alternative

**Rejected for Cycle 016 implementation:** `architecture-audit/cycle-016-canvas-presentation-overlay-boundary/proposals/proposal-restructure.md`

The restructure proposal is not selected for this implementation cycle. It is sufficiently constrained to remain a documented alternative, but it deliberately broadens the wave into a shared 2D/3D presentation snapshot layer. Review round 02 judged it higher risk and broader than the bounded Wave 016 scope.

The implementation stage must not partially incorporate the shared snapshot architecture. If implementation evidence proves a shared presentation snapshot is necessary, the implementer must stop and trigger a reviewed plan-edit or delta mini-cycle before broadening. No dual full-`World` plus snapshot/read-port API may be left behind.

## Bound implementation scope

The implementation stage is authorized to touch only the following surfaces, and only as needed to execute the selected direct proposal:

- `frontend/src/application/canvasPresentation/CanvasPresentationController.ts`
- `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts`
- `frontend/src/application/canvasPresentation/CanvasPresentationModel.ts`
- `frontend/src/application/canvasPresentation/CanvasInteractionQuery.ts`
- `frontend/src/application/canvasPresentation/CanvasVisibilityPolicy.ts`
- `frontend/src/application/canvasPresentation/CanvasStylePolicy.ts`
- a new narrow read-port module such as `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts`
- a new projected-3D-on-2D adapter such as `frontend/src/application/canvasPresentation/Projected3DCanvasSelector.ts`
- `frontend/src/application/threePresentation/*` only where shared overlay/projection DTO ownership is directly required
- `frontend/src/rendering/threeView/*` only where explicit pointer-event/overlay boundary behavior is directly required
- `frontend/src/components/workspace/SvgCanvas.vue`
- `frontend/src/components/panels/ThreeView.vue`
- `frontend/src/domain/presentation/Paper.ts` only if static usage proves mutable/spatial-query responsibilities are obsolete
- focused unit tests under current canvas/three presentation test locations
- current-contract e2e or Playwright tests only if overlay/canvas user-visible behavior changes
- the Cycle 016 implementation log and validation logs under `architecture-audit/cycle-016-canvas-presentation-overlay-boundary/`

## Required deletes and narrowing

Implementation must aggressively delete obsolete surfaces rather than preserve compatibility paths:

- Delete `CanvasPresentationController.buildModel(world: World, ...)` or equivalent full-`World` canvas selector APIs once the reviewed read port exists.
- Delete `CanvasPresentationSelector` helper signatures that use `any`, including primitive/kind helper and plane-transform seams.
- Delete direct projected-3D rendering loops from `CanvasPresentationSelector` when moved to a named projected-3D canvas selector/adapter.
- Delete obsolete selector tests that instantiate concrete `World` only to inspect traversal internals; replace them with read-port/DTO tests.
- Delete mutable/spatial-query responsibilities from `frontend/src/domain/presentation/Paper.ts` only after static usage and focused tests prove `CanvasInteractionQuery` is the active query owner.
- Delete e2e workarounds that only avoid overlay interception if overlay input ownership changes; replace them with current behavior contracts.
- Delete any compatibility wrapper, dead export, dual full-`World`/read-port path, or broad facade introduced during transition.

## Mandatory pre-edit evidence for implementation

Before source edits, the implementation stage must capture static scans under the Cycle 016 validation/evidence area for:

- full-`World` canvas presentation APIs and call sites;
- `CanvasPresentationSelector` `any` seams;
- projected-3D loops inside the 2D selector;
- `Paper.ts` query/mutable collection usage;
- current 3D overlay pointer handlers and CSS/event ownership.

These scans decide what can be deleted or changed. `Paper.ts` query deletion and overlay pointer changes are proof-required items, not assumptions.

## Mandatory validation requirements

The implementation stage must capture full stdout/stderr to stable files under `architecture-audit/cycle-016-canvas-presentation-overlay-boundary/validation/` for every command it runs.

Required validation gates:

1. static pre/post scans for the presentation seams listed above;
2. focused Vitest for changed canvas presentation selector/controller/read-port/query modules and any three-presentation shared DTO/overlay boundary;
3. root lint where defined;
4. frontend lint where defined;
5. full root Vitest where defined;
6. full frontend Vitest where defined;
7. root build where defined;
8. frontend build;
9. root/frontend Playwright e2e if overlay/canvas interaction or other user-facing behavior changes, or an explicit implementation-log justification if not run;
10. live preview refresh bound to `0.0.0.0:5173`;
11. HTTP reachability probe for the refreshed preview;
12. Playwright/live browser check for the canvas area currently affected by the 3D overlay.

The wave is rejected if any required gate fails for reasons attributable to the change, if validation output is not captured to stable logs, or if e2e/live Playwright is skipped without the required explicit justification.

## Forbidden repairs and protected out-of-scope surfaces

The implementation stage must not:

- alter command construction, command stack, undo/redo, operation descriptors, or persistence contracts;
- alter backend files or resurrect backend validation/package surfaces;
- change package manager metadata, root/frontend package scripts, Vite/Vitest/Playwright configuration, TypeScript configuration, or dependency versions;
- redesign the app shell, project lifecycle, Drive/local persistence, keyboard routing, or stores outside direct read-only consumption needed by the selected proposal;
- perform a broad SVG renderer rewrite or broad 3D scene extraction;
- introduce a shared presentation snapshot layer, broad presentation facade, policy registry, or god-module unless a reviewed mini-cycle first broadens the wave;
- preserve old selector APIs through shims or parallel paths;
- mine or cite stale discarded audit cycles as evidence;
- read, copy, log, or cite secret/config contents, including `.saivage/saivage.json`, auth profiles, provider configs, env files, Drive credentials, tokens, or shell history.

## Stop conditions

Implementation must stop and return to Manager for a reviewed plan-edit or delta mini-cycle if any of the following occur:

1. The selected direct read-port design cannot remove full-`World` canvas selector APIs without also redesigning both 2D and 3D presentation traversal around a shared snapshot.
2. A read-port or adapter starts absorbing style, visibility, projection, interaction, rendering, and traversal policy into one broad god-module.
3. Overlay behavior cannot be made intentional without redesigning the 3D scene interaction model or app-shell layout.
4. `Paper.ts` query deletion cannot be proven by static usage and focused tests.
5. Fixing the presentation boundary requires command, persistence, backend, package/tooling, broad app-shell, or broad test-suite rewrites.
6. Any mandatory validation gate cannot be run or fails for a change-attributable reason that cannot be corrected within the selected scope.

## Residual risks accepted for implementation

- Overlay pointer changes may affect legitimate 3D interactivity; implementation must inventory handlers before any CSS/event behavior change and validate with e2e/live browser evidence.
- Narrow read ports can still become a broad presentation facade if they accumulate unrelated policy; implementation must keep traversal/input data separate from style, visibility, projection, interaction, and render adapters.
- `Paper.ts` may still have active responsibilities; deletion is only authorized after proof, otherwise leave a documented residual for a future wave.
- Visual output is expected to remain equivalent, but presentation boundary changes are near rendering and hit-testing; focused tests plus e2e/live checks are mandatory where behavior may shift.

## Final recommendation

Proceed to `cycle-016-implement-canvas-presentation-overlay-boundary` using `proposal-direct.md` exactly within the constraints above. No blockers remain before implementation. The broader restructure proposal is deferred unless future evidence justifies a reviewed scope-broadening mini-cycle.
