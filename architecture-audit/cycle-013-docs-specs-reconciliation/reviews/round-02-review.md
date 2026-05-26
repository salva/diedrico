# Wave 013 Review Round 02 — Docs/specs reconciliation

**Stage:** `cycle-013-review-round-02`  
**Wave:** 013 — Reconcile docs/specs with the cleaned architecture  
**Reviewer:** Reviewer  
**Decision:** **NO BLOCKING ISSUES**  
**Recommended proposal for decision:** `proposal-direct.md`  
**Accepted residual risk:** `proposal-restructure.md` remains a viable alternative, but its broader documentation-boundary framing is not necessary to proceed because the corrected direct proposal now satisfies the wave objective and validation requirements.

## Artifacts reviewed

- `architecture-audit/cycle-013-docs-specs-reconciliation/reviews/round-01-review.md`
- `architecture-audit/cycle-013-docs-specs-reconciliation/corrections-round-01-note.md`
- `architecture-audit/cycle-013-docs-specs-reconciliation/proposals/proposal-direct.md`
- `architecture-audit/cycle-013-docs-specs-reconciliation/proposals/proposal-restructure.md`
- `package.json`
- `frontend/package.json`

## Round-01 blocker disposition

### Blocker 1 — `proposal-restructure.md` validation scope was too blunt

**Round-01 finding:** the validation plan used broad fail-on-phrase policing that could reject legitimate historical explanation or Wave 013 artifacts.

**Disposition:** **RESOLVED**

**Evidence:**
- `corrections-round-01-note.md` explicitly states that the restructure proposal replaced phrase bans with an evidence-based active-authority scan and excluded `architecture-audit/cycle-013-docs-specs-reconciliation/**` from pass/fail decisions.
- `proposal-restructure.md` now scopes validation to `README.md`, `docs/**`, `frontend/src/**`, and implementation-inspected `specs/001-dihedral-learning-mvp/**`, and fails only on concrete obsolete-authority conditions: deleted spec-path authority, false backend/runtime claims, deleted placeholder-operation surfaces, removed command/persistence models, and nonexistent setup/testing commands.
- The proposal now explicitly allows historical terms such as `schema migration` or `command subclass` when they appear in historical explanation or in text that clearly says the model is removed and not current behavior.

This substantively fixes the blocker. The validation language is now evidence-based docs/spec reconciliation rather than blunt phrase policing.

### Blocker 2 — both proposals overstated root/workspace validation coverage

**Round-01 finding:** both proposals needed to describe root validation commands honestly as project-cadence-required wrappers around frontend/docs workspace commands, not as separate independent suites.

**Disposition:** **RESOLVED**

**Evidence:**
- `corrections-round-01-note.md` maps edits in both proposals to this exact issue.
- `proposal-direct.md` now says root commands are cadence-required wrappers around frontend/docs workspace commands where applicable and repeatedly labels root runs as wrapper coverage and frontend runs as the underlying workspace command surface.
- `proposal-restructure.md` now uses the same wrapper/workspace distinction for lint, architecture tests, full Vitest, build, and e2e.
- This corrected wording matches the script surface previously cited in round 01: root scripts in `package.json` and frontend scripts in `frontend/package.json`.

This substantively fixes the blocker and accurately reflects root-vs-frontend command truth.

## Six-criteria scoring update

Round-01 scoring remains broadly valid. Only blocker disposition changes are updated here.

### `proposal-direct.md`

1. **Advances the wave target outcome** — **5/5**  
2. **Improves architecture/code quality** — **4/5**  
3. **Respects no-backcompat / aggressive deletion** — **4/5**  
4. **Avoids overfeaturism** — **5/5**  
5. **Introduces new risks / hidden regressions** — **4/5**  
6. **Validation sufficiency** — **4/5**

**Updated assessment:** the validation section is now precise enough to proceed. This remains the preferred proposal because it keeps the docs/specs reconciliation bounded, evidence-led, and clearly separated from future validation-tooling or runtime-health waves.

### `proposal-restructure.md`

1. **Advances the wave target outcome** — **5/5**  
2. **Improves architecture/code quality** — **4/5**  
3. **Respects no-backcompat / aggressive deletion** — **4/5**  
4. **Avoids overfeaturism** — **4/5**  
5. **Introduces new risks / hidden regressions** — **4/5**  
6. **Validation sufficiency** — **4/5**

**Updated assessment:** the corrected validation section resolves the prior blocker. This is now viable, but it is still the broader option and therefore not the best fit when `proposal-direct.md` can achieve the wave goal with less expansion pressure.

## Remaining non-blocking observations

- Both proposals correctly retain the important evidence boundary that the entire `specs/001-dihedral-learning-mvp/**` tree is **not** automatically deletable from current scout evidence alone; remaining files still require implementation-time inspection or harvesting before deletion.
- Both proposals remain honest that Wave 013 may document pre-existing validation/tooling debt but must not expand into fixing Node 24/`vue-tsc`, full Vitest suite health, or broad Playwright spec health.
- The preferred proposal should still be implemented carefully enough that reference scans do not treat historical audit artifacts as active-authority failures.

## Recommendation for decision

**Recommended winner:** `proposal-direct.md`

Why:
- It now satisfies all blocking review concerns.
- It is better bounded to the stated wave objective.
- It keeps stronger discipline around file-by-file evidence before broader spec-tree deletion.
- It more clearly avoids turning this docs/specs wave into a general validation-framework redesign.

## Acceptance status for this round

**NO BLOCKING ISSUES**

The corrected proposal set can proceed to decision. `proposal-direct.md` is recommended for implementation. Residual risks are acceptable and already disclosed in the proposal text.

## Source modification check

This review inspected proposal/audit artifacts only. No application source changes are requested by this review. Any current working-tree edits under application paths should remain outside this review task.
