# Wave 002 Round-01 Proposal Corrections

Access date: 2026-05-25.

## Source reviewed

- Reviewer artifact: `.saivage/stages/cycle-002-fresh-scout-proposals/reviews/round-01-review.md`
- Corrected proposals: `architecture-audit/cycle-002-split-projection-plane-domain-god-module/proposals/proposal-direct.md`, `architecture-audit/cycle-002-split-projection-plane-domain-god-module/proposals/proposal-restructure.md`
- Verification grep evidence: `architecture-audit/cycle-002-split-projection-plane-domain-god-module/review-correction-targeted-grep.stdout.log`

## Corrections applied

- B1: Proposal Direct now explicitly lists known direct consumers requiring import updates: `Element3DDescriptors.ts`, `registerDescriptors.ts`, `Element2DRenderer3D.ts`, `ToolArgumentCollector.ts`, plus `ThreeView.vue` found in the correction grep.
- W1: Both proposals now address `AddAuxiliaryProjectionPlaneOp.ts` debug `console.log` deletion in the auxiliary-plane creation path.
- W2: Proposal Direct now states `frontend/src/domain/world/index.ts` currently exports no projection-plane symbols and should not be updated unless a deliberate new public export surface is introduced.
- W3: Proposal Restructure now includes `addSegment2DBetweenPoints`, `addSiblingGuide2D`, and `addSiblingIntersectionPoint` in the construction-service method list.
- W4: Proposal Restructure now quantifies the current broad helper-call surface as 732 total matches: 34 under `frontend/src/` and 698 under `frontend/tests/`.

No application source files were modified.
