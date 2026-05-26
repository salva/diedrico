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
