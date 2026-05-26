# Cycle 017 Implementation Log — Three presentation read-port / realization boundary

## Status

**Implementation complete.** Followed the decision-selected direct path from `decision.md` and `proposal-direct.md`. No fallback/restructure path was used and no reviewed mini-cycle was needed.

## Source files changed

- `frontend/src/application/threePresentation/ThreeWorldReadPort.ts` — new named, narrow 3D presentation read/realization port plus `createThreeWorldReadPort(world)` boundary adapter.
- `frontend/src/application/threePresentation/ThreePresentationModel.ts` — replaced active `ThreePresentationInput.world: World` with `readPort: ThreeWorldReadPort`.
- `frontend/src/application/threePresentation/ThreePresentationSelector.ts` — stopped passing concrete mutable `World` into concern selectors; orchestrates selector-owned read-port slices.
- `frontend/src/application/threePresentation/ProjectionPlane3DSelector.ts` — consumes projection-plane/grid read-port methods and removed local `matrix: any` in favor of `Matrix4x3`.
- `frontend/src/application/threePresentation/PlanarElement3DSelector.ts` — consumes planar read models and removed local `matrix: any` in favor of `Matrix4x3`.
- `frontend/src/application/threePresentation/ReconstructedElement3DSelector.ts` — consumes reconstructed read models instead of full `World`.
- `frontend/src/application/threePresentation/Guide3DSelector.ts` — consumes selected-guide and guide-intersection read models instead of full `World`/guide domain helpers.
- `frontend/src/application/threePresentation/Hinge3DSelector.ts` — consumes hinge read models instead of full `World`.
- `frontend/src/application/threePresentation/ThreeStylePolicy.ts` — narrowed style/visibility helpers to visual-style sources so selectors no longer require domain element classes for presentation styling.
- `frontend/src/components/panels/ThreeView.vue` — wraps injected runtime `World` once at the presentation boundary with `createThreeWorldReadPort(world)` and passes the read port to the runtime.
- `frontend/tests/unit/application/threePresentation/threePresentationSelector.spec.ts` — updated orchestration assertions to the read-port contract.
- `frontend/tests/unit/application/threePresentation/threePresentationConcernSelectors.spec.ts` — updated concern-selector tests to read models and added read-port adapter coverage.
- `frontend/tests/unit/components/panels/threeViewShellBoundary.spec.ts` — updated shell-boundary assertion so ThreeView delegates through the three-presentation read port.

## Deletes / inapplicability proofs

- Deleted active public `ThreePresentationInput.world: World`; it is now `ThreePresentationInput.readPort: ThreeWorldReadPort`.
- Deleted active full-`World` selector signatures for touched three-presentation concern selectors. Static scan `validation/static-scan-after-three-world.stdout` shows no `select(world...)` signatures or `.select(world...)` calls remain in active three-presentation source/tests.
- Deleted calls from `ThreePresentationSelector` that passed concrete mutable `World` into concern selectors.
- Deleted local `matrix: any` seams in touched three-presentation selectors; `ProjectionPlane3DSelector.to3DSegment` and `PlanarElement3DSelector.lift` now take `Matrix4x3`.
- Deleted tests/helpers asserting concern selectors require concrete `World`; focused tests now use selector-owned read-port/read-model inputs.
- No compatibility overloads, dual full-`World`/read-port APIs, broad presentation facades, or dead exports were introduced.
- `CanvasWorldReadPort.ts` was not changed. The direct path did not require tiny shared type alignment with canvas; existing canvas-only realization delegation remains explicitly visible in `validation/static-scan-after-realization.stdout` and is not hidden by this wave.

## Static scan evidence

- Before full-World/read-context scan from HEAD: `validation/static-scan-before-head-three-world.stdout`.
- Before realization delegation scan from HEAD: `validation/static-scan-before-head-realization.stdout`.
- After full-World/read-context scan: `validation/static-scan-after-three-world.stdout`.
  - Remaining `World` references are limited to `ThreeWorldReadPort.ts` adapter and `ThreeView.vue` injection boundary.
- After realization delegation scan: `validation/static-scan-after-realization.stdout`.
  - Three realization calls using `world` now live in `ThreeWorldReadPort.ts` boundary adapter, not in concern selectors.
  - Canvas realization delegation is unchanged and intentionally not broadened.

## Validation log index

Green final validation:

- Root lint: `validation/root-lint.stdout`, `validation/root-lint.stderr` — pass.
- Frontend lint: `validation/frontend-lint.stdout`, `validation/frontend-lint.stderr` — pass.
- Focused Vitest after final edits: `validation/focused-three-vitest-final.stdout`, `validation/focused-three-vitest-final.stderr` — pass, 3 files / 8 tests.
- Full root Vitest final rerun: `validation/root-vitest-full-rerun.stdout`, `validation/root-vitest-full-rerun.stderr` — pass; full result also stashed by harness due output size, exit code 0.
- Full frontend Vitest final rerun: `validation/frontend-vitest-full-rerun.stdout`, `validation/frontend-vitest-full-rerun.stderr` — pass; full result also stashed by harness due output size, exit code 0.
- Root build final: `validation/root-build-final.stdout`, `validation/root-build-final.stderr` — pass. Vite emitted the pre-existing chunk-size warning only.
- Frontend build final: `validation/frontend-build-final.stdout`, `validation/frontend-build-final.stderr` — pass. Vite emitted the pre-existing chunk-size warning only.
- Root Playwright e2e: `validation/root-e2e.stdout`, `validation/root-e2e.stderr` — pass, 8/8.
- Frontend Playwright e2e: `validation/frontend-e2e.stdout`, `validation/frontend-e2e.stderr` — pass, 8/8.

Earlier failed/diagnostic runs retained for provenance:

- `validation/focused-three-vitest-initial.*` — wrong missing `test:unit` script.
- `validation/focused-three-vitest.stdout|stderr` — expected failures before tests were updated to read-port contract.
- `validation/root-vitest-full.*` and `validation/frontend-vitest-full.*` — failed obsolete shell-boundary assertion expecting `world` input.
- `validation/root-build.*`, `validation/frontend-build.*`, `validation/root-build-rerun.*`, `validation/frontend-build-rerun.*` — transient type cleanup failures fixed before final green builds.
- `validation/preview-probe.*`, `validation/preview-probe-retry.*` — first preview refresh attempts used an incorrect root dev argument shape; final refresh below succeeded.

## Preview / live evidence

- Final preview refresh command started frontend Vite directly with `npm run -w frontend dev -- --host 0.0.0.0`.
- Preview process id recorded in `validation/preview-refresh-final.pid`.
- Vite logs: `validation/preview-refresh-final.stdout`, `validation/preview-refresh-final.stderr`.
- Reachability probe: `validation/preview-probe-final.stdout`, `validation/preview-probe-final.stderr`, `validation/preview-probe-final.html` — reachable on `0.0.0.0:5173` via `127.0.0.1:5173` after 2 seconds.
- Focused live browser smoke: `validation/live-3d-canvas-smoke.stdout`, `validation/live-3d-canvas-smoke.stderr`, screenshot `validation/live-3d-canvas-smoke.png` — app loaded, one canvas found, 3D controls visible, Show Planes checked.

## Protected-surface checks

- No backend, package metadata/tooling, persistence/project schema, Drive/local project services, command/undo factories, construction use-cases, app-shell outside the minimal `ThreeView.vue` boundary, scene-host/OrbitControls/camera/lighting/animation, docs/spec reconciliation, or secret/config paths were intentionally modified.
- `frontend/src/rendering/threeView/ThreeViewRuntime.ts` did not require changes; its input type updated transitively through `ThreePresentationInput`.
- Pre-existing unrelated dirty audit/stage paths were not reverted. `scope-check.md`, review artifacts, and pre-existing stage/report paths shown by status were not modified by this implementation except for this new implementation log and validation artifacts.

## Residual risks / next-wave candidates

- `ThreeWorldReadPort` still centralizes several selector slices in one module. It is intentionally narrow and read-only, but future drift should be watched with architecture tests/static scans.
- Canvas realization delegation through `CanvasWorldReadPort` remains unchanged; a later wave can decide whether a shared realization context is warranted.
- Broader 3D scene-host/runtime lifecycle debt remains out of scope for this cycle.
- Domain realization calls still need the full `World` inside the read-port adapter because current domain realization APIs require that context; changing those APIs would be a larger domain-realization wave, not this presentation-boundary wave.

## Retry-01 verification addendum

Retry worker verified that the Cycle 017 implementation already exists in commits `996d2040`, `1866715b`, and `69c39263` after the prior worker returned an invalid report schema. No additional source refactor was required.

Additional retry evidence:

- Path-focused status before retry edits: `validation/status-pre-edit.stdout`, `validation/status-pre-edit.stderr`.
- Retry static scan: `validation/retry-static-scan-three-world.stdout`, `validation/retry-static-scan-three-world.stderr` — only the approved `createThreeWorldReadPort(world)` boundary adapter still mentions `world: World`; no active three-presentation selector full-`World` signatures, `.select(world...)` calls, `getWorld`, or `matrix: any` seams were found.
- Retry focused Vitest: `validation/retry-focused-three-vitest.stdout`, `validation/retry-focused-three-vitest.stderr` — pass, 3 files / 8 tests for three-presentation selector, concern selectors, and ThreeView shell boundary.
- Retry preview probe: `validation/retry-preview-probe.stdout`, `validation/retry-preview-probe.stderr`, `validation/retry-preview-probe.html` — live preview remained reachable at `127.0.0.1:5173` (bound by the existing Vite process recorded earlier for `0.0.0.0:5173`).

The original mandatory validation log index above remains the canonical full validation record for lint, focused/full Vitest, build, e2e, preview refresh, and live smoke. This retry did not touch protected out-of-scope source surfaces and did not introduce fallback/restructure broadening.

## Manager review-hygiene addendum

The implementation reviewer flagged dirty cycle-directory artifacts as a stage-hygiene blocker. Manager inspection captured the exact diff/status in `validation/manager-hygiene-inspection.stdout` and `validation/manager-hygiene-inspection.stderr`.

Resolution/proof:

- `architecture-audit/cycle-017-three-presentation-read-port-realization-boundary/scope-check.md` was already modified before this implementation stage began, as shown in the Manager's first path-focused status logs (`validation/manager-status-before.stdout` and `validation/manager-status-before-review.stdout`). The implementation task instructions explicitly told the retry worker not to modify it, and the implementation log's protected-surface section records that pre-existing dirty audit paths were not reverted or edited by this implementation. The file remains dirty because source-control discipline forbids reverting unrelated pre-existing changes.
- `.saivage/stages/cycle-017-implement-three-presentation-read-port-realization-boundary/tasks.json`, task reports, reviewer reports, and the forthcoming summary are required stage-management artifacts for this implementation stage.
- Manager-created `validation/manager-*` logs, reviewer-created `validation/reviewer-*` logs, retry provenance logs, and `status-before-implementation.txt` are provenance/status evidence for this implementation/review loop. They do not broaden source scope and do not alter protected production surfaces.
- `architecture-audit/cycle-017-three-presentation-read-port-realization-boundary/reviews/round-01-review.md` is the Cycle 017 proposal review artifact referenced by the decision; it is not a production/source modification and is retained as audit evidence rather than deleted.

No source, package/tooling, backend, persistence, command/undo, construction, scene-host, broad app-shell, docs/spec, or secret/config surface was changed by this hygiene clarification. The only post-review material change is this implementation-log addendum plus its supporting Manager status log.

## Validation-and-preview closure addendum

**WAVE 017 COMPLETE.** The independent closure stage re-read the implementation summary, implementation log, validation directory, current status evidence, package scripts, and `architecture-audit/wave-plan.md` before making this closure claim. No production source refactor, package/tooling change, next-wave implementation, or forbidden secret/config access was performed in this closure stage.

### Closure validation log index

Fresh closure reruns supersede any earlier stale failing/diagnostic validation attempts retained above for provenance:

- Closure git/status evidence: `validation/closure-git-status-pre.stdout`, `validation/closure-git-status-pre.stderr`; command wrapper logs `validation/closure-git-status-pre.command.stdout`, `validation/closure-git-status-pre.command.stderr`.
- Wave-plan heading/rerank evidence: `validation/closure-wave-headings.stdout`, `validation/closure-wave-headings.stderr`; command wrapper logs `validation/closure-wave-headings.command.stdout`, `validation/closure-wave-headings.command.stderr`.
- Root lint: `validation/closure-root-lint.stdout`, `validation/closure-root-lint.stderr` — pass.
- Frontend lint: `validation/closure-frontend-lint.stdout`, `validation/closure-frontend-lint.stderr` — pass.
- Focused three-presentation/read-port/ThreeView Vitest: `validation/closure-focused-three-vitest.stdout`, `validation/closure-focused-three-vitest.stderr` — pass, 3 files / 8 tests.
- Full root Vitest: `validation/closure-root-vitest-full.stdout`, `validation/closure-root-vitest-full.stderr` — pass.
- Full frontend Vitest: `validation/closure-frontend-vitest-full.stdout`, `validation/closure-frontend-vitest-full.stderr` — pass.
- Root build: `validation/closure-root-build.stdout`, `validation/closure-root-build.stderr` — pass. Vite chunk-size warning remains non-blocking and pre-existing.
- Frontend build: `validation/closure-frontend-build.stdout`, `validation/closure-frontend-build.stderr` — pass. Vite chunk-size warning remains non-blocking and pre-existing.
- Root Playwright e2e: `validation/closure-root-e2e.stdout`, `validation/closure-root-e2e.stderr` — pass, 8/8.
- Frontend Playwright e2e: `validation/closure-frontend-e2e.stdout`, `validation/closure-frontend-e2e.stderr` — pass, 8/8.
- Live preview refresh: `validation/closure-preview-refresh.pid`, `validation/closure-preview-refresh.stdout`, `validation/closure-preview-refresh.stderr`; the preview was started with `npm run -w frontend dev -- --host 0.0.0.0`.
- Preview reachability probe: `validation/closure-preview-probe.headers`, `validation/closure-preview-probe.stdout`, `validation/closure-preview-probe.stderr`, `validation/closure-preview-probe.html` — HTTP 200 from the 0.0.0.0-bound Vite server via `127.0.0.1:5173`.
- Preview process evidence: `validation/closure-preview-ps-before.stdout`, `validation/closure-preview-ps-before.stderr`, `validation/closure-preview-ps-after.stdout`, `validation/closure-preview-ps-after.stderr`.
- Focused live 3D/canvas browser smoke: `validation/closure-live-3d-canvas-smoke.stdout`, `validation/closure-live-3d-canvas-smoke.stderr`, screenshot `validation/closure-live-3d-canvas-smoke.png` — app loaded, one canvas found, 3D/presentation controls present, Show Planes label present.

### Closure protected-surface check

Closure modified only audit/stage artifacts: this implementation log, validation evidence under `architecture-audit/cycle-017-three-presentation-read-port-realization-boundary/validation/`, and the stage task report. It did not modify production source, tests, package metadata, backend, persistence, command/undo, construction, scene-host, docs/spec content, Drive/local project services, or secret/config paths. The failed `closure-preview.command.*` attempt is retained as diagnostic evidence only; the successful `closure-preview-start.command.*`, probe, process, and live-smoke logs supersede it.

### Residual risks after closure

- `ThreeWorldReadPort` remains intentionally narrow/read-only but now owns several 3D selector slices; future waves should prevent it from becoming a renamed `World` facade.
- Both canvas and three presentation read ports still call domain realization APIs that require full runtime `World` inside boundary adapters. That is now the most central residual presentation/domain boundary risk observed from Wave 016/017.
- Broader 3D scene-host lifecycle and geometry adapter debt remains real but is lower centrality than the domain-realization context leak because scene extraction should consume a stable realization/read contract.

### Next-wave recommendation / re-rank

`architecture-audit/wave-plan.md` currently ends at Wave 017. After Wave 017, the highest-centrality remaining candidate is a new reviewed Wave 018 focused on the **domain realization context boundary shared by canvas and three presentation read ports**: decide whether domain realization APIs should consume narrower typed realization/read contexts instead of full `World`, then delete full-`World` realization seams at the adapter/domain boundary where the reviewed scope allows. The recommended next canonical stage is therefore `cycle-018-fresh-scout-proposals` for `domain-realization-context-boundary`, beginning with a scope check and proposal pair rather than implementation. If the Manager determines the plan must be extended before proposals because the current wave plan has no Wave 018 entry, run a reviewed wave-plan edit mini-cycle first, then start the same canonical scout/proposal stage.
