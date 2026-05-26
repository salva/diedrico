# Wave 012 Decision — Placeholder/debug cleanup

**Stage:** `cycle-012-decision`  
**Cycle:** `cycle-012-placeholder-debug-cleanup`  
**Decision date:** 2026-05-26  
**Source-code changes in this stage:** none. This decision authorizes the later implementation stage only.

## Artifacts cited

This decision is based on the full Wave 012 convergence record:

- Wave-plan entry: `architecture-audit/wave-plan.md`, **Wave 012 — Remove vacant placeholders, noisy debug surfaces, and obsolete operation docs**.
- Scope check: `architecture-audit/cycle-012-placeholder-debug-cleanup/scope-check.md`.
- Direct proposal: `architecture-audit/cycle-012-placeholder-debug-cleanup/proposals/proposal-direct.md`.
- Restructure proposal: `architecture-audit/cycle-012-placeholder-debug-cleanup/proposals/proposal-restructure.md`.
- Corrections note: `architecture-audit/cycle-012-placeholder-debug-cleanup/corrections-round-01-note.md`.
- Review round 01: `architecture-audit/cycle-012-placeholder-debug-cleanup/reviews/round-01-review.md`.
- Review round 02: `architecture-audit/cycle-012-placeholder-debug-cleanup/reviews/round-02-review.md`.

## Convergence result

Review convergence is complete after round 02 with **NO BLOCKING ISSUES**.

Round 01 found both proposals directionally sound but blocked implementation until the console/source-hygiene gate scope was made deterministic and bounded. `corrections-round-01-note.md` records in-place edits to both proposals: directory absence/preservation is shell validation, placeholder/deleted-surface references are checked in active source/tests, and console hygiene is restricted to the nine Wave 012 evidenced touched files. Round 02 confirms those blockers are resolved and recommends `proposal-restructure.md` as the winning proposal.

## Selected proposal

**Selected for implementation:** `proposal-restructure.md`.

Rationale:

- It performs the same deletion-first runtime cleanup as the direct proposal: remove README-only operation placeholders and routine normal-flow debug logs.
- It better uses Wave 011's architecture/static-gate infrastructure by adding a narrow, deterministic source-hygiene boundary so deleted placeholder/debug surfaces do not silently return.
- After corrections, the static boundary is bounded to the exact Wave 012 targets and no longer risks full-repo cleanup or an allowlist framework.
- It preserves the no-backcompat priority by deleting debug/placeholder surfaces rather than hiding them behind compatibility shims, logger facades, environment flags, or placeholder documentation.

## Rejected/deferred alternatives

### `proposal-direct.md` — rejected as weaker, not invalid

The direct proposal is acceptable as a fallback but is not selected because it is primarily a one-time deletion cleanup. It does not make the cleanup as durable as the restructure proposal's bounded architecture/static guard. Its runtime file changes remain incorporated through the selected proposal.

### Diagnostics/logger abstraction — rejected

A diagnostics port, logging service, telemetry adapter, or environment-gated debug facade is rejected for Wave 012. The cited logs are normal-flow implementation diagnostics, not domain events or user-facing recovery information. Wrapping them would preserve the smell and add infrastructure for behavior that should be deleted.

### Full-repository cleanup / allowlist framework — rejected

Wave 012 must not become a full `frontend/src/**` console-ban project, broad source cleanup, or allowlist-policy framework. If implementation discovers routine logging outside the nine selected files, record it as future work or stop for a reviewed delta; do not expand the implementation silently.

### Wave 013 broad docs/spec reconciliation — deferred

Broad reconciliation of `docs/`, `specs/`, historical `specs/001-dihedral-learning-mvp` references, and general “Phase N” comments remains Wave 013 scope. Wave 012 may delete only directly affected obsolete operation/debug references and comments adjacent to removed placeholder/debug code.

## Binding implementation scope

The next implementation stage must implement `proposal-restructure.md` within the following exact scope.

### Delete README-only placeholder operation families

Delete these paths if still README-only:

- `frontend/src/commands/operations/paper/README.md`
- `frontend/src/commands/operations/paper/`
- `frontend/src/commands/operations/toolbar/README.md`
- `frontend/src/commands/operations/toolbar/`

Preserve these operation families and READMEs:

- `frontend/src/commands/operations/processTree/README.md`
- `frontend/src/commands/operations/processTree/`
- `frontend/src/commands/operations/world/README.md`
- `frontend/src/commands/operations/world/`
- `frontend/src/commands/operations/viewState/README.md`
- `frontend/src/commands/operations/viewState/`

`viewState/` is not a README-only placeholder because it contains source files; registration/contract questions for that family are out of Wave 012 scope unless a separately reviewed delta authorizes them.

### Remove routine debug logging only in the approved files

Remove `console.log`, `console.debug`, and `console.info` normal-flow logging/debug-only branches from exactly these Wave 012 evidenced files:

- `frontend/src/services/GoogleDriveService.ts`
- `frontend/src/utils/rectangleGrid.ts`
- `frontend/src/utils/projectionPlaneUtils.ts`
- `frontend/src/domain/world/HingeLine.ts`
- `frontend/src/domain/world/Guide.ts`
- `frontend/src/commands/operations/world/UpdateElementStyleOp.ts`
- `frontend/src/commands/operations/world/RemoveElementOps.ts`
- `frontend/src/commands/operations/processTree/ToggleOutputOp.ts`
- `frontend/src/commands/operations/processTree/ToggleEncapsulationOp.ts`

Keep `console.warn` and `console.error` out of the Wave 012 hygiene rule unless a specific line in these files is clearly routine debug noise and can be safely removed without changing failure reporting. Do not touch `frontend/src/App.vue` or `frontend/src/services/ProjectService.ts` for logging cleanup based on current evidence; the scope check found no routine debug logging there.

### Add a bounded static hygiene boundary

Modify or add architecture tests under `frontend/tests/unit/architecture/`, preferably reusing `frontend/tests/unit/architecture/helpers/sourceScanner.ts`, with these constraints:

- Active `frontend/src/**` and `frontend/tests/**` must not reference deleted/placeholder-only surfaces: `operations/paper`, `operations/toolbar`, `operations/debug`, `ExamplesMenu`, `AddExampleSetupOp`, `projection-plane-setup`, or `basic-3d-point-setup`, except for the architecture assertion text itself where unavoidable.
- Console hygiene must be enforced only for the nine files listed above and only for `console.log`, `console.debug`, and `console.info`.
- Do not encode a general “no operation READMEs” rule. README-only placeholder deletion and active README preservation are shell-validation checks.
- Do not introduce a full-repo console policy, named exception allowlist, logging facade, or compatibility shim.

### Local comment/docs cleanup allowed only where directly affected

Delete stale comments/TODOs only when they are directly adjacent to removed placeholder/debug code or directly preserve the obsolete operation/debug mental model being removed. Do not perform broad docs/spec/comment cleanup in this wave.

## Aggressive DELETE list

The implementation must delete, not wrap or preserve:

- `frontend/src/commands/operations/paper/README.md`
- empty `frontend/src/commands/operations/paper/`
- `frontend/src/commands/operations/toolbar/README.md`
- empty `frontend/src/commands/operations/toolbar/`
- routine `console.log` / `console.debug` / `console.info` calls in the nine approved touched files
- the `clipDebugDone` debug flag and debug-only branches in `frontend/src/utils/rectangleGrid.ts`
- tests/fixtures discovered during implementation that only assert the removed placeholder operation docs/directories
- directly adjacent obsolete operation/debug comments made meaningless by the deletions

## Explicit implementation constraints

- Do not reopen Waves 001–011 structural work.
- Do not modify `architecture-audit/wave-plan.md` during implementation unless the wave premise is invalidated and a reviewed plan-edit mini-cycle is run first.
- Do not resurrect `frontend/src/commands/operations/debug/` or any deleted example/debug setup path.
- Do not modify command/undo, persistence, rendering selector, App shell, Drive API architecture, `App.vue` highlight-handler contracts, or `ProjectService.ts` shape except for deleting approved routine logs in the listed files.
- Do not repair Wave 011 residual validation debt inside Wave 012: known full Vitest failures, Node 24 / `vue-tsc` build crash, and corrupted broad e2e specs must be classified if still present, not bundled into this cleanup.
- Do not make application behavior dependent on console output. User-visible behavior should remain unchanged.

## Required validation for implementation/validation stages

All command stdout/stderr must be captured to stable files under:

`architecture-audit/cycle-012-placeholder-debug-cleanup/validation/`

Minimum required checks:

1. **Static deletion/preservation scans**
   - `test ! -d frontend/src/commands/operations/paper`
   - `test ! -d frontend/src/commands/operations/toolbar`
   - `test -f frontend/src/commands/operations/processTree/README.md`
   - `test -f frontend/src/commands/operations/world/README.md`
   - `test -f frontend/src/commands/operations/viewState/README.md`
   - search active `frontend/src` and `frontend/tests` for forbidden deleted surfaces listed above
   - search only the nine approved touched files for `console.log`, `console.debug`, and `console.info`; require zero hits
2. **Architecture/static gates**
   - `npm run lint`
   - `npm run lint --workspace=frontend`
   - `npm run test:architecture`
   - `npm run test:architecture --workspace=frontend`
3. **Focused Vitest**
   - nearest operation registry/serialization/deserialization coverage for placeholder deletion safety
   - nearest process-tree operation tests for `ToggleOutputOp.ts` and `ToggleEncapsulationOp.ts`
   - nearest world operation tests for `UpdateElementStyleOp.ts` and `RemoveElementOps.ts`
   - nearest geometry/rendering utility tests for `rectangleGrid.ts` and `projectionPlaneUtils.ts`
   - if an exact focused test does not exist, record the search and run the closest behavior-level suite
4. **Mandatory full cadence**
   - `npm run test`
   - `npm run test --workspace=frontend`
   - `npm run build`
   - `npm run build --workspace=frontend`
   - `npm run test:e2e`
   - `npm run test:e2e --workspace=frontend`
5. **Focused Playwright/live preview**
   - run a focused app-shell/project-flow Playwright smoke, preferably `frontend/tests/e2e/wave010-app-shell-project-flow.spec.ts` if still available
   - refresh the live preview from `frontend/` with `npm run dev -- --host 0.0.0.0`
   - probe `http://127.0.0.1:5173/` and record an HTTP 200 reachability result

Known Wave 011 validation debt may be accepted only when the implementation log shows the failure signatures are unchanged and unrelated to Wave 012.

## Accepted residual risks

- The new console-hygiene assertion may be brittle if matching is imprecise. Mitigation: implement it only over the nine approved files and only for `console.log`, `console.debug`, and `console.info`.
- Full Vitest/build/e2e output may still contain known Wave 011 debt. Mitigation: capture logs and classify unchanged failures explicitly instead of waiving them silently.
- Adjacent comment cleanup could drift into Wave 013 documentation work. Mitigation: delete only directly affected obsolete operation/debug comments and record any broader docs/spec issues for Wave 013.

## Next implementation checklist

The next Manager stage can proceed with this checklist:

- [ ] Inspect current diff and stage only Wave 012 implementation files.
- [ ] Delete `paper/` and `toolbar/` README-only operation directories.
- [ ] Remove routine debug logs/debug branches from the nine approved files.
- [ ] Preserve `processTree/`, `world/`, and `viewState/` operation families and READMEs.
- [ ] Extend/add bounded architecture source-hygiene tests under `frontend/tests/unit/architecture/`.
- [ ] Run and capture the validation commands listed above under `architecture-audit/cycle-012-placeholder-debug-cleanup/validation/`.
- [ ] Refresh/probe the live preview and record it in `implementation-log.md`.
- [ ] Record all source files changed, legacy surfaces deleted, validation outcomes, residual risks, and any future-wave issues in `architecture-audit/cycle-012-placeholder-debug-cleanup/implementation-log.md`.
