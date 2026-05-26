# Wave 012 Proposal Restructure — Delete noise, then enforce a narrow source-hygiene boundary

**Cycle:** `cycle-012-placeholder-debug-cleanup`  
**Proposal type:** higher-level cleanup boundary  
**Source basis:** `architecture-audit/cycle-012-placeholder-debug-cleanup/scope-check.md`  
**Source-code changes proposed:** yes, in the later implementation stage only. This proposal stage changes audit artifacts only.

## Summary

Treat Wave 012 not as a one-time deletion sweep, but as a small source-hygiene boundary after Wave 011's architecture-gate work. The implementation still deletes README-only operation placeholders and routine debug logs directly; however, it also adds a focused deterministic static guard so the same placeholder/debug surfaces do not silently reappear in active source.

This proposal deliberately rejects a general logging service/diagnostics abstraction for the current evidence. The logs identified by the scope check are routine debugging side effects, not domain events or user diagnostics. The right higher-level correction is a narrow architecture/static test that makes placeholder operation directories and normal-flow console logging visible during validation.

## Architectural diagnosis

Wave 012 evidence shows two different smells sharing the same root: active source still contains artifacts that communicate nonexistent architecture.

1. **Vacant operation families:** among the five README-bearing operation directories, only `paper/` and `toolbar/` under `frontend/src/commands/operations/` are README-only future-operation directories (`frontend/src/commands/operations/paper/README.md:1-10`, `frontend/src/commands/operations/toolbar/README.md:1-10`). They imply command-operation families that do not exist in the runtime registry. By contrast, `processTree/` and `world/` contain active registered operations and READMEs (`frontend/src/commands/operations/processTree/README.md:1-12`, `frontend/src/commands/operations/world/README.md:1-12`), while `viewState/` contains source files beside its README but is not currently registered by `OperationRegistry.ts` (`frontend/src/commands/operations/viewState/README.md:1-10`; `frontend/src/commands/operations/OperationRegistry.ts:54-63`, `:78-79`).
2. **Normal-flow debug logging:** Drive, geometry, domain-realization, and command-operation code logs implementation details during expected execution (`frontend/src/services/GoogleDriveService.ts:82-86`, `:475-483`, `:556-592`; `frontend/src/utils/rectangleGrid.ts:94`, `:142-186`, `:211-223`; `frontend/src/utils/projectionPlaneUtils.ts:282-284`, `:341-351`; `frontend/src/domain/world/HingeLine.ts:111`, `:120`, `:131`, `:140`; `frontend/src/domain/world/Guide.ts:276`, `:282`, `:335`; `frontend/src/commands/operations/processTree/ToggleOutputOp.ts:20`, `:35`; `frontend/src/commands/operations/processTree/ToggleEncapsulationOp.ts:20`, `:35`).

The higher-level architectural issue is not missing logging infrastructure; it is that source hygiene is not encoded as an executable boundary. Wave 011 created architecture/static gates, including deleted example/debug surface checks (`frontend/tests/unit/architecture/importBoundaries.spec.ts:61-67`). Wave 012 can consume that mechanism and extend it narrowly.

## Rejected higher-level alternative: diagnostics/logging port

A diagnostics port or logging adapter would be justified if the application had real user-observable diagnostics, structured telemetry, or domain events that needed environment-specific routing. The current evidence does not show that:

- The identified `console.log` calls print transient implementation internals such as file counts, clipping calculations, projection matrices, sibling IDs, and apply/redo node IDs.
- Most are not error paths and do not represent user-facing recovery information.
- Wrapping them behind a `Logger` would preserve debug noise and add an infrastructure layer whose only purpose is compatibility with code that should be deleted.

Therefore this proposal does **not** add a logger service, diagnostics port, environment flag, or debug facade. It deletes routine logs and uses static tests/scans to prevent recurrence.

## Proposed target outcome

After implementation:

- No README-only placeholder operation subdirectories remain under `frontend/src/commands/operations/`, while README-bearing active/non-placeholder families (`processTree/`, `world/`, and `viewState/`) remain intact.
- No active source/tests reference deleted debug/example/placeholder operation surfaces.
- No `console.log`, `console.debug`, or `console.info` remains in the Wave 012 evidenced touched files enumerated below; Wave 012 does not establish a full-`frontend/src/**` console policy or an allowlist framework.
- Genuine error/catch-path `console.error`/`console.warn` usage remains available where it reports failures rather than normal progress.
- Wave 013 remains responsible for broad docs/spec/comment reconciliation; Wave 012 only deletes comments directly adjacent to removed placeholder/debug code.

## Files to change

### Runtime/source cleanup

- Delete `frontend/src/commands/operations/paper/README.md` and remove `frontend/src/commands/operations/paper/`.
- Delete `frontend/src/commands/operations/toolbar/README.md` and remove `frontend/src/commands/operations/toolbar/`.
- Delete normal-flow logs/debug branches in:
  - `frontend/src/services/GoogleDriveService.ts`
  - `frontend/src/utils/rectangleGrid.ts`
  - `frontend/src/utils/projectionPlaneUtils.ts`
  - `frontend/src/domain/world/HingeLine.ts`
  - `frontend/src/domain/world/Guide.ts`
  - `frontend/src/commands/operations/world/UpdateElementStyleOp.ts`
  - `frontend/src/commands/operations/world/RemoveElementOps.ts`
  - `frontend/src/commands/operations/processTree/ToggleOutputOp.ts`
  - `frontend/src/commands/operations/processTree/ToggleEncapsulationOp.ts`

### Static hygiene boundary

Modify or add architecture tests under `frontend/tests/unit/architecture/`, preferably using the shared scanner introduced by Wave 011 in `frontend/tests/unit/architecture/helpers/sourceScanner.ts`, with this exact bounded enforcement scope:

- Add a placeholder-operation hygiene assertion that active `frontend/src/**` and `frontend/tests/**` files do not contain deleted/placeholder-only `operations/paper`, `operations/toolbar`, or `operations/debug` references. Keep the existing Wave 011 deleted examples/debug assertions for `ExamplesMenu`, `AddExampleSetupOp`, `projection-plane-setup`, and `basic-3d-point-setup` (`frontend/tests/unit/architecture/importBoundaries.spec.ts:61-67`) and extend rather than weaken them.
- Do not encode README-family deletion as a broad “no operation READMEs” rule. Directory absence/preservation is deterministic shell validation: `paper/` and `toolbar/` must be absent, while `processTree/README.md`, `world/README.md`, and `viewState/README.md` must remain.
- Add a console-noise assertion only for these Wave 012 evidenced touched source files, requiring zero `console.log`, `console.debug`, or `console.info` hits in them:
  - `frontend/src/services/GoogleDriveService.ts`
  - `frontend/src/utils/rectangleGrid.ts`
  - `frontend/src/utils/projectionPlaneUtils.ts`
  - `frontend/src/domain/world/HingeLine.ts`
  - `frontend/src/domain/world/Guide.ts`
  - `frontend/src/commands/operations/world/UpdateElementStyleOp.ts`
  - `frontend/src/commands/operations/world/RemoveElementOps.ts`
  - `frontend/src/commands/operations/processTree/ToggleOutputOp.ts`
  - `frontend/src/commands/operations/processTree/ToggleEncapsulationOp.ts`
- Exclude `console.warn` and `console.error` from this guard; those require separate semantic review and should not be bundled with normal-flow debug cleanup.

Wave 012 must not add a full-`frontend/src/**` console ban, a broad allowlist, or a “scan everything and justify later” policy. If implementation discovers additional routine console noise outside the enumerated files, record it as future work or stop for a reviewed delta instead of widening this wave.

## Files/tests/docs/fixtures to DELETE

- `frontend/src/commands/operations/paper/README.md`
- `frontend/src/commands/operations/paper/`
- `frontend/src/commands/operations/toolbar/README.md`
- `frontend/src/commands/operations/toolbar/`
- Any tests/fixtures that only reference or snapshot the placeholder operation docs/directories.
- Any stale comments in the same edited blocks that explain debug-only branches, placeholder future operations, or obsolete operation docs.

No broad `docs/`, `specs/`, or historical architecture pages should be deleted in Wave 012 unless they are direct references to the removed placeholder/debug surfaces and review accepts that narrow deletion. Broad reconciliation remains Wave 013.

## Explicit non-goals and boundaries

- Do not add a logging service, diagnostics port, telemetry abstraction, or environment-gated debug facade.
- Do not change command/undo, persistence, rendering selector, App shell, or Drive API architecture beyond deleting routine logs/comments in the listed files.
- Do not modify `frontend/src/App.vue` placeholder highlight handlers (`frontend/src/App.vue:160-165`) in this wave; they require UI contract review.
- Do not modify `frontend/src/services/ProjectService.ts` unless implementation discovers a routine log missed by the scope check; current scope evidence says it has no routine debug logging.
- Do not resurrect `frontend/src/services/PaperService.ts`; it no longer exists in the current tree.
- Do not fix Wave 011 residual validation debt (full Vitest failures, Node 24 / `vue-tsc`, corrupted broad e2e specs).

## Expected behavior change

- No intended user-visible behavior change.
- Developer console output during normal app use becomes materially quieter.
- The source tree no longer suggests unimplemented paper/toolbar operation families.
- Architecture/static validation begins treating placeholder operation directories and routine console logging as source-hygiene regressions.

## Validation plan

All stdout/stderr logs should be saved under `architecture-audit/cycle-012-placeholder-debug-cleanup/validation/`.

### New/updated focused architecture tests

- Run `npm run test:architecture --workspace=frontend` and `npm run test:architecture`.
- The architecture suite should pass with the new source-hygiene assertions.
- Confirm the console/source-hygiene assertion's fixture list or scanner roots are exactly the enumerated touched files, not all of `frontend/src/**`.
- Confirm the assertions fail locally before the deletion when practical, or document why failure demonstration was not run to avoid source churn.

### Static deletion scans

- `test ! -d frontend/src/commands/operations/paper`
- `test ! -d frontend/src/commands/operations/toolbar`
- `test -f frontend/src/commands/operations/processTree/README.md`
- `test -f frontend/src/commands/operations/world/README.md`
- `test -f frontend/src/commands/operations/viewState/README.md`
- Search active `frontend/src` and `frontend/tests` for:
  - `operations/paper`
  - `operations/toolbar`
  - `operations/debug`
  - `ExamplesMenu`
  - `AddExampleSetupOp`
  - `projection-plane-setup`
  - `basic-3d-point-setup`
- Search only the Wave 012 evidenced touched files named in the Static hygiene boundary section for `console.log`, `console.debug`, and `console.info`; require zero hits in those files. This validation must not require broad docs/spec cleanup or unrelated `frontend/src/**` rewrites.

### Focused behavior tests

Run the nearest focused Vitest suites for touched runtime modules:

- operation registry/serialization/deserialization coverage for placeholder directory deletion safety;
- process-tree operation tests for `ToggleOutputOp.ts` and `ToggleEncapsulationOp.ts`;
- world operation tests for `UpdateElementStyleOp.ts` and `RemoveElementOps.ts`;
- geometry/rendering utility tests for `rectangleGrid.ts` and `projectionPlaneUtils.ts`.

If focused tests for a touched module are absent, record the search command and run the closest behavior-level suite rather than expanding the wave into broad test-health work.

### Mandatory cadence

- `npm run lint` at root.
- `npm run lint --workspace=frontend`.
- `npm run test` at root.
- `npm run test --workspace=frontend`.
- `npm run build` at root.
- `npm run build --workspace=frontend`.
- `npm run test:e2e` at root.
- `npm run test:e2e --workspace=frontend`.

Classify unchanged known failures from Wave 011 as pre-existing/unrelated:

- full Vitest failures in guide-creation, intersections, and PropertiesDialog areas;
- Node 24 / `vue-tsc` build crash;
- corrupted broad e2e spec syntax in `keyboard-shortcuts.spec.ts` and `selection-mask.spec.ts`.

### Focused e2e/live preview

- Run a focused Playwright smoke that verifies the app shell/project flow still loads, preferably the same `tests/e2e/wave010-app-shell-project-flow.spec.ts` used in Wave 011 if still available.
- Refresh the live preview server on `0.0.0.0` from `frontend/` after successful focused validation.
- Probe `http://127.0.0.1:5173/` and record an HTTP 200 result.

## Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| The console hygiene test becomes brittle by matching comments, tests, or intentional error logging. | Medium. | Scope it to the enumerated Wave 012 touched files only, match only `console.log/debug/info`, and keep `warn/error` out of this wave. |
| A static allowlist grows into a parallel policy layer. | Medium. | Do not introduce an allowlist in Wave 012; require zero hits in the enumerated touched files and stop for a delta proposal if broader policy is needed. |
| Deleting logs from numeric geometry utilities accidentally edits calculations. | Medium. | Keep diffs limited to logging/debug flag removal; run focused geometry/rendering tests. |
| Placeholder directory absence is hard to enforce from Vitest raw globs. | Low. | Enforce references in architecture tests and directory absence with stable validation shell scans. |
| Mandatory full validation still fails from known debt. | Medium. | Capture focused passing gates and compare failure signatures to Wave 011 implementation-log classifications. |

## Why this is preferable to the direct proposal

The direct proposal cleans the current tree, but without a boundary the same placeholder/logging noise can reappear. Wave 011 already established deterministic architecture/static gates; Wave 012 should use that mechanism for a small hygiene rule instead of relying only on one-time deletion. This proposal still honors aggressive deletion and avoids overbuilding by rejecting a logging abstraction.

## Acceptance fit

This proposal advances Wave 012 while preserving the remaining plan order: it consumes Wave 011 gates, excludes broad Wave 013 docs/spec reconciliation, deletes rather than wraps placeholder/debug surfaces, and accounts for known validation/tooling debt without trying to solve it in this wave.
