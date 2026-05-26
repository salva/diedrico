# Wave 013 Scope Check — Docs/specs reconciliation

**Stage:** `cycle-013-fresh-scout-proposals`  
**Wave:** 013 — Reconcile docs/specs with the cleaned architecture  
**Date:** 2026-05-26  
**Source changes in this stage:** none outside `architecture-audit/`.

## Scope verdict

Wave 013 can proceed without editing `architecture-audit/wave-plan.md`.

The Wave 013 premise still holds after Wave 012: the active source tree has been structurally cleaned through the earlier waves, but top-level README material, docs pages, MVP-era specs, and several source comments still preserve pre-refactor mental models. The current plan ordering remains appropriate: the remaining work is documentation/spec/comment reconciliation, not another central source refactor. The implementation wave should delete or rewrite obsolete documents rather than add caveats that keep legacy architecture alive.

## Re-rank after Wave 012

Wave 012 deleted README-only operation placeholder families and removed bounded debug logging. Its implementation log confirms `frontend/src/commands/operations/paper/` and `frontend/src/commands/operations/toolbar/` were deleted, while `processTree/`, `world/`, and `viewState/` operation READMEs were intentionally preserved as active surfaces (`architecture-audit/cycle-012-placeholder-debug-cleanup/implementation-log.md`, "Legacy surfaces deleted"). The next most central remaining work is therefore still Wave 013: remove stale docs/specs/comments that describe deleted placeholders, backend workspace/API, old command/persistence internals, old validation expectations, or old source organization.

Known residual validation/tooling debt should not be pulled into this wave: full Vitest still has pre-existing intersection/PropertiesDialog/zero-test guide failures; build still fails before Vite because `vue-tsc` is incompatible with Node 24; broad e2e remains blocked by corrupted Playwright specs (`architecture-audit/cycle-012-placeholder-debug-cleanup/implementation-log.md`, "Residual risks / accepted debt"). Wave 013 may document those facts in testing guidance, but repairing them is future validation-tooling/test-health work.

## Current architecture evidence to account for

- Root validation and workspace truth is frontend-only: `package.json:7-9` lists only the `frontend` workspace, and root scripts delegate build/test/lint/e2e/docs to frontend or VitePress (`package.json:13-21`).
- Frontend build/test script truth is `vue-tsc && vite build`, `vitest run`, `vitest run tests/unit/architecture`, and `playwright test` (`frontend/package.json:7-16`).
- Wave 012 architecture gates now explicitly forbid stale backend project terms in frontend source/tests (`frontend/tests/unit/architecture/importBoundaries.spec.ts:6-12`) and preserve deleted-surface checks for placeholder/debug families per the implementation log.
- Wave 010 explicitly selected deletion of the disconnected backend project API/storage path and allowed backend workspace deletion if no current non-project backend responsibility remained (`architecture-audit/cycle-010-backend-frontend-project-contract/decision.md`, "Convergence decision" and "Binding implementation scope"). Its implementation log confirms the entire `backend/` workspace was deleted and root workspaces now exclude it (`architecture-audit/cycle-010-backend-frontend-project-contract/implementation-log.md`, "Deleted legacy surfaces"; `package.json:7-9`), while README still documents `backend/` as an Express backend (`README.md:86`, `README.md:128-130`).
- The current application has application/controller boundaries around tools, construction, process history, toolbar, app shell, rendering selectors/adapters, and a snapshot-oriented ProjectService from earlier waves; docs still describe old tool-created commands, command-sourced persistence, and private operation reconstruction.

## Docs/specs/source-comment findings

### README

- README still lists `backend/` as "Express backend (optional, for future features)" (`README.md:86`) and a Backend technology section with Express/TypeScript (`README.md:128-130`), despite Wave 010's reviewed decision to delete the disconnected backend project API/storage path and the implementation log's confirmation that the entire `backend/` workspace was deleted because no proven non-project backend responsibility remained (`architecture-audit/cycle-010-backend-frontend-project-contract/decision.md`, "Convergence decision"; `architecture-audit/cycle-010-backend-frontend-project-contract/implementation-log.md`, "Deleted legacy surfaces").
- README presents `specs/001-dihedral-learning-mvp/` as "Complete feature specifications" and points to `data-model.md` as architecture documentation and `tasks.md` as implementation task breakdown (`README.md:88-93`, `README.md:158-164`). Those files are MVP-era planning artifacts, not the post-wave architecture authority.
- README contribution workflow instructs contributors to keep spec/data-model/tasks in sync and use `for-planing.md` for planned features (`README.md:190-205`), which conflicts with the current wave/audit process and no-backcompat refactor discipline.
- README testing commands are broadly correct at script-name level (`README.md:100-107`, `README.md:171-182`) but omit known current failures/tooling debt and documentation commands present at root (`package.json:17-19`).

### `docs/architecture/**`

- `docs/architecture/commands.md` says all mutations to `World` go through commands and diagrams `Command` as directly owning `operations` and `CommandStack` internals (`docs/architecture/commands.md:1-19`). It also says tools create commands and call `addAndExecute()` directly (`docs/architecture/commands.md:79-88`), which preserves the pre-Wave-006 UI/tool command-construction model rather than the current application/controller boundary.
- The same page says `ProjectService.reconstructOperation()` switch handles all operation deserialization (`docs/architecture/commands.md:106-122`), conflicting with Wave 004's cleaned persistence contract and the no-private-cast/no-monolithic-switch target.
- `docs/architecture/stores.md` describes `processStore` as owning `ProcessTree` plus `CommandStack` (`docs/architecture/stores.md:16-22`) and includes `Examples: Folding Plane Setup, Quick 3D Line` in `toolStore` (`docs/architecture/stores.md:54-71`). That risks reintroducing store-owned command/runtime mental models and debug/example paths cleaned by later waves.
- `docs/architecture/overview.md`, `domain-model.md`, `realization.md`, and `rendering.md` need a targeted reconciliation pass against current module boundaries: domain root/application shell, rendering selectors/adapters, 3D scene adapters, and authoritative world state. They should be rewritten if they still frame pre-wave god components or direct domain-to-rendering coupling.

### `docs/api/**`

- `docs/api/services.md` still documents `ProjectService` as command-sourcing persistence and automatic schema migration from old file formats (`docs/api/services.md:52-63`). This is exactly the sort of migration-shim/old-format story Wave 004 rejected.
- `docs/api/services.md` documents `Element2DRenderer3D.renderElements(world, options)` and `renderPlaneElements(plane, world)` (`docs/api/services.md:39-50`), which should be checked against the post-Wave-008 adapter/selector boundary.
- `docs/api/operations.md` lists operation classes as the public API and should be reconciled with the current registry/descriptors/use-case boundary rather than encouraging direct operation construction from UI/docs examples.

### `docs/guide/**` and `docs/contributing/testing.md`

- `docs/contributing/testing.md` documents `cd frontend && npm run test`, `npm run test:coverage`, and `npx playwright test` (`docs/contributing/testing.md:7-25`), but `frontend/package.json:7-16` has no `test:coverage` script and the root now exposes `test:e2e` and `docs:build` (`package.json:17-21`).
- The same testing guide says there is a stable known baseline for comparing full-suite results (`docs/contributing/testing.md:102-104`) but does not name the current known non-attributable failures from Wave 012. It should either document those residuals precisely or be rewritten to say the required cadence records failures in wave validation logs.
- Guide pages for persistence, tools, process tree, workspace, rendering/three-view, and projection planes should be rewritten around current user-facing behavior and current architectural boundaries, not around direct tool-to-operation or backend/project API assumptions.

### `specs/001-dihedral-learning-mvp/**`

- The MVP spec tree is large and still referenced by README as authoritative documentation (`README.md:158-164`) and by source comments (examples below). It contains old implementation phases and backcompat/migration notes, such as operation reorganization into `world/`, `processTree/`, `paper/`, `toolbar/`, and `viewState/` folders plus optional Paper/Toolbar operations (`specs/001-dihedral-learning-mvp/for-planing.md:3206-3229`), even though Wave 012 deleted README-only `paper/` and `toolbar/` operation families.
- It still describes adding missing `ProjectService.reconstructOperation()` switch cases and a future schema migration framework (`specs/001-dihedral-learning-mvp/for-planing.md:3237-3251`), conflicting with the cleaned Wave 004 persistence stance.
- It contains an explicit note that Command subclasses must be removed (`specs/001-dihedral-learning-mvp/for-planing.md:3497`), which is historical task narrative rather than current architecture reference.
- Current scout evidence directly supports deleting or rewriting the stale planning/history files that were inspected and cited above (`for-planing.md`, `tasks.md`, `data-model.md`, backend-contract quickstart/research/plan material already touched by Wave 010, and source-comment references to `spec.md`/`ui-spec.md`). It does **not** by itself prove that every file in the spec tree is obsolete; implementation must inspect remaining files such as `spec.md`, `ui-spec.md`, `example-setups.md`, phase summaries, `checklists/**`, and `contracts/**` before deleting them, and must harvest any still-current product/user requirements into current docs first.

### Source comments that cite obsolete specs

These are comment/documentation edits only; no runtime behavior should change.

- `frontend/src/components/workspace/SvgCanvas.vue:172-178` cites the old `ui-spec.md` canvas component and Phase 6 language even though the canvas now consumes presentation read models and application controllers.
- `frontend/src/stores/toolStore.ts:11-12` references `ui-spec.md` and `data-model.md - Phase 67`.
- `frontend/src/stores/settingsStore.ts:13-14` and `frontend/src/stores/settingsStore.ts:24` reference old UI spec recommendations.
- `frontend/src/components/header/ProjectNameDisplay.vue:55` references `spec.md` for project name display.
- `frontend/src/stores/authStore.ts:4-8` references task T402 and old data-model authentication state.
- `frontend/src/commands/CommandStack.ts:8-13` references old data-model command pattern and mentions `execute()` behavior in the header comment; this should be checked against current public API and updated if stale.

## Scope boundaries for implementation

In scope for Wave 013 implementation:

- Edit/delete docs/specs/README/source comments to match current architecture.
- Delete stale MVP planning/spec artifacts that are evidenced as obsolete; inspect remaining spec files before deleting them and harvest still-current product/user requirements into current docs.
- Update testing documentation to current root/frontend commands and known residual failure classifications from Wave 012.
- Add docs/reference scans or architecture documentation gates only if they are documentation checks, not broad validation-tooling repair.

Out of scope:

- Fix `vue-tsc`/Node 24 tooling failure.
- Repair failing full Vitest expectations.
- Repair corrupted broad Playwright/e2e specs.
- Reopen backend/source architecture decisions from Wave 010.
- Reintroduce compatibility docs for deleted backend, migration, placeholder operation, or command-subclass paths.

## Proposed artifact layout

- `architecture-audit/cycle-013-docs-specs-reconciliation/scope-check.md`
- `architecture-audit/cycle-013-docs-specs-reconciliation/proposals/proposal-direct.md`
- `architecture-audit/cycle-013-docs-specs-reconciliation/proposals/proposal-restructure.md`
- Review artifacts later under `architecture-audit/cycle-013-docs-specs-reconciliation/reviews/`
- Validation logs later under `architecture-audit/cycle-013-docs-specs-reconciliation/validation/`
