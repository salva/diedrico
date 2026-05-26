# Wave 013 Review Round 01 — Docs/specs reconciliation

**Stage:** `cycle-013-review-round-01`  
**Wave:** 013 — Reconcile docs/specs with the cleaned architecture  
**Reviewer:** Reviewer  
**Decision:** **BLOCKING ISSUES**  
**Recommended direction after correction:** `proposal-direct.md` is currently the better base; `proposal-restructure.md` is also viable after the validation-scope blocker below is corrected.

## Artifacts reviewed

- `architecture-audit/cycle-013-docs-specs-reconciliation/scope-check.md`
- `architecture-audit/cycle-013-docs-specs-reconciliation/proposals/proposal-direct.md`
- `architecture-audit/cycle-013-docs-specs-reconciliation/proposals/proposal-restructure.md`
- `architecture-audit/wave-plan.md` (Wave 013 entry)
- `README.md`
- `package.json`
- `frontend/package.json`
- `docs/architecture/commands.md`
- `docs/api/services.md`
- `docs/contributing/testing.md`
- `architecture-audit/cycle-010-backend-frontend-project-contract/decision.md`
- `architecture-audit/cycle-010-backend-frontend-project-contract/implementation-log.md`
- `architecture-audit/cycle-012-placeholder-debug-cleanup/implementation-log.md`

## Scope-check confirmation

The scope check is well-grounded. It correctly distinguishes Wave 013 from future validation-tooling/test-health work and correctly anchors the stale-backend claims in Wave 010 rather than restating them as fresh design preferences. Evidence checked:

- Root workspaces are frontend-only and root scripts delegate to frontend/docs only (`package.json`).
- Frontend script truth is `test`, `test:architecture`, `test:e2e`, `build`, and `lint` delegating to architecture tests (`frontend/package.json`).
- README still falsely documents `backend/` and MVP spec authority (`README.md`).
- `docs/architecture/commands.md`, `docs/api/services.md`, and `docs/contributing/testing.md` still preserve stale command/persistence/testing mental models.
- Wave 010 decision/implementation log explicitly selected backend project API deletion and confirms the entire backend workspace was deleted.
- Wave 012 implementation log clearly classifies current full-test/build/e2e failures as pre-existing residual debt, not Wave 013 scope.

## Proposal scoring

Scores: 1 = poor, 5 = strong.

### `proposal-direct.md`

1. **Advances the wave target outcome** — **5/5**  
   Strong. It directly rewrites/deletes the exact stale authorities identified in the scout: README backend claims, MVP spec authority references, stale command/persistence docs, and source comments tied to obsolete specs.

2. **Improves architecture/code quality** — **4/5**  
   Good for a docs wave. It removes obsolete mental models and stale references without pretending to solve unrelated runtime architecture debt.

3. **Respects no-backcompat / aggressive deletion** — **4/5**  
   Good. It prefers deletion/rewrite over compatibility caveats and correctly grounds backend deletion in Wave 010 evidence. It is also appropriately careful not to claim the entire spec tree is already proven deletable.

4. **Avoids overfeaturism** — **4/5**  
   Mostly yes. It stays on docs/specs/comments and does not expand into backend resurrection or validation tooling repair. The optional note about docs/reference scans is acceptable so long as implementation does not broaden into test-health work.

5. **Introduces new risks / hidden regressions** — **3/5**  
   Main risk is still overbroad deletion of spec-tree files whose obsolescence was not yet individually inspected. The proposal mitigates this better than the restructure variant by explicitly requiring file-by-file inspection for unevidenced remaining files.

6. **Validation sufficiency** — **3/5**  
   Mixed. The proposal is honest about mandatory cadence and current residual failures, but it overstates root/workspace duplication by asking for both root and `--workspace=frontend` invocations even where root already delegates to frontend. That is not fatal, but the proposal should tighten the wording so command truth is precise rather than duplicative.

**Interim verdict:** viable after small correction to validation wording.

### `proposal-restructure.md`

1. **Advances the wave target outcome** — **5/5**  
   Strong. It correctly identifies the deeper problem as competing documentation authorities, not isolated stale lines.

2. **Improves architecture/code quality** — **4/5**  
   Good. A single current-docs boundary is cleaner than preserving an active docs tree plus MVP historical authority.

3. **Respects no-backcompat / aggressive deletion** — **4/5**  
   Good. It clearly rejects preserving stale backend/migration/placeholder-operation stories as active guidance.

4. **Avoids overfeaturism** — **3/5**  
   Borderline. The architectural framing is good, but the validation section drifts into turning Wave 013 into a docs-reference policing wave with a large list of banned phrases/tokens that are not all equivalent to stale active behavior.

5. **Introduces new risks / hidden regressions** — **3/5**  
   Main risk is false-positive validation and overbroad deletion pressure. Some strings proposed for blanket failure (`schema migration`, `command subclass`) could appear legitimately inside historical Wave 013 audit artifacts or in rewritten docs that explicitly explain removed history. The proposal hints at exceptions but not precisely enough.

6. **Validation sufficiency** — **2/5**  
   Weakest area. The proposed fail-on-phrase scans are too blunt and risk conflating active docs cleanup with broad content policing. Validation should verify removed authorities/paths are gone from active docs/comments, not require fragile global bans on every legacy phrase regardless of context.

**Interim verdict:** architecturally sound but blocked until the validation scope is narrowed and made concrete.

## Required scrutiny findings

### Backend-deletion evidence

Both proposals are adequately grounded here. The stale backend references in README are directly contradicted by Wave 010’s reviewed decision and implementation log, which selected deletion of the backend project API/storage path and then deleted the entire `backend/` workspace. This is not speculative.

### Spec-tree deletion scope

Both proposals correctly note that the current scout evidence does **not** automatically justify deleting every file under `specs/001-dihedral-learning-mvp/`. This is important and should remain explicit in the next round. The direct proposal states this more safely and concretely than the restructure proposal.

### No-backcompat deletion priority

Both proposals generally satisfy this. They prefer deleting obsolete spec authority and compatibility caveats rather than preserving old paths with warnings. That matches project priorities.

### Validation-command truth

Current command truth checked against `package.json` and `frontend/package.json`:

- Root scripts: `lint`, `test`, `build`, `docs:build`, `test:architecture`, `test:e2e`
- Frontend scripts: `test`, `test:architecture`, `test:e2e`, `build`, `lint`
- `docs/contributing/testing.md` is currently stale because it documents nonexistent `npm run test:coverage`.

However, both proposals should be more precise that root commands already delegate to frontend, so “root and workspace” should be recorded because the project cadence requires it, but not described as distinct independent coverage where they are wrappers around the same workspace command.

### Separation from future validation-tooling/test-health debt

The scope check is correct: Wave 013 may document current known residual debt, but it must not try to fix `vue-tsc`/Node 24, full Vitest failures, or corrupted broad Playwright specs. `proposal-direct.md` keeps this boundary clearer than `proposal-restructure.md`.

## Blocking issues requiring in-place correction

1. **`proposal-restructure.md` validation scope is too blunt and risks false-positive gate failures.**  
   The fail-on-phrase list (`Express backend`, `schema migration`, `command subclass`, etc.) is not scoped tightly enough to active docs/comments and can reject legitimate explanatory/history text or Wave 013 artifacts themselves. Rewrite validation around concrete active-authority checks: deleted spec paths, deleted backend/runtime claims, deleted placeholder-operation surface references, nonexistent command names, and docs build/reference integrity. Do not turn Wave 013 into a generic phrase-policing framework.

2. **Both proposals should tighten validation wording to reflect actual command truth and avoid overstating distinct root/workspace coverage.**  
   Keep the mandatory cadence, but make clear that root commands currently delegate to frontend. Validation should record both where the program requires them, while honestly describing them as wrapper and underlying workspace executions rather than implying two independent suites.

## Recommendation

- **Preferred base after correction:** `proposal-direct.md`
  - It is more disciplined about not overclaiming spec-tree deletion evidence.
  - It better distinguishes docs reconciliation from future validation/tooling cleanup.
- **`proposal-restructure.md` remains viable** if its validation section is narrowed to concrete active-surface checks instead of global legacy-phrase bans.

## Acceptance status for this round

**BLOCKING ISSUES**

Required next-round correction: update proposal validation sections per the blocker list above, especially the restructure proposal’s scan/gate language.

## Source modification check

Reviewed git status evidence and inspected only docs/audit/source-comment references. No frontend/backend/specs/docs application source changes were made by this review stage itself.
