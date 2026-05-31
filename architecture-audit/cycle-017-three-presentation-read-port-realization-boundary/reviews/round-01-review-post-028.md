# Cycle 017 Review Round 01 (post-Wave-028)

## Scope of review

Reviewed the refreshed Wave 017 scope-check and both proposals against the stage contract, current source evidence, Wave 028 closure evidence, and current path-scoped source-control state. This was a review-only pass; no production source/test/package/tooling changes were made.

Artifacts inspected:

- `architecture-audit/cycle-017-three-presentation-read-port-realization-boundary/scope-check.md`
- `architecture-audit/cycle-017-three-presentation-read-port-realization-boundary/proposals/proposal-direct.md`
- `architecture-audit/cycle-017-three-presentation-read-port-realization-boundary/proposals/proposal-restructure.md`
- `architecture-audit/cycle-017-three-presentation-read-port-realization-boundary/critique/round-01-critique.md`
- `architecture-audit/wave-plan.md` (Wave 017 / Wave 018 entries via targeted scan)
- `architecture-audit/cycle-028-canvas-projection-dto-selectors/implementation-log.md`
- `architecture-audit/cycle-028-canvas-projection-dto-selectors/next-wave-recommendation.md`
- `frontend/src/application/threePresentation/ThreeWorldReadPort.ts`
- `frontend/src/application/threePresentation/ThreePresentationSelector.ts`
- `frontend/src/application/threePresentation/ProjectionPlane3DSelector.ts`
- `frontend/src/application/threePresentation/PlanarElement3DSelector.ts`
- `frontend/src/application/threePresentation/ReconstructedElement3DSelector.ts`
- `frontend/src/application/threePresentation/Guide3DSelector.ts`
- `frontend/src/application/threePresentation/Hinge3DSelector.ts`
- `frontend/src/components/panels/ThreeView.vue`
- `frontend/src/application/appShell/RuntimeSession.ts`
- `frontend/src/application/appShell/RuntimeViewPorts.ts`
- `frontend/src/application/canvasPresentation/Projected3DCanvasReadPort.ts`
- `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts`
- `frontend/tests/unit/application/threePresentation/threePresentationConcernSelectors.spec.ts`
- `frontend/tests/unit/application/threePresentation/threePresentationSelector.spec.ts`
- `frontend/tests/unit/components/panels/threeViewShellBoundary.spec.ts`
- `frontend/tests/e2e/current-ui-contract.spec.ts`

## Source-control / protected-scope reconciliation

Path-scoped status and diff were checked first.

Findings:

- The reviewed Wave 017 proposal files are present and this review remains pre-implementation.
- Unrelated dirty source files remain present and protected:
  - `frontend/src/domain/calculations/Intersections.ts`
  - `frontend/src/domain/processTree/ActionGroup.ts`
- Those unrelated source edits were confirmed in scoped diffstat and are **not** incorporated into either proposal and must not be reverted by Wave 017 work.
- Additional dirty/untracked files exist under the Cycle 017 audit directory, including older validation/review artifacts. They are documentation noise, not implementation scope.
- No evidence in the proposals widens scope into protected surfaces: persistence/schema/replay, backend/docs/specs/package tooling, Drive/auth, command history/producer redesign, generic app-kernel facades, UI feature work, scene-host/OrbitControls behavior, or broad domain rewrite.

## Current source assessment

The refreshed scope-check is materially correct on the main architectural point:

- `ThreeView.vue` consumes `threePresentationPort.getReadPort()` and refreshes runtime with `{ readPort, displayOptions, selectedIds }`; it does not inject `World`.
- `RuntimeSession.threePresentationPort()` creates `createThreeWorldReadPort(this.world)` at the runtime boundary.
- `ThreeWorldReadPort.ts` still concentrates multiple concerns: projection planes, planar 2D-on-3D elements, reconstructed elements, guides/intersections, hinges, and local realization-context assembly.
- `ThreePresentationSelector.ts` still passes one broad `readPort` to all concern selectors.
- `ProjectionPlane3DSelector.ts` still takes the full `ThreeWorldReadPort`; the other selectors already narrow usage with `Pick<ThreeWorldReadPort, ...>`.
- `threePresentationConcernSelectors.spec.ts` and `threePresentationSelector.spec.ts` still rely on broad `as any` seams consistent with the scope-check’s stated cleanup target.
- `threeViewShellBoundary.spec.ts` and `current-ui-contract.spec.ts` still encode the protected overlay/pointer boundary that Wave 017 must preserve.

The relationship to Wave 028 is also represented correctly: canvas public read-port seams were reduced to behavior-sized methods, while `ThreeWorldReadPort` remains the broadest active presentation adapter residual.

## Proposal scoring

### Proposal Direct — Decompose ThreeWorldReadPort into behavior-sized 3D presentation read ports

1. **Advances Wave 017 target outcome:** **Pass**
   - Directly targets the actual remaining residual after Wave 028: the broad `ThreeWorldReadPort` and selector dependency shape.
   - Aligns with current source, not stale pre-Wave-028 assumptions.

2. **Improves architecture/code quality:** **Pass**
   - Replaces one god-interface/module with concern-owned read ports matching existing selector families.
   - Clarifies ownership between runtime boundary, adapters, selectors, and tests.

3. **Respects no-backcompat / aggressive deletion:** **Pass**
   - Explicitly deletes broad selector dependencies, `Pick<ThreeWorldReadPort,...>` stopgaps, touched broad `as any` seams, and transitional wrappers.
   - Correctly refuses compatibility layers.

4. **Avoids overfeaturism:** **Pass with caution**
   - The proposal explicitly excludes scene-host/UI/persistence/tooling/command overreach.
   - The only area needing enforcement is the optional shared realization-context helper; it must stay tiny or be rejected back to Wave 018.

5. **Introduces new risks or hidden regressions:** **Pass with manageable risk**
   - Main risks are hidden cosmetic splitting, DTO drift, or accidental reintroduction of a broad aggregate under a new name.
   - The proposal acknowledges pointer-boundary protection and Wave 025-028 invariants.

6. **Validation sufficiency:** **Pass**
   - Validation plan covers the required scoped status/diff, static scans, focused tests, lint, full tests, build, e2e, preview refresh, and explicit pointer-boundary evidence.

### Proposal Restructure — Test whether the real fix belongs in the domain realization-context boundary

1. **Advances Wave 017 target outcome:** **Conditional / fallback only**
   - Useful as a stop-path if Wave 017 decomposition proves impossible without lower-contract changes.
   - Does not by itself advance Wave 017 as effectively as Proposal Direct.

2. **Improves architecture/code quality:** **Potentially yes, but only if triggered by real lower-boundary evidence**
   - A reviewed Wave 018 plan-edit could be correct if realization contracts are the true blocker.
   - Premature selection would skip a currently available bounded cleanup.

3. **Respects no-backcompat / aggressive deletion:** **Pass**
   - Correctly prefers deletion of duplicated factories/contracts over wrappers if Wave 018 becomes necessary.

4. **Avoids overfeaturism:** **Mixed**
   - The document itself is disciplined, but the underlying path carries materially higher overreach risk than Proposal Direct.

5. **Introduces new risks or hidden regressions:** **Higher risk than Direct**
   - Domain realization contract changes would broaden validation burden across canvas, three presentation, and domain semantics.

6. **Validation sufficiency:** **Pass for fallback path**
   - Validation expectations are adequate if this becomes a reviewed Wave 018/domain-realization effort.

## Review conclusions on required topics

### ThreeWorldReadPort broad adapter responsibilities

Confirmed. `ThreeWorldReadPort.ts` remains too broad and is the correct residual for this wave. It currently owns read-model DTO families, classification, selected-guide handling, guide-intersection aggregation, hinge traversal, and realization-context assembly in one module.

### Realization-context ownership

The proposals handle this appropriately if enforced strictly:

- Wave 017 may keep a local helper or introduce a tiny shared typed factory only.
- If the implementation needs to alter `ProjectionElementRealizationContext` / `Element3DRealizationContext` semantics or widen a shared helper into a facade, that is no longer Wave 017 and must bounce to a reviewed Wave 018 plan edit.

### DTO families / classification logic

Proposal Direct is appropriately bounded to relocate DTO-family construction and classification into smaller concern adapters rather than selectors or generic shared facades.

### ThreeView consumption

Current `ThreeView.vue` already consumes only the runtime port/read-port seam. Both proposals correctly keep `ThreeView.vue` and `ThreeViewRuntime` mechanically aligned only, with no behavior/layout/pointer changes.

### Relation to Projected3DCanvasReadPort / Wave 028 pattern

Proposal Direct uses the right comparison point: behavior-sized public ports with localized traversal inside adapter modules. It does not propose moving traversal back into selectors or reintroducing canvas public raw seams.

### Whether Proposal Direct is bounded enough

Yes. Proposal Direct is bounded enough **provided** the decision binds two implementation constraints:

1. No broad replacement aggregate that is architecturally equivalent to today’s `ThreeWorldReadPort` may survive under a new name.
2. Any shared realization helper must remain a tiny typed context factory only; otherwise implementation must stop and request the Wave 018 path.

### Whether Proposal Restructure requires a Wave 018 plan edit before implementation

Yes, if triggered. Proposal Restructure is appropriate only as the explicit stop condition and requires a reviewed plan-edit / Wave 018 path before domain-contract implementation work.

## Wave 025-028 invariant check

No proposal violation found.

Both proposals preserve the required invariants:

- no raw Vue/component `World` injection,
- no generic `RuntimeWorld` / `WorldReadModel` / app-kernel facade,
- no reintroduction of canvas public raw getters or public realization seams deleted in Wave 028,
- no scene-host or overlay behavior change,
- no broad command/persistence rewrite.

## 3D overlay pointer-boundary requirement

Adequately protected.

Evidence remains in:

- `frontend/tests/unit/components/panels/threeViewShellBoundary.spec.ts`
- `frontend/tests/e2e/current-ui-contract.spec.ts:89-117`
- Wave 028 implementation/closure logs

Both proposals explicitly preserve this risk boundary and require e2e evidence in future validation.

## Decision recommendation

**No blocking issues for round 01.**

Recommend the decision stage proceed with:

- **Preferred proposal:** `proposal-direct.md`
- **Fallback/stop-path only:** `proposal-restructure.md`

Decision-stage considerations to bind explicitly:

1. Select Proposal Direct only as a bounded adapter decomposition wave, not as a generic presentation/domain facade exercise.
2. Require named concern ports to replace full `ThreeWorldReadPort` selector dependencies, especially in `ProjectionPlane3DSelector` and `ThreePresentationSelector` orchestration.
3. Forbid retention of dual broad/sliced read-port paths or compatibility wrappers.
4. Forbid any shared realization helper larger than a typed `World`→realization-context factory; if that boundary is exceeded, stop and route through the reviewed Wave 018 plan-edit path before implementation.
5. Preserve the Wave 025-028 invariants and require explicit validation evidence for the 3D overlay pointer-boundary test.
6. Keep unrelated dirty `Intersections.ts` / `ActionGroup.ts` changes protected and untouched.

## Residual non-blocking observations

- The current Cycle 017 directory still contains stale review/validation files from prior attempts; implementation and validation should continue relying on path-scoped status/diff to avoid confusion.
- The synthesized critique approved the refreshed proposal set, and this review agrees with that conclusion.
