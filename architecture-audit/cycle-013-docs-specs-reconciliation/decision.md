# Wave 013 Decision — Docs/specs reconciliation

**Stage:** `cycle-013-decision`  
**Wave:** 013 — Reconcile docs/specs with the cleaned architecture  
**Date:** 2026-05-26  
**Decision:** implement `proposals/proposal-direct.md`  
**Review convergence:** complete after round 02 with **NO BLOCKING ISSUES**  
**Application source changes in this decision stage:** none

## Artifacts cited

This decision is based on the current Wave 013 artifact set:

- `architecture-audit/wave-plan.md` — Wave 013 entry, which scopes reconciliation to `docs/architecture/**`, `docs/api/**`, `docs/guide/**`, `docs/contributing/testing.md`, relevant `specs/001-dihedral-learning-mvp/**`, and source comments that cite obsolete docs/specs.
- `architecture-audit/cycle-013-docs-specs-reconciliation/scope-check.md` — confirms the Wave 013 premise still holds after Wave 012 and identifies stale README, docs, specs, and source-comment claims.
- `architecture-audit/cycle-013-docs-specs-reconciliation/proposals/proposal-direct.md` — targeted rewrite/delete implementation proposal.
- `architecture-audit/cycle-013-docs-specs-reconciliation/proposals/proposal-restructure.md` — broader documentation-boundary alternative.
- `architecture-audit/cycle-013-docs-specs-reconciliation/reviews/round-01-review.md` — initial review, which raised two blocking validation-scope issues.
- `architecture-audit/cycle-013-docs-specs-reconciliation/corrections-round-01-note.md` — records the in-place proposal corrections for the two round-01 blockers.
- `architecture-audit/cycle-013-docs-specs-reconciliation/reviews/round-02-review.md` — accepts the corrected proposal set, declares **NO BLOCKING ISSUES**, and recommends `proposal-direct.md`.

## Convergence record

Review convergence is complete. Round 01 found blocking issues in proposal validation language:

1. `proposal-restructure.md` used blunt phrase-policing that could reject legitimate historical explanation or Wave 013 audit artifacts.
2. Both proposals overstated root/workspace validation coverage instead of describing root commands as cadence-required wrappers around frontend/docs workspace commands.

`corrections-round-01-note.md` records in-place edits that replaced phrase bans with evidence-based active-authority scans, excluded Wave 013 audit artifacts from pass/fail reference scans, and clarified the wrapper/workspace relationship for root and frontend commands.

Round 02 marked both blockers **RESOLVED**, declared **NO BLOCKING ISSUES**, and recommended `proposal-direct.md` because it satisfies the wave objective while staying bounded to docs/specs/source comments and avoiding validation-tooling or runtime-health expansion.

## Selected proposal

Selected for implementation: **`proposals/proposal-direct.md`**.

Rationale:

- It directly addresses the stale authorities found in `scope-check.md`: README backend claims, MVP spec authority references, stale command/persistence documentation, stale testing guidance, and source comments tied to obsolete MVP specs.
- It preserves the no-backcompat/aggressive-deletion priority by deleting or rewriting obsolete docs/specs/comments instead of adding compatibility caveats that keep old mental models alive.
- It is evidence-led about `specs/001-dihedral-learning-mvp/**`: directly evidenced stale files must be deleted, while remaining spec files require implementation-time inspection and harvesting of still-current product/user requirements before deletion or rewrite.
- It keeps Wave 013 inside its approved boundary: documentation, specs, and source comments only. It does not reopen runtime architecture decisions or fix unrelated validation/tooling debt.
- Round 02 specifically identifies it as the recommended winner after all blockers were resolved.

## Rejected/deferred alternative

Deferred alternative: **`proposals/proposal-restructure.md`**.

Reason:

- The restructure proposal is viable after correction and its documentation-boundary framing is directionally sound.
- It is broader than necessary for this wave because the corrected direct proposal now achieves the target outcome with less expansion pressure.
- Selecting the broader restructure option would increase the risk of turning Wave 013 into a documentation-system redesign rather than a bounded reconciliation of stale active authorities.

The implementation may still use the restructure proposal's useful framing that current architecture authority belongs under `docs/architecture/**` and current user guidance under `docs/guide/**`, but it must implement the direct proposal's bounded checklist rather than broadening scope.

## Binding implementation scope

Wave 013 implementation is limited to docs/spec/comment reconciliation. It must not modify runtime behavior, application architecture, public product behavior, validation tooling architecture, or test-health infrastructure except for source comments directly tied to obsolete claims.

### Files likely to change or delete

Implementation should inspect and update/delete the following active documentation and comments, using current source/package evidence rather than stale audit history:

- `README.md`
  - Delete `backend/` project-structure and Express backend technology claims.
  - Stop presenting `specs/001-dihedral-learning-mvp/**` as current architecture/spec authority.
  - Replace contribution guidance that instructs contributors to maintain MVP-era `spec.md`, `data-model.md`, `tasks.md`, or `for-planing.md`.
  - Update script/testing/docs guidance to current root/frontend command truth.
- `docs/architecture/commands.md`
  - Rewrite stale tool-created command / `addAndExecute()` lifecycle claims.
  - Delete stale `ProjectService.reconstructOperation()` switch-persistence claims.
- `docs/architecture/stores.md`
  - Rewrite store responsibilities around UI/runtime state, not store-owned geometry or command architecture.
  - Remove example/debug tool references that are no longer active.
- `docs/architecture/overview.md`, `docs/architecture/domain-model.md`, `docs/architecture/realization.md`, `docs/architecture/rendering.md`
  - Reconcile with current domain/application/rendering selector-adapter boundaries.
- `docs/api/services.md`
  - Replace command-sourcing/schema-migration persistence claims with the current persistence contract.
  - Verify rendering service API descriptions against the current selector/adapter shape.
- `docs/api/operations.md`, `docs/api/domain-model.md`, `docs/api/utilities.md`
  - Remove UI-facing/direct-operation API framing where it conflicts with current command/use-case boundaries.
- `docs/guide/persistence.md`, `docs/guide/tools.md`, `docs/guide/process-tree.md`, `docs/guide/workspace.md`, `docs/guide/three-view.md`, `docs/guide/projection-planes.md`, `docs/guide/3d-reconstruction.md`, `docs/guide/hinge-lines.md`, `docs/guide/getting-started.md`, `docs/guide/what-is-diedrico.md`
  - Keep current user-facing behavior; delete old backend/project API, direct command construction, placeholder-operation, and phase-reference claims.
- `docs/contributing/testing.md`
  - Delete nonexistent `npm run test:coverage` guidance.
  - Document current root/frontend validation commands and known Wave 012 residual failure categories without turning those residuals into Wave 013 repair scope.
  - Include `npm run docs:build` as the documentation build gate.
- Source comments only, no runtime logic changes:
  - `frontend/src/components/workspace/SvgCanvas.vue`
  - `frontend/src/stores/toolStore.ts`
  - `frontend/src/stores/settingsStore.ts`
  - `frontend/src/components/header/ProjectNameDisplay.vue`
  - `frontend/src/stores/authStore.ts`
  - `frontend/src/commands/CommandStack.ts`

### Exact DELETE/rewrite list

Delete rather than caveat any active material that preserves obsolete architecture as current behavior:

- Delete `specs/001-dihedral-learning-mvp/for-planing.md` because it is an old phase/task ledger with stale placeholder operation, migration, command-subclass, and implementation-history claims.
- Delete `specs/001-dihedral-learning-mvp/tasks.md` if implementation confirms it remains a historical task breakdown rather than current user/product documentation.
- Delete `specs/001-dihedral-learning-mvp/data-model.md` after replacing any still-current architecture statements with current `docs/architecture/**` pages.
- Delete or fully rewrite Wave-010-evidenced stale backend/project contract material if implementation confirms it is historical rather than current documentation, including:
  - `specs/001-dihedral-learning-mvp/quickstart.md`
  - `specs/001-dihedral-learning-mvp/research.md`
  - `specs/001-dihedral-learning-mvp/plan.md`
  - `specs/001-dihedral-learning-mvp/contracts/api.yaml`
- Inspect before deleting and either harvest current user/product requirements into current docs or delete with file-specific rationale:
  - `specs/001-dihedral-learning-mvp/spec.md`
  - `specs/001-dihedral-learning-mvp/ui-spec.md`
  - `specs/001-dihedral-learning-mvp/example-setups.md`
  - `specs/001-dihedral-learning-mvp/data-model-optimization.md`
  - `specs/001-dihedral-learning-mvp/phase-*.md`
  - `specs/001-dihedral-learning-mvp/checklists/**`
  - any remaining `specs/001-dihedral-learning-mvp/contracts/**`
- Delete source comments that cite obsolete MVP spec files or deleted backend/placeholder/command-persistence models.
- Delete or fully rewrite any docs page under `docs/architecture/**`, `docs/api/**`, or `docs/guide/**` that is mostly obsolete and cleaner to replace than patch.

The implementation must not preserve old backend, migration, placeholder operation, command-subclass, or direct tool-to-command mental models behind compatibility warnings.

## Binding validation requirements for implementation

Implementation must record full stdout/stderr under `architecture-audit/cycle-013-docs-specs-reconciliation/validation/`.

Minimum required validation/log entries:

1. **Evidence-based docs/spec/source-comment scans**
   - Scan active authorities such as `README.md`, `docs/**`, `frontend/src/**` comments, and implementation-inspected remaining `specs/001-dihedral-learning-mvp/**`.
   - Exclude `architecture-audit/cycle-013-docs-specs-reconciliation/**` from pass/fail scan decisions.
   - Fail only on concrete obsolete active authority, including deleted MVP spec paths still cited as current authority, false `backend/`/Express/backend-project API claims, deleted placeholder operation surfaces, removed command/persistence models such as `ProjectService.reconstructOperation()` switch replay or tool-created command lifecycles, and nonexistent command names such as `npm run test:coverage`.
   - Do not fail merely because historical terms appear in audit artifacts or in rewritten docs that explicitly identify the old model as removed/non-current.
2. **Docs build**
   - `npm run docs:build` at root.
3. **Architecture/static gates**
   - `npm run lint` at root, logged as root wrapper coverage where applicable.
   - `npm run lint --workspace=frontend`, logged as frontend workspace execution.
4. **Focused checks**
   - `npm run test:architecture` at root.
   - `npm run test:architecture --workspace=frontend`.
   - Any docs-reference scan script added within this wave's approved docs/spec/comment scope.
5. **Full Vitest cadence**
   - `npm run test` at root.
   - `npm run test --workspace=frontend`.
   - Known pre-existing Wave 012 failure signatures may be classified as non-attributable only if they match exactly; deviations are Wave 013 regressions until proven otherwise.
6. **Build cadence**
   - `npm run build` at root.
   - `npm run build --workspace=frontend`.
   - The Node 24/`vue-tsc` failure may be classified as pre-existing only if the signature is unchanged.
7. **E2E cadence**
   - `npm run test:e2e` at root.
   - `npm run test:e2e --workspace=frontend`.
   - Broad Playwright parse/corruption failures may be classified as pre-existing only if signatures match Wave 012; otherwise investigate as a Wave 013 regression.
8. **Live preview refresh/reachability**
   - Refresh or verify one app preview bound to `0.0.0.0`.
   - Record an HTTP 200 reachability probe.
   - If implementation truly changes only docs/specs/comments, the log must state that the probe verifies preview continuity rather than new runtime behavior.

Root and workspace command logs must accurately describe current command truth: root commands are cadence-required wrappers around frontend/docs commands where applicable, while `--workspace=frontend` logs are the underlying frontend workspace surface. Do not describe them as independent suites when they delegate to the same workspace scripts.

## Accepted residual risks

- Some `specs/001-dihedral-learning-mvp/**` files may contain still-current product/user requirements. This is accepted only with the mitigation that implementation inspects unevidenced files before deletion and harvests current material into `docs/guide/**` or `docs/architecture/**` first.
- Docs build or markdown links may expose unrelated documentation configuration issues. Fix docs-only link/sidebar problems within Wave 013 scope; classify unrelated tooling failures with exact output.
- Known validation debt from Wave 012 may still appear: full Vitest intersection/PropertiesDialog/zero-test failures, Node 24/`vue-tsc` build failure, and corrupted broad Playwright specs. Wave 013 may document and classify these, but must not repair them in this implementation unless a Wave 013 edit caused a new failure.
- `proposal-restructure.md` remains a viable but broader documentation-boundary alternative. Deferring it is acceptable because the selected direct proposal already removes stale active authorities.

## Explicit exclusions

Wave 013 implementation must not:

- Reopen Wave 010 backend deletion or reintroduce backend/project API documentation as current behavior.
- Modify frontend/backend runtime architecture or product behavior.
- Add compatibility caveats that preserve deleted legacy mental models.
- Repair Node 24/`vue-tsc`, full Vitest health, broad Playwright corruption, or validation-tooling architecture.
- Delete the entire MVP spec tree without file-specific inspection/harvesting for files not already evidenced as stale.
- Treat historical audit artifacts as active documentation failures during scans.

## Next implementation scope

Proceed to `cycle-013-implement-docs-specs-reconciliation` with `proposal-direct.md` as the binding implementation plan, constrained by this decision. The implementation log must enumerate source/docs/spec/comment files changed, specs/docs/comments deleted, validation commands and stable log paths, accepted pre-existing failures, live preview refresh/probe evidence, and any newly observed documentation or validation debt for future waves.
