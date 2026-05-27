# Cycle 019 Review Round 01 — Three scene-host lifecycle / renderer platform boundary

## Scope and path verification

Reviewed against:

- `architecture-audit/wave-plan.md` Wave 019 entry
- `architecture-audit/cycle-019-three-scene-host-lifecycle-renderer-platform/scope-check.md`
- `architecture-audit/cycle-019-three-scene-host-lifecycle-renderer-platform/proposals/proposal-direct.md`
- `architecture-audit/cycle-019-three-scene-host-lifecycle-renderer-platform/proposals/proposal-restructure.md`
- `.saivage/stages/cycle-019-fresh-scout-proposals/summary.json`
- Current source under `frontend/src/components/panels/ThreeView.vue`, `frontend/src/rendering/threeView/`, and `frontend/src/application/threePresentation/ThreeWorldReadPort.ts`

Current-path corrections verified:

- `frontend/src/services/three` is absent and should remain out of scope for Wave 019.
- Active Wave 019 source surfaces are under `frontend/src/rendering/threeView`, `frontend/src/components/panels/ThreeView.vue`, and `frontend/src/application/threePresentation/ThreeWorldReadPort.ts` only as dependency verification.
- `AxisLabelSceneAdapter.ts` is active via `ProjectionPlaneSceneAdapter.ts`; deletion is not currently justified.
- Wave 018 completion is consistent with current `ThreeWorldReadPort.ts`: typed realization-context helpers exist and the raw full-`World` realization seam is not the current blocker for this wave.
- App-shell, backend, docs/spec, debug cleanup, and package/tooling work remain out of scope and neither proposal improperly expands into them.

## Proposal scoring

### 1. `proposal-direct.md`

1. **Advances wave target outcome:** pass
   - Directly addresses the real current seam: `ThreeViewRuntime` hard-wiring, `ThreeSceneHost` lifecycle ownership, and registry disposal contract.
2. **Improves architecture and code quality:** pass
   - Keeps the change centered on explicit runtime/host seams and focused tests rather than broader redesign.
3. **Respects no-backcompat / aggressive deletion priorities:** pass
   - Explicitly deletes implicit hard-wiring, stale low-level shell tests, and compatibility wrappers rather than preserving parallel paths.
4. **Avoids overfeaturism:** pass
   - Constrains new abstraction to host/controller/adapter lifecycle seams and explicitly warns against a factory maze.
5. **Risks / hidden regressions:** acceptable
   - Main risks are animation-loop leaks, disposal ownership mistakes, and controls regressions; all are named and testable.
6. **Validation sufficiency:** pass
   - Includes focused runtime/host/registry/adapter/shell tests, mandatory lint/full test/build/e2e, and live preview/browser smoke.

### 2. `proposal-restructure.md`

1. **Advances wave target outcome:** pass
   - Also solves the target problem, with a somewhat higher-level composition boundary.
2. **Improves architecture and code quality:** pass with caution
   - A named platform composition module could clarify ownership cleanly, but only if it stays composition-only.
3. **Respects no-backcompat / aggressive deletion priorities:** pass
   - Deletes duplicate production wiring and compatibility wrappers if chosen.
4. **Avoids overfeaturism:** borderline but acceptable
   - This is the main trade-off. The proposal is still bounded, but it is closer to creating a new composition layer that could become a god-module if discipline slips.
5. **Risks / hidden regressions:** acceptable with caution
   - Biggest risk is over-centralizing logic in the new platform module or drifting into app-shell/reactivity redesign.
6. **Validation sufficiency:** pass
   - Validation is materially sufficient and adds platform-specific focused tests.

## Decision guidance

**NO BLOCKING ISSUES**

Both proposals are aligned with the Wave 019 entry, current source reality, and the no-backcompat/aggressive-deletion priorities. Either can proceed to `cycle-019-decision` without a corrections round.

### Preferred option

Prefer **`proposal-direct.md`** unless the Manager strongly believes constructor/factory seams alone will leave ownership too implicit.

Reasoning:

- It fits the exact current implementation smell with the smallest architectural lift.
- It is less likely to create a new composition god-module.
- It still satisfies the wave target outcome and validation requirements.
- The existing `threeViewShellBoundary.spec.ts` is a raw-source architecture test, so the direct path can preserve the shell boundary while adding the missing host/runtime lifecycle tests.

### Acceptable alternative

`proposal-restructure.md` remains viable if the decision record explicitly constrains any new `ThreeViewPlatform`-style module to composition/ownership wiring only and forbids migration of host logic, Vue subscription policy, or adapter geometry logic into that module.

## Review notes for implementation stage

- Keep typed render-group names and adapter contracts explicit; do not replace one hard-coded map with an untyped registry that weakens safety.
- Ensure mount/dispose semantics are specified and tested for repeated calls; current `ThreeSceneHost.mount()` appears non-idempotent and `dispose()` does not reset internal fields.
- Because `ThreeView.vue` currently creates watchers inside `onMounted` without storing stop handles, implementation should be careful not to broaden shell behavior accidentally; if watcher cleanup changes, keep it narrowly scoped to shell lifecycle correctness.
- Focused tests should verify ownership effects, not Three.js internals.

## Recommendation

Proceed to `cycle-019-decision`.
