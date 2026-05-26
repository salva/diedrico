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
  - intersection domain tests/source (`frontend/src/domain/calculations/Intersections.ts`, `frontend/tests/unit/calculations/intersections.spec.ts`)
  - PropertiesDialog component tests/source (`frontend/src/components/dialogs/PropertiesDialog.vue`, `frontend/tests/unit/components/propertiesDialog.spec.ts`)
  - guide integration file (`frontend/tests/integration/guide-creation.test.ts`)
  - broad Playwright keyboard/selection-mask specs (`frontend/tests/e2e/keyboard-shortcuts.spec.ts`, `frontend/tests/e2e/selection-mask.spec.ts`)
  - build/type-check tooling (`frontend/package.json`, lockfile/tool metadata if needed)
- Architecture-test or validation-health assertions only if they prevent recurrence of corrupted specs or zero-test files.

**Scope guard**

This wave owns validation contracts, not product redesign. It may create small validation-health checks, but it must not add a large custom test runner, broad allowlist framework, or general lint platform. If a red surface has no current product/architecture owner, delete the stale test and replace it with a smaller current-owner test rather than preserving historical coverage theater.

**Target outcome**

Every mandatory gate has an explicit current owner and current contract:

- Domain correctness tests assert the contract actually used by domain/application code.
- UI component tests assert current emitted events/props or are deleted/replaced if obsolete.
- Integration tests contain executable behavior, not placeholder comments.
- Playwright specs parse and exercise current user-facing flows, not corrupted phase-era fragments.
- Build tooling supports the active Node/TypeScript/Vue stack or the runtime/toolchain is explicitly constrained by scripts/docs.

The result should still be green root/frontend Vitest, build, and e2e, but the primary outcome is a cleaned validation architecture that future waves can trust.

**Explicit DELETE list**

- Delete corrupted Playwright preambles, duplicated reversed blocks, orphaned test bodies, and stale spec-reference comments from `keyboard-shortcuts.spec.ts` and `selection-mask.spec.ts`.
- Delete zero-test/placeholder-only integration cases from `guide-creation.test.ts`; convert only current behavior into real executable tests.
- Delete stale unit expectations for PropertiesDialog if they no longer represent current UI contract.
- Delete obsolete test helpers/fixtures revealed as supporting only corrupted or deleted specs.
- Delete or replace Node/tooling combinations that cannot support the active build gate; do not keep an unused alternative build path.
- Delete any new skip/todo/allowlist introduced merely to make the suite appear green.

**Success criteria**

- A short validation-ownership note in the implementation log classifies each former red surface as domain, UI component, integration, e2e, or tooling ownership and cites the resolved file(s).
- No Vitest file is collected as `0 test` unless intentionally configured as a helper/non-test file outside test discovery.
- Playwright does not fail during parsing and covers current keyboard shortcuts and selection masks, or deleted stale specs are replaced by current smaller specs.
- Root and frontend `npm run test`, `npm run build`, and `npm run test:e2e` pass.
- Any new architecture/static check is narrow and prevents recurrence of the exact class of invalid validation artifact (e.g., corrupted e2e parse/zero-test file), not a broad maintenance framework.

**Validation plan**

1. Static discovery check for zero-test files and Playwright parse errors before full runs.
2. Focused domain/UI/integration Vitest for the repaired/deleted red surfaces.
3. Focused Playwright for repaired/replaced keyboard shortcut and selection-mask flows.
4. Mandatory root/frontend lint, full Vitest, build, e2e.
5. Live preview refresh and HTTP 200 probe.

**Risks**

- This framing can overreach if it attempts to redesign the full validation system. Keep it bounded to known red gates and recurrence checks.
- Deleting stale e2e coverage may feel like reducing coverage, but corrupted tests currently provide no coverage because Playwright aborts before browser execution.
- If the intersection mismatch is a true source defect, the wave must fix the domain contract rather than simply rewriting tests.

**Dependencies**

Depends on Waves 001–013 and should precede any subsequent source refactor wave, because it establishes trustworthy validation ownership for future changes.

## Restructure recommendation

This proposal is preferable if reviewers agree the systemic issue is normalized validation debt rather than individual failing files. It still produces one bounded Wave 014 and the same practical green-gate outcome, but it forces deletion of invalid validation artifacts and prevents future waves from accepting broad red gates as routine.
