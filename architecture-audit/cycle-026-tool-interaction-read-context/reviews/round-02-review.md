# Round 02 Review — Cycle 026 Tool interaction read context and realization adapter seam

## Verdict

**NO BLOCKING ISSUES**

The round-01 blockers in `proposal-direct.md` are resolved. The corrected direct proposal is now sufficiently bounded, evidence-based, and aligned with Wave 026’s target outcome to proceed to decision. `proposal-restructure.md` remains a coherent fallback, but it is still broader than necessary for the current seam and should not be preferred unless implementation proves the direct path would recreate a hidden world facade or requires broader shared-adapter extraction.

## Source-control and no-implementation verification

- Review was planning-only. No production implementation was performed in this stage.
- Targeted production files still show the current seam exactly where the proposals cite it:
  - `frontend/src/application/appShell/RuntimeSession.ts:75` still injects raw `World` into `tool.handleClick`.
  - `frontend/src/tools/ITool.ts:10-25` still imports and exposes `world: World`.
  - `frontend/src/tools/ArgumentCollectorTool.ts:162-216` still uses raw world for active-plane lookup, hit-result element lookup, and collection validator context.
  - `frontend/src/types/ToolArgumentCollector.ts:156-160` still exposes `CollectionContext.world`.
- `git diff` for the reviewed production paths is empty; no source implementation slipped into this review stage.
- This review did not inspect or read protected secret/config files.

## Round-01 blocker resolution check

### 1. Overreaching `CanvasWorldReadPort` / `getProcessTree()` delete claims

**Resolved.**

`proposal-direct.md` now explicitly narrows adjacent adapter work:

- Current evidence states that `CanvasWorldReadPort` / `ThreeWorldReadPort` duplication is adjacent, but raw collection returns and `getProcessTree()` are **not prerequisites** for deleting `ToolContext.world`.
- The target outcome now says canvas/three adapters remain unchanged unless a directly adjacent type/extraction is required for the tool-context split.
- The files-to-change section marks `CanvasWorldReadPort.ts` and `ThreeWorldReadPort.ts` as **optional and bounded** helper extraction only.
- The DELETE list now explicitly says **do not delete** `CanvasWorldReadPort` raw domain collection returns or `getProcessTree()` as a Wave 026 success condition.
- Stop conditions now require a reviewed plan edit before deleting/reshaping `CanvasWorldReadPort.getProcessTree()`, canvas raw collection returns, canvas selector DTOs, or three presentation read models for reasons not directly required by the tool context split.

This resolves the round-01 overreach blocker and matches the bounded wave scope in `scope-check.md`.

### 2. Anti-facade guard needed to be concrete

**Resolved.**

`proposal-direct.md` now includes a concrete caller-mapped anti-facade guard:

- Every proposed tool-port method is tied to enumerated current tool callers/usages.
- Tool-only read methods are distinguished from canvas/three presentation responsibilities.
- Forbidden shapes now explicitly ban generic `WorldView` / `ToolWorld` / `WorldQuery` / `RuntimeWorld`, generic `query(...)` / `traverse(...)` / `getAll...`, collection dumps, catch-all realization contexts, canvas/three-only pass-through methods, and compatibility overloads that retain `ToolContext.world`.
- Validation now requires implementation evidence that every tool-port method maps back to the caller map.

This is the concrete anti-facade rule requested in round 01.

### 3. Residual out-of-scope seams needed explicit acceptance

**Resolved.**

`proposal-direct.md` now clearly lists accepted residual out-of-scope seams, including:

- `RuntimeSession` properties-dialog coordinate reads and process-tree infeasibility realization reads.
- `CanvasToolController` ownership of `World` and `CommandStack` for mutation/use-case orchestration.
- Presentation-local helpers in `CanvasWorldReadPort` and `ThreeWorldReadPort` when not required for the tool port.
- Persistence/project restoration, command-history/producer redesign, and canvas selector raw collection / `getProcessTree()` exposure as later-wave candidates.

These residuals are now honestly described as future-wave debt and do not contradict the Wave 026 target outcome.

## Proposal scoring

### Proposal Direct — `proposal-direct.md`

1. **Does it advance the wave target outcome?** — **Pass**
   - It directly deletes `ToolContext.world` and `CollectionContext.world`, keeps `RuntimeSession` as private `World` owner, and moves tool reads behind a bounded runtime-owned port.
2. **Does it improve architecture and code quality?** — **Pass**
   - It removes a central boundary leak while keeping command mutation on `ToolCommandSink`.
   - It also opportunistically narrows touched weak types (`paperToPlaneTransform`, `toolStore`) without turning into broad cleanup.
3. **Does it respect no-backcompat / aggressive deletion priorities?** — **Pass**
   - It explicitly deletes the raw-world seam and forbids dual-path compatibility wrappers.
4. **Does it avoid overfeaturism?** — **Pass**
   - After correction, adjacent canvas/three adapter work is clearly optional and bounded to what is directly needed for `ToolContext.world` deletion.
5. **Does it avoid new risks / hidden regressions?** — **Pass with manageable risk**
   - Main remaining risk is creating a renamed `World` facade during implementation, but the caller-map guard and stop conditions address that directly.
   - Tangent / projection-plane / 3D validation remains the most sensitive behavioral area, and the proposal acknowledges that.
6. **Is the proposed validation sufficient?** — **Pass**
   - Validation covers static scans, focused tests, full tests, builds, e2e, preview refresh, and live behavioral smoke, aligned with the project validation runbook.

### Proposal Restructure — `proposal-restructure.md`

1. **Does it advance the wave target outcome?** — **Pass**
2. **Does it improve architecture and code quality?** — **Pass**
3. **Does it respect no-backcompat / aggressive deletion priorities?** — **Pass**
4. **Does it avoid overfeaturism?** — **Warning**
   - It still moves one layer broader than the current evidence requires by trying to establish a shared adapter across tools, canvas, and three presentation in the same wave.
5. **Does it avoid new risks / hidden regressions?** — **Warning**
   - Simultaneous tool/canvas/three adapter movement increases rendering and interaction regression surface.
6. **Is the proposed validation sufficient?** — **Pass**

## Scope-boundary and protected-surface verification

The corrected direct proposal now stays within the expected Wave 026 scope boundaries:

- **Still in scope:**
  - `RuntimeSession` tool invocation seam
  - `RuntimeViewPorts` typing alignment
  - `ITool.ToolContext.world`
  - `ArgumentCollectorTool` / `ToolArgumentCollector` world-centric collection context
  - concrete tool read/realization usage under `frontend/src/tools/`
  - optional directly adjacent helper extraction in canvas/three read adapters only where required to support tool-port construction
- **Still out of scope / protected:**
  - persistence schema/replay, ProjectService, Drive/auth, local/Drive restoration contracts
  - backend/docs/debug/package-tooling churn
  - broad domain realization redesign
  - command history / command producer / undo-redo redesign
  - broad application-kernel work
  - implementation itself during review

I also verified the proposal now explicitly protects `CanvasWorldReadPort.getProcessTree()`, canvas raw collection returns, selector DTOs, and three read models unless a later reviewed plan edit expands scope.

## Decision recommendation

- **Recommended next stage:** `cycle-026-decision`
- **Preferred proposal:** `proposal-direct.md`
- **Fallback only if implementation disproves the direct path:** `proposal-restructure.md`

## Residual cautions for decision/implementation log

These are not blocking review issues, but they should remain explicit when the Manager writes `decision.md` and when implementation begins:

- The implementation must prove that every new tool read/realization method exists because of an enumerated current tool caller, not because it is convenient to mirror `World`.
- If implementation pressure starts pulling canvas selector outputs, `getProcessTree()`, or three presentation traversal into the same change for non-tool reasons, that is a stop condition and should bounce back to a reviewed plan edit rather than expanding Wave 026 silently.
- Residual runtime/process/properties world reads are accepted debt for later waves and should be recorded honestly, not silently “cleaned up” under this wave.
