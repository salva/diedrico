# Wave 010 Review — Round 02

**Stage:** `cycle-010-review-round-02`  
**Wave:** `cycle-010-backend-frontend-project-contract`  
**Artifacts reviewed:**
- `architecture-audit/cycle-010-backend-frontend-project-contract/reviews/round-01-review.md`
- `architecture-audit/cycle-010-backend-frontend-project-contract/corrections-round-01-note.md`
- `architecture-audit/cycle-010-backend-frontend-project-contract/proposals/proposal-direct.md`
- `architecture-audit/cycle-010-backend-frontend-project-contract/proposals/proposal-restructure.md`
- `architecture-audit/cycle-010-backend-frontend-project-contract/scope-check.md`

**Evidence checked this round:**
- Repo working tree status (non-source review stage confirmation)
- Search for `frontend/tests/e2e/persistence.spec.ts`
- Search for retained `localhost:3000/api/projects` and `/api/projects` references in `frontend/tests`, `frontend/src`, and the Wave 010 proposal artifacts

## Summary

**NO BLOCKING ISSUES**

Round-01 blocker handling is substantively resolved. Both corrected proposals now explicitly require deleting or replacing the stale frontend e2e coverage that targeted the removed backend `/api/projects` contract and now require Wave 010 e2e/Playwright validation to cover the active app-shell/startup/open-project/project-persistence path instead.

I still recommend `proposal-restructure.md` for decision because it most clearly anchors the implementation in the real architectural seam — the existing application persistence contract (`ProjectData` + `ProjectPersistencePort`) — while still landing on the deletion-first backend stance required by project priorities.

## Round-01 blocker disposition

### Blocker 1 — Explicitly handle obsolete frontend e2e persistence spec

**Round-01 requirement:** proposals must explicitly delete or replace `frontend/tests/e2e/persistence.spec.ts` because it targeted `localhost:3000/api/projects` and the stale backend DTO path.

**Disposition:** **Resolved**

**Evidence:**
- `proposal-direct.md` now adds obsolete e2e coverage for the removed backend `/api/projects` contract to the target outcome, cleanup section, and explicit DELETE list.
- `proposal-restructure.md` now does the same and ties replacement coverage to active app-shell/startup/open-project/project-persistence behavior.
- `corrections-round-01-note.md` explicitly records those edits in both proposals.
- Current repo search found no `frontend/tests/e2e/persistence.spec.ts` file and no matching `*persistence*.spec.ts` under `frontend/tests/`.

**Reviewer note:** the proposals now satisfy the architectural requirement. Because the cited stale e2e file is already absent in the current tree, implementation should treat this as “do not reintroduce; replace only if needed with active-flow coverage” rather than claiming a fresh source-file deletion that no longer exists.

### Blocker 2 — Tie validation plan to deletion/replacement

**Round-01 requirement:** proposals must state that Wave 010 e2e/Playwright validation covers active startup/open-project behavior and must not rely on the deleted backend `/api/projects` path.

**Disposition:** **Resolved**

**Evidence:**
- `proposal-direct.md` now requires static scans proving no retained `localhost:3000/api/projects` or stale backend-project e2e paths remain and requires `npm run test:e2e` plus Playwright/live smoke for the active app-shell/startup/open-project/project-persistence path.
- `proposal-restructure.md` now requires the same and explicitly forbids dependence on the deleted backend `/api/projects` test path.
- `corrections-round-01-note.md` records these edits for both proposals.
- Current search confirms no retained `localhost:3000/api/projects` references in `frontend/tests` or `frontend/src`; remaining `/api/projects` references are confined to backend current-state evidence and the Wave 010 review/proposal artifacts describing what is to be removed.

## Updated proposal assessment

Round-01 six-criterion scoring remains materially valid. The only blocking gap from that review has been corrected. Updated disposition:

### proposal-direct.md
- **Status:** viable, no blocking issues.
- **Strengths:** simplest deletion-first route; strongly aligned with no-backcompat priorities.
- **Residual risk:** package/workspace stance still needs disciplined implementation-time judgment so a useless backend shell is not preserved without a current reason.

### proposal-restructure.md
- **Status:** preferred, no blocking issues.
- **Strengths:** best explanation of the real application boundary and strongest guard against future reintroduction of a second disconnected project model.
- **Residual risk:** slightly broader framing than direct, so implementation must stay disciplined and avoid drifting into speculative shared-contract/backend feature work.

## Accepted residual risks for decision

1. **Backend-workspace closure choice remains implementation-sensitive.** If `/api/projects` removal leaves no meaningful active backend capability, implementation should delete the backend workspace rather than preserve a health-only shell by inertia.
2. **Known validation debt still exists outside Wave 010.** Missing `eslint`, Node 24 / `vue-tsc` incompatibility, broad Vitest debt, and existing e2e corruption remain to be attempted/logged per protocol and attributed honestly during implementation.
3. **Docs/spec cleanup must remain scoped.** Wave 010 should remove only backend-project references made false by the chosen backend stance, not broaden into Wave 013 reconciliation.

## Recommendation

**Recommended winner for decision:** `proposal-restructure.md`

Reason: it frames the deletion as enforcement of a single existing application persistence boundary rather than just a file cleanup, which better matches the wave objective and long-term architecture goals.
