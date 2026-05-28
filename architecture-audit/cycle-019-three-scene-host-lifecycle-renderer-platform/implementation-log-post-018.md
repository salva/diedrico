# Cycle 019 Implementation Log post-018 — Three scene-host lifecycle / renderer platform boundary

## Status

COMPLETE — implemented the decision-selected direct path from `decision-post-018.md` / `proposals/proposal-direct.md` without broadening into a renderer platform redesign.

## Source-control reconciliation

- Initial scoped diff for the authorized Wave 019 source/e2e paths was empty before edits.
- Broad `git status` is too large in this workspace and overflows the MCP status buffer; scoped MCP diffs were used instead.
- Known unrelated dirty production files named by the decision (`frontend/src/domain/calculations/Intersections.ts`, `frontend/src/domain/processTree/ActionGroup.ts`) were not read for implementation, not edited, not staged, and not depended on.
- Stale Cycle 019 audit/validation noise already present in the validation directory was not normalized. This implementation records the new post-018 evidence files listed below.

## Files changed

Production source:

- None. Current production boundaries already matched the selected direct architecture: `ThreeViewRuntime` keeps injected collaborators and group replacement orchestration, `ThreeSceneHost` owns platform lifecycle resources, `ThreeObjectRegistry` owns object disposal, and `ThreeView.vue` remains a thin shell.

Tests:

- `frontend/tests/unit/rendering/threeView/threeSceneAdapters.spec.ts`
  - Deleted broad `as any` DTO fixtures.
  - Replaced them with `satisfies`-checked typed DTO arrays for projection-plane, planar, reconstructed, guide, and hinge presentation DTOs.
  - Preserved representative adapter behavior coverage without expanding into visual/snapshot tests.

Audit/validation evidence:

- `architecture-audit/cycle-019-three-scene-host-lifecycle-renderer-platform/implementation-log-post-018.md`
- Validation logs under `architecture-audit/cycle-019-three-scene-host-lifecycle-renderer-platform/validation/` listed below.

## Deletes / proofs of inapplicability

- Deleted touched broad `as any` scene-adapter DTO fixtures from `threeSceneAdapters.spec.ts`.
- No duplicate runtime construction helper, compatibility constructor, transitional overload, broad scene-manager/platform facade, or stale Vue-mount helper was found or introduced.
- `AxisLabelSceneAdapter.ts` remains active and was not deleted; static scans prove active use through `ProjectionPlaneSceneAdapter.ts`.
- No docs/spec/backend/package/tooling delete candidates applied to this wave.

## Lifecycle/resource ownership evidence

- `ThreeViewRuntime` remains the orchestration seam: it accepts injected host/controller/adapters, builds the Three presentation model, and replaces the five named registry groups (`projectionPlanes`, `planarElements`, `reconstructedElements`, `guides`, `hinges`). Covered by `threeViewRuntime.spec.ts` and `validation/focused-vitest.stdout`.
- `ThreeSceneHost` remains the low-level lifecycle owner: platform-created WebGL renderer, CSS2D renderer/DOM, OrbitControls, camera/lights, resize, animation frame scheduling/cancellation, renderer/controls disposal, label DOM removal, and registry disposal. Covered by `threeSceneHost.spec.ts` and `validation/focused-vitest.stdout`.
- `ThreeObjectRegistry` remains the object lifetime owner: group replacement disposes old groups; registry disposal traverses descendants and disposes geometry, material arrays, and CSS2D DOM elements. Covered by `threeObjectRegistry.spec.ts` and `validation/focused-vitest.stdout`.
- Scene adapters remain bounded DTO-to-owned-Three-object converters. The typed fixture update makes DTO contracts explicit while preserving adapter ownership transfer to registry-managed objects.

## Protected-surface checks

- `ThreeView.vue` was not changed and remains a thin Vue shell for injection, runtime creation, mount/refresh/resize/dispose, watchers, subscriptions, and resize listener cleanup.
- Static scans show no new `ThreeViewPlatform.ts`, broad scene-manager/platform/world/read-model/app-kernel facade, or threeView-side Wave 018 realization/read-context broadening.
- No domain realization/read-context contracts, canvas presentation selectors, app-shell lifecycle, command/undo, persistence/schema/replay, backend, docs/specs, package metadata, lockfiles, dependency versions, Drive/auth, or UI feature surfaces were edited.
- `.three-view-overlay` pointer ownership and OrbitControls/CSS pointer behavior were not changed. Unit/e2e/live smoke evidence confirms overlay pointer behavior remains protected.

## Validation log index

All commands were run from `/work/diedrico` unless noted.

- `validation/static-scans-post.stdout` / `.stderr` — protected-surface/static scans: PASS. Confirms ThreeView shell boundary, runtime group replacement, host platform ownership, registry disposal, active AxisLabel use, no `as any` in focused threeView tests, overlay pointer assertions, no new broad facades, and no threeView Wave 018 boundary broadening.
- `validation/focused-vitest.stdout` / `.stderr` — `npm run test --workspace=frontend -- tests/unit/rendering/threeView/threeViewRuntime.spec.ts tests/unit/rendering/threeView/threeSceneHost.spec.ts tests/unit/rendering/threeView/threeObjectRegistry.spec.ts tests/unit/rendering/threeView/threeSceneAdapters.spec.ts tests/unit/components/panels/threeViewShellBoundary.spec.ts`: PASS, 5 files / 12 tests.
- `validation/root-lint.stdout` / `.stderr` — `npm run lint`: PASS, architecture tests 4 files / 11 tests.
- `validation/frontend-lint.stdout` / `.stderr` — `npm run lint --workspace=frontend`: PASS, architecture tests 4 files / 11 tests.
- `validation/root-vitest.stdout` / `.stderr` — `npm run test`: PASS, exit code 0. Expected test-authored console output remains in stderr/stdout.
- `validation/frontend-vitest.stdout` / `.stderr` — `npm run test --workspace=frontend`: PASS, exit code 0. Expected test-authored console output remains in stderr/stdout.
- `validation/root-build.stdout` / `.stderr` — `npm run build`: PASS. Vite emitted the pre-existing chunk-size warning only.
- `validation/frontend-build.stdout` / `.stderr` — `npm run build --workspace=frontend`: PASS. Vite emitted the pre-existing chunk-size warning only.
- `validation/root-e2e.stdout` / `.stderr` — `npm run test:e2e`: PASS, 10 Playwright tests including `current-ui-contract.spec.ts` overlay pointer-boundary test.
- `validation/frontend-e2e.stdout` / `.stderr` — `npm run test:e2e --workspace=frontend`: PASS, 10 Playwright tests including `current-ui-contract.spec.ts` overlay pointer-boundary test.
- `validation/live-preview-refresh.stdout` / `.stderr` — first preview refresh attempt failed immediately because `/bin/sh` does not support `set -o pipefail`; this was command syntax, not source-attributable.
- `validation/live-preview-refresh-rerun.stdout` / `.stderr` — rerun under bash started/refreshed `npm run dev --workspace=frontend -- --host 0.0.0.0` and printed HTTP 200 evidence. The wrapper returned nonzero after the background job handoff despite the successful HTTP message, so a direct probe was run next.
- `validation/live-preview-probe.stdout` / `.stderr` — direct `curl -i -fsS http://127.0.0.1:5173/ | head -40`: PASS, HTTP/1.1 200 OK.
- `validation/live-browser-smoke.stdout` / `.stderr` — focused Playwright smoke against the refreshed live preview from `/work/diedrico/frontend`: PASS, 2 tests covering app shell/canvas/status/toolbar/plane selector and 3D overlay pointer ownership/no drag-through.

## Preview evidence

- Live preview was refreshed with `npm run dev --workspace=frontend -- --host 0.0.0.0` and PID recorded in `validation/live-preview-server.pid`.
- `http://127.0.0.1:5173/` answered HTTP 200 in `validation/live-preview-probe.stdout`.
- Credential-free browser smoke passed in `validation/live-browser-smoke.stdout`, covering representative app shell, SVG canvas, 3D overlay/panel pointer ownership, and protected no-drag-through behavior.

## Residual risks

- Production code changed minimally because the current source already contained the direct Wave 019 seams. This matches the accepted residual risk in `decision-post-018.md`.
- The default production composition inside `ThreeViewRuntime` remains local to the constructor. No testability blocker was found, so the rejected restructure path was not invoked.
- The preview refresh wrapper produced a nonzero status after successful HTTP output due to background shell behavior; direct probe and live browser smoke are green and are the authoritative preview evidence for this implementation.

## Next-wave candidates

- None introduced by this implementation. Existing non-Wave-019 noise and unrelated dirty files should remain outside this wave and be handled only by their owning stages if still relevant.

## Closure validation — cycle-019-validation-and-preview-refresh-post-018

Status: **Wave 019 COMPLETE** after independent closure verification.

Closure verifier re-read the implementation summary, `decision-post-018.md`, synthesized implementation-stage review, validation directory, live-preview evidence, 3D hotfix context, and `architecture-audit/wave-plan.md`. MCP `git_diff` for the protected Wave 019 source/test paths returned empty before closure edits, confirming no additional production/source refactor was present or needed for closure.

Fresh closure evidence captured under `validation/`:

- `validation/closure-validation-tail-check.stdout` / `.stderr` — independent tail/index check over the recorded static scans, focused Vitest, root/frontend lint, full root/frontend Vitest, root/frontend build, root/frontend e2e, frontend e2e, live preview probe, and live browser smoke logs. The checked logs show green completion markers, including 5 focused three-view test files / 12 tests, 4 architecture lint files / 11 tests, 114 full Vitest files passed with expected skips/todos, successful root/frontend builds, and 10 Playwright e2e tests including the 3D overlay pointer-boundary test.
- `validation/closure-live-preview-probe.stdout` / `.stderr` — fresh closure probe at `2026-05-28T00:20:07Z`: `curl -i -fsS http://127.0.0.1:5173/ | head -40` returned `HTTP/1.1 200 OK`, confirming the preview remained reachable after implementation on the refreshed Vite dev server.
- `validation/closure-wave-plan-headings.stdout` / `.stderr` — closure re-read of the current wave-plan ordering/headings. The remaining central follow-up after Wave 019 is Wave 020, `App-shell project session and browser integration boundary`; Wave 019 did not invalidate the plan premise or require a plan-edit mini-cycle.
- `validation/closure-scoped-diff-names.stdout` / `.stderr` — closure note recording that protected Wave 019 source/test path diff was empty before closure edits.

3D interaction regression verification remains green by substitution evidence: `root-e2e.stdout` and `frontend-e2e.stdout` both include `current-ui-contract.spec.ts` test `3D overlay owns pointer interaction and does not pass drag gestures through to the 2D canvas`, and `live-browser-smoke.stdout` covers live preview overlay pointer ownership/no drag-through. The fresh closure HTTP probe confirms that live target stayed reachable. Playwright MCP was not used directly in this closure task; the accepted substitute is CLI Playwright plus live browser smoke against the live preview, with residual risk limited to MCP-specific harness availability rather than source behavior.

Protected-surface reconciliation for closure:

- No production Three runtime/host/registry/adapters, `ThreeView.vue`, e2e spec, package/tooling, backend, docs/specs, persistence/schema/replay, command/undo, app-shell lifecycle, canvas presentation selectors, validation-platform, Drive/auth, OrbitControls/CSS pointer behavior, or Wave 018 realization/read-context files were edited by this closure task.
- The broad-facade static scan remains authoritative for Wave 019: no generic scene/platform/world/read-model/app-kernel facade or `ThreeViewPlatform.ts` was introduced, and the existing read-model files are outside the prohibited renderer-platform churn.
- Known unrelated dirty files named by prior stages remain out of scope and were not normalized.

Next-wave recommendation after re-rank: proceed to the next canonical fresh-scout/proposals stage for **Wave 020 — App-shell project session and browser integration boundary**. Wave 019 found no new renderer lifecycle follow-up requiring insertion ahead of Wave 020, and closure does not implement any next-wave work.
