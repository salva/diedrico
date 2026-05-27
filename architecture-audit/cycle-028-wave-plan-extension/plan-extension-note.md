# Cycle 028 Plan Extension Note — Wave 028 ranking and evidence

## Source-control hygiene

- Broad MCP `git_status` overflowed because the worktree is known to be broadly dirty.
- A path-scoped status check for this stage and the relevant source seams reported pre-existing modifications in `frontend/src/domain/calculations/Intersections.ts` and `frontend/src/domain/processTree/ActionGroup.ts`; this design task did not read those files for conclusions, did not revert them, and did not stage them.
- This task intentionally changed only audit/design artifacts under `architecture-audit/` and the stage report directory. No production source, tests, package/tooling, backend, docs/specs, secret/config, Drive/auth, or preview files were modified.
- Secret/config files were not read.

## Evidence inspected

- `architecture-audit/wave-plan.md` tail and headings through Wave 027.
- `architecture-audit/cycle-027-runtime-read-model-extractors/implementation-log.md` and `decision.md`.
- `architecture-audit/cycle-026-hotfix-3d-view-interaction-regression/implementation-log.md`.
- Current source seams in `RuntimeSession`, canvas presentation, projected-3D canvas selector, three presentation, and realization context files.
- Stable evidence captured in `architecture-audit/cycle-028-wave-plan-extension/source-evidence.md`.

## Current centrality ranking after Wave 027

1. **Selected Wave 028: canvas projection DTO selectors and realization-read context ownership.** Wave 027 explicitly left `CanvasWorldReadPort.getAllProjectionPlanes()` and the raw projected-3D getter trio as residuals because `CanvasPresentationSelector` and `Projected3DCanvasSelector` still own raw traversal. Current source confirms that `CanvasWorldReadPort` exposes raw domain collections and realization calls, while the selectors consume raw projection planes and 3D elements directly.
2. **ThreeWorldReadPort adapter breadth.** Still real, but its public interface already exposes named 3D read-model methods. It is a candidate after the canvas seam or as a small alignment point only if the Wave 028 proposals prove shared realization-read context duplication is directly in scope.
3. **Domain realization/read-context ownership.** Current source already has typed `ProjectionElementRealizationContext`, `Element3DRealizationContext`, and `PlaneEquationRealizationContext`, so the immediate smell is adapter traversal/ownership rather than an untyped domain contract. Defer broad domain realization cleanup unless Wave 028 proves it is prerequisite.
4. **Runtime persistence/session contracts and ProjectService schema/DTO boundaries.** Central but lower than active canvas read-boundary cleanup because Wave 027 just stabilized runtime read models and the next raw traversal seam is in user-observable presentation.
5. **Command history/producer and command-backed visibility.** Important but intentionally deferred; Wave 027 isolated visibility as an intent, and Wave 028 must not redesign undo/persistence semantics.
6. **UI composition, docs/spec drift, validation/live-preview tooling, Drive/auth, package/tooling, backend/frontend stance.** Deferred as peripheral/integration/enforcement concerns relative to the current raw canvas presentation seam.

## Why Wave 028 is bounded

The new entry targets exactly the raw canvas traversal seams that Wave 027 documented as residuals:

- `CanvasWorldReadPort.getAllProjectionPlanes()` and raw 3D getter trio.
- `CanvasPresentationSelector` loops over projection planes and per-plane points/lines/circles.
- `Projected3DCanvasSelector` nested loops over all planes and all 3D points/lines/segments.
- Runtime canvas wiring only where type contracts need alignment.

The entry explicitly excludes persistence, command history/producers, backend, docs/specs, Drive/auth, package/tooling, validation tooling, UI feature work, command-backed visibility, broad app-kernel work, and unbounded domain rewrite.

## 3D interaction lesson

Cycle 026 proved that presentation-adjacent work can regress pointer ownership even when the architecture target is not CSS. The Wave 028 entry therefore requires preserving or rerunning overlay pointer-boundary evidence when presentation/overlay-adjacent files are touched. This is a validation constraint, not a reason to choose a lower-centrality CSS/UI wave.

## No-implementation confirmation

No Wave 028 implementation was performed. The next recommended stage is `cycle-028-fresh-scout-proposals`, producing `proposal-direct.md` and `proposal-restructure.md` under a new Cycle 028 implementation directory after this wave-plan extension passes critic and reviewer convergence.
