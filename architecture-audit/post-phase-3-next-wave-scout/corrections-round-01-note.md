# Corrections Round 01 Note — Wave 014 Proposals

## Basis

Round-01 review artifact: `architecture-audit/post-phase-3-next-wave-scout/reviews/round-01-review.md`.

Allowed edits for this corrections stage were limited to the Wave 014 proposal artifacts and this corrections note. No source code, tests, package files, `wave-plan.md`, or unrelated docs were intentionally modified.

## Blocker 1 — Intersection contract work not bounded tightly enough

**Reviewer blocker:** Add an explicit requirement that intersection contract work must begin with an audited caller inventory and selected contract statement — nullable result vs infeasible realization vs discriminated result — and that any need for deeper geometry/domain redesign triggers a reviewed plan-edit mini-cycle instead of being absorbed into Wave 014.

**Edits made:**

- `architecture-audit/post-phase-3-next-wave-scout/proposals/proposal-direct.md`
  - Added caller inventory and selected contract language to `Scope`.
  - Expanded `Scope guard` to state that intersection work is contract alignment, must start with active caller/call-site inventory, must choose exactly one result contract, and must stop for a reviewed plan-edit mini-cycle if deeper geometry/domain redesign is required.
  - Updated `Target outcome`, `Success criteria`, `Validation plan`, and `Risks` to require the inventory/contract statement and stop/review behavior.
- `architecture-audit/post-phase-3-next-wave-scout/proposals/proposal-restructure.md`
  - Added caller inventory and selected result-contract statement to `Scope`.
  - Expanded `Scope guard` to enumerate active callers/tests first, choose one result model, limit changes to directly affected source/tests, and stop for a reviewed plan-edit mini-cycle if a deeper geometry/domain redesign is required.
  - Updated `Target outcome`, `Success criteria`, `Validation plan`, `Risks`, and recommendation text to make the intersection contract work decision-ready while retaining proposal-restructure as the preferred framing.

## Blocker 2 — Playwright MCP/live behavioral verification missing

**Reviewer blocker:** Add an explicit requirement that Playwright MCP/live preview behavioral verification will be run after the suite is repaired/replaced, because the wave changes frontend/user-observable validation surfaces.

**Edits made:**

- `architecture-audit/post-phase-3-next-wave-scout/proposals/proposal-direct.md`
  - Added `Success criteria` requiring Playwright MCP/live browser verification of repaired/replaced keyboard shortcut and selection-mask flows.
  - Strengthened live preview criteria to require `0.0.0.0:5173`, HTTP 200 probe evidence, validation logs, and implementation-log summary.
  - Updated `Validation plan` to refresh the live preview, probe reachability, and run Playwright MCP/live browser checks.
- `architecture-audit/post-phase-3-next-wave-scout/proposals/proposal-restructure.md`
  - Added `Success criteria` requiring Playwright MCP/live browser verification of repaired/replaced keyboard shortcut and selection-mask flows.
  - Added explicit `0.0.0.0:5173` preview refresh and HTTP 200 evidence requirement.
  - Updated `Validation plan` to include preview refresh/probe and Playwright MCP/live checks.

## Blocker 3 — Scope guard did not explicitly forbid broad validation redesign/toolchain paths

**Reviewer blocker:** Tighten the scope guard so the wave forbids broad validation-framework redesign, generalized allowlists, or parallel build/test toolchains; only narrow recurrence checks for exact invalid artifact classes are allowed.

**Edits made:**

- `architecture-audit/post-phase-3-next-wave-scout/proposals/proposal-direct.md`
  - Expanded `Scope guard` to forbid broad validation-framework redesign, generalized allowlist systems, custom runners, parallel build/test toolchains, and sweeping test-suite cleanup.
  - Limited any validation-health checks to exact invalid artifact classes already evidenced: corrupted Playwright parse artifacts, zero-test/placeholder integration files, or unsupported build-tool/runtime combinations.
  - Updated `Explicit DELETE list` to delete skips/todos/allowlists used only to hide red validation debt and to forbid parallel build scripts or alternate type-check/build paths.
- `architecture-audit/post-phase-3-next-wave-scout/proposals/proposal-restructure.md`
  - Expanded `Scope guard` to forbid large custom runners, broad allowlist frameworks, generalized validation platforms, parallel build/test toolchains, and unrelated test cleanup.
  - Limited recurrence checks to exact invalid artifact classes evidenced by the red gates.
  - Updated `Explicit DELETE list`, `Success criteria`, and `Risks` to preserve no-backcompat/aggressive deletion while avoiding overbroad validation-platform work.

## Decision readiness after corrections

Both proposals now directly address all three round-01 blockers while remaining bounded to a single reviewable Wave 014 plan extension. Proposal Restructure remains the stronger recommended framing because it treats validation contract ownership, central domain correctness, tooling compatibility, and stale/corrupted test artifacts as distinct concerns while still requiring green mandatory gates and aggressive deletion of invalid validation surfaces.
