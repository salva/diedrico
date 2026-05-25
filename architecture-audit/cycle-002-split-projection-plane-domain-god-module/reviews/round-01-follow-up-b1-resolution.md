# Follow-up Review — B1 Resolution Verification

**Reviewer:** reviewer (follow-up, same stage)
**Stage:** cycle-002-review-round-01
**Date:** 2026-05-25
**Task:** t3-follow-up-review-b1-resolution
**Prior review:** `architecture-audit/cycle-002-split-projection-plane-domain-god-module/reviews/round-01-review.md`

## Purpose

Verify that the in-place proposal edits resolved blocking issue B1 from the round-01 review and incorporated warning W3, and confirm no application source files were modified during corrections.

## B1 Resolution — PASS

**Original B1:** Both proposals referenced deleting `BaseProjectionPlane` imports from tests without clarifying whether those tests are currently passing or broken, and without naming the replacement class explicitly.

**Proposal Direct corrections (verified in updated text):**
- New section "### `BaseProjectionPlane` current-state clarification" explicitly states: "Wave 002 should treat the `BaseProjectionPlane` imports as **pre-existing broken test code**, not as a behavior that must be preserved."
- Confirms `BaseProjectionPlane` is not exported and only appears in comments.
- Names replacement: "`FixedProjectionPlane` for concrete P_H/P_V references" and "`ProjectionPlane` only for abstract base typing."
- Implementation step 7 now explicitly says: "specifically replace invalid `BaseProjectionPlane` test imports/types with `FixedProjectionPlane` for P_H/P_V concrete planes (or `ProjectionPlane` only for abstract base references)."
- DELETE list retains the stale-import deletion entry.

**Proposal Restructure corrections (verified in updated text):**
- New section "### `BaseProjectionPlane` current-state clarification" explicitly states: "This proposal assumes the `BaseProjectionPlane` test imports are **already invalid in the current tree**, not a supported API to preserve."
- Confirms source evidence shows `BaseProjectionPlane` is not exported.
- Names replacement: "replace them with `FixedProjectionPlane` for concrete fixed planes, rather than introducing aliases, wrappers, or a compatibility export."
- Updated consumers section says: "Use `FixedProjectionPlane` for concrete P_H/P_V plane instances and `ProjectionPlane` only where an abstract base type is intended."

**Verdict: B1 is materially resolved in both proposals.** The current state is clarified (pre-existing broken test code), the replacement class is named (`FixedProjectionPlane` for concrete, `ProjectionPlane` for abstract), and the implementation steps are updated accordingly.

## W3 Incorporation — PASS

**Original W3:** Neither proposal addressed per-element realization helpers (`realizePoint2D`, `realizeLine2D`, `realizeCircle2D`) and ID-generation methods (`generatePoint2DId` etc.) that also take `World` directly.

**Proposal Direct corrections (verified in updated text):**
- Contract changes section now explicitly lists: "the per-element helpers currently typed as `world: import('./World').World` (`realizePoint2D`, `realizeLine2D`, `realizeCircle2D`, `generatePoint2DId`, `generateLine2DId`, `generateSegment2DId`, `generateCircle2DId`, `generateGuide2DId`) plus construction helpers that currently accept direct `World` parameters."
- States: "Replace `world?: import('./World').World` collection side-effect parameters with a named mutation/dependency context."
- Implementation step 2 now says: "and update fixed/auxiliary/base signatures away from `any` and away from direct `import('./World').World` parameters in per-element realization, ID-generation, and construction helper methods."

**Proposal Restructure corrections (verified in updated text):**
- Current evidence section now includes a new bullet about per-element realization and ID-generation helpers with line references, stating: "These must be covered by the same context-narrowing work, not treated as separate acceptable coupling."
- Plane entity responsibilities now include: "per-element realization/read helpers with typed projection-plane contexts rather than direct `World` imports."
- DELETE list now includes: "Delete `any` projection-plane realization context signatures and direct `import('./World').World` parameters from per-element realization, ID-generation, and construction helper paths by replacing them with explicit context interfaces."

**Verdict: W3 is materially incorporated in both proposals.** The per-element helpers and ID-generation methods are now explicitly in scope for the context-narrowing work.

## Source code modification check — PASS

Git log confirms the most recent commit (8ecdbca) only modified:
- `architecture-audit/cycle-002-split-projection-plane-domain-god-module/proposals/proposal-direct.md`
- `architecture-audit/cycle-002-split-projection-plane-domain-god-module/proposals/proposal-restructure.md`
- `.saivage/` metadata files
- Earlier cycle-001 architecture-audit artifacts

No files under `frontend/src/`, `backend/src/`, or `specs/` were modified. Working tree has no uncommitted source-code changes.

## Residual warnings status

- **W1** (mutation context as stepping stone): Still accepted as residual risk. Not a blocking issue per the wave plan scope.
- **W2** (restructure scope risk): Still applies if Proposal Restructure is selected. Not blocking for Proposal Direct.

## Updated verdict

**NO BLOCKING ISSUES**

All blocking issues from round-01 are resolved. The review recommends **Proposal Direct** for Wave 002 implementation with accepted residual warnings W1 and W2.

The round-01 score summary and six-criterion assessment remain valid and are not repeated here.
