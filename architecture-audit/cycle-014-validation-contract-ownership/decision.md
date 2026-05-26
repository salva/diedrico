# Decision — Cycle 014 Validation Contract Ownership

**Stage:** `cycle-014-decision`  
**Wave:** 014 — Establish validation contract ownership and delete invalid gates  
**Decision status:** review convergence complete; implementation may proceed in the next stage.  
**Source-code changes in this stage:** none.

## Inputs cited

This decision is based on the following reviewed artifacts:

- Wave-plan entry: `architecture-audit/wave-plan.md`, “Wave 014 — Establish validation contract ownership and delete invalid gates”.
- Scope check: `architecture-audit/cycle-014-validation-contract-ownership/scope-check.md`.
- Direct proposal: `architecture-audit/cycle-014-validation-contract-ownership/proposals/proposal-direct.md`.
- Restructure proposal: `architecture-audit/cycle-014-validation-contract-ownership/proposals/proposal-restructure.md`.
- Corrections note: `architecture-audit/cycle-014-validation-contract-ownership/corrections-round-01-note.md`.
- Review round 01: `architecture-audit/cycle-014-validation-contract-ownership/reviews/round-01-review.md`.
- Review round 02: `architecture-audit/cycle-014-validation-contract-ownership/reviews/round-02-review.md`.

## Review convergence

Review convergence is complete after round 02 with **NO BLOCKING ISSUES**.

Round 01 recommended `proposal-restructure.md` but blocked decision until two ambiguities were corrected: guide integration / `(0 test)` scope could drift into generalized Vitest discovery work, and build-tooling language could permit docs-only or engines-only policy edits even if mandatory builds still failed in the active validation environment. `corrections-round-01-note.md` records in-place edits to both proposals resolving those issues. Round 02 rechecked both blockers and found them resolved, explicitly recommending `proposal-restructure.md` for implementation.

## Selected proposal

Select **`proposal-restructure.md`** for implementation.

Rationale: Wave 014 is not merely a red/green test repair. The wave-plan entry defines the target as validation contract ownership: each failing or invalid gate must be assigned to its real owner, repaired if it expresses a current contract, or deleted/replaced if it is stale, placeholder-only, corrupted, or unsupported. `proposal-restructure.md` best implements that framing by requiring an ownership map before repairs, preserving aggressive deletion, and defining stop/review behavior if any surface proves to require deeper architectural redesign.

## Rejected / deferred alternative

Reject/defer **`proposal-direct.md`** as the primary implementation plan.

The direct proposal is acceptable as a bounded repair fallback and was corrected to remove round-01 blockers, but it is weaker than the restructure proposal because it frames the work first as fixing named red surfaces. The selected wave objective is sharper: establish trustworthy validation authority so future waves can rely on the gates. Any direct repair actions may still be used only where they are subordinate to the ownership decisions required by `proposal-restructure.md`.

## Binding implementation scope

The next implementation stage must implement the selected restructure proposal and remain limited to Wave 014 surfaces:

- `architecture-audit/cycle-014-validation-contract-ownership/implementation-log.md`.
- `frontend/tests/unit/calculations/intersections.spec.ts`.
- `frontend/tests/unit/components/propertiesDialog.spec.ts`.
- `frontend/tests/integration/guide-creation.test.ts`.
- `frontend/tests/e2e/keyboard-shortcuts.spec.ts`.
- `frontend/tests/e2e/selection-mask.spec.ts`.
- `frontend/package.json` plus lockfile/package metadata only if required for the single supported build contract.

Conditional source changes are allowed only if focused validation proves the current source contract is wrong rather than the validation artifact stale:

- `frontend/src/domain/calculations/Intersections.ts`.
- `frontend/src/domain/world/Point.ts`.
- `frontend/src/domain/world/Guide.ts`.
- `frontend/src/components/dialogs/PropertiesDialog.vue`.

Any source change beyond those conditional files, or any broad test/tooling change outside the named surfaces, requires a reviewed delta proposal or plan-edit mini-cycle before proceeding.

## Binding DELETE / repair constraints

Implementation must delete or repair invalid artifacts according to ownership, not preserve compatibility theater:

- Delete stale nullable/vector assumptions from line-line intersection tests if the selected contract remains infeasible `Point2DRealization2D` results.
- Delete stale PropertiesDialog unit expectations that do not represent current `close`/`save` event behavior.
- Delete the comment-only BrokenHalfHingeLine2D guide test or replace it with executable current behavior.
- Delete corrupted Playwright preambles, reversed blocks, orphaned test bodies, and stale MVP/phase reference comments in keyboard-shortcut and selection-mask specs.
- Delete helper/fixture code used only by corrupted/deleted specs if static search proves it has no current owner.
- Delete unsupported or unused build-tool alternatives; do not add compatibility shims, parallel build paths, alternate type-check scripts, skip/todo entries, or allowlists to make gates appear green.

## Required implementation-log preconditions

Before source/test/package edits, `implementation-log.md` must record:

1. A validation-ownership map classifying each former red surface as domain, UI component, integration, e2e, or tooling ownership.
2. The audited active caller inventory for `intersectLineLine()` from `scope-check.md`.
3. The selected line-line result contract for non-intersection cases.

The expected current contract, based on `scope-check.md`, is that `intersectLineLine()` returns `Point2DRealization2D` and represents parallel/coincident/no finite intersection with `feasible=false`, not `null`, because the active production callers in `Point2DLineLineIntersection.realize2D()` and `SiblingGuide2D.realize2D()` immediately read `.feasible`. If implementation chooses any other result model, it must update the active callers consistently and remain within the named intersection files, or stop for reviewed plan edit if that becomes a deeper geometry redesign.

## Exact residual-risk and stop rules accepted

Accepted residual risks:

- The infeasible-realization intersection contract may not be the ideal long-term domain model, but it is acceptable for Wave 014 if caller inventory remains limited and the contract is explicitly selected.
- Build-tooling repair may require dependency/runtime alignment, but success cannot be claimed until mandatory builds pass in the actual validation environment.
- Repairing Playwright parse corruption may reveal selector drift; fixes must remain limited to current keyboard shortcut and selection-mask flows.

Implementation must stop and request a reviewed delta/plan-edit mini-cycle if any of the following occur:

- The active `intersectLineLine()` caller inventory expands into a broad geometry/model redesign.
- The selected intersection result contract requires changing construction, rendering, persistence, tool-controller, or other unrelated layers.
- Guide `(0 test)` evidence points beyond `frontend/tests/integration/guide-creation.test.ts`, its placeholder BHHL case, and that file's exact local collection/discovery contract into generalized Vitest discovery/config cleanup.
- Build repair requires maintaining two build/type-check paths or suppressing `vue-tsc` rather than making the single active build gate executable.
- Docs-only, engines-only, or runtime-policy edits would leave `npm run build` and `npm run build --workspace=frontend` failing in the actual validation environment.
- E2E repair implies a broad selection/tool UI redesign rather than deletion/replacement of corrupted keyboard and selection-mask validation artifacts.
- PropertiesDialog or guide work expands into broad dialog redesign, guide-domain redesign, selector cleanup, or general UI test rewrite.

## Required validation for implementation and later validation stage

The implementation stage must prepare for the mandatory Wave 014 validation cadence and capture full stdout/stderr under `architecture-audit/cycle-014-validation-contract-ownership/validation/` when validation commands are run. Validation/preview remains a separate later stage, but implementation must not declare the wave repaired without evidence that these gates can pass:

1. Static discovery check for zero-test files and Playwright parse errors.
2. Focused Vitest for intersection, PropertiesDialog, and guide integration surfaces.
3. Focused Playwright for repaired/replaced keyboard shortcut and selection-mask specs.
4. Root and frontend lint: `npm run lint`, `npm run lint --workspace=frontend`.
5. Root and frontend full Vitest: `npm run test`, `npm run test --workspace=frontend`.
6. Root and frontend build: `npm run build`, `npm run build --workspace=frontend`.
7. Root and frontend e2e: `npm run test:e2e`, `npm run test:e2e --workspace=frontend`.
8. Refresh the live preview bound to `0.0.0.0:5173`, capture an HTTP 200 reachability probe, and run Playwright MCP/live browser verification for the repaired/replaced keyboard shortcut and selection-mask flows.

Build-tooling closure specifically requires actual success of both mandatory build commands in the active validation environment. Policy-only edits are insufficient if either build command remains red.

## Anti-overreach constraints

Wave 014 must not become a broad validation-framework or product-redesign wave. The implementation may add narrow recurrence checks only for invalid artifact classes evidenced by this wave: corrupted Playwright parse artifacts, zero-test/placeholder integration files, and unsupported build-tool/runtime combinations. It must not add generalized allowlists, custom runners, parallel build/test/type-check toolchains, broad selector/rendering cleanup, unrelated test sweeps, dialog redesign, guide-domain redesign, or hidden geometry redesign.

## Next stage recommendation

Proceed to **`cycle-014-implement-validation-contract-ownership`**.

That implementation stage must follow `proposal-restructure.md` exactly as constrained by this decision. The full validation and live-preview refresh/probe remain a separate later `cycle-014-validation-and-preview-refresh` stage, although implementation should run focused checks as needed to verify its own changes.
