# Wave 012 Implementation Log — Placeholder/debug cleanup

**Implementation stage:** `cycle-012-implement-placeholder-debug-cleanup`  
**Implementation task:** `t1-implement-wave-012-cleanup`  
**Validation stage:** `cycle-012-validation-and-preview-refresh`  
**Validation task:** `t1-run-wave012-validation-refresh`  
**Selected proposal:** `architecture-audit/cycle-012-placeholder-debug-cleanup/proposals/proposal-restructure.md`  
**Decision:** `architecture-audit/cycle-012-placeholder-debug-cleanup/decision.md`

## Scope confirmation

Implemented Proposal Restructure within the bounded Wave 012 scope. This implementation did **not** reopen Waves 001–011, did **not** perform broad docs/spec reconciliation, did **not** touch `frontend/src/App.vue` or `frontend/src/services/ProjectService.ts`, did **not** add a logger/diagnostics abstraction, and did **not** introduce a full-repository console policy or allowlist framework.

The validation stage performed no source refactor or corrective source edits. It reran the required gates, refreshed the live preview, and updated this log/report only.

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

All logs are under `architecture-audit/cycle-012-placeholder-debug-cleanup/validation/`. The validation stage refreshed/overwrote the stable command logs on 2026-05-26.

### Static scans

- `static-deletion-preservation-and-hygiene.stdout` / `.stderr` — **passed**. Confirmed `paper/` and `toolbar/` operation directories are absent; `processTree/`, `world/`, and `viewState/` READMEs are preserved; active `frontend/src` and `frontend/tests` have no forbidden deleted-surface references; the exact nine Wave 012 files have zero `console.log`, `console.debug`, or `console.info` hits.
- `focused-test-discovery.stdout` / `.stderr` — **passed** discovery/logging step. Records closest behavior-level suites for operation registry/serialization, process-tree operations, world removal/style behavior, Guide/Hinge realization, rectangle grid, and projection-plane utilities.
- `full-vitest-failure-summary.stdout` / `.stderr` and `full-vitest-grep-summary.stdout` / `.stderr` — helper summaries only, used to classify full Vitest failures.

### Architecture/static gates

- `root-lint.stdout` / `.stderr` — **passed**; root lint delegates to frontend architecture tests.
- `frontend-lint.stdout` / `.stderr` — **passed**; frontend lint delegates to architecture tests.
- `root-test-architecture.stdout` / `.stderr` — **passed**, 4 files / 11 tests.
- `frontend-test-architecture.stdout` / `.stderr` — **passed**, 4 files / 11 tests.

### Focused Vitest

- `focused-vitest-wave012-passing-subset.stdout` / `.stderr` — **passed**, 7 files / 64 passed / 3 skipped / 11 todo. Covered nearest operation registry, process-tree, removal, guide, rectangle-grid, and projection-plane utility suites.

### Mandatory full cadence

- `root-test.stdout` / `.stderr` — **failed, classified non-attributable/pre-existing**. Current summary: 3 failed files / 15 failed tests / 100 passed files. Failure signatures are outside the Wave 012 touched scope: `tests/unit/calculations/intersections.spec.ts` has 10 intersection expectation failures; `tests/unit/components/propertiesDialog.spec.ts` has 5 close/save emission failures; `tests/integration/guide-creation.test.ts` is reported as a 0-test file. Wave 012 touched placeholder operation directories, nine logging files, and an architecture gate only.
- `frontend-test.stdout` / `.stderr` — **failed, classified non-attributable/pre-existing** with the same root/full Vitest signatures and counts through the frontend workspace wrapper.
- `root-build.stdout` / `.stderr` — **failed, classified non-attributable/pre-existing tooling/runtime debt**. `vue-tsc` aborts before Vite build with `Search string not found: "/supportedTSExtensions = .*(?=;)"` under Node.js v24.15.0.
- `frontend-build.stdout` / `.stderr` — **failed, classified non-attributable/pre-existing tooling/runtime debt** with the same `vue-tsc`/Node 24 signature through the frontend workspace wrapper.
- `root-test-e2e.stdout` / `.stderr` — **failed, classified non-attributable/pre-existing broad e2e corruption**. Playwright cannot parse `frontend/tests/e2e/keyboard-shortcuts.spec.ts` (`Unexpected token (267:10160)`) and `frontend/tests/e2e/selection-mask.spec.ts` (`Unexpected token (188:2)`).
- `frontend-test-e2e.stdout` / `.stderr` — **failed, classified non-attributable/pre-existing broad e2e corruption** with the same parse-error signatures through the frontend workspace wrapper.

### Focused Playwright/live preview

- `focused-playwright-wave010-app-shell.stdout` / `.stderr` — **passed**, 1 Playwright smoke for app-shell/project chooser flow.
- `live-preview-refresh-command.stdout` / `.stderr` — **passed operationally despite shell wrapper exit 1 from pgrep self-match cleanup quirk**; terminated stale preview/dev processes and started one new preview process.
- `live-preview-refresh.stdout` / `.stderr` — **passed** live preview startup from `frontend/` using `npm run dev -- --host 0.0.0.0 --port 5173 --strictPort`. Vite reported `Local: http://localhost:5173/` and `Network: http://10.0.3.113:5173/`, proving 0.0.0.0/network binding.
- `live-preview.pid` — PID recorded for the refreshed preview process (`400675` at validation time).
- `live-preview-probe.stdout` / `.stderr` — **passed** reachability probe: `attempt 1 HTTP 200` for `http://127.0.0.1:5173/`.

## Residual risks / accepted debt

- Full Vitest remains blocked by pre-existing intersection, PropertiesDialog, and zero-test guide-creation test debt. The touched Wave 012 files passed focused suites and architecture gates.
- Full build remains blocked by pre-existing Node 24 / `vue-tsc` compatibility failure before Vite build starts.
- Broad e2e remains blocked by pre-existing corrupted spec syntax in `keyboard-shortcuts.spec.ts` and `selection-mask.spec.ts`; the focused app-shell Playwright smoke and live HTTP probe passed.
- Existing routine logging outside the nine approved Wave 012 files was intentionally not scanned or cleaned; any broader console policy would require a future reviewed wave/delta.

## Wave 013 exclusion

No broad reconciliation of `docs/`, `specs/`, historical task references, or general stale comments was performed. That remains Wave 013 scope per the Wave 012 decision.

## Candidate future waves/issues

- Repair or delete corrupted broad e2e specs (`keyboard-shortcuts.spec.ts`, `selection-mask.spec.ts`) under a reviewed validation/test-health wave.
- Resolve or delete obsolete PropertiesDialog expectations if the current UI contract intentionally changed.
- Address intersection calculation/spec expectation mismatch under a domain-correctness wave, not as placeholder/debug cleanup.
- Fix or delete the 0-test `tests/integration/guide-creation.test.ts` file under test-health work.
- Replace Node 24-incompatible `vue-tsc` tooling or pin compatible tool/runtime versions under a validation-tooling wave.
