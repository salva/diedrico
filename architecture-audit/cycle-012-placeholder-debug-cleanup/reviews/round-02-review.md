# Wave 012 Review — Round 02

**Stage:** `cycle-012-review-round-02`  
**Wave:** `cycle-012-placeholder-debug-cleanup`  
**Reviewer task:** `t1-review-corrected-wave-012-proposals`  
**Artifacts reviewed:**
- `architecture-audit/cycle-012-placeholder-debug-cleanup/reviews/round-01-review.md`
- `architecture-audit/cycle-012-placeholder-debug-cleanup/corrections-round-01-note.md`
- `architecture-audit/cycle-012-placeholder-debug-cleanup/proposals/proposal-direct.md`
- `architecture-audit/cycle-012-placeholder-debug-cleanup/proposals/proposal-restructure.md`
- `architecture-audit/cycle-012-placeholder-debug-cleanup/scope-check.md`

## Review focus

This round-02 review checks whether the round-01 blocking scope issues were substantively corrected in place, not whether the implementation already exists. The required checks were:

- each round-01 blocker dispositioned against the corrections note and updated proposals;
- six-criteria proposal scoring refreshed or explicitly carried forward;
- explicit bounded console/source-hygiene scope with deterministic scan roots;
- no ambiguous full-repo cleanup language;
- no Wave 013 overreach;
- recommendation for decision if blockers are resolved.

## Round-01 blocker disposition

### Blocker 1 — direct proposal had ambiguous optional/full-tree hygiene-gate scope

**Round-01 finding:** `proposal-direct.md` left the console/source-hygiene gate optional and insufficiently bounded.

**Round-02 evidence:** resolved.

- `corrections-round-01-note.md` says the prior optional section was replaced with a mandatory `Focused static gate update` and enumerates the exact nine touched files that define the console/source-hygiene scope.
- `proposal-direct.md` now states that directory-presence checks are shell validation, while console/source-hygiene enforcement is restricted to the enumerated Wave 012 touched files only.
- `proposal-direct.md` explicitly forbids adding a full-`frontend/src/**` console policy, broad repository cleanup, or an allowlist framework in Wave 012.

**Disposition:** **resolved**.

### Blocker 2 — restructure proposal overreached with a full-tree console test

**Round-01 finding:** `proposal-restructure.md` proposed a `frontend/src/**` `console.log/debug/info` failure rule without proving the whole tree was clean.

**Round-02 evidence:** resolved.

- `corrections-round-01-note.md` records that the restructure proposal was rewritten so zero `console.log` / `console.debug` / `console.info` is required only in the nine evidenced touched files.
- `proposal-restructure.md` now defines the `Static hygiene boundary` with exact scan roots:
  - deleted placeholder/debug references checked in active `frontend/src/**` and `frontend/tests/**`;
  - README-family absence/preservation checked by shell validation;
  - console hygiene checked only in the enumerated nine touched files;
  - `console.warn` and `console.error` explicitly excluded.
- The prior full-tree policy/allowlist language is removed.

**Disposition:** **resolved**.

### Requirement 3 — deterministic enforcement without scope creep

**Round-01 requirement:** proposals had to say plainly which checks are shell validation versus architecture-test scope, and define exact scan roots.

**Round-02 evidence:** resolved in both proposals.

- Both proposals explicitly route placeholder-directory absence/preservation to shell validation.
- Both proposals define the same nine-file console-hygiene enforcement set up front.
- Both proposals reject broad policy expansion and allowlists in this wave.

**Disposition:** **resolved**.

### Requirement 4 — preserve `viewState/` boundary and avoid Wave 013 overreach

**Round-01 requirement:** `viewState/` must remain out of placeholder deletion scope; broad docs/spec reconciliation must stay in Wave 013.

**Round-02 evidence:** resolved.

- `proposal-direct.md` preserves `viewState/` and explicitly defers any registration/contract cleanup to a later reviewed wave or delta.
- `proposal-restructure.md` preserves `viewState/` and keeps broad docs/spec reconciliation out of Wave 012.
- Both proposals continue to limit comment/doc deletion to material directly adjacent to removed placeholder/debug code.

**Disposition:** **resolved**.

## Proposal scoring update

Round-01 scoring remains materially valid on architecture direction and wave fit. Only blocker disposition changed, so the updated scoring below focuses on the corrected scope language.

### Proposal Direct — `proposal-direct.md`

1. **Advances wave target outcome:** **Pass**  
   Still directly deletes README-only placeholder families and routine debug noise.

2. **Improves architecture / code quality:** **Pass**  
   Removes misleading source surfaces and routine console noise without adding compatibility abstractions.

3. **Respects no-backcompat / aggressive deletion priorities:** **Pass**  
   Keeps deletion-first posture and rejects preserving debug behavior behind flags or wrappers.

4. **Avoids overfeaturism:** **Pass**  
   The corrected bounded gate remains small and wave-local.

5. **Introduced risks / hidden regressions:** **Pass with residual caution**  
   Main round-01 risk is resolved because the proposal now restricts the hygiene gate to named files and named deleted surfaces.

6. **Validation sufficiency:** **Pass**  
   The validation plan is now deterministic about shell directory checks, deleted-surface scans, and the exact files scanned for console hygiene.

### Proposal Restructure — `proposal-restructure.md`

1. **Advances wave target outcome:** **Pass**  
   Still performs the intended deletions and log cleanup.

2. **Improves architecture / code quality:** **Pass**  
   Best aligns with Wave 011 by extending existing architecture/static-gate infrastructure with a narrow enforceable hygiene boundary.

3. **Respects no-backcompat / aggressive deletion priorities:** **Pass**  
   Deletes placeholder/debug surfaces and rejects compatibility-preserving logging infrastructure.

4. **Avoids overfeaturism:** **Pass**  
   The corrected version is no longer a stealth full-tree policy project.

5. **Introduced risks / hidden regressions:** **Pass with residual caution**  
   Residual risk is limited to test brittleness if scanner matching is implemented carelessly, but the proposal now bounds scope tightly enough for implementation review/validation to police that.

6. **Validation sufficiency:** **Pass**  
   Validation is explicit about exact roots, shell checks, architecture tests, focused suites, mandatory cadence classification, and focused Playwright/live preview checks.

## Comparative recommendation

Both corrected proposals are now decision-ready and satisfy the round-01 scoping requirements.

**Recommended winner:** `proposal-restructure.md`

Why it remains stronger after correction:

- It keeps the same deletion-first runtime cleanup as the direct proposal.
- It uses the Wave 011 architecture/static-gate mechanism to make the cleanup durable.
- After corrections, that durability is achieved with a bounded nine-file console-hygiene rule rather than an accidental full-tree policy.

## Accepted residual risks

These are not blocking for decision, but should be implemented honestly and checked during the implementation/validation stages:

1. The console-hygiene assertion could become brittle if implemented with imprecise matching; implementation should keep it constrained to the exact listed files and to `console.log` / `console.debug` / `console.info` only.
2. Focused validation may still be surrounded by known Wave 011 full-suite/build/e2e debt; those failures must be compared against previously classified signatures rather than silently waived.
3. Comment cleanup must remain adjacent and local; broad docs/spec cleanup still belongs to Wave 013.

## Decision readiness

**NO BLOCKING ISSUES**

The corrected proposals substantively resolve the round-01 blockers. The stage can proceed to decision, with `proposal-restructure.md` as the recommended proposal and `proposal-direct.md` as an acceptable fallback.

## Stage hygiene note

This review checked only audit/proposal artifacts and prior review evidence. No `frontend/`, `backend/`, `specs/`, or `docs/` application source changes were required or reviewed as part of accepting round 02.
