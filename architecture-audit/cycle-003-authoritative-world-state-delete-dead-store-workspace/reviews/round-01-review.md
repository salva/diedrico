# Round-01 Review — Wave 003: Establish one authoritative world state and delete dead store/workspace paths

**Reviewer:** reviewer (primary, round 01)
**Stage:** cycle-003-review-round-01
**Date:** 2026-05-25
**Proposals reviewed:**
- `architecture-audit/cycle-003-authoritative-world-state-delete-dead-store-workspace/proposals/proposal-direct.md`
- `architecture-audit/cycle-003-authoritative-world-state-delete-dead-store-workspace/proposals/proposal-restructure.md`

**Supporting evidence consulted:**
- `architecture-audit/cycle-003-authoritative-world-state-delete-dead-store-workspace/scope-check.md`
- `architecture-audit/wave-plan.md`
- Direct source inspection of all proposed deletion targets
- Import-surface grep of `frontend/src/` and `frontend/tests/` for `worldStore`, `useWorldStore`, `Workspace2D`, `ElementRenderer`, `ElementTypes`, `useSnapping`, `useElementGeometry`, `ElementPropertiesDialog`, `ElementGroup`, `ValidationService`
- `worldStore.ts` field verification (no `world` field confirmed)
- `main.ts` debug helper verification (broken `worldStore.world` access confirmed)
- `dynamic-planes.spec.ts` e2e review for `window.getWorld()` dependency
- Cycle 001 and 002 review artifacts for format and process consistency

---

## Criterion 1: Does it advance the wave's target outcome?

**Wave 003 target outcome** (from wave-plan.md): "The application has one authoritative geometric state source: `World` and its projection planes. Store/composable paths may hold UI state or derived view models, but they no longer own parallel geometry maps. Dead workspace files and legacy structural element paths are removed."

**Proposal Direct — Score: STRONG**

The direct proposal directly and completely addresses every component of the target outcome:
- Removes `worldStore.ts` with its duplicate geometry maps (`elements2D`, `elements3D`, `guides`, `dependencyGraph`) — verified: `worldStore.ts:6–10` declares these parallel maps independently of `World`/projection-plane ownership.
- Deletes all dead workspace files (`Workspace2D.vue`, `ElementRenderer.vue`) and their supporting composables (`useSnapping.ts`, `useElementGeometry.ts`).
- Deletes `ElementTypes.ts` and all its consumers (`ElementPropertiesDialog.vue`, `ElementGroup.vue`, `ValidationService.ts`, `formatUtils.integration.spec.ts`), eliminating the parallel structural geometry model.
- Deletes broken debug helpers in `main.ts` that access a non-existent `worldStore.world` field.
- Adds architecture boundary tests to prevent regressions.
- Does not attempt work that belongs to later waves.

**Proposal Restructure — Score: GOOD with CAVEAT**

The restructure proposal achieves all of Proposal Direct's deletion targets AND introduces a `worldViewQueries.ts` / `worldReadModel.ts` query boundary. This advances the target outcome further in one dimension — it prevents active `SvgCanvas.vue` code from having to do ad hoc `World` traversal after the store path is removed. However, the restructure proposal itself acknowledges the risk of pulling Wave 006/007 work forward, and recommends Proposal Direct unless a small query boundary is genuinely needed. This is a responsible self-assessment.

**Finding:** Both proposals advance the wave target. The restructure goes further but at scope creep risk.

---

## Criterion 2: Does it improve architecture and code quality?

**Proposal Direct — Score: STRONG**

Positive:
- Eliminates the most damaging architectural duplication in the codebase: parallel geometry ownership between `worldStore` maps and `World`/projection-plane ownership. Verified: `worldStore.ts:6–10` owns `elements2D`, `elements3D`, `guides`, `dependencyGraph` independently of the domain model.
- Deletes 2,515 lines of dead/unreachable code across 9 source files plus 1 test fixture — a significant quality improvement.
- Deletes broken debug helpers that reference `worldStore.world` (a field that does not exist in `WorldState`). Verified: `worldStore.ts` has no `world` field; `main.ts:42–43,51–52,59–60` would fail at runtime.
- Removes unimplemented geometry (line/circle distance stubs in `useElementGeometry.ts:70–80`, fake intersections at `useElementGeometry.ts:199–204`, placeholder coordinates in `useSnapping.ts:94–112` and `ElementRenderer.vue:103–115`).
- Removes `ElementTypes.ts`, a 339-line parallel structural model with `x`/`y` fields on points that does not match the domain class model (`Point`, `Line`, etc.) used by `World` and `ProjectionPlane`.
- No compatibility shims, no re-export barrels, no adapter stores — the deletion is clean.

**Proposal Restructure — Score: GOOD**

All of Proposal Direct's improvements, plus:
- A query boundary would formalize the read-model contract, making `SvgCanvas.vue`'s relationship with `World` explicit rather than implicit through scattered `world.getX()` calls (verified: 12+ direct `world.` method calls in `SvgCanvas.vue`).

Concern:
- The new query module introduces a new abstraction layer in Wave 003 that partially overlaps Wave 007 (2D rendering selectors) and potentially Wave 006 (tool controllers). This broadens the architectural change without the wave plan having reviewed that expansion.

---

## Criterion 3: Does it respect no-backcompat / aggressive-deletion priorities?

**Proposal Direct — Score: STRONG**

- Deletes all 9 source files + 1 test fixture outright with no compatibility barrels or re-export shims.
- Explicitly deletes `ElementTypes.ts` unconditionally after removing its consumers rather than converting them.
- Explicitly deletes broken debug helpers rather than preserving them with a shim.
- Explicitly deletes `ElementPropertiesDialog.vue`, `ElementGroup.vue`, `ValidationService.ts` as dead code (verified: zero importers outside the delete set) rather than converting them to domain types.
- The proposal explicitly states: "do not add compatibility shims."
- E2e spec references that depend on `window.getWorld()` / `worldStore` are to be deleted or rewritten, not preserved.

**Proposal Restructure — Score: STRONG**

All of Proposal Direct's aggressive deletions, plus:
- Explicitly states "No compatibility aliases such as `worldStore.world`, `LegacyElementTypes`, `Workspace2D` re-export barrels, or adapter stores are allowed."
- The query module is a new read-model, not a compatibility surface — it derives from domain, does not own geometry.

No concerns on this criterion for either proposal.

---

## Criterion 4: Does it avoid overfeaturism?

**Proposal Direct — Score: STRONG**

The proposal does exactly what the wave plan asks — delete the parallel store/workspace path and make `World` the sole authoritative geometry source. It does not attempt to:
- Redesign how `SvgCanvas.vue` queries `World` (that's Wave 007).
- Extract tool controllers (that's Wave 006).
- Add a read-model or query boundary.
- Introduce new abstractions beyond architecture tests.

The scope is tightly bounded to deletion and verification.

**Proposal Restructure — Score: MODERATE**

The query boundary is architecturally reasonable but goes beyond what Wave 003 requires. The wave plan's target outcome says "Store/composable paths may hold UI state or derived view models, but they no longer own parallel geometry maps." It does not ask for a formal read-model boundary in Wave 003. The `worldViewQueries.ts` module is a new feature that should be evaluated in the context of Wave 007 (rendering selectors) or Wave 009 (app shell) where a read-model contract is more naturally motivated.

The proposal's own recommendation ("Prefer Proposal Direct for Wave 003 unless review finds that active SvgCanvas/app traversal needs a tiny query boundary") is the correct self-assessment.

---

## Criterion 5: Does it introduce new risks or hidden regressions?

**Proposal Direct — Score: LOW RISK, with two WARNINGS**

Risks identified and adequately mitigated:
1. **Dead-code deletion risk** — low because all deleted files have verified zero active importers outside the delete set. Verified via comprehensive grep: `Workspace2D.vue` only imported by nothing (App.vue imports SvgCanvas); `ElementRenderer.vue` only imported by `Workspace2D.vue`; `useSnapping.ts` and `useElementGeometry.ts` only imported by `Workspace2D.vue`; `ElementPropertiesDialog.vue`, `ElementGroup.vue`, `ValidationService.ts` have zero importers outside themselves.
2. **Debug helper removal risk** — the helpers are already broken (`worldStore.world` is undefined). Removing broken code is not a regression.
3. **E2e spec breakage** — `dynamic-planes.spec.ts` uses `window.getWorld()` which returns `worldStore.world` (undefined). This test is already broken. Deleting or rewriting it is a fix, not a regression.
4. **Test fixture deletion** — `formatUtils.integration.spec.ts` only tests `ElementPropertiesDialog.vue` (being deleted). Deleting both is correct.

**WARNING W1:** The `dynamic-planes.spec.ts` e2e test calls `window.getWorld()` and then accesses `.world` and `.useWorldStore()` on the result (lines 24–26). This test is already broken at runtime because `getWorld()` resolves to `worldStore.world` which is `undefined`. However, if this spec is currently skipped or not run in CI (many e2e specs are known to be malformed per previous waves), simply deleting the debug helpers without rewriting this spec could leave it in a state where it fails on a different code path than before. The implementation must explicitly handle this spec — either delete it entirely or rewrite it to use the injected `World` directly. **The proposal mentions this but the wording ("delete or rewrite") should be more specific about the preferred path: delete, because this test uses console injection to bypass the UI, which is a debug pattern that should not be preserved.**

**WARNING W2:** The `basic-construction.spec.ts`, `distance-transport.spec.ts`, and `infeasibility.spec.ts` e2e specs contain TODO comments referencing `Workspace2D` integration (e.g., `basic-construction.spec.ts:28: // TODO: Once Workspace2D and PointTool are integrated:`). These TODOs describe future functionality that is now being explicitly deleted rather than integrated. The implementation should remove these TODO comments or rewrite them to reference `SvgCanvas` integration, rather than leaving stale `Workspace2D` references in the spec files. **The proposal mentions this risk but the handling instruction ("if those specs are edited for e2e repair") is passive. The implementation should proactively update or remove these stale TODOs as part of the delete sweep.**

**Proposal Restructure — Score: MODERATE RISK**

All of Proposal Direct's risks, plus:
1. **Scope creep risk** — the query boundary can accidentally pull Wave 006/007 work forward. The proposal acknowledges this risk.
2. **New module design risk** — `worldViewQueries.ts` must be carefully scoped to avoid becoming a second rendering architecture. The proposal provides guidelines but the implementation must enforce them.
3. **Larger change surface** — more files touched means more validation under existing repo debt.

---

## Criterion 6: Is the proposed validation sufficient?

**Proposal Direct — Score: ADEQUATE with one ADDITION NEEDED**

The validation plan covers:
- Static deletion/import checks ✓
- Grep for forbidden imports ✓
- Focused Vitest (architecture boundary, world initialization, projection-plane, selection/delete, tool/Paper, parametric update, undo/redo) ✓
- Full mandatory cadence (lint, focused, full, build, e2e, live preview) ✓

**Addition needed:** The validation plan should include an explicit check that the `dynamic-planes.spec.ts` e2e spec has been deleted or rewritten after the `main.ts` debug helpers are removed. Without this, the spec file could remain in the tree with references to `window.getWorld()` that will fail differently than before (promise rejection vs. undefined property access). The implementation should run: `grep -n "getWorld\|worldStore\|useWorldStore" frontend/tests/e2e/*.spec.ts` and confirm zero matches after implementation.

**Proposal Restructure — Score: ADEQUATE with same ADDITION**

Same validation as Proposal Direct, plus:
- New unit tests for the query module ✓
- Grep to confirm the query module does not own mutable geometry ✓
- Same mandatory cadence ✓

Same addition needed for the `dynamic-planes.spec.ts` check.

---

## Blocking Issues

**B1 (Both proposals):** Both proposals mention handling the `dynamic-planes.spec.ts` e2e test but use passive language ("delete or rewrite", "if those specs are edited"). This spec uses `window.getWorld()` at lines 24–26 to access `worldStore.world` and `worldStore.useWorldStore()`, which are broken at runtime. The proposals must specify the **preferred** resolution: **delete the spec** rather than rewrite it, because (a) the spec uses console injection (`window.getWorld()`) to bypass the UI, which is a debug pattern being removed; (b) the spec tests dynamic plane creation via programmatic API access rather than through the user-facing UI; and (c) rewriting it to use a different debug injection path would preserve the architectural coupling that this wave is designed to eliminate. If dynamic-plane e2e coverage is needed, it should be a UI-driven spec in a future wave.

**Required correction:** Both proposals should add one sentence specifying that `dynamic-planes.spec.ts` should be **deleted** (preferred) rather than rewritten with a new debug injection path, with the rationale that console-injection e2e patterns are the exact architectural surface this wave removes.

---

## Warnings

**W1 (Both proposals):** Stale TODO comments in `basic-construction.spec.ts` (lines 28, 53, 79, 127), `distance-transport.spec.ts` (line 30), and `infeasibility.spec.ts` (line 192) reference `Workspace2D` and `ElementRenderer` integration that this wave explicitly deletes rather than implements. These TODOs should be updated or removed during implementation. Non-blocking — the implementation can handle this as part of the delete sweep.

**W2 (Proposal Restructure):** The query boundary risks scope overlap with Wave 007 (rendering selectors). If Proposal Restructure is selected, the implementation must include an explicit scope guard: the `worldViewQueries.ts` module must not import `PaperService`, `SVGRenderer`, `RenderService`, or `Paper`, and must not produce rendering DTOs. This guard should be tested by an architecture boundary test. Non-blocking — the proposal's own recommendation favors Proposal Direct.

**W3 (Both proposals):** Neither proposal addresses whether the `DependencyGraph` class (imported by `worldStore.ts:4`) will lose a consumer when `worldStore.ts` is deleted. Verified: `DependencyGraph` is imported from `../domain/world/DependencyGraph` and is also used directly by the domain model (`World`, `DependencyService`). This is not a risk — `DependencyGraph` has other importers — but the proposals should confirm this in their deletion impact analysis for completeness. Non-blocking.

---

## Verdict

**BLOCKING ISSUES — 1 blocking issue (B1)**

B1 requires both proposals to specify that `dynamic-planes.spec.ts` should be deleted (not rewritten with a new debug injection path). This is a straightforward correction — add one sentence to each proposal.

Once B1 is resolved through in-place proposal edits, the reviewer recommends **Proposal Direct** for Wave 003 implementation, with the following accepted residual items:
- W1 (stale TODOs) should be handled during implementation as part of the delete sweep.
- W3 (DependencyGraph consumer count) is confirmed safe upon inspection.
- The `dynamic-planes.spec.ts` deletion (per B1) removes the only e2e spec that directly depends on the removed debug surface.

Proposal Restructure is architecturally forward-looking but should be deferred because:
1. The wave plan does not require a query boundary in Wave 003.
2. The query boundary concept belongs more naturally in Wave 007 (rendering selectors) where the full rendering read-model architecture is designed.
3. Adding a query module now without the rendering-selector context risks creating an abstraction that must be redesigned later.
4. Proposal Restructure's own recommendation favors Proposal Direct.

---

## Score Summary

| Criterion | Proposal Direct | Proposal Restructure |
| --- | --- | --- |
| 1. Target outcome advancement | Strong | Good (with caveat) |
| 2. Architecture/code quality improvement | Strong | Good |
| 3. No-backcompat/aggressive deletion | Strong | Strong |
| 4. Avoidance of overfeaturism | Strong | Moderate |
| 5. New risks/hidden regressions | Low risk (W1, W2 warnings) | Moderate risk |
| 6. Validation sufficiency | Adequate (one addition needed) | Adequate (same addition needed) |

**Recommended proposal after B1 resolution:** Proposal Direct
