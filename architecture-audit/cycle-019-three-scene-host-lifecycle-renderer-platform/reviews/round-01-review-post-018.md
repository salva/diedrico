# Wave 019 Round-01 Review — post-018

## Decision

**PASS WITH NO BLOCKING ISSUES.**

Both proposals satisfy the Wave 019 review bar. The preferred path is **`proposals/proposal-direct.md`**, because current source already implements most of the intended Wave 019 seams and the direct proposal correctly converges on that reality without inventing a broader redesign. `proposal-restructure.md` is a viable fallback only if the decision stage concludes that constructor-default production composition inside `ThreeViewRuntime` is still a meaningful architectural smell worth deleting now.

Recommended next stage: **`cycle-019-decision-post-018`**.

## Evidence checked

- Scope/design artifacts:
  - `architecture-audit/cycle-019-three-scene-host-lifecycle-renderer-platform/scope-check.md`
  - `architecture-audit/cycle-019-three-scene-host-lifecycle-renderer-platform/proposals/proposal-direct.md`
  - `architecture-audit/cycle-019-three-scene-host-lifecycle-renderer-platform/proposals/proposal-restructure.md`
  - `architecture-audit/cycle-019-three-scene-host-lifecycle-renderer-platform/critique/round-01-critique.md`
  - `architecture-audit/cycle-019-three-scene-host-lifecycle-renderer-platform/reviews/stage-quality-review-post-018.md`
  - Wave 019 entry in `architecture-audit/wave-plan.md:1035-1114`
- Protected-boundary / prior-wave evidence:
  - `architecture-audit/cycle-018-domain-realization-context-boundary/implementation-log.md`
  - `architecture-audit/cycle-026-hotfix-3d-view-interaction-regression/implementation-log.md`
- Current source:
  - `frontend/src/components/panels/ThreeView.vue`
  - `frontend/src/rendering/threeView/ThreeViewRuntime.ts`
  - `frontend/src/rendering/threeView/ThreeSceneHost.ts`
  - `frontend/src/rendering/threeView/ThreeObjectRegistry.ts`
  - active `*SceneAdapter.ts` files including `AxisLabelSceneAdapter.ts`
- Current protection tests:
  - `frontend/tests/unit/components/panels/threeViewShellBoundary.spec.ts`
  - `frontend/tests/e2e/current-ui-contract.spec.ts`
- Path-scoped source-control status for Wave 019 paths.

## Source-control hygiene and scope reconciliation

### Path-scoped status

Checked with path-scoped status rather than broad `git status` because workspace-wide status overflows in this repo.

Observed dirty/untracked items within the Wave 019 audit directory are limited to pre-existing audit/validation noise, including:

- modified `architecture-audit/cycle-019-three-scene-host-lifecycle-renderer-platform/implementation-log.md`
- modified `architecture-audit/cycle-019-three-scene-host-lifecycle-renderer-platform/validation/live-preview-server.stdout`
- untracked critique/stage-quality-review/validation logs

No scoped dirty production source was present under:

- `frontend/src/rendering/threeView/`
- `frontend/src/components/panels/ThreeView.vue`
- `frontend/tests/unit/rendering/threeView/`
- `frontend/tests/unit/components/panels/threeViewShellBoundary.spec.ts`
- `frontend/tests/e2e/current-ui-contract.spec.ts`

The scope check also correctly records unrelated dirty production files as out of scope:

- `frontend/src/domain/calculations/Intersections.ts`
- `frontend/src/domain/processTree/ActionGroup.ts`

This satisfies the review-stage requirement to separate unrelated workspace dirt from Wave 019 review scope.

## Critic-loop / failure-tolerance evidence

`critique/round-01-critique.md` is present and explicitly marked:

- `synthesized_by: manager`
- `reason: critic_dispatch_unavailable`

The artifact also documents two failed critic dispatch attempts with the same provider-routing error before synthesis. That is compliant with the project’s failure-tolerance rule, so there is **no blocker** on critic-process grounds.

## Proposal scoring against the six required criteria

## 1. Advances the wave target outcome

### `proposal-direct.md`
**Score: strong pass**

Why:
- It matches current code reality: `ThreeViewRuntime` already has injected host/controller/adapter seams, `ThreeSceneHost` already has a platform port, and `ThreeObjectRegistry` already owns disposal.
- It preserves `ThreeView.vue` as a shell and keeps focus on lifecycle/disposal/test seam hardening rather than reopening other architectural boundaries.
- It explicitly keeps active adapters, including `AxisLabelSceneAdapter`, inside the ownership contract.

### `proposal-restructure.md`
**Score: pass**

Why:
- It also advances the target outcome by centralizing production runtime composition in a named factory/platform module.
- It could sharpen the runtime/platform boundary further by removing constructor-default production wiring from `ThreeViewRuntime`.
- However, it goes one layer higher than the minimum needed for the wave as current source stands.

## 2. Improves architecture and code quality

### `proposal-direct.md`
**Score: strong pass**

Why:
- It avoids unnecessary churn in code that already has explicit seams.
- It targets the clearest remaining weakness: test-contract looseness in `threeSceneAdapters.spec.ts` via broad `as any` DTO fixtures.
- It preserves explicit ownership boundaries already visible in `ThreeSceneHost` and `ThreeObjectRegistry`.

### `proposal-restructure.md`
**Score: pass with tradeoff**

Why:
- Naming production composition in a single module is a legitimate architectural cleanup.
- But it risks spending the wave on import/construction churn rather than on the more important ownership/test-contract hardening.
- The proposal acknowledges this risk and bounds it, which keeps it acceptable.

## 3. Respects no-backcompat / aggressive deletion priorities

### `proposal-direct.md`
**Score: pass**

Why:
- It explicitly deletes weak `as any` fixtures, stale low-level Vue-mount helpers, accidental duplicate helpers, and dead exports if found.
- It does not preserve parallel construction paths.
- It correctly refuses deletion of `AxisLabelSceneAdapter.ts` because current source shows it is active through `ProjectionPlaneSceneAdapter`.

### `proposal-restructure.md`
**Score: pass**

Why:
- It explicitly deletes constructor-default production wiring if the platform-factory path is selected, and rejects compatibility constructors/overloads.
- It maintains the same aggressive-deletion posture while staying in scope.

## 4. Avoids overfeaturism

### `proposal-direct.md`
**Score: strong pass**

Why:
- It is intentionally small and accurately calibrated to the current codebase.
- It does not attempt to turn Wave 019 into app-shell, renderer-framework, or generalized platform work.

### `proposal-restructure.md`
**Score: pass with caution**

Why:
- It is still bounded, but the new platform module could drift into a composition god-module if implemented loosely.
- The proposal’s stop conditions mitigate this, so the risk is real but controlled.

## 5. Risks / hidden regressions

### `proposal-direct.md`
**Score: strong pass**

Why:
- It is the lower-risk choice because it minimizes edits to already-functioning lifecycle code.
- It explicitly protects OrbitControls behavior, CSS2D label behavior, renderer timing, and overlay pointer ownership.
- It aligns with the Cycle 026 regression evidence that pointer hit-testing is user-visible and must not regress.

### `proposal-restructure.md`
**Score: pass**

Why:
- Risks are honestly identified: broader import churn, weakly typed adapter registries, and accidental platform creep.
- These are manageable but make it the riskier option compared with the direct path.

## 6. Validation sufficiency

### `proposal-direct.md`
**Score: pass**

Why:
- The validation plan includes the required focused Vitest coverage, root/frontend lint/test/build/e2e, live preview refresh, HTTP probe, and 3D browser evidence.
- It explicitly preserves `current-ui-contract.spec.ts` overlay pointer-boundary coverage.

### `proposal-restructure.md`
**Score: pass**

Why:
- It includes the same mandatory validation cadence and adds a focused factory/module test if that path is chosen.
- It remains sufficient for the higher-churn path.

## Required topic checks

### ThreeView.vue shell boundary

Current source keeps `ThreeView.vue` in the right lane: it injects the presentation port, gets read ports, constructs the runtime, mounts it, refreshes it, wires resize, subscribes/unsubscribes world changes, and owns selection/display watchers. It does **not** import low-level Three.js primitives.

The shell-boundary unit test also explicitly guards against low-level Three.js/rendering imports and preserves the app-shell overlay pointer-event contract. Both proposals keep that shell boundary intact.

### ThreeViewRuntime hard-wiring / testability

Current `ThreeViewRuntime` is already testable: it exposes interfaces for host/controller/adapters and accepts injected collaborators. The remaining design question is only whether default production composition should remain constructor-local or move to a named factory.

This means the scope check and direct proposal are materially correct: the wave should not be justified on a false premise that runtime injection does not exist.

### ThreeSceneHost lifecycle and resource ownership

Current `ThreeSceneHost` already owns the right responsibilities: renderer, label renderer, controls, camera, lights, animation-frame loop, resize, remount cleanup, and disposal. Its platform seam is concrete enough for focused tests. Both proposals respect this and avoid behavior redesign.

### ThreeObjectRegistry disposal

Current registry behavior is explicit and central: group replacement disposes old objects; full disposal traverses descendants and disposes geometry/materials/CSS2D DOM. This is already aligned with Wave 019 goals. Both proposals correctly preserve registry ownership instead of adding parallel lifetime paths.

### Scene-adapter material/geometry ownership

Current active adapters create their own Three objects and hand ownership to the registry through runtime group replacement. Both proposals frame this correctly and keep adapter changes bounded to ownership clarity and typed tests rather than broad rendering redesign.

### AxisLabelSceneAdapter active/deletion status

`AxisLabelSceneAdapter` is active through `ProjectionPlaneSceneAdapter`; it is not dead code on current evidence. Both scope-check and proposals treat it correctly. No correction needed.

### Direct vs restructure tradeoff

The central tradeoff is narrow and well stated:
- choose **direct** if the existing runtime/host/platform seams are already sufficient and only need contract/test hardening and validation;
- choose **restructure** only if the decision stage wants to delete constructor-default production composition from `ThreeViewRuntime` and centralize it in a named factory.

Given current source, the direct option is the better fit because it delivers architectural closure with less risk and less churn.

## Protected-surface verification

The reviewed artifacts correctly keep the following out of scope:

- Wave 018 realization/read-context contracts
- canvas presentation selectors / SVG presentation
- app-shell project lifecycle
- command/undo
- persistence/schema/replay
- backend/docs/specs/package/tooling
- Drive/auth and secret/config paths
- validation-platform work
- broad UI redesign
- scene-host behavior changes beyond lifecycle/resource ownership

I also verified the review stage itself did not require reading protected secret/config files.

## Wave 018 preservation and 3D pointer-boundary protection

Wave 018 preservation is explicitly maintained in the scope check and both proposals; nothing proposes reopening the narrowed realization/read-context contracts.

Cycle 026 pointer-boundary protection is also explicitly preserved:
- the unit shell-boundary test requires `.three-view-overlay` to use `pointer-events: auto`;
- `current-ui-contract.spec.ts` includes the e2e regression test proving the 3D overlay owns hit-testing and drag gestures do not pan the SVG canvas;
- neither proposal authorizes CSS pointer or OrbitControls behavior changes during this stage.

This is sufficient for proposal-stage review. Later implementation must keep the same evidence green.

## Conclusion and recommendation

No blocking proposal corrections are required before the decision stage.

### Preferred proposal

**Select `proposal-direct.md` unless the decision stage explicitly prioritizes deleting constructor-default production composition from `ThreeViewRuntime`.**

### Decision-stage considerations

If choosing `proposal-direct.md`, the decision should emphasize:
- current source already satisfies most of Wave 019’s intended architecture;
- implementation should stay small, deletion-oriented, and validation-heavy;
- typed adapter-fixture cleanup and ownership/lifecycle contract hardening are enough to make the wave real.

If choosing `proposal-restructure.md`, the decision should explicitly forbid:
- a generalized renderer platform;
- moving Vue subscriptions/app-shell ownership out of `ThreeView.vue`;
- parallel old/new runtime construction paths.

## Blocking issues

None.
