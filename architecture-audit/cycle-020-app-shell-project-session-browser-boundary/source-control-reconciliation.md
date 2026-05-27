# Source-control reconciliation — Cycle 020 fresh scout/proposals

## Purpose

The review of this planning-only stage correctly noted that path-scoped status still shows source/test-tree changes inside Wave 020-related surfaces. This note reconciles those changes without reverting unrelated work.

## Evidence

- Initial scoped status captured before the scout/proposal worker ran is `.saivage/stages/cycle-020-fresh-scout-proposals/initial-scoped-status.stdout`.
- Reconciliation evidence is `.saivage/stages/cycle-020-fresh-scout-proposals/source-control-reconciliation-evidence.stdout`.
- The Cycle 020 planning task commit range is captured in `.saivage/stages/cycle-020-fresh-scout-proposals/t1-commit-range-diff-names.stdout`.

## Reconciled dirty source/test files

The following non-artifact source/test changes were already present in the initial scoped status before the Cycle 020 scout/proposal worker produced artifacts:

- `frontend/src/application/appShell/AppShellPorts.ts` — modified in initial scoped status (`initial-scoped-status.stdout`, line 38).
- `frontend/tests/e2e/active-plane-shortcuts.spec.ts` — deleted in initial scoped status (`initial-scoped-status.stdout`, line 39).
- `frontend/tests/e2e/selection-mask.spec.ts` — deleted in initial scoped status (`initial-scoped-status.stdout`, line 40).

They remain present in current scoped status, but they are not part of this stage's claimed work and were not reverted because source-control hygiene requires not reverting unrelated dirty work.

## Cycle 020 scout/proposal changes

The commit-range diff for the scout/proposal worker (`t1-commit-range-diff-names.stdout`) contains only Cycle 020 planning/evidence/report artifacts under:

- `architecture-audit/cycle-020-app-shell-project-session-browser-boundary/`
- `.saivage/stages/cycle-020-fresh-scout-proposals/`

It does **not** include `frontend/src/application/appShell/AppShellPorts.ts`, `frontend/tests/e2e/active-plane-shortcuts.spec.ts`, or `frontend/tests/e2e/selection-mask.spec.ts`.

## Stage closure stance

This stage remains planning-only. The dirty source/test files above are residual workspace state outside this stage's work product. They must not be treated as Cycle 020 implementation progress, and later stages must continue using path-scoped status/diff evidence before editing or validating those paths.
