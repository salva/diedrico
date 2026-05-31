# Wave 008 Review — Round 01

## Reviewed artifacts

- `architecture-audit/wave-plan.md` (Wave 008 entry)
- `architecture-audit/cycle-008-3d-rendering-scene-adapters/scope-check.md`
- `architecture-audit/cycle-008-3d-rendering-scene-adapters/proposals/proposal-direct.md`
- `architecture-audit/cycle-008-3d-rendering-scene-adapters/proposals/proposal-restructure.md`
- `frontend/src/components/panels/ThreeView.vue`
- `frontend/src/services/Element2DRenderer3D.ts`
- `frontend/src/config/rendering3D.ts`

## Verdict

**BLOCKING ISSUES**

The wave premise is correct and both proposals are directionally strong. **Proposal Restructure is the better fit** for Wave 008 because it cleanly applies the Wave 007 selector/read-model pattern to the 3D path and explicitly deletes the `Element2DRenderer3D` raw-`World` renderer smell. However, neither proposal is ready for decision unchanged: both need in-place corrections so the review artifact enforces the 3D shell boundary and avoids leaving selection/store coupling and guide-plane math half-inside `ThreeView.vue`.

## Evidence checked

- Wave 008 explicitly requires `ThreeView.vue` to become a lifecycle/composition shell and to isolate scene adapters/selectors (`architecture-audit/wave-plan.md:429`).
- `ThreeView.vue` currently still mixes Three.js setup, raw scene ownership, projection-plane mesh generation, 3D element rendering, guide/perpendicular-plane rendering, hinge rendering, axes/labels, resize/animation, and a `window as any` world-change bridge (`frontend/src/components/panels/ThreeView.vue:61`, `frontend/src/components/panels/ThreeView.vue:107`, `frontend/src/components/panels/ThreeView.vue:239`, `frontend/src/components/panels/ThreeView.vue:394`, `frontend/src/components/panels/ThreeView.vue:611`, `frontend/src/components/panels/ThreeView.vue:775`, `frontend/src/components/panels/ThreeView.vue:857`, `frontend/src/components/panels/ThreeView.vue:1143`).
- `Element2DRenderer3D.ts` currently accepts `World`, iterates planes/elements, calls `realize2D(world)`, computes 2D→3D transforms, contains clipping/style TODOs, and exposes a likely-deletable `updateVisibility()` path (`frontend/src/services/Element2DRenderer3D.ts:60`, `frontend/src/services/Element2DRenderer3D.ts:83`, `frontend/src/services/Element2DRenderer3D.ts:172`, `frontend/src/services/Element2DRenderer3D.ts:336`, `frontend/src/services/Element2DRenderer3D.ts:384`, `frontend/src/services/Element2DRenderer3D.ts:407`).
- `rendering3D.ts` is already a small config boundary and should remain one rather than becoming a new mixed concern hub (`frontend/src/config/rendering3D.ts:16`).

## Proposal scoring against the six criteria

### Proposal Direct

1. **Advances target outcome:** **Partial**  
   It would materially shrink `ThreeView.vue`, but it leaves too much ambiguity about whether selection-store reads and guide/perpendicular-plane domain math remain in the shell or leak into adapters.

2. **Improves architecture/code quality:** **Moderate**  
   The extraction list is good, and it deletes `Element2DRenderer3D`. But the proposed `ThreePresentationSelector` is still described as a single boundary with many concerns, so it risks replacing one god-module with another.

3. **Respects no-backcompat/aggressive deletion:** **Good**  
   Strong delete list: inline helpers, debug logs, `window as any` bridge, `Element2DRenderer3D`, placeholder style/TODO paths.

4. **Avoids overfeaturism:** **Good**  
   It stays near current behavior and does not pull in Wave 009 shell work.

5. **Introduced risks / hidden regressions:** **Meaningful**  
   Main risk is under-specified boundaries around guide-plane selection, object-group disposal, and whether adapters still receive `World` indirectly.

6. **Validation sufficiency:** **Mostly good**  
   Strong static scans and focused-test intent, but it should explicitly require a shell-boundary scan proving `ThreeView.vue` no longer imports domain projection/guide types or `Element2DRenderer3D` replacements that still take `World`.

### Proposal Restructure

1. **Advances target outcome:** **Strong**  
   Best match to Wave 008: `ThreeView.vue` becomes a shell, application selectors own read-model construction, and scene adapters consume DTOs only.

2. **Improves architecture/code quality:** **Strong**  
   It directly prevents the `Element2DRenderer3D` architecture from reappearing under a new filename and aligns with the Wave 007 selector/controller pattern without reopening Wave 007.

3. **Respects no-backcompat/aggressive deletion:** **Strong**  
   Explicitly deletes `Element2DRenderer3D`, inline helpers, debug logs, `window as any`, raw `World` traversal from adapters, and compatibility shims.

4. **Avoids overfeaturism:** **Acceptable**  
   Slightly larger than Direct, but still scoped to the current 3D view. It does not pull in `App.vue`, backend, or tooling cleanup.

5. **Introduced risks / hidden regressions:** **Manageable**  
   The main risk is size/coordination across selectors and adapters, but the dependency rules are clearer and safer than Direct.

6. **Validation sufficiency:** **Strong with one correction**  
   Good architecture scans, focused tests, mandatory cadence, and live preview checks. It still needs explicit coverage that the selected-guide/perpendicular-plane behavior and CSS2D label lifecycle are preserved after extraction.

## Required corrections before decision

### 1) Make the shell boundary explicit for selection and guide behavior

Both proposals must state plainly that `ThreeView.vue` remains allowed to read UI state (`viewStore`, `selectionStore`) but **must not** contain guide/perpendicular-plane geometry derivation, direct selected-element domain lookup, or raw Three.js object construction after the wave. The selected IDs should cross into the `threePresentation` boundary as input and come back as DTOs.

Why this matters: the current guide/perpendicular-plane path is one of the densest cross-layer leaks in the component (`frontend/src/components/panels/ThreeView.vue:611`). If not called out explicitly, a “shell” implementation could still keep the hardest domain-to-view math in the component and only move easier helpers.

### 2) Require concern-split selectors, not one replacement god-module

Both proposals should be edited to make the split non-optional: projection planes, planar 2D-on-3D elements, reconstructed 3D elements, guides, and hinges must be separate selector concerns under `application/threePresentation/`, even if orchestrated by one top-level controller. Do not allow one large `ThreePresentationSelector` file to absorb all current `ThreeView.vue` and `Element2DRenderer3D` traversal.

Why this matters: Wave 008 is a god-module breakup wave, not a rename wave.

### 3) Add explicit deletion/validation for CSS2D label disposal and object-group replacement

Both proposals mention labels and disposal, but they should explicitly require tests/scans for CSS2D label lifecycle and grouped replacement/disposal semantics, since current code creates labels ad hoc and clears many object families by repeated `scene.children.filter(...).forEach(scene.remove)` patterns (`frontend/src/components/panels/ThreeView.vue:245`, `frontend/src/components/panels/ThreeView.vue:859`, `frontend/src/components/panels/ThreeView.vue:967`).

Why this matters: otherwise the refactor can regress cleanup while appearing architecturally cleaner.

## Recommendation

**Recommend Proposal Restructure after the above in-place corrections.**

It better matches the Wave 008 target outcome, better reuses Wave 007’s selector/read-model discipline, and is more honest about deleting `Element2DRenderer3D` instead of merely relocating it. Proposal Direct can remain as fallback, but only if it is tightened to the same non-negotiable boundary rules.

## Scope control checks

- Good: neither proposal pulls in Wave 009 `App.vue` shell extraction.
- Good: neither proposal expands into backend cleanup, docs reconciliation, or tooling-only work.
- Good: both treat `rendering3D.ts` as a config boundary, not a new architecture sink.
- Required during implementation: do not reopen Wave 007 2D selector/renderer extraction except for small shared style/visibility/read-model policies.
