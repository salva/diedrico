# Cycle 018 Review Round 01 (post-017) — Domain realization context boundary

## Evidence checked

- `architecture-audit/cycle-018-domain-realization-context-boundary/scope-check.md`
- `architecture-audit/cycle-018-domain-realization-context-boundary/proposals/proposal-direct.md`
- `architecture-audit/cycle-018-domain-realization-context-boundary/proposals/proposal-restructure.md`
- `architecture-audit/cycle-018-domain-realization-context-boundary/critique/round-01-critique.md`
- `.saivage/stages/cycle-018-fresh-scout-proposals-post-017/reports/t2-critic-proposal-review.json`
- `architecture-audit/cycle-017-three-presentation-read-port-realization-boundary/implementation-log-post-028.md`
- `architecture-audit/wave-plan.md` Wave 018 entry via `validation/reviewer-wave018-entry.stdout`
- Current source/status evidence via `validation/reviewer-status-wave018.stdout`, `validation/reviewer-diff-wave018.stdout`, and `validation/reviewer-realization-scan.stdout`

## Critic-loop and review-loop prerequisites

Critic-loop evidence exists and is sufficient for this review round. The critique artifact is present at `critique/round-01-critique.md` and explicitly marked `synthesized_by: manager` with `reason: critic_dispatch_unavailable`. The corresponding critic TaskReport exists at `.saivage/stages/cycle-018-fresh-scout-proposals-post-017/reports/t2-critic-proposal-review.json` and records the required two failed critic dispatch attempts before synthesis. This clears the prior missing-evidence blocker pattern; no repeat blocker is raised on critic-loop completeness.

## Source-control and protected-scope check

Path-scoped status confirms this remains a review-only stage. No diff is present in the scoped proposal/source paths checked by `validation/reviewer-diff-wave018.stdout`. Unrelated dirty production files remain in the worktree and are explicitly out of scope: `frontend/src/domain/calculations/Intersections.ts` and `frontend/src/domain/processTree/ActionGroup.ts` (`validation/reviewer-status-wave018.stdout`). They must not be incorporated or reverted by Wave 018 work unless separately assigned.

The worktree also contains many pre-existing cycle-018 audit/review/validation artifacts outside this task. Those are documentation/evidence noise, not authorization to implement source changes in this review stage. Protected surfaces remain out of scope: persistence schema/replay, backend/docs/specs/package tooling, Drive/auth, command history/producer redesign, broad application-kernel/generic facade work, UI feature work, scene-host/OrbitControls behavior changes, and broad unreviewed domain rewrite.

## Current-source premise check

The scope-check correctly updates the stale wave-plan premise. Current source already has typed base 3D and plane contracts (`Element3D.ts`, `Plane.ts`) rather than the older `any` signatures described in the original wave-plan entry, but the remaining seam is still central: `ProjectionElementRealizationContext` is a broad god-context with collection traversal, and both canvas and three adapters still bind concrete `World` into realization contexts and pass those into `realize2D`/`realize3D` calls.

The source scan confirms the key narrowing targets called out in the stage brief:

- `ProjectionPlaneContext.ts` still defines `ProjectionElementRealizationContext` with `getAllProjectionPlanes()` and `getAllHingeLines()` and then has `ProjectionPlaneRealizationContext`, `Element3DRealizationContext`, and `PlaneEquationRealizationContext` extend that same full interface.
- `HingeLine.realize3D(...)` still uses broad collection traversal for structural diagnostics.
- `BrokenHalfHingeLine2D` also still uses `getAllHingeLines()`, so collection traversal is not only a hinge-3D concern and must be inventoried carefully before deletion.
- `CanvasWorldReadPort.ts` and `ThreePlanarElementReadPort.ts` / `ThreeGuideReadPort.ts` / `ThreeHingeReadPort.ts` still form the relevant adapter boundary and must preserve the Wave 017/028 presentation split.
- `Projected3DCanvasReadPort.ts` still localizes projected-3D raw traversal and is therefore a protected Wave 028 seam, not a target for broad selector redesign.

## Proposal scoring

### Proposal Direct

1. **Advances Wave 018 target outcome:** **Pass.** It is aligned with the now-current code and aims at the actual remaining seam: narrowing realization-context capability and removing duplicate binder bodies without reopening selector architecture.
2. **Improves architecture and code quality:** **Pass.** It attacks the god-context directly, preserves separate mutation context ownership, and calls for deletion of broad aliases, duplicate binders, and weak test scaffolding.
3. **Respects no-backcompat / aggressive deletion:** **Pass.** It explicitly deletes broad default collection methods if avoidable, alias-only context types, duplicate binders, diagnostic overreach, and compatibility shims rather than preserving both paths.
4. **Avoids overfeaturism:** **Pass.** It stays within the wave boundary and treats a shared binder as optional and tiny rather than introducing a broad app-kernel facade.
5. **Avoids new risks / hidden regressions:** **Pass with caution.** It correctly protects Wave 017/028 boundaries and the 3D overlay pointer-boundary validation requirement, but implementation must account for all collection-traversal users before removing methods from the default context.
6. **Validation sufficiency:** **Pass.** It includes caller/static scans, focused tests, lint, full Vitest, build, Playwright/e2e, preview refresh, and explicit overlay pointer-boundary coverage.

### Proposal Restructure

1. **Advances Wave 018 target outcome:** **Conditional pass.** It could solve the seam, but only by moving conceptually higher than the wave currently needs.
2. **Improves architecture and code quality:** **Mixed.** It may produce a cleaner explicit query boundary, but it risks reopening cache/mutation/dispatch ownership and touching too many domain surfaces at once.
3. **Respects no-backcompat / aggressive deletion:** **Pass.** It would delete the old broad path if chosen.
4. **Avoids overfeaturism:** **Fail for this round.** Relative to current evidence, it is broader than necessary and would likely turn Wave 018 into a larger redesign instead of a bounded context-boundary cleanup.
5. **Avoids new risks / hidden regressions:** **Fail for this round.** It raises churn risk across recursive realization and cache semantics and could accidentally breach the protected mutation/dependency boundary.
6. **Validation sufficiency:** **Pass.** The proposed validation is strong, but the breadth of the change would make those validations more expensive and riskier than the direct path.

## Decision recommendation

**Recommend advancing to `cycle-018-decision-post-017` with Proposal Direct preferred.**

Proposal Direct is the better fit because it addresses the actual current seam without reopening higher-level architecture. Proposal Restructure should remain documented only as a fallback if implementation evidence shows that capability narrowing cannot be done without recreating a `World`-shaped facade or collapsing mutation/cache concerns into the read-only realization contract.

## Required decision-stage considerations / implementation guardrails

- Preserve Wave 017’s rule that collection traversal ownership stays in concern adapters/read ports, not in a generic three helper.
- Preserve Wave 028’s rule that public canvas read-port/raw realization seams stay deleted and projected-3D raw traversal remains localized.
- Treat `ProjectionElementRealizationContext` capability narrowing as the primary work; do not broaden into a query service unless a reviewed delta is raised.
- Explicitly inventory all current collection-traversal consumers before deleting `getAllProjectionPlanes()` / `getAllHingeLines()` from the default context, including `HingeLine.realize3D` and `BrokenHalfHingeLine2D`.
- Keep `ProjectionPlaneMutationContext` separate; do not smuggle dependency registration, dirty marking, or ID generation into read-only realization interfaces.
- Preserve 3D overlay pointer-boundary behavior and validate it through Playwright/e2e and live smoke as required by the wave and validation runbook.

## Blocking issues

None for proposal approval.
