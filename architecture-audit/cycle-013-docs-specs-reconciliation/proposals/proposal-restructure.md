# Wave 013 Proposal Restructure — Establish a current documentation boundary and delete MVP history

## Summary

Replace the stale MVP-spec-centered documentation model with a smaller current-docs boundary: product/user documentation lives under `docs/guide/`, architecture/reference documentation lives under `docs/architecture/` and `docs/api/`, and historical implementation planning under `specs/001-dihedral-learning-mvp/` is deleted after harvesting any still-current user/product statements. This is a higher-level fix than patching individual stale lines because the main architectural problem is not isolated inaccuracies; it is that README/source comments still treat an obsolete MVP planning tree as authority.

## Restructured documentation boundary

1. **`README.md` becomes a concise entry point**
   - Current purpose, frontend-only setup, current scripts, links to current docs.
   - No backend workspace claims (`README.md:86`, `README.md:128-130`).
   - No instruction to keep MVP `spec.md`, `data-model.md`, or `tasks.md` in sync (`README.md:158-164`, `README.md:190-205`).
2. **`docs/architecture/**` becomes the sole architecture authority**
   - Pages are organized around current cleaned boundaries: domain model, application/use-case/controllers, command/undo and persistence contract, rendering selectors/adapters, stores/runtime state, app shell/Drive integration, validation gates.
   - Old command lifecycle and persistence switch descriptions are deleted (`docs/architecture/commands.md:79-122`).
3. **`docs/api/**` becomes current internal API/reference only**
   - Operation classes are documented only as internal command/use-case units, not direct UI/public APIs.
   - Service pages describe current selector/adapter/persistence contracts, not schema migrations or command-sourced replay (`docs/api/services.md:52-63`).
4. **`docs/guide/**` becomes user-facing behavior documentation**
   - Tool, workspace, process-tree, projection-plane, persistence, and 3D pages should avoid old source-module claims unless they are needed for users.
5. **`docs/contributing/testing.md` becomes validation runbook truth**
   - Current root/frontend commands from `package.json:13-21` and `frontend/package.json:7-16`.
   - Known Wave 012 residual failure classifications clearly separated from implementation success criteria.
6. **`specs/001-dihedral-learning-mvp/**` is deleted**
   - It is no longer authoritative, contains old phase ledgers, migration plans, placeholder operation folders, backend/API assumptions, and command-subclass history (`specs/001-dihedral-learning-mvp/for-planing.md:3206-3251`, `specs/001-dihedral-learning-mvp/for-planing.md:3497`).
   - Any still-current product requirements are copied into current docs before deletion.
7. **Source comments cite current concepts, not historical specs**
   - Remove old `specs/001-dihedral-learning-mvp` references from comments in canvas/stores/header/auth/command stack (`frontend/src/components/workspace/SvgCanvas.vue:172-178`, `frontend/src/stores/toolStore.ts:11-12`, `frontend/src/stores/settingsStore.ts:13-14`, `frontend/src/components/header/ProjectNameDisplay.vue:55`, `frontend/src/stores/authStore.ts:4-8`, `frontend/src/commands/CommandStack.ts:8-13`).

## Files to change

### Rewrite/current-doc authority

- `README.md`
- `docs/index.md`
- `docs/architecture/overview.md`
- `docs/architecture/domain-model.md`
- `docs/architecture/commands.md`
- `docs/architecture/realization.md`
- `docs/architecture/rendering.md`
- `docs/architecture/stores.md`
- `docs/api/domain-model.md`
- `docs/api/operations.md`
- `docs/api/services.md`
- `docs/api/utilities.md`
- `docs/guide/getting-started.md`
- `docs/guide/what-is-diedrico.md`
- `docs/guide/workspace.md`
- `docs/guide/tools.md`
- `docs/guide/process-tree.md`
- `docs/guide/persistence.md`
- `docs/guide/projection-planes.md`
- `docs/guide/hinge-lines.md`
- `docs/guide/3d-reconstruction.md`
- `docs/guide/three-view.md`
- `docs/contributing/testing.md`

### Source comments only

- `frontend/src/components/workspace/SvgCanvas.vue`
- `frontend/src/stores/toolStore.ts`
- `frontend/src/stores/settingsStore.ts`
- `frontend/src/components/header/ProjectNameDisplay.vue`
- `frontend/src/stores/authStore.ts`
- `frontend/src/commands/CommandStack.ts`

### Optional docs configuration

- `docs/.vitepress/config.*` if sidebar/nav points at deleted spec-era pages or needs a current documentation map. This is docs configuration only, not application runtime.

## Files/docs/specs to DELETE

Delete the obsolete historical specification tree after harvesting any still-current product statements:

- `specs/001-dihedral-learning-mvp/spec.md`
- `specs/001-dihedral-learning-mvp/ui-spec.md`
- `specs/001-dihedral-learning-mvp/data-model.md`
- `specs/001-dihedral-learning-mvp/tasks.md`
- `specs/001-dihedral-learning-mvp/for-planing.md`
- `specs/001-dihedral-learning-mvp/plan.md`
- `specs/001-dihedral-learning-mvp/research.md`
- `specs/001-dihedral-learning-mvp/quickstart.md`
- `specs/001-dihedral-learning-mvp/example-setups.md`
- `specs/001-dihedral-learning-mvp/data-model-optimization.md`
- `specs/001-dihedral-learning-mvp/phase-78-completion-summary.md`
- `specs/001-dihedral-learning-mvp/phase-83-generic-projection-plane-plan.md`
- `specs/001-dihedral-learning-mvp/phase-84-geometry-free-hinge-lines.md`
- `specs/001-dihedral-learning-mvp/phase-85-subprocess-stack-architecture.md`
- `specs/001-dihedral-learning-mvp/phase-96-implementation-summary.md`
- `specs/001-dihedral-learning-mvp/checklists/**`
- `specs/001-dihedral-learning-mvp/contracts/**`
- The empty `specs/001-dihedral-learning-mvp/` directory itself if no replacement content remains.

Also delete or fully rewrite any docs page that primarily restates the deleted spec tree rather than current code.

## Expected behavior change

Runtime behavior: none.

Documentation behavior:

- There is one current documentation boundary instead of an active docs tree plus historical MVP spec authority.
- New contributors are no longer directed to stale tasks/phases/backcompat migration notes.
- The docs intentionally encode no-backcompat priorities by deleting historical shims, placeholder operation families, backend project API descriptions, and migration plans from active documentation.

## Why restructure is preferable

The direct approach can make individual lines accurate, but it leaves two competing authorities: current docs and the old MVP specs. Current evidence shows README and source comments still cite MVP documents as architecture truth (`README.md:134`, `README.md:158-164`; `frontend/src/stores/toolStore.ts:11-12`; `frontend/src/commands/CommandStack.ts:8`). As long as that tree remains, stale phase-ledger content such as optional `paper/`/`toolbar/` operations (`specs/001-dihedral-learning-mvp/for-planing.md:3206-3229`) and `ProjectService.reconstructOperation()` switch expansion (`specs/001-dihedral-learning-mvp/for-planing.md:3237-3251`) can keep resurfacing in comments and docs. A documentation-boundary rewrite deletes the obsolete authority instead of curating it forever.

## Validation plan

Record all stdout/stderr under `architecture-audit/cycle-013-docs-specs-reconciliation/validation/`.

1. **Deletion/reference scans**
   - Fail if active files reference `specs/001-dihedral-learning-mvp` after deletion, except the Wave 013 audit artifacts themselves.
   - Fail if active docs/source comments mention deleted placeholder surfaces: `operations/paper`, `operations/toolbar`, `AddExampleSetupOp`, `ExamplesMenu`, `projection-plane-setup`, `basic-3d-point-setup`.
   - Fail if active docs preserve stale phrases: `Express backend`, `ProjectService.reconstructOperation`, `schema migration`, `Tool creates new Command`, `command subclass`, `test:coverage` unless explicitly classified as deleted history in Wave 013 artifacts.
2. **Docs build**
   - `npm run docs:build` from root (`package.json:17-19`). This is the focused functional gate for documentation restructure.
3. **Architecture/static gates**
   - `npm run lint` at root.
   - `npm run lint --workspace=frontend`.
   - If a docs-reference architecture test is added, include `npm run test:architecture` at root and workspace.
4. **Focused Vitest**
   - `npm run test:architecture` root/workspace, plus any docs/reference scan script if added.
5. **Full Vitest**
   - `npm run test` root/workspace. Classify only the known Wave 012 full-suite signatures as pre-existing: intersection expectation failures, PropertiesDialog close/save emission failures, and zero-test guide-creation file.
6. **Build**
   - `npm run build` root/workspace. Classify the Node 24/`vue-tsc` `supportedTSExtensions` failure as pre-existing unless it changes.
7. **E2E**
   - `npm run test:e2e` root/workspace. Classify the known corrupted `keyboard-shortcuts.spec.ts` and `selection-mask.spec.ts` parse errors as pre-existing unless signatures change.
8. **Live preview**
   - Because docs/comment changes do not alter app runtime, a live preview refresh may be justified as non-essential; however, project discipline prefers keeping the preview fresh, so run or verify one `0.0.0.0` preview and record a `curl` HTTP 200 probe.

## Risks and mitigations

- **Risk:** deleting the spec tree removes requirements that are not yet represented elsewhere.  
  **Mitigation:** harvest still-current product/user requirements into `docs/guide/what-is-diedrico.md`, `docs/guide/workspace.md`, and `docs/guide/tools.md`; do not preserve implementation history.
- **Risk:** docs rewrite could overstate architecture cleanliness or hide residual debt.  
  **Mitigation:** include a short "known validation debt" section in testing docs based on Wave 012 logs, clearly marked as pre-existing and not a design target.
- **Risk:** large deletion causes broken VitePress links.  
  **Mitigation:** run `npm run docs:build` and scan Markdown links; update VitePress config/sidebar if necessary.
- **Risk:** reviewers may prefer a smaller implementation.  
  **Mitigation:** this proposal can be split into two implementation commits within the same wave (delete references/rewrite docs, then delete specs) but should not leave both authorities active at wave completion.
