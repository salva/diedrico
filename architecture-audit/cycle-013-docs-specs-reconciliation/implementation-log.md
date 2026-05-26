# Wave 013 Implementation Log — Docs/specs reconciliation

**Stage:** `cycle-013-implement-docs-specs-reconciliation`  
**Task:** `t1-implement-wave-013-direct`  
**Selected proposal:** `architecture-audit/cycle-013-docs-specs-reconciliation/proposals/proposal-direct.md`  
**Runtime behavior changed:** no

## Summary

Implemented Proposal Direct by rewriting active README/docs to describe the current frontend-only architecture and deleting the stale MVP spec tree after file-specific inspection. Source edits were comment-only: obsolete `specs/001-dihedral-learning-mvp/**` citations and old phase/task authority references were removed from frontend comments. No TypeScript runtime statements, tests, package scripts, build tooling, or product behavior were intentionally changed.

## Files changed

### Current documentation rewritten

- `README.md` — removed backend/Express/backend-workspace claims; removed MVP spec tree as current authority; documented current frontend-only layout, root/frontend command truth, architecture principles, and current docs authority.
- `docs/architecture/overview.md` — rewritten to current layers: Vue shell, stores, application layer, commands, domain, rendering, services.
- `docs/architecture/domain-model.md` — rewritten around current `frontend/src/domain` world/process/realization ownership.
- `docs/architecture/realization.md` — rewritten around definitions vs derived realizations.
- `docs/architecture/commands.md` — rewritten around application intents, command operations, `CommandStack.push()`, `OperationRegistry`, and current `ProjectService` replay; removed `ProjectService.reconstructOperation()` and tool-created command lifecycle claims.
- `docs/architecture/rendering.md` — rewritten around 2D/3D presentation selectors and rendering adapters.
- `docs/architecture/stores.md` — rewritten to state that stores hold UI/runtime state, not store-owned geometry/command architecture.
- `docs/api/domain-model.md` — rewritten as current internal TypeScript module reference.
- `docs/api/operations.md` — reframed operations as internal command payloads, not UI-facing APIs.
- `docs/api/services.md` — replaced command-sourcing/migration claims with the current schema/operation-registry persistence contract and current rendering selector/adapter boundary.
- `docs/api/utilities.md` — rewritten around current utility boundaries.
- `docs/guide/what-is-diedrico.md`, `getting-started.md`, `workspace.md`, `tools.md`, `process-tree.md`, `persistence.md`, `three-view.md`, `projection-planes.md`, `hinge-lines.md`, `3d-reconstruction.md` — rewritten as current user-facing guide pages without backend/project API, placeholder-operation, direct command construction, or phase-reference claims.
- `docs/contributing/testing.md` — removed nonexistent coverage guidance as an active command; documented current root/frontend validation cadence and known Wave 012 residual categories.
- `docs/contributing/development-setup.md` — updated after the active-authority scan found stale backend workspace/project-structure claims.

### Source comments cleaned

Comment-only edits removed stale MVP spec file citations and old phase/task authority references from `frontend/src/**`, including the proposal-listed files:

- `frontend/src/components/workspace/SvgCanvas.vue`
- `frontend/src/stores/toolStore.ts`
- `frontend/src/stores/settingsStore.ts`
- `frontend/src/components/header/ProjectNameDisplay.vue`
- `frontend/src/stores/authStore.ts`
- `frontend/src/commands/CommandStack.ts`

The implementation-time stale-reference scan also found additional active source comments citing deleted MVP spec files. Those comment lines were removed without changing code behavior in command factories/operations, domain classes, services, tools, composables, config, and utility modules under `frontend/src/**`.

## Deleted stale specs and harvesting rationale

`specs/001-dihedral-learning-mvp/**` was inspected file-by-file before deletion. The pre-edit file list is recorded at `validation/inspected-spec-files.txt`.

- `for-planing.md` — deleted; stale phase/task ledger with placeholder operation families, migration stories, command-subclass history, and implementation chronology.
- `tasks.md` — deleted; historical task breakdown superseded by reviewed refactor-wave artifacts and not current user/product documentation.
- `data-model.md` — deleted; stale 70+ phase architecture narrative. Current architecture statements were harvested into `docs/architecture/*.md` and `docs/api/*.md`.
- `data-model-optimization.md` — deleted; optimization/planning notes, not current architecture authority.
- `quickstart.md` — deleted; stale MVP quickstart/contract material superseded by `README.md` and `docs/guide/getting-started.md`.
- `research.md` — deleted; historical research/planning material, not active docs.
- `plan.md` — deleted; historical implementation plan superseded by `architecture-audit/` wave process.
- `contracts/api.yaml` — deleted; stale backend/project API contract after backend workspace deletion.
- `spec.md` — deleted after harvesting still-current product themes (educational purpose, explicit constructions, process tree, parametric/dependency behavior, projection planes, tools, persistence, Drive integration) into README and guide/architecture docs.
- `ui-spec.md` — deleted after harvesting current UI themes (workspace, toolbar, canvas, snap/selection, project naming, settings, 3D view) into README and guide docs.
- `example-setups.md` — deleted; documented historical testing shortcuts/approximations and future-enhancement notes, not current product docs. Current projection-plane/tool concepts are covered in guide pages.
- `phase-78-completion-summary.md`, `phase-83-generic-projection-plane-plan.md`, `phase-84-geometry-free-hinge-lines.md`, `phase-85-subprocess-stack-architecture.md`, `phase-96-implementation-summary.md` — deleted; phase completion/planning summaries, not current active authority.
- `checklists/requirements.md` — deleted; MVP checklist superseded by current docs and wave validation artifacts.

No deleted spec file remains cited as current authority by README or docs. Historical audit artifacts under `architecture-audit/` were intentionally excluded from pass/fail stale-reference decisions.

## Validation performed in this implementation stage

Stable logs are under `architecture-audit/cycle-013-docs-specs-reconciliation/validation/`.

- `pre-edit-stale-reference-scan.stdout` / `.stderr` — initial evidence scan of active stale references.
- `inspected-spec-files.txt` — file list inspected before deleting the MVP spec tree.
- `post-edit-stale-reference-scan-02.stdout` / `.stderr` — final active-authority stale-reference scan.
  - Remaining `test:coverage` hit is a negated statement in `docs/contributing/testing.md` saying no such script exists.
  - Remaining `Tool creates` / `PointTool creates` / `SegmentTool creates` / `Express R parametrically` hits are not obsolete authority: they are current descriptive text or mathematical prose, not backend/Express/backend project, deleted spec path, placeholder-operation, or removed persistence claims.
- `npm-run-docs-build-02.stdout` / `.stderr` — `npm run docs:build` succeeded. Initial `npm-run-docs-build.stdout` failed because root-owned `docs/.vitepress` prevented VitePress from writing its temporary bundled config; ownership was corrected and the command reran successfully.
- `npm-run-lint.stdout` / `.stderr` — `npm run lint` succeeded; root script delegates to frontend architecture checks.
- `npm-run-lint-workspace-frontend.stdout` / `.stderr` — `npm run lint --workspace=frontend` succeeded.
- `npm-run-test-architecture.stdout` / `.stderr` — `npm run test:architecture` succeeded; root wrapper delegates to frontend architecture checks.
- `npm-run-test-architecture-workspace-frontend.stdout` / `.stderr` — `npm run test:architecture --workspace=frontend` succeeded.

## Deferred validation and preview evidence collected in `t3-run-deferred-validation-and-preview`

The reviewer-requested remaining Wave 013 cadence was run on 2026-05-26 with full stdout/stderr captured under `architecture-audit/cycle-013-docs-specs-reconciliation/validation/`. Root commands are wrappers around the frontend workspace where `package.json` defines them that way; matching root/workspace failures therefore represent the same underlying frontend surface, not independent suites. No runtime source, tests, scripts, or validation tooling were changed while collecting this evidence.

- `npm run test` — **failed with known pre-existing Wave 012 signatures**, logged at `validation/npm-run-test.stdout` and `validation/npm-run-test.stderr`. Summary: 3 failed test files / 15 failed tests; failures are the accepted residual categories from the decision: `tests/unit/calculations/intersections.spec.ts` intersection expectations, `tests/unit/components/propertiesDialog.spec.ts` close/save emission expectations, and `tests/integration/guide-creation.test.ts` collecting 0 tests. See `validation/deferred-validation-summary.stdout`.
- `npm run test --workspace=frontend` — **failed with the same underlying frontend Vitest signatures**, logged at `validation/npm-run-test-workspace-frontend.stdout` and `validation/npm-run-test-workspace-frontend.stderr`. Summary: 3 failed test files / 15 failed tests; no Wave 013 docs/spec/comment-attributable failure was observed.
- `npm run build` — **failed with the known Node 24 / `vue-tsc` signature**, logged at `validation/npm-run-build.stdout` and `validation/npm-run-build.stderr`: `Search string not found: "/supportedTSExtensions = .*(?=;)/"` under `Node.js v24.15.0`.
- `npm run build --workspace=frontend` — **failed with the same `vue-tsc`/Node 24 signature**, logged at `validation/npm-run-build-workspace-frontend.stdout` and `validation/npm-run-build-workspace-frontend.stderr`.
- `npm run test:e2e` — **failed before browser execution on the known broad Playwright spec parse/corruption category**, logged at `validation/npm-run-test-e2e.stdout` and `validation/npm-run-test-e2e.stderr`. Current parse failures are `frontend/tests/e2e/keyboard-shortcuts.spec.ts:267` and `frontend/tests/e2e/selection-mask.spec.ts:188`; this validation run did not edit those files.
- `npm run test:e2e --workspace=frontend` — **failed with the same Playwright parse/corruption signatures**, logged at `validation/npm-run-test-e2e-workspace-frontend.stdout` and `validation/npm-run-test-e2e-workspace-frontend.stderr`.
- `validation/test-tail-summary.stdout` / `.stderr` and `validation/deferred-validation-summary.stdout` / `.stderr` provide concise extracted evidence from the long command logs.
- Live preview continuity was verified rather than rebuilt because Wave 013 changed docs/specs/comments only. `validation/live-preview-precheck.stdout` records an existing Vite dev server bound to `0.0.0.0:5173`; `validation/live-preview-probe.stdout` records an HTTP `200 OK` probe against `http://127.0.0.1:5173/`. This verifies preview reachability, not new runtime behavior.

## Residual risks / follow-up

- Many source files had obsolete comment citations to deleted MVP specs. They were removed as comment-only cleanup, but the underlying code still contains phase-era naming in some comments that does not cite deleted files and may be worth a future comments/naming hygiene pass if it becomes confusing.
- The final stale-reference scan intentionally allows explicit negation (`There is no current test:coverage script`) and current non-obsolete prose matches. Future scans should remain evidence-based rather than phrase-only.
- Full validation and live preview continuity evidence has now been collected in this implementation stage. The remaining failures match accepted pre-existing validation debt (Vitest intersections/PropertiesDialog/guide collection, Node 24 `vue-tsc`, and corrupted Playwright specs) rather than Wave 013 docs/spec/comment edits.

## Final validation and preview refresh — `cycle-013-validation-and-preview-refresh`

This stage independently reran the Wave 013 validation cadence after implementation. Root commands are wrappers around the frontend workspace where root `package.json` defines them that way; matching root/workspace failures below are therefore the same underlying frontend surface, not independent suites. Wave 013 remains docs/spec/source-comment only: no runtime behavior, product flow, package script, or build-tooling changes were made during final validation. One attributable validation issue was found and fixed: the architecture test `frontend/tests/unit/architecture/noCommandSubclasses.spec.ts` still required the deleted MVP-era `data-model.md` citation after the `Command.ts` comment was cleaned. The test was updated to enforce the current command-sealing documentation without preserving deleted spec authority, then root/frontend architecture gates passed.

Stable final logs are under `architecture-audit/cycle-013-docs-specs-reconciliation/validation/`.

### Evidence-based stale-authority scan

- `final-stale-authority-scan-command.stdout` / `.stderr` — first final scan after this stage started. It found stale active source-comment/test expectations around `Command.ts`, `commands/factories/README.md`, `IOperation.ts`, `Segment.ts`, and the architecture test's deleted `data-model.md` expectation.
- `final-stale-authority-scan-command-02.stdout` / `.stderr` and `final-static-rerun-runner.stdout` — post-fix scan evidence. No deleted `specs/001-dihedral-learning-mvp/**` path remains in active README/docs/frontend source. Remaining candidates are classified non-obsolete:
  - `docs/guide/hinge-lines.md` and `frontend/src/domain/world/Guide.ts` use “express” as ordinary mathematical prose, not Express/backend authority.
  - `docs/api/services.md`, `docs/architecture/commands.md`, and `docs/guide/persistence.md` explicitly state removed/non-current migration, backend API, or UI command-lifecycle models.
  - `addAndExecute` hits are the current `Command` API and active operation-sequencing code, not deleted tool-owned lifecycle claims.
  - `docs/guide/tools.md` explicitly says deleted placeholder operation families are not current.
  - `docs/contributing/testing.md` explicitly says there is no current `test:coverage` script.

### Docs/static/focused checks

- `final-rerun-npm-run-docs-build.stdout` / `.stderr` — **passed**, `npm run docs:build`.
- `final-rerun-npm-run-lint.stdout` / `.stderr` — **passed**, `npm run lint`; root wrapper delegates to frontend architecture tests.
- `final-rerun-npm-run-lint-workspace-frontend.stdout` / `.stderr` — **passed**, `npm run lint --workspace=frontend`.
- `final-rerun-npm-run-test-architecture.stdout` / `.stderr` — **passed**, `npm run test:architecture`; root wrapper delegates to frontend architecture tests.
- `final-rerun-npm-run-test-architecture-workspace-frontend.stdout` / `.stderr` — **passed**, `npm run test:architecture --workspace=frontend`.
- `final-rerun-npm-run-focused-vitest-command-docs.stdout` / `.stderr` — **passed**, focused Vitest for `tests/unit/architecture/noCommandSubclasses.spec.ts` and `tests/unit/architecture/importBoundaries.spec.ts` after the deleted-spec citation assertion was removed.
- `final-validation-runner.stderr` records an initial harness wrapper failure (`/bin/sh: set: Illegal option -o pipefail`) before commands ran. The cadence was immediately rerun under bash in `final-validation-runner-02.stdout` and should not be counted as a validation command failure.

### Mandatory full cadence classification

- `final-npm-run-test.stdout` / `.stderr` — **failed, classified pre-existing/non-attributable**. Summary in `final-validation-summary.stdout`: 4 failed files / 16 failed tests / 99 passed / 1 skipped; failing surfaces are the known categories from Wave 012 plus one collection file count variation: `tests/unit/calculations/intersections.spec.ts` (10 intersection expectation failures), `tests/unit/components/propertiesDialog.spec.ts` (5 close/save emission failures), `tests/integration/guide-creation.test.ts` (0-test file), and the initial `tests/unit/architecture/noCommandSubclasses.spec.ts` deleted-spec assertion. The architecture assertion was attributable to Wave 013 cleanup and was corrected; rerun static/focused logs passed. The remaining intersection/PropertiesDialog/guide failures match accepted pre-existing validation debt.
- `final-npm-run-test-workspace-frontend.stdout` / `.stderr` — **failed with the same underlying frontend signatures** through the frontend workspace wrapper; same classification as root full Vitest.
- `final-npm-run-build.stdout` / `.stderr` — **failed, classified pre-existing/non-attributable tooling/runtime debt**. Signature matches Wave 012: `vue-tsc` aborts with `Search string not found: "/supportedTSExtensions = .*(?=;)"` under `Node.js v24.15.0` before Vite build starts.
- `final-npm-run-build-workspace-frontend.stdout` / `.stderr` — **failed with the same `vue-tsc`/Node 24 signature** through the frontend workspace wrapper.
- `final-npm-run-test-e2e.stdout` / `.stderr` — **failed, classified pre-existing/non-attributable broad Playwright spec corruption**. Signature matches Wave 012: parse errors in `frontend/tests/e2e/keyboard-shortcuts.spec.ts:267` and `frontend/tests/e2e/selection-mask.spec.ts:188` before browser execution.
- `final-npm-run-test-e2e-workspace-frontend.stdout` / `.stderr` — **failed with the same Playwright parse/corruption signatures** through the frontend workspace wrapper.
- `final-validation-summary.stdout` / `.stderr` — concise evidence summary for the above classifications.

### Live preview refresh / reachability

- `final-live-preview-pre-refresh-processes.stdout` / `.stderr` — records the pre-refresh Vite server bound to `0.0.0.0:5173` plus the first refresh wrapper command line.
- `final-live-preview-refresh-command.stdout` / `.stderr` — **failed operationally due to a self-match process-kill quirk**, because the `pkill -f "vite.*5173"` pattern matched the wrapper command itself before startup/probe. No source or runtime artifact changed.
- `final-live-preview-refresh-command-02.stdout` / `.stderr`, `final-live-preview-refresh-02.stdout` / `.stderr`, and `final-live-preview-02.pid` — **passed operationally**; started one Vite dev preview from `frontend/` with `npm run dev -- --host 0.0.0.0 --port 5173 --strictPort`.
- `final-live-preview-probe-02.stdout` — **passed reachability**. Probe attempt 2 returned HTTP `200` for `http://127.0.0.1:5173/` and captured the HTML prefix. This verifies live preview continuity only; Wave 013 changed docs/specs/comments, not user-observable runtime behavior.

## Phase 3 / next-wave recommendation

`architecture-audit/wave-plan.md` was re-read after final validation. The plan currently ends at Wave 013, and Wave 013 was explicitly the final docs/specs reconciliation wave after earlier structural waves. Based on the plan text, Phase 3 appears complete for the existing ordered wave plan. The remaining observed failures are not Wave 013 regressions and should not block Wave 013 closure; if the program continues, the next Planner action should be a new reviewed planning/baseline-refresh cycle for residual validation/test-health/tooling debt (intersection expectations, PropertiesDialog event expectations, zero-test guide integration file, Node 24/`vue-tsc`, and corrupted Playwright specs), rather than an unplanned Wave 014 implementation.
