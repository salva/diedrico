# Wave 013 Corrections Round 01 Note

**Stage:** `cycle-013-corrections-round-01`  
**Task:** `t1-correct-wave-013-proposals`  
**Source review:** `architecture-audit/cycle-013-docs-specs-reconciliation/reviews/round-01-review.md`

## Blocker 1 — `proposal-restructure.md` validation scope was too blunt

**Review finding:** The round-01 review blocked `proposal-restructure.md` because its validation plan used a fail-on-phrase list (`Express backend`, `schema migration`, `command subclass`, and related tokens) that could reject legitimate historical explanation, Wave 013 audit artifacts, or rewritten docs that explicitly explain removed behavior.

**Edits made:**

- Replaced the `proposal-restructure.md` validation section with an evidence-based "Deletion/reference scans scoped to active authorities" gate.
- Scoped pass/fail scans to active authorities: `README.md`, `docs/**`, `frontend/src/**`, and implementation-inspected `specs/001-dihedral-learning-mvp/**`, while excluding `architecture-audit/cycle-013-docs-specs-reconciliation/**` from pass/fail decisions.
- Converted blunt phrase bans into concrete obsolete-authority checks:
  - deleted MVP spec paths still cited as current authority;
  - false active `backend/`, Express backend, backend project API, or command-sourced backend persistence claims;
  - deleted placeholder operation surfaces such as `operations/paper`, `operations/toolbar`, `AddExampleSetupOp`, `ExamplesMenu`, `projection-plane-setup`, and `basic-3d-point-setup`;
  - removed command/persistence models such as `ProjectService.reconstructOperation()` switch replay or "Tool creates new Command / addAndExecute" lifecycle;
  - nonexistent setup/testing commands such as `npm run test:coverage`.
- Added explicit allowance for words such as "schema migration" or "command subclass" when they occur in clearly historical explanation, Wave 013 artifacts, or rewritten text that states the model is removed and not current behavior.
- Added a boundary statement that Wave 013 may document residual test/tooling debt but must not fix or redesign validation tooling, Node 24/`vue-tsc`, full Vitest health, or Playwright spec health.

**Edited sections:** `architecture-audit/cycle-013-docs-specs-reconciliation/proposals/proposal-restructure.md` → `## Validation plan`.

## Blocker 2 — Both proposals overstated root/workspace validation coverage

**Review finding:** Both proposals needed tighter wording around current command truth. Root scripts are required by project cadence, but they delegate to frontend/docs commands where applicable; the proposals should not imply root and workspace runs are independent suites.

**Edits made in `proposal-direct.md`:**

- Rewrote the validation introduction to state that root validation commands are cadence-required wrappers around frontend/docs workspace commands where applicable (`package.json:13-21`; `frontend/package.json:7-16`).
- Updated lint, architecture tests, full Vitest, build, and e2e bullets to label root executions as wrapper coverage and frontend executions as the underlying workspace command surface.
- Replaced the broad `rg` phrase list with scoped obsolete-authority checks matching the docs/spec reconciliation objective.
- Added an explicit separation from future validation-tooling/test-health work.

**Edited sections:** `architecture-audit/cycle-013-docs-specs-reconciliation/proposals/proposal-direct.md` → `## Validation plan`.

**Edits made in `proposal-restructure.md`:**

- Rewrote the validation introduction to identify root commands as wrappers and frontend commands as the underlying workspace surface.
- Updated lint, architecture tests, full Vitest, build, and e2e bullets to require both cadence entries while describing their wrapper/workspace relationship honestly.
- Preserved mandatory architecture/static gates, docs build, reference scans, and live preview probe without claiming duplicate independent coverage.

**Edited sections:** `architecture-audit/cycle-013-docs-specs-reconciliation/proposals/proposal-restructure.md` → `## Validation plan`.

## Non-blocking review guidance retained

- Both proposals still keep Wave 010-backed backend deletion evidence.
- Both proposals still state that the entire `specs/001-dihedral-learning-mvp/**` tree is not automatically deletable from current scout evidence alone and requires file-by-file inspection/harvesting for unevidenced files.
- Both proposals retain no-backcompat deletion priority: obsolete docs/spec authority should be deleted or rewritten, not preserved behind compatibility caveats.

## Source modification check

No application source files under `frontend/`, `backend/`, `specs/`, or `docs/` were modified in this corrections task. The only intended artifact edits are:

- `architecture-audit/cycle-013-docs-specs-reconciliation/proposals/proposal-direct.md`
- `architecture-audit/cycle-013-docs-specs-reconciliation/proposals/proposal-restructure.md`
- `architecture-audit/cycle-013-docs-specs-reconciliation/corrections-round-01-note.md`
