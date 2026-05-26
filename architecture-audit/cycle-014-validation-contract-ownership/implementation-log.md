# Implementation Log — Cycle 014 Validation Contract Ownership

## Preconditions recorded before implementation

### Validation-ownership map

- **Domain ownership:** `frontend/src/domain/calculations/Intersections.ts` and `frontend/tests/unit/calculations/intersections.spec.ts` own the line-line result contract.
- **UI component ownership:** `frontend/src/components/dialogs/PropertiesDialog.vue` and `frontend/tests/unit/components/propertiesDialog.spec.ts` own close/save event behavior.
- **Integration ownership:** `frontend/tests/integration/guide-creation.test.ts` owns current guide creation integration behavior.
- **E2E ownership:** `frontend/tests/e2e/keyboard-shortcuts.spec.ts` and `frontend/tests/e2e/selection-mask.spec.ts` own browser-parseable user-flow coverage for shortcuts and selection-mask entry flows.
- **Tooling ownership:** `frontend/package.json` owns the single active frontend build contract, `vue-tsc && vite build`.

### Audited active caller inventory for `intersectLineLine()`

From `scope-check.md`, active production callers are limited to:

- `frontend/src/domain/world/Point.ts` — `Point2DLineLineIntersection.realize2D()` immediately reads `intersectionPointReal.feasible`.
- `frontend/src/domain/world/Guide.ts` — `SiblingGuide2D.realize2D()` immediately reads `.feasible`.

No additional production callers were found during implementation.

### Selected line-line result contract

`intersectLineLine()` returns a non-null `Point2DRealization2D`. Finite intersections return `feasible=true` with Cartesian position in `position`; parallel/coincident/no finite intersection returns `feasible=false`, not `null`. This preserves the current active caller contract and deletes stale nullable/vector assumptions from tests.

## Source/test/package changes

- Updated `frontend/tests/unit/calculations/intersections.spec.ts` to assert `Point2DRealization2D.feasible` and `.position` instead of stale `null`/direct vector fields.
- Updated `frontend/tests/unit/components/propertiesDialog.spec.ts` to assert the current Vue listener contract (`onClose`, `onSave`) instead of stale `wrapper.emitted()` expectations that are not authoritative for this mounted component setup.
- Narrowly updated `frontend/src/components/dialogs/PropertiesDialog.vue` emit typing to explicit object-style emits for `close` and `save`.
- Repaired `frontend/tests/integration/guide-creation.test.ts` imports and world/plane access to current command/domain APIs, and deleted the placeholder/comment-only BrokenHalfHingeLine2D case plus the stale hinge-line expectation not established by current `setupBasicWorld()`.
- Replaced corrupted `frontend/tests/e2e/keyboard-shortcuts.spec.ts` and `frontend/tests/e2e/selection-mask.spec.ts` with small parse-valid current user-flow specs; stale phase-era comments, reversed blocks, and orphaned fragments were deleted.
- Updated `frontend/package.json` from `vue-tsc ^1.8.0` to `^2.2.12` so the build gate no longer aborts on the Node 24 unsupported string-patch failure.

## Deleted legacy/stale surfaces

- Deleted line-line nullable/vector assertions from intersection tests.
- Deleted stale PropertiesDialog `wrapper.emitted()` event expectations for the affected close/save tests.
- Deleted the comment-only BrokenHalfHingeLine2D guide integration test.
- Deleted corrupted Playwright preambles/reversed cascade blocks/orphaned selection-mask fragments and stale MVP/phase comments.

## Validation logs

Focused checks captured under `architecture-audit/cycle-014-validation-contract-ownership/validation/`:

- `focused-intersections.before.*` — reproduced 10 stale intersection failures.
- `focused-properties-dialog.before.*` — reproduced 5 stale event expectation failures.
- `focused-guide-creation.before.*` — reproduced guide collection/import failure reported as `(0 test)`.
- `frontend-build.before.*` — reproduced `vue-tsc` string-patch abort under Node v24.15.0.
- `focused-vitest.final.*` — PASS: 3 files, 64 tests.
- `focused-playwright-list.after5.*` — PASS: Playwright lists 4 tests across the repaired keyboard/selection-mask specs with no parse errors.
- `frontend-build.after5.*` — FAIL: `vue-tsc` now executes but reports broad pre-existing TypeScript contract errors across App, commands, process tree, projection-plane mutation context, panels, services, and workspace rendering.

## Residual risks / stop-rule note

The approved build-tooling surface was repaired enough to remove the invalid Node 24 / old `vue-tsc` abort. The build now reaches real TypeScript checking and exposes a broad repository-wide type-contract backlog. Fixing that backlog would require changes far beyond Wave 014's named files and would trigger the decision stop rule against broad unreviewed architecture/type cleanup. Therefore build remains a residual blocking validation issue for a reviewed follow-up/plan edit, not a docs-only or engines-only paper-over.

Full mandatory validation and live preview refresh remain for the separate validation stage after build scope is resolved.

## Final closure after Wave 015 build-contract repair

**Closure status:** COMPLETE.

Wave 014 was returned to validation closure after Wave 015 restored the TypeScript/build contract. The prior Wave 014 stop-rule remains historically valid for the earlier implementation stage, but the current source tree now passes the mandatory Wave 014 validation gates with fresh `closure-*` logs under `architecture-audit/cycle-014-validation-contract-ownership/validation/`.

### Validation-ownership classification rechecked

- **Domain ownership — line-line intersection contract:** `frontend/src/domain/calculations/Intersections.ts` is still exercised by `frontend/tests/unit/calculations/intersections.spec.ts`; the current focused closure run passes 44 intersection tests.
- **UI component ownership — PropertiesDialog events:** `frontend/src/components/dialogs/PropertiesDialog.vue` is still exercised by `frontend/tests/unit/components/propertiesDialog.spec.ts`; the current focused closure run passes 18 dialog tests. The only stderr entry is the expected validation-failure log for the negative save test.
- **Integration ownership — guide creation:** `frontend/tests/integration/guide-creation.test.ts` now contains executable guide behavior and is not a zero-test placeholder; the current focused closure run passes the guide integration cases.
- **E2E ownership — keyboard shortcuts and selection-mask/current UI contracts:** `frontend/tests/e2e/keyboard-shortcuts.spec.ts` and `frontend/tests/e2e/current-ui-contract.spec.ts` parse and execute current browser flows. `closure-contract-file-inventory.stdout` records 2 keyboard tests and 4 current-UI/selection-mask tests, and both focused Playwright logs pass 6/6.
- **Tooling ownership — frontend build contract:** `frontend/package.json` continues to use the single active `vue-tsc && vite build` contract; both frontend and root builds now pass with only the existing Vite chunk-size warning.

### Intersection caller inventory and selected contract statement

The implementation-stage inventory remains current for Wave 014 closure: production callers of `intersectLineLine()` are limited to `Point2DLineLineIntersection.realize2D()` in `frontend/src/domain/world/Point.ts` and `SiblingGuide2D.realize2D()` in `frontend/src/domain/world/Guide.ts`, both consuming the returned realization's `.feasible` state. The selected contract remains: `intersectLineLine()` returns a non-null `Point2DRealization2D`; finite intersections return `feasible=true` with Cartesian `position`, while parallel/coincident/no finite intersection returns `feasible=false` rather than `null`.

### Fresh closure validation log index

All commands were run from `/work/diedrico` unless a frontend workspace command is explicitly named. Full stdout/stderr was captured in stable files under `architecture-audit/cycle-014-validation-contract-ownership/validation/`.

| Gate | Command | Result | Logs |
| --- | --- | --- | --- |
| Root lint | `npm run lint` | PASS — 4 architecture files / 11 tests | `closure-root-lint.stdout`, `closure-root-lint.stderr` |
| Frontend lint | `npm run lint --workspace=frontend` | PASS — 4 architecture files / 11 tests | `closure-frontend-lint.stdout`, `closure-frontend-lint.stderr` |
| Focused Wave 014 Vitest | `npm run test --workspace=frontend -- tests/unit/calculations/intersections.spec.ts tests/unit/components/propertiesDialog.spec.ts tests/integration/guide-creation.test.ts` | PASS — 3 files / 64 tests | `closure-focused-vitest.stdout`, `closure-focused-vitest.stderr` |
| Frontend full Vitest | `npm run test --workspace=frontend` | PASS — 105 passed files, 1 skipped; 1227 passed, 45 skipped, 11 todo | `closure-frontend-full-vitest.stdout`, `closure-frontend-full-vitest.stderr` |
| Root full Vitest | `npm run test` | PASS — delegates to frontend suite with same 105 passed / 1 skipped file summary | `closure-root-full-vitest.stdout`, `closure-root-full-vitest.stderr` |
| Frontend build | `npm run build --workspace=frontend` | PASS with non-blocking Vite chunk-size warning | `closure-frontend-build.stdout`, `closure-frontend-build.stderr` |
| Root build | `npm run build` | PASS with same non-blocking Vite chunk-size warning | `closure-root-build.stdout`, `closure-root-build.stderr` |
| Frontend e2e | `npm run test:e2e --workspace=frontend` | PASS — Playwright 7/7 | `closure-frontend-e2e.stdout`, `closure-frontend-e2e.stderr` |
| Root e2e | `npm run test:e2e` | PASS — Playwright 7/7 | `closure-root-e2e.stdout`, `closure-root-e2e.stderr` |
| Focused Playwright contract slice | `npx playwright test tests/e2e/keyboard-shortcuts.spec.ts tests/e2e/current-ui-contract.spec.ts` from `frontend/` | PASS — 6/6 keyboard and current UI/selection-mask contract tests | `closure-focused-playwright-keyboard-selection.stdout`, `closure-focused-playwright-keyboard-selection.stderr` |
| Invalid-artifact audit | small Python scan for corrupted markers / placeholder markers in frontend test files | PASS | `closure-invalid-artifact-audit.stdout`, `closure-invalid-artifact-audit.stderr` |
| Contract file inventory | small Python count for repaired e2e/integration contract files | PASS — keyboard 2, current UI 4, guide integration executable declarations present | `closure-contract-file-inventory.stdout`, `closure-contract-file-inventory.stderr` |
| Log-tail summary | Python tail aggregator over closure logs | PASS | `closure-log-tails.stdout`, `closure-log-tails.stderr` |

### Live preview refresh and live browser evidence

- Persistent preview was refreshed with `npm run dev --workspace=frontend -- --host 0.0.0.0`; `closure-preview-refresh-python.stdout` records PID `485458` and an HTTP 200 probe on attempt 2. That helper exited nonzero due to its own control-flow bug after printing the successful probe, so it is superseded by the independent confirmation logs below.
- `closure-preview-reachability.stdout` records an independent HTTP 200 response from `http://127.0.0.1:5173/` with app HTML.
- `closure-preview-confirm-0.0.0.0.stdout` records live Vite processes with `--host 0.0.0.0` (`pid=485469` shell wrapper and `pid=485470` node/vite process) plus an HTTP 200 probe.
- `closure-live-playwright-keyboard-selection.stdout` records live-browser Playwright verification against the already-running preview: 6/6 focused keyboard and current UI/selection-mask contract tests passed.

### Stale validation-theater deletion / invalid artifact status

No corrupted Playwright parse artifacts, unsupported build-tool/runtime blockers, or placeholder zero-test integration files remain in the current mandatory gates. The stale/corrupted keyboard and selection-mask artifacts were replaced by current parse-valid browser contracts during implementation; `closure-invalid-artifact-audit.stdout`, focused Playwright, full root/frontend e2e, and the contract-file inventory provide current closure evidence.

### Residual risks

- Vite still emits the existing large chunk-size warning during builds; this is non-blocking for Wave 014 validation-contract ownership and should be considered by a later performance/bundle-shaping wave only if it becomes architecturally central.
- The retained e2e coverage is intentionally current-contract focused after deleting stale validation theater; deeper geometry/tool behavior remains covered by unit/integration suites and future waves may add e2e only when the user-facing contract is stable.
- Some test stdout still includes domain/debug logging from existing source paths; it does not fail gates but remains a future cleanup candidate if it obscures validation output.

### Next recommended ordered wave

After rereading `architecture-audit/wave-plan.md` and accounting for Wave 014 closure plus Wave 015 build-contract completion, the next ordered action is to return to the normal wave loop by scouting the next unexecuted central wave in plan order. The recommended canonical next stage is `cycle-016-fresh-scout-proposals`, with scope selected by re-ranking the remaining post-Wave-015 architectural risks before implementation. Do not implement the next wave in this validation/preview closure stage.
