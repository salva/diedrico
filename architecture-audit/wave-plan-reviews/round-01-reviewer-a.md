# Wave Plan Review — Reviewer-A Round 01 Retry

**Stage:** `wave-plan-reviewer-a-round-01-retry`  
**Reviewer role:** Reviewer-A only  
**Scope:** Phase 2 wave-plan review; no application source-code changes  
**Artifact:** `architecture-audit/wave-plan-reviews/round-01-reviewer-a.md`

## Inputs reviewed

- `architecture-audit/wave-plan.md`
- `architecture-audit/baseline/decision.md`
- `architecture-audit/baseline/corrections-round-01.md`
- `architecture-audit/baseline/risk-register.md`
- `architecture-audit/baseline/architecture-map.md`
- Baseline context referenced by the plan: inventory, domain-model, quality-report, and risk rankings as summarized in the signed-off baseline decision.

The baseline decision records independent Reviewer-A and Reviewer-B round-02 sign-offs and declares Phase 1 complete and accurate. This review therefore treats the corrected baseline artifacts as the evidence base for Phase 2 planning.

## Review criteria

I evaluated the plan for:

1. grounding in the signed-off baseline;
2. architectural centrality ordering;
3. one-cycle wave sizing and scope guards;
4. explicit DELETE lists and no-backcompat/aggressive-deletion priorities;
5. success criteria and validation sufficiency;
6. dependencies between waves;
7. Phase 2 no-code-change compliance.

## Wave-by-wave assessment

| Wave | Assessment |
|---|---|
| 001 — Invert the World/application boundary | Strongly grounded in baseline R1/R11 and architecture-map dependency inversion findings. Correctly first because `World` purity and initialization orchestration are foundational. Scope is ambitious but bounded to the domain/application boundary and descriptor/style/realization coupling. DELETE list directly removes command-stack/application imports and old initialization path. Success criteria include static import checks and focused architecture coverage. |
| 002 — Split the projection-plane domain god-module | Grounded in baseline R2/Q2/Q8/R6. Ordering after Wave 001 is appropriate because splitting the plane monolith before removing stale `World` coupling would preserve bad boundaries. Scope is one-cycle sized around projection-plane responsibilities. DELETE list and success criteria are concrete. |
| 003 — Establish one authoritative world state | Grounded in baseline R3/R7 corrections for `worldStore`, `Workspace2D.vue`, and `ElementRenderer.vue`. Ordering after Waves 001-002 is defensible because canonical domain ownership should be cleaned before deleting duplicate state paths. DELETE list is aggressive and explicit. Success criteria cover active imports, state ownership, composables, and e2e flows. |
| 004 — Define command/undo and persistence contract | Grounded in baseline R4/R6 and ProjectService private-cast findings. Correctly depends on cleaned authoritative state. DELETE list explicitly removes private casts, migration/backcompat branches, and monolithic reconstruction if replaced. Success criteria cover save/open, local/Drive persistence, undo/redo after load, and typed serialization contracts. |
| 005 — Clean process-tree/dependency ownership | Grounded in baseline R7 and process/dependency overlap findings. Correctly follows persistence/command contract work because process mutations participate in command/undo and serialization. DELETE list removes deprecated process APIs and preserving call sites. Success criteria cover process-tree behavior and ActionsPanel boundary cleanup. |
| 006 — Move UI command construction into use-cases/tool controllers | Grounded in baseline R5 and architecture-map UI-to-operation leaks. Correctly placed after domain, state, persistence, and process boundaries. The scope guard is important and sufficient: it requires a wave-plan edit if canvas/tool cleanup and panel/toolbar cleanup do not fit one controller concept. DELETE list follows no-backcompat priorities. |
| 007 — Extract 2D rendering selectors and adapters | Grounded in baseline R8/Q13/Q15 and `SvgCanvas.vue` god-module findings. Correctly follows tool/use-case cleanup so rendering selectors do not preserve UI command construction. DELETE list removes test-only production render paths and duplicate special cases. Success criteria require focused/e2e behavior. |
| 008 — Extract 3D rendering scene adapters | Grounded in baseline R8/Q5 and `ThreeView.vue` god-module findings. Dependency on Waves 003 and 007 is appropriate so the 3D path does not preserve deleted store paths and can share selector patterns. DELETE list and success criteria are concrete. |
| 009 — Extract application shell services from `App.vue` | Grounded in baseline R2/R5 and App shell hotspot findings. Correctly follows persistence/use-case/rendering boundaries so `App.vue` can delegate to stable interfaces. DELETE list removes inline shell orchestration and untyped global bridges. Success criteria cover user-visible project and selection flows. |
| 010 — Resolve backend/frontend project-contract architecture | Grounded in baseline R9/R12 and frontend-to-backend import leak. Correctly depends on persistence and app-shell routing. Target outcome allows either deletion of unused backend or a real typed contract, matching the project priority to avoid preserving disconnected paths. DELETE list is explicit and aggressive. |
| 011 — Tighten architecture tests and root validation gates | Grounded in baseline R10/R9. Correctly late enough to freeze cleaned boundaries rather than current violations. Success criteria name the exact architectural violations to enforce. Root validation criterion appropriately depends on the backend stance from Wave 010. |
| 012 — Remove placeholders, debug surfaces, obsolete operation docs | Grounded in baseline R13/Q21/Q15/Q17. Correctly late after command/rendering/shell boundaries so deletion decisions are not premature. DELETE list covers README-only operation directories, debug operations, console debug logging, and obsolete TODOs. |
| 013 — Reconcile docs/specs with cleaned architecture | Grounded in baseline inventory/docs findings and project objective that docs/comments follow central structural work. Correctly last. DELETE list targets docs/specs/comments that preserve obsolete mental models. Success criteria require docs to match cleaned boundaries and validation commands. |

## Cross-plan assessment

### Baseline grounding

The plan consistently cites the signed-off baseline risk register, architecture map, domain-model corrections, and quality-report concerns. The highest-ranked baseline risks are represented in the earliest waves: `World` dependency inversion, god-modules, duplicate state ownership, persistence private casts, UI-to-operation leaks, weak contracts, process/dependency overlap, rendering concentration, backend contract drift, and architecture-test gaps.

### Centrality order

The order is architecturally sound. It starts with foundational domain/application and domain module boundaries, then authoritative state, persistence/command/undo, process ownership, UI command construction, rendering, app shell, backend contract stance, validation gates, cleanup, and docs. This follows the stated centrality rule and does not pull peripheral cleanup or docs ahead of central domain and contract work.

### Wave sizing and dependencies

Most waves are sized as one implementation cycle. The only visibly broad wave is Wave 006, but it contains an explicit scope guard requiring a reviewed wave-plan edit if canvas/tool and panel/toolbar cleanup cannot fit one controller boundary. Dependencies are explicit and generally prevent later waves from freezing stale architecture.

### DELETE lists and no-backcompat priority

Each wave contains an explicit DELETE list. The lists align with the project mandate to delete legacy code, shims, migration branches, placeholders, dead workspace files, and obsolete tests/docs rather than preserve compatibility paths.

### Success criteria and validation sufficiency

Each wave has concrete success criteria. The global validation baseline requires lint, focused Vitest, full Vitest, builds, e2e/Playwright where applicable, and live preview refresh. Individual waves also name focused tests and user-visible flows. This is sufficient for a plan-level artifact; implementation cycles must still record command outputs under each cycle’s validation directory.

### Phase 2 no-code-change compliance

`wave-plan.md` is a planning artifact only. This review found no indication that the wave-plan draft itself modifies application source code or instructs Phase 2 to perform code changes before dual-reviewer convergence and decision.

## Reviewer-A verdict

SIGN OFF — no further corrections required
