# Cycle 019 Decision post-018 — Three scene-host lifecycle / renderer platform boundary

## Decision status

**Authoritative decision artifact:** this `decision-post-018.md` supersedes the older `decision.md` in this directory for Wave 019 implementation gating. The older file is treated as stale pre-post-018 noise unless a later reviewed artifact explicitly reconciles it.

**Decision:** proceed to implementation using `proposals/proposal-direct.md`.

**Review convergence:** complete after round 01. `reviews/round-01-review-post-018.md` records **PASS WITH NO BLOCKING ISSUES**, scores both proposals against all six required review criteria, and prefers `proposal-direct.md`.

**Critic-loop status:** satisfied through failure-tolerant synthesis. `critique/round-01-critique.md` is marked `synthesized_by: manager` with `reason: critic_dispatch_unavailable` after two failed critic dispatch attempts. `reviews/round-01-review-post-018.md` accepts that artifact as compliant with the project failure-tolerance rule and finds no process blocker.

**Recommended next stage:** `cycle-019-implement-three-scene-host-lifecycle-renderer-platform-post-018`.

This decision is design/planning only. It authorizes a future implementation stage; it does **not** perform production source, test, package, tooling, validation, preview, backend, docs/spec, persistence, command/undo, or UI-feature changes.

## Evidence inspected

- `architecture-audit/cycle-019-three-scene-host-lifecycle-renderer-platform/scope-check.md`
- `architecture-audit/cycle-019-three-scene-host-lifecycle-renderer-platform/proposals/proposal-direct.md`
- `architecture-audit/cycle-019-three-scene-host-lifecycle-renderer-platform/proposals/proposal-restructure.md`
- `architecture-audit/cycle-019-three-scene-host-lifecycle-renderer-platform/critique/round-01-critique.md`
- `architecture-audit/cycle-019-three-scene-host-lifecycle-renderer-platform/reviews/round-01-review-post-018.md`
- `architecture-audit/cycle-019-three-scene-host-lifecycle-renderer-platform/reviews/stage-quality-review-post-018.md`
- `architecture-audit/wave-plan.md` Wave 019 entry
- `architecture-audit/cycle-018-domain-realization-context-boundary/implementation-log.md`
- `architecture-audit/cycle-026-hotfix-3d-view-interaction-regression/implementation-log.md`
- Current Wave 019 source/test paths named in the scope check and review:
  - `frontend/src/rendering/threeView/ThreeViewRuntime.ts`
  - `frontend/src/rendering/threeView/ThreeSceneHost.ts`
  - `frontend/src/rendering/threeView/ThreeObjectRegistry.ts`
  - active `frontend/src/rendering/threeView/*SceneAdapter.ts`
  - `frontend/src/components/panels/ThreeView.vue`
  - focused three-view unit tests and `frontend/tests/e2e/current-ui-contract.spec.ts`

Path-scoped source-control evidence for this decision stage was captured under `.saivage/stages/cycle-019-decision-post-018/design-notes/` because broad `git status` overflows in this workspace. No secret/config files were read.

## Source-control hygiene context

The current path-scoped status/diff shows broad dirty context that must not be normalized by Wave 019 implementation:

- Existing Cycle 019 audit/validation noise remains present, including modified `implementation-log.md`, modified `validation/live-preview-server.stdout`, untracked critique/review artifacts, and untracked validation/status logs.
- Known unrelated dirty production files remain outside Wave 019 implementation scope:
  - `frontend/src/domain/calculations/Intersections.ts`
  - `frontend/src/domain/processTree/ActionGroup.ts`
- No scoped dirty production source was observed under `frontend/src/rendering/threeView/`, `frontend/src/components/panels/ThreeView.vue`, focused three-view unit test paths, or `frontend/tests/e2e/current-ui-contract.spec.ts` in the captured scoped diff.

Implementation must inspect path-scoped status/diff again before editing, stage only selected Wave 019 files, and must not revert, incorporate, format, or rely on unrelated `Intersections.ts` / `ActionGroup.ts` changes or stale Cycle 019 validation/audit noise unless a later reviewed delta explicitly brings a file into scope.

## Selected implementation path

### Selected: `proposal-direct.md`

Implement the direct path: accept and harden the existing explicit runtime/host lifecycle seams without introducing a broader renderer platform module.

Rationale:

1. Current source already contains most of Wave 019's intended seams: injectable `ThreeViewRuntime` collaborators, `ThreeSceneHostPlatform`, registry-owned disposal, active DTO-to-Three scene adapters, and focused runtime/host/registry tests.
2. The direct proposal matches current code reality and avoids manufacturing churn.
3. The clearest residual weaknesses are small and contract-oriented: lifecycle/ownership clarity, adapter test fixture precision, and validation of protected behavior.
4. The round-01 canonical review found no blockers and preferred the direct path as lower risk and better calibrated.
5. The direct path preserves architectural ordering by keeping Wave 018 realization/read-context outputs stable while tightening the renderer lifecycle boundary.

### Rejected/deferred: `proposal-restructure.md`

`proposal-restructure.md` is not selected for this implementation cycle. It remains a fallback/stop path only if implementation proves constructor-default production composition in `ThreeViewRuntime` is a material architecture blocker that cannot be resolved within the direct proposal.

Do **not** silently incorporate restructure-only work into the direct implementation. In particular, do not create a new `ThreeViewPlatform.ts`, generic scene platform, renderer-framework facade, shared SVG/Three platform, app-shell runtime owner, or composition god-module in this wave. If such a module becomes necessary, stop and run a reviewed mini-cycle/delta proposal before source changes continue.

## Bound implementation scope

Future implementation may change only the following surfaces when required by `proposal-direct.md`.

### Production source allowed

- `frontend/src/rendering/threeView/ThreeViewRuntime.ts`
  - Preserve the current injected host/controller/adapter contract.
  - Keep responsibility limited to presentation-model refresh and named registry group replacement.
  - Clarify default composition or ownership locally only if needed; do not add a second production construction path.
- `frontend/src/rendering/threeView/ThreeSceneHost.ts`
  - Keep `ThreeSceneHostPlatform` as the only low-level renderer/label-renderer/controls/animation/pixel-ratio seam.
  - Host owns camera, scene, lights, WebGL renderer, CSS2D label renderer/DOM, OrbitControls, resize, animation-frame scheduling/cancellation, registry disposal, renderer disposal, and label DOM removal.
  - Clarify idempotent mount/dispose semantics only if focused tests expose ambiguity.
- `frontend/src/rendering/threeView/ThreeObjectRegistry.ts`
  - Preserve registry-owned group replacement and disposal of scene objects, descendants, geometry, material arrays, and CSS2D label DOM.
  - Add disposal safeguards or ownership comments only where tests prove a real gap.
- Active scene adapters under `frontend/src/rendering/threeView/`:
  - `ProjectionPlaneSceneAdapter.ts`
  - `PlanarElementSceneAdapter.ts`
  - `ReconstructedElementSceneAdapter.ts`
  - `GuideSceneAdapter.ts`
  - `HingeSceneAdapter.ts`
  - `AxisLabelSceneAdapter.ts`
  - Keep adapters as DTO-to-owned-Three-object converters. They create materials/geometries/DOM labels and transfer ownership to runtime/registry group replacement.
- `frontend/src/components/panels/ThreeView.vue`
  - Prefer no production change.
  - Touch only for narrow shell wiring around runtime construction, mount/unmount, watch/subscription cleanup, and resize listener cleanup if required by the direct path.
  - It must remain a Vue composition shell and must not own low-level Three.js platform lifecycle or app-shell project state.

### Tests allowed/expected

- `frontend/tests/unit/rendering/threeView/threeSceneAdapters.spec.ts`
  - Replace broad `as any` DTO fixtures with typed builders or `satisfies`-checked DTO fixtures where practical.
  - Keep representative adapter coverage; do not turn the suite into exhaustive visual/snapshot testing.
- `frontend/tests/unit/rendering/threeView/threeViewRuntime.spec.ts`
  - Preserve injected collaborator tests and group replacement order assertions.
  - Add only focused assertions for clarified direct-path contracts.
- `frontend/tests/unit/rendering/threeView/threeSceneHost.spec.ts`
  - Preserve lifecycle tests for renderer/CSS2D DOM/controls/resize/animation/dispose/remount cleanup.
  - Add only lifecycle assertions needed by the selected hardening.
- `frontend/tests/unit/rendering/threeView/threeObjectRegistry.spec.ts`
  - Preserve disposal/idempotence coverage and extend only for real ownership gaps.
- `frontend/tests/unit/components/panels/threeViewShellBoundary.spec.ts`
  - Preserve shell-boundary and overlay pointer-event assertions; update only if narrow shell wiring changes.
- `frontend/tests/e2e/current-ui-contract.spec.ts`
  - Treat as protected validation evidence. Do not rewrite unless a focused implementation change requires a minimal test adjustment.

## Required DELETE / removal outcomes

The future implementation is incomplete if it leaves parallel legacy surfaces behind. Delete, do not wrap:

- Broad `as any` scene-adapter DTO fixtures that are touched and can be replaced by typed DTO fixture builders.
- Any accidental duplicate/parallel production runtime construction helper introduced during implementation.
- Compatibility constructors, overloads, or wrappers that preserve both old and new production construction paths if a direct seam is refined.
- Stale Vue-mount helpers/tests that inspect host/registry internals now covered by focused runtime/host/registry tests.
- Duplicate/dead scene-host lifecycle helpers or adapter exports found by implementation static scan.

Do **not** delete `AxisLabelSceneAdapter.ts` under current evidence: it is active through `ProjectionPlaneSceneAdapter.ts`. Delete it only if a later implementation change makes it genuinely dead and focused static scans/tests prove no active use remains.

No docs/spec/backend/package/tooling files are delete candidates for this wave.

## Lifecycle and ownership rules

### `ThreeView.vue` shell boundary

`ThreeView.vue` may own Vue/browser shell wiring only:

- inject the Three presentation port and read ports;
- build runtime refresh input from read ports, display options, and selection;
- construct/use the runtime through the selected direct seam;
- mount, resize, refresh, dispose;
- subscribe/unsubscribe world changes;
- create/cleanup Vue watchers and global resize listener;
- keep panel controls and overlay styling local.

It must not import low-level Three.js primitives, create renderers/controls/materials/geometries, own app-shell project lifecycle, own command/undo/persistence, or become a renderer platform.

### `ThreeViewRuntime` composition/testability

`ThreeViewRuntime` is an orchestration boundary:

- consumes injected/testable host, presentation controller, registry-like replacement surface, and adapters;
- builds/refetches the Three presentation model;
- replaces named groups for projection planes, planar elements, reconstructed elements, guides, and hinges;
- delegates mount/resize/dispose to the host.

It must not absorb host resource lifecycle, Vue subscriptions, app-shell state, persistence, command handling, or generic scene-platform behavior. Do not keep multiple production construction APIs.

### `ThreeSceneHost` lifecycle/resource ownership

`ThreeSceneHost` owns low-level platform resources:

- WebGL renderer creation/configuration/disposal;
- CSS2D label renderer creation/configuration, DOM attachment, DOM removal, and render pass;
- camera aspect/projection updates;
- OrbitControls creation/update/disposal without user-visible behavior change;
- scene background/lights;
- animation-frame scheduling and cancellation;
- registry disposal on host disposal and remount cleanup.

Mount must clean up prior platform resources before re-mounting. Dispose must be idempotent enough for Vue unmount/remount and tests. Animation must not double-start or leak outstanding frames.

### `ThreeObjectRegistry` disposal contract

`ThreeObjectRegistry` remains the single object lifetime owner after adapters hand over objects:

- `replaceGroup` removes/disposes the previous group before storing/adding the new group;
- `dispose` disposes all known groups and clears the registry;
- disposal traverses descendants;
- geometries, materials, material arrays, and CSS2D label DOM elements are released/removed;
- no parallel registry or alternate object-lifetime path is allowed.

### Scene-adapter ownership rules

Scene adapters create fresh Three.js objects from presentation DTOs and transfer ownership to the runtime/registry. Materials, geometries, line helpers, meshes, labels, and CSS2D label DOM created by adapters are owned by the resulting group and must be disposable by the registry. Adapters should not retain mutable global scene state, host references, renderer references, or external DOM ownership.

### `AxisLabelSceneAdapter` active/deletion treatment

`AxisLabelSceneAdapter.ts` is active and protected from deletion under current evidence. It participates in projection-plane axes/labels through `ProjectionPlaneSceneAdapter.ts`. Treat it as part of the active adapter ownership contract, not dead code.

## Wave 018 preservation requirements

Implementation must preserve the completed Wave 018 realization/read-context boundary:

- Do not reopen domain realization/read-context contracts.
- Do not introduce raw `World`/`any` realization seams.
- Do not change `WorldRealizationContext`, `ThreeRealizationContext`, `CanvasWorldReadPort`, or domain realization contracts for this wave except for dependency verification in static scans.
- Three rendering code must continue to consume the current presentation/read outputs rather than reaching around them.

## Protected out-of-scope surfaces

Do not touch or redesign:

- domain realization/read-context contracts;
- canvas presentation selectors, SVG canvas rendering, overlay interaction model, or 2D canvas UI behavior;
- app-shell project/session lifecycle, stores, command/undo, autosave, persistence/schema/replay, Drive/local storage, auth, backend, docs/specs;
- package metadata, lockfiles, dependency versions, build tooling, or validation-platform infrastructure;
- broad UI feature work, display-option semantics, camera defaults, OrbitControls behavior, overlay CSS/pointer behavior, or canvas interaction behavior;
- stale audit-history mining from discarded old cycles;
- unrelated dirty `frontend/src/domain/calculations/Intersections.ts` or `frontend/src/domain/processTree/ActionGroup.ts`.

## 3D overlay / pointer-boundary preservation

Cycle 026 fixed a user-visible regression where the 3D overlay was click-through and drag gestures panned the SVG canvas. Wave 019 implementation must preserve that contract:

- `.three-view-overlay` and active 3D panel content must continue to own pointer hit-testing.
- Do not change overlay CSS, pointer-events semantics, OrbitControls gesture semantics, or canvas drag behavior as part of lifecycle hardening.
- Required validation must include the protected `current-ui-contract.spec.ts` coverage proving the overlay is visible, receives pointer events, is the element under pointer, and does not pass drag gestures through to the SVG canvas.

## Validation requirements for implementation

All validation logs must be captured under:

`architecture-audit/cycle-019-three-scene-host-lifecycle-renderer-platform/validation/`

Minimum required gates:

1. Pre/post static scans for:
   - `ThreeView.vue` lifecycle/watch/listener/runtime construction responsibilities;
   - `ThreeViewRuntime` collaborator/default wiring and group replacement;
   - `ThreeSceneHostPlatform`, `requestAnimationFrame`, `cancelAnimationFrame`, `WebGLRenderer`, `CSS2DRenderer`, and `OrbitControls` ownership;
   - `ThreeObjectRegistry` disposal paths;
   - active scene-adapter usage, including `AxisLabelSceneAdapter`;
   - `as any` in focused three-view adapter tests;
   - protected overlay pointer-boundary assertions.
2. Focused Vitest:
   - `npm run test --workspace=frontend -- tests/unit/rendering/threeView/threeViewRuntime.spec.ts tests/unit/rendering/threeView/threeSceneHost.spec.ts tests/unit/rendering/threeView/threeObjectRegistry.spec.ts tests/unit/rendering/threeView/threeSceneAdapters.spec.ts tests/unit/components/panels/threeViewShellBoundary.spec.ts`
3. Root and frontend lint where defined:
   - `npm run lint`
   - `npm run lint --workspace=frontend`
4. Full root and frontend Vitest:
   - `npm run test`
   - `npm run test --workspace=frontend`
5. Root and frontend build:
   - `npm run build`
   - `npm run build --workspace=frontend`
6. Root and frontend Playwright/e2e because the touched boundary is user-observable:
   - `npm run test:e2e`
   - `npm run test:e2e --workspace=frontend`
   - Must include `frontend/tests/e2e/current-ui-contract.spec.ts` overlay pointer-boundary evidence.
7. Live preview refresh:
   - start/refresh `npm run dev --workspace=frontend -- --host 0.0.0.0`;
   - capture an HTTP 200 probe from `http://127.0.0.1:5173/`;
   - run live browser evidence proving representative app shell, SVG canvas, 3D overlay/panel, controls, display options, and 3D content remain usable and the overlay owns pointer hit-testing.

Any skipped gate must be justified in `implementation-log.md`. E2E/live-preview evidence may not be skipped merely because the change is architectural: this boundary affects user-visible 3D rendering and interactions.

## Stop conditions

Stop implementation and return for a reviewed mini-cycle, delta proposal, or plan edit if any of the following becomes necessary:

- changing domain realization/read-context contracts, reintroducing raw `World`/`any` realization seams, or changing Wave 018 binders;
- creating a new generic renderer/platform/scene-manager module or `ThreeViewPlatform.ts` composition module rather than staying on the direct path;
- moving app-shell project lifecycle, stores, command/undo, persistence, backend, Drive/auth, docs/spec, package/tooling, validation-platform, or broad UI concerns into Wave 019;
- changing user-visible OrbitControls behavior, overlay CSS/pointer semantics, camera/display-option semantics, or canvas interaction behavior;
- replacing `ThreeObjectRegistry` with parallel object lifetime paths;
- touching unrelated dirty `Intersections.ts` or `ActionGroup.ts` for compile/test success;
- needing broad test rewrites outside the focused three-view runtime/host/registry/adapter/shell/e2e protection set.

## Residual risks accepted

- The direct path may be small because current source already contains many Wave 019 seams. This is accepted: the value is architectural closure, contract hardening, deletion of weak shims, and full validation rather than artificial churn.
- Constructor-default production composition inside `ThreeViewRuntime` may remain a mild smell. This is accepted for the direct path unless implementation proves it materially prevents ownership clarity or testability.
- Lifecycle tests can overfit Three.js internals. Implementation tests should assert ownership effects, disposal, scheduling/cancellation, and collaborator boundaries rather than reimplementing Three.js.
- Animation-frame and CSS2D DOM cleanup remain fragile; focused tests and live/e2e evidence must guard leaks and pointer regressions.
- Workspace source-control noise can hide unrelated changes; implementation must use path-scoped status/diff and stage only selected Wave 019 files.

## Final recommendation

Proceed to `cycle-019-implement-three-scene-host-lifecycle-renderer-platform-post-018` using `proposal-direct.md` exactly as constrained above. No blockers remain before implementation.
