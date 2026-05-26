# Decision — Cycle 014 Build Contract Plan Edit

**Stage:** `cycle-014-build-contract-plan-edit-decision`  
**Decision status:** review convergence complete.  
**Review result:** `reviews/round-02-review.md` records **NO BLOCKING ISSUES** after corrections round 01.  
**Source/test/package/tooling implementation edits in this decision stage:** none.

## Artifacts cited

- `architecture-audit/cycle-014-build-contract-plan-edit/scope-check.md`
- `architecture-audit/cycle-014-build-contract-plan-edit/proposals/proposal-direct.md`
- `architecture-audit/cycle-014-build-contract-plan-edit/proposals/proposal-restructure.md`
- `architecture-audit/cycle-014-build-contract-plan-edit/corrections-round-01-note.md`
- `architecture-audit/cycle-014-build-contract-plan-edit/reviews/round-01-review.md`
- `architecture-audit/cycle-014-build-contract-plan-edit/reviews/round-02-review.md`
- `architecture-audit/cycle-014-validation-contract-ownership/implementation-log.md`
- `.saivage/stages/cycle-014-implement-validation-contract-ownership/summary.json`
- `architecture-audit/wave-plan.md`

## Context and stop-rule basis

Wave 014 completed and preserved its reviewed validation-ownership repairs in commits `1b1f37cbbb8fb8da96645c40160fce0384a5b316` and `806e1ac754899d0ad6d0322afd6b4a35a77d0f12`. The Wave 014 implementation log records the required validation ownership map, the active `intersectLineLine()` caller inventory, and the selected infeasible-realization result contract. Focused validation passed for the repaired owned surfaces: focused Vitest passed 64 tests across intersections, PropertiesDialog, and guide integration, and Playwright listed four repaired e2e tests without parse errors.

The remaining blocker is not the original invalid `vue-tsc`/Node 24 string-patch abort. The Wave 014 build-tooling repair made the active frontend build gate execute real TypeScript checking. `frontend-build.after5.stdout` then exposed a broad build-contract backlog across app shell, command descriptor/factory/operation contracts, process-tree action contracts, projection-plane/world mutation and realization contexts, UI rendering/store DTOs, services, stores, and domain strictness. `scope-check.md` classifies those failures as outside the approved Wave 014 implementation file set.

The Wave 014 stop rule therefore applies: final validation/preview closure cannot honestly proceed while the build gate is red, but repairing the broad TypeScript backlog inside Wave 014 would be an unreviewed source/type-contract refactor. The scoped Wave 014 repairs must be preserved; they revealed existing type-contract debt and should not be reverted.

## Review convergence

Round 01 found the proposed plan edit directionally correct but blocking on four bounds: Wave 015 needed to be tied to the exact current build errors and direct contract owners, include a mandatory expansion stop rule, explicitly protect Wave 014 repaired surfaces, and defer non-build discoveries to future waves.

`corrections-round-01-note.md` records in-place corrections to both proposals. Round 02 rechecked those corrections and found all blockers resolved. The reviewer recommends `proposal-restructure.md` because it treats the backlog as cross-layer type-contract ownership rather than isolated TypeScript silencing while preserving the exact-build-log/direct-owner boundary.

## Selected alternative

Select corrected `proposal-restructure.md` and extend `architecture-audit/wave-plan.md` with exactly one new Wave 015 entry: **Converge frontend TypeScript contracts around owned boundaries**.

This selected path is required before Wave 014 final validation/preview closure because Wave 014 acceptance requires root/frontend build success and live preview refresh, and the active frontend build currently fails on out-of-scope TypeScript contract errors. Wave 015 is inserted solely to restore the build contract needed for Wave 014 validation; after Wave 015 completes, the project must return to `cycle-014-validation-and-preview-refresh` rather than proceed to an unrelated later wave.

## Rejected/deferred alternative

Reject `proposal-direct.md` as the primary decision artifact. It is incorporated only where it overlaps the selected proposal: exact-build-log scope, deletion-first policy, validation requirements, protection of Wave 014 repairs, and return-to-Wave-014 closure. It is otherwise deferred because its framing as build/type repair is less explicit about architectural boundary ownership than `proposal-restructure.md`.

No direct implementation is authorized by this decision. The next stage must be `cycle-015-fresh-scout-proposals` so Wave 015 receives its normal scope-check, proposals, review convergence, decision, implementation, validation, and preview-refresh flow.

## Wave 014 repair protection

Wave 015 must not revert or reopen the completed Wave 014 scoped repairs unless a specific current `frontend-build.after5.stdout` error is causally traced to that surface and the Wave 015 implementation log documents the cited error. Protected surfaces are:

- `frontend/tests/unit/calculations/intersections.spec.ts`
- `frontend/src/components/dialogs/PropertiesDialog.vue`
- `frontend/tests/unit/components/propertiesDialog.spec.ts`
- `frontend/tests/integration/guide-creation.test.ts`
- `frontend/tests/e2e/keyboard-shortcuts.spec.ts`
- `frontend/tests/e2e/selection-mask.spec.ts`
- the `frontend/package.json` `vue-tsc` build-gate upgrade

## Accepted residual risks

- The build backlog is broad, so implementation discipline is mandatory; casts, suppressions, compatibility shims, adjacency cleanup, or parallel build paths must be rejected.
- Projection-plane/world and process-tree categories may still reveal deeper redesign pressure. If honest closure of current build errors requires conceptual redesign beyond Wave 015, the expansion stop rule requires a reviewed delta/mini-cycle.
- Non-build architectural discoveries during Wave 015 are future-wave candidates only and do not expand Wave 015 scope.

## Next stage recommendation

Proceed to `cycle-015-fresh-scout-proposals`. Do not implement Wave 015 source/test/package/tooling changes in this decision stage.
