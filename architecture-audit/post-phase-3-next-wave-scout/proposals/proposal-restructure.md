# Proposal Restructure — Wave 014: Establish Validation Contract Ownership

## Framing question

Instead of treating the residual failures as unrelated repairs, should the next wave be framed one conceptual layer higher: **validation contract ownership**? The current problem is not only that a few tests fail. It is that broad gates have repeatedly been carried as accepted debt, while ownership of domain correctness tests, UI component contracts, integration tests, e2e specs, and build tooling is unclear.

## Proposed wave-plan extension entry

### Wave 014 — Establish validation contract ownership and delete invalid gates

**Scope**

- Validation authority map for current gates:
  - root/frontend `test`, `build`, `test:e2e`, and `lint` scripts (`package.json:13-21`, `frontend/package.json:8-16`)
  - Wave 013 validation failures and logs (`architecture-audit/cycle-013-docs-specs-reconciliation/validation/final-validation-summary.stdout`)
- Contract-owned repair/delete decisions for:
  - intersection domain tests/source (`frontend/src/domain/calculations/Intersections.ts`, `frontend/tests/unit/calculations/intersections.spec.ts`), beginning with a caller inventory and selected result-contract statement
  - PropertiesDialog component tests/source (`frontend/src/components/dialogs/PropertiesDialog.vue`, `frontend/tests/unit/components/propertiesDialog.spec.ts`)
  - guide integration file (`frontend/tests/integration/guide-creation.test.ts`)
  - broad Playwright keyboard/selection-mask specs (`frontend/tests/e2e/keyboard-shortcuts.spec.ts`, `frontend/tests/e2e/selection-mask.spec.ts`)
  - build/type-check tooling (`frontend/package.json`, lockfile/tool metadata if needed)
- Architecture-test or validation-health assertions only if they prevent recurrence of corrupted specs or zero-test files.

**Scope guard**

This wave owns validation contracts, not product redesign. It may create small validation-health checks, but it must not add a large custom test runner, broad allowlist framework, generalized validation platform, parallel build/test toolchain, or sweeping cleanup of unrelated test debt. Recurrence checks are allowed only for the exact invalid artifact classes evidenced by the current red gates: corrupted Playwright parse artifacts, zero-test/placeholder integration files, and unsupported build-tool/runtime combinations. If a red surface has no current product/architecture owner, delete the stale test and replace it with a smaller current-owner test rather than preserving historical coverage theater.

Intersection ownership is deliberately bounded. The implementation must first enumerate every active caller and test assumption for the line-line intersection API, then record a selected contract statement choosing one result model for non-intersection cases: nullable result, infeasible realization, or discriminated result. Only source/tests directly affected by that selected contract may change in Wave 014. If that caller inventory proves the right fix is a deeper geometry/domain-model redesign, Wave 014 implementation must stop and trigger a reviewed plan-edit mini-cycle; the redesign must not be hidden under validation contract ownership.

PropertiesDialog and guide integration work is limited to deciding whether the current files express valid UI/integration contracts. Repair current contract tests or delete/replace stale ones, but do not expand into a broad dialog redesign, guide-domain redesign, selector cleanup, or general UI test rewrite.

**Target outcome**

Every mandatory gate has an explicit current owner and current contract:

- Domain correctness tests assert the intersection contract actually used by domain/application code, after caller inventory and a selected contract statement.
- UI component tests assert current emitted events/props or are deleted/replaced if obsolete.
- Integration tests contain executable behavior, not placeholder comments.
- Playwright specs parse and exercise current user-facing flows, not corrupted phase-era fragments.
- Build tooling supports the active Node/TypeScript/Vue stack or the runtime/toolchain is explicitly constrained by scripts/docs.

The result should still be green root/frontend Vitest, build, and e2e, but the primary outcome is a cleaned validation architecture that future waves can trust. Validation contract ownership remains distinct from central domain correctness, tooling compatibility, and stale/corrupted test artifacts: this wave may align those contracts where they block mandatory gates, but it may not convert them into a broad validation framework or unrelated source refactor.

**Explicit DELETE list**

- Delete corrupted Playwright preambles, duplicated reversed blocks, orphaned test bodies, and stale spec-reference comments from `keyboard-shortcuts.spec.ts` and `selection-mask.spec.ts`.
- Delete zero-test/placeholder-only integration cases from `guide-creation.test.ts`; convert only current behavior into real executable tests.
- Delete stale unit expectations for PropertiesDialog if they no longer represent current UI contract.
- Delete obsolete test helpers/fixtures revealed as supporting only corrupted or deleted specs.
- Delete or replace Node/tooling combinations that cannot support the active build gate; do not keep an unused alternative build path, parallel type-check script, or compatibility shim.
- Delete any new skip/todo/allowlist introduced merely to make the suite appear green.

**Success criteria**

- A short validation-ownership note in the implementation log classifies each former red surface as domain, UI component, integration, e2e, or tooling ownership and cites the resolved file(s).
- The implementation log includes the intersection caller inventory and selected contract statement before reporting any intersection source/test updates.
- No Vitest file is collected as `0 test` unless intentionally configured as a helper/non-test file outside test discovery.
- Playwright does not fail during parsing and covers current keyboard shortcuts and selection masks, or deleted stale specs are replaced by current smaller specs.
- Root and frontend `npm run test`, `npm run build`, and `npm run test:e2e` pass.
- Playwright MCP/live browser verification exercises the repaired/replaced keyboard shortcut and selection-mask flows against the refreshed preview.
- Live preview is refreshed on `0.0.0.0:5173` and returns HTTP 200, with evidence captured under the implementation cycle validation logs.
- Any new architecture/static check is narrow and prevents recurrence of the exact class of invalid validation artifact (e.g., corrupted e2e parse/zero-test file), not a broad maintenance framework.

**Validation plan**

1. Static discovery check for zero-test files and Playwright parse errors before full runs.
2. Verification that the implementation log records the intersection caller inventory and selected contract statement.
3. Focused domain/UI/integration Vitest for the repaired/deleted red surfaces.
4. Focused Playwright for repaired/replaced keyboard shortcut and selection-mask flows.
5. Mandatory root/frontend lint, full Vitest, build, e2e.
6. Refresh the live preview bound to `0.0.0.0:5173`, capture an HTTP 200 reachability probe, and run Playwright MCP/live browser checks for the repaired/replaced keyboard shortcut and selection-mask user flows.

**Risks**

- This framing can overreach if it attempts to redesign the full validation system. Keep it bounded to known red gates and recurrence checks for exact invalid artifact classes only.
- Deleting stale e2e coverage may feel like reducing coverage, but corrupted tests currently provide no coverage because Playwright aborts before browser execution.
- If the intersection mismatch is a true source defect, the wave must fix the selected domain contract consistently rather than simply rewriting tests.
- If the intersection caller inventory reveals a deeper geometry/domain-model redesign is necessary, the wave must stop for a reviewed plan edit before implementation continues.

**Dependencies**

Depends on Waves 001–013 and should precede any subsequent source refactor wave, because it establishes trustworthy validation ownership for future changes.

## Restructure recommendation

This proposal is preferable if reviewers agree the systemic issue is normalized validation debt rather than individual failing files. It still produces one bounded Wave 014 and the same practical green-gate outcome, but it forces deletion of invalid validation artifacts and prevents future waves from accepting broad red gates as routine. It also keeps the repair bounded by requiring caller inventories, explicit contract statements, Playwright MCP/live behavioral proof, and stop/review behavior whenever implementation evidence points beyond one reviewable validation-ownership wave.
