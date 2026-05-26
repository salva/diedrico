# Cycle 016 Plan Edit Needed

`architecture-audit/wave-plan.md` currently ends with Wave 015. The recent stage history reports Wave 014 validation-contract closure and Wave 015 TypeScript/build-contract final validation complete, so the next selected risk is not represented by an unexecuted plan entry.

Before implementation, the decision stage should either:

1. append a reviewed Wave 016 entry for **Presentation interaction and overlay contract**, using this cycle's `scope-check.md` and proposals as the draft; or
2. reject this scope and write a different reviewed plan edit for the next central residual risk.

No implementation should start from these proposal artifacts until that plan edit/review/decision is recorded.

## Draft wave-plan entry summary

**Wave 016 — Presentation interaction and overlay contract**

- **Scope:** panel-to-canvas highlight state, explicit 3D overlay pointer/hit-test policy, presentation debug-log deletion in touched surfaces, optional stale Vite `/api` proxy deletion.
- **Target outcome:** panel highlight events have a real application/presentation owner or are deleted; the 3D overlay's interaction policy is explicit and tested; presentation runtime logs no longer obscure validation; stale backend proxy config is removed if review accepts that adjacent cleanup.
- **Delete list:** no-op highlight handlers; unused highlight events if not retained; routine `console.log` in touched presentation files; stale `/api` proxy if accepted; tests that preserve click-around-overlay assumptions without naming the policy.
- **Dependencies:** Waves 014 and 015 complete; prior structural waves complete.
- **Success criteria:** focused and full validation green; current e2e/live preview cover highlight and overlay policy; no production source implementation occurs before reviewed decision.
