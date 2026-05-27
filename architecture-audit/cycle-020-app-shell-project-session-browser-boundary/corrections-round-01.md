# Cycle 020 Corrections Round 01

Corrected artifact: `proposals/proposal-direct.md`

## Blocker mapping

1. **SelectionUseCases decision was ambiguous.**
   - Correction: `proposal-direct.md` now has an explicit `SelectionUseCases decision` section and file-change bullet stating Wave 020 retains direct delete-command construction as intentional application-layer dependency/residual debt.
   - Guardrail: the proposal now forbids delete-selection ports, command-controller work, command descriptor redesign, and undo/redo redesign in this cycle.

2. **Production composition ownership relative to `App.vue` was under-specified.**
   - Correction: `proposal-direct.md` now has a `Production composition ownership decision` section and expanded `App.vue` bullets.
   - Ownership split: the production composition module alone constructs `GoogleDriveService`, the `ProjectService` adapter binding, browser storage/last-project repository, browser scheduler, keyboard target, and concrete browser callbacks. `App.vue` may only pass plain env-derived config plus UI refs/callbacks and must not construct service/browser adapters. Runtime core must receive explicit dependencies and not recreate hidden defaults.

3. **Focused validation requirements were not explicit enough.**
   - Correction: the validation plan and test-change bullets now require focused coverage proving runtime core no longer owns hidden browser/service defaults and proving the last-project repository/adapter is the single owner of last-project key persistence.
   - Selection validation is explicitly bounded: no new selection/delete command-port tests are required because the direct command construction decision is intentionally retained for Wave 020.

## Scope discipline

No production source, tests, package/tooling, backend, docs/spec implementation files, stale audit-history artifacts, or forbidden secret/config files were edited or read for these corrections. `proposal-restructure.md` and `scope-check.md` were left unchanged because the review blockers only required direct-proposal clarification and the selected scope remains unchanged.

## Recommended next step

Proceed to `cycle-020-review-round-02` for bounded review of the corrected direct proposal. Do not proceed directly to decision or implementation before that review.
