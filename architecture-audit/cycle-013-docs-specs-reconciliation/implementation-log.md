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

## Validation deferred to separate validation stage

Per the current stage split, full Vitest, build, e2e, and live preview refresh/probe are deferred to `cycle-013-validation-and-preview-refresh` unless the Manager asks this implementation stage to run the full cadence. This implementation changed docs/specs/comments only, so the deferred runs should verify no runtime regression and classify known Wave 012 residual debt if signatures match:

- `npm run test` and `npm run test --workspace=frontend`
- `npm run build` and `npm run build --workspace=frontend`
- `npm run test:e2e` and `npm run test:e2e --workspace=frontend`
- Live preview refresh or continuity check on `0.0.0.0` plus HTTP reachability probe

## Residual risks / follow-up

- Many source files had obsolete comment citations to deleted MVP specs. They were removed as comment-only cleanup, but the underlying code still contains phase-era naming in some comments that does not cite deleted files and may be worth a future comments/naming hygiene pass if it becomes confusing.
- The final stale-reference scan intentionally allows explicit negation (`There is no current test:coverage script`) and current non-obsolete prose matches. Future scans should remain evidence-based rather than phrase-only.
- Full validation and live preview continuity remain for the dedicated validation stage.
