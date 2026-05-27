# Cycle 028 next-wave re-rank recommendation

**Cycle:** 028 — Canvas projection DTO selectors and realization-read context ownership  
**Stage context:** `cycle-028-validation-and-preview-refresh`  
**Status:** documentation-only recommendation; this artifact does **not** implement the next wave and does **not** authorize source changes.

## Evidence reread

This recommendation is grounded in current, in-tree evidence only:

- `architecture-audit/wave-plan.md` current wave ordering, especially the active post-Wave-028 entries beginning with Wave 017 and the later Wave 018/019 candidates.
- `architecture-audit/cycle-028-canvas-projection-dto-selectors/decision.md`, which selected Proposal Direct, required deletion of public raw canvas seams, forbade generic world/read-model facades, and explicitly left `ThreeWorldReadPort` as a residual unless a tiny shared realization-context helper became necessary.
- `architecture-audit/cycle-028-canvas-projection-dto-selectors/implementation-log.md`, which records the implemented behavior-sized canvas read-port methods, deleted public raw `CanvasWorldReadPort` methods, projected-3D correction, validation evidence, residual risks, and next-wave candidates.
- `architecture-audit/cycle-027-runtime-read-model-extractors/implementation-log.md`, which explains why the raw canvas projection-plane and projected-3D seams were left for Wave 028 and identifies `ThreeWorldReadPort` as a larger residual adapter.
- `architecture-audit/cycle-026-hotfix-3d-view-interaction-regression/implementation-log.md`, which establishes the 3D overlay pointer-boundary contract that future 3D/presentation work must preserve.
- Targeted current source evidence from the Wave 028 starting points, without modifying source:
  - `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts`
  - `frontend/src/application/canvasPresentation/Projected3DCanvasReadPort.ts`
  - `frontend/src/application/threePresentation/ThreeWorldReadPort.ts`

Secret/config/provider/env files were not read. Production source, package/tooling, backend, docs, specs, persistence, command history, and next-wave implementation were not touched.

## Wave 028 learnings

Wave 028 closed the specific canvas/public-read-port residual left by Wave 027:

- The public canvas selector contract no longer exposes `CanvasWorldReadPort.getAllProjectionPlanes()`, `getAll3DPoints()`, `getAll3DLines()`, `getAll3DSegments()`, or public `realize*` methods.
- `CanvasPresentationSelector` now consumes behavior-sized plane-item DTOs and retains composition/style/render/query/grid responsibilities instead of owning raw plane traversal and public realization calls.
- `Projected3DCanvasSelector` now consumes a `Projected3DCanvasReadPort` DTO source contract.
- A correction moved projected-3D raw `World` traversal out of `CanvasWorldReadPort.ts` and into the dedicated behavior-named `Projected3DCanvasReadPort.ts` module.
- Architecture/static tests now guard the raw-public-seam deletion and absence of generic facades such as `RuntimeWorld` or `WorldReadModel`.
- Validation evidence in the implementation log reports green focused canvas/projected-3D tests, root/frontend lint, full root/frontend Vitest, root/frontend build, root/frontend e2e, and preview reachability, with the 3D overlay pointer-boundary e2e still covered.

The important architectural conclusion is that the highest-centrality remaining issue is no longer the public canvas raw getter seam. That seam has been deleted. The remaining central presentation/read-model work is now the 3D presentation and realization-read boundary:

- `CanvasWorldReadPort.ts` still internally traverses `World` and projection-plane collections as an adapter boundary; this is accepted Wave 028 residual, not a public selector seam.
- `Projected3DCanvasReadPort.ts` now intentionally localizes projected-3D raw traversal behind a behavior-named port.
- `ThreeWorldReadPort.ts` remains the broadest active presentation adapter, with a separate realization context, raw projection-plane/2D/3D/hinge traversal, mixed DTO families, and classification logic in one module.

## Re-ranked remaining/candidate work

### 1. Immediate next work: Wave 017 — Three presentation read ports and realization boundary

**Recommendation:** start a **fresh scout/proposals stage** for Wave 017 after Cycle 028 validation/preview closure completes.

Recommended canonical stage name: `cycle-017-fresh-scout-proposals` (or the existing project naming convention for Wave 017 fresh scout/proposals).

**Do not start with another wave-plan-extension** unless the Cycle 028 closure or Wave 017 scout finds that the current Wave 017 entry is invalidated. The wave plan already contains a Wave 017 entry whose premise still matches the post-Wave-028 code: 3D presentation/read access remains the next central residual after canvas presentation seam deletion. A fresh scout is the correct next step because Phase 3 requires rereading the wave entry against current source, writing `scope-check.md`, then producing `proposal-direct.md` and `proposal-restructure.md` before review. A plan extension would be redundant unless the fresh scout proves the entry needs rewriting.

**Centrality rationale:**

1. **Boundary centrality:** 3D presentation adapters sit directly between the domain/realization model and user-visible 3D output. This is a core rendering/read-model boundary, not peripheral UI polish.
2. **Dependency on Wave 028:** Wave 028 stabilized the canvas-side DTO/read-port pattern and localized projected-3D traversal. Wave 017 can now align the 3D presentation boundary against that current shape instead of stale public canvas raw getters.
3. **No-backcompat/deletion fit:** Wave 017 should delete full-`World` three-presentation selector/input seams where still present, duplicate realization-context assembly, broad `ThreeWorldReadPort` responsibilities, touched `as any` test seams, transitional overloads, and dead exports. It should not wrap old APIs for compatibility.
4. **Risk containment:** The Cycle 026/028 3D overlay pointer-boundary regression is now explicitly covered by e2e evidence. Wave 017 can preserve that surface while focusing on read-port/realization data ownership rather than scene-host interaction behavior.
5. **Ordering:** This remains more central than scene-host lifecycle, app-shell/browser integration, backend/docs/spec cleanup, debug/log cleanup, or DTO-native style polish. It also comes before Wave 019 scene-host work because scene rendering should consume cleaner 3D read models before scene lifecycle/platform extraction.

### 2. Next after Wave 017: Wave 018 — Domain realization context boundary

Wave 018 should remain the immediate fallback/next candidate if Wave 017 scout proves the correct fix is one conceptual layer lower. The trigger should be explicit evidence that 3D and canvas adapters cannot be cleanly aligned without changing the domain realization context contract itself. If that evidence appears during Wave 017 scout/proposals, the team should stop before implementation and use the reviewed plan-edit path rather than smuggling domain realization redesign into Wave 017.

### 3. Then: Wave 019 — Three scene-host lifecycle and renderer platform boundary

Wave 019 should stay behind Wave 017/018. Scene-host lifecycle and renderer platform separation is important, but it is less central than first defining the read-port/realization DTOs that feed the scene. It also touches user-observable 3D interaction, so it benefits from the cleaner data boundary and preserved pointer-contract tests.

### 4. Later/lower-priority candidates

- DTO-native canvas style policy extraction and removal of localized `point.constructor.name` / object-cast residuals are valid cleanup candidates, but they are narrower than the broad `ThreeWorldReadPort` residual and should not displace Wave 017.
- App-shell/session/command-producer/runtime-port waves should remain behind active presentation/realization boundary work unless fresh source evidence shows a more central blocker.
- Backend/docs/spec/debug cleanup remains peripheral relative to active rendering/read-model and domain realization seams.

## Recommended Wave 017 fresh-scout instructions

The next designer stage should produce Wave 017 `scope-check.md`, `proposals/proposal-direct.md`, and `proposals/proposal-restructure.md` after rereading current source and final Cycle 028 validation artifacts.

Recommended scout questions:

1. Which `frontend/src/application/threePresentation/*` modules still expose or depend on full mutable `World` versus behavior-sized read ports/DTOs?
2. Can `ThreeWorldReadPort.ts` be split into focused behavior-named read modules for projection planes, planar elements, reconstructed elements, guides/intersections, and hinges without changing scene-host behavior?
3. Is a tiny shared realization-context factory justified for canvas and 3D, or would it become a generic world/read-model facade? If it is not tiny, leave shared/domain realization context to Wave 018.
4. Which tests currently require broad `as any` or full-world seams and should be deleted/replaced with read-port/DTO contract tests?
5. How will the proposal preserve the Cycle 026/028 3D overlay pointer-boundary e2e contract and avoid scene-host/OrbitControls overreach?

Recommended proposal split:

- **Proposal Direct:** bounded 3D presentation read-port decomposition and `ThreeWorldReadPort` responsibility split, preserving current scene-host and pointer behavior.
- **Proposal Restructure:** evaluate whether the right fix is a shared/domain realization-context boundary (Wave 018-level) before further presentation adapter splitting.

## Protected surfaces for the next stage

Wave 017 scout/proposals should not implement source changes and should not broaden into:

- persistence schema/replay, `ProjectService`, Drive/local persistence, command history, command producers, command serialization, or `CommandStack` redesign;
- backend, docs/specs, package/tooling, validation-platform code, preview scripts, Drive/auth/browser adapter changes, provider/config/env files, or stale discarded audit cycles;
- broad 3D scene-host/OrbitControls/CSS pointer behavior changes unless a reviewed proposal explicitly scopes them;
- UI feature work, app-kernel facades, generic `RuntimeWorld` / `WorldReadModel` snapshots, or compatibility wrappers.

## Final recommendation

After Cycle 028 validation/preview closure marks Wave 028 complete, proceed to **Wave 017 fresh scout/proposals**, not another wave-plan-extension, because the current plan already contains a valid next central wave and Wave 028 learnings strengthen rather than invalidate it. The scout should re-rank against final closure evidence, but the default next canonical stage is:

`cycle-017-fresh-scout-proposals`

This artifact is documentation-only. It does not implement Wave 017, does not edit source, and does not skip the required designer/critic/reviewer convergence steps.
