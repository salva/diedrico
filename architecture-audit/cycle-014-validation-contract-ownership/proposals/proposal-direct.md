# Proposal Direct — Wave 014: Bounded Validation Contract Repair

## Scope

Implement Wave 014 by repairing or deleting only the current red validation surfaces identified in the scope check:

- domain intersection contract: `frontend/src/domain/calculations/Intersections.ts` and `frontend/tests/unit/calculations/intersections.spec.ts`;
- UI component contract: `frontend/src/components/dialogs/PropertiesDialog.vue` only if necessary, and `frontend/tests/unit/components/propertiesDialog.spec.ts`;
- integration contract: `frontend/tests/integration/guide-creation.test.ts`;
- e2e contracts: `frontend/tests/e2e/keyboard-shortcuts.spec.ts` and `frontend/tests/e2e/selection-mask.spec.ts`;
- tooling contract: `frontend/package.json`, root package metadata/lockfile only if needed to make the active build gate truthful and supported.

Implementation must begin by copying the audited active caller inventory from `scope-check.md` into `implementation-log.md` and recording the selected line-line intersection result contract before source/test edits.

## Selected validation-contract decisions for the direct path

1. **Line-line intersection:** preserve the current active source/caller contract: `intersectLineLine()` returns `Point2DRealization2D`; parallel/coincident/no finite intersection returns `feasible=false`, not `null`. Evidence: implementation returns infeasible realization at `frontend/src/domain/calculations/Intersections.ts:110-115`, and both active callers read `.feasible` (`frontend/src/domain/world/Point.ts:258-263`, `frontend/src/domain/world/Guide.ts:287-292`). Repair unit tests to assert `.position`/`getPosition()` and `.feasible`, not nullable/vector results. Do not redesign the geometry model.
2. **PropertiesDialog:** treat the current close/save events as the UI component contract. Repair stale or brittle tests around emitted `close` and `save`; change component code only if the test reveals a genuine current-contract bug. Do not redesign the dialog, style model, dependency display, or ProcessTree placeholder.
3. **Guide integration:** keep executable current guide behavior tests. Delete or convert the placeholder-only BrokenHalfHingeLine2D test body. Any `0 test` diagnosis or fix must remain limited to `frontend/tests/integration/guide-creation.test.ts`, its placeholder BHHL case, and the exact local Vitest collection/discovery contract needed to explain this file's status. Wave 014 must not broaden into general Vitest discovery/config cleanup unless evidence forces a reviewed plan-edit mini-cycle. Do not add a custom runner or broad discovery framework.
4. **Keyboard shortcuts e2e:** delete corrupted reversed/orphaned cascade fragments and stale spec-reference comments. Keep or replace with smaller current keyboard-shortcut flows that parse and exercise current user-facing shortcuts.
5. **Selection mask e2e:** delete orphaned test-body fragments after the suite close and stale spec-reference comments. Keep or replace with current selection-mask behavior checks.
6. **Build tooling:** make the existing `vue-tsc && vite build` contract work under the supported runtime/tool versions, or constrain the supported runtime truthfully. Docs-only, engines-only, or runtime-policy edits cannot satisfy Wave 014 if `npm run build` and `npm run build --workspace=frontend` still fail in the actual validation environment used for this wave. The selected single supported contract must be executable where the required validation cadence runs, or the wave must stop for review instead of declaring success. Do not keep parallel type-check/build paths or compatibility shims.

## Scope guard

This proposal forbids:

- broad validation-framework redesign;
- generalized allowlists or skip registries;
- custom test runners;
- parallel build/test/type-check toolchains;
- sweeping unrelated test cleanup;
- dialog redesign;
- guide-domain redesign;
- hidden geometry/domain redesign;
- selector or rendering cleanup unrelated to the red surfaces;
- introducing `skip`, `todo`, or allowlist entries merely to make gates green.

If the intersection caller inventory proves the current infeasible-realization result model is insufficient, stop and request a reviewed plan-edit mini-cycle before changing the domain model. If guide `0 test` evidence points beyond the local `guide-creation.test.ts` file/placeholder/discovery contract, stop for a reviewed plan-edit mini-cycle before touching generalized Vitest discovery/config. If the build fix requires choosing a different architectural tooling stance than the single active frontend build gate, or if the chosen runtime/tool policy cannot make the mandatory root/frontend build commands pass in the active validation environment, stop for review rather than adding an alternate path or declaring the gate repaired.

## Target outcome

Every mandatory gate has a trustworthy current contract:

- domain unit tests assert the line-line result model active production callers actually use;
- PropertiesDialog tests assert current props/events without preserving stale expectations;
- guide integration tests contain executable behavior and no placeholder-only collected test;
- Playwright specs parse before browser execution and cover current keyboard shortcut and selection-mask flows;
- root/frontend build uses one supported tooling/runtime contract.

## Files to change

Expected implementation files:

- `frontend/tests/unit/calculations/intersections.spec.ts`
- `frontend/tests/unit/components/propertiesDialog.spec.ts`
- `frontend/tests/integration/guide-creation.test.ts`
- `frontend/tests/e2e/keyboard-shortcuts.spec.ts`
- `frontend/tests/e2e/selection-mask.spec.ts`
- `frontend/package.json` and lockfile if the chosen build-tooling repair requires dependency metadata updates
- `architecture-audit/cycle-014-validation-contract-ownership/implementation-log.md`

Conditional files, only if focused tests prove source contracts are wrong rather than test contracts stale:

- `frontend/src/domain/calculations/Intersections.ts`
- `frontend/src/components/dialogs/PropertiesDialog.vue`

No docs outside the cycle artifact should be modified except package/tool metadata necessary for build truth.

## Explicit DELETE list

- Delete `toBeNull()` / nullable-result assertions for line-line no-intersection cases if the infeasible-realization contract is selected.
- Delete direct `.x/.y/.z` test assumptions on `Point2DRealization2D` if the contract is position/realization-based.
- Delete stale PropertiesDialog unit expectations that no longer represent current emitted props/events.
- Delete the placeholder-only BrokenHalfHingeLine2D guide test body or convert it into executable assertions.
- Delete corrupted Playwright preambles, duplicated reversed blocks, orphaned test bodies, and stale phase/spec comments from `keyboard-shortcuts.spec.ts` and `selection-mask.spec.ts`.
- Delete obsolete helpers/fixtures found to support only corrupted/deleted specs.
- Delete unsupported or unused build-tooling alternatives if introduced or discovered; do not preserve them as shims.

## Expected behavior change

User-visible product behavior should not change except that e2e tests should now exercise current keyboard shortcut and selection-mask flows. Validation behavior changes materially: previously red/corrupted gates become executable and trustworthy, and stale tests are deleted or replaced rather than preserved.

## Success criteria and validation plan

Implementation must capture full stdout/stderr under `architecture-audit/cycle-014-validation-contract-ownership/validation/` and record summaries in `implementation-log.md`.

Required validation:

1. Static zero-test / Playwright parse discovery check before full runs.
2. Focused Vitest:
   - `frontend/tests/unit/calculations/intersections.spec.ts`
   - `frontend/tests/unit/components/propertiesDialog.spec.ts`
   - `frontend/tests/integration/guide-creation.test.ts`
3. Focused Playwright for the repaired/replaced keyboard shortcut and selection-mask specs.
4. Root and frontend lint where defined: `npm run lint`, `npm run lint --workspace=frontend`.
5. Root and frontend full Vitest: `npm run test`, `npm run test --workspace=frontend`.
6. Root and frontend build: `npm run build`, `npm run build --workspace=frontend`.
7. Root/frontend e2e: `npm run test:e2e`, `npm run test:e2e --workspace=frontend`.
8. Refresh live preview on `0.0.0.0:5173`, capture an HTTP 200 probe, and run Playwright MCP/live browser checks for repaired/replaced keyboard shortcut and selection-mask flows.

The implementation log must include a short validation-ownership note classifying each former red surface as domain, UI component, integration, e2e, or tooling ownership and citing resolved files.

## Risks

- Aligning tests to the infeasible-realization contract may hide a better long-term discriminated result model. This is acceptable only if caller inventory remains limited and active callers already depend on realizations.
- E2E corruption repair may reveal selectors or flows are stale after parsing succeeds; repairs must stay limited to current keyboard/selection-mask contracts.
- Build tooling may require dependency changes; implementation must avoid parallel toolchains or suppressed type-checking.
- Guide collection reporting `(0 test)` may have a discovery/config cause; fix only `frontend/tests/integration/guide-creation.test.ts`, its placeholder BHHL case, and the exact local collection/discovery contract for that file unless broader validation architecture is reviewed through a plan-edit mini-cycle.

## Dependencies

Depends on Waves 001–013 and the Cycle 014 scope check. This proposal is implementation-ready only after review convergence and decision.
