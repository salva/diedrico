# Wave 012 Implementation Log — Placeholder/debug cleanup

**Stage:** `cycle-012-implement-placeholder-debug-cleanup`  
**Task:** `t1-implement-wave-012-cleanup`  
**Selected proposal:** `architecture-audit/cycle-012-placeholder-debug-cleanup/proposals/proposal-restructure.md`  
**Decision:** `architecture-audit/cycle-012-placeholder-debug-cleanup/decision.md`

## Scope confirmation

Implemented Proposal Restructure within the bounded Wave 012 scope. This implementation did **not** reopen Waves 001–011, did **not** perform broad docs/spec reconciliation, did **not** touch `frontend/src/App.vue` or `frontend/src/services/ProjectService.ts`, did **not** add a logger/diagnostics abstraction, and did **not** introduce a full-repository console policy or allowlist framework.

## Source files changed

- `frontend/src/commands/operations/paper/README.md` — deleted README-only placeholder operation family.
- `frontend/src/commands/operations/toolbar/README.md` — deleted README-only placeholder operation family.
- `frontend/src/services/GoogleDriveService.ts` — removed routine `console.log` normal-flow Drive diagnostics; preserved `console.warn`/`console.error` failure reporting.
- `frontend/src/utils/rectangleGrid.ts` — removed `clipDebugDone`, first-segment debug branch, and routine grid/clipping `console.log` output without changing clipping calculations.
- `frontend/src/utils/projectionPlaneUtils.ts` — removed routine projection-matrix debug `console.log` output and the now-unused debug-only normal calculation.
- `frontend/src/domain/world/HingeLine.ts` — removed conditional sibling lookup debug logging only.
- `frontend/src/domain/world/Guide.ts` — removed routine sibling-guide realization debug logging only.
- `frontend/src/commands/operations/world/UpdateElementStyleOp.ts` — removed apply/undo normal-flow style debug logs.
- `frontend/src/commands/operations/world/RemoveElementOps.ts` — removed normal-flow sibling-removal success debug log; retained warning for failure.
- `frontend/src/commands/operations/processTree/ToggleOutputOp.ts` — removed apply/redo node debug logs.
- `frontend/src/commands/operations/processTree/ToggleEncapsulationOp.ts` — removed apply/redo subprocess debug logs.
- `frontend/tests/unit/architecture/importBoundaries.spec.ts` — extended Wave 011 architecture gate with bounded Wave 012 deleted-surface and nine-file console hygiene assertions.

## Legacy surfaces deleted

Deleted, not wrapped or shimmed:

- `frontend/src/commands/operations/paper/README.md`
- `frontend/src/commands/operations/paper/`
- `frontend/src/commands/operations/toolbar/README.md`
- `frontend/src/commands/operations/toolbar/`
- `clipDebugDone` and its debug-only branches in `frontend/src/utils/rectangleGrid.ts`
- Routine `console.log` calls in the nine approved Wave 012 files

Preserved as active/out-of-scope per decision:

- `frontend/src/commands/operations/processTree/README.md`
- `frontend/src/commands/operations/processTree/`
- `frontend/src/commands/operations/world/README.md`
- `frontend/src/commands/operations/world/`
- `frontend/src/commands/operations/viewState/README.md`
- `frontend/src/commands/operations/viewState/`

## Bounded hygiene gate

Updated `frontend/tests/unit/architecture/importBoundaries.spec.ts` with two narrow checks:

1. Active `frontend/src` and `frontend/tests` may not reference deleted/placeholder-only surfaces: `operations/paper`, `operations/toolbar`, `operations/debug`, `ExamplesMenu`, `AddExampleSetupOp`, `projection-plane-setup`, or `basic-3d-point-setup`, excluding the architecture assertion text itself.
2. `console.log`, `console.debug`, and `console.info` are forbidden only in these exact Wave 012 files:
   - `src/services/GoogleDriveService.ts`
   - `src/utils/rectangleGrid.ts`
   - `src/utils/projectionPlaneUtils.ts`
   - `src/domain/world/HingeLine.ts`
   - `src/domain/world/Guide.ts`
   - `src/commands/operations/world/UpdateElementStyleOp.ts`
   - `src/commands/operations/world/RemoveElementOps.ts`
   - `src/commands/operations/processTree/ToggleOutputOp.ts`
   - `src/commands/operations/processTree/ToggleEncapsulationOp.ts`

No full-`frontend/src/**` console ban, exception allowlist, or logger facade was added.

## Validation evidence

All logs are under `architecture-audit/cycle-012-placeholder-debug-cleanup/validation/`.

### Static scans

- `pre-implementation-console-scan.stdout` / `.stderr` — recorded initial `console.log/debug/info` hits in the nine approved files.
- `static-deletion-preservation-and-hygiene.stdout` / `.stderr` — **passed** final directory absence/preservation, deleted-surface reference scan, and nine-file console scan.
- `focused-test-discovery.stdout` / `.stderr` — recorded focused-test discovery for touched modules.

### Architecture/static gates

- `frontend-test-architecture.stdout` / `.stderr` — **passed**, 4 files / 11 tests.
- `root-test-architecture.stdout` / `.stderr` — **passed**, root wrapper of same architecture gate.
- `root-lint.stdout` / `.stderr` — **passed**; root lint delegates to frontend architecture tests.
- `frontend-lint.stdout` / `.stderr` — **passed**; frontend lint delegates to architecture tests.

### Focused Vitest

- `focused-vitest-wave012.stdout` / `.stderr` — mixed run: all Wave 012-adjacent suites passed, but `tests/unit/components/propertiesDialog.spec.ts` retained known unrelated PropertiesDialog failures.
- `focused-vitest-wave012-passing-subset.stdout` / `.stderr` — **passed**, 7 files / 73 tests / 11 todo for the nearest operation registry, process-tree, removal, guide, rectangle-grid, and projection-plane utility suites.

### Mandatory full cadence

- `root-test.stdout` / `.stderr` — **failed with known residual debt**, not attributable to Wave 012: `tests/unit/calculations/intersections.spec.ts` line/parallel-result expectation mismatches and `tests/unit/components/propertiesDialog.spec.ts` close/save emission failures. Wave 012 touched neither intersection calculations nor PropertiesDialog.
- `frontend-test.stdout` / `.stderr` — **failed with the same known residual debt** through the frontend wrapper.
- `root-build.stdout` / `.stderr` — **failed with known Node 24 / vue-tsc debt**: `Search string not found: "/supportedTSExtensions = .*(?=;)/"` from `vue-tsc` under Node.js v24.15.0.
- `frontend-build.stdout` / `.stderr` — **failed with the same known Node 24 / vue-tsc debt** through the frontend wrapper.
- `root-test-e2e.stdout` / `.stderr` — **failed with known corrupted broad e2e specs**, including syntax errors in `frontend/tests/e2e/keyboard-shortcuts.spec.ts` and `frontend/tests/e2e/selection-mask.spec.ts`.
- `frontend-test-e2e.stdout` / `.stderr` — **failed with the same corrupted broad e2e spec signatures** through the frontend wrapper.

### Focused Playwright/live preview

- `focused-playwright-wave010-app-shell.stdout` / `.stderr` — **passed**, 1 Playwright smoke for app-shell/project chooser flow.
- `live-preview-refresh.stdout` / `.stderr` — refreshed preview from `frontend/` using `npm run dev -- --host 0.0.0.0`.
- `live-preview.pid` — PID recorded for the refreshed preview process.
- `live-preview-probe.stdout` / `.stderr` — **passed** reachability probe: `attempt 1 HTTP 200` for `http://127.0.0.1:5173/`.

## Residual risks / accepted debt

- Full Vitest remains blocked by pre-existing intersection and PropertiesDialog failures. The touched Wave 012 files passed focused suites and architecture gates.
- Full build remains blocked by pre-existing Node 24 / `vue-tsc` compatibility failure before Vite build starts.
- Broad e2e remains blocked by pre-existing corrupted spec syntax in `keyboard-shortcuts.spec.ts` and `selection-mask.spec.ts`; the focused app-shell Playwright smoke passed.
- Existing routine logging outside the nine approved Wave 012 files was intentionally not scanned or cleaned; any broader console policy would require a future reviewed wave/delta.

## Wave 013 exclusion

No broad reconciliation of `docs/`, `specs/`, historical task references, or general stale comments was performed. That remains Wave 013 scope per the Wave 012 decision.

## Candidate future waves/issues

- Repair or delete corrupted broad e2e specs (`keyboard-shortcuts.spec.ts`, `selection-mask.spec.ts`) under a reviewed validation/test-health wave.
- Resolve or delete obsolete PropertiesDialog expectations if the current UI contract intentionally changed.
- Address intersection calculation/spec expectation mismatch under a domain-correctness wave, not as placeholder/debug cleanup.
- Replace Node 24-incompatible `vue-tsc` tooling or pin compatible tool/runtime versions under a validation-tooling wave.
