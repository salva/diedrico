# Cycle 022 Review Round 02 — Runtime session kernel and persistence port boundary

**Decision:** NO BLOCKING ISSUES

## Review scope and evidence checked

Reviewed:

- `architecture-audit/cycle-022-runtime-session-kernel-persistence-port-boundary/reviews/round-01-review.md`
- `architecture-audit/cycle-022-runtime-session-kernel-persistence-port-boundary/corrections-round-01.md`
- `architecture-audit/cycle-022-runtime-session-kernel-persistence-port-boundary/proposals/proposal-direct.md`
- `architecture-audit/cycle-022-runtime-session-kernel-persistence-port-boundary/proposals/proposal-restructure.md`
- `architecture-audit/cycle-022-runtime-session-kernel-persistence-port-boundary/scope-check.md`
- scoped source-control evidence in `.saivage/stages/cycle-022-review-round-02/review-scoped-status.stdout` and `.saivage/stages/cycle-022-review-round-02/review-scoped-diffstat.stdout`

No implementation/source refactor was performed during review.

## Source-control reconciliation and protected scope check

- Scoped status shows only review/audit artifacts under the Cycle 022 planning area and the current review-stage directory.
- Scoped diffstat is empty, which confirms no tracked production-source or production-test edits are part of this review stage.
- This satisfies the stage requirement to inspect current git state first and confirms the cycle remains in proposal-review mode rather than implementation.

## Round-01 blocker resolution check

### 1. Open/restore failure semantics

**Resolved.** `proposal-direct.md` now explicitly selects **validation-before-destructive-reset / atomic restore** semantics for user-initiated open/restore through the new session boundary. It states that invalid payloads, validation failures, deserialization failures, and incomplete restores must leave the previous active world, command stack, project metadata, dirty/version state, and autosave eligibility intact.

This correction addresses the round-01 concern that implementation could otherwise centralize restore ownership while silently changing a user-visible failure path.

### 2. Restructure proposal breadth

**Resolved.** `proposal-restructure.md` is now clearly marked **non-preferred fallback only** and explicitly excludes keyboard/history migration, active-plane migration, selection migration, generic command execution, rendering, persistence schema/replay redesign, Drive/auth changes, and broad application-platform work unless a reviewed delta broadens scope.

That is sufficient to remove the round-01 scope-creep blocker. The proposal is still broader and riskier than the direct path, but it is no longer decision-hostile as written.

### 3. Failure-path validation requirements

**Resolved.** Both proposals now require focused validation for:

- invalid/corrupt project payloads,
- restore/deserialization failures,
- command-stack/world/session state after failed open,
- autosave/session-boundary exception behavior.

The direct proposal also makes the required invariants concrete enough to test: pre-open session identity/state must remain intact after failed validation or failed restore.

## Proposal scoring

### Proposal A — `proposal-direct.md`

1. **Does it advance the wave target outcome?** **Strong pass**
   - It still directly targets the reviewed seam: unnamed runtime-session ownership in app shell plus persistence-port leakage of `World`, `CommandStack`, and `ProjectData`.
   - The corrected session boundary remains narrow and centered on lifecycle, snapshot/restore, initialization, and version observation.

2. **Does it improve architecture and code quality?** **Strong pass**
   - It removes concrete runtime and persistence DTO leakage from app-shell use cases and ports.
   - It keeps `ProjectService` knowledge adapter-private instead of letting persistence DTOs define app-shell contracts.
   - The newly explicit atomic restore requirement is an architectural improvement, not overreach, because it corrects a currently leaky orchestration flaw at the same boundary being introduced.

3. **Does it respect the no-backcompat / aggressive-deletion priorities?** **Pass**
   - It explicitly deletes the old raw-pair persistence signatures and rejects compatibility wrappers or overloads.

4. **Does it avoid overfeaturism?** **Pass**
   - It stays within the planned wave and names stop conditions against schema/replay, command-kernel, rendering, backend, and platform expansion.

5. **Does it introduce new risks or hidden regressions?** **Acceptable / managed**
   - Remaining risk is implementation complexity around atomic restore without accidentally broadening into `ProjectService` replay/schema work.
   - The proposal now contains the correct stop condition: if atomicity cannot be achieved at the session boundary without deeper persistence redesign, implementation must stop and request a reviewed delta.

6. **Is the proposed validation sufficient?** **Pass**
   - Validation now explicitly covers the previously missing failure paths, plus the full mandatory lint / focused tests / full Vitest / build / e2e / Playwright / live-preview cadence.

### Proposal B — `proposal-restructure.md`

1. **Does it advance the wave target outcome?** **Pass**
   - It would also solve the session-ownership and persistence-port seam.

2. **Does it improve architecture and code quality?** **Conditional pass**
   - It could produce a cleaner long-term ownership model if the direct wrapper proves insufficient.
   - However, the extra abstraction still carries more churn risk than the direct path for this wave.

3. **Does it respect the no-backcompat / aggressive-deletion priorities?** **Pass**
   - It still deletes the old raw-pair contract and rejects dual paths.

4. **Does it avoid overfeaturism?** **Pass, with caution**
   - The corrected version is now acceptably bounded because the previously optional keyboard/active-plane/selection expansion has been removed from in-scope work.
   - Even so, it remains less scope-efficient than the direct proposal.

5. **Does it introduce new risks or hidden regressions?** **Moderate risk**
   - More files and an additional abstraction layer increase the chance of avoidable churn or a too-early application-kernel concept.
   - Those risks are now explicit and bounded rather than hidden.

6. **Is the proposed validation sufficient?** **Pass**
   - The validation plan now covers the required failure paths and wave-mandated end-to-end checks.

## Atomic open/restore semantics assessment

The corrected direct proposal now makes the key implementation choice the round-01 review required: open/restore must become atomic at the new session boundary for invalid payloads and restore failures. That is an appropriate narrow behavioral improvement for this wave because:

- the defect is already located inside the app-shell session orchestration being refactored,
- the proposal preserves successful-flow behavior,
- the proposal explicitly forbids broadening into persistence-schema or replay redesign without a reviewed delta,
- the validation plan now requires evidence that failed open leaves the previous session intact.

## Restructure scope-limit assessment

The corrected restructure proposal is no longer blocked on scope ambiguity. It is now usable as a bounded fallback, but the review still prefers the direct proposal because it reaches the wave target with lower abstraction risk and a smaller implementation blast radius.

## Recommendation

- **Overall round-02 decision:** **NO BLOCKING ISSUES**
- **Preferred proposal for Cycle 022 decision:** `proposal-direct.md`
- **Fallback only:** `proposal-restructure.md`, and only if the decision stage concludes the direct path cannot satisfy the wave without immediate god-object drift.

Proceed to `cycle-022-decision`. Decision notes should explicitly record that:

- the direct proposal is preferred because it fixes the reviewed seam with less churn,
- atomic open/restore semantics and failure-path validation are mandatory parts of the selected implementation,
- any need to alter `ProjectService` schema/replay/descriptor semantics or to broaden into keyboard/active-plane/selection/platform work requires a reviewed delta rather than discretionary implementation expansion.
