# Round 01 Review — Cycle 026 Tool interaction read context and realization adapter seam

## Verdict

**BLOCKING ISSUES**

Cycle 026 remains correctly scoped and both proposals engage the real current seam, but `proposal-direct.md` is not yet safe to send to decision as written because one delete target overreaches the bounded wave and conflicts with the proposal's own stated scope guard. `proposal-restructure.md` is coherent as a fallback, but it is broader than needed for the current evidence and should not be preferred unless the direct proposal is corrected and later proves insufficient during implementation.

## Source-control and scope-boundary verification

- Review was planning-only. No production implementation was performed in this stage.
- Current source still shows the targeted seam at `frontend/src/application/appShell/RuntimeSession.ts:75`, where `invokeToolClick` injects raw `World` into tools.
- The tool contract still exposes the leak at `frontend/src/tools/ITool.ts:24` (`world: World`) and adjacent weak typing at `frontend/src/tools/ITool.ts:25,28-29,48`.
- `ArgumentCollectorTool` still depends on raw world for active-plane lookup, hit-result element lookup, and collection validation context at `frontend/src/tools/ArgumentCollectorTool.ts:162-216`.
- Current concrete tool use is bounded to read/realization behavior, not command mutation, including circle, 3D construction, projection-plane, parallel/perpendicular, and tangent tools.
- Broad dirty worktree context remains out of scope. The scout artifacts already documented unrelated dirty files in `frontend/src/domain/calculations/Intersections.ts` and `frontend/src/domain/processTree/ActionGroup.ts`; this review finds no justification to absorb them.
- Protected surfaces remain correctly out of scope unless a reviewed plan edit is raised: persistence schema/replay, ProjectService, backend/docs/debug/package-tooling churn, Drive/auth, broad domain realization redesign, command history / command producer redesign, and generic application-kernel work.

## Proposal scoring

### Proposal Direct — `proposal-direct.md`

1. **Advances target outcome?** — **Pass**
   - It directly deletes `ToolContext.world`, moves tool reads behind a runtime-owned port, preserves `RuntimeSession` as private `World` owner, and keeps command mutation flowing through `ToolCommandSink`.
2. **Improves architecture and code quality?** — **Pass with blocker below**
   - The main direction is correct and sharper than the restructure path.
   - It also targets adjacent weak typing (`paperToPlaneTransform`, `toolStore`) where touched.
3. **Respects no-backcompat / aggressive deletion?** — **Pass with blocker below**
   - It correctly rejects dual raw-world/read-port paths and compatibility wrappers.
4. **Avoids overfeaturism?** — **Borderline / blocker**
   - The proposal body is mostly narrow, but its DELETE list says: `Delete CanvasWorldReadPort raw domain collection returns and getProcessTree() exposure where selector/read-model methods replace them in this wave.`
   - That reaches beyond the scoped seam established in `scope-check.md` and the wave plan. Nothing in the current evidence shows `CanvasWorldReadPort.getProcessTree()` is part of the active tool interaction leak, and the direct proposal otherwise says canvas/three narrowing is only optional and only when directly adjacent.
5. **Risks / hidden regressions?** — **Pass with noted risk**
   - Biggest real risk is accidental creation of a renamed `World` facade.
   - Secondary risk is breaking tangent/projection-plane behavior if realization reads are not modeled explicitly enough.
6. **Validation sufficiency?** — **Pass**
   - The proposed validation set is strong and aligned with the validation runbook, including static scans, focused tests, full tests, build, e2e, and preview refresh.

### Proposal Restructure — `proposal-restructure.md`

1. **Advances target outcome?** — **Pass**
   - It would remove raw tool-world access and centralize runtime-local realization/query translation.
2. **Improves architecture and code quality?** — **Pass**
   - A shared application-owned adapter could reduce duplicated world-mirroring contexts across tools/canvas/three.
3. **Respects no-backcompat / aggressive deletion?** — **Pass**
   - It explicitly deletes old seams rather than wrapping them.
4. **Avoids overfeaturism?** — **Warning**
   - It is broader than current evidence requires and risks turning Wave 026 into a shared-adapter cleanup rather than a bounded deletion of the tool-world seam.
5. **Risks / hidden regressions?** — **Warning**
   - Simultaneously moving tools, canvas presentation, and three presentation increases rendering/interactivity regression surface.
   - The proposal itself correctly notes the risk of becoming a god adapter.
6. **Validation sufficiency?** — **Pass**
   - Validation is sufficient and appropriately expands focused tests for the adapter slices.

## Decision recommendation

- **Do not proceed to decision yet.**
- Preferred path remains **proposal-direct** after in-place correction.
- **proposal-restructure** should remain the fallback only if the corrected direct proposal cannot delete `ToolContext.world` without immediately recreating a hidden world facade or if implementation proves a shared runtime adapter is required.

## Required corrections before round 02

1. **Tighten the direct proposal's adjacent-adapter/delete claims to match the bounded wave.**
   - Remove or narrow the claim that this wave will delete `CanvasWorldReadPort` raw domain collection returns and `getProcessTree()` exposure unless the proposal supplies concrete current-source evidence that those specific methods are required for the tool interaction read-context split.
   - Reframe canvas/three adapter work as strictly optional, directly adjacent extraction/narrowing only where needed to support the tool read/realization port, not as an independent cleanup objective.
2. **Make the direct proposal's anti-facade guard more concrete.**
   - Add an explicit rule that every method on the new tool read/realization port must map to one or more current callers enumerated in the scout inventory, and that methods serving only canvas/three presentation stay out of the tool port.
3. **Clarify residuals that are intentionally out of scope.**
   - State plainly that `RuntimeSession` properties/process-tree realization reads, `CanvasToolController` world ownership, and any remaining presentation-local realization helpers may survive this wave if they are not required to remove raw tool-world access.

## Preferred decision after correction

If the direct proposal is corrected as above and no new scope expansion is introduced, it should be the recommended winner for Cycle 026 because it attacks the most central remaining leak with less risk than the restructure alternative.
