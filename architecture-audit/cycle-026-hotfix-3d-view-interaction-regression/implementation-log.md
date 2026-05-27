# Cycle 026 Hotfix — 3D view interaction regression

## Source-control hygiene

- Scoped status and diff were captured before touching source:
  - `validation/pre-scoped-status.stdout.log`
  - `validation/pre-scoped-diff.stdout.log`
- Final scoped status/diff were captured after validation:
  - `validation/final-scoped-status.stdout.log`
  - `validation/final-scoped-diff.stdout.log`
- The hotfix touched only the app shell overlay CSS, focused tests, this audit directory, and the task report. It did not revert or normalize unrelated dirty work.

## Reproduction evidence

The regression was reproduced against the live app before the fix with `validation/live-reproduction-before.stdout.log`.

Key evidence:

- `.three-view-overlay` computed `pointer-events: "none"`.
- `.three-view-panel` and `.three-canvas` also computed `pointer-events: "none"` because the parent overlay disabled hit testing for the subtree.
- `document.elementFromPoint(...)` at the center of the visible 3D overlay returned an underlying SVG `<line>`, not the 3D canvas.
- This proves the overlay was click-through and source-attributable to the app shell CSS, not to Three.js runtime/read-port behavior.

The initial `/tmp` Playwright probe failed because the temporary script could not resolve workspace `@playwright/test`; this was a harness-location issue and was superseded by the successful workspace-local reproduction probe.

## Root cause

`frontend/src/App.vue` renders the 3D overlay at lines 70–72 and styled it as an absolutely positioned overlay at lines 277–289. Before this hotfix, the first rule in `.three-view-overlay` was `pointer-events: none`. Because CSS `pointer-events: none` removes the element from hit testing and effectively prevents descendants from owning the hit target through that overlay, pointer/click/drag events inside the visible 3D panel fell through to the underlying SVG canvas. In select mode the SVG canvas can start viewport pan on empty-space drag, matching the user report that dragging the 3D view moved the paper instead.

Source line evidence after the fix is captured in `validation/source-line-evidence.stdout.log`.

## Fix

Changed exactly one production rule:

- `frontend/src/App.vue:277-289` — `.three-view-overlay` now uses `pointer-events: auto` so the 3D overlay and its nested `.three-canvas` own pointer hit-testing above the SVG canvas.

No runtime/session/read-port/tool/persistence architecture was changed.

## Tests added/updated

- `frontend/tests/unit/components/panels/threeViewShellBoundary.spec.ts:22-25` — added a focused raw-source boundary test requiring the app shell 3D overlay to use `pointer-events: auto` and not `none`.
- `frontend/tests/e2e/current-ui-contract.spec.ts:89-117` — added an e2e regression test proving:
  - the 3D overlay is visible;
  - computed `pointer-events` is `auto`;
  - `elementFromPoint` at the overlay center resolves inside `[data-testid="three-view-overlay"]`;
  - a drag gesture inside the 3D overlay leaves the SVG `viewBox` unchanged, so the 2D paper is not panned by that gesture.

## Validation log index

All logs are under `architecture-audit/cycle-026-hotfix-3d-view-interaction-regression/validation/`.

Reproduction and live/browser evidence:

- `live-reproduction-before.*.log` — reproduced click-through before fix: overlay/panel/canvas pointer events were `none`, and hit target was an underlying SVG line.
- `live-reproduction-after.*.log` — post-fix probe: overlay/panel/canvas pointer events were `auto`, hit target was the `three-canvas` inside the overlay, and the SVG `viewBox` stayed unchanged after a drag.
- `live-smoke-after-refresh.*.log` — final post-preview-refresh live probe with `pointer-events: auto`, hit target inside the 3D overlay, and unchanged SVG `viewBox` after drag.

Focused tests:

- `focused-threeview-boundary-vitest.*.log` — passed, 2/2 focused unit tests.
- `targeted-current-ui-e2e.*.log` — passed, 6/6 current UI contract tests including the new 3D overlay pointer-boundary regression.

Mandatory validation:

- `root-lint.*.log` — passed, architecture tests 11/11.
- `frontend-lint.*.log` — passed, architecture tests 11/11.
- `root-full-vitest.*.log` — passed, exit code 0; existing expected stderr diagnostics from negative/degenerate tests only.
- `frontend-full-vitest.*.log` — passed, exit code 0; existing expected stderr diagnostics from negative/degenerate tests only.
- `root-build.*.log` — passed; Vite emitted only the existing chunk-size warning.
- `frontend-build.*.log` — passed; Vite emitted only the existing chunk-size warning.
- `root-e2e.*.log` — passed, 10/10 Playwright tests.
- `frontend-e2e.*.log` — passed, 10/10 Playwright tests.

Protected-surface checks:

- `protected-seam-scan.*.log` — empty scan for forbidden Cycle 025/026 regressions: `WorldInjectionKey`, `worldForView`, `ToolContext.world`, `CollectionContext.world`, `context.world`, and `realize2D(context.world)`.

## Live preview refresh

- A final dev preview was started/reused from `/work/diedrico/frontend` with `npm run dev -- --host 0.0.0.0`.
- `validation/live-preview-listener.stdout.log` shows a listener on `0.0.0.0:5173`.
- `validation/live-preview-probe.stdout.log` shows HTTP `200 OK` from `http://127.0.0.1:5173/`.
- Earlier refresh wrapper attempts failed because process-filter/kill commands matched transient command context; those attempts did not indicate an app failure and are superseded by the final listener/probe and live smoke evidence.

## Protected surfaces / architectural invariants

The hotfix preserved Cycle 025/026 boundaries:

- Did not reintroduce `WorldInjectionKey`, `worldForView`, raw `ToolContext.world`, raw `CollectionContext.world`, `context.world`, or `realize2D(context.world)`.
- Did not add a generic world-like facade, command/persistence redesign, backend/docs/spec/package/tooling churn, auth/Drive changes, or broad refactor.
- Did not modify `ThreeView.vue`, `SvgCanvas.vue`, `RuntimeSession.ts`, `RuntimeViewPorts.ts`, `ThreeWorldReadPort.ts`, command producers, undo/redo, persistence schema/replay, or backend code.

## Residual risks

- The fix restores browser pointer ownership for the current fixed-size overlay. Future UI work that changes 3D panel layout/resize behavior should keep the same explicit pointer-boundary contract.
- The live preview refresh process still has minor command ergonomics debt around safely replacing an existing Vite process; the accepted final state is nevertheless reachable on `0.0.0.0:5173` with HTTP 200.
