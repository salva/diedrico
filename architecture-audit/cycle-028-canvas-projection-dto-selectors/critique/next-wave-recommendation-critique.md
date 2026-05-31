# Critique — Cycle 028 next-wave recommendation

synthesized_by: manager  
reason: critic_dispatch_unavailable  
critic_dispatch_failures: 2 consecutive attempts failed with provider context-window routing error for `nvidia-nim/moonshotai/kimi-k2.6`.

## Artifact reviewed

- `architecture-audit/cycle-028-canvas-projection-dto-selectors/next-wave-recommendation.md`
- `architecture-audit/cycle-028-canvas-projection-dto-selectors/implementation-log.md`
- `architecture-audit/wave-plan.md`

## Critique against required priorities

### 1. Advances the post-Wave-028 architectural target

PASS. The recommendation correctly identifies that Cycle 028 deleted the public canvas raw getter/realization seams and that the next most central residual is the 3D presentation/read-port and realization-read boundary, especially `ThreeWorldReadPort.ts` and adjacent 3D read/presentation seams.

### 2. Respects architectural centrality ordering

PASS. It prioritizes 3D presentation read-port/realization boundary work ahead of scene-host lifecycle, UI polish, docs/debug cleanup, and DTO-native style cleanup. It also keeps domain realization-context redesign as a higher-layer fallback only if Wave 017 scout proves the presentation split cannot be cleanly done without it.

### 3. Respects no-backcompat / aggressive deletion priorities

PASS. It explicitly asks the next wave to delete full-`World` three-presentation seams, duplicate realization-context assembly, broad `ThreeWorldReadPort` responsibilities, touched `as any` test seams, transitional overloads, and dead exports rather than wrapping old APIs.

### 4. Avoids overfeaturism and protected-surface drift

PASS. It keeps persistence, command history/producers, backend/docs/specs, package/tooling, Drive/auth/config, generic app-kernel/read-model facade work, broad scene-host/OrbitControls/CSS changes, and next-wave implementation out of the recommendation.

### 5. Recommends the right canonical next stage

PASS WITH NOTE. The recommendation says to proceed to a fresh scout/proposals stage rather than a wave-plan-extension because the existing plan already contains a valid Wave 017 entry. This is acceptable if the Planner confirms Wave 017 exists in the authoritative plan snapshot. If the Planner’s plan queue does not currently contain `cycle-017-fresh-scout-proposals`, it should schedule the canonical fresh-scout/proposals stage for the current next wave title rather than implement directly.

### 6. Validation / regression awareness

PASS. It carries forward the Cycle 026/028 3D overlay pointer-boundary contract and instructs the next scout to preserve it while avoiding scene-host interaction overreach.

## Blocking issues

None.

## Non-blocking notes

- The recommendation should be treated as advisory input for the Manager/Planner summary; it does not amend `architecture-audit/wave-plan.md` and does not authorize implementation.
- If a fresh scout discovers the Wave 017 premise has been invalidated by current code, the project should run the documented plan-edit/review path before implementation.
