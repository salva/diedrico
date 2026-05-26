# Wave 012 Corrections Round 01 Note

**Stage:** `cycle-012-corrections-round-01`  
**Task:** `t1-correct-wave-012-proposals`  
**Source review:** `architecture-audit/cycle-012-placeholder-debug-cleanup/reviews/round-01-review.md`

## Blocker mapping and edits made

### 1. Direct proposal: ambiguous optional console/source-hygiene gate scope

**Round-01 blocker:** `proposal-direct.md` treated the static console/source-hygiene gate as optional and left open whether it would scan only touched files or all active frontend source. The reviewer required exact scope and rejected vague full-tree policy language.

**Edits made:**

- Replaced `proposal-direct.md` section `Optional focused static gate update` with `Focused static gate update`.
- Defined the console/source-hygiene gate as mandatory only for the Wave 012 evidenced touched files:
  - `frontend/src/services/GoogleDriveService.ts`
  - `frontend/src/utils/rectangleGrid.ts`
  - `frontend/src/utils/projectionPlaneUtils.ts`
  - `frontend/src/domain/world/HingeLine.ts`
  - `frontend/src/domain/world/Guide.ts`
  - `frontend/src/commands/operations/world/UpdateElementStyleOp.ts`
  - `frontend/src/commands/operations/world/RemoveElementOps.ts`
  - `frontend/src/commands/operations/processTree/ToggleOutputOp.ts`
  - `frontend/src/commands/operations/processTree/ToggleEncapsulationOp.ts`
- Removed the prior open-ended `frontend/src/**` console-policy wording and explicitly forbade adding a broad console gate or allowlist framework in Wave 012.
- Clarified that operation README directory absence/preservation is enforced by shell validation, while active source/test reference checks remain architecture-test scope.
- Updated validation language so console scans cover only the enumerated touched files and cannot require unrelated docs/spec cleanup or unrelated source rewrites.

### 2. Restructure proposal: full-tree console test could force broad cleanup or allowlist framework

**Round-01 blocker:** `proposal-restructure.md` proposed a `frontend/src/**` `console.log`/`console.debug`/`console.info` failure rule without proving the whole tree was clean, creating risk of unreviewed broad cleanup or an allowlist framework.

**Edits made:**

- Rewrote `proposal-restructure.md` target outcome to require zero `console.log`/`debug`/`info` only in the Wave 012 evidenced touched files, not all of `frontend/src/**`.
- Replaced the `Static hygiene boundary` section with exact scan roots and deterministic enforcement mechanics:
  - placeholder/deleted-surface references are checked in active `frontend/src/**` and `frontend/tests/**`;
  - README-only placeholder absence and active README preservation are checked by shell validation;
  - console/source hygiene is checked only for the same nine Wave 012 touched files listed above;
  - `console.warn` and `console.error` remain excluded from this wave.
- Removed the prior allowance for narrow named console exceptions and explicitly rejected allowlists in Wave 012.
- Updated architecture-test and static-scan validation bullets to prove the gate roots are the enumerated touched files and do not overreach into full-tree docs/spec/source cleanup.

### 3. Deterministic enforcement without scope creep

**Round-01 requirement:** If directory absence is enforced by shell validation rather than Vitest, say so plainly; if console hygiene is enforced in Vitest, define exact scan roots and named exceptions up front.

**Edits made:**

- Both proposals now state that operation-directory absence/preservation is validated by explicit shell commands (`test ! -d ...` and `test -f ...`).
- Both proposals now define the console-hygiene scan roots up front as the nine Wave 012 evidenced touched files.
- Both proposals avoid named exceptions/allowlists by requiring zero `console.log`/`debug`/`info` hits in those files.

### 4. Preserve `viewState/` and Wave 013 boundaries

**Round-01 requirement:** Keep `viewState/` out of placeholder deletion scope and retain the boundary that broad docs/spec reconciliation belongs to Wave 013.

**Edits made:**

- Existing `viewState/` preservation language was retained in both proposals.
- Existing Wave 013 docs/spec boundary language was retained.
- Validation edits explicitly say bounded source-hygiene scans must not require broad docs/spec cleanup or unrelated source rewrites.

## Source-change boundary

This corrections task edited only Wave 012 audit/proposal artifacts. It did not modify application source under `frontend/`, `backend/`, `specs/`, or `docs/`.
