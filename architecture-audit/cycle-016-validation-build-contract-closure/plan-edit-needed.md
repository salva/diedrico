# Cycle 016 Plan Edit Needed

`architecture-audit/wave-plan.md` currently ends with Wave 015. Wave 015's required return to Wave 014 validation closure has been completed in recent stage history. The next central risk selected by this scout is therefore not represented by an unexecuted wave-plan entry.

Before implementation, the decision stage should either:

1. append a reviewed Wave 016 entry for **Presentation interaction and overlay contract**, using `scope-check.md` and the proposals in this cycle as the draft; or
2. reject this scope and write a different reviewed plan edit for the next central residual risk.

No implementation should start from these proposal artifacts until that plan edit/review/decision is recorded.

## Draft wave-plan entry summary

**Wave 016 — Presentation interaction and overlay contract**

- **Scope:** panel-to-canvas highlight state, explicit 3D overlay pointer/hit-test policy, presentation debug-log deletion in touched surfaces, optional stale Vite `/api` proxy deletion.
- **Target outcome:** panel highlight events have a real application/presentation owner or are deleted; the 3D overlay's interaction policy is explicit and tested; presentation runtime logs no longer obscure validation; stale backend proxy config is removed if included by review.
- **Delete list:** no-op highlight handlers; unused highlight events if not retained; routine `console.log` in touched presentation files; stale `/api` proxy if accepted; tests that preserve click-around-overlay assumptions without naming the policy.
- **Dependencies:** Waves 014 and 015 complete; all prior structural waves complete.
- **Success criteria:** focused and full validation green, current e2e/live preview cover highlight and overlay policy, no production source implementation occurs before reviewed decision.
