# Wave 013 Proposal Direct — Targeted docs/spec/comment reconciliation

## Summary

Perform a bounded reconciliation of stale documentation, MVP specs, README material, and source comments so they describe the cleaned architecture that exists after Waves 001–012. This proposal keeps the current documentation topology (`README.md`, `docs/architecture`, `docs/api`, `docs/guide`, `docs/contributing`) but rewrites inaccurate pages in place and deletes obsolete MVP planning/spec artifacts after removing active references.

## Files to change

### README and current docs

- `README.md`
  - Remove `backend/` from project structure and backend technology claims (`README.md:86`, `README.md:128-130`) because Wave 010's decision selected backend project API deletion and its implementation log confirms the entire backend workspace was deleted when no current non-project backend responsibility remained (`architecture-audit/cycle-010-backend-frontend-project-contract/decision.md`, "Convergence decision"; `architecture-audit/cycle-010-backend-frontend-project-contract/implementation-log.md`, "Deleted legacy surfaces").
  - Replace `specs/001-dihedral-learning-mvp/` as authoritative architecture/spec source (`README.md:88-93`, `README.md:158-164`).
  - Replace contribution workflow that instructs updates to MVP `spec.md`, `data-model.md`, `tasks.md`, and `for-planing.md` (`README.md:190-205`) with current docs/audit/wave discipline.
  - Update scripts/testing notes to current root/frontend command truth (`package.json:13-21`, `frontend/package.json:7-16`) and known Wave 012 residual validation debt.
- `docs/architecture/commands.md`
  - Rewrite around current command/use-case boundary; remove the old "Tool creates Command / addAndExecute" lifecycle (`docs/architecture/commands.md:79-88`).
  - Remove stale `ProjectService.reconstructOperation()` switch persistence claim (`docs/architecture/commands.md:106-122`).
- `docs/architecture/stores.md`
  - Rewrite store responsibilities so stores are UI/runtime state and not a parallel geometry/command architecture; correct `processStore` ownership claims (`docs/architecture/stores.md:16-22`).
  - Remove example/debug tool references such as folding setup/quick 3D line if no longer active (`docs/architecture/stores.md:54-71`).
- `docs/architecture/overview.md`
- `docs/architecture/domain-model.md`
- `docs/architecture/realization.md`
- `docs/architecture/rendering.md`
  - Reconcile terminology with current boundaries: pure domain root, application shell runtime, use-case/controller command construction, process-tree/dependency ownership, selector/adapters for 2D/3D rendering, frontend-only workspace.
- `docs/api/services.md`
  - Replace command-sourcing/schema-migration ProjectService API claims (`docs/api/services.md:52-63`) with current persistence contract.
  - Verify and update rendering service APIs against post-Wave-007/008 selector-adapter shape (`docs/api/services.md:39-50`).
- `docs/api/operations.md`
  - Reframe operation classes as internal command/use-case implementation details, not public UI-facing APIs.
- `docs/api/domain-model.md`
- `docs/api/utilities.md`
  - Update any stale type/module boundaries discovered during implementation.
- `docs/guide/persistence.md`
- `docs/guide/tools.md`
- `docs/guide/process-tree.md`
- `docs/guide/workspace.md`
- `docs/guide/three-view.md`
- `docs/guide/projection-planes.md`
- `docs/guide/3d-reconstruction.md`
- `docs/guide/hinge-lines.md`
- `docs/guide/getting-started.md`
- `docs/guide/what-is-diedrico.md`
  - Keep user-facing usage guidance only; remove old backend/project API, direct command construction, placeholder operations, and old architecture-phase references.
- `docs/contributing/testing.md`
  - Remove nonexistent `npm run test:coverage` from frontend commands (`docs/contributing/testing.md:7-14`, `frontend/package.json:7-16`).
  - Prefer root commands plus frontend-specific commands where useful (`package.json:13-21`).
  - Document current known residual failures from Wave 012 as pre-existing debt, clearly separate from new-regression expectations (`architecture-audit/cycle-012-placeholder-debug-cleanup/implementation-log.md`, "Residual risks / accepted debt").
  - Mention `npm run docs:build` as the documentation build gate (`package.json:17-19`).

### Source comments only

- `frontend/src/components/workspace/SvgCanvas.vue`
  - Remove old `ui-spec.md`/Phase 6 reference and keep a current description of canvas as presentation/controller shell (`frontend/src/components/workspace/SvgCanvas.vue:172-178`).
- `frontend/src/stores/toolStore.ts`
  - Remove MVP spec/Phase 67 references (`frontend/src/stores/toolStore.ts:11-12`).
- `frontend/src/stores/settingsStore.ts`
  - Remove MVP spec references and old "Following ui-spec" phrasing (`frontend/src/stores/settingsStore.ts:13-14`, `frontend/src/stores/settingsStore.ts:24`).
- `frontend/src/components/header/ProjectNameDisplay.vue`
  - Remove obsolete spec citation (`frontend/src/components/header/ProjectNameDisplay.vue:55`).
- `frontend/src/stores/authStore.ts`
  - Remove task/spec citation while preserving correct behavior comments (`frontend/src/stores/authStore.ts:4-8`).
- `frontend/src/commands/CommandStack.ts`
  - Update header comment if it still describes old `execute()` behavior or spec authority (`frontend/src/commands/CommandStack.ts:8-13`).

### Specs

- `specs/001-dihedral-learning-mvp/**`
  - Remove active references from README/docs/comments first.
  - Delete stale MVP planning/history/spec artifacts that are evidenced as no longer authoritative, especially inspected files preserving old implementation phases, migration stories, backend/API assumptions, command-subclass tasks, and placeholder operation families.
  - Do **not** treat the entire spec tree as automatically deletable from the current scout evidence alone. For any remaining spec file not directly evidenced in `scope-check.md`, inspect it during implementation, harvest still-current product/user requirements into `docs/guide/` or `docs/architecture/`, and then either delete it with file-specific rationale or leave it only if it is rewritten as current documentation authority.

## Files/docs/specs to DELETE

Aggressively delete rather than caveat:

- `specs/001-dihedral-learning-mvp/for-planing.md` — old phase/task ledger with placeholder operations, migrations, command-subclass history, and stale implementation strategy (`specs/001-dihedral-learning-mvp/for-planing.md:3206-3251`, `specs/001-dihedral-learning-mvp/for-planing.md:3497`).
- `specs/001-dihedral-learning-mvp/tasks.md` — historical implementation task breakdown no longer used by the current wave process.
- `specs/001-dihedral-learning-mvp/data-model.md` — replace with current `docs/architecture/**` architecture pages instead of preserving a 70+ phase data-model history (`README.md:162`).
- `specs/001-dihedral-learning-mvp/quickstart.md`, `research.md`, `plan.md`, and `contracts/api.yaml` sections already shown stale by Wave 010 backend-project cleanup, if implementation confirms their remaining content is historical rather than current docs.
- `specs/001-dihedral-learning-mvp/phase-*.md`, `spec.md`, `ui-spec.md`, `example-setups.md`, `data-model-optimization.md`, `checklists/**`, and any remaining `contracts/**` files only after file-by-file implementation inspection proves they are stale or after their still-current product requirements are harvested into current docs.
- Any docs page under `docs/architecture/**`, `docs/api/**`, or `docs/guide/**` that is mostly obsolete and cheaper/cleaner to replace than patch.
- Source comments that cite deleted MVP spec files.

If a file is partially current but mostly stale, prefer full rewrite in place over compatibility notes.

## Expected behavior change

Runtime behavior: none. This is documentation/spec/comment reconciliation only.

Developer/user behavior:

- Contributors stop being directed to stale MVP specs, backend paths, command subclass stories, placeholder operation families, or migration shims.
- Documentation describes the current frontend-only, clean-layered architecture and validation command reality.
- Source comments no longer treat MVP phase documents as current architecture authority.

## Validation plan

Because this wave changes docs/specs/comments only, implementation validation should still record the mandatory cadence and classify known unrelated failures precisely.

Required stable logs under `architecture-audit/cycle-013-docs-specs-reconciliation/validation/`:

1. **Reference scans**
   - `rg -n "specs/001-dihedral-learning-mvp|for-planing|backend/|Express backend|operations/(paper|toolbar)|ProjectService\.reconstructOperation|schema migration|command subclass|Tool creates new Command|test:coverage" README.md docs frontend/src specs || true`
   - A stricter pass should fail if deleted spec paths or deleted placeholder operation families remain in active docs/source comments.
2. **Docs build**
   - `npm run docs:build` at root, because root declares VitePress docs scripts (`package.json:17-19`).
3. **Architecture/static gates**
   - `npm run lint` at root and `npm run lint --workspace=frontend`, capturing stdout/stderr.
4. **Focused checks**
   - `npm run test:architecture` at root and `npm run test:architecture --workspace=frontend`, especially if any docs reference gate is added.
5. **Full Vitest cadence**
   - `npm run test` at root and `npm run test --workspace=frontend`; expected to fail only with the pre-existing Wave 012 signatures unless fixed by another reviewed wave.
6. **Build cadence**
   - `npm run build` at root and `npm run build --workspace=frontend`; expected to fail only with the pre-existing Node 24/`vue-tsc` signature unless fixed separately.
7. **E2E cadence**
   - `npm run test:e2e` at root and `npm run test:e2e --workspace=frontend`; because source comments/README/docs are not user-facing app behavior, broad e2e failures may be classified as the pre-existing corrupted spec syntax noted in Wave 012.
8. **Live preview refresh**
   - If implementation touches only docs and comments, preview refresh may be justified as optional. If README/guide changes affect user-facing instructions only, still probe the existing app or refresh the preview per project discipline and record HTTP 200 reachability.

## Risks and mitigations

- **Risk:** deleting spec files without enough evidence may remove still-useful product requirements.  
  **Mitigation:** delete only files directly evidenced as stale or inspected during implementation; preserve only current product-level requirements in current docs; do not keep stale phase/task architecture documents.
- **Risk:** broad docs rewrite may accidentally document future desired architecture rather than current code.  
  **Mitigation:** cite current source/package evidence and keep claims tied to post-Wave-012 source truth.
- **Risk:** docs build may expose unrelated VitePress/sidebar issues.  
  **Mitigation:** fix docs-only build issues within scope; classify unrelated tooling problems with exact output.
- **Risk:** known full validation failures obscure docs-only regression signal.  
  **Mitigation:** compare against Wave 012 failure signatures and report deviations.
