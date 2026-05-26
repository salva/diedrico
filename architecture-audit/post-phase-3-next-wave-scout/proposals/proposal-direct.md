# Proposal Direct — Wave 014: Restore Mandatory Validation Gates

## Proposed wave-plan extension entry

### Wave 014 — Restore validation gates and resolve residual correctness debt

**Scope**

- Full Vitest red surfaces:
  - `frontend/src/domain/calculations/Intersections.ts`
  - `frontend/tests/unit/calculations/intersections.spec.ts`
  - all current callers/tests affected by the chosen intersection result contract, after a required caller inventory and selected contract statement
  - `frontend/src/components/dialogs/PropertiesDialog.vue`
  - `frontend/tests/unit/components/propertiesDialog.spec.ts`
  - `frontend/tests/integration/guide-creation.test.ts`
- Build tooling/runtime gate:
  - `frontend/package.json`
  - root `package.json` only if validation scripts/tooling must change
  - lockfile/tooling metadata if an approved implementation requires dependency updates
- Broad Playwright parse/corruption gate:
  - `frontend/tests/e2e/keyboard-shortcuts.spec.ts`
  - `frontend/tests/e2e/selection-mask.spec.ts`
  - any directly duplicated/corrupted e2e fragments that only preserve stale phase-era behavior
- Validation logs under the new implementation cycle only.

**Scope guard**

This wave is not a broad UI/domain refactor. It may change application source only where needed to make an existing red validation surface reflect the current intended contract. It must not introduce a broad validation-framework redesign, generalized allowlist system, custom runner, parallel build/test toolchain, or sweeping test-suite cleanup. New validation-health checks are allowed only when they narrowly prevent recurrence of the exact invalid artifact classes already evidenced in this scout: corrupted Playwright parse artifacts, zero-test/placeholder integration files, or unsupported build-tool/runtime combinations.

Intersection work is bounded as contract alignment, not geometric redesign. Implementation must begin by auditing all active callers and call-site assumptions for line-line intersections, then writing a selected contract statement before changing behavior. The selected statement must choose one contract for parallel/coincident/non-intersecting cases — nullable result, infeasible realization, or discriminated result — and update only the affected source/tests required to make that single contract executable. If the caller inventory shows that a deeper geometric/domain-model redesign is required, implementation must stop and trigger a reviewed plan-edit mini-cycle instead of absorbing that redesign into Wave 014.

PropertiesDialog and guide-test work is contract triage only: repair or delete stale expectations against the current UI/integration contract, but do not redesign the dialog, guide domain, or broader selector architecture.

**Baseline/current grounding**

Wave 013 closed the original plan after Wave 013 and recommended a reviewed planning extension for residual validation debt rather than an unplanned implementation (`architecture-audit/cycle-013-docs-specs-reconciliation/implementation-log.md`, “Phase 3 / next-wave recommendation”). Current Wave 013 validation shows:

- Full Vitest red: intersections, PropertiesDialog, guide-creation zero-test collection (`architecture-audit/cycle-013-docs-specs-reconciliation/validation/final-validation-summary.stdout:1-22`).
- Build red: `vue-tsc` fails under Node 24 (`architecture-audit/cycle-013-docs-specs-reconciliation/validation/final-validation-summary.stdout:46-57`; `frontend/package.json:8`; `package.json:13`).
- Broad e2e red: Playwright parse errors in `keyboard-shortcuts.spec.ts` and `selection-mask.spec.ts` (`architecture-audit/cycle-013-docs-specs-reconciliation/validation/final-validation-summary.stdout:59-67`).

Current source shows at least one correctness contract mismatch: `intersectLineLine()` returns `Point2DRealization2D` and uses infeasible realization for parallel/coincident lines (`frontend/src/domain/calculations/Intersections.ts:80-123`), while tests expect `null` for those cases (`frontend/tests/unit/calculations/intersections.spec.ts:78-147`).

**Target outcome**

Root/frontend validation gates are meaningful and green: full Vitest, build, and broad Playwright execute rather than failing on known residual debt. Central geometry correctness has a single documented/executable result contract selected after caller inventory. Invalid or corrupted tests are deleted/replaced rather than carried as accepted debt. Validation contract ownership remains distinct from central domain correctness, tooling compatibility, and stale/corrupted test artifacts: the wave may align those contracts where current red gates require it, but it may not merge them into a larger framework or source redesign.

**Explicit DELETE list**

- Delete corrupted/reversed/orphaned Playwright fragments in `frontend/tests/e2e/keyboard-shortcuts.spec.ts` and `frontend/tests/e2e/selection-mask.spec.ts`; do not preserve stale phase-history comments or duplicated test bodies.
- Delete or rewrite placeholder-only guide assertions in `frontend/tests/integration/guide-creation.test.ts`, especially non-executable documentation blocks that do not assert behavior.
- Delete stale PropertiesDialog expectations if they encode a removed/incorrect UI contract; otherwise fix the component and keep the expectations.
- Delete any compatibility helper, skipped test, todo marker, or allowlist introduced only to hide the current red validation debt.
- Delete stale package/tooling paths only if the build solution replaces them; do not keep parallel build scripts or alternate type-check/build paths.

**Success criteria**

- The implementation log includes an intersection caller inventory and selected contract statement before any intersection behavior changes are described.
- `npm run test` from the root passes.
- `npm run test --workspace=frontend` passes.
- `npm run build` from the root passes.
- `npm run build --workspace=frontend` passes.
- `npm run test:e2e` from the root parses, launches, and passes or is narrowed through reviewed deletion to a current user-flow suite that passes.
- `npm run test:e2e --workspace=frontend` has the same passing classification.
- Focused Vitest covers the intersection result contract and any PropertiesDialog/guide changes.
- Focused Playwright covers current keyboard shortcut and selection-mask behavior after corrupted spec cleanup.
- Playwright MCP/live browser verification exercises the repaired or replaced keyboard shortcut and selection-mask flows against the refreshed preview.
- Live preview is refreshed on `0.0.0.0:5173` and probe returns HTTP 200, with the command/probe evidence captured in validation logs and summarized in the implementation log.
- The implementation log classifies any remaining failures as either fixed, deleted as invalid, or escalated through a new reviewed plan edit; no known-red broad gate is accepted by default.

**Validation plan**

Run and capture stable logs for:

1. Static scans confirming deleted corrupted Playwright fragments and placeholder-only guide blocks are gone.
2. Intersection caller inventory and selected contract statement verification in the implementation log.
3. Focused Vitest:
   - `tests/unit/calculations/intersections.spec.ts`
   - `tests/unit/components/propertiesDialog.spec.ts`
   - `tests/integration/guide-creation.test.ts`
4. Focused Playwright for keyboard shortcuts and selection masks after spec cleanup.
5. Mandatory cadence: root/frontend lint, root/frontend full Vitest, root/frontend build, root/frontend e2e.
6. Refresh the live preview bound to `0.0.0.0:5173`, capture an HTTP reachability probe returning 200, then run Playwright MCP/live browser checks for the repaired/replaced keyboard shortcut and selection-mask user flows.

**Risks**

- Fixing intersections may reveal callers depended on infeasible realizations rather than `null`; the proposal must choose one contract after caller inventory and update all affected callers, not branch both ways.
- If caller inventory reveals that the mismatch is a symptom of a larger geometric/domain-model flaw, Wave 014 must stop for a reviewed plan edit instead of continuing as an implementation wave.
- Upgrading `vue-tsc` or pinning runtime may affect TypeScript diagnostics; failures should be fixed or the toolchain choice adjusted, not suppressed.
- Playwright specs may be so stale that deletion plus replacement is cleaner than repair; this aligns with no-backcompat priorities.

**Dependencies**

Depends on Waves 001–013 because it uses the cleaned architecture and docs as current authority. It must precede any new broad source refactor because future waves need green validation gates.

## Why this direct framing

This is the smallest bounded wave that materially improves correctness and architecture confidence after plan exhaustion. It does not attempt to solve every residual type smell; it restores the system’s ability to validate future clean-architecture changes while preserving no-backcompat/aggressive deletion priorities for invalid gates and stale compatibility surfaces.
