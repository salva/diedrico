# Cycle 027 wave-plan extension evidence and ranking note

**Stage:** `cycle-027-wave-plan-extension`  
**Task:** `t1-plan-extension-evidence-and-wave-entry`  
**Purpose:** Extend and re-rank `architecture-audit/wave-plan.md` after Wave 026 and the urgent 3D interaction hotfix. This is a planning-only artifact; no production source/test/package/backend/docs/spec implementation was performed.

## Source-control hygiene

- Broad worktree status is very dirty: the bounded status command captured the first 120 entries and a total count of 1783 status lines in `validation/status-short.stdout.log`.
- I did not revert, normalize, stage, or incorporate unrelated dirty work. Edits in this task are limited to:
  - `architecture-audit/wave-plan.md`
  - `architecture-audit/cycle-027-wave-plan-extension/plan-extension-note.md`
  - planning evidence logs under `architecture-audit/cycle-027-wave-plan-extension/validation/`
  - the required task report under `.saivage/stages/cycle-027-wave-plan-extension/reports/`
- Secret/config file contents were not read. Source-control evidence was limited to status path metadata and bounded source/log reads required for this planning task.

## Evidence inspected

Primary current artifacts and source samples:

- Existing `architecture-audit/wave-plan.md`, including the Wave 026 entry and earlier runtime/presentation waves (`validation/wave-plan-tail-before.stdout.log`, `validation/wave-plan-grep.stdout.log`).
- Wave 026 completion log: `architecture-audit/cycle-026-tool-interaction-read-context/implementation-log.md`.
- Urgent 3D interaction hotfix log: `architecture-audit/cycle-026-hotfix-3d-view-interaction-regression/implementation-log.md`.
- Wave 025 completion log: `architecture-audit/cycle-025-runtime-view-read-ports/implementation-log.md`.
- Current source samples with line-numbered evidence in `validation/source-evidence.stdout.log`:
  - `frontend/src/application/appShell/RuntimeSession.ts`
  - `frontend/src/application/appShell/RuntimeViewPorts.ts`
  - `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts`
  - `frontend/src/application/threePresentation/ThreeWorldReadPort.ts`
  - `frontend/src/components/panels/ActionsPanel.vue`
  - `frontend/src/components/panels/ProcessTreeNode.vue`
  - `frontend/src/components/workspace/SvgCanvas.vue`
  - `frontend/src/components/panels/ThreeView.vue`
  - `frontend/src/App.vue` overlay CSS after the hotfix
- Residual seam scan: `validation/residual-seam-scan.stdout.log`.

## Post-Wave-026 current-source findings

Wave 026 is complete and successfully deleted the active raw tool-context seam: `RuntimeSession.canvasViewPort().invokeToolClick` now passes `readPort` rather than `world`, `ITool.ToolContext.world` and `CollectionContext.world` were deleted, and active tools now use bounded read/realization methods. The Wave 026 log explicitly accepts residual RuntimeSession properties/process/persistence handles and canvas/three presentation read-model seams as future candidates.

Current source confirms those residual seams are now the most central remaining architecture risk:

1. **RuntimeSession still owns too many read-model responsibilities.** `RuntimeSession.ts` privately owns `World` and `CommandStack`, which is correct, but the same class now directly builds canvas input transforms, process-tree DTOs, elements-panel DTOs, three-presentation ports, active-plane selectors, selection read ports, properties-dialog view models, persistence restore handles, and helper formatting/realization logic (`validation/source-evidence.stdout.log`, `RuntimeSession.ts:37-39`, `:42-80`, `:83-160`, `:163-183`, `:201-242`, `:263-281`, `:287-442`). This makes the runtime session a growing application god-module rather than a small composition/session owner.

2. **Properties/process read helpers still cross into domain realization and concrete class logic.** `RuntimeSession.getPropertiesDialogViewModel()` casts a found element to `any`, describes type through world queries, realizes point/circle coordinates via `realize2D(this.world)`, derives dependency labels through concrete subclasses, and marks process action infeasibility by realizing `Element2D` against the whole world (`RuntimeSession.ts:305`, `:334`, `:342`, `:409`; scan evidence in `validation/residual-seam-scan.stdout.log`). This is a current runtime read-model seam, not a tool seam.

3. **Elements-panel visibility is a named intent but still mutates raw domain state directly.** `RuntimeSession.elementsPanelPort().toggleVisibility()` finds any visible element, creates/mutates `visualStyle`, and calls `world.markDirty()` directly (`RuntimeSession.ts:150-158`). This is central because it is a user-facing application intent bypassing command/persistence semantics, but the next wave should bound it as an elements read/intention boundary rather than redesigning command-backed visibility unless the scout proves that is required.

4. **CanvasWorldReadPort still exposes raw domain collections and process-tree access to presentation selectors.** The interface returns `ProjectionPlane[]`, `Point3D[]`, `Line3D[]`, `Segment3D[]`, and `ProcessTree`, while the adapter constructs a broad realization context from full `World` (`CanvasWorldReadPort.ts:15-28`, `:31-43`, `:46-69`). This keeps presentation selectors coupled to raw domain collections even after Vue components no longer receive `World` directly.

5. **ThreeWorldReadPort is better DTO-oriented but still centralizes world traversal/domain type checks.** It imports `World`, `AuxiliaryProjectionPlane`, guide predicates, and `Segment2DByPoints`; creates a full realization context; traverses all projection planes/3D elements/hinges; and calls domain realization getters in adapter methods (`ThreeWorldReadPort.ts:6-12`, `:56-78`, `:81-135`). That remains a presentation read-model seam, but it is less urgent than the RuntimeSession read-model god-module because it is already hidden behind `ThreePresentationPort` and `ThreeView.vue` is a small shell.

6. **The 3D hotfix changes risk ordering by proving UI interaction ownership must be explicit at boundaries.** The hotfix log reproduced `.three-view-overlay`, `.three-view-panel`, and `.three-canvas` all having `pointer-events: none`, causing `elementFromPoint` to hit the underlying SVG line, and fixed the app-shell overlay to `pointer-events: auto`. Current source confirms the overlay rule is now explicit (`App.vue:277-289`) and `ThreeView.vue` control overlay also uses `pointer-events: auto`. This argues for carrying explicit pointer/interaction-boundary regression checks into future presentation/runtime waves, but it does not make a CSS/UI-only wave more central than RuntimeSession read-model extraction.

## Centrality ranking after Wave 026/hotfix

1. **Wave 027 should target RuntimeSession properties/process/elements read-model seams and presentation read-port DTO seams.** This is the next central step because Wave 025/026 made `RuntimeSession` the sole owner of concrete `World`, but that owner is now accumulating view-model construction, domain realization reads, concrete type checks, visibility mutation, and adapter construction. Cleaning this boundary sharpens the application/session layer used by future persistence, presentation, command, and UI work.
2. **CanvasWorldReadPort/ThreeWorldReadPort presentation seams are included but bounded.** They should be inventoried and narrowed where directly tied to RuntimeSession read-model extraction; however, a broad domain-realization redesign remains out of scope unless the scout proves the bounded seam cannot be fixed honestly.
3. **Elements visibility command semantics remain important but are not pulled forward as a standalone command/persistence redesign.** The next wave can name an elements read/visibility intent boundary and either keep current semantics explicitly or stop for a plan edit if command-backed visibility is required.
4. **UI interaction/testability boundary debt from the hotfix is included as validation risk, not the wave's architectural center.** The overlay pointer contract should be protected in validation, but the hotfix already restored behavior and did not implicate Three runtime/read-port architecture.
5. **Toolbar-history unknown provider typing, validation gate hardening, docs/spec drift, backend/frontend contract stance, preview-script ergonomics, Drive/auth, package/tooling, and generic application-kernel work are deferred.** They are real candidates but are less central than the current runtime/read-model concentration or would broaden the wave beyond one bounded cycle.

## Wave-plan edit summary

`architecture-audit/wave-plan.md` now appends **Wave 027 — Runtime read-model extractors and presentation DTO ports**. The entry includes:

- status and current grounding from Wave 026 completion, the 3D hotfix, and current source line evidence;
- scope covering `RuntimeSession` read-model helpers, `RuntimeViewPorts`, canvas/three read ports/selectors, process/properties/elements-panel consumers and tests;
- guardrails excluding persistence schema/replay, backend/docs/tooling, Drive/auth, broad domain realization redesign, command history/producer redesign, and generic application-kernel work;
- target outcome, explicit DELETE list, success criteria, dependencies, validation requirements, risks, and no-backcompat rationale.

## No-implementation confirmation

No production source, tests, package files, backend files, docs/specs, Drive/auth code, preview server, e2e tests, or next-wave implementation were changed or run as part of this planning task. The next canonical stage after review/corrections should be `cycle-027-fresh-scout-proposals` for the new Wave 027 entry.
