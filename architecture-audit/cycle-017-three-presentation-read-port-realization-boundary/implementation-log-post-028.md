# Cycle 017 Implementation Log — Three presentation read ports and realization boundary (post-Wave-028)

## Implementation summary

Implemented the decision-selected Proposal Direct path from `decision-post-028.md`.

Three presentation no longer exposes selector dependencies through the former broad `ThreeWorldReadPort` god-interface. The runtime boundary now creates `ThreePresentationReadPorts`, an explicit composition of concern-owned read ports:

- `projectionPlanes` via `ThreeProjectionPlaneReadPort.ts`
- `planarElements` via `ThreePlanarElementReadPort.ts`
- `reconstructedElements` via `ThreeReconstructedElementReadPort.ts`
- `guides` via `ThreeGuideReadPort.ts`
- `hinges` via `ThreeHingeReadPort.ts`

`ThreeWorldReadPort.ts` remains only as the composition/factory export for `createThreePresentationReadPorts` and re-exported public types. It no longer owns DTO traversal/classification bodies or a monolithic public interface.

## Source files changed

Production:

- `frontend/src/application/threePresentation/ThreeWorldReadPort.ts`
- `frontend/src/application/threePresentation/ThreePresentationReadModel.ts`
- `frontend/src/application/threePresentation/ThreeRealizationContext.ts`
- `frontend/src/application/threePresentation/ThreeProjectionPlaneReadPort.ts`
- `frontend/src/application/threePresentation/ThreePlanarElementReadPort.ts`
- `frontend/src/application/threePresentation/ThreeReconstructedElementReadPort.ts`
- `frontend/src/application/threePresentation/ThreeGuideReadPort.ts`
- `frontend/src/application/threePresentation/ThreeHingeReadPort.ts`
- `frontend/src/application/threePresentation/ThreePresentationModel.ts`
- `frontend/src/application/threePresentation/ThreePresentationSelector.ts`
- `frontend/src/application/threePresentation/ProjectionPlane3DSelector.ts`
- `frontend/src/application/threePresentation/PlanarElement3DSelector.ts`
- `frontend/src/application/threePresentation/ReconstructedElement3DSelector.ts`
- `frontend/src/application/threePresentation/Guide3DSelector.ts`
- `frontend/src/application/threePresentation/Hinge3DSelector.ts`
- `frontend/src/application/appShell/RuntimeSession.ts`
- `frontend/src/application/appShell/RuntimeViewPorts.ts`
- `frontend/src/components/panels/ThreeView.vue`

Tests:

- `frontend/tests/unit/application/threePresentation/threePresentationSelector.spec.ts`
- `frontend/tests/unit/application/threePresentation/threePresentationConcernSelectors.spec.ts`
- `frontend/tests/unit/application/threePresentation/threePresentationArchitectureBoundary.spec.ts`
- `frontend/tests/unit/components/panels/threeViewShellBoundary.spec.ts`

No backend, docs, specs, package/tooling, persistence, command history/producer, scene-host, OrbitControls, or overlay CSS/layout files were changed.

## Legacy surfaces deleted / proven gone

Deleted from production source:

- `createThreeWorldReadPort` broad factory.
- `ThreeWorldReadPort` broad public interface with seven method families.
- selector `Pick<ThreeWorldReadPort, ...>` dependencies.
- `ProjectionPlane3DSelector.select(readPort: ThreeWorldReadPort, ...)`.
- monolithic `ThreeWorldReadPort.ts` traversal/classification bodies.

Localized residuals:

- `ThreeWorldReadPort.ts` is retained as a composition/type export only because existing boundary imports already point at that module. It contains no per-concern traversal bodies and exposes named slices under `ThreePresentationReadPorts`.
- `ThreePresentationPort.getReadPorts()` is a named slice-composition accessor used by `ThreeView.vue`; it replaces the old singular `getReadPort()` and does not expose `World` or a generic facade.

Test seam cleanup:

- Touched selector tests now use explicit read-port slice fixtures instead of one broad `as any` read port fixture.
- Remaining `as never` casts in the concern adapter test are narrow synthetic domain-world fixture adapters needed to satisfy concrete `World` structural typing without introducing a broad mock port.

## Realization-context ownership

Added `ThreeRealizationContext.ts` as a tiny three-local typed `World` to `ProjectionElementRealizationContext & Element3DRealizationContext` factory. It contains no selector DTO behavior, style/visibility policy, persistence, command/undo, rendering lifecycle, mutation, app-kernel facade, or generic read-model methods beyond the existing realization context contract.

No shared canvas helper was introduced. `CanvasWorldReadPort.ts` and `Projected3DCanvasReadPort.ts` were not touched.

## ThreeView / pointer boundary

`ThreeView.vue` was changed only mechanically from `getReadPort()`/`readPort` to `getReadPorts()`/`readPorts`. No scene-host lifecycle, OrbitControls, camera, renderer, CSS, overlay layout, or pointer-event behavior changed.

Pointer-boundary evidence:

- `frontend/tests/unit/components/panels/threeViewShellBoundary.spec.ts` passes.
- Root and frontend Playwright e2e pass, including `current-ui-contract.spec.ts:89` — `3D overlay owns pointer interaction and does not pass drag gestures through to the 2D canvas`.

## Protected source-control reconciliation

Path-scoped pre-implementation diff for authorized Wave 017 files was empty.

The protected unrelated dirty files named in the decision were not read for implementation logic, not edited, not staged, and not depended on:

- `frontend/src/domain/calculations/Intersections.ts`
- `frontend/src/domain/processTree/ActionGroup.ts`

Broad MCP `git_status` overflowed before implementation, consistent with the decision context. Work therefore used path-scoped diff/status evidence and staged only the files listed in this log plus this implementation log/report.

## Static scan evidence

Logs under `architecture-audit/cycle-017-three-presentation-read-port-realization-boundary/validation/`:

- `static-scan-three-port-refs-pretest.*` — pre-test scan after initial split.
- `static-scans-final-rerun.*` — final protected-surface scan.
- `static-scan-entity-split.*` — final scan after moving `ThreeEntityPresentationData` into `ThreePresentationReadModel.ts`.

Findings:

- Production Vue component scan shows no `World` import/injection in `ThreeView.vue`.
- No `RuntimeWorld`, `WorldReadModel`, or `PresentationWorld` production facade was introduced.
- `CanvasWorldReadPort.ts` has no public raw `getWorld`, `getProcessTree`, or realization-context seam reintroduced.
- Concern selectors no longer import or type against `ThreeWorldReadPort`; the only `ThreeWorldReadPort.ts` references are composition-module imports/types and test guard strings.
- `getReadPort()` was replaced by `getReadPorts()`; no dual singular/broad compatibility path remains.

## Validation log index

Initial expected failure while discovering script shape:

- `focused-vitest-three-presentation.*` — failed because frontend package has no `test:unit` script; reran with `npm run test -- ...`.

Focused tests:

- `focused-vitest-three-presentation-green2.*` — passed 13 focused tests.
- `focused-vitest-after-entity-split.*` — passed 13 focused tests after final DTO-base split.

Lint / architecture:

- `root-lint-rerun.*` — passed 11 architecture tests.
- `frontend-lint-rerun.*` — passed 11 architecture tests.

Full Vitest:

- `root-full-vitest-rerun.*` — passed, exit code 0.
- `frontend-full-vitest-rerun.*` — passed, exit code 0.

Build:

- `root-build.*` — passed `vue-tsc && vite build` through root workspace; Vite chunk-size warning only.
- `frontend-build.*` — passed `vue-tsc && vite build`; Vite chunk-size warning only.
- `frontend-build-after-entity-split.*` — passed after final DTO-base split; Vite chunk-size warning only.

E2E / Playwright:

- `root-e2e.*` — passed 10/10 tests, including the 3D overlay pointer-boundary test.
- `frontend-e2e.*` — passed 10/10 tests, including the 3D overlay pointer-boundary test.

Live preview:

- `live-preview-reachability.*` — `curl -I http://127.0.0.1:5173/` returned HTTP 200. Existing preview server was reachable on the required port; no secret/config files were read.

## Residual risks

- `ThreeWorldReadPort.ts` remains as a historical filename for the composition factory/type exports. It is not a god-interface, but a future cleanup wave may rename it to remove stale naming entirely if that can be done without broad churn.
- Vite continues to emit the pre-existing chunk-size warning during production builds; not attributable to this wave.

## Next-wave candidates

- Consider a narrow follow-up naming cleanup to rename the composition module from `ThreeWorldReadPort.ts` to a neutral `ThreePresentationReadPorts.ts` once no adjacent wave is using the historical filename.
- Wave 018/domain realization work may still centralize or improve realization context contracts, but this implementation did not require domain realization API/semantic changes.

## Reviewer correction — realization-context collection traversal boundary (t3)

A reviewer-blocking issue was corrected after the initial implementation: `ThreeRealizationContext.ts` no longer owns broad `World` collection traversal for projection planes or hinge lines. The helper now remains a typed realization-context binder for lookup/realization methods and receives concern-owned collection providers from the adapters that actually need them.

Files changed for this correction:

- `frontend/src/application/threePresentation/ThreeRealizationContext.ts` — removed direct `world.getAllProjectionPlanes()` / `world.getAllHingeLines()` ownership from the helper.
- `frontend/src/application/threePresentation/ThreePlanarElementReadPort.ts` — owns projection-plane collection traversal for planar element DTO construction and passes that provider into the realization context.
- `frontend/src/application/threePresentation/ThreeHingeReadPort.ts` — owns hinge-line traversal for hinge DTO construction and supplies hinge/projection-plane collection providers needed by hinge realization.
- `frontend/src/application/threePresentation/ThreeGuideReadPort.ts` — supplies empty collection providers because selected guide realization does not own broad collection traversal.
- `frontend/tests/unit/application/threePresentation/threePresentationArchitectureBoundary.spec.ts` — added a guard proving the realization-context helper does not call broad collection traversal and that traversal remains in owning concern adapters.

Validation evidence added under `architecture-audit/cycle-017-three-presentation-read-port-realization-boundary/validation/`:

- `t3-context-collection-usage-search.*` and `t3-domain-context-call-sites.*` — scoped inspection of collection-context call sites before the fix.
- `t3-realization-context-static-scan.*` — confirms `ThreeRealizationContext.ts` has no direct broad collection traversal; remaining traversal is localized in `ThreePlanarElementReadPort.ts` and `ThreeHingeReadPort.ts`.
- `t3-focused-vitest-rerun.*` — corrected focused Vitest invocation passed 13 tests after the helper signature change.
- `t3-focused-vitest-after-guard.*` — focused Vitest passed 14 tests after adding the static architecture guard.
- `t3-frontend-lint.*` — frontend architecture lint passed 11 tests.
- `t3-frontend-build.*` — frontend `vue-tsc && vite build` passed; Vite chunk-size warning only.

The initial `t3-focused-vitest.*` command failed because it used root-relative test paths while running from `frontend/`; it was rerun with frontend-relative paths and passed. No canvas, persistence, command, backend/docs/specs, scene-host, OrbitControls, overlay CSS/layout, package/tooling, or unrelated protected domain files were touched for this correction.

---

## Validation/preview closure — cycle-017-validation-and-preview-refresh-post-028

**Closure status:** Wave 017 COMPLETE.

This closure independently rechecked the post-Wave-028 Wave 017 implementation without production source refactor, package/tooling churn, backend/docs/specs edits, persistence/command-history redesign, scene-host/OrbitControls/CSS pointer changes, broad domain-realization redesign, or next-wave implementation.

### Closure source-control and protected-surface reconciliation

Fresh path-scoped status/diff evidence was captured because broad workspace status is too large/noisy in this repository:

- `validation/closure-git-status-pre.stdout` / `.stderr`
- `validation/closure-git-status-final.stdout` / `.stderr`
- `validation/closure-static-scans.stdout` / `.stderr`

Production Wave 017 source paths had no path-scoped diff at the start of closure. The closure task modified only this implementation log, validation evidence logs/screenshots, and its own task report. The protected unrelated dirty files remained out of scope and were not read for implementation logic, edited, staged as source work, or required for validation fixes:

- `frontend/src/domain/calculations/Intersections.ts`
- `frontend/src/domain/processTree/ActionGroup.ts`

### Closure static/read-port evidence

Fresh static scans in `validation/closure-static-scans.stdout` confirm the Wave 017 split remains intact:

- no `createThreeWorldReadPort`, broad `interface ThreeWorldReadPort`, `Pick<ThreeWorldReadPort>`, or `getReadPort()` compatibility path remains in the checked application/component/three-presentation test surfaces;
- no `RuntimeWorld`, `WorldReadModel`, or `PresentationWorld` generic facade was introduced;
- `ThreeWorldReadPort.ts` remains only a composition/type export module for `ThreePresentationReadPorts` with explicit concern slices;
- concern traversal/DTO ownership remains localized in `ThreeProjectionPlaneReadPort.ts`, `ThreePlanarElementReadPort.ts`, `ThreeReconstructedElementReadPort.ts`, `ThreeGuideReadPort.ts`, and `ThreeHingeReadPort.ts`;
- `ThreeRealizationContext.ts` no longer directly owns broad `world.getAllProjectionPlanes()` / `world.getAllHingeLines()` collection traversal; it accepts collection providers from concern adapters;
- `CanvasWorldReadPort` / projected-3D canvas public raw-world seam invariants remain protected by scan evidence;
- `ThreeView.vue` still has no concrete `World` import and no closure change touched scene-host lifecycle, OrbitControls, overlay CSS/layout, camera, renderer, or pointer behavior.

### Closure validation log index

Fresh closure validation was rerun and passed with stable logs under `architecture-audit/cycle-017-three-presentation-read-port-realization-boundary/validation/`:

- `closure-focused-three-vitest.stdout` / `.stderr` — passed 4 focused files, 14 tests: three-presentation selector, concern selectors, architecture boundary guard, and ThreeView shell boundary.
- `closure-root-lint.stdout` / `.stderr` — root lint passed via frontend architecture tests, 11 tests.
- `closure-frontend-lint.stdout` / `.stderr` — frontend lint passed, 11 architecture tests.
- `closure-root-vitest-full.stdout` / `.stderr` — root full Vitest passed: 114 files passed, 1 skipped; 1283 tests passed, 45 skipped, 11 todo.
- `closure-frontend-vitest-full.stdout` / `.stderr` — frontend full Vitest passed with the same 114/1 file and 1283/45/11 test summary.
- `closure-vitest-summary.stdout` / `.stderr` — tail summary of the full root/frontend Vitest logs.
- `closure-root-build.stdout` / `.stderr` — root build passed (`vue-tsc && vite build` through frontend workspace); Vite chunk-size warning only.
- `closure-frontend-build.stdout` / `.stderr` — frontend build passed; Vite chunk-size warning only.
- `closure-root-e2e.stdout` / `.stderr` — root Playwright e2e passed 10/10, including `current-ui-contract.spec.ts:89` for the 3D overlay pointer boundary.
- `closure-frontend-e2e.stdout` / `.stderr` — frontend Playwright e2e passed 10/10, including the same 3D overlay pointer-boundary regression.

The first closure static command used `/bin/sh` with `set -o pipefail` and failed before checks ran; it was immediately superseded by the bash rerun in `closure-static-command.*` and the green `closure-static-scans.*` evidence. A first live-smoke attempt from the repository root failed because the `playwright` module is workspace-local to `frontend/`; it was superseded by the successful frontend-workspace smoke below.

### Live preview refresh and 3D interaction evidence

The live preview was refreshed/confirmed on `0.0.0.0:5173`:

- `closure-preview-start.stdout` / `.stderr` — started `npm run dev -- --host 0.0.0.0` from `frontend/`; first probe raced startup, second probe reached the app.
- `closure-preview-refresh.stdout` / `.stderr` — Vite reports `Network: http://10.0.3.113:5173/` and local access on port 5173.
- `closure-preview-probe.stdout` / `.stderr` and `closure-preview-probe.headers` — `curl http://127.0.0.1:5173/` returned HTTP 200.
- `closure-live-3d-canvas-smoke.stdout` / `.stderr` and `closure-live-3d-canvas-smoke.png` — frontend-workspace Playwright smoke loaded the live preview, verified `.three-view-overlay` has `pointer-events: auto`, verified `document.elementFromPoint` hits inside the overlay, dragged inside the 3D overlay, and confirmed the SVG canvas `viewBox` did not change.

This satisfies the user-reported 3D interaction regression check with both CLI Playwright e2e and live-browser smoke evidence. No residual 3D pointer risk is accepted for Wave 017 closure.

### Stale/harness evidence disposition

Older Cycle 017 logs, stale failing validation attempts, and schema-mismatch worker/reviewer envelopes remain superseded by the post-Wave-028 implementation summary, final review acceptance, and this fresh closure validation evidence. The `schema_mismatch` issues were report-envelope/harness contract problems, not source validation failures.

### Residual risks after closure

- `ThreeWorldReadPort.ts` remains a historical filename for a composition/type-export module. It is not a broad read-port facade, but a future naming cleanup may rename it if worth the churn.
- Production builds still emit the pre-existing Vite chunk-size warning; builds pass and the warning is not attributable to Wave 017.

### Re-ranked next-wave recommendation

`architecture-audit/wave-plan.md` was reread by heading and nearby Wave 017/018 context. Because Wave 017 deliberately stopped short of a broad realization-context redesign and closure reconfirmed that `ThreeRealizationContext.ts` is now only a narrow binder supplied by concern adapters, the most central remaining follow-up is still **Wave 018 — Domain realization context boundary**. Recommended next canonical stage: `cycle-018-fresh-scout-proposals-post-017`, with scope-check/proposals focused on the current domain realization context boundary and no implementation until reviewed convergence is complete.

Do not pull peripheral cleanup forward ahead of Wave 018 unless a reviewed plan-edit mini-cycle changes the ordering.
