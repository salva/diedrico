# Cycle 029 Review — Round 01

## Review basis

Reviewed:

- `architecture-audit/cycle-029-3d-presentation-dto-read-ports-and-realization-context-ownership/scope-check.md`
- `architecture-audit/cycle-029-3d-presentation-dto-read-ports-and-realization-context-ownership/proposals/proposal-direct.md`
- `architecture-audit/cycle-029-3d-presentation-dto-read-ports-and-realization-context-ownership/proposals/proposal-restructure.md`
- `architecture-audit/cycle-029-3d-presentation-dto-read-ports-and-realization-context-ownership/critique/round-01-critique.md`
- `architecture-audit/wave-plan.md` (Wave 029 entry)
- `architecture-audit/cycle-029-wave-plan-extension/plan-extension-rationale.md`
- `architecture-audit/cycle-028-canvas-projection-dto-selectors/implementation-log.md`
- Current source seams in:
  - `frontend/src/application/threePresentation/ThreeWorldReadPort.ts`
  - `frontend/src/application/canvasPresentation/Projected3DCanvasReadPort.ts`
  - `frontend/src/application/appShell/RuntimeSession.ts`
  - `frontend/src/components/panels/ThreeView.vue`
  - `frontend/tests/e2e/current-ui-contract.spec.ts`

Path-scoped git checks confirm no active source implementation in the Cycle 029 3D presentation files under review. Unrelated dirty files remain limited to protected paths including `frontend/src/domain/calculations/Intersections.ts` and `frontend/src/domain/processTree/ActionGroup.ts`.

## Source-control / protocol checks

- **Pass:** This is still a design/review-only stage; no reviewed production source/test implementation was found in the active Wave 029 target files.
- **Pass:** Protected unrelated dirty files were identified and left out of scope.
- **Pass:** Critic evidence exists and is valid under failure tolerance: `round-01-critique.md` is explicitly marked `synthesized_by: manager` with `reason: critic_dispatch_unavailable` after two failed attempts.
- **Pass:** Wave 029 remains consistent with the current wave-plan entry and Wave 028 residual recommendation.

## Current-source seam verification

The proposals are grounded in current code, not stale assumptions:

- `ThreeWorldReadPort.ts` still composes five world-backed sub-ports from one concrete `World`.
- `application/threePresentation/*` still leaks domain realization objects and `VisualStyle` across read-port/read-model boundaries.
- Selectors still consume those realization/style leaks directly (for example projection-plane grid realization use, planar lifting, guide plane/intersection realization use).
- `RuntimeSession` still privately owns `World` and exposes the 3D presentation bundle through `threePresentationPort()`.
- `ThreeView.vue` still acts as a shell over `ThreePresentationPort`/`ThreeViewRuntime` and does not itself need a redesign.
- The current Playwright contract still explicitly guards 3D overlay pointer ownership.

The stale assignment mention of `frontend/src/services/Element2DRenderer3D.ts` is correctly treated as absent and not to be recreated.

## Proposal scoring

### Proposal Direct

| Criterion | Score | Notes |
|---|---:|---|
| 1. Advances wave target outcome | 5/5 | Directly removes 3D read-port realization/style leakage and centralizes traversal/context ownership at the intended seam. |
| 2. Improves architecture/code quality | 5/5 | Keeps runtime world ownership private, narrows contracts to DTOs, and deletes repeated raw seams rather than wrapping them. |
| 3. Respects no-backcompat/aggressive deletion | 5/5 | Explicit delete list forbids dual raw/DTO paths and broad facades. |
| 4. Avoids overfeaturism | 4/5 | Broad enough to cover the seam, but still bounded to 3D presentation/application/rendering wiring. Must resist introducing a generic geometry/world facade. |
| 5. Avoids new risks/hidden regressions | 4/5 | Identifies concrete rendering/guide/grid/style risks and keeps overlay behavior as required validation. |
| 6. Validation sufficiency | 5/5 | Meets the project validation runbook and names the required static, unit, build, e2e, and preview checks. |

**Verdict:** Preferred proposal. Sufficient for decision if no new evidence appears.

### Proposal Restructure

| Criterion | Score | Notes |
|---|---:|---|
| 1. Advances wave target outcome | 4/5 | Good contingency when a missing conceptual layer is proven, but not warranted by current evidence as the default path. |
| 2. Improves architecture/code quality | 4/5 | Useful if direct cleanup would otherwise smuggle in domain-level redesign. |
| 3. Respects no-backcompat/aggressive deletion | 5/5 | Still requires deletion of old public leaks and forbids compatibility layering. |
| 4. Avoids overfeaturism | 5/5 | Strong explicit stop conditions and good warnings against generic facade creation. |
| 5. Avoids new risks/hidden regressions | 4/5 | Correctly identifies when the wave should stop for plan correction instead of overreaching. |
| 6. Validation sufficiency | 5/5 | Adequate for a split path, including plan-edit review and per-wave full validation. |

**Verdict:** Accept as contingency only. Do not prefer it unless implementation proves one of its stop conditions.

## Protected-surface and preservation checks

- **Pass:** Proposals keep command producers/history, persistence schema/replay, command descriptors/serialization, `OperationRegistry`, Drive/auth, backend/docs/specs/package-tooling, validation-platform work, UI feature work, broad app-shell redesign, and broad domain-realization redesign out of scope.
- **Pass:** Waves 024-028 preservation requirements are explicitly retained.
- **Pass:** 3D overlay pointer behavior is called out as mandatory implementation validation, not a review-stage behavior change.
- **Pass:** Canvas Wave 028 boundary is preserved; no proposal reopens public raw canvas seams.

## Decision recommendation

**No blocking issues found.**

Recommend proceeding to:

- `cycle-029-decision-3d-presentation-dto-read-ports-and-realization-context-ownership`

with:

- **selected proposal:** `proposal-direct.md`
- **accepted contingency:** `proposal-restructure.md` only if implementation encounters one of its enumerated stop conditions and a reviewed plan edit is then opened.

## Non-blocking cautions for implementation/decision

1. Static guard wording should distinguish forbidden public selector/read-model leaks from allowed private adapter-internal conversion use, or the scans may become noisy and brittle.
2. The direct proposal should treat deletion of `getProjectionPlaneGridSource()` as conditional on preserving a bounded adapter/selector split; do not force a broader renderer rewrite just to remove that exact method name.
3. Any remaining `instanceof` checks must stay adapter-private and must not survive in selector-facing DTO contracts.
