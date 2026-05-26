# Corrections Round 01 Note — Wave 014 Validation Contract Ownership

**Stage:** `cycle-014-corrections-round-01`  
**Inputs:** `reviews/round-01-review.md`, `proposals/proposal-direct.md`, `proposals/proposal-restructure.md`

## Blocking issue 1 — Guide integration / `0 test` ambiguity

**Reviewer concern:** Both proposals allowed the Wave 013 `(0 test)` guide report to drift into generalized Vitest discovery/config cleanup. The correction needed to bind any diagnosis or fix to `frontend/tests/integration/guide-creation.test.ts`, its placeholder BrokenHalfHingeLine2D/BHHL case, and the exact nearby collection/discovery contract needed to explain that file's status. Broader discovery/config work must require a reviewed plan-edit mini-cycle.

**Edits made:**

- `proposals/proposal-direct.md`
  - Rewrote selected decision 3 (**Guide integration**) to explicitly limit `0 test` diagnosis/fix to `frontend/tests/integration/guide-creation.test.ts`, its placeholder BHHL case, and the exact local Vitest collection/discovery contract for that file.
  - Added a scope-guard stop rule requiring a reviewed plan-edit mini-cycle if evidence points beyond the local guide file/placeholder/discovery contract into generalized Vitest discovery/config.
  - Tightened the guide risk note to repeat the same file-local boundary.
- `proposals/proposal-restructure.md`
  - Rewrote the guide layer decision to explicitly limit `0 test` diagnosis/fix to `frontend/tests/integration/guide-creation.test.ts`, its placeholder BHHL case, and the exact local Vitest collection/discovery contract for that file.
  - Added a stop/review bullet for any guide `0 test` evidence that expands into generalized Vitest discovery/config cleanup.

## Blocking issue 2 — Build tooling / runtime-policy ambiguity

**Reviewer concern:** Build-tooling language could be read to allow docs-only, engines-only, or runtime-policy edits to satisfy Wave 014 even if mandatory root/frontend build commands still fail in the active validation environment. The correction needed to state that the selected single supported contract must be executable under the environment running the required validation cadence, or the wave must stop for review.

**Edits made:**

- `proposals/proposal-direct.md`
  - Rewrote selected decision 6 (**Build tooling**) to state docs-only, engines-only, or runtime-policy edits cannot satisfy Wave 014 if `npm run build` and `npm run build --workspace=frontend` still fail in the actual validation environment.
  - Expanded the scope-guard build stop rule so the wave stops for review if the chosen runtime/tool policy cannot make the mandatory root/frontend build commands pass in the active validation environment.
- `proposals/proposal-restructure.md`
  - Rewrote the build tooling layer decision with the same executable-in-validation-environment requirement.
  - Added a stop/review bullet for docs-only, engines-only, or runtime-policy edits that leave mandatory root/frontend build commands failing.
  - Tightened success criteria to require root/frontend build success in the actual validation environment, including both mandatory build commands.
  - Tightened the build risk note to reject success claims from policy-only edits unless mandatory builds pass.

## Scope preservation

These corrections modify only Wave 014 proposal/correction artifacts. They do not change source code, tests, package metadata, validation tooling, docs outside this cycle's proposal/correction artifacts, or `architecture-audit/wave-plan.md`.

The proposals still retain:

- anti-overreach constraints;
- audited intersection caller inventory and selected result-contract requirements;
- Playwright MCP/live preview requirements;
- validation ownership classification;
- aggressive deletion priorities for stale/corrupted validation artifacts.
