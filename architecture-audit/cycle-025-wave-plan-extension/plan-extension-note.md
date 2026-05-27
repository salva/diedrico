# Cycle 025 Wave Plan Extension Note — Runtime view/read ports

## Planning-only confirmation

This task inspected bounded post-Wave-024 evidence and edited planning artifacts only. No production source, tests, package/tooling, backend, docs/specs, Drive/auth, secret/config, or next-wave implementation files were intentionally changed.

## Source-control hygiene

- A bounded status sample was captured at `architecture-audit/cycle-025-wave-plan-extension/pre-edit-status-sample.stdout.log` with protected `.saivage` auth/config/provider pathnames filtered from the log. Contents of protected secret/config files were not read.
- The worktree is broadly dirty before this planning edit: the filtered sample still reports 1732 changed/untracked paths, including historical audit artifacts, `.github`/`.specify` deletions, `.saivage` stage artifacts, and unrelated frontend source/test changes. This task did not revert or reconcile those unrelated changes.
- Planning evidence/log files under `architecture-audit/cycle-025-wave-plan-extension/` were created for this stage. The only intended authoritative plan edit is `architecture-audit/wave-plan.md` with a new Wave 025 entry.

## Evidence inspected

- `architecture-audit/wave-plan.md` was re-read and currently ended with Wave 024 before this extension.
- `architecture-audit/cycle-024-command-producer-runtime-ports/implementation-log.md` states Wave 024 is complete, raw command-producer seams remain absent, and the next recommended candidate is the `worldForView()` / `WorldInjectionKey` rendering/view read seam.
- Baseline `architecture-map.md` and `risk-register.md` still rank rendering architecture, UI/domain leaks, god-modules, weak types, and missing architecture enforcement as central risks after command/runtime cleanup.
- Static scans and line excerpts were captured in this directory:
  - `world-read-seam-scan.stdout.log`
  - `view-consumer-line-evidence.stdout.log`
  - `presentation-file-list.stdout.log`
  - `presentation-boundary-scan.stdout.log`
  - `svgcanvas-read-excerpts.stdout.log`
  - `elements-three-excerpts.stdout.log`
  - `residual-candidate-scan.stdout.log`

## Ranking rationale

Wave 024 removed the raw command-stack producer seam. The remaining central runtime leak is now the broad concrete domain read handoff from `RuntimeSession.worldForView()` through `WorldInjectionKey: InjectionKey<World>` into view/rendering descendants. This seam matters because it lets components and presentation adapters enumerate, poll, and mutate the domain root directly after command-production and command-history paths have already been ported.

Evidence supports a focused Wave 025:

- `RuntimeSession.worldForView()` returns the concrete `World` and `AppShellRuntime` unwraps it.
- `App.vue` provides the concrete world via `WorldInjectionKey`.
- `SvgCanvas.vue`, `ActionsPanel.vue`, `ElementsPanel.vue`, `ThreeView.vue`, and `PlaneSelector.vue` inject the concrete world for view/read behavior.
- Canvas and Three presentation read ports exist, but still adapt from `World` and expose raw domain collections/realization contexts in places.
- The view needs are behavior-sized: canvas presentation/input, element labels, process-tree panel reads, elements-panel list/visibility behavior, three-view presentation snapshots, active-plane selector options/read/write, and change notification.

## Deferred candidates

The following candidates remain real but are lower priority than the runtime view/read seam for the next wave:

- `ProjectSessionPersistenceAdapter` DTO/cast residue around `ProjectService`: adapter/persistence concern, not a blocker for eliminating concrete world injection into rendering/panels.
- Toolbar history controller provider typing: small leaf typing cleanup after command-history boundary; less central than broad view world exposure.
- `CanvasStyleUseCase` `as any` operation cast and other command/domain operation residues: outside the Wave 024 residual read seam and should not reopen command-producer or command descriptor work here.
- Backend/frontend contract stance, validation gate hardening, docs/spec drift, Drive/auth, package/tooling, and broad domain realization redesign: explicitly excluded unless fresh Wave 025 scout proves the view read seam cannot be narrowed without a reviewed plan edit.

## Wave-plan edit

`architecture-audit/wave-plan.md` now contains **Wave 025 — Runtime view/read ports for rendering and panels** with required status, scope, scope guard, current grounding, target outcome, explicit DELETE list, success criteria, dependencies, validation requirements, risks, and no-backcompat rationale.

## Next recommended stage

If review of this plan extension has no blocking issues (or blockers are corrected in place), proceed to the canonical **`cycle-025-fresh-scout-proposals`** stage. That scout/proposal stage should inventory all current `worldForView()` / `WorldInjectionKey` consumers, include `ProcessTreeNode.vue` as a child of `ActionsPanel.vue`, distinguish read/presentation needs from command/persistence/domain-realization concerns, and produce direct vs restructure proposals before any implementation.
