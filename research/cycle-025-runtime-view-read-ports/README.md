# Cycle 025 runtime view/read ports research index

This task produced the planning artifacts under `architecture-audit/cycle-025-runtime-view-read-ports/` rather than standalone external research. No web research was required; the authoritative sources were current project files and the reviewed Wave 025 plan entry.

## Primary artifacts

- `architecture-audit/cycle-025-runtime-view-read-ports/scope-check.md` — current-source scope check, consumer inventory, boundaries, stop conditions, DELETE candidates, and validation requirements.
- `architecture-audit/cycle-025-runtime-view-read-ports/proposals/proposal-direct.md` — direct implementation proposal for behavior-sized runtime read/view ports.
- `architecture-audit/cycle-025-runtime-view-read-ports/proposals/proposal-restructure.md` — alternative proposal for a new application-level view-read bundle layer.

## Evidence logs

- `pre-scout-status.stdout.log` — bounded filtered worktree/status sample and scoped diff names.
- `wave-025-entry.stdout.log` — Wave 025 entry excerpt from `architecture-audit/wave-plan.md`.
- `world-read-seam-scan.stdout.log` — current `worldForView` / `WorldInjectionKey` consumers.
- `view-read-evidence-scan.stdout.log` — broader view/read seam grep evidence.
- `line-evidence-hotspots.stdout.log` — line-numbered excerpts for cited source hotspots.

## Key finding

The Wave 025 premise remains valid: after Wave 024, command producers are behind ports, but `RuntimeSession.worldForView()` and `WorldInjectionKey<World>` still expose the concrete mutable domain root to canvas, panels, three-view, and plane selector consumers. The proposed next step is review of the direct/restructure proposals before any implementation.
