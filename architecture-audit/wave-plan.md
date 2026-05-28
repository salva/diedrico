# Diedrico Refactor Wave Plan

**Phase:** 2 — Wave plan  
**Basis:** signed-off Phase 1 baseline only (`architecture-audit/baseline/decision.md`).  
**Status:** draft for dual-reviewer convergence.  
**Source-code changes in this phase:** none.

## Planning principles

This plan orders waves by architectural centrality, not ease of implementation. The first waves establish the domain/application boundary and authoritative contracts because later persistence, rendering, tooling, UI composition, backend alignment, and documentation waves depend on those decisions. Each wave is intentionally scoped to fit one Phase 3 cycle: scope check, two proposals, dual-reviewer convergence, implementation, validation, preview refresh, and implementation log.

The signed-off baseline ranks the domain/application dependency inversion around `World` as the highest maintainability risk because `World` imports services and command/application classes while commands also import `World` (`architecture-audit/baseline/risk-register.md`, R1; `architecture-audit/baseline/architecture-map.md`, “Cross-layer leaks and circular/dependency inversions”). The same baseline identifies god-modules, duplicated state paths, persistence/private-cast coupling, UI-to-operation imports, broad `any` contracts, dead legacy workspace files, rendering concentration, disconnected backend validation, and weak architecture tests as the next central risks (`architecture-audit/baseline/risk-register.md`, R2–R13; `architecture-audit/baseline/quality-report.md`, Q1–Q22).

## Required loop discipline for every wave

After each completed wave:

1. Re-read the remaining plan entries against the current source tree.
2. Re-rank the remaining waves by architectural centrality and newly discovered evidence.
3. If a wave premise is invalidated, edit this `wave-plan.md` through a reviewed plan-edit mini-cycle before implementing the affected wave.
4. Do not pull peripheral UI/docs cleanup ahead of unresolved domain, contract, persistence, command/undo, rendering, or tool-state boundary work.
5. Preserve aggressive deletion: obsolete shims, dead files, placeholder docs, compatibility branches, and duplicate paths must be removed rather than wrapped.

## Validation baseline for implementation waves

Each implementation wave must run the mandatory validation cadence recorded under that wave’s `validation/` directory: root/workspace lint where defined, focused Vitest for touched modules, full Vitest, root/workspace build where defined, Playwright/e2e for frontend/user-facing/persistence/API changes, and live preview refresh/reachability probe. Waves that touch only documentation in later phases may justify skipping e2e only in their implementation log.

---

## Wave 001 — Invert the World/application boundary

**Scope**

- `frontend/src/domain/world/World.ts`
- `frontend/src/domain/world/Element2D.ts`
- `frontend/src/domain/world/styleService.ts`
- `frontend/src/domain/world/descriptors/`
- `frontend/src/domain/world/descriptors/DescriptorRegistry.ts`
- `frontend/src/domain/world/descriptors/registerDescriptors.ts`
- `frontend/src/main.ts` only to relocate runtime descriptor-registration composition if needed
- `frontend/src/services/DependencyService.ts` or its replacement location
- initialization command/factory paths currently coupled to `World` (`frontend/src/commands/operations/world/InitializationOps.ts`, `frontend/src/commands/factories/ProjectionSetupFactory.ts`, related app startup call sites)
- focused domain/application boundary tests

**Baseline grounding**

The baseline states that `World` is the canonical root but imports `DependencyService`, `Command`, initialization factories, process-tree operations, and `CommandStack` while commands import `World`, creating the most central inversion (`risk-register.md` R1; `domain-model.md` “Coupling observations”; `quality-report.md` Q3). It also identifies `Element2D.realize2D(world: World)` and `styleService` walking `World`/`ProcessTree` as domain-internal root coupling (`domain-model.md` corrections; `risk-register.md` R11). Baseline corrections also identify descriptor registration as a runtime composition point: `DescriptorRegistry.ts` maps element classes to descriptor logic and `registerDescriptors.ts` is invoked before app mount, so Wave 001 proposals must evaluate this coupling when removing application/service imports from the domain boundary (`inventory.md` corrections; `architecture-map.md` addendum).

**Target outcome**

`World` becomes a domain-owned model root with no imports from commands, command stacks, application services, Vue, or persistence. Initialization orchestration lives outside the domain root in an application/use-case layer. Domain realization, descriptor registration, and visibility dependencies are expressed through narrow domain ports/contexts rather than the whole `World` object where practical within this wave. If `styleService.ts` still needs process-tree-specific cleanup after the `World` dependency is removed, that residual ProcessTree ownership question is explicitly deferred to Wave 005 rather than hidden in this boundary wave.

**Explicit DELETE list**

- Delete `World.initialize(commandStack)` or any equivalent domain method that accepts command-stack/application infrastructure.
- Delete domain imports of `Command`, `CommandStack`, command factories, process-tree operation classes, and service-layer dependency helpers from `World.ts`.
- Delete dead compatibility comments or wrappers that preserve the old `World`-drives-commands initialization path.
- Delete tests that assert initialization must be invoked through `World` if they exist; replace with tests for the new application initializer.

**Success criteria**

- Static imports from `frontend/src/domain/world/World.ts` do not point to `frontend/src/commands/`, `frontend/src/services/`, Vue components, or stores.
- Application startup still creates the fixed P_H/P_V planes, hinge line, half-hinge lines, origins, and initial process-tree state.
- Focused tests cover the new initializer and prove `World` can be constructed as a pure domain object.
- Architecture test coverage is added or updated to prevent domain-to-command/service imports for the boundary established here.

**Dependencies**

None. This is the foundational wave.

---

## Wave 002 — Split the projection-plane domain god-module around stable domain responsibilities

**Scope**

- `frontend/src/domain/world/ProjectionPlane.ts`
- fixed-plane and auxiliary-plane classes currently embedded in that file
- realization types currently embedded in that file
- plane-owned element collection/add/remove helpers
- guide/intersection construction helpers only where necessary to preserve a clean split
- focused tests for projection-plane behavior and realizations

**Baseline grounding**

The baseline identifies `ProjectionPlane.ts` as a 1,797-line domain god-module combining realization classes, base abstraction, element maps/caches, dependency side effects, construction helpers, fixed planes, and auxiliary planes (`quality-report.md` Q2; `architecture-map.md` “God-modules”; `risk-register.md` R2). It also flags `realize2D(world: any)` / `realize3D(world: any)` as weak central contracts (`quality-report.md` Q8; `risk-register.md` R6).

**Target outcome**

Projection-plane responsibilities are separated into small domain modules with stable imports: realization value types, base plane abstraction, fixed projection planes, auxiliary projection planes, and element collection/ownership helpers. The split should reduce accidental coupling without changing the geometric model.

**Explicit DELETE list**

- Delete the monolithic all-in-one `ProjectionPlane.ts` structure once replacement modules exist.
- Delete `any` realization context signatures that are addressed by this split.
- Delete re-export barrels that exist only to hide the old monolith if no longer needed.
- Delete obsolete tests/imports that depend on all projection-plane types living in one file.

**Success criteria**

- Projection-plane modules have focused responsibilities and acyclic imports.
- Existing plane creation, realization, auxiliary-plane, guide, hinge-line, and intersection tests pass.
- No behavior change is introduced beyond import/module structure and stronger types.
- New or updated tests guard the extracted responsibilities.

**Dependencies**

Depends on Wave 001 so plane realization and side-effect boundaries are not split around stale `World` application coupling.

---

## Wave 003 — Establish one authoritative world state and delete dead store/workspace paths

**Scope**

- `frontend/src/stores/worldStore.ts`
- `frontend/src/components/workspace/Workspace2D.vue`
- `frontend/src/components/workspace/ElementRenderer.vue`
- `frontend/src/composables/useSnapping.ts`
- `frontend/src/composables/useElementGeometry.ts`
- `frontend/src/types/ElementTypes.ts` if it is only supporting legacy store/workspace paths
- any tests/fixtures tied only to the legacy store-backed geometry path

**Baseline grounding**

The baseline finds that canonical ownership is `World → ProjectionPlane → Element2D`, while `worldStore` separately stores 2D elements, 3D elements, guides, and a dependency graph (`domain-model.md`; `quality-report.md` Q11; `risk-register.md` R3). Corrections classify `Workspace2D.vue` as dead/uncompilable because it imports absent command-class modules, and `ElementRenderer.vue` as dead because it is only reached from `Workspace2D.vue` and depends on legacy store/types (`inventory.md` corrections; `quality-report.md` Q12 correction; `risk-register.md` R7 correction).

**Target outcome**

The application has one authoritative geometric state source: `World` and its projection planes. Store/composable paths may hold UI state or derived view models, but they no longer own parallel geometry maps. Dead workspace files and legacy structural element paths are removed.

**Explicit DELETE list**

- Delete `frontend/src/components/workspace/Workspace2D.vue`.
- Delete `frontend/src/components/workspace/ElementRenderer.vue`.
- Delete `frontend/src/stores/worldStore.ts` if no active non-legacy usage remains; otherwise delete its geometry ownership fields/actions and convert remaining usage to derived adapters.
- Delete legacy structural `ElementTypes` exports if they become unused.
- Delete tests that only validate the dead store-backed workspace path.

**Success criteria**

- No active source imports `Workspace2D.vue` or `ElementRenderer.vue`.
- No duplicated geometry ownership maps remain outside the domain model.
- Snapping/geometry composables either consume `World`/projection-plane read models or are deleted if obsolete.
- E2e construction, selection, snapping/hit-test-adjacent, and parametric update flows pass.

**Dependencies**

Depends on Waves 001–002 so the canonical domain root and plane ownership boundaries are clean enough to replace store-backed reads.

---

## Wave 004 — Define the command/undo and persistence contract, then delete migration/private-cast paths

**Scope**

- `frontend/src/commands/Command.ts`
- `frontend/src/commands/CommandStack.ts`
- `frontend/src/commands/operations/IOperation.ts`
- `frontend/src/commands/operations/**`
- `frontend/src/services/ProjectService.ts`
- focused serialization/determinism tests and persistence e2e specs

**Baseline grounding**

The baseline reports broad `Record<string, any>` operation serialization contracts, `ProjectService` imports of many concrete operations, a monolithic reconstruction switch, and private casts into command/world internals (`quality-report.md` Q6–Q7, Q16; `risk-register.md` R4, R6). It also notes current persistence is command-sourced: committed commands are serialized and deserialization reconstructs operations and replays into a fresh world/stack (`domain-model.md` “Persistence model”).

**Target outcome**

Command/undo exposes explicit typed APIs for inspection, restoration, and serialization. Persistence uses one chosen contract — typed operation descriptors/registry or a deliberate domain snapshot — without private-field casts, migration branches, corrupted-operation compatibility fallbacks, or broad `any` shapes at the main boundary.

**Explicit DELETE list**

- Delete `(cmd as any).operations`, `(world as any).nextId`, `(op as any).parameters`, `(commandStack as any).undoStack` patterns.
- Delete schema migration helpers, migration logging, and corrupted-operation compatibility fallbacks in `ProjectService` unless the reviewed proposal proves a current-format-only replacement requires a small typed upgrade step.
- Delete the monolithic operation reconstruction switch if replaced by a registry/descriptor contract.
- Delete obsolete serialization coverage tests that encode the old switch/private-cast architecture; replace with contract tests.

**Success criteria**

- Project save/open, local persistence, Drive-backed persistence where exercised, undo/redo after load, and deterministic replay/snapshot tests pass.
- Serialization contracts are discriminated and typed at the boundary chosen by the wave.
- `ProjectService` no longer imports every concrete operation solely to deserialize a project unless a reviewed registry design explicitly centralizes this dependency in a smaller contract module.
- No migration/backcompat code remains for discarded formats.

**Dependencies**

Depends on Waves 001–003 because persistence must target the cleaned authoritative domain model and not preserve duplicate store/dead workspace paths.

---

## Wave 005 — Clean process-tree/dependency ownership and remove deprecated process APIs

**Scope**

- `frontend/src/domain/processTree/ProcessTree.ts`
- `frontend/src/domain/processTree/Action.ts` and action creators
- dependency graph/service modules after Wave 001 relocation/cleanup
- process-tree operations under `frontend/src/commands/operations/processTree/`
- `frontend/src/components/panels/ActionsPanel.vue` only as needed to consume the cleaned boundary
- focused process-tree stack, dependency, undo/redo, and actions-panel tests

**Baseline grounding**

The baseline states that process history and dependency tracking overlap: `ProcessTree` still exposes deprecated `addAction()` and deprecated dependency queries while `DependencyService` is the active dependency boundary (`domain-model.md`; `quality-report.md` Q14; `risk-register.md` R7). `ActionsPanel.vue` also builds process-tree operations directly from UI (`architecture-map.md`; `risk-register.md` R5).

**Target outcome**

ProcessTree owns construction history only. Dependency queries live in the single dependency boundary established by earlier waves. UI panels consume application use-cases or typed process-tree commands rather than deprecated direct APIs.

**Explicit DELETE list**

- Delete `ProcessTree.addAction()` deprecated path.
- Delete `ProcessTree.getActionsDependingOnElement()` deprecated dependency query.
- Delete any operation or UI call sites that preserve those deprecated APIs.
- Delete tests that assert implicit action-group creation through deprecated methods.

**Success criteria**

- Process-tree insertion, subprocess stack behavior, action-group behavior, undo/redo, and dependency update tests pass.
- No deprecated process-tree dependency APIs remain in active source.
- Actions panel behavior remains user-visible equivalent while no longer depending on obsolete process/dependency overlap.

**Dependencies**

Depends on Wave 004 because process-tree mutations participate in command/undo and persistence contracts.

---

## Wave 006a — Canvas/tool command controllers

**Scope**

- `frontend/src/components/workspace/SvgCanvas.vue`
- `frontend/src/tools/**`
- `frontend/src/composables/useCommandExecution.ts` if it remains unused or must become a thin adapter around the new command-execution boundary
- command/sequence factories used by the active canvas/tool construction path, including relevant modules under `frontend/src/commands/factories/` and `frontend/src/services/factories/`
- application construction use-cases/tool-controller modules introduced for canvas construction, point movement, style updates, and command execution
- focused controller/use-case, tool interaction, undo/redo, and canvas behavior tests for the touched path

**Scope guard**

This wave is the immediate replacement for the original Wave 006 implementation slice required by `architecture-audit/cycle-006-ui-command-controllers/scope-check.md`. It is limited to the active canvas/tool surface. `ActionsPanel.vue` and `Toolbar.vue` are explicitly excluded except as named residual command leaks scheduled for Wave 006b. If implementation discovers a necessary change to those panel/toolbar surfaces, stop and run a reviewed plan-edit mini-cycle before broadening this wave.

**Baseline grounding**

The baseline flags UI components directly importing `Command` and concrete operations (`architecture-map.md` leak 3; `risk-register.md` R5; `quality-report.md` Q1, Q4, Q19). The Wave 006 scope check confirmed that the active canvas/tool path still constructs and executes commands directly: `SvgCanvas.vue` imports command/operation classes and pushes commands for point drag and style edits, tool classes receive `world` plus `commandStack`, `ArgumentCollectorTool` owns an open-command lifecycle, and concrete tools import factories and process-tree operations. The same scope check found that `ActionsPanel.vue` and `Toolbar.vue` are real but separate command-construction surfaces with distinct controller concepts and validation surfaces, requiring the 006a/006b split before implementation.

**Target outcome**

The active canvas/tool path has Vue components and tool interaction classes emit typed user intents, collected arguments, and interaction state while application use-cases/tool controllers own command construction, validation orchestration, command-stack execution, commit/rollback, feasibility checks, undo/redo lifecycle, point movement, and style update for canvas-driven construction. Tool/factory modules touched by that path have a coherent application-owned location and dependency direction. `ActionsPanel.vue` and `Toolbar.vue` remain known, intentional residuals for Wave 006b rather than accidental leftovers.

**Explicit DELETE list**

- Delete direct imports of `Command`, `CommandStack`, and concrete operations from `SvgCanvas.vue` for the canvas/tool path addressed by this wave, including point movement and style updates.
- Delete `Command`/`CommandStack` exposure from `ToolContext` and any active open-command tool execution APIs.
- Delete `Command`, concrete operation, process-tree operation, and UI-facing sequence-factory imports from `ArgumentCollectorTool.ts` and concrete tool files in the selected canvas/tool path.
- Delete duplicate or misleading factory layering for the selected canvas construction path, including the `commands/factories` versus `services/factories` split where the reviewed proposal replaces it with an application-owned command-construction/use-case location.
- Delete `frontend/src/composables/useCommandExecution.ts` if static search confirms it is unused by active source; otherwise delete its broad legacy executor shape and replace it with a thin typed adapter around the new boundary.
- Delete obsolete tests that mount tools/components to inspect concrete command internals; replace them with controller/use-case tests plus behavior tests.
- Do not delete or partially patch `ActionsPanel.vue`/`Toolbar.vue` command leaks in 006a; those are the explicit Wave 006b targets.

**Success criteria**

- `SvgCanvas.vue`, `ArgumentCollectorTool.ts`, `ITool.ts`, and the active concrete tool path no longer import concrete operation classes or push commands directly.
- Canvas construction, guide/sibling-guide creation, intersections, dynamic projection-plane setup, retained quick/3D tool flows, point drag/move, style editing, selection behavior, and undo/redo remain user-visible equivalent.
- Focused application construction/tool-controller/use-case tests cover the extracted command lifecycle independent of Vue rendering.
- Tool interaction tests assert masks/status/argument collection and emitted intents rather than command internals.
- Existing e2e construction, guide, intersection, dynamic-plane, selection, properties/style, point-move, and undo/redo flows pass as part of the mandatory validation cadence.
- `ActionsPanel.vue` and `Toolbar.vue` direct command/operation construction are explicitly cited in the implementation log as Wave 006b residuals if still present.

**Dependencies**

Depends on Waves 001–005 so command, process, persistence, and authoritative state boundaries are stable before moving canvas/tool command construction. Wave 006b depends on completion of this wave.

---

## Wave 006b — Panel/toolbar command-intent cleanup

**Scope**

- `frontend/src/components/panels/ActionsPanel.vue`
- `frontend/src/components/toolbars/Toolbar.vue`
- process-history edit use-cases/controllers needed by panel actions
- example/debug construction setup use-cases or deletion decisions for toolbar shortcuts such as Alt+E
- command-intent adapter modules introduced for panel/toolbar user actions
- focused process-history, panel/toolbar intent, retained example setup, and e2e behavior tests

**Scope guard**

This wave begins only after Wave 006a completes and its implementation log records any remaining panel/toolbar command leaks. It must not reopen the canvas/tool controller extraction except for consuming the stable application command/use-case boundary created in 006a. If the toolbar example construction is judged debug-only, prefer deletion over migrating a dead shortcut.

**Baseline grounding**

The baseline flags direct UI-to-command/operation imports as an architectural leak (`architecture-map.md` leak 3; `risk-register.md` R5; `quality-report.md` Q1, Q4, Q19). The Wave 006 scope check found that `ActionsPanel.vue` directly imports `Command` plus concrete process-tree operations and constructs/pushes commands in panel handlers, while `Toolbar.vue` directly imports `Command`, `CommandStack`, `Vector3`, and concrete world operations for the Alt+E example setup. The scope check also concluded these panel/toolbar paths are separate from canvas tools because they require process-history edit use-cases, debug/example construction decisions, and independent validation.

**Target outcome**

Panel and toolbar components emit typed user intents and render state only. Application use-cases own process-tree stack/action mutations, command creation, validation, and command-stack execution for panel actions. Toolbar example/setup behavior is either deleted as debug-only or routed through an explicit application construction/example use-case without direct concrete operation imports in the component.

**Explicit DELETE list**

- Delete `ActionsPanel.vue` imports of `Command` and concrete process-tree operations.
- Delete `ActionsPanel.vue` component methods that assemble command internals; replace them with typed process-history/application intent calls.
- Delete `Toolbar.vue` imports of `Command`, `CommandStack`, `Vector3`, `AddFreePoint2DOp`, `AddLine2DByTwoPointsOp`, and any other concrete command/operation construction dependencies used only by the Alt+E/example setup path.
- Delete the Toolbar Alt+E example/debug shortcut entirely if review/implementation determines it is not user-facing architecture worth preserving.
- Delete panel/toolbar tests that inspect command internals or rely on debug/example construction details; replace them with use-case/controller tests and behavior/e2e coverage for retained flows.
- Delete any duplicate panel/toolbar factory layers that duplicate the 006a command-construction/use-case boundary.

**Success criteria**

- `ActionsPanel.vue` and `Toolbar.vue` no longer directly create `Command`s, instantiate concrete operations, or push command-stack entries.
- Process-tree action edits from the panel remain user-visible equivalent and are covered by focused use-case/controller tests plus undo/redo behavior where applicable.
- Any retained toolbar example/setup behavior is covered by focused tests and e2e/live smoke; if deleted, no active UI, test, or documentation path references the shortcut.
- No new command-construction boundary parallel to 006a is introduced; panel/toolbar code consumes the stable application/use-case boundary or a clearly separate process-history use-case boundary.
- Mandatory validation cadence, relevant e2e flows, and live preview refresh/probe pass.

**Dependencies**

Depends on Wave 006a so panel/toolbar cleanup can consume the stable command-execution/use-case boundary established for canvas/tools. Wave 007 remains after 006a and 006b so rendering selectors are not extracted while unresolved central UI command-controller leaks remain.

---

## Wave 007 — Extract 2D rendering selectors and renderer adapters

**Scope**

- `frontend/src/services/PaperService.ts`
- `frontend/src/services/SVGRenderer.ts`
- `frontend/src/services/RenderService.ts`
- `frontend/src/components/workspace/SvgCanvas.vue`
- `frontend/src/domain/presentation/Paper.ts`
- style/visibility selectors after earlier domain cleanup
- focused Paper/SVG rendering tests and visual/e2e smoke tests

**Baseline grounding**

The baseline identifies `PaperService` as a 993-line hotspot importing domain objects, world types, presentation primitives, style resolution, and geometry helpers, while `RenderService` contains test-only paths and production uses `SVGRenderer` (`architecture-map.md`; `quality-report.md` Q13, Q15; `risk-register.md` R8). `SvgCanvas.vue` is the primary 2D rendering/controller god component (`quality-report.md` Q1).

**Target outcome**

2D rendering consumes explicit view-model/selector DTOs derived from the domain. Renderer adapters turn DTOs into `Paper`/SVG primitives. Domain objects no longer leak ad hoc rendering decisions into the canvas path.

**Explicit DELETE list**

- Delete test-only rendering functions from production `RenderService` if not needed after adapter extraction.
- Delete rendering TODO branches that become obsolete or are replaced by explicit selector behavior.
- Delete direct canvas rendering access to raw domain internals where selector DTOs replace it.
- Delete duplicate render special cases preserved only for old paths.

**Success criteria**

- 2D canvas output and hit-relevant behavior remain correct in focused and e2e tests.
- Paper/SVG services have smaller, rendering-only responsibilities.
- Style/visibility decisions are explicit selector outputs, not scattered through renderer internals.

**Dependencies**

Depends on Waves 001–006 because selectors must target the cleaned domain/use-case boundaries and should not preserve UI operation construction.

---

## Wave 008 — Extract 3D rendering scene adapters from `ThreeView.vue`

**Scope**

- `frontend/src/components/panels/ThreeView.vue`
- `frontend/src/services/Element2DRenderer3D.ts`
- `frontend/src/config/rendering3D.ts`
- Three.js scene/geometry/label helper modules to be created or reorganized
- focused 3D renderer tests where practical and e2e/live preview checks

**Baseline grounding**

The baseline identifies `ThreeView.vue` as a 1,201-line god component combining scene setup, projection-plane rendering, 2D-on-3D rendering, 3D elements, guide geometry, hinge lines, animation, resize, cleanup, domain realization access, and store access (`quality-report.md` Q5; `architecture-map.md`; `risk-register.md` R8).

**Target outcome**

`ThreeView.vue` becomes a lifecycle/composition shell over scene adapters/selectors. Three.js scene setup, projection-plane meshes, labels, guide/hinge geometry, and domain-to-view conversion are isolated in focused modules.

**Explicit DELETE list**

- Delete large inline geometry/mesh construction helpers from `ThreeView.vue` after extraction.
- Delete store access from 3D rendering if remaining only from the legacy world-store path.
- Delete duplicated 2D/3D rendering special cases that are replaced by shared selector DTOs.

**Success criteria**

- Three-view renders projection planes, hinge lines, guides, 2D-on-plane elements, and reconstructed 3D elements as before.
- `ThreeView.vue` no longer owns low-level geometry construction and scene-object special cases directly.
- E2e/live preview verifies representative 3D view behavior.

**Dependencies**

Depends directly on Waves 003 and 007 so 3D rendering does not depend on deleted store paths and can share selector patterns with 2D rendering; through Wave 007 it also transitively depends on Waves 001–006 and their cleaned domain/use-case boundaries.

---

## Wave 009 — Extract application shell services from `App.vue`

**Scope**

- `frontend/src/App.vue`
- project lifecycle/open/save/autosave orchestration
- selection/delete/select-all/keyboard orchestration
- active-plane and 3D-view coordination
- Drive/local project service integration boundaries
- relevant stores and composables
- focused app-shell/use-case tests plus persistence/e2e smoke tests

**Baseline grounding**

The baseline classifies `App.vue` as a god shell that creates `World`, `CommandStack`, Drive service, local project state, autosave timers, keyboard/delete/select-all behavior, active-plane state, project lifecycle, and command coordination (`quality-report.md` Q4; `architecture-map.md` “Entry points and workspace boundaries”; `risk-register.md` R2, R5).

**Target outcome**

`App.vue` composes UI regions and delegates project lifecycle, autosave, Drive/local storage, keyboard command routing, and selection/delete behavior to focused application services/composables with typed interfaces.

**Explicit DELETE list**

- Delete inline project lifecycle/autosave/keyboard orchestration from `App.vue` once moved.
- Delete `window as any` handlers introduced only to bridge shell internals, replacing with typed browser integration boundaries.
- Delete debug/error TODO stubs that are not implemented by the extracted services.

**Success criteria**

- App shell is materially smaller and composition-focused.
- Open/save/autosave/new-project/delete/select-all/active-plane flows remain covered by focused tests and e2e.
- Browser/global interactions have typed boundaries where touched.

**Dependencies**

Depends on Waves 004, 006, 007, and 008 so shell extraction delegates to stable persistence, use-case, and rendering boundaries.

---

## Wave 010 — Resolve backend/frontend project-contract architecture

**Scope**

- `backend/src/models/Project.ts`
- `backend/src/api/projects.ts`
- `backend/src/storage/**`
- `backend/tests/**`
- frontend direct backend import in `frontend/src/components/dialogs/OpenProjectDialog.vue`
- root and workspace package scripts if backend remains active
- optional shared contract package/module if chosen by reviewed proposal

**Baseline grounding**

The baseline finds the backend is a parallel/disconnected Express/file-storage path with broad `any` DTOs, root scripts skip backend validation, and the frontend imports `ProjectMetadata` directly from backend source while using frontend `ProjectService`/Drive rather than backend routes (`architecture-map.md` backend sections and corrections; `quality-report.md` Q9, Q18, Q20, Q22; `risk-register.md` R9, R12).

**Target outcome**

The project has one explicit backend stance: either delete the unused backend/project API from the active architecture, or make it a real validated boundary with a shared typed contract and root validation. Do not preserve a disconnected backend plus frontend source import leak.

**Explicit DELETE list**

- Delete the direct frontend import from `backend/src/models/Project` regardless of chosen backend stance.
- If backend is unused, delete backend routes/models/storage/tests and workspace references instead of preserving a stale server.
- If backend remains active, delete broad backend DTO `any` fields in favor of shared contract types and add backend to root validation.
- Delete docs/spec references that describe a backend project API no longer present.

**Success criteria**

- No frontend code imports backend implementation files by relative monorepo path.
- Backend is either removed from the active workspace or included in root lint/build/test with typed contracts.
- Frontend persistence architecture is consistent with the decision made in Wave 004.

**Dependencies**

Depends on Wave 004 because backend project DTOs must align with the chosen frontend persistence contract, and on Wave 009 if app shell persistence routing is moved first.

---

## Wave 011 — Tighten architecture tests and root validation gates

**Scope**

- `frontend/tests/unit/architecture/**`
- root `package.json`
- `frontend/package.json`
- `backend/package.json` if backend remains active
- test helpers for import-boundary assertions
- CI/local validation documentation only where needed for test commands

**Baseline grounding**

The baseline says existing architecture tests cover narrow rules (no command subclasses and serialization coverage) while allowing broader violations: domain-to-command/service imports, UI-to-operation imports, and duplicate store/domain ownership (`quality-report.md` Q19; `risk-register.md` R10). It also reports root scripts skip backend despite workspaces declaring frontend and backend (`quality-report.md` Q18; `risk-register.md` R9).

**Target outcome**

The cleaned boundaries from previous waves are enforced by tests and package scripts so architectural erosion is caught early. Root validation reflects the actual active workspaces.

**Explicit DELETE list**

- Delete architecture tests that encode obsolete boundaries from pre-refactor structure.
- Delete root scripts that silently skip active workspaces.
- Delete stale test fixtures/helpers tied to removed legacy paths.

**Success criteria**

- Architecture tests fail on domain-to-command/service imports, UI-to-operation imports, duplicate geometry state ownership, and forbidden frontend→backend implementation imports according to the boundaries established by earlier waves.
- Root lint/build/test cover all active workspaces.
- Full validation cadence passes.

**Dependencies**

Depends on Waves 001–010 so tests freeze the cleaned target architecture, not the current violated one.

---

## Wave 012 — Remove vacant placeholders, noisy debug surfaces, and obsolete operation docs

**Scope**

- `frontend/src/commands/operations/paper/README.md`
- `frontend/src/commands/operations/toolbar/README.md`
- debug-only operation paths such as `frontend/src/commands/operations/debug/` if no longer active
- debug logging in `frontend/src/App.vue`, `frontend/src/services/ProjectService.ts`, `frontend/src/services/PaperService.ts`, `frontend/src/services/GoogleDriveService.ts`
- TODOs made obsolete by earlier waves
- focused tests only where deletion touches runtime behavior

**Baseline grounding**

Corrections identify `paper/` and `toolbar/` operation directories as README-only future-operation placeholders and deletion candidates (`inventory.md` corrections; `quality-report.md` Q21; `risk-register.md` R13). The baseline also flags TODOs in user-facing rendering/feedback paths and debug logging across app/service code (`quality-report.md` Q15, Q17).

**Target outcome**

The active source tree contains no aspirational placeholder operation families, no obsolete TODO branches from refactored paths, and no routine debug logging that obscures boundaries or risks leaking integration metadata.

**Explicit DELETE list**

- Delete `frontend/src/commands/operations/paper/` if still README-only.
- Delete `frontend/src/commands/operations/toolbar/` if still README-only.
- Delete debug operation directories/files if not used by validated current behavior.
- Delete routine console debug logging and obsolete TODO stubs in touched modules.

**Success criteria**

- No README-only operation subdirectories remain.
- No debug logging remains in normal app/persistence/rendering/Drive paths except explicitly justified error logging.
- Tests and e2e confirm no deleted debug/example path was required for normal behavior.

**Dependencies**

Depends on Waves 004, 006, 007, and 009 so placeholder/delete decisions are made after command, rendering, and shell boundaries are settled.

---

## Wave 013 — Reconcile docs/specs with the cleaned architecture

**Scope**

- `docs/architecture/**`
- `docs/api/**`
- `docs/guide/**`
- `docs/contributing/testing.md`
- `specs/001-dihedral-learning-mvp/**` only if still referenced by current code/docs and not obsolete
- source comments that cite obsolete docs/specs in touched areas

**Baseline grounding**

The baseline inventories the current `specs/001-dihedral-learning-mvp/` tree and the docs areas under `docs/architecture/`, `docs/api/`, `docs/guide/`, and `docs/contributing/testing.md` (`inventory.md` Specs and Docs sections). It also notes that current code comments still cite the original MVP spec for world/process/command concepts and that README-only operation placeholders are deletion candidates (`inventory.md` corrections; `quality-report.md` Q21; `risk-register.md` R13). Earlier objectives require docs/comments waves after central domain, persistence, rendering, tool-state, and UI composition work.

**Target outcome**

Documentation describes the architecture that now exists after the refactor waves. Obsolete specs, architecture pages, comments, and examples that preserve old mental models are deleted or rewritten.

**Explicit DELETE list**

- Delete docs pages that describe removed legacy state paths, command subclass assumptions, placeholder operation families, or disconnected backend behavior.
- Delete source comments that cite obsolete architecture/spec claims.
- Delete spec artifacts that are no longer authoritative and are not referenced by current docs/code after review.

**Success criteria**

- Docs match the cleaned module boundaries and validation commands.
- No documentation encourages use of deleted APIs, legacy stores, command subclasses, migration shims, or backend paths that no longer exist.
- Documentation build passes.

**Dependencies**

Depends on all earlier structural waves. Docs/comments intentionally come last so they do not freeze an intermediate architecture.

---

## Wave 014 — Establish validation contract ownership and delete invalid gates

**Scope**

- Validation authority map for the current mandatory gates:
  - root/frontend `test`, `build`, `test:e2e`, and `lint` scripts (`package.json:13-21`, `frontend/package.json:8-16`)
  - Wave 013 validation failures and logs (`architecture-audit/cycle-013-docs-specs-reconciliation/validation/final-validation-summary.stdout`)
- Contract-owned repair/delete decisions for the currently red validation surfaces:
  - intersection domain tests/source (`frontend/src/domain/calculations/Intersections.ts`, `frontend/tests/unit/calculations/intersections.spec.ts`), beginning with an audited active caller inventory and selected result-contract statement
  - PropertiesDialog component tests/source (`frontend/src/components/dialogs/PropertiesDialog.vue`, `frontend/tests/unit/components/propertiesDialog.spec.ts`)
  - guide integration file (`frontend/tests/integration/guide-creation.test.ts`)
  - broad Playwright keyboard/selection-mask specs (`frontend/tests/e2e/keyboard-shortcuts.spec.ts`, `frontend/tests/e2e/selection-mask.spec.ts`)
  - build/type-check tooling (`frontend/package.json`, lockfile/tool metadata if needed)
- Narrow architecture-test or validation-health assertions only if they prevent recurrence of corrupted specs, zero-test files, or unsupported build-tool/runtime combinations evidenced by the current red gates.

**Scope guard**

This wave owns validation contracts, not product redesign. It may create small validation-health checks, but it must not add a large custom test runner, broad allowlist framework, generalized validation platform, parallel build/test toolchain, or sweeping cleanup of unrelated test debt. Recurrence checks are allowed only for the exact invalid artifact classes evidenced by the current red gates: corrupted Playwright parse artifacts, zero-test/placeholder integration files, and unsupported build-tool/runtime combinations. If a red surface has no current product/architecture owner, delete the stale test and replace it with a smaller current-owner test rather than preserving historical coverage theater.

Intersection ownership is deliberately bounded. Implementation must first enumerate every active caller and test assumption for the line-line intersection API, then record a selected contract statement choosing one result model for non-intersection cases: nullable result, infeasible realization, or discriminated result. Only source/tests directly affected by that selected contract may change in Wave 014. If that caller inventory proves the right fix is a deeper geometry/domain-model redesign, Wave 014 implementation must stop and trigger a reviewed plan-edit mini-cycle; the redesign must not be hidden under validation contract ownership.

PropertiesDialog and guide integration work is limited to deciding whether the current files express valid UI/integration contracts. Repair current contract tests or delete/replace stale ones, but do not expand into a broad dialog redesign, guide-domain redesign, selector cleanup, or general UI test rewrite.

**Target outcome**

Every mandatory gate has an explicit current owner and current contract:

- Domain correctness tests assert the intersection contract actually used by domain/application code, after caller inventory and a selected contract statement.
- UI component tests assert current emitted events/props or are deleted/replaced if obsolete.
- Integration tests contain executable behavior, not placeholder comments.
- Playwright specs parse and exercise current user-facing flows, not corrupted phase-era fragments.
- Build tooling supports the active Node/TypeScript/Vue stack or the runtime/toolchain is explicitly constrained by scripts/docs.

The result should still be green root/frontend Vitest, build, and e2e, but the primary outcome is a cleaned validation architecture that future waves can trust. Validation contract ownership remains distinct from central domain correctness, tooling compatibility, and stale/corrupted test artifacts: this wave may align those contracts where they block mandatory gates, but it may not convert them into a broad validation framework or unrelated source refactor.

**Explicit DELETE list**

- Delete corrupted Playwright preambles, duplicated reversed blocks, orphaned test bodies, and stale spec-reference comments from `keyboard-shortcuts.spec.ts` and `selection-mask.spec.ts`.
- Delete zero-test/placeholder-only integration cases from `guide-creation.test.ts`; convert only current behavior into real executable tests.
- Delete stale unit expectations for PropertiesDialog if they no longer represent current UI contract.
- Delete obsolete test helpers/fixtures revealed as supporting only corrupted or deleted specs.
- Delete or replace Node/tooling combinations that cannot support the active build gate; do not keep an unused alternative build path, parallel type-check script, or compatibility shim.
- Delete any new skip/todo/allowlist introduced merely to make the suite appear green.

**Success criteria**

- A short validation-ownership note in the implementation log classifies each former red surface as domain, UI component, integration, e2e, or tooling ownership and cites the resolved file(s).
- The implementation log includes the intersection caller inventory and selected contract statement before reporting any intersection source/test updates.
- No Vitest file is collected as `0 test` unless intentionally configured as a helper/non-test file outside test discovery.
- Playwright does not fail during parsing and covers current keyboard shortcuts and selection masks, or deleted stale specs are replaced by current smaller specs.
- Root and frontend `npm run test`, `npm run build`, and `npm run test:e2e` pass.
- Playwright MCP/live browser verification exercises the repaired/replaced keyboard shortcut and selection-mask flows against the refreshed preview.
- Live preview is refreshed on `0.0.0.0:5173` and returns HTTP 200, with evidence captured under the implementation cycle validation logs.
- Any new architecture/static check is narrow and prevents recurrence of the exact class of invalid validation artifact, not a broad maintenance framework.

**Validation plan**

1. Static discovery check for zero-test files and Playwright parse errors before full runs.
2. Verification that the implementation log records the intersection caller inventory and selected contract statement.
3. Focused domain/UI/integration Vitest for the repaired/deleted red surfaces.
4. Focused Playwright for repaired/replaced keyboard shortcut and selection-mask flows.
5. Mandatory root/frontend lint, full Vitest, build, e2e.
6. Refresh the live preview bound to `0.0.0.0:5173`, capture an HTTP 200 reachability probe, and run Playwright MCP/live browser checks for the repaired/replaced keyboard shortcut and selection-mask user flows.

**Risks**

- This framing can overreach if it attempts to redesign the full validation system. Keep it bounded to known red gates and recurrence checks for exact invalid artifact classes only.
- Deleting stale e2e coverage may feel like reducing coverage, but corrupted tests currently provide no coverage because Playwright aborts before browser execution.
- If the intersection mismatch is a true source defect, the wave must fix the selected domain contract consistently rather than simply rewriting tests.
- If the intersection caller inventory reveals a deeper geometry/domain-model redesign is necessary, the wave must stop for a reviewed plan edit before implementation continues.
- Build-tooling repair may still require dependency/runtime decisions; implementation must not preserve parallel toolchains or suppress failures.

**Dependencies**

Depends on Waves 001–013 and should precede any subsequent source refactor wave, because it establishes trustworthy validation ownership for future changes.

---

## Wave 015 — Converge frontend TypeScript contracts around owned boundaries

**Scope**

This wave is bounded to the exact active TypeScript build backlog produced by `architecture-audit/cycle-014-validation-contract-ownership/validation/frontend-build.after5.stdout` and only the direct type/contract-owner dependencies required to eliminate those exact errors honestly. It may touch source/tests/package metadata only where a current build error or its direct owner contract requires convergence of the following boundaries; nearby files, adjacent cleanup, naming/formatting improvements, and unrelated architecture normalization are out of scope:

1. **App shell and service-port boundary**
   - `frontend/src/App.vue`
   - auth/project/Drive service port definitions and Vite ambient env typing if present/needed
   - app lifecycle tests where behavior changes
2. **Command descriptor and operation boundary**
   - `frontend/src/commands/factories/**`
   - `frontend/src/services/factories/**`
   - `frontend/src/commands/operations/**`
   - operation descriptor/result/serialization types
   - focused command/factory/serialization tests
3. **Process-tree action boundary**
   - `frontend/src/domain/processTree/**`
   - process-tree command operations
   - process store and panels that render action/process-node data
   - focused process-tree/panel tests where behavior changes
4. **Projection-plane/world context boundary**
   - `frontend/src/domain/world/World.ts`
   - `frontend/src/domain/world/projectionPlane/**`
   - 2D element realization signatures and mutation/realization context ports
   - world operations that add/remove/realize projection-plane elements
   - focused domain tests for projection-plane context behavior
5. **UI rendering/store DTO boundary**
   - `frontend/src/components/dialogs/**`
   - `frontend/src/components/toolbars/**`
   - `frontend/src/components/workspace/SvgCanvas.vue`
   - hover/view/tool stores and rendering primitive DTO definitions
   - focused component/rendering tests where behavior changes
6. **Service/domain strictness cleanup required by build**
   - `frontend/src/services/**`
   - `frontend/src/composables/**`
   - `frontend/src/domain/calculations/**`
   - `frontend/src/domain/world/{Circle,Line,Segment}.ts`

If a file has no current `vue-tsc` error and is not a direct owner dependency of a build-error fix, leave it for the existing ordered waves. If a fix reveals a redesign not necessary to make the current build pass honestly, stop for a reviewed delta/mini-cycle instead of expanding Wave 015.

**Target outcome**

The frontend source tree compiles for the current `frontend-build.after5.stdout` error set because cross-layer contracts are explicit and owned, not because errors were hidden. `npm run build --workspace=frontend` succeeds using the existing `vue-tsc && vite build` script, and any root build path succeeds where defined. Each of the six scope boundaries has a concise ownership note in the implementation log describing authoritative types/interfaces after the wave, stale exports/fields/call sites deleted, behavior-bearing tests, and residual architectural questions deferred to future waves.

The result is a trustworthy TypeScript/build gate that future architecture waves and the deferred Wave 014 validation closure can rely on.

**Explicit DELETE list**

Delete stale surfaces proven by the current build log and only where deletion directly resolves a current error, including but not limited to:

- removed action model exports and call sites: `ConstructiveAction`, `ActionType`, stale `Action.id`, `Action.infeasible`, `Action.infeasibilityReason`, `Action.actionType`, and `Action.timestamp` assumptions.
- stale process-node field reads (`inputs`, `outputs`, `name`) where the current discriminated node model does not guarantee them.
- stale command operation serialization fields that are not owned by the class, including `circleId`/`tangentIndex` on parallel/perpendicular line operations if still present.
- stale `JsonValue | undefined` descriptor plumbing where a typed descriptor or validation guard is the correct boundary.
- stale service singleton imports such as `projectService` where only `ProjectService` is exported.
- wrong-cased or removed imports such as `../domain/calculations/intersections`, `Plane3DCoordinateSystem`, and `Element2D` from the wrong module.
- stale renderer/store API reads such as `ProjectionPlane.getArc`, `Primitive.geometry`, missing hover `temporary`, and removed tool-store methods.
- frontend CommonJS `require` usage.
- compatibility wrappers, synthetic fields, broad `any`, `@ts-ignore`, `@ts-expect-error`, custom build allowlists, alternate build scripts, or TypeScript config relaxations added only to force build success.
- dead helper code or tests whose only purpose is to preserve stale type surfaces revealed by the current build errors.

**Anti-overreach constraints**

- Build-log bound: only fix or delete errors from the current `vue-tsc` build and direct contract-owner dependencies that emerge while fixing them.
- Boundary-first: for repeated errors in one category, fix the owner contract once instead of casting each call site.
- No compatibility theater: do not add removed fields back to domain models solely for stale UI/store code; align consumers to current authoritative contracts or delete dead paths.
- No suppression: do not weaken `tsconfig`, disable strict/unused checks, introduce blanket `as any`, add ignore comments, or create a parallel build path.
- Expansion stop rule: if a category requires conceptual redesign beyond honest closure of current build errors, stop and write a reviewed delta/mini-cycle proposal before continuing.
- Residual handling: non-build architectural findings discovered during Wave 015 are future-wave candidates only and must not authorize unrelated API normalization or cleanup inside Wave 015.

**Wave 014 repair protection**

Wave 015 depends on and preserves the Wave 014 scoped repairs. Do not revert or reopen these surfaces unless a specific current build error is causally traced to them and documented in the Wave 015 implementation log:

- `frontend/tests/unit/calculations/intersections.spec.ts`
- `frontend/src/components/dialogs/PropertiesDialog.vue`
- `frontend/tests/unit/components/propertiesDialog.spec.ts`
- `frontend/tests/integration/guide-creation.test.ts`
- `frontend/tests/e2e/keyboard-shortcuts.spec.ts`
- `frontend/tests/e2e/selection-mask.spec.ts`
- the `frontend/package.json` `vue-tsc` build-gate upgrade

**Success criteria**

- `npm run build --workspace=frontend` passes using the existing `vue-tsc && vite build` script.
- Root build passes where defined; if root build is absent or delegates differently, the implementation log records the exact root command status and package-script evidence.
- All six build-failure boundary categories from `scope-check.md` are represented in the implementation ownership map, with explicit fixed/deleted status for current errors and future-wave notes for non-build discoveries. Residual status cannot include active TypeScript build errors.
- No type-safety downgrade, parallel build script, allowlist, ignore comment, or compatibility shim is introduced to silence `vue-tsc`.
- Focused tests cover behavior-bearing changes in command/operation descriptors, process-tree action rendering, projection-plane/world context semantics, app/service ports, and rendering/store DTOs. Pure dead-import/dead-call-site deletions may rely on build plus existing tests.
- The implementation log records any architectural issues discovered that should become future waves, without expanding Wave 015 beyond current build-contract ownership.
- No committed Wave 014 scoped repair is reverted or reopened unless the direct causal-link rule above is satisfied.

**Validation requirements**

1. Capture a fresh failing `npm run build --workspace=frontend` before edits to ensure the backlog has not changed.
2. Run focused Vitest for every behavior-bearing boundary changed.
3. Run `npm run lint` at root and `npm run lint --workspace=frontend` where defined.
4. Run root and frontend full Vitest.
5. Run root and frontend build; build success is mandatory.
6. Run frontend e2e and root e2e where defined because UI/app/service/rendering contracts may change.
7. Refresh the live preview on `0.0.0.0:5173`, capture HTTP 200, and run Playwright MCP/live smoke through project creation/rendering/selection enough to prove the compiled app starts.

All stdout/stderr must be captured under the Wave 015 validation directory. If any command is undefined at root, record exact package-script evidence instead of silently skipping.

**Risks**

- Superficial casts could pass build while worsening architecture; implementation and review must reject suppressions and compatibility shims not justified by a real boundary contract.
- Projection-plane/world context and process-tree categories may still require a larger redesign; enforce the expansion stop rule rather than smuggling later waves into Wave 015.
- Process-tree UI may be stale/dead; static-search usage before preserving any panel/store path, and delete dead paths rather than rebuilding obsolete fields.
- Command descriptor fixes may alter persistence/undo behavior; run focused command serialization/undo tests for touched operations and e2e if user-visible flows change.
- Wave 015 delays Wave 014 closure, but it exists only because Wave 014 cannot honestly close while the active build gate is red.

**Dependencies**

Depends on Wave 014 implementation commits `1b1f37cbbb8fb8da96645c40160fce0384a5b316` and `806e1ac754899d0ad6d0322afd6b4a35a77d0f12`, because those scoped repairs and the `vue-tsc` update reveal the real build backlog. Must complete before `cycle-014-validation-and-preview-refresh`, because Wave 014 success criteria require root/frontend build success and live preview refresh.

**Return-to-Wave-014 closure plan**

After Wave 015 completes, do not proceed to an unrelated refactor wave. Re-enter `cycle-014-validation-and-preview-refresh` and run the full Wave 014 validation cadence with stable logs against the source tree containing both Wave 014 scoped validation repairs and Wave 015 build/type-contract repairs: root/frontend lint where defined, focused and full Vitest, root/frontend build, root/frontend e2e/Playwright, live preview refresh on `0.0.0.0:5173` with HTTP reachability probe, and Playwright MCP/live checks for the repaired keyboard-shortcut and selection-mask flows. Close Wave 014 only if those mandatory gates pass.

---

## Wave 016 — Canvas presentation read ports and overlay interaction boundary

**Scope**

- `frontend/src/application/canvasPresentation/CanvasPresentationController.ts`
- `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts`
- `frontend/src/application/canvasPresentation/CanvasPresentationModel.ts`
- `frontend/src/application/canvasPresentation/CanvasInteractionQuery.ts`
- `frontend/src/application/canvasPresentation/CanvasVisibilityPolicy.ts`
- `frontend/src/application/canvasPresentation/CanvasStylePolicy.ts`
- a new narrow canvas presentation read-port module such as `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts`
- a named projected-3D-on-2D adapter such as `frontend/src/application/canvasPresentation/Projected3DCanvasSelector.ts`
- `frontend/src/application/threePresentation/*` only where shared overlay/projection DTO ownership is needed
- `frontend/src/rendering/threeView/*` only where explicit pointer-event/overlay boundary behavior is needed
- `frontend/src/components/workspace/SvgCanvas.vue`
- `frontend/src/components/panels/ThreeView.vue`
- `frontend/src/domain/presentation/Paper.ts` only if static usage proves its mutable query responsibilities are obsolete
- focused unit tests under current canvas/three presentation test locations and current-contract e2e/live checks if overlay behavior changes

**Scope guard**

This wave replaces the now-invalid old Wave 007/008/009 premises rather than continuing them literally. The old Wave 007 named `PaperService.ts` and `RenderService.ts`, but current scout evidence says those files are absent and the active rendering path is `SVGRenderer.ts` plus `canvasPresentation/*`. The old Wave 008 assumed a large `ThreeView.vue` extraction, but current `ThreeView.vue` is already a small runtime shell. The old Wave 009 app-shell god-component premise is also mostly invalidated by the current `App.vue` runtime/action composition. Therefore this wave is the next central post-Wave-015 source boundary: active canvas presentation still receives full `World`, contains `any` seams, embeds projected-3D-on-2D ownership, and has user-observable overlay pointer interception that validation previously routed around.

Do not reopen broad rendering, 3D scene, app-shell, command, persistence, backend, package/tooling, docs/spec, or validation-platform redesigns inside this wave. If implementation discovers those areas are required, stop and run a reviewed plan-edit mini-cycle before broadening scope.

**Target outcome**

The 2D canvas presentation path consumes explicit narrow read ports/DTOs instead of a full mutable `World`; 2D primitive selection, projected-3D-on-2D projection, hit/query input, style policy, visibility policy, and overlay event ownership have named modules with one responsibility each. Broad `any` helper seams in active presentation code are deleted rather than cast over. The 3D overlay either deliberately owns pointer interaction in its region or deliberately allows underlying canvas interaction; that contract is encoded in source and tests instead of hidden in e2e click-coordinate workarounds.

**Explicit DELETE list**

- Delete `CanvasPresentationController.buildModel(world: World, ...)` or any equivalent full-`World` selector API once the reviewed read port is introduced.
- Delete `CanvasPresentationSelector` helper signatures that use `any`, including untyped primitive/kind and plane-transform helper seams.
- Delete direct projected-3D rendering loops from `CanvasPresentationSelector` when moved to a named projected-3D canvas selector/adapter.
- Delete obsolete selector tests that instantiate concrete `World` only to inspect traversal internals; replace them with read-port/DTO tests.
- Delete mutable/spatial-query responsibilities from `frontend/src/domain/presentation/Paper.ts` only if static usage and focused tests prove `CanvasInteractionQuery` is the active query owner.
- Delete e2e workarounds that avoid overlay interception if the implementation changes overlay input ownership; replace them with current behavior contracts.
- Delete any compatibility wrapper, dual full-`World`/read-port path, broad presentation facade, or dead export created during the transition.

**Success criteria**

- Canvas presentation selectors/controllers no longer depend on a full mutable `World` where a narrow read port/DTO is sufficient.
- Active `CanvasPresentationSelector` helper seams no longer use `any` for primitive/kind or plane-transform data.
- Projected-3D-on-2D rendering has an explicit owner outside the general 2D selector loop, or the implementation log explains with reviewed evidence why the owner remains there.
- Overlay pointer ownership is inventoried against current `ThreeView`/three-rendering handlers before any behavior change, then covered by focused e2e/live evidence if user-observable behavior changes.
- No broad rendering platform, shared god snapshot factory, app-shell redesign, command/persistence/backend change, package/tooling change, or stale audit-history dependency is introduced.
- Mandatory validation cadence passes with stable logs: root/frontend lint where defined, focused Vitest for touched presentation/query modules, full root/frontend Vitest, root/frontend build, root/frontend e2e when user-facing overlay/canvas behavior changes, live preview refresh on `0.0.0.0:5173`, HTTP reachability probe, and Playwright/live browser evidence for the affected canvas/overlay region when applicable.

**Dependencies**

Depends on Wave 015 and the subsequent Wave 014 validation closure, because this wave relies on the now-green TypeScript/build/test/e2e gates and on the extracted command/use-case, rendering, and validation contracts produced by earlier cycles. It is ordered before any remaining peripheral docs/debug cleanup because it is the most central current user-input/rendering boundary left after Wave 015.

**Validation requirements**

1. Capture static scans for full-`World` canvas presentation APIs, `CanvasPresentationSelector` `any` seams, projected-3D loops, `Paper` query usage, and current 3D overlay pointer handlers before edits.
2. Run focused Vitest for changed canvas presentation selector/controller/read-port/query modules and any three-presentation shared DTO/overlay boundary.
3. Run root and frontend lint where scripts exist.
4. Run full root and frontend Vitest.
5. Run root and frontend build.
6. Run root/frontend Playwright e2e if overlay/canvas interaction or other user-facing behavior changes; otherwise record exact justification in the implementation log.
7. Refresh the live preview on `0.0.0.0:5173`, capture an HTTP 200 reachability probe, and run a Playwright/live browser check for the current canvas area affected by the 3D overlay.

**Risks**

- A shared snapshot or read-model adapter can become a new god-module if it absorbs style, visibility, projection, interaction, and traversal policy. Keep adapters small and delegate those responsibilities to focused modules.
- Overlay pointer changes can break legitimate 3D interactivity. Inventory current handlers before changing CSS/event behavior.
- `Paper.ts` query deletion can remove still-used behavior if based on assumption rather than static usage plus tests.
- The scope is near rendering and interaction, so broad visual redesign is tempting; reject changes not required by the read-port/projected-3D/overlay ownership boundary.


---

## Wave 017 — Three presentation read ports and realization boundary

**Status**

Proposed by `cycle-017-fresh-scout-proposals`; requires canonical review in `cycle-017-review-round-01` before implementation.

**Scope**

- `frontend/src/application/threePresentation/ThreePresentationModel.ts`
- `frontend/src/application/threePresentation/ThreePresentationController.ts`
- `frontend/src/application/threePresentation/ThreePresentationSelector.ts`
- `frontend/src/application/threePresentation/ProjectionPlane3DSelector.ts`
- `frontend/src/application/threePresentation/PlanarElement3DSelector.ts`
- `frontend/src/application/threePresentation/ReconstructedElement3DSelector.ts`
- `frontend/src/application/threePresentation/Guide3DSelector.ts`
- `frontend/src/application/threePresentation/Hinge3DSelector.ts`
- a new narrow 3D presentation read-port module, or a reviewed shared presentation read-context module if the restructure proposal wins
- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts` only where needed to align realization/read-context ownership and avoid duplicate presentation adapters
- `frontend/src/application/canvasPresentation/CanvasVisibilityPolicy.ts` only if the reviewed implementation can delete its `world as World` cast through a narrow visibility/process-tree capability without broad style/process redesign
- `frontend/src/rendering/threeView/ThreeViewRuntime.ts`
- `frontend/src/components/panels/ThreeView.vue`
- focused three-presentation/canvas-read-port/component-shell tests

**Scope guard**

This wave continues Wave 016's active presentation-boundary cleanup. It must not reopen broad rendering, scene-host/OrbitControls, app-shell, command/undo, persistence, backend, docs/spec, package/tooling, validation-platform, or Drive/local project architecture. It may touch canvas presentation only to share or align the read-port/realization context; it must not rewrite the Wave 016 selector model or introduce a global presentation snapshot god-module. If implementation proves that domain realization itself needs a larger redesign, stop for a reviewed plan-edit mini-cycle rather than hiding it in this wave.

**Baseline/current grounding**

Wave 016 completed the 2D canvas presentation read-port/overlay boundary and recorded a residual risk that `CanvasWorldReadPort` still delegates realization calls through concrete runtime `World` (`architecture-audit/cycle-016-canvas-presentation-overlay-boundary/implementation-log.md`, “Residual risks / future candidates”). Current source shows `CanvasWorldReadPort` exposes 2D/3D realization capabilities and the adapter calls entity realization with `world` (`frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:14`, `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:21`, `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:24`, `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:46`, `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:49`, `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:50`, `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:51`).

The active 3D presentation path still accepts full mutable `World`: `ThreePresentationInput` embeds `world: World` (`frontend/src/application/threePresentation/ThreePresentationModel.ts:1`, `frontend/src/application/threePresentation/ThreePresentationModel.ts:10`), `ThreePresentationSelector` passes it to every concern selector (`frontend/src/application/threePresentation/ThreePresentationSelector.ts:17`, `frontend/src/application/threePresentation/ThreePresentationSelector.ts:20`, `frontend/src/application/threePresentation/ThreePresentationSelector.ts:21`, `frontend/src/application/threePresentation/ThreePresentationSelector.ts:22`, `frontend/src/application/threePresentation/ThreePresentationSelector.ts:23`, `frontend/src/application/threePresentation/ThreePresentationSelector.ts:24`), and `ThreeView.vue` still injects `World` and passes it into the runtime refresh input (`frontend/src/components/panels/ThreeView.vue:29`, `frontend/src/components/panels/ThreeView.vue:41`, `frontend/src/components/panels/ThreeView.vue:46`). Existing domain projection realization context interfaces provide a possible lower-level read-capability vocabulary (`frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts:9`, `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts:20`).

**Target outcome**

3D presentation selectors/controllers consume explicit read ports or read-context slices instead of full mutable `World`. Canvas and 3D presentation do not maintain contradictory realization/read adapter models: either a small 3D read port mirrors the successful Wave 016 boundary without duplicating broad world access, or a reviewed shared presentation read-context replaces duplicate adapters. Internal full-`World` selector APIs and touched test `any` workarounds are deleted, not wrapped. User-visible 2D and 3D rendering remains equivalent.

**Explicit DELETE list**

- Delete `ThreePresentationInput.world: World` as the active 3D presentation input contract.
- Delete full-`World` selector signatures in active three-presentation selectors where a read port/context slice is sufficient.
- Delete touched three-presentation unit-test `as any` workarounds that only exist to bypass broad concrete selector dependencies.
- Delete duplicate read-port/realization helper code if the reviewed implementation introduces a shared presentation context.
- Delete the `CanvasVisibilityPolicy` `world as World` cast only if replaced by a narrow typed visibility/process-tree capability inside the reviewed scope.
- Delete transitional overloads, compatibility wrappers, and dead exports created while moving from full `World` to read ports.

**Success criteria**

- `frontend/src/application/threePresentation/*` no longer exposes a public application-presentation input or selector API requiring full mutable `World` where a read port/context slice is sufficient.
- `ThreeView.vue` remains a composition shell and wraps the injected runtime `World` only at the boundary needed to create the selected read port/context.
- Canvas and 3D presentation realization/read access are aligned by a documented boundary; no parallel full-World and read-port paths remain for the same selector responsibility.
- Focused tests cover the new read-port/context contract and update three-presentation selector tests without broad `as any` spy seams for touched constructors/input shapes.
- No scene-host/OrbitControls redesign, app-shell redesign, command/persistence/backend change, package/tooling change, or docs/spec rewrite is introduced.
- Mandatory validation cadence passes with stable logs: root/frontend lint where defined, focused Vitest for touched presentation/read-port modules, full root/frontend Vitest, root/frontend build, root/frontend e2e, live preview refresh on `0.0.0.0:5173`, HTTP reachability probe, and Playwright/live browser evidence for 3D view plus representative 2D canvas rendering.

**Dependencies**

Depends on Wave 016 because it builds on the completed canvas presentation read-port and overlay boundary. It is ordered before scene-host interaction or peripheral cleanup because it is the most central remaining active rendering/read-model boundary.

**Validation requirements**

1. Capture pre-edit static scans for full-`World` APIs/imports in three presentation, `CanvasWorldReadPort` realization delegation, `CanvasVisibilityPolicy` casts, and touched-test `as any` seams.
2. Run focused three-presentation and canvas-read-port Vitest for every behavior-bearing change.
3. Run root/frontend lint where scripts exist.
4. Run full root/frontend Vitest.
5. Run root/frontend build.
6. Run root/frontend Playwright e2e because 3D/canvas rendering is user-observable.
7. Refresh live preview on `0.0.0.0:5173`, capture HTTP 200, and run focused live browser evidence for 3D view rendering plus representative 2D canvas rendering.

**Risks**

- A read port can become a renamed `World` facade if it mirrors too many methods. Keep capabilities tied to selector responsibilities.
- A shared presentation context can become a god snapshot if it owns traversal, style, visibility, geometry conversion, and scene concerns. Prefer slices/composition over a large behavior class.
- Over-eager canvas changes can destabilize the just-completed Wave 016 boundary. Touch canvas only for read-context alignment.
- Scene-host interaction debt remains real but should not distract from the higher-level presentation data boundary in this wave.

---

## Wave 018 — Domain realization context boundary

**Status**

Added by `cycle-018-wave-plan-extension` as the recommended next wave after Wave 017. Requires `cycle-018-wave-plan-extension-review` sign-off before the canonical `cycle-018-fresh-scout-proposals` stage and before any implementation.

**Scope**

- `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts`
- `frontend/src/domain/world/Element2D.ts`
- `frontend/src/domain/world/Element3D.ts`
- 3D realization classes that still type realization against concrete `World` or `any`:
  - `frontend/src/domain/world/Point3D.ts`
  - `frontend/src/domain/world/Line3D.ts`
  - `frontend/src/domain/world/Segment3D.ts`
  - `frontend/src/domain/world/Plane.ts`
  - `frontend/src/domain/world/HingeLine.ts`
  - `frontend/src/domain/world/BrokenHingeLine.ts`
- 2D realization classes only where needed to align naming/types with the existing projection-element context:
  - `frontend/src/domain/world/Point.ts`
  - `frontend/src/domain/world/Line.ts`
  - `frontend/src/domain/world/Segment.ts`
  - `frontend/src/domain/world/Circle.ts`
  - `frontend/src/domain/world/Guide.ts`
  - `frontend/src/domain/world/elements/BrokenHalfHingeLine2D.ts`
- Presentation read-port adapters that currently pass concrete `World` into domain realization:
  - `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts`
  - `frontend/src/application/threePresentation/ThreeWorldReadPort.ts`
- focused realization-context, canvas-read-port, three-read-port, and representative rendering tests

**Scope guard**

This wave owns the domain realization context contract, not a broad rendering, scene-host, command, persistence, app-shell, backend, validation-platform, docs/spec, or package/tooling redesign. It must begin with a current caller inventory for `realize2D(...)`, `realize3D(...)`, `getPlaneEquation(...)`, and projection-plane realization helper APIs, then choose the smallest typed context boundary that removes concrete `World`/`any` from active realization contracts without introducing a new god context.

Do not reopen the Wave 016/017 presentation selector read-port architecture except to update adapters to the new realization context. Do not move ownership of style, visibility, process-tree rendering, command execution, or persistence into the realization context. If the caller inventory proves that projection-plane mutation APIs or dependency registration must be redesigned first, stop and run a reviewed plan-edit mini-cycle rather than hiding that redesign in this wave.

**Baseline/current grounding**

The baseline already identified domain-internal realization coupling as a residual central risk: `Element2D` required realization through a whole `World`, `styleService` walked `World`/`ProcessTree`, and weak realization contexts used `any` (`architecture-audit/baseline/risk-register.md`, R6 and R11; `architecture-audit/baseline/architecture-map.md`, “Additional service/domain coupling paths”). Waves 016 and 017 deliberately narrowed canvas and 3D presentation selectors to read ports, but both closure logs record the same residual: presentation read-port adapters still call domain realization APIs with concrete runtime `World` (`architecture-audit/cycle-016-canvas-presentation-overlay-boundary/implementation-log.md`, “Residual risks / future candidates”; `architecture-audit/cycle-017-three-presentation-read-port-realization-boundary/implementation-log.md`, “Residual risks after closure”).

Current source evidence confirms that the residual is now a domain-realization boundary, not a selector-boundary problem. `CanvasWorldReadPort` exposes realization methods and its adapter calls `plane.realizePoint2D(point, world)`, `plane.realizeLine2D(line, world)`, `plane.realizeCircle2D(circle, world)`, `point.realize3D(world)`, `line.realize3D(world)`, and `segment.realize3D(world)` (`frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:14`, `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:21`, `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:30`, `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:46`, `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:51`). `ThreeWorldReadPort` similarly wraps `World` and builds read models by calling `point.realize2D(world)`, `line.realize2D(world)`, `circle.realize2D(world)`, selected-guide `line.realize2D(world)`, and hinge `realize3D(world)` inside the adapter (`frontend/src/application/threePresentation/ThreeWorldReadPort.ts:55`, `frontend/src/application/threePresentation/ThreeWorldReadPort.ts:65`, `frontend/src/application/threePresentation/ThreeWorldReadPort.ts:84`, `frontend/src/application/threePresentation/ThreeWorldReadPort.ts:98`, `frontend/src/application/threePresentation/ThreeWorldReadPort.ts:117`).

The domain has already started the right vocabulary for 2D realization with `ProjectionElementRealizationContext` (`frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts:9`, `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts:20`), and `Element2D.realize2D(context: ProjectionElementRealizationContext)` now uses that type (`frontend/src/domain/world/Element2D.ts:1`, `frontend/src/domain/world/Element2D.ts:108`). The remaining central weakness is that 3D realization and plane-equation contracts still use concrete `World` or `any`: `Element3D.realize3D(world: any): any` (`frontend/src/domain/world/Element3D.ts:40`), `Point3D`/`Line3D`/`Segment3D` import `World` for realization (`frontend/src/domain/world/Point3D.ts`, `frontend/src/domain/world/Line3D.ts`, `frontend/src/domain/world/Segment3D.ts`), and `Plane` uses `any` in plane-equation/realization APIs (`frontend/src/domain/world/Plane.ts`). Static scans in `architecture-audit/cycle-018-wave-plan-extension/static-realization-world-scan.stdout` and `static-any-scan.stdout` capture the current residual seams.

**Target outcome**

Domain realization APIs consume explicit typed realization/read contexts rather than full mutable `World` or broad `any`. 2D and 3D realization share a coherent context vocabulary where their lookup needs overlap, with separate narrow capabilities where they do not. Canvas and three presentation read-port adapters may still be the runtime boundary that wraps a concrete `World`, but they pass only the selected realization context into domain realization APIs. The active source no longer has a parallel situation where selectors use read ports while domain realization contracts force adapters back to full `World`/`any`.

**Explicit DELETE list**

- Delete `Element3D.realize3D(world: any): any` and replace it with a typed 3D realization context/result contract.
- Delete `Plane.getPlaneEquation(world: any)` / `Plane.realize3D(world: any)` broad `any` contracts in touched plane classes.
- Delete concrete `World` realization signatures from active 3D domain elements where a typed context is sufficient, including point/line/segment/plane/hinge realization paths covered by the caller inventory.
- Delete presentation adapter calls that pass full `World` directly to `realize2D(...)`, `realize3D(...)`, or plane-equation APIs when the new context is available.
- Delete redundant realization-context names or shims if implementation discovers the existing `ProjectionElementRealizationContext` can be evolved cleanly instead of duplicated.
- Delete touched unit-test helper `as any`/broad mock contexts that only exist because realization contracts are weak; replace with typed test context builders.
- Delete transitional overloads, compatibility wrappers, dead exports, and type aliases that preserve both old full-`World` and new context APIs.

**Success criteria**

- A caller inventory in `implementation-log.md` lists active `realize2D`, `realize3D`, `getPlaneEquation`, projection-plane realization helper, and presentation-read-port adapter call sites before edits and states which are changed, deferred, or explicitly out of scope.
- Active 3D realization base contracts no longer use `any` or concrete `World` where a typed realization context is sufficient.
- Existing 2D `ProjectionElementRealizationContext` usage is preserved or evolved into a clearly named realization context family; no second duplicate context is introduced for the same lookup responsibility.
- `CanvasWorldReadPort` and `ThreeWorldReadPort` pass typed realization contexts into domain realization calls rather than exposing selector-side read ports that internally depend on full-`World` realization signatures.
- Focused tests cover the selected realization context using typed test fixtures for representative 2D point/line/circle/guide, 3D point/line/segment/plane/hinge, and canvas/three read-port adapter paths changed by the wave.
- No source change is made to command/undo, persistence/project schema, app-shell orchestration, backend contracts, package/tooling, docs/specs, Drive/local services, or broad rendering/scene-host modules except if a reviewed mini-cycle explicitly broadens scope.
- Mandatory validation cadence passes with stable logs: root/frontend lint where defined, focused Vitest for realization/read-port tests, full root/frontend Vitest, root/frontend build, root/frontend e2e because canvas/3D rendering is user-observable, live preview refresh on `0.0.0.0:5173`, HTTP reachability probe, and Playwright/live smoke for representative 2D canvas plus 3D view rendering.

**Dependencies**

Depends on Waves 016 and 017 because those waves moved presentation selectors behind canvas/three read ports and exposed the remaining full-`World` seam as a domain realization issue. It is ordered before broader 3D scene-host lifecycle, app-shell service concentration, backend/frontend contract stance, validation-gate hardening beyond existing gates, placeholder/debug cleanup, and docs/spec drift because those later topics should consume a stable domain realization/read-context contract rather than preserve the current full-`World` realization API.

**Validation requirements**

1. Capture pre-edit static scans for `realize2D`, `realize3D`, `getPlaneEquation`, `World` imports in realization classes, `any` realization contracts, and read-port adapter calls that pass full `World` into realization.
2. Run focused Vitest for changed realization context/domain element/read-port adapter modules.
3. Run root and frontend lint where scripts exist.
4. Run full root and frontend Vitest.
5. Run root and frontend build.
6. Run root and frontend Playwright e2e because realization affects user-visible 2D/3D rendering, construction, intersections, guides, and projection-plane behavior.
7. Refresh the live preview on `0.0.0.0:5173`, capture HTTP 200, and run focused Playwright/live browser smoke that confirms representative 2D canvas primitives and the 3D view still render.

**Risks**

- A single “realization context” can become a renamed `World` facade if it exposes every lookup/mutation method. Keep capabilities read-only and scoped to actual realization caller needs from the inventory.
- Changing realization signatures can ripple widely through geometry construction and rendering. Use typed context builders and focused tests before full validation.
- Projection-plane mutation methods use realization while also registering dependencies and marking dirty; do not mix mutation/dependency ownership into this realization-context wave unless a reviewed plan edit broadens scope.
- Some domain comments still reference old phase-era `World` examples. Do not convert this into a docs/comment cleanup wave; update only comments adjacent to changed contracts if needed for correctness.
- If the source tree has unrelated dirty build-contract work in progress, implementation must inspect path-focused diffs first and avoid reverting or masking those changes.

**No-backcompat rationale**

The old full-`World`/`any` realization signatures are architectural debt, not a compatibility surface worth preserving. Keeping overloads or aliases would leave the core domain contract ambiguous and would let future presentation adapters continue bypassing narrow read contexts. Under the project priorities, delete the old signatures and update active callers/tests directly once the reviewed proposal chooses the exact context shape.

---

## Wave 019 — Three scene-host lifecycle and renderer platform boundary

**Status**

Added by `cycle-018-wave-plan-extension` correction as the recommended next ordered wave after Wave 018. Requires the Cycle 018 wave-plan-extension review to sign off the ordering before any Wave 019 scout/proposal or implementation. Wave 019 must be re-read after Wave 018 completes; if Wave 018 changes realization/read-context assumptions materially, update this entry through a reviewed plan-edit mini-cycle before implementation.

**Scope**

- `frontend/src/rendering/threeView/ThreeViewRuntime.ts`
- `frontend/src/rendering/threeView/ThreeSceneHost.ts`
- `frontend/src/rendering/threeView/ThreeObjectRegistry.ts`
- 3D scene adapters under `frontend/src/rendering/threeView/` only where their lifecycle/material/disposal contract with the host must be clarified:
  - `ProjectionPlaneSceneAdapter.ts`
  - `PlanarElementSceneAdapter.ts`
  - `ReconstructedElementSceneAdapter.ts`
  - `GuideSceneAdapter.ts`
  - `HingeSceneAdapter.ts`
  - `AxisLabelSceneAdapter.ts` if static use proves it is active or obsolete
- `frontend/src/components/panels/ThreeView.vue` only as a composition shell for mount/resize/dispose/watch wiring
- focused three-scene-host/runtime/registry tests and representative live/e2e 3D rendering checks

**Scope guard**

This wave owns the Three.js runtime/platform boundary after the presentation and domain-realization read contracts are stable. It must not reopen domain realization contracts, canvas presentation selectors, app-shell project lifecycle, command/undo, persistence, backend, package/tooling, validation-platform, docs/spec, or broad UI redesign. It must begin with a current inventory of scene-host responsibilities, animation-frame ownership, resize/event ownership, renderer/label-renderer DOM ownership, OrbitControls ownership, registry disposal, and active scene-adapter material/geometry creation.

If Wave 018 leaves full-`World` or `any` realization seams that still force renderer decisions to depend on domain internals, stop and run a reviewed plan edit before starting this wave. If implementation discovers user-facing 3D interaction behavior must change beyond encoding the existing lifecycle/ownership contract, cover it with focused e2e/live evidence or stop for a mini-cycle.

**Baseline/current grounding**

The baseline identified 3D rendering concentration as a major residual rendering risk: `ThreeView.vue` originally combined scene setup, projection-plane rendering, 2D-on-3D rendering, 3D elements, guide geometry, hinge lines, animation, resize, cleanup, domain realization access, and store access (`architecture-audit/baseline/quality-report.md`, Q5; `architecture-audit/baseline/architecture-map.md`, “God-modules”; `architecture-audit/baseline/risk-register.md`, R8). Waves 016 and 017 narrowed the canvas/three presentation read-model boundary first, and Wave 018 is ordered ahead of this entry so the scene platform consumes typed realization/read outputs rather than preserving full-`World` realization seams.

Current source evidence shows the scene work is now a separate platform lifecycle boundary rather than a selector-boundary issue. `ThreeView.vue` is a smaller composition shell, but it still owns Vue watchers, a global resize listener, world-change subscription, runtime creation, and runtime disposal (`frontend/src/components/panels/ThreeView.vue:42`, `frontend/src/components/panels/ThreeView.vue:44`, `frontend/src/components/panels/ThreeView.vue:56`, `frontend/src/components/panels/ThreeView.vue:59`, `frontend/src/components/panels/ThreeView.vue:62`, `frontend/src/components/panels/ThreeView.vue:67`). `ThreeViewRuntime` still hard-wires the host, presentation controller, and five scene adapters in one constructor-less class and replaces registry groups directly (`frontend/src/rendering/threeView/ThreeViewRuntime.ts:10`, `frontend/src/rendering/threeView/ThreeViewRuntime.ts:11`, `frontend/src/rendering/threeView/ThreeViewRuntime.ts:12`, `frontend/src/rendering/threeView/ThreeViewRuntime.ts:13`, `frontend/src/rendering/threeView/ThreeViewRuntime.ts:21`, `frontend/src/rendering/threeView/ThreeViewRuntime.ts:23`). `ThreeSceneHost` owns scene creation, camera defaults, WebGL/CSS2D renderers, label DOM attachment, OrbitControls configuration, lights, resize behavior, animation-frame loop, registry disposal, renderer disposal, and label DOM removal in one class (`frontend/src/rendering/threeView/ThreeSceneHost.ts:10`, `frontend/src/rendering/threeView/ThreeSceneHost.ts:19`, `frontend/src/rendering/threeView/ThreeSceneHost.ts:30`, `frontend/src/rendering/threeView/ThreeSceneHost.ts:32`, `frontend/src/rendering/threeView/ThreeSceneHost.ts:37`, `frontend/src/rendering/threeView/ThreeSceneHost.ts:44`, `frontend/src/rendering/threeView/ThreeSceneHost.ts:52`, `frontend/src/rendering/threeView/ThreeSceneHost.ts:62`, `frontend/src/rendering/threeView/ThreeSceneHost.ts:70`). Static scans for this correction are captured in `architecture-audit/cycle-018-wave-plan-extension/source-three-scene-lifecycle-t3.stdout` and `static-three-scene-lifecycle-t3.stdout`.

**Target outcome**

The 3D rendering platform has explicit lifecycle and ownership seams: Vue shell owns only component mount/unmount and user option wiring; runtime orchestration owns presentation-model refresh to named renderer groups; scene host owns low-level Three.js renderer/camera/controls/animation resources behind testable ports; registry disposal and adapter-created geometry/material ownership are deliberate and covered. The boundary should make it possible to test lifecycle/disposal and group replacement without mounting the full Vue component or leaking domain/presentation responsibilities into the scene host.

**Explicit DELETE list**

- Delete implicit hard-wiring that prevents focused tests from constructing `ThreeViewRuntime` with test doubles for scene host, presentation controller, or adapters, if the reviewed proposal chooses dependency injection or a small composition factory.
- Delete any duplicate scene-host lifecycle helpers or dead scene adapter exports discovered by static use scans.
- Delete renderer/label DOM ownership ambiguity: no code path should leave CSS2D label DOM attachment/removal, renderer disposal, or animation-frame cancellation implicit or untested.
- Delete stale test helpers that mount `ThreeView.vue` only to inspect low-level scene-host behavior; replace with runtime/host/registry tests where possible.
- Delete compatibility wrappers, transitional overloads, and broad “scene manager” facades that merely rename the existing all-in-one host without reducing lifecycle responsibility seams.
- Delete active unused adapters such as `AxisLabelSceneAdapter.ts` only if static usage and tests prove they are dead; otherwise include them in the explicit adapter ownership contract.

**Success criteria**

- `ThreeView.vue` remains a thin composition shell and no longer contains low-level Three.js runtime/scene-host lifecycle decisions beyond mount/unmount/option/watch wiring.
- `ThreeViewRuntime` has a testable orchestration boundary for presentation-model refresh and group replacement; tests can verify group replacement without real WebGL where practical.
- `ThreeSceneHost` lifecycle responsibilities are explicit and covered: mount, resize, animation-frame start/stop, OrbitControls configuration/disposal, renderer disposal, label renderer DOM attachment/removal, lights/camera defaults, and registry disposal.
- Scene adapter material/geometry ownership and disposal expectations are documented in code/tests through the registry contract rather than hidden in informal conventions.
- No domain realization, canvas presentation, command/undo, persistence, backend, app-shell project lifecycle, package/tooling, validation-platform, or docs/spec changes are introduced without a reviewed plan edit.
- Mandatory validation cadence passes with stable logs: root/frontend lint where defined, focused Vitest for three-scene-host/runtime/registry/adapter modules, full root/frontend Vitest, root/frontend build, root/frontend Playwright e2e because 3D rendering is user-observable, live preview refresh on `0.0.0.0:5173`, HTTP reachability probe, and Playwright/live browser evidence for representative 3D rendering and controls.

**Dependencies**

Depends on Wave 018 because scene-host lifecycle should consume stable typed realization/read-context outputs rather than compensate for domain realization contracts that still require full `World` or `any`. It is ordered before app-shell service concentration, backend/frontend contract stance, validation-gate hardening, placeholder/debug cleanup, and docs/spec drift because the remaining 3D runtime/platform boundary is still central user-visible architecture while those later topics either depend on stable rendering contracts or are more peripheral cleanup.

**Validation requirements**

1. Capture pre-edit static scans for `ThreeView.vue` lifecycle/watch/listener responsibilities, `ThreeViewRuntime` hard-wired dependencies, `ThreeSceneHost` renderer/camera/controls/animation/disposal responsibilities, scene-adapter static usage, and registry disposal behavior.
2. Run focused Vitest for changed three-scene-host/runtime/registry/adapter modules and any ThreeView shell boundary tests touched by the wave.
3. Run root and frontend lint where scripts exist.
4. Run full root and frontend Vitest.
5. Run root and frontend build.
6. Run root/frontend Playwright e2e because 3D rendering and controls are user-observable.
7. Refresh the live preview on `0.0.0.0:5173`, capture HTTP 200, and run focused Playwright/live browser smoke confirming representative 3D view rendering, controls visibility/interaction, and no obvious canvas/overlay regression.

**Risks**

- Over-injecting every Three.js primitive can create an abstract factory maze. Keep ports at lifecycle/test seams, not at every geometry constructor.
- Moving animation or resize ownership can introduce leaks or double render loops if disposal is not verified with focused tests.
- Registry disposal changes can accidentally leak geometries/materials or dispose shared objects too early. Treat adapter-created object ownership as an explicit contract.
- OrbitControls and overlay pointer behavior are user-observable; do not silently change interaction semantics while cleaning lifecycle ownership.
- App-shell service concentration remains significant, but moving it ahead of the 3D platform boundary would force app-shell code to coordinate a renderer lifecycle that is still too implicit.

**No-backcompat rationale**

The current all-in-one scene-host/runtime wiring is an internal architecture seam, not a compatibility surface. If the reviewed proposal introduces lifecycle ports or runtime composition factories, delete the old implicit wiring and tests that depend on it rather than preserving parallel construction paths. A single clear runtime/platform boundary is more valuable than compatibility wrappers around the old host shape.

---

## Wave 020 — App-shell project session and browser integration boundary

**Status**

Added by `cycle-020-wave-plan-extension` as the recommended next wave after Wave 019. Requires `cycle-020-wave-plan-extension-review` sign-off before the canonical `cycle-020-fresh-scout-proposals` stage and before any implementation.

**Scope**

- `frontend/src/application/appShell/AppShellRuntime.ts`
- `frontend/src/application/appShell/AppShellPorts.ts`
- `frontend/src/application/appShell/ProjectSessionUseCases.ts`
- `frontend/src/application/appShell/AutoSaveUseCases.ts`
- `frontend/src/application/appShell/SelectionUseCases.ts` only where selection/delete command ownership must be kept behind the app-shell/application boundary
- `frontend/src/application/appShell/KeyboardShortcutRouter.ts` only where browser-event installation and shortcut routing interact with project/session lifecycle
- a small production composition module/factory for browser-only adapters if the reviewed proposal selects one
- `frontend/src/App.vue` only as the Vue composition shell that wires UI callbacks and provides the already-created runtime objects
- `frontend/src/services/GoogleDriveService.ts` only at the adapter/port boundary; do not redesign Drive API behavior broadly
- `frontend/src/services/ProjectService.ts` only where its app-shell-facing persistence port shape must be narrowed or moved behind a typed adapter
- `frontend/src/stores/authStore.ts`, `frontend/src/stores/selectionStore.ts`, `frontend/src/stores/toolStore.ts`, and `frontend/src/stores/viewStore.ts` only as port consumers/adapters, not store redesigns
- focused app-shell runtime/use-case/port tests, persistence/autosave tests, keyboard/session tests, and representative project-flow e2e/live checks

**Scope guard**

This wave owns the app-shell project/session/browser integration boundary after the domain, command, validation, presentation, realization, and 3D runtime boundaries have been stabilized. It must not reopen domain realization, canvas/three presentation selectors, Three.js scene-host lifecycle, command/undo descriptor architecture, project serialization internals, backend deletion/contract stance, package/tooling gates, docs/spec reconciliation, or broad store redesign. If implementation proves that persistence format or command serialization must be redesigned rather than merely hidden behind a stable app-shell port, stop and run a reviewed plan-edit mini-cycle before broadening scope.

The wave must start with a current inventory of concrete construction and browser globals in the app shell: `World`, `CommandStack`, `GoogleDriveService`, `ProjectService`, `window.localStorage`, keyboard target installation, scheduler/timer installation, alert callbacks, auth/session storage keys, and runtime state exposed to `App.vue`. It must also inventory which app-shell use cases still directly mutate `World`/`CommandStack` and which of those are intentional application-use-case dependencies versus composition leaks.

**Baseline/current grounding**

The original baseline ranked `App.vue` as an app-shell god module that owned `World`, `CommandStack`, Drive/local project state, autosave, keyboard/delete/select-all behavior, active-plane state, project lifecycle, and command coordination (`architecture-audit/baseline/architecture-map.md`, “Entry points and workspace boundaries”; `architecture-audit/baseline/risk-register.md`, R2 and R5). Earlier waves have reduced the Vue shell itself: current `App.vue` delegates startup, toolbar, project-name, canvas, and lifecycle events to `runtime.actions`, creates the runtime through `createAppShellRuntime`, and only provides `runtime.world` plus `runtime.commandStack` to descendants (`frontend/src/App.vue:12`, `frontend/src/App.vue:24`, `frontend/src/App.vue:63`, `frontend/src/App.vue:107`, `frontend/src/App.vue:126`, `frontend/src/App.vue:142`, `frontend/src/App.vue:143`, `frontend/src/App.vue:171`).

Current source evidence shows the remaining central problem moved into the application app-shell runtime/composition boundary, not into `App.vue` markup. `createAppShellRuntime` still constructs `World`, `CommandStack`, default `GoogleDriveService`, default `ProjectService`, browser `window.localStorage`, browser scheduler, and installs keyboard handling on `window` from the runtime (`frontend/src/application/appShell/AppShellRuntime.ts:21`, `frontend/src/application/appShell/AppShellRuntime.ts:22`, `frontend/src/application/appShell/AppShellRuntime.ts:23`, `frontend/src/application/appShell/AppShellRuntime.ts:24`, `frontend/src/application/appShell/AppShellRuntime.ts:27`, `frontend/src/application/appShell/AppShellRuntime.ts:28`, `frontend/src/application/appShell/AppShellRuntime.ts:29`, `frontend/src/application/appShell/AppShellRuntime.ts:101`). `AppShellPorts` still exposes a persistence port typed directly in terms of `CommandStack`, `World`, and `ProjectData` from `ProjectService`, so app-session orchestration is not insulated from concrete command/domain/persistence shapes (`frontend/src/application/appShell/AppShellPorts.ts:2`, `frontend/src/application/appShell/AppShellPorts.ts:3`, `frontend/src/application/appShell/AppShellPorts.ts:5`, `frontend/src/application/appShell/AppShellPorts.ts:24`, `frontend/src/application/appShell/AppShellPorts.ts:25`, `frontend/src/application/appShell/AppShellPorts.ts:27`).

Project/session use cases still mix session state, Drive calls, local-storage keys, domain reset/initialization, command-stack clearing, persistence validation/deserialization, autosave start, and error UI state in one class (`frontend/src/application/appShell/ProjectSessionUseCases.ts:27`, `frontend/src/application/appShell/ProjectSessionUseCases.ts:40`, `frontend/src/application/appShell/ProjectSessionUseCases.ts:47`, `frontend/src/application/appShell/ProjectSessionUseCases.ts:96`, `frontend/src/application/appShell/ProjectSessionUseCases.ts:99`, `frontend/src/application/appShell/ProjectSessionUseCases.ts:102`, `frontend/src/application/appShell/ProjectSessionUseCases.ts:118`, `frontend/src/application/appShell/ProjectSessionUseCases.ts:121`, `frontend/src/application/appShell/ProjectSessionUseCases.ts:123`, `frontend/src/application/appShell/ProjectSessionUseCases.ts:124`, `frontend/src/application/appShell/ProjectSessionUseCases.ts:188`). `AutoSaveUseCases` owns dirty-version polling, debounce/status timers, persistence serialization, Drive update/create fallback, local-storage last-file update, auth-expiry UI behavior, and quota/file-deleted error policy (`frontend/src/application/appShell/AutoSaveUseCases.ts:30`, `frontend/src/application/appShell/AutoSaveUseCases.ts:33`, `frontend/src/application/appShell/AutoSaveUseCases.ts:42`, `frontend/src/application/appShell/AutoSaveUseCases.ts:50`, `frontend/src/application/appShell/AutoSaveUseCases.ts:54`, `frontend/src/application/appShell/AutoSaveUseCases.ts:59`, `frontend/src/application/appShell/AutoSaveUseCases.ts:92`, `frontend/src/application/appShell/AutoSaveUseCases.ts:103`, `frontend/src/application/appShell/AutoSaveUseCases.ts:112`).

Recent Wave 019 closure confirms validation is green and the current plan ends at Wave 019, so a new central wave is required before implementation continues (`architecture-audit/cycle-019-three-scene-host-lifecycle-renderer-platform/implementation-log.md`, “Validation/preview closure — cycle-019-validation-and-preview-refresh”). Current scans also show lower-priority candidates are not more central right now: the backend directory is absent and root workspaces list only `frontend` (`package.json:7`, `package.json:8`, `package.json:13`, `.saivage/stages/cycle-020-wave-plan-extension/backend-contract-source-evidence.stdout`); README-only `paper/`/`toolbar/` operation placeholder directories were not found (`.saivage/stages/cycle-020-wave-plan-extension/deferred-candidates-evidence.stdout`); docs/spec drift remains real but intentionally follows structural waves.

**Target outcome**

The app shell has a clear composition boundary: Vue `App.vue` remains a passive composition shell; production-only browser adapters create Drive, storage, scheduler, alert, keyboard target, and optional environment-backed configuration; app-shell use cases consume typed ports and do not instantiate concrete browser services or reach for browser globals; project session/autosave state transitions are explicit and testable without `window`, real localStorage, real Google APIs, or concrete persistence static methods. Domain/command objects may remain the current in-memory runtime model provided to child construction/rendering paths, but their creation and persistence exposure are owned by one application composition contract rather than scattered through runtime/use-case classes.

The persistence-facing port should express the app shell's need to save/load a current project session without forcing use-case code to know static `ProjectService` methods or serialization internals. The Drive-facing port should remain a Drive/project-file adapter contract, not a direct dependency on Google API globals. Browser state keys such as `diedrico_last_file_id` and `diedrico_last_file_name` should be centralized behind a small session-storage port or repository instead of duplicated string literals in project/session code.

**Explicit DELETE list**

- Delete default construction of `GoogleDriveService`, direct `ProjectService` static binding, direct `window.localStorage`, and direct `window` keyboard target installation from `createAppShellRuntime` if the reviewed proposal introduces a production composition factory/adapters.
- Delete `ProjectPersistencePort` methods that expose concrete static `ProjectService` shape to app-session use cases if replaced by a narrower project-session persistence adapter.
- Delete duplicated local-storage key string usage for last project file/name from `ProjectSessionUseCases` and `AutoSaveUseCases`; replace with a named session repository/port if the reviewed proposal chooses that path.
- Delete app-shell use-case `any` error handling in touched save/session paths where a typed error classifier or narrow unknown-to-message helper is introduced.
- Delete app-shell tests that assert concrete service construction or browser-global behavior from use cases; replace with port/adapter/composition tests.
- Delete compatibility wrappers, dual browser/global and port-based paths, dead exports, or broad “AppShellService” facades that merely move the existing concentration without narrowing ownership.
- Do not delete or rewrite `GoogleDriveService` internals, `ProjectService` serialization internals, command descriptors, or backend/docs/spec files in this wave unless a reviewed plan edit broadens scope.

**Success criteria**

- `createAppShellRuntime` can be constructed in tests and in production from explicit dependencies without directly reaching for `window.localStorage`, default `GoogleDriveService`, or static `ProjectService` as hidden globals inside the runtime core.
- Browser-only concerns (Google API service construction, localStorage, scheduler/timers, alert, and keyboard event target) are isolated in a production composition adapter/module or explicit ports with focused tests.
- Project session and autosave use cases consume named ports/repositories for last-project storage and persistence/Drive operations; stringly session-key duplication is removed from touched use-case code.
- `App.vue` remains small and composition-focused, with no reintroduced direct project lifecycle/autosave/keyboard orchestration imports.
- Selection/delete and keyboard routing behavior remains user-visible equivalent; any retained direct `World`/`CommandStack` use in app-shell use cases is documented as an intentional application-use-case dependency rather than a composition leak.
- No domain realization, rendering/presentation, Three.js scene-host, command/undo descriptor, persistence schema, backend, docs/spec, package/tooling, or validation-platform change is introduced without a reviewed plan edit.
- Focused app-shell tests cover runtime composition, project create/open/rename/sign-in/sign-out, autosave debounce/error policies, keyboard install/dispose/routing, and session-storage behavior with fake ports.
- Mandatory validation cadence passes with stable logs captured under the Wave 020 `validation/` directory: `npm run lint` at the root and in every workspace where defined; focused app-shell/service-adapter Vitest for touched modules; full Vitest at the root and in every workspace where defined; `npm run build` at the root and in every workspace where defined; Playwright/e2e at the root and in every workspace where defined because project/session and keyboard flows are user-observable; live preview refresh on `0.0.0.0:5173`; HTTP reachability probe; and Playwright MCP/live browser evidence for startup/new project, keyboard routing, and save/autosave-visible status where practical.

**Dependencies**

Depends on Waves 014–019 because it should consume green validation gates, stable command/use-case contracts, current project persistence contracts, cleaned presentation/read-port contracts, typed realization contexts, and the explicit Three scene-host lifecycle boundary. It is ordered before backend/frontend contract stance, placeholder/debug cleanup, docs/spec reconciliation, and broad validation hardening because current evidence shows the active frontend app-shell project/session boundary is the next central runtime coordinator while the backend is absent from the active workspace and docs/debug cleanup would be peripheral.

**Validation requirements**

All Wave 020 validation stdout/stderr must be captured to stable files under `architecture-audit/cycle-020-app-shell-project-session-browser-integration/validation/` (or the reviewed final Cycle 020 directory name). Undefined commands may be skipped only with exact package-script evidence in the implementation log; defined root or workspace commands are mandatory.

1. Capture pre-edit scoped git status/diff and static scans for hidden app-shell concrete construction/browser globals, project-session storage-key duplication, app-shell persistence/Drive port shapes, keyboard target installation, and direct `World`/`CommandStack` mutation in app-shell use cases.
2. Run focused Vitest for changed app-shell runtime/use cases/ports/adapters and any touched ProjectService/GoogleDriveService adapter tests, with stable stdout/stderr logs.
3. Run `npm run lint` at the repository root and in every workspace where a lint script is defined, including `frontend` while it remains the active workspace.
4. Run full Vitest at the repository root and in every workspace where a test/Vitest script is defined, including `frontend` while it remains the active workspace.
5. Run `npm run build` at the repository root and in every workspace where a build script is defined, including `frontend` while it remains the active workspace.
6. Run Playwright/e2e at the repository root and in every workspace where an e2e script is defined because startup/project/session/keyboard behavior is user-observable.
7. Refresh the live preview bound to `0.0.0.0:5173`, capture an HTTP 200 reachability probe, and run focused Playwright MCP/live browser smoke for startup/new project, representative keyboard shortcuts, and visible save/status behavior where possible without real Drive credentials.

**Risks**

- Over-abstracting every browser or Drive call can create an adapter maze. Keep ports at seams required for app-shell composition, testability, and ownership; do not wrap every Google API method twice.
- Moving persistence-facing contracts can accidentally become a persistence-schema redesign. Keep serialization internals unchanged unless a reviewed mini-cycle broadens scope.
- Autosave timing is user-visible and easy to break; use fake scheduler tests plus e2e/live smoke rather than relying on type checks.
- Drive/auth behavior cannot rely on real credentials in validation. Use fake-port unit coverage and credential-free browser smoke; do not read env/secret/config files.
- Existing unrelated dirty source files may be present from prior work. Implementation must use path-scoped status/diff and avoid reverting or depending on unrelated modifications.

**No-backcompat rationale**

The current hidden browser/static-service construction inside app-shell runtime is internal architecture debt, not a user-facing compatibility contract. If the reviewed proposal introduces an explicit production composition adapter or narrower project-session ports, delete the old hidden construction path and update tests/callers directly rather than preserving parallel runtime creation modes. A single clear app-shell composition boundary is more valuable than compatibility wrappers around implicit globals.


---

## Wave 021 — Selection/delete command-kernel boundary

**Status**

Superseded / already satisfied by current source as of `cycle-021-plan-correction-and-rerank-post-020`. The post-Wave-020 fresh scout found that this entry's original implementation premise was stale: `SelectionUseCases` no longer constructs delete commands directly. No production source/test implementation is authorized for Wave 021 unless a future reviewed plan edit identifies new, current-source evidence.

**Corrected current-source grounding**

The stale premise claimed `SelectionUseCases` imported `Command`, `CommandStack`, `DeletionSequenceFactory`, and `World`, received raw runtime objects, and created/committed/pushed delete commands directly. Current source contradicts that claim:

- `SelectionUseCases` imports only Vue watch types, `SelectionDeletionCommandPort`, and app-shell selection/read-store ports; its constructor receives `selectionRead`, `deleteSelectionCommand`, `selectionStore`, and `getActivePlaneId`, not `World` or `CommandStack` (`frontend/src/application/appShell/SelectionUseCases.ts:1-13`).
- `SelectionUseCases.deleteSelected()` reads selected ids, returns on an empty selection, delegates to `deleteSelectionCommand.execute(selectedIds)`, and clears selection; it does not call `new Command`, `DeletionSequenceFactory`, `commit()`, or `commandStack.push(...)` (`frontend/src/application/appShell/SelectionUseCases.ts:30-35`).
- `SelectionReadPort` is already a narrow app-shell query boundary for active-plane selectable ids and cascade-preview ids (`frontend/src/application/appShell/AppShellPorts.ts:45-48`; `frontend/src/application/appShell/SelectionUseCases.ts:41-55`).
- `SelectionDeletionCommandPort` is a behavior-sized boundary with `execute(selectedIds: readonly string[]): void` (`frontend/src/application/selectionDeletion/SelectionDeletionPorts.ts:1-3`).
- `SelectionDeletionCommandService` owns concrete command creation, cascade deletion factory use, commit, and command-stack push for the selection-delete slice (`frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts:1-5`, `frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts:12-17`, `frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts:30-37`).
- `RuntimeSession.selectionDeletionCommandPort()` wires the concrete service using runtime-owned `world` and `commandStack`, preserving `RuntimeSession` as the owner of those concrete objects (`frontend/src/application/appShell/RuntimeSession.ts:31-33`, `frontend/src/application/appShell/RuntimeSession.ts:170-172`).
- `AppShellBoundary.test.ts` already guards the corrected boundary by asserting `SelectionUseCases` does not contain `DeletionSequenceFactory`, `new Command`, `CommandStack`, `commandStack.push`, or `.commit(` while `SelectionDeletionCommandService` owns those command-lifecycle tokens (`frontend/tests/unit/application/appShell/AppShellBoundary.test.ts:62-69`).

The authoritative Wave 021 post-020 scout artifacts are `architecture-audit/cycle-021-selection-delete-command-kernel-boundary/scope-check.md`, `proposals/proposal-direct.md`, `proposals/proposal-restructure.md`, `critique/round-01-critique-post-020.md`, and `reviews/manager-reconciliation-post-020.md`. Older Cycle 021 decision/implementation/validation artifacts in the same directory are stale audit noise unless explicitly revalidated by a future stage.

**Corrected target outcome**

No source implementation remains for Wave 021. The intended selection/delete command boundary is already present: selection intent orchestration stays in `SelectionUseCases`; command lifecycle ownership stays in `SelectionDeletionCommandService`; runtime wiring stays in `RuntimeSession`; cascade preview reads stay behind `SelectionReadPort`; keyboard Delete/Backspace continues to route through app-shell selection behavior.

The only Wave 021 work in this correction stage is plan hygiene: delete stale plan claims, record the current evidence, and re-rank to the next central wave rather than implementing a no-op or silently broadening into unrelated command producers.

**Superseded DELETE list**

Already satisfied / no-op in current source:

- `SelectionUseCases.ts` imports of `Command`, `CommandStack`, `DeletionSequenceFactory`, and `World` for delete command construction are already absent.
- Direct `new Command(...)`, `DeletionSequenceFactory.createCascadeDeletion(...)`, `commit()`, and `commandStack.push(...)` calls in `SelectionUseCases.deleteSelected()` are already absent.
- Selection-use-case tests requiring concrete command construction in `SelectionUseCases` are not the current boundary; current architecture coverage asserts the opposite.
- Parallel old/new delete-selected paths were not found in the current app-shell selection-delete path.

Do not delete or rewrite `SelectionDeletionCommandService`, `DeletionSequenceFactory`, command descriptor persistence, project serialization, canvas/tool command controllers, process-history panel/toolbar controllers, backend files, docs/specs, package/tooling, rendering/Three/canvas, Drive/auth internals, debug/placeholder surfaces, or unrelated dirty files as part of this superseded Wave 021 closure.

**Closure criteria**

- This `wave-plan.md` section no longer claims `SelectionUseCases` directly constructs or pushes delete commands.
- The plan records the already-satisfied selection/delete boundary with current-source citations.
- The next wave recommendation is explicit and based on current-source re-rank, not stale Wave 021 implementation history.
- No production source/test/package/tooling/preview/validation changes are performed for this plan correction.

**Re-rank / next canonical stage**

The next central canonical stage should be `cycle-022-fresh-scout-proposals-post-021-plan-correction` for **Wave 022 — Runtime session kernel and persistence port boundary**, subject to a fresh current-source scope check before any implementation. Wave 022 remains the highest-centrality next candidate because it addresses runtime/session ownership, project-session persistence ports, initialization/session lifecycle, and the raw `World`/`CommandStack` pair contract that later command-producer, persistence, rendering, backend, validation, placeholder/debug, and docs waves should consume rather than preserve.

This re-rank does **not** authorize using Wave 021 to broaden into canvas movement/style, construction, process-history, panel/toolbar, command descriptor/replay, persistence schema, rendering, Three/canvas, backend/docs/specs, package/tooling, Drive/auth, validation-platform, or UI feature work. If the Wave 022 fresh scope check finds its premises already satisfied or invalidated by current source, edit this plan through another reviewed plan-correction mini-cycle before proceeding.

**Validation requirements**

Plan correction only: capture path-scoped git status/diff and current-source static evidence for the selection/delete boundary. Do not run lint/build/Vitest/e2e or refresh preview unless needed to verify accidental source changes, because no production/test source is changed.

If a future reviewed source wave touches selection/delete, app-shell keyboard routing, command lifecycle, runtime wiring, or user-visible deletion behavior, it must use the full mandatory validation cadence in that wave's implementation log.

**Risks**

- Leaving stale Wave 021 text would invite fake no-op implementation churn or an unreviewed generic command-kernel facade. This correction deletes that process debt.
- Later waves still include active command/runtime and read-model seams. They must be scoped by fresh current-source evidence rather than inferred from older Cycle 021 artifacts.
- The worktree contains unrelated/protected dirty source and e2e deletions. This plan correction documents them as out of scope and does not normalize, stage, or depend on them.

**No-backcompat rationale**

Stale plan claims are not compatibility surfaces. Keeping an implementation wave for work that current source has already deleted would preserve process debt and encourage dual-path thinking. The correct no-backcompat action is to remove the stale premise from the plan, record the current boundary as closed, and move to the next central architecture seam through the normal fresh-scout/proposal path.

---

## Wave 022 — Runtime session kernel and persistence port boundary

**Status**

Added by `cycle-022-wave-plan-extension` after Wave 021 completed. Requires review of this plan extension before the canonical `cycle-022-fresh-scout-proposals` stage and before any implementation. This entry is grounded in current post-Wave-021 source evidence and the Wave 020/021 implementation logs, which show selection/delete command construction was narrowed but the broader runtime object and project-session persistence contract still exposes concrete `World`/`CommandStack` ownership.

**Scope**

- `frontend/src/application/appShell/AppShellRuntime.ts`
- `frontend/src/application/appShell/AppShellPorts.ts`
- `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts`
- `frontend/src/application/appShell/ProjectSessionUseCases.ts`
- `frontend/src/application/appShell/AutoSaveUseCases.ts` only where it consumes the project-session persistence contract
- `frontend/src/application/world/initializeWorld.ts` only where initialization command ownership must be represented by the runtime/session boundary
- `frontend/src/services/ProjectService.ts` only as the concrete adapter target; do not redesign command descriptors, operation registry, schema, Drive, or migration behavior in this wave unless a reviewed plan edit explicitly broadens scope
- `frontend/src/application/selectionDeletion/` only as an already-extracted command-boundary consumer that must remain wired through the runtime without broadening its public API
- focused app-shell runtime/session/persistence adapter tests and architecture-boundary tests for the chosen runtime-session contract

**Scope guard**

This wave owns the boundary between app-shell use cases, runtime-owned `World`/`CommandStack`, and project-session persistence. It is not a generic command-kernel migration wave. Do not migrate canvas movement/style/construction use cases, process-history panel commands, toolbar history commands, tool controllers, rendering selectors, backend stance, docs/specs, placeholder/debug cleanup, package/tooling, or validation platform work into this cycle.

Implementation must begin with an inventory of every current app-shell/session/persistence method that accepts or exposes concrete `World`, `CommandStack`, or `ProjectData`, plus the runtime wiring points that create those objects. If that inventory proves the persistence contract itself must be redesigned deeper than a runtime/session port boundary, stop and run a reviewed plan edit; do not hide schema/descriptor redesign under this wave.

**Current grounding**

Wave 021 completed the narrow selection/delete extraction: `SelectionUseCases` no longer owns delete command construction, while `SelectionDeletionCommandService` now owns `new Command`, `DeletionSequenceFactory`, `commit()`, and `commandStack.push()` for that slice (`architecture-audit/cycle-021-selection-delete-command-kernel-boundary/implementation-log.md`, “Selected path followed”; “DELETE/proof list”; “Residual risks”). The same log accepts that other direct command producers and broader app-shell/runtime command-kernel ownership remain future candidates.

Current source evidence shows the most central residual after that extraction is not another leaf producer first, but the runtime/session contract that still leaks concrete kernel state into persistence and session use cases. `createAppShellRuntime` imports and instantiates concrete `World` and `CommandStack` directly (`frontend/src/application/appShell/AppShellRuntime.ts:2`, `frontend/src/application/appShell/AppShellRuntime.ts:3`, `frontend/src/application/appShell/AppShellRuntime.ts:17`, `frontend/src/application/appShell/AppShellRuntime.ts:18`) and wires those concrete objects into `SelectionDeletionCommandService` (`frontend/src/application/appShell/AppShellRuntime.ts:40`). `AppShellPorts` defines the project-session persistence port in terms of concrete `CommandStack`, `World`, and `ProjectData` (`frontend/src/application/appShell/AppShellPorts.ts:2`, `frontend/src/application/appShell/AppShellPorts.ts:3`, `frontend/src/application/appShell/AppShellPorts.ts:5`, `frontend/src/application/appShell/AppShellPorts.ts:26`, `frontend/src/application/appShell/AppShellPorts.ts:28`). The adapter then passes those objects straight to static `ProjectService` methods (`frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:1`, `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:2`, `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:3`, `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:7`, `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:8`, `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:15`, `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:16`). `ProjectService` itself is explicitly command-stream persistence orchestration and consumes `CommandStack`/`World` (`frontend/src/services/ProjectService.ts:2`, `frontend/src/services/ProjectService.ts:5`, `frontend/src/services/ProjectService.ts:6`, `frontend/src/services/ProjectService.ts:27`, `frontend/src/services/ProjectService.ts:45`).

The runtime/session seam is central because initialization and save/load are lifecycle-defining use cases. `initializeWorld` still creates and pushes an initialization `Command` directly from an application world initializer (`frontend/src/application/world/initializeWorld.ts:19`, `frontend/src/application/world/initializeWorld.ts:22`, `frontend/src/application/world/initializeWorld.ts:33`, `frontend/src/application/world/initializeWorld.ts:34`), while project-session use cases call initialization during create/open/new flows. This makes the runtime session own an implicit bundle of world, command history, initialization, snapshot, restore, and autosave semantics without a named contract.

Other residual command producers remain real but are lower priority for Wave 022 because they are leaf use-case seams that should consume a cleaner runtime/session kernel once it exists: point movement (`frontend/src/application/canvas/CanvasPointMovementUseCase.ts:9`, `frontend/src/application/canvas/CanvasPointMovementUseCase.ts:12`, `frontend/src/application/canvas/CanvasPointMovementUseCase.ts:32`, `frontend/src/application/canvas/CanvasPointMovementUseCase.ts:33`), style updates (`frontend/src/application/canvas/CanvasStyleUseCase.ts:8`, `frontend/src/application/canvas/CanvasStyleUseCase.ts:11`, `frontend/src/application/canvas/CanvasStyleUseCase.ts:14`, `frontend/src/application/canvas/CanvasStyleUseCase.ts:15`), construction (`frontend/src/application/construction/ConstructionUseCases.ts:35`, `frontend/src/application/construction/ConstructionUseCases.ts:36`, `frontend/src/application/construction/ConstructionUseCases.ts:43`, `frontend/src/application/construction/ConstructionUseCases.ts:44`), and process-history edits (`frontend/src/application/processHistory/ProcessHistoryUseCases.ts:20`, `frontend/src/application/processHistory/ProcessHistoryUseCases.ts:22`, `frontend/src/application/processHistory/ProcessHistoryUseCases.ts:23`, `frontend/src/application/processHistory/ProcessHistoryUseCases.ts:73`, `frontend/src/application/processHistory/ProcessHistoryUseCases.ts:77`, `frontend/src/application/processHistory/ProcessHistoryUseCases.ts:78`). Canvas rendering still injects the concrete `World` and polls it for versions (`frontend/src/components/workspace/SvgCanvas.vue:412`, `frontend/src/components/workspace/SvgCanvas.vue:479`, `frontend/src/components/workspace/SvgCanvas.vue:480`), but rendering/domain-contract cleanup is less central than defining the session object those views observe.

**Target outcome**

The app shell has an explicit runtime session boundary that owns the current in-memory `World`, `CommandStack`, initialization lifecycle, snapshot request, restore request, dirty/version implications, and command-history exposure needed by app-shell use cases. App-shell use cases and persistence ports should consume a named session/kernel interface rather than passing raw `{ world, commandStack }` pairs and `ProjectData` through broad ports.

The production persistence adapter remains the only bridge to the current `ProjectService` command-stream implementation. `ProjectService` may still serialize and replay command streams internally in this wave, but that concrete static service shape no longer leaks into app-shell port definitions or use-case call sites. The selected proposal may either introduce a small `ProjectSessionKernel`/`RuntimeSession` object or narrower snapshot/restore DTO ports, but it must choose one authoritative contract and delete the parallel raw pair exposure.

**Explicit DELETE list**

- Delete `ProjectSessionPersistencePort` method signatures that expose raw `{ commandStack: CommandStack; world: World; projectName: string }` and `{ world: World; commandStack: CommandStack }` pairs to app-shell use cases once the reviewed session boundary replaces them.
- Delete app-shell port imports of `CommandStack`, `World`, and `ProjectData` where they are only present to express persistence/session contracts after the boundary is introduced.
- Delete duplicated direct snapshot/restore plumbing in `ProjectSessionUseCases` and `AutoSaveUseCases` that manually passes `world` plus `commandStack` to persistence.
- Delete tests that assert app-shell persistence use cases call static-shaped `ProjectService` contracts or pass raw concrete kernel objects; replace with tests for the new session/persistence boundary.
- Delete transitional compatibility overloads, adapter shims, or dual paths that allow both raw `World`/`CommandStack` persistence calls and the new runtime-session boundary to remain active.
- Do not delete or rewrite command descriptor serialization, `OperationRegistry`, `CommandStack` behavior, project schema/version constants, Drive/auth internals, canvas/tool/process-history producers, rendering services, backend/docs/specs, package/tooling, or debug placeholders unless a reviewed plan edit broadens scope.

**Success criteria**

- App-shell persistence/session port definitions no longer expose concrete `World`, `CommandStack`, or `ProjectData` to use-case code except inside the dedicated production adapter or reviewed runtime-session owner.
- `ProjectSessionUseCases` and `AutoSaveUseCases` request snapshot/restore/save/open behavior through the selected session/persistence boundary rather than manually passing raw world/command-stack pairs.
- `AppShellRuntime` has one explicit ownership point for runtime session creation and wires selection deletion, keyboard, active-plane, autosave, and project-session use cases through typed boundaries without hidden browser/global defaults reintroduced from before Wave 020.
- `initializeWorld` command/history behavior remains user-visible equivalent for startup, new project, open project fallback, undo/redo counts, and active-plane setup; if initialization remains command-backed, its command ownership is part of the named runtime/session boundary rather than an implicit helper contract.
- `ProjectSessionPersistenceAdapter` is the only app-shell module that directly imports `ProjectService`, and any remaining `CommandStack`/`World` use there is adapter-private and covered by focused tests.
- No canvas/tool, process-history, toolbar, rendering, Three, backend, docs/spec, package/tooling, Drive/auth, command descriptor, or operation-registry behavior changes occur without reviewed plan edit.
- Focused tests cover runtime-session creation, create/open/new project initialization, snapshot/restore delegation, autosave save calls, selection-delete service wiring through the runtime, and failure propagation without requiring real browser APIs or Drive credentials.
- Mandatory validation cadence passes with stable logs: root/frontend lint where defined, focused Vitest for app-shell runtime/session/persistence tests, full root/frontend Vitest, root/frontend build, root/frontend Playwright e2e because startup/open/new/save/autosave and keyboard-visible flows are user-observable, live preview refresh on `0.0.0.0:5173`, HTTP reachability probe, and Playwright/live smoke for startup/new project plus representative save/status and delete/undo behavior.

**Dependencies**

Depends on Wave 021 because selection/delete command-kernel extraction gives the runtime one concrete command-boundary service to wire and removes the most immediate app-shell leaf command leak. It is ordered before leaf canvas/style/construction/process-history command-producer cleanup, persistence-schema or backend/frontend contract stance, validation-gate hardening, placeholder/debug cleanup, docs/spec drift, and remaining rendering/domain-contract seams because those later waves should consume an explicit runtime-session/persistence boundary rather than the current raw `World`/`CommandStack` pair contract.

**Validation requirements**

All Wave 022 validation stdout/stderr must be captured to stable files under the reviewed Cycle 022 implementation directory's `validation/` subdirectory. Undefined commands may be skipped only with exact package-script evidence in the implementation log; defined root or workspace commands are mandatory.

1. Capture pre-edit scoped git status/diff and static scans for app-shell imports of `World`, `CommandStack`, `ProjectData`, `ProjectService`, raw `snapshotCurrentSession`/`restoreSession` signatures, initialization command creation, and direct command producers intentionally left out of scope.
2. Run focused Vitest for changed app-shell runtime/session/persistence adapter modules, including create/open/new project initialization, snapshot/restore, autosave, failure handling, and runtime wiring of the existing selection-delete service.
3. Run architecture/static tests or focused source-boundary checks proving app-shell use-case ports no longer expose raw `World`/`CommandStack` persistence signatures and `ProjectService` imports remain adapter-private.
4. Run `npm run lint` at the repository root and in every workspace where a lint script is defined, including `frontend` while it remains the active workspace.
5. Run full Vitest at the repository root and in every workspace where a test/Vitest script is defined, including `frontend` while it remains the active workspace.
6. Run `npm run build` at the repository root and in every workspace where a build script is defined, including `frontend` while it remains the active workspace.
7. Run Playwright/e2e at the repository root and in every workspace where an e2e script is defined because project/session/startup/save and keyboard behavior are user-observable.
8. Refresh the live preview bound to `0.0.0.0:5173`, capture HTTP 200 reachability probes for loopback and in-container host binding where meaningful, and run focused Playwright/live browser smoke for startup/new project plus representative save/status and delete/undo behavior without real Drive credentials.

**Risks**

- A runtime-session boundary can become an application god object if it absorbs every use case. Keep it to ownership of current runtime state, initialization, snapshot/restore, and explicitly required command-history exposure; leaf construction/process-history producers remain deferred.
- Moving snapshot/restore contracts can accidentally become a project-schema redesign. Keep `ProjectService` command-stream internals intact unless a reviewed plan edit deliberately reopens persistence architecture.
- Initialization is command-backed and affects undo/redo/history semantics. Focused tests must prove new/open startup behavior and command-stack counts remain equivalent.
- Autosave and save-status timing are user-visible. Use fake scheduler/adapter tests and e2e/live smoke rather than assuming the port refactor is behavior-neutral.
- Existing unrelated dirty files and generated audit artifacts may be present. Implementation must use path-scoped status/diff, avoid reverting unrelated work, and not depend on unowned dirty state.

**No-backcompat rationale**

Raw `World`/`CommandStack` pairs in app-shell persistence ports are internal architecture debt, not a public compatibility contract. Preserving both the old pair-based persistence calls and a named runtime-session boundary would keep the ownership model ambiguous and make later command-producer and persistence waves harder. Delete the old port shape and update active callers/tests directly once the reviewed boundary is selected.


---

## Wave 023 — Runtime-session consumer ports and command-history boundary

**Status**

Added by `cycle-023-wave-plan-extension` after Wave 022 completed. Requires review of this plan extension before the canonical `cycle-023-fresh-scout-proposals` stage and before any implementation. This entry is grounded in current post-Wave-022 source evidence and the Wave 022 implementation/closure log, which explicitly marks Wave 022 complete while leaving raw `World`/`CommandStack` accessors for active-plane, keyboard/history, selection, command services, rendering-facing consumers, and adapter-private persistence casts as residual debt.

**Scope**

- `frontend/src/application/appShell/RuntimeSession.ts`
- `frontend/src/application/appShell/AppShellRuntime.ts`
- `frontend/src/application/appShell/ActivePlaneUseCases.ts`
- `frontend/src/application/appShell/KeyboardShortcutRouter.ts`
- `frontend/src/application/appShell/SelectionUseCases.ts`
- `frontend/src/application/appShell/AppShellPorts.ts` only where new session/command-history/read ports belong
- `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts` only where a stricter runtime-session adapter handle can remove private casts without reopening `ProjectService` internals
- `frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts` only as an existing command-service consumer that may receive a narrower delete command/session port
- focused app-shell/session/keyboard/active-plane/selection/persistence-adapter boundary tests and architecture scans

**Scope guard**

This wave owns the consumer-facing seams left by Wave 022's new `RuntimeSession`: active-plane state, keyboard undo/redo history, selection read/delete support, and the adapter-private persistence handle. It must not migrate unrelated leaf command producers in canvas movement/style/construction/process-history, redesign command descriptors or persistence schema/replay, reopen Drive/auth/browser composition, alter rendering/presentation/domain realization/Three scene-host boundaries, change backend/docs/spec/package/tooling, or perform validation-platform/debug cleanup.

Implementation must begin with a current inventory of every `RuntimeSession` raw accessor and each active consumer of raw `World`/`CommandStack` in the app-shell area. The proposals must choose narrow ports/capabilities by behavior (`active-plane`, `selection-world-read`, `command-history`, `selection-delete-command`, `persistence-runtime-adapter`) rather than replacing `World` with a broad facade. If inventory proves the adapter cast can only be removed by redesigning `ProjectService` serialization or `CommandStack` inspection APIs, stop and run a reviewed plan-edit mini-cycle; do not hide persistence-contract redesign inside this consumer-port wave.

**Current grounding**

Wave 022 completed the runtime-session kernel and narrowed the public app-shell persistence contract: `RuntimeSession` now owns the current `World`/`CommandStack` lifecycle, project/session/autosave use cases consume session methods, and `ProjectSessionPersistenceAdapter` is the only app-shell bridge to `ProjectService` (`architecture-audit/cycle-022-runtime-session-kernel-persistence-port-boundary/implementation-log.md`, “Production files changed”; “DELETE list / proofs”; “Validation-and-preview closure — t1 independent verification”). The same log records residual risks that raw-object accessors remain for active-plane, keyboard/history, selection, rendering-facing consumers, and that `ProjectSessionPersistenceAdapter` still uses private casts from opaque handles (`architecture-audit/cycle-022-runtime-session-kernel-persistence-port-boundary/implementation-log.md`, “Residual risks and next-wave candidates”; “Next-wave recommendation / re-rank”).

Current source evidence confirms those residuals are active and central. `RuntimeSession` owns concrete `World` and `CommandStack` and exposes four raw-object accessors: `worldForView()`, `commandStackForShortcuts()`, `worldForUseCases()`, and `commandStackForCommandServices()` (`frontend/src/application/appShell/RuntimeSession.ts:16`, `frontend/src/application/appShell/RuntimeSession.ts:17`, `frontend/src/application/appShell/RuntimeSession.ts:18`, `frontend/src/application/appShell/RuntimeSession.ts:20`, `frontend/src/application/appShell/RuntimeSession.ts:24`, `frontend/src/application/appShell/RuntimeSession.ts:28`, `frontend/src/application/appShell/RuntimeSession.ts:32`). `AppShellRuntime` immediately unwraps the session into raw `world`/`commandStack` for view/shortcut injection and wires raw session objects into `ActivePlaneUseCases`, `SelectionDeletionCommandService`, and `SelectionUseCases` (`frontend/src/application/appShell/AppShellRuntime.ts:15`, `frontend/src/application/appShell/AppShellRuntime.ts:16`, `frontend/src/application/appShell/AppShellRuntime.ts:17`, `frontend/src/application/appShell/AppShellRuntime.ts:18`, `frontend/src/application/appShell/AppShellRuntime.ts:39`, `frontend/src/application/appShell/AppShellRuntime.ts:40`, `frontend/src/application/appShell/AppShellRuntime.ts:41`, `frontend/src/application/appShell/AppShellRuntime.ts:68`, `frontend/src/application/appShell/AppShellRuntime.ts:69`).

The consumers are behaviorally narrow but typed against broad runtime objects. `ActivePlaneUseCases` imports `World`, subscribes directly to world changes, reads all projection planes, reads/writes active-plane id, and looks up a projection-plane name (`frontend/src/application/appShell/ActivePlaneUseCases.ts:2`, `frontend/src/application/appShell/ActivePlaneUseCases.ts:12`, `frontend/src/application/appShell/ActivePlaneUseCases.ts:17`, `frontend/src/application/appShell/ActivePlaneUseCases.ts:23`, `frontend/src/application/appShell/ActivePlaneUseCases.ts:28`, `frontend/src/application/appShell/ActivePlaneUseCases.ts:34`, `frontend/src/application/appShell/ActivePlaneUseCases.ts:42`, `frontend/src/application/appShell/ActivePlaneUseCases.ts:54`). `SelectionUseCases` imports `World` only for active-plane select-all and cascade-preview dependency reads (`frontend/src/application/appShell/SelectionUseCases.ts:2`, `frontend/src/application/appShell/SelectionUseCases.ts:10`, `frontend/src/application/appShell/SelectionUseCases.ts:45`, `frontend/src/application/appShell/SelectionUseCases.ts:48`, `frontend/src/application/appShell/SelectionUseCases.ts:49`, `frontend/src/application/appShell/SelectionUseCases.ts:50`, `frontend/src/application/appShell/SelectionUseCases.ts:59`). `KeyboardShortcutRouter` imports `CommandStack` only for undo/redo availability and execution (`frontend/src/application/appShell/KeyboardShortcutRouter.ts:1`, `frontend/src/application/appShell/KeyboardShortcutRouter.ts:17`, `frontend/src/application/appShell/KeyboardShortcutRouter.ts:18`, `frontend/src/application/appShell/KeyboardShortcutRouter.ts:97`, `frontend/src/application/appShell/KeyboardShortcutRouter.ts:98`, `frontend/src/application/appShell/KeyboardShortcutRouter.ts:100`). These are good candidates for narrow ports because they do not need the full mutable runtime object surface.

The persistence adapter cast residual is also real but should be bounded. `RuntimeSession` creates opaque snapshot/restore handles that still contain concrete runtime objects internally (`frontend/src/application/appShell/RuntimeSession.ts:77`, `frontend/src/application/appShell/RuntimeSession.ts:79`, `frontend/src/application/appShell/RuntimeSession.ts:80`, `frontend/src/application/appShell/RuntimeSession.ts:85`, `frontend/src/application/appShell/RuntimeSession.ts:87`, `frontend/src/application/appShell/RuntimeSession.ts:88`). `ProjectSessionPersistenceAdapter` casts those handles back to concrete `CommandStack`/`World` and casts persisted payloads back to `ProjectData` before calling `ProjectService` (`frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:1`, `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:3`, `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:4`, `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:8`, `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:14`, `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:17`, `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:22`, `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:23`). A small package-private typed adapter handle is central enough to consider in this wave only if it deletes those private casts without changing the persistence format.

Lower-priority command producers remain real but should not displace this runtime-session consumer cleanup. Current scans still show direct command creation/push in world initialization, point movement, style updates, construction, selection deletion, and process-history use cases (`frontend/src/application/world/initializeWorld.ts:22`, `frontend/src/application/world/initializeWorld.ts:33`, `frontend/src/application/world/initializeWorld.ts:34`, `frontend/src/application/canvas/CanvasPointMovementUseCase.ts:12`, `frontend/src/application/canvas/CanvasPointMovementUseCase.ts:32`, `frontend/src/application/canvas/CanvasPointMovementUseCase.ts:33`, `frontend/src/application/canvas/CanvasStyleUseCase.ts:11`, `frontend/src/application/canvas/CanvasStyleUseCase.ts:14`, `frontend/src/application/canvas/CanvasStyleUseCase.ts:15`, `frontend/src/application/construction/ConstructionUseCases.ts:36`, `frontend/src/application/construction/ConstructionUseCases.ts:43`, `frontend/src/application/construction/ConstructionUseCases.ts:44`, `frontend/src/application/processHistory/ProcessHistoryUseCases.ts:73`, `frontend/src/application/processHistory/ProcessHistoryUseCases.ts:77`, `frontend/src/application/processHistory/ProcessHistoryUseCases.ts:78`). Those leaf producers should consume a cleaner runtime/session and command-history boundary after this wave rather than forcing broad raw-object exposure to remain.

**Target outcome**

`RuntimeSession` remains the single owner of the current in-memory `World` and `CommandStack`, but app-shell consumers no longer receive full mutable runtime objects when a narrow behavior port is sufficient. Active-plane logic consumes an active-plane/session read-write port; selection logic consumes selection candidate/dependency read capabilities plus its existing delete command port; keyboard routing consumes a command-history/undo-redo port rather than `CommandStack`; persistence consumes a typed runtime adapter handle if the reviewed proposal can delete adapter-private casts without changing `ProjectService` internals. Any remaining raw `World` exposure to view/rendering descendants is explicitly inventoried and either narrowed in this wave if it is app-shell-owned or deferred as rendering/presentation boundary work with a citation.

The result should make the app-shell runtime boundary sharper: use cases express what they need, `RuntimeSession` or small adapters satisfy those needs, and future leaf command-producer waves can depend on explicit command-history/session capabilities instead of reusing raw `World`/`CommandStack` accessors.

**Explicit DELETE list**

- Delete `RuntimeSession.worldForUseCases()` and `RuntimeSession.commandStackForCommandServices()` if the reviewed ports replace those raw-object use-case exposures.
- Delete `RuntimeSession.commandStackForShortcuts()` and `KeyboardShortcutRouter`'s `CommandStack` dependency if replaced by a narrow command-history/undo-redo port.
- Delete `ActivePlaneUseCases` direct import/dependency on concrete `World` if replaced by an active-plane port covering subscribe/read/cycle/update semantics.
- Delete `SelectionUseCases` direct import/dependency on concrete `World` if replaced by a selection read/dependency-preview port covering active-plane selectable ids and cascade-preview ids.
- Delete `ProjectSessionPersistenceAdapter` private casts from opaque runtime handles to `{ world, commandStack }` if a typed package-private adapter handle can preserve the Wave 022 public app-shell contract without schema/replay redesign.
- Delete app-shell tests that assert raw `World`/`CommandStack` injection into these consumers; replace with port-contract tests and boundary assertions.
- Delete transitional overloads, broad runtime facades, compatibility wrappers, dead exports, or dual raw-object/port paths created during the move.
- Do not delete or rewrite canvas/style/construction/process-history command producers, `ProjectService` serialization internals, command descriptors, operation registry, Drive/auth/browser adapters, rendering/presentation/domain realization/Three scene-host modules, backend/docs/spec/package files, or validation/debug surfaces without reviewed plan edit.

**Success criteria**

- `RuntimeSession` exposes narrow consumer ports/capabilities for active-plane, selection/dependency preview, command history, and persistence adapter access where selected by review; raw `World`/`CommandStack` use-case accessors are deleted or explicitly justified as deferred view/rendering seams in the implementation log.
- `ActivePlaneUseCases`, `SelectionUseCases`, and `KeyboardShortcutRouter` no longer import concrete `World` or `CommandStack` for behavior that can be represented by narrow ports.
- `AppShellRuntime` wires named session ports/capabilities instead of immediately unwrapping the session into raw runtime objects for every consumer; any remaining raw view-facing exposure is documented as an intentional rendering/presentation handoff.
- `ProjectSessionPersistenceAdapter` no longer uses private casts from opaque runtime handles if the reviewed proposal includes the typed adapter-handle slice; if not selected, the implementation log records why persistence-cast removal requires a later persistence-contract wave.
- User-visible active-plane cycling, active-plane name updates, Ctrl/Cmd+Z undo, redo, select-all-in-active-plane, cascade preview, delete, autosave/version behavior, open/new project restore, and selection-delete command service wiring remain equivalent.
- No persistence schema/replay, command descriptor, leaf canvas/tool/process-history command-producer, rendering, backend, docs/spec, package/tooling, Drive/auth, validation-platform, or debug cleanup changes occur without reviewed plan edit.
- Focused tests cover the new ports/capabilities for active-plane, selection read/cascade preview, keyboard command-history undo/redo, RuntimeSession wiring, and any typed persistence adapter handle chosen by the proposal.
- Mandatory validation cadence passes with stable logs: root/frontend lint where defined, focused Vitest for app-shell/session/keyboard/selection/persistence-adapter tests, full root/frontend Vitest, root/frontend build, root/frontend Playwright e2e because keyboard/selection/project-session behavior is user-observable, live preview refresh on `0.0.0.0:5173`, HTTP reachability probe, and Playwright/live smoke for active-plane cycling, select-all/delete/undo/redo, and startup/new/open-equivalent project behavior without real Drive credentials.

**Dependencies**

Depends on Wave 022 because that wave created `RuntimeSession` and intentionally left raw consumer accessors plus adapter-private casts as residual debt. It is ordered before leaf canvas/style/construction/process-history command-producer cleanup, backend/frontend contract stance, validation-gate hardening, placeholder/debug cleanup, docs/spec drift, and remaining rendering/domain-contract seams because those later waves should consume a stable runtime-session/command-history boundary rather than broad raw `World`/`CommandStack` access.

**Validation requirements**

All Wave 023 validation stdout/stderr must be captured to stable files under the reviewed Cycle 023 implementation directory's `validation/` subdirectory. Undefined commands may be skipped only with exact package-script evidence in the implementation log; defined root or workspace commands are mandatory.

1. Capture pre-edit scoped git status/diff and static scans for all `RuntimeSession` raw accessors, `World`/`CommandStack` imports in app-shell consumers, keyboard undo/redo use, selection active-plane/cascade reads, active-plane world subscriptions, `ProjectSessionPersistenceAdapter` casts, and direct command producers explicitly left out of scope.
2. Run focused Vitest for changed app-shell runtime/session ports, active-plane use cases, selection use cases, keyboard router, selection-delete wiring, and persistence adapter handle tests where touched.
3. Run architecture/static tests or focused boundary scans proving the selected consumers no longer import concrete `World`/`CommandStack` and no dual raw-object/port paths remain.
4. Run `npm run lint` at the repository root and in every workspace where a lint script is defined, including `frontend` while it remains the active workspace.
5. Run full Vitest at the repository root and in every workspace where a test/Vitest script is defined, including `frontend` while it remains the active workspace.
6. Run `npm run build` at the repository root and in every workspace where a build script is defined, including `frontend` while it remains the active workspace.
7. Run Playwright/e2e at the repository root and in every workspace where an e2e script is defined because keyboard/selection/active-plane/project-session behavior is user-observable.
8. Refresh the live preview bound to `0.0.0.0:5173`, capture HTTP 200 reachability probes, and run focused Playwright/live browser smoke for active-plane cycling, select-all/delete/undo/redo, and startup/new-project behavior without real Drive credentials.

**Risks**

- A consumer port can become a renamed `World`/`CommandStack` facade if it mirrors too many methods. Keep ports behavior-scoped and backed by the inventory.
- Splitting undo/redo history out of `CommandStack` exposure can change keyboard shortcut availability or notification timing if not tested with focused and e2e coverage.
- Selection read ports must preserve cascade-preview and active-plane select-all semantics; dependency deletion order is correctness-critical.
- Removing adapter-private casts may tempt a persistence schema or command serialization redesign. Keep the typed adapter-handle slice small; defer deeper persistence work if casts cannot be removed without changing `ProjectService` internals.
- Raw view-facing `World` exposure may still be needed for rendering/presentation descendants. Do not smuggle rendering boundary work into this wave; document deferred view seams explicitly.
- Existing unrelated dirty audit/source state may be present. Implementation must use path-scoped status/diff, avoid reverting unrelated work, and not depend on unowned modifications.

**No-backcompat rationale**

The raw `RuntimeSession` accessors and app-shell consumer dependencies on concrete `World`/`CommandStack` are internal architecture debt, not compatibility surfaces. Preserving both raw-object and port-based paths would keep the runtime ownership model ambiguous and encourage future consumers to bypass the session boundary. Delete the raw use-case/history exposures once reviewed ports exist, update callers/tests directly, and keep any deferred raw view exposure explicit rather than hidden behind compatibility wrappers.

---

## Wave 024 — Command-producer runtime ports for canvas, construction, and process history

**Status**

Added by `cycle-024-wave-plan-extension` after Wave 023 completed. Requires review of this plan extension before the canonical `cycle-024-fresh-scout-proposals` stage and before any implementation. This entry is grounded in current post-Wave-023 source evidence and the Wave 023 implementation/closure log, which explicitly marks Wave 023 complete while leaving `RuntimeSession.commandStackForDeferredCommandProducers()` as the residual raw command-stack handoff for canvas/tool/process-history command producers.

**Scope**

- `frontend/src/application/appShell/RuntimeSession.ts`
- `frontend/src/application/appShell/AppShellRuntime.ts`
- `frontend/src/application/appShell/AppShellPorts.ts` only where command-producer/session ports belong
- `frontend/src/application/canvas/CanvasPointMovementUseCase.ts`
- `frontend/src/application/canvas/CanvasStyleUseCase.ts`
- `frontend/src/application/construction/ConstructionUseCases.ts`
- `frontend/src/application/construction/QuickToolUseCases.ts` if it still carries command-stack dependencies for quick construction
- `frontend/src/application/processHistory/ProcessHistoryUseCases.ts`
- `frontend/src/application/processHistory/ProcessHistoryController.ts`
- `frontend/src/application/tools/CanvasToolController.ts` and `frontend/src/application/tools/ToolCommandIntents.ts` only where they wire the selected command-producer ports
- `frontend/src/components/workspace/SvgCanvas.vue` only for provide/inject and controller wiring needed to stop consuming raw command-stack/runtime producer handles
- `frontend/src/tools/ITool.ts`, `frontend/src/tools/ArgumentCollectorTool.ts`, and concrete tools only where they currently receive broad `World` context for command-production concerns rather than interaction/query concerns
- focused command-producer/runtime-boundary, canvas movement/style, construction, process-history, tool-controller, undo/redo, and architecture-boundary tests

**Scope guard**

This wave owns the residual command-producer/runtime seam left by Wave 023: `RuntimeSession.commandStackForDeferredCommandProducers()` and the active canvas movement/style, construction, and process-history producers that still construct `Command` objects, instantiate concrete operations, commit/rollback, and push directly to `CommandStack`. It must not redesign command descriptor serialization, `CommandStack` internals, persistence schema/replay, `ProjectService`, backend/frontend contract stance, rendering selectors, Three scene-hosts, Drive/auth/browser adapters, package/tooling, validation-platform hardening, docs/spec reconciliation, or debug/placeholder cleanup.

The proposals must start with a current inventory of every active consumer of `commandStackForDeferredCommandProducers()` and every direct command producer in the scoped application/canvas/construction/process-history/tool path. The selected design should introduce behavior-sized command-production ports/services that own command lifecycle and stack push semantics without becoming a broad mutable `World`/`CommandStack` facade. If source inventory proves a producer cannot be narrowed without changing command serialization/replay semantics or operation descriptors, stop and run a reviewed plan-edit mini-cycle rather than hiding command-kernel redesign in this wave.

**Current grounding**

Wave 023 completed the runtime-session consumer-port and command-history cleanup: active-plane, selection, keyboard undo/redo, toolbar history, selection deletion, and adapter-local persistence handles now use narrow ports, while raw accessors `worldForUseCases()`, `commandStackForCommandServices()`, `commandStackForShortcuts()`, and reviewer-rejected `commandStackForView()` are absent (`architecture-audit/cycle-023-runtime-session-consumer-ports-command-history-boundary/implementation-log.md`, “Deleted / removed legacy surfaces”; “Consumer-port / command-history closure assessment”). The same implementation log names the remaining central seam: `commandStackForDeferredCommandProducers()` is retained only for deferred canvas/tool/process-history producers, and `worldForView()` remains the separate rendering/view seam (`architecture-audit/cycle-023-runtime-session-consumer-ports-command-history-boundary/implementation-log.md`, “Residual risks and deferred seams”; “Next-wave candidates”).

Current source confirms the residual command-producer seam is active. `RuntimeSession` still owns a concrete `CommandStack` and exposes `commandStackForDeferredCommandProducers()` (`frontend/src/application/appShell/RuntimeSession.ts:19`, `frontend/src/application/appShell/RuntimeSession.ts:25`, `frontend/src/application/appShell/RuntimeSession.ts:26`). `AppShellRuntime` immediately unwraps that command stack and returns it in the runtime object for downstream producers (`frontend/src/application/appShell/AppShellRuntime.ts:16`, `frontend/src/application/appShell/AppShellRuntime.ts:17`, `frontend/src/application/appShell/AppShellRuntime.ts:101`). `SvgCanvas.vue` still injects the raw `commandStack` (`frontend/src/components/workspace/SvgCanvas.vue:419` in `architecture-audit/cycle-024-wave-plan-extension/seam-scan-commandstack.stdout.log`).

The scoped producers are command-lifecycle owners today, not just passive consumers. `CanvasPointMovementUseCase` imports `Command`, `CommandStack`, `World`, and `UpdateFreePoint2DPositionOp`; it creates a command, previews by rollback/add-and-execute, commits, and pushes to the stack (`frontend/src/application/canvas/CanvasPointMovementUseCase.ts:2`, `:3`, `:4`, `:5`, `:9`, `:12`, `:18`, `:19`, `:32`, `:33`). `CanvasStyleUseCase` imports the same broad command/runtime types, uses an `as any` operation cast, commits, and pushes (`frontend/src/application/canvas/CanvasStyleUseCase.ts:1`, `:2`, `:3`, `:4`, `:8`, `:11`, `:13`, `:14`, `:15`). `ConstructionUseCases` accepts raw `World` and `CommandStack`, imports many sequence factories and concrete operations, builds a command, adds a process action group, executes construction operations, checks feasibility, commits, and pushes (`frontend/src/application/construction/ConstructionUseCases.ts:1`, `:2`, `:3`, `:8-21`, `:29-44`). `ProcessHistoryUseCases` imports `Command`, `CommandStack`, concrete process-tree operations, `IOperation`, and `World`; it creates/commits/pushes commands for process-history actions (`frontend/src/application/processHistory/ProcessHistoryUseCases.ts:1-9`, `:20-24`, `:72-78`). `ProcessHistoryController` still receives `world` plus unknown `commandStack`, casts the stack, and passes both raw objects into the use cases (`frontend/src/application/processHistory/ProcessHistoryController.ts:1-2`, `:15-18`, `:20-35`, `:41-42`).

Tool/controller seams show that Wave 024 should be command-producer focused rather than a broad tool rewrite. `ITool.ToolContext` already carries a `commandSink` but also still carries the full `World` for interaction/query needs (`frontend/src/tools/ITool.ts:19-29`). `ArgumentCollectorTool` builds typed construction intents and delegates command execution to `context.commandSink.executeConstructionIntent(...)`, but it also reads `world` for active-plane element lookup and collection context (`frontend/src/tools/ArgumentCollectorTool.ts:91-104`, `:130-143`, `:162-176`, `:200-216`). This supports a bounded wave that moves command-production/runtime stack access behind ports while deferring a separate rendering/interaction read-port redesign if broad `World` reads remain necessary for hit testing or realization.

Lower-priority candidates remain real but are less central than this seam after Wave 023. `worldForView()` is still a raw rendering/view handoff, and `SvgCanvas.vue`/rendering services continue to consume domain view data; however, rendering extraction should consume a command-producer boundary that no longer requires raw command-stack injection into canvas. `ProjectSessionPersistenceAdapter` still has DTO/cast residue around `ProjectService`, but Wave 023 intentionally bounded persistence schema/replay out of the consumer-port cleanup. Backend/frontend contract stance, validation gate hardening, placeholder/debug surfaces, docs/spec drift, and remaining rendering/domain-contract seams do not block the central runtime command-production ownership question.

**Target outcome**

`RuntimeSession` no longer exposes a raw `CommandStack` accessor for deferred command producers. Canvas point movement, canvas style updates, construction intents, quick-tool construction, and process-history actions consume explicit command-production/session ports or use-case services that express the behavior they need: preview/commit/cancel point movement, style update, construction command execution, process-history command execution, and state reads. Vue components and tools continue to emit typed intents and render/collect interaction state; command lifecycle, concrete operation execution, commit/rollback, feasibility checks, and stack push semantics are owned behind application command-producer ports rather than passed through raw `World`/`CommandStack` pairs.

Any remaining full `World` exposure is classified: interaction/read/rendering access is deferred to view/rendering/read-port waves, while command-production access is deleted from the public app-shell/runtime surface. The result should make future rendering/view and persistence waves consume stable application command boundaries rather than relying on raw runtime object handoffs.

**Explicit DELETE list**

- Delete `RuntimeSession.commandStackForDeferredCommandProducers()` once scoped producers consume reviewed command-production ports/services.
- Delete raw `commandStack` return/provide/inject paths from `AppShellRuntime` and `SvgCanvas.vue` for canvas/style/construction/process-history command execution.
- Delete constructors/params in `CanvasPointMovementUseCase`, `CanvasStyleUseCase`, `ConstructionUseCases`, `QuickToolUseCases`, `ProcessHistoryUseCases`, and `ProcessHistoryController` that accept raw `CommandStack` when replaced by behavior ports.
- Delete direct stack `push(...)` calls from the scoped producers once command lifecycle is centralized behind the selected ports/services.
- Delete direct `Command` construction and concrete operation imports from scoped modules where the reviewed design moves those operations into application-owned command producer services; keep operation imports only in the selected command-production owner, not in Vue/tool/controller shells.
- Delete the `CanvasStyleUseCase` `as any` operation cast if the style command producer can use a typed operation/command boundary within this wave.
- Delete process-history controller casts from `unknown` to `CommandStack` and any tests that assert raw stack injection.
- Delete transitional overloads, duplicate raw-and-port execution paths, compatibility wrappers, dead exports, and broad `RuntimeSession`/command facades introduced during the migration.
- Do not delete or rewrite `worldForView()`, rendering selector/service internals, command serialization descriptors, `OperationRegistry`, persistence schema/replay, backend, docs/specs, package/tooling, validation/debug surfaces, or Drive/auth code without a reviewed plan edit.

**Success criteria**

- No production source calls `RuntimeSession.commandStackForDeferredCommandProducers()`; the accessor is deleted.
- `AppShellRuntime` no longer returns/provides a raw `commandStack` for canvas/style/construction/process-history command production.
- `SvgCanvas.vue` and active tool/controller wiring no longer inject raw `commandStack` for command execution.
- `CanvasPointMovementUseCase`, `CanvasStyleUseCase`, `ConstructionUseCases`, `QuickToolUseCases` where applicable, `ProcessHistoryUseCases`, and `ProcessHistoryController` no longer depend on raw `CommandStack` for stack push behavior; command-production lifecycle is behind reviewed application ports/services.
- User-visible canvas point drag preview/commit/cancel, style editing, construction flows, guide/sibling-guide creation, intersections, dynamic projection-plane setup, retained quick/3D tool flows, process-history push/pop/rename/toggle actions, and undo/redo remain equivalent.
- Any retained `World` dependency in tools/canvas is explicitly justified as interaction/read/rendering access, not command-production stack access, and is recorded as a candidate for later view/read-port waves if still broad.
- No persistence schema/replay, command descriptor registry, backend/frontend contract, rendering selector, Three scene, package/tooling, docs/spec, validation-platform, debug, or Drive/auth changes occur without reviewed plan edit.
- Focused tests cover the selected command-production ports/services for point movement preview/commit/cancel, style update, construction intent execution including process action groups, process-history command execution, RuntimeSession/AppShellRuntime wiring, and undo/redo behavior after the port migration.
- Mandatory validation cadence passes with stable logs: root/frontend lint where defined, focused Vitest for touched command-producer/runtime modules, full root/frontend Vitest, root/frontend build, root/frontend Playwright e2e because canvas/process-history/tool behavior is user-observable, live preview refresh on `0.0.0.0:5173`, HTTP reachability probe, and Playwright/live smoke for point movement, style update, representative construction, process-history action, and undo/redo flows.

**Dependencies**

Depends on Wave 023 because that wave established the `RuntimeSession` consumer ports and shared command-history boundary while deliberately retaining `commandStackForDeferredCommandProducers()` only for deferred leaf producers. It is ordered before the raw `worldForView()` rendering/view seam, ProjectSessionPersistenceAdapter/ProjectService DTO-cast cleanup, backend/frontend contract stance, validation gate hardening, placeholder/debug cleanup, docs/spec drift, and remaining rendering/domain-contract seams because those later waves should consume a stable command-production boundary instead of requiring raw command-stack injection.

**Validation requirements**

All Wave 024 validation stdout/stderr must be captured to stable files under the reviewed Cycle 024 implementation directory's `validation/` subdirectory. Undefined commands may be skipped only with exact package-script evidence in the implementation log; defined root or workspace commands are mandatory.

1. Capture pre-edit scoped git status/diff and static scans for `commandStackForDeferredCommandProducers`, raw `commandStack` provide/inject, `CommandStack` imports in scoped producers/controllers, direct `Command` construction, stack `push(...)` calls, concrete operation imports in Vue/tool/controller shells, and intentionally deferred `worldForView()`/rendering seams.
2. Run focused Vitest for RuntimeSession/AppShellRuntime command-producer wiring, CanvasPointMovementUseCase, CanvasStyleUseCase, ConstructionUseCases or selected command-production replacement, ProcessHistoryUseCases/Controller, and active tool-controller command-sink behavior.
3. Run architecture/static tests or focused boundary scans proving no dual raw-stack/port path remains for scoped producers and the deleted accessor stays absent.
4. Run `npm run lint` at the repository root and in every workspace where a lint script is defined, including `frontend` while it remains the active workspace.
5. Run full Vitest at the repository root and in every workspace where a test/Vitest script is defined, including `frontend` while it remains the active workspace.
6. Run `npm run build` at the repository root and in every workspace where a build script is defined, including `frontend` while it remains the active workspace.
7. Run Playwright/e2e at the repository root and in every workspace where an e2e script is defined because canvas construction, style, process-history, and undo/redo behavior are user-observable.
8. Refresh the live preview bound to `0.0.0.0:5173`, capture HTTP 200 reachability probes, and run focused Playwright/live browser smoke for representative point movement, style update, construction, process-history action, and undo/redo flows without real Drive credentials.

**Risks**

- A command-production port can become a renamed `CommandStack` facade if it exposes generic push/command methods. Keep ports behavior-sized and backed by the inventory.
- Moving preview/commit/cancel for point movement can alter rollback semantics; focused tests must prove preview rollback, cancel, and final undo/redo behavior.
- Construction use cases currently coordinate process action groups, feasibility checks, sequence factories, 3D/dynamic-plane flows, and intersection selection. The wave must not flatten these into an untyped generic executor or skip e2e coverage.
- Process-history command execution reads state before and after operations; port migration can change disabled/root-pop behavior if not tested.
- Some `World` access in tools/canvas is still legitimate interaction/read/rendering access. Do not overreach into rendering/read-port redesign; classify and defer it explicitly.
- The workspace may contain unrelated dirty command-operation files from adjacent work. Implementation must use path-scoped status/diff, avoid reverting unrelated changes, and not depend on unowned dirty state.

**No-backcompat rationale**

`commandStackForDeferredCommandProducers()` and raw command-stack injection are internal architecture debt, not compatibility surfaces. Preserving both raw stack access and new command-production ports would keep runtime ownership ambiguous and encourage future UI/tool code to bypass application use cases. Delete the raw accessor and update active producers/tests directly once the reviewed command-production boundary is selected; do not keep shims, overloads, or dual execution paths.

---

## Wave 025 — Runtime view/read ports for rendering and panels

**Status**

Added by `cycle-025-wave-plan-extension` after Wave 024 completed. Requires bounded review of this plan extension before the canonical `cycle-025-fresh-scout-proposals` stage and before any implementation. This entry is grounded in current post-Wave-024 source evidence and the Wave 024 implementation/closure log, which explicitly marks Wave 024 complete while leaving `worldForView()` / `WorldInjectionKey` as the residual rendering and view-read seam.

**Scope**

- `frontend/src/application/appShell/RuntimeSession.ts`
- `frontend/src/application/appShell/AppShellRuntime.ts`
- `frontend/src/application/appShell/RuntimeInjectionKeys.ts`
- `frontend/src/App.vue` only for provide/inject wiring of selected read ports
- `frontend/src/components/workspace/SvgCanvas.vue`
- `frontend/src/components/panels/ActionsPanel.vue`
- `frontend/src/components/panels/ElementsPanel.vue`
- `frontend/src/components/panels/ThreeView.vue`
- `frontend/src/components/toolbars/PlaneSelector.vue`
- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts`
- `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts`
- `frontend/src/application/canvasPresentation/Projected3DCanvasSelector.ts`
- `frontend/src/application/canvasPresentation/CanvasVisibilityPolicy.ts`
- `frontend/src/application/threePresentation/ThreeWorldReadPort.ts`
- active view/read selector tests, app-shell wiring tests, canvas/three/panel focused tests, and boundary scans proving the selected raw-world view seam is gone

**Scope guard**

This wave owns the residual runtime rendering/view read seam left by Wave 024: `RuntimeSession.worldForView()`, the typed but broad `WorldInjectionKey`, and the view consumers that receive the full mutable `World` for rendering, panel listing, process-tree display, active-plane selection, element lookup, version polling, and 2D/3D presentation adapters. It must not absorb command producers, command descriptors, persistence schema/replay, `ProjectService` contract cleanup, domain realization redesign, backend/frontend contract stance, Drive/auth/browser adapters, package/tooling, validation-platform hardening, docs/spec reconciliation, or debug/placeholder cleanup.

The proposals must start with a current inventory of every `worldForView()` and `WorldInjectionKey` consumer and classify each read need by behavior: canvas presentation snapshot, canvas input/hit/query transforms, element label lookup, process-tree panel read/subscription, elements-panel list/toggle behavior, 3D presentation snapshot, active-plane selector read/write, and world version/change notification. The selected design should introduce behavior-sized read ports/selectors supplied by `RuntimeSession` or small adapters, not a broad `WorldViewFacade` that mirrors `World`. If source inventory proves a needed fix requires changing domain realization contracts, process-tree ownership, command-production semantics, persistence DTOs/casts, or backend/schema boundaries, stop and run a reviewed plan-edit mini-cycle rather than hiding that redesign inside Wave 025.

**Current grounding**

Wave 024 deleted the raw command-producer stack seam and moved canvas/tool and process-history command production behind typed ports. Its implementation log records that `RuntimeSession.commandStackForDeferredCommandProducers()`, raw `provide('commandStack')`, raw `inject('commandStack')`, provider casts to `CommandStack`, and `runtime.commandStack` are gone, while `worldForView()` and typed `WorldInjectionKey` remain intentionally deferred as the rendering/view read seam (`architecture-audit/cycle-024-command-producer-runtime-ports/implementation-log.md`, “Deleted legacy surfaces / proofs”; “Residual risks after Wave 024”; “Wave-plan reread / next-wave recommendation”).

Current source confirms the residual seam is small enough to plan but central enough to address next. `RuntimeSession` still exposes `worldForView(): World` (`frontend/src/application/appShell/RuntimeSession.ts:24`) and `AppShellRuntime` unwraps it into the runtime object (`frontend/src/application/appShell/AppShellRuntime.ts:16`). `RuntimeInjectionKeys.ts` types `WorldInjectionKey` directly as `InjectionKey<World>` (`frontend/src/application/appShell/RuntimeInjectionKeys.ts:7`), and `App.vue` provides `runtime.world` under that key (`frontend/src/App.vue:148`). Static scan evidence for this plan extension found active consumers in `SvgCanvas.vue`, `ActionsPanel.vue`, `ElementsPanel.vue`, `ThreeView.vue`, and `PlaneSelector.vue` (`architecture-audit/cycle-025-wave-plan-extension/world-read-seam-scan.stdout.log`).

The consumer needs are behavior-specific rather than requiring the whole domain root. `SvgCanvas.vue` reads active-plane id, world version, all projection planes, 2D realizations, element labels, and passes `worldForCanvas` into `createCanvasWorldReadPort(...)` plus `screenTo3D(...)` (`frontend/src/components/workspace/SvgCanvas.vue:227-232`, `:364-407`, `:479-494`, `:530-553`, `:1104-1112`). `ActionsPanel.vue` reads/subscribes to the process tree from the world and renders it into `ProcessTreeNode` while command mutations already use the separate process-history command port (`frontend/src/components/panels/ActionsPanel.vue:65-70`, `:87-89`, `:148-160`, `:175-177`). `ElementsPanel.vue` polls `world.getVersion()`, enumerates projection planes and 3D elements, uses concrete element `instanceof` checks and `any` formatting, and mutates element visibility by calling `world.getElement2D(...)` / `getElement3DById(...)` / `getProjectionPlaneById(...)` then `world.markDirty()` (`frontend/src/components/panels/ElementsPanel.vue:146-167`, `:182-263`, `:270-312`, `:342-357`). `PlaneSelector.vue` injects `World`, polls `getVersion()`, lists projection planes, reads active plane id, and calls `world.setActivePlaneId(...)` (`frontend/src/components/toolbars/PlaneSelector.vue:53-57`, `:68-74`, `:95-112`, `:143-145`). `ThreeView.vue` injects `World`, creates a 3D read port adapter from it, and separately subscribes to world changes (`frontend/src/components/panels/ThreeView.vue:29-43`, `:58-60`).

Current presentation adapters are partial progress but still leak broad domain objects and realization contexts. `CanvasWorldReadPort` is named as a read port, but its interface returns `ProjectionPlane[]`, `Point3D[]`, `Line3D[]`, and `Segment3D[]`, builds a realization context from the full `World`, exposes process-tree access for visibility, and imports the concrete `World` adapter source (`frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:12`, `:15-21`, `:31-46`, `:49-69`). `CanvasPresentationSelector` then iterates raw planes and plane-owned elements directly (`frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts:22-36`, `:47-86`). `CanvasVisibilityPolicy` narrows to `Pick<World, 'getProcessTree'>` but casts back to `World` to call domain `resolveVisibility` (`frontend/src/application/canvasPresentation/CanvasVisibilityPolicy.ts:1-8`). `ThreeWorldReadPort` returns better read-model DTOs for the scene, but the adapter still imports `World`, creates broad realization contexts, reads all raw projection planes/3D elements/hinges, and performs type checks against domain classes (`frontend/src/application/threePresentation/ThreeWorldReadPort.ts:10-12`, `:56-64`, `:66-81`, `:84-135`). These are the right seams to narrow into behavior-sized selectors without reopening rendering scene-host or domain realization architecture.

Lower-priority candidates remain real but should be deferred. `ProjectSessionPersistenceAdapter` still casts `unknown`/`ProjectData` around `ProjectService` (`frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:10-20` in `architecture-audit/cycle-025-wave-plan-extension/residual-candidate-scan.stdout.log`), `ToolbarHistoryController` still appears as a separate toolbar/history typing cleanup candidate, and `CanvasStyleUseCase` has an unrelated `as any` operation cast. Those are not more central than the runtime read seam after Wave 024 because command production and command history are already behind ports; the remaining broad `World` injection is the path through which rendering and panels can still observe/mutate the domain root directly.

**Target outcome**

`RuntimeSession` remains the single owner of the concrete `World`, but view/rendering descendants no longer receive a full mutable `World` through `worldForView()` / `WorldInjectionKey`. Instead, the app shell provides explicit behavior-sized read/write ports or selector DTO providers for:

- canvas presentation snapshots and projected-3D-on-2D data;
- canvas input transforms / hit-query / screen-to-3D coordinate support;
- element label lookup needed for hover/tooltips;
- process-tree panel read/subscription state;
- elements-panel read models and visibility toggling as a named application/view behavior;
- three-view presentation snapshots plus change notifications;
- active-plane selector options/read/write behavior.

Existing canvas and 3D presentation selector DTOs should be narrowed where practical so selectors consume DTO/read-model data rather than raw `ProjectionPlane`/domain entity arrays. Any remaining domain-class dependency must be localized to a runtime/session adapter or explicitly deferred with evidence if it belongs to a deeper domain-realization wave. Vue components should render/read through these named ports/selectors and emit intents; they should not import or receive the concrete `World` solely to enumerate, poll, or mutate view state.

**Explicit DELETE list**

- Delete `RuntimeSession.worldForView()` if the reviewed read ports replace all broad view/rendering exposure.
- Delete `WorldInjectionKey` or change it away from `InjectionKey<World>` so production Vue descendants no longer inject the concrete domain root for view reads.
- Delete `AppShellRuntime` / `App.vue` raw `world` return/provide paths once selected read ports are provided.
- Delete direct `WorldInjectionKey` injection from `SvgCanvas.vue`, `ActionsPanel.vue`, `ElementsPanel.vue`, `ThreeView.vue`, and `PlaneSelector.vue` where replaced by behavior ports/selectors.
- Delete component-side world version polling (`world.getVersion()` intervals) where replaced by explicit change subscriptions or reactive read-port invalidation.
- Delete `ElementsPanel.vue` `any` element formatting and direct domain `instanceof` grouping where replaced by element-list DTOs.
- Delete direct visibility mutation in `ElementsPanel.vue` (`world.getElement2D(...)` / `getElement3DById(...)` / `getProjectionPlaneById(...)` plus `world.markDirty()`) if a named visibility intent/port owns that behavior.
- Delete `CanvasWorldReadPort` methods that return raw `ProjectionPlane[]`, `Point3D[]`, `Line3D[]`, or `Segment3D[]` if selector DTO methods replace them inside this wave.
- Delete `CanvasVisibilityPolicy` casts from a narrowed world pick back to `World` if visibility can be expressed through a proper process/visibility read port.
- Delete `ThreeWorldReadPort` raw-domain adapter methods that mirror broad `World` traversal if narrower scene read models can be produced at the runtime adapter boundary.
- Delete transitional broad facades, compatibility wrappers, duplicate raw-world and port paths, dead exports, or tests that assert concrete world injection into view consumers.
- Do not delete or rewrite command producers, command serialization/descriptors, `CommandStack`, persistence schema/replay, `ProjectService`, Drive/auth, backend, package/tooling, docs/specs, validation-platform code, or broad domain realization internals without a reviewed plan edit.

**Success criteria**

- No production Vue component injects `WorldInjectionKey` as `World`; either the key is deleted or replaced by behavior-sized injection keys/read ports that do not expose the concrete domain root.
- `RuntimeSession.worldForView()` is deleted, or any residual raw-world exposure is explicitly justified in the implementation log as a blocked deeper domain-realization issue with a reviewed follow-up wave; no hidden broad facade may replace it.
- `SvgCanvas.vue` consumes named canvas presentation/input/element-label/read ports and the existing command-producer port, not the whole `World`, while point drag, hover, hit testing, style dialog, fit-to-view, screen-to-3D coordinate display, and representative construction remain equivalent.
- `ActionsPanel.vue` consumes a process-tree read/subscription port and existing process-history command port rather than reading the process tree from the full `World`.
- `ElementsPanel.vue` consumes element-list DTOs and a named visibility intent/read port; direct `any` formatting, concrete `instanceof` grouping, direct world visibility mutation, and polling are deleted where the selected design covers them.
- `PlaneSelector.vue` consumes an active-plane selector/read-write port instead of concrete `World` while preserving keyboard/dropdown behavior.
- `ThreeView.vue` consumes a three-presentation read/change port rather than constructing `createThreeWorldReadPort(world)` from an injected domain root.
- Canvas and Three presentation read ports/selectors are narrower by behavior and do not return broad raw domain collections to rendering selectors unless a residual is documented as accepted risk for a later domain-realization wave.
- No command-production, persistence schema/replay, backend/frontend contract, Drive/auth, package/tooling, docs/spec, validation-platform, or broad domain-realization changes occur without reviewed plan edit.
- Focused tests cover runtime read-port wiring, canvas presentation/input behavior, process-tree panel read/subscription behavior, elements-panel list/visibility behavior, plane selector read/write behavior, three-view presentation refresh, and boundary scans proving the broad view-world seam is gone.
- Mandatory validation cadence passes with stable logs: root/frontend lint where defined, focused Vitest for touched runtime/view/read-port modules, full root/frontend Vitest, root/frontend build, root/frontend Playwright e2e because rendering/panels/plane selection are user-observable, live preview refresh on `0.0.0.0:5173`, HTTP reachability probe, and Playwright/live smoke for representative canvas rendering/hit/hover, elements panel visibility toggle, actions panel rendering, plane selector switching, 3D view refresh, and undo/redo still flowing through the existing command-history port.

**Dependencies**

Depends on Wave 024 because that wave deleted raw command-stack producer access and left `worldForView()` / `WorldInjectionKey` as the isolated runtime read seam. It is ordered before ProjectSessionPersistenceAdapter/ProjectService DTO-cast cleanup, backend/frontend contract stance, validation gate hardening, placeholder/debug cleanup, docs/spec drift, and toolbar-history typing cleanup because those are either leaf/adapter concerns or enforcement/documentation concerns. It follows earlier canvas/three presentation waves but supersedes their remaining raw-domain read-port residue by focusing on the runtime boundary that still hands a full `World` to view consumers.

**Validation requirements**

All Wave 025 validation stdout/stderr must be captured to stable files under the reviewed Cycle 025 implementation directory's `validation/` subdirectory. Undefined commands may be skipped only with exact package-script evidence in the implementation log; defined root or workspace commands are mandatory.

1. Capture pre-edit scoped git status/diff and static scans for `worldForView`, `WorldInjectionKey`, `inject(WorldInjectionKey)`, `provide(WorldInjectionKey)`, component `world.getVersion()` polling, `createCanvasWorldReadPort(world)`, `createThreeWorldReadPort(world)`, raw domain collection returns from canvas/three read ports, and intentionally deferred non-view candidates.
2. Run focused Vitest for new runtime read-port providers/selectors and changed canvas, process-tree panel, elements panel, plane selector, and three-view behavior.
3. Run architecture/static tests or focused boundary scans proving no production Vue component receives a concrete `World` through app-shell injection and no dual raw-world/port path remains for scoped view consumers.
4. Run `npm run lint` at the repository root and in every workspace where a lint script is defined, including `frontend` while it remains the active workspace.
5. Run full Vitest at the repository root and in every workspace where a test/Vitest script is defined, including `frontend` while it remains the active workspace.
6. Run `npm run build` at the repository root and in every workspace where a build script is defined, including `frontend` while it remains the active workspace.
7. Run Playwright/e2e at the repository root and in every workspace where an e2e script is defined because canvas rendering, panel reads, active-plane selection, and 3D view refresh are user-observable.
8. Refresh the live preview bound to `0.0.0.0:5173`, capture HTTP 200 reachability probes, and run focused Playwright/live browser smoke for canvas render/hit/hover, elements panel visibility toggle, actions panel rendering, plane selector switching, 3D view refresh, and undo/redo regression checks without real Drive credentials.

**Risks**

- A view/read port can become a renamed `World` facade if it mirrors domain methods. Keep ports behavior-sized and backed by the required consumer inventory.
- Canvas rendering, hit testing, screen-to-3D coordinate display, and point-drag preview share transforms; splitting ports can introduce subtle coordinate regressions if focused and e2e tests are too shallow.
- ElementsPanel currently mutates visibility directly and marks the world dirty. Moving that behind a port may reveal whether visibility should be command-backed; do not redesign command/persistence semantics in this wave without a plan edit.
- Process-tree rendering currently passes `:world` into `ProcessTreeNode`; the fresh scout must include that child component before proposing deletion of all panel world access.
- Canvas/Three read adapters still depend on domain realization contexts. If deleting raw-domain returns requires a deeper realization-context redesign, document it and stop for a plan edit rather than smuggling domain redesign into this wave.
- Existing unrelated dirty audit/source state is broad. Implementation must use path-scoped status/diff, avoid reverting unrelated work, and not depend on unowned dirty files.

**No-backcompat rationale**

`worldForView()` and `WorldInjectionKey: InjectionKey<World>` are internal runtime wiring seams, not compatibility contracts. Preserving both concrete world injection and new view/read ports would keep rendering and panels free to bypass application selectors and mutate the domain root directly. Delete the broad seam and update active consumers/tests directly once reviewed read ports are selected; do not keep shims, overloads, broad facades, or dual paths.

---

## Wave 026 — Tool interaction read context and realization adapter seam

**Status**

Added by `cycle-026-wave-plan-extension` after Wave 025 completed. Requires bounded review of this plan extension before the canonical `cycle-026-fresh-scout-proposals` stage and before any implementation. This entry is grounded in current post-Wave-025 source evidence and the Wave 025 implementation/validation closure, which explicitly marks Wave 025 complete while naming `CanvasViewPort.invokeToolClick` / `ITool.ToolContext.world` and domain-heavy canvas/three realization adapters as the next inward seams.

**Scope**

- `frontend/src/application/appShell/RuntimeSession.ts`
- `frontend/src/application/appShell/RuntimeViewPorts.ts`
- `frontend/src/tools/ITool.ts`
- `frontend/src/tools/ArgumentCollectorTool.ts`
- concrete tools under `frontend/src/tools/` only where they read `context.world`, `realize2D(context.world)`, or tool collection context world data
- `frontend/src/types/ToolArgumentCollector.ts` only where collection/validation context needs a narrowed read context
- `frontend/src/application/tools/CanvasToolController.ts` and `frontend/src/application/tools/ToolCommandIntents.ts` only where tool invocation typing needs to stay aligned with the command sink
- `frontend/src/application/canvasPresentation/CanvasInteractionQuery.ts`
- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts`
- `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts`
- `frontend/src/application/canvasPresentation/CanvasVisibilityPolicy.ts`
- `frontend/src/application/threePresentation/ThreeWorldReadPort.ts`
- `frontend/src/components/workspace/SvgCanvas.vue` only for tool invocation wiring and typed `CanvasToolInvocationContext` changes
- focused tool interaction, argument collection, construction intent, realization/read-context, canvas/three presentation, runtime wiring, and architecture-boundary tests

**Scope guard**

This wave owns the residual tool interaction/read context seam left by Wave 025: `CanvasViewPort.invokeToolClick` adds the private concrete `World` back into `ITool.ToolContext`, and tool implementations use that full root for element lookup, plane lookup, selection validation, and realization reads. It may also narrow the immediately adjacent canvas/three realization adapter contexts where they are part of the same read-context shape. It must not absorb persistence schema/replay, command descriptor/replay redesign, command-history/producer redesign, backend/frontend contract stance, Drive/auth/browser adapters, package/tooling churn, validation-platform hardening, docs/spec reconciliation, broad domain realization redesign, generic application-kernel work, or visibility-as-command redesign.

The proposals must start with a current inventory of every active `ToolContext.world`, `context.world`, `realize2D(context.world)`, collection-context world, `CanvasViewPort.invokeToolClick`, `createCanvasWorldReadPort(this.world)`, and `createThreeWorldReadPort(this.world)` use. Classify each use by behavior: active-plane/plane lookup, hit-result element lookup, argument collection validation, tool-specific geometric realization, tangent/parallel/perpendicular choice computation, screen-to-3D coordinate support, presentation snapshot, three-scene read model, visibility/read policy, properties/process-tree infeasibility display, and command mutation. The selected design should introduce one or more behavior-sized read/realization contexts, not a renamed `World` facade. If the inventory proves that deleting `ToolContext.world` requires redesigning domain `Element2D.realize2D(world)` / realization ownership broadly, stop and run a reviewed plan-edit mini-cycle rather than hiding a domain-realization wave inside Wave 026.

**Current grounding**

Wave 025 completed the runtime view/read-port cleanup: `RuntimeSession` privately owns `World`, raw `worldForView()`, `WorldInjectionKey`, component-local world injection, raw-world properties dialog props, and raw process-tree node traversal are absent, with green validation and preview evidence (`architecture-audit/cycle-025-runtime-view-read-ports/implementation-log.md`, “Wave 025 status: COMPLETE”; `architecture-audit/cycle-025-runtime-view-read-ports/reviews/validation-closure-review.md`). The same closure accepted residual future-wave risks: `CanvasViewPort.invokeToolClick` still supplies raw `World` internally to `ITool.ToolContext`, and canvas/three presentation adapters still contain domain-heavy realization/read logic (`architecture-audit/cycle-025-runtime-view-read-ports/implementation-log.md`, “Residual risks / next-wave candidates”; “Residual risks and next-wave recommendation”).

Current source confirms the residual seam is active and central but bounded. `RuntimeSession.canvasViewPort()` constructs the canvas read adapter from the private world, exposes input transforms from all projection planes, and calls `tool.handleClick({ ...context, world: this.world })` through `invokeToolClick` (`frontend/src/application/appShell/RuntimeSession.ts:41-77`). `RuntimeViewPorts.ts` names `CanvasToolInvocationContext` without `world`, but keeps `invokeToolClick(tool, context)` as the bridge into `ITool` (`frontend/src/application/appShell/RuntimeViewPorts.ts:25-34`, `frontend/src/application/appShell/RuntimeViewPorts.ts:52-60`). `ITool.ts` imports concrete `World`, includes `world: World` and `paperToPlaneTransform: any` in `ToolContext`, and keeps `getState(): Record<string, any>` (`frontend/src/tools/ITool.ts:9-29`, `frontend/src/tools/ITool.ts:42-49`).

Tool implementations use the raw context for interaction reads rather than command-stack mutation. `ArgumentCollectorTool.handleClick` destructures `world`, looks up the active projection plane, converts hit results to `world.getElement2D(...)`, and passes `{ world, plane, collected }` into collection validation (`frontend/src/tools/ArgumentCollectorTool.ts:162-216`). Static scan evidence shows concrete tools using `realize2D(context.world)` for circle radius checks, auxiliary-plane setup, parallel/perpendicular reference-line validation, tangent-index choice, and tangent-through-point validation (`architecture-audit/cycle-026-wave-plan-extension/residual-seam-scan.stdout.log`). This supports a tool interaction/read-context wave rather than reopening command-producer work, because command execution already flows through `context.commandSink`.

Adjacent presentation adapters show the same context shape leaking through runtime-local adapters. `CanvasWorldReadPort` returns raw `ProjectionPlane[]`, `Point3D[]`, `Line3D[]`, `Segment3D[]`, exposes `getProcessTree()`, and builds realization contexts by mirroring many `World` methods (`frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:15-29`, `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:31-70`). `ThreeWorldReadPort` is read-model oriented but still imports concrete `World`, builds a broad realization context, traverses all projection planes and 3D elements, uses domain `instanceof` checks, and calls domain `realize2D`/realize getters inside the adapter (`frontend/src/application/threePresentation/ThreeWorldReadPort.ts:56-64`, `frontend/src/application/threePresentation/ThreeWorldReadPort.ts:66-135`). `RuntimeSession` also still uses `as any` and raw realization calls in view-model helpers for properties and process infeasibility (`frontend/src/application/appShell/RuntimeSession.ts:301-340`, `frontend/src/application/appShell/RuntimeSession.ts:399-417`). These are evidence for including related adapter/read-context seams in the proposals, while keeping any deeper domain realization contract redesign out of implementation unless separately reviewed.

Lower-priority candidates remain real but are deferred by centrality. Elements visibility is now a named view intent and may later become command-backed, but that would touch command/persistence semantics beyond this tool-read context. Toolbar-history unknown-provider typing, ProjectSessionPersistenceAdapter/ProjectService DTO casts, validation-gate hardening, docs/spec drift, backend/frontend contract stance, Drive/auth, and package/tooling are leaf/enforcement/integration concerns relative to the current raw `World` tool seam. Broad domain realization redesign is more central in concept but too large for a single implementation wave unless the Wave 026 scout proves the narrow tool/read-context deletion is impossible without it.

**Target outcome**

Tools receive an explicit interaction/read context instead of the concrete domain root. Tool click handling, argument collection, set validation, hit-result element lookup, plane lookup, and tool-specific realization reads are expressed through behavior-sized ports such as a tool element lookup/read port, argument collection context, and/or realization read context. `CanvasViewPort.invokeToolClick` no longer rehydrates a raw `World` into `ITool.ToolContext`; the runtime/session boundary remains the only owner of the concrete world and provides named read capabilities to tools and presentation adapters.

Canvas and three presentation adapters are narrowed where they share the same realization/read context: adapter methods should return presentation/read DTOs or invoke named realization services rather than broad raw domain collections where practical within the bounded scope. Any remaining domain-class or realization-context dependency must be localized to runtime/session adapter internals and documented as a follow-up domain-realization wave candidate, not exposed to tools or Vue components.

**Explicit DELETE list**

- Delete `world: World` from `ITool.ToolContext` once reviewed tool interaction/read ports cover active tool behavior.
- Delete the `World` import from `frontend/src/tools/ITool.ts` if no longer needed after the context split.
- Delete `CanvasViewPort.invokeToolClick` implementation that calls `tool.handleClick({ ...context, world: this.world })`; replace with invocation that passes named read/realization contexts or delete the wrapper if tool calls can be typed directly.
- Delete concrete tool reads of `context.world`, `world.getProjectionPlaneById(...)`, `world.getElement2D(...)`, and `realize2D(context.world)` where replaced by the selected tool read/realization context.
- Delete `CollectionContext.world` and collection validators that require the full root if a narrower plane/element/realization context covers them.
- Delete `paperToPlaneTransform: any`, `CanvasToolInvocationContext.toolStore: any`, `getState(): Record<string, any>`, and adjacent broad `any` tool-state seams where directly touched by the tool context split; do not expand into unrelated type cleanup.
- Delete `CanvasWorldReadPort` raw domain collection returns and `getProcessTree()` exposure where selector/read-model methods replace them in this wave.
- Delete `CanvasVisibilityPolicy` casts back to concrete `World` where a named process/visibility read context covers the behavior.
- Delete `ThreeWorldReadPort` broad world-mirroring realization context methods where narrower scene read-model/realization context methods replace them in this wave.
- Delete transitional raw-and-port dual paths, compatibility wrappers, broad `WorldView`/`ToolWorld` facades, dead exports, and tests that assert full `World` injection into tool contexts.
- Do not delete or rewrite command producer services, command descriptors/serialization/replay, `CommandStack`, persistence schema/replay, `ProjectService`, backend, Drive/auth, package/tooling, docs/specs, validation-platform code, or broad domain realization internals without reviewed plan edit.

**Success criteria**

- `ITool.ToolContext` no longer imports or exposes concrete `World`.
- No production tool implementation reads `context.world` or calls `realize2D(context.world)` / `realize3D(context.world)`; equivalent behavior uses the selected tool interaction/read/realization context.
- `RuntimeSession.canvasViewPort().invokeToolClick` no longer injects raw `World` into tool calls; if an invocation wrapper remains, its contract is behavior-sized and typed without `World` or broad `any`.
- Argument collection still supports hit testing, null-position arguments, any-order viable-set pruning, set validators, dynamic selection masks, and typed construction intent emission through the existing command sink.
- Concrete tool behaviors remain user-visible equivalent for point, line, segment, circle, guide, intersection, projection-plane, 3D point/line/segment/plane, parallel/perpendicular, and tangent construction flows.
- Canvas/three realization/read adapters are narrowed at least along the seams directly used by tools and active presentation selectors; any residual broad adapter or domain realization dependency is documented with evidence as a future wave candidate rather than hidden behind a renamed facade.
- No command-production, command-history, persistence schema/replay, backend/frontend contract, Drive/auth, package/tooling, docs/spec, validation-platform, visibility-command redesign, or broad domain-realization changes occur without reviewed plan edit.
- Focused tests cover tool-context port behavior, argument collection validation, representative concrete tool realization choices, runtime invocation wiring, canvas presentation/read-context behavior, and three presentation read-model behavior where touched.
- Architecture/static scans prove `ToolContext.world`, `context.world`, `realize2D(context.world)`, and broad raw-world injection through `invokeToolClick` are absent from production code, with any allowed runtime-local adapter residuals explicitly listed.
- Mandatory validation cadence passes with stable logs: root/frontend lint where defined, focused Vitest for touched tool/runtime/presentation modules, full root/frontend Vitest, root/frontend build, root/frontend Playwright e2e because construction/canvas/3D behavior is user-observable, live preview refresh on `0.0.0.0:5173`, HTTP reachability probe, and Playwright/live smoke for representative construction, tangent/parallel/perpendicular, projection-plane/3D construction, canvas hit/hover, 3D refresh, and undo/redo regression checks without real Drive credentials.

**Dependencies**

Depends on Wave 025 because Wave 025 made `RuntimeSession` the private owner of `World` and deleted raw Vue view-world injection, leaving `invokeToolClick` / `ITool.ToolContext.world` as the isolated internal tool interaction/read seam. It is ordered before elements-visibility command ownership, ProjectSessionPersistenceAdapter/ProjectService DTO-cast cleanup, backend/frontend contract stance, toolbar-history typing cleanup, validation-gate hardening, placeholder/debug cleanup, docs/spec drift, Drive/auth, package/tooling, and broad domain-realization redesign because those later waves should consume a stable tool/read context rather than perpetuating a raw world handoff into tools.

**Validation requirements**

All Wave 026 validation stdout/stderr must be captured to stable files under the reviewed Cycle 026 implementation directory's `validation/` subdirectory. Undefined commands may be skipped only with exact package-script evidence in the implementation log; defined root or workspace commands are mandatory.

1. Capture pre-edit scoped git status/diff and static scans for `ToolContext.world`, `context.world`, `invokeToolClick`, `realize2D(context.world)`, `CollectionContext.world`, tool `any` state/context seams, `createCanvasWorldReadPort(this.world)`, `createThreeWorldReadPort(this.world)`, raw domain collection returns, and intentionally deferred non-tool candidates.
2. Run focused Vitest for `ITool`/tool context typing, `ArgumentCollectorTool`, representative concrete tools that previously used realization reads, `CanvasToolController` invocation wiring, runtime canvas view port invocation, `CanvasWorldReadPort`/presentation selectors where changed, and `ThreeWorldReadPort` where changed.
3. Run architecture/static tests or focused boundary scans proving active tools no longer receive the concrete `World` and no dual raw-world/tool-read-context path remains.
4. Run `npm run lint` at the repository root and in every workspace where a lint script is defined, including `frontend` while it remains the active workspace.
5. Run full Vitest at the repository root and in every workspace where a test/Vitest script is defined, including `frontend` while it remains the active workspace.
6. Run `npm run build` at the repository root and in every workspace where a build script is defined, including `frontend` while it remains the active workspace.
7. Run Playwright/e2e at the repository root and in every workspace where an e2e script is defined because construction, canvas hit/hover, projection-plane, 3D construction, and undo/redo behavior are user-observable.
8. Refresh the live preview bound to `0.0.0.0:5173`, capture HTTP 200 reachability probes, and run focused Playwright/live browser smoke for representative 2D construction, tangent/parallel/perpendicular flows, projection-plane or 3D construction, canvas hit/hover, 3D refresh, and undo/redo without real Drive credentials.

**Risks**

- A tool read context can become a renamed `World` facade if it mirrors too many root methods. Keep it behavior-sized and prove every method by the required source inventory.
- Argument collection interleaves hit testing, plane lookup, selection masks, validators, and construction intent emission. Splitting context too aggressively can break any-order collection or null-position arguments if focused tests are shallow.
- Tangent/parallel/perpendicular and dynamic projection-plane tools use realization reads to choose geometric variants. The selected context must preserve those computations without smuggling a full world root back into tools.
- Canvas and three presentation adapters still depend on domain realization internals. If narrowing them requires changing `Element2D.realize2D(world)` or projection realization ownership broadly, stop for a reviewed plan edit rather than expanding Wave 026.
- Elements visibility, process infeasibility, and properties coordinate display still use runtime-local world traversal. Include only the parts directly needed by the tool/read-context seam; defer command-backed visibility and broad properties/process-tree realization cleanup unless proven necessary.
- Existing unrelated dirty source state is present in the worktree. Implementation must use path-scoped status/diff, avoid reverting unrelated work, and not depend on unowned dirty files.

**No-backcompat rationale**

`ITool.ToolContext.world` and `CanvasViewPort.invokeToolClick` raw-world injection are internal architecture seams, not compatibility contracts. Preserving both full `World` access and new tool read/realization ports would keep every tool free to bypass application/runtime boundaries and would undo the private-world ownership established by Wave 025. Delete the raw context field and update active tools/tests directly once reviewed read contexts exist; do not keep shims, overloads, broad facades, or dual raw-and-port paths.

---

## Wave 027 — Runtime read-model extractors and presentation DTO ports

**Status**

Added by `cycle-027-wave-plan-extension` after Wave 026 completed and after the urgent Cycle 026 3D-view interaction hotfix. Requires bounded review of this plan extension before the canonical `cycle-027-fresh-scout-proposals` stage and before any implementation. This entry is grounded in current post-Wave-026 source evidence, the Wave 026 validation/preview closure, the 3D hotfix implementation log, and the Cycle 027 planning evidence note.

**Scope**

- `frontend/src/application/appShell/RuntimeSession.ts`
- `frontend/src/application/appShell/RuntimeViewPorts.ts`
- focused new or existing runtime read-model modules extracted from `RuntimeSession`, such as properties-dialog, process-tree, elements-panel, active-plane, selection-read, and/or presentation adapter factories if selected by review
- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts`
- `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts`
- `frontend/src/application/canvasPresentation/Projected3DCanvasSelector.ts`
- `frontend/src/application/canvasPresentation/CanvasVisibilityPolicy.ts` only where directly tied to removing raw process/domain reads from presentation selectors
- `frontend/src/application/threePresentation/ThreeWorldReadPort.ts`
- `frontend/src/components/dialogs/PropertiesDialog.vue` only if its view-model contract must be tightened without changing UI behavior
- `frontend/src/components/panels/ActionsPanel.vue`
- `frontend/src/components/panels/ProcessTreeNode.vue`
- `frontend/src/components/panels/ElementsPanel.vue` only where current elements-panel read/visibility port contracts require alignment
- `frontend/src/components/workspace/SvgCanvas.vue` only where properties/canvas presentation port typing changes need consumption updates
- `frontend/src/components/panels/ThreeView.vue` only where three-presentation port DTO typing changes need consumption updates
- focused runtime read-model, properties/process/elements, canvas/three presentation DTO, overlay interaction-boundary, and architecture-boundary tests

**Scope guard**

This wave owns the residual read-model and presentation DTO seams left after Wave 026: `RuntimeSession` remains the concrete `World` owner, but it now directly constructs too many view/read models and still uses raw realization/classification reads for properties, process-tree infeasibility, elements-panel listing/visibility, canvas transforms, selection, and presentation-adapter construction. It also owns the related `CanvasWorldReadPort` / `ThreeWorldReadPort` presentation read-model seams where those ports still expose raw domain collections or world-shaped realization contexts.

This wave must not absorb persistence schema/replay, `ProjectService` serialization/deserialization redesign, command history/producer redesign, backend/frontend contract stance, Drive/auth/browser adapters, package/tooling churn, validation-platform hardening, docs/spec reconciliation, toolbar-history typing cleanup, preview-script ergonomics, broad domain realization ownership redesign, generic application-kernel work, or UI feature work. Elements visibility may be named behind an explicit read/intent boundary, but command-backed visibility and persistence semantics are out of scope unless the scout proves the current direct mutation cannot be isolated honestly; in that case stop for a reviewed plan edit.

The proposals must start with a current inventory of every `RuntimeSession` helper that reads domain data for view models, every `as any`/`any` read-model seam in `RuntimeSession`, every runtime-local `realize2D(this.world)` / `Element2D.realize2D(this.world)` call, every direct process-tree/dependency read used for panel DTOs, every elements visibility mutation path, and every raw collection/`getProcessTree()`/world-shaped realization-context method exposed by `CanvasWorldReadPort` and `ThreeWorldReadPort`. Classify each use by behavior: properties dialog view model, process description/infeasibility, elements-panel grouping/properties/visibility, canvas input transforms/screen-to-3D, selection read/cascade preview, active-plane selector, canvas presentation snapshot/projected-3D-on-2D, three-scene read model, overlay pointer ownership, persistence handles, and command mutation. Only the read-model/presentation behaviors are implementation candidates for this wave.

If the inventory proves that deleting a read-model seam requires changing `Element2D.realize2D(...)`, projection-plane realization ownership, command/persistence semantics, or `ProjectService` contracts broadly, the implementation must stop for a reviewed plan-edit mini-cycle rather than hiding a deeper redesign inside Wave 027.

**Current grounding**

Wave 026 completed the tool interaction read-context cleanup. Its implementation log records that `RuntimeSession` now passes a bounded `ToolInteractionReadPort` into tools, `ITool.ToolContext.world` and `CollectionContext.world` were deleted, active production tool `context.world` and `realize2D(context.world)` usages are absent, and mandatory validation/live preview evidence is green (`architecture-audit/cycle-026-tool-interaction-read-context/implementation-log.md`, “Overall status”; “Delete/proof list”; “Validation closure assessment”). The same log accepts residual seams in `RuntimeSession` properties/process reads, `CanvasWorldReadPort` / `ThreeWorldReadPort` presentation read models, and runtime-private persistence handles (`architecture-audit/cycle-026-tool-interaction-read-context/implementation-log.md`, “Protected-surface checks”; “Residual risks and accepted debt”; “Next-wave candidates”).

Current source confirms the next central seam is no longer tool context but runtime read-model concentration. `RuntimeSession` privately owns `World` and `CommandStack` (`frontend/src/application/appShell/RuntimeSession.ts:37`, `:38`, `:39`) and then directly constructs canvas, process-tree, elements-panel, three-presentation, active-plane, selection, command-history, selection-deletion, and persistence ports (`frontend/src/application/appShell/RuntimeSession.ts:42-80`, `:83-160`, `:163-183`, `:186-242`, `:263-281`). `canvasViewPort()` still creates `CanvasWorldReadPort` and `ToolInteractionReadPort` from the private world and computes input transforms by iterating all projection planes (`frontend/src/application/appShell/RuntimeSession.ts:42-56`). `processTreeReadPort()` reads `world.getProcessTree()` and dependency service data while constructing panel DTOs (`frontend/src/application/appShell/RuntimeSession.ts:83-107`). `elementsPanelPort()` groups domain objects with concrete `instanceof` checks and directly mutates `visualStyle` plus `world.markDirty()` for visibility (`frontend/src/application/appShell/RuntimeSession.ts:110-160`).

Properties and process helpers still cross the intended read boundary. `getPropertiesDialogViewModel()` casts the found element to `any`, describes type through raw world queries, realizes point/circle coordinates by calling `realize2D(this.world)`, derives dependencies by checking concrete subclasses, and `isActionInfeasible()` realizes `Element2D` against the whole world (`frontend/src/application/appShell/RuntimeSession.ts:301-342`, `:349-381`, `:399-417`). Formatting helpers also use broad `any` for element DTOs (`frontend/src/application/appShell/RuntimeSession.ts:419-442`). These are runtime read-model seams, not tool interaction seams, so they should be extracted into owned read-model builders/ports instead of remaining hidden inside the session owner.

The presentation ports remain related seams. `CanvasWorldReadPort` still returns raw `ProjectionPlane[]`, `Point3D[]`, `Line3D[]`, `Segment3D[]`, exposes `getProcessTree()`, and builds a realization context by mirroring many `World` methods (`frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:15-28`, `:31-43`, `:46-69`). `CanvasPresentationSelector` and `Projected3DCanvasSelector` consume `getAllProjectionPlanes()` from that port (`architecture-audit/cycle-027-wave-plan-extension/validation/residual-seam-scan.stdout.log`). `ThreeWorldReadPort` is DTO-oriented at its public interface, but its adapter imports `World`, creates a broad realization context, traverses projection planes and 3D elements, uses domain class predicates, and calls domain realizations inside adapter methods (`frontend/src/application/threePresentation/ThreeWorldReadPort.ts:6-12`, `:56-78`, `:81-135`). These should be narrowed where the read-model extraction makes a behavior-sized DTO port practical, without reopening a broad rendering scene-host or domain-realization redesign.

The urgent 3D interaction hotfix affects validation priorities but not central source ordering. The hotfix reproduced a visible overlay whose `.three-view-overlay`, `.three-view-panel`, and `.three-canvas` had computed `pointer-events: none`, so `elementFromPoint(...)` hit the underlying SVG line; it fixed `frontend/src/App.vue` so `.three-view-overlay` now has `pointer-events: auto` and added unit/e2e regression coverage (`architecture-audit/cycle-026-hotfix-3d-view-interaction-regression/implementation-log.md`, “Reproduction evidence”; “Root cause”; “Fix”; “Tests added/updated”). Current source confirms the overlay rule remains explicit (`frontend/src/App.vue:277-289`) and `ThreeView.vue` control overlay also uses `pointer-events: auto` (`frontend/src/components/panels/ThreeView.vue:92`). Wave 027 validation must protect this user-observable boundary if touching presentation ports or overlay-adjacent components, but a CSS-only interaction wave is lower centrality than the RuntimeSession read-model seam.

Lower-priority candidates remain real but are deferred. Runtime persistence handles still expose concrete `World`/`CommandStack` to the app-shell persistence adapter, but changing the persistence contract risks absorbing `ProjectService` schema/replay work. Toolbar-history unknown-provider typing, validation gate hardening, docs/spec drift, backend/frontend contract stance, preview host-forwarding ergonomics, Drive/auth, package/tooling, and placeholder/debug cleanup are leaf, enforcement, integration, or documentation concerns relative to the runtime read-model god-module. Broad domain realization redesign is conceptually central but intentionally deferred unless the Wave 027 scout proves read-model extraction cannot proceed without it.

**Target outcome**

`RuntimeSession` remains the sole owner/composer of concrete `World` and `CommandStack`, but it no longer owns bulky properties/process/elements/presentation read-model construction inline. Read-model logic is moved into focused application modules or behavior-sized port factories with explicit contracts:

- properties-dialog view model builder/port;
- process-tree read-model and related-action/infeasibility builder/port;
- elements-panel read model plus named visibility intent/read behavior;
- canvas presentation/input/screen-to-3D DTO port boundaries where directly tied to current runtime read-model extraction;
- three-presentation read-model port boundaries where practical without rewriting scene-host or domain realization ownership.

Vue components keep consuming DTOs and named intents; they do not regain access to concrete `World`. Presentation selectors should receive DTOs or behavior-sized read capabilities instead of raw domain collections where feasible in this bounded wave. Runtime/session code should become a small composition owner that wires focused builders/ports together, not a god-module containing all read-model traversal, concrete class classification, and formatting logic.

Any residual raw domain realization dependency must be localized to a focused adapter with a documented owner and future-wave candidate; it must not appear as a generic world-like facade or as hidden `any` casts in `RuntimeSession`.

**Explicit DELETE list**

- Delete inline `RuntimeSession` properties-dialog view-model construction if replaced by a focused properties read-model builder/port.
- Delete `RuntimeSession` broad `as any` / `any` element formatting seams in `getPropertiesDialogViewModel`, `formatElementForPanel`, `getElementProperties`, and `findVisibleElement` where typed read-model DTO builders replace them.
- Delete runtime-local `realize2D(this.world)` / `Element2D.realize2D(this.world)` calls from `RuntimeSession` where focused read-model/realization adapters replace them.
- Delete inline process-tree description/infeasibility construction from `RuntimeSession` where a process read-model builder/port owns it.
- Delete inline elements-panel raw domain grouping and concrete `instanceof` classification from `RuntimeSession` where an elements read-model builder/port owns it.
- Delete direct elements visibility mutation inside the read-port body if a named visibility intent/use-case can own the current behavior without broad command/persistence redesign.
- Delete `CanvasWorldReadPort.getProcessTree()` exposure if visibility/process needs are moved to a named visibility/process read context.
- Delete `CanvasWorldReadPort` raw collection methods (`getAllProjectionPlanes`, `getAll3DPoints`, `getAll3DLines`, `getAll3DSegments`) where selector DTO/read-model methods replace them in this wave.
- Delete `ThreeWorldReadPort` world-shaped realization-context helpers or raw traversal methods where narrower scene read-model builders replace them in this wave.
- Delete stale tests that assert read-model construction belongs directly in `RuntimeSession`; replace with focused builder/port tests and wiring tests.
- Delete transitional broad facades, duplicate raw-and-port read paths, compatibility wrappers, dead exports, blanket casts, and new generic `WorldReadModel`/`RuntimeWorld` facades that merely rename the current seam.
- Do not delete or rewrite command producers/history, command descriptors/serialization/replay, `CommandStack`, persistence schema/replay, `ProjectService`, backend, Drive/auth, package/tooling, docs/specs, validation-platform code, preview scripts, or broad domain realization internals without reviewed plan edit.

**Success criteria**

- `RuntimeSession.ts` is materially smaller and composition-focused for scoped read-model concerns; properties/process/elements/presentation model construction is owned by focused modules or behavior-sized port factories.
- `RuntimeSession` no longer contains broad `any`/`as any` helper seams for properties/elements read models unless a residual is explicitly reviewed and documented as blocked by a deeper domain-contract wave.
- Runtime-local properties/process read-model code no longer calls `realize2D(this.world)` / `Element2D.realize2D(this.world)` from `RuntimeSession`; equivalent behavior is owned by focused adapters/builders with typed contracts.
- Process-tree panel behavior remains equivalent: descriptions, infeasibility indicators, related-action highlighting, subprocess stack state, rename/toggle intents, and subscriptions still work through typed read/command ports.
- Properties dialog behavior remains equivalent for labels, type, coordinates, dependencies, and style-save payloads, but its view model is produced by a focused read-model boundary rather than inline session traversal.
- Elements panel behavior remains equivalent for grouped 2D/3D element lists, labels/properties, visibility state display, and visibility toggling; direct raw domain mutation is either moved behind a named intent preserving current semantics or explicitly stopped for reviewed command/persistence plan edit.
- `CanvasWorldReadPort` and `ThreeWorldReadPort` are narrowed where directly tied to this wave; raw domain collection or world-shaped realization methods that remain are documented with owner, caller map, and future-wave rationale rather than hidden behind a renamed facade.
- The 3D overlay pointer-event contract remains protected if presentation/overlay-adjacent code is touched; e2e/live evidence must prove the overlay does not become click-through again.
- No production Vue component regains concrete `World` injection or raw `World` props.
- No command-production, command-history, persistence schema/replay, backend/frontend contract, Drive/auth, package/tooling, docs/spec, validation-platform, preview-tooling, broad domain-realization, or generic application-kernel changes occur without reviewed plan edit.
- Focused tests cover properties read-model builder/port, process-tree read-model/infeasibility/related-action behavior, elements-panel read/visibility behavior, runtime wiring, canvas/three presentation read models where changed, and the 3D overlay interaction boundary where applicable.
- Architecture/static scans prove the scoped deleted seams are absent and no dual raw-and-port read path was left behind.
- Mandatory validation cadence passes with stable logs: root/frontend lint where defined, focused Vitest for touched runtime/read-model/presentation modules, full root/frontend Vitest, root/frontend build, root/frontend Playwright e2e because properties/process/elements/canvas/3D behavior is user-observable, live preview refresh on `0.0.0.0:5173`, HTTP reachability probe, and Playwright/live smoke for properties dialog, actions/process panel, elements visibility toggle, representative canvas render/hit/hover, 3D view refresh/interaction, and undo/redo regression checks without real credentials.

**Dependencies**

Depends on Wave 026 because Wave 026 deleted raw tool-context access and left the next residual seams as runtime properties/process/persistence reads plus canvas/three presentation read-model adapters. It is ordered before ProjectSessionPersistenceAdapter/ProjectService contract cleanup, backend/frontend contract stance, toolbar-history typing cleanup, validation-gate hardening, docs/spec drift, Drive/auth, package/tooling, preview tooling, placeholder/debug cleanup, and broad domain-realization redesign because those later waves should consume focused runtime read-model and presentation DTO boundaries rather than extending the current `RuntimeSession` god-module.

**Validation requirements**

All Wave 027 validation stdout/stderr must be captured to stable files under the reviewed Cycle 027 implementation directory's `validation/` subdirectory. Undefined commands may be skipped only with exact package-script evidence in the implementation log; defined root or workspace commands are mandatory.

1. Capture pre-edit scoped git status/diff and static scans for `RuntimeSession` read-model helpers, `as any`/`any` helper seams, `realize2D(this.world)`, `Element2D.realize2D(this.world)`, process-tree/dependency reads, elements visibility mutation, `CanvasWorldReadPort.getProcessTree`, raw canvas/three collection returns, world-shaped realization contexts, and overlay `pointer-events` rules.
2. Run focused Vitest for extracted properties/process/elements read-model modules and RuntimeSession wiring.
3. Run focused Vitest for canvas/three presentation read ports/selectors where changed.
4. Run focused overlay interaction regression tests if any presentation/overlay-adjacent file is touched; at minimum preserve the existing 3D overlay pointer-boundary test evidence in the validation log if untouched.
5. Run architecture/static tests or focused boundary scans proving no production Vue component receives concrete `World`, the scoped `RuntimeSession` helper seams were deleted, and no generic world-like read facade replaced them.
6. Run `npm run lint` at the repository root and in every workspace where a lint script is defined, including `frontend` while it remains the active workspace.
7. Run full Vitest at the repository root and in every workspace where a test/Vitest script is defined, including `frontend` while it remains the active workspace.
8. Run `npm run build` at the repository root and in every workspace where a build script is defined, including `frontend` while it remains the active workspace.
9. Run Playwright/e2e at the repository root and in every workspace where an e2e script is defined because properties, process/actions panel, elements panel, canvas presentation, and 3D view behavior are user-observable.
10. Refresh the live preview bound to `0.0.0.0:5173`, capture HTTP 200 reachability probes, and run focused Playwright/live browser smoke for properties dialog, actions/process panel, elements visibility toggle, representative canvas render/hit/hover, 3D view refresh/interaction, and undo/redo without real Drive/auth credentials.

**Risks**

- Extracting read-model builders can accidentally create a broad `RuntimeWorld` facade. Every new port method must be justified by the required caller inventory and should be named by behavior, not by mirrored `World` API.
- Properties/process/elements read models currently rely on concrete domain subclasses and realization feasibility. Moving them behind typed builders can reveal missing DTO contracts; prefer precise DTOs over preserving `any` fields.
- Elements visibility currently mutates style directly and marks the world dirty. If preserving current behavior behind a named intent is insufficient, stop for a plan edit rather than smuggling command-backed visibility or persistence semantics into this wave.
- Canvas/three presentation adapters still depend on domain realization internals. Narrow DTO ports where bounded, but do not redesign `Element2D.realize2D(...)` or projection realization ownership without a reviewed mini-cycle.
- The 3D hotfix proved overlay pointer ownership can regress even when architecture seams are unchanged. Validation must explicitly preserve the pointer-boundary contract for any presentation/runtime work touching overlay-adjacent code.
- RuntimeSession also contains persistence restore/snapshot handles. Avoid mixing those into this wave unless a read-model extraction change directly touches typed handles; persistence contract cleanup is a separate central wave candidate.
- Existing unrelated dirty source/audit state is broad. Implementation must use path-scoped status/diff, avoid reverting unrelated work, and not depend on unowned dirty files.

**No-backcompat rationale**

Inline runtime read-model construction and broad presentation read ports are internal architecture seams, not user or storage compatibility contracts. Keeping both inline `RuntimeSession` traversal and extracted read-model builders would preserve the god-module and invite future consumers to add more raw domain reads to the session owner. Delete the old inline helpers, broad raw-domain returns, casts, and dual paths once reviewed builders/ports exist; update active consumers/tests directly. Do not keep compatibility wrappers, generic facades, or transitional duplicate read paths.

---

## Wave 028 — Canvas projection DTO selectors and realization-read context ownership

**Status**

Added by `cycle-028-wave-plan-extension` after Wave 027 completed. Requires critic approval and bounded review of this plan extension before the canonical `cycle-028-fresh-scout-proposals` stage and before any implementation. This entry is grounded in current post-Wave-027 source evidence, Wave 027 closure evidence, and the Cycle 026 3D interaction regression lesson.

**Scope**

- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts`
- `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts`
- `frontend/src/application/canvasPresentation/Projected3DCanvasSelector.ts`
- `frontend/src/application/canvasPresentation/CanvasPresentationModel.ts` only where DTO contracts for plane-owned 2D canvas items or projected-3D canvas items need explicit types
- `frontend/src/application/canvasPresentation/CanvasVisibilityPolicy.ts` only where visibility must be consumed by the new canvas DTO selector contracts without reintroducing a process-tree/world leak
- a new behavior-sized canvas selector/read-port module if selected by review, such as `CanvasPlaneItemsSelector`, `Projected3DCanvasItemsSelector`, or `CanvasProjectionReadPort`, but not a generic `WorldReadModel`/`RuntimeWorld` facade
- `frontend/src/application/appShell/RuntimeSession.ts` only for wiring the changed canvas presentation/read-port contract and preserving input transform/screen-to-3D behavior
- `frontend/src/application/appShell/RuntimeViewPorts.ts` only if canvas DTO/read-port typing must be tightened for consumers
- `frontend/src/application/threePresentation/ThreeWorldReadPort.ts` only for an inventory and for small alignment with shared realization-read context ownership if the selected proposal proves a direct duplicate with the new canvas context; do not redesign the 3D scene adapter in this wave
- focused canvas-presentation, projected-3D selector, runtime wiring, realization/read-context, architecture-boundary, and overlay pointer-boundary tests

**Scope guard**

This wave owns the highest-centrality residual left by Wave 027: canvas presentation still traverses raw projection planes and raw 3D domain collections through `CanvasWorldReadPort`, and selectors still own domain-class traversal plus realization/projection loops instead of consuming behavior-sized canvas DTOs. It must not absorb persistence schema/replay, `ProjectService` contract cleanup, command history/producer redesign, backend/frontend contract stance, Drive/auth/browser adapters, package/tooling churn, validation-platform hardening, docs/spec reconciliation, toolbar-history typing cleanup, preview-script ergonomics, broad app-kernel work, UI feature work, command-backed visibility, or an unbounded domain model rewrite.

The proposals must begin with a fresh current-source caller inventory for every active canvas presentation seam: `CanvasWorldReadPort.getAllProjectionPlanes()`, `getAll3DPoints()`, `getAll3DLines()`, `getAll3DSegments()`, `getProjectionPlane2DTransform(...)`, `getProjectionPlane3DRealization(...)`, `realizePoint2D(...)`, `realizeLine2D(...)`, `realizeCircle2D(...)`, `realizePoint3D(...)`, `realizeLine3D(...)`, `realizeSegment3D(...)`, `isElementVisible(...)`, `CanvasPresentationSelector` raw `plane.getAll*()` loops, `Projected3DCanvasSelector` projected-3D loops, `RuntimeSession.getPlaneTransformsForInput()`, `RuntimeSession.screenTo3D(...)`, and any 3D overlay/pointer-adjacent consumer touched by the selected design.

Classify each use by behavior: 2D canvas render/query item production, projected-3D-on-2D render item production, plane transform lookup for rendering, plane transform lookup for input/hit/move behavior, element visibility policy, active-plane/grid behavior, screen-to-3D coordinate support, runtime wiring, and 3D scene read-model residuals. The selected design must delete raw collection seams only when a concrete behavior-sized DTO selector replaces all named callers. Partial deletion of the `getAll3DPoints()` / `getAll3DLines()` / `getAll3DSegments()` group is forbidden.

If the inventory proves that deleting the canvas raw traversal seams requires redesigning domain realization APIs, projection-plane mutation ownership, command/persistence semantics, or the 3D scene adapter broadly, stop and run a reviewed plan-edit mini-cycle rather than hiding a deeper redesign inside Wave 028.

**Current grounding**

Wave 027 completed the runtime read-model extraction and explicitly accepted the remaining canvas residuals. Its implementation log states that `CanvasWorldReadPort.getProcessTree()` was deleted, while `getAllProjectionPlanes()` and the raw projected-3D getters remained because `CanvasPresentationSelector` still needed plane-owned 2D traversal and `Projected3DCanvasSelector` still owned projected-3D iteration. It also records `ThreeWorldReadPort` and properties/process builders as residual candidates, but not as completed Wave 027 scope (`architecture-audit/cycle-027-runtime-read-model-extractors/implementation-log.md`, “CanvasWorldReadPort caller-map/residual evidence”; “Residual risks and next-wave candidates”).

Current source confirms the next central seam is canvas DTO selector ownership, not another runtime read-model extraction. `RuntimeSession.canvasViewPort()` still constructs `CanvasWorldReadPort`, computes input transforms by iterating `this.world.getAllProjectionPlanes()`, delegates canvas presentation to `CanvasPresentationController`, and calls `screenTo3D(..., this.world)` for coordinate support (`frontend/src/application/appShell/RuntimeSession.ts:38-73`). These runtime uses are adjacent wiring/input support and should be inventoried, but they do not justify reopening command producers, persistence handles, or panels.

`CanvasWorldReadPort` exposes raw domain collections and realization functions as its public contract: `getAllProjectionPlanes()`, raw 3D point/line/segment collections, per-entity 2D/3D realization calls, `getProjectionPlane3DRealization(...)`, and `isElementVisible(...)` (`frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:16-29`). Its adapter still wraps concrete `World` and creates a broad realization context with projection-plane, element, plane-realization, hinge-line, all-projection-plane, and all-hinge-line lookup methods (`frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:32-70`). This is no longer a process-tree leak after Wave 027, but it remains a raw traversal/realization-read boundary.

`CanvasPresentationSelector` consumes those raw seams directly. It iterates all projection planes twice, calls `plane.getAllPoints()`, `plane.getAllLines()`, and `plane.getAllCircles()`, classifies lines with domain `instanceof` checks, computes style/render/query primitives, and passes the same read port into `Projected3DCanvasSelector` (`frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts:22-90`). `Projected3DCanvasSelector` then iterates every projection plane and every raw 3D point/line/segment for each plane, realizes each 3D element, projects it through the plane realization, and emits canvas render items (`frontend/src/application/canvasPresentation/Projected3DCanvasSelector.ts:9-74`). These are behavior-sized enough for a bounded canvas DTO selector wave: the expected replacement can be concrete 2D canvas item and projected-3D canvas item selector/read-port methods rather than a generic world-shaped facade.

The domain realization context itself is less urgent than the canvas traversal owner for Wave 028. Current source already has typed realization context interfaces (`frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts:9-26`), and `Element3D.realize3D(context: Element3DRealizationContext)` plus `Plane3D.getPlaneEquation(context: PlaneEquationRealizationContext)` are typed in the current tree (`frontend/src/domain/world/Element3D.ts:31-42`; `frontend/src/domain/world/Plane.ts:24-38`). The residual problem is that canvas/three adapters still own broad context assembly and raw traversal. A domain-realization cleanup may still be a future wave, but Wave 028 should first delete the active canvas raw traversal seams that Wave 027 deliberately left behind.

`ThreeWorldReadPort` remains broader than ideal: it builds a world-backed realization context and traverses projection planes, reconstructed elements, guide intersections, and hinge lines (`frontend/src/application/threePresentation/ThreeWorldReadPort.ts:66-135`). However, current `ThreeWorldReadPort` already presents named 3D read-model methods, while canvas still exposes raw domain collections to active selectors. Therefore this wave may inventory and align duplicate realization-read context assembly, but should defer a broad 3D scene/read-port redesign unless the canvas selector proposal proves direct shared code must be extracted.

The Cycle 026 3D interaction regression is a validation constraint, not the architectural target. The hotfix proved that overlay pointer ownership can regress when presentation-adjacent work is touched, and Wave 027 validation preserved its e2e test. Wave 028 validation must keep that contract if `SvgCanvas.vue`, `ThreeView.vue`, app-shell overlay CSS, or presentation-adjacent wiring changes, but the wave must not broaden into a CSS-only interaction or scene-host wave.

Lower-priority candidates remain real but are deferred by centrality: runtime persistence handles and `ProjectService` DTO/schema cleanup, command history/producer cleanup, command-backed visibility, toolbar-history typing, backend/docs/spec drift, validation/live-preview tooling, Drive/auth, package scripts, and docs/debug cleanup are integration, command, enforcement, or documentation concerns relative to the active raw canvas traversal/read-port boundary.

**Target outcome**

Canvas presentation consumes behavior-sized canvas DTO/read capabilities instead of raw projection-plane and raw 3D domain collections. The active 2D canvas path has explicit ownership for:

- plane-owned 2D canvas render/query item source data;
- projected-3D-on-2D render item source data;
- plane transform lookup for rendering and input;
- visibility decisions for canvas elements;
- realization-read context assembly localized to a focused adapter rather than leaked as raw domain traversal methods.

`CanvasPresentationSelector` should become a composer of canvas DTO selectors and style/render/query mapping, or the selected proposal may move primitive construction into named selectors if that creates the sharper boundary. `Projected3DCanvasSelector` should no longer require raw `getAllProjectionPlanes()` plus raw 3D collection getters if a concrete projected-3D canvas DTO/read method can own that traversal. Any residual raw domain access must have a named owner, caller map, and future-wave rationale; it must not be hidden behind a generic `RuntimeWorld`, `WorldReadModel`, or broad presentation snapshot.

User-visible rendering, hit/query behavior, grid/active-plane behavior, projected-3D display, pointer ownership, selection/hover/cascade highlighting, and screen-to-3D coordinate support should remain equivalent unless a reviewed proposal explicitly documents a behavior change.

**Explicit DELETE list**

- Delete `CanvasWorldReadPort.getAllProjectionPlanes()` as a public selector dependency if all current canvas presentation and projected-3D callers are replaced by behavior-sized plane/item DTO methods in this wave.
- Delete `CanvasWorldReadPort.getAll3DPoints()`, `getAll3DLines()`, and `getAll3DSegments()` together if a projected-3D canvas DTO/read method replaces all three current projected-3D callers. Do not delete only one or two of the trio.
- Delete `CanvasWorldReadPort.realizePoint2D(...)`, `realizeLine2D(...)`, `realizeCircle2D(...)`, `realizePoint3D(...)`, `realizeLine3D(...)`, and `realizeSegment3D(...)` from the public canvas selector contract where the selected DTO selectors own realization internally.
- Delete `CanvasPresentationSelector` raw `plane.getAllPoints()`, `plane.getAllLines()`, `plane.getAllCircles()` loops where replaced by explicit plane-item DTOs.
- Delete `Projected3DCanvasSelector` raw nested loops over all planes and all 3D points/lines/segments where replaced by an explicit projected-3D canvas item selector/read method.
- Delete canvas selector domain `instanceof` classification seams where DTOs provide explicit canvas element kinds; retain only localized classification inside the focused adapter if no lower domain discriminator exists.
- Delete any reintroduced `CanvasWorldReadPort.getProcessTree()`, `Pick<World, 'getProcessTree'>`, process-tree-shaped visibility seam, or cast back to concrete `World` for canvas visibility.
- Delete transitional dual paths, compatibility wrappers, broad `CanvasWorld`, `RuntimeWorld`, `WorldReadModel`, or all-purpose presentation snapshot facades created during implementation.
- Delete stale tests that assert raw projection-plane/raw-3D getter access from canvas selectors; replace them with focused DTO selector/read-port and runtime wiring tests.
- Do not delete or rewrite persistence schema/replay, `ProjectService`, backend, Drive/auth, command history/producer, command descriptors/serialization/replay, `CommandStack`, docs/specs, package/tooling, validation-platform code, preview scripts, broad domain realization internals, or 3D scene-host code without a reviewed plan edit.

**Success criteria**

- The reviewed implementation either deletes `CanvasWorldReadPort.getAllProjectionPlanes()` from active canvas selector dependencies or documents a precise, bounded residual with a caller map proving why a concrete DTO selector cannot yet replace it.
- The raw projected-3D getter trio (`getAll3DPoints()`, `getAll3DLines()`, `getAll3DSegments()`) is deleted together from the active canvas selector contract, or retained together with a reviewed all-or-nothing residual rationale. Partial deletion is not acceptable.
- `CanvasPresentationSelector` no longer owns broad raw projection-plane traversal if a DTO selector can own it; remaining responsibilities are explicit and behavior-sized.
- `Projected3DCanvasSelector` no longer combines raw plane iteration, raw 3D collection iteration, realization, projection, and primitive emission unless the implementation log records reviewed evidence that the combined owner is still the least-bad bounded seam.
- `CanvasWorldReadPort.getProcessTree()` and process-tree-shaped visibility access remain absent; visibility is consumed through the named element-visibility capability established in Wave 027 or an equivalently narrow policy.
- RuntimeSession remains the private concrete `World`/`CommandStack` owner and may wire focused adapters, but it does not regain bulky canvas DTO traversal, broad read-model helper logic, or new generic world facade responsibilities.
- No production Vue component regains concrete `World` injection or raw `World` props.
- `ThreeWorldReadPort` is not broadened; any touched shared realization-read context reduces duplication without creating a global presentation god-module.
- Rendering/hit/query behavior remains equivalent for 2D points, lines, segments, guides, hinge lines, circles, projected 3D points/lines/segments, grid, active-plane display, hover/selection/cascade highlighting, and screen-to-3D coordinate support.
- The 3D overlay pointer-boundary regression remains covered if any presentation/overlay-adjacent file is touched; the app must not become click-through again.
- No persistence, command-history/producer, backend/frontend contract, Drive/auth, docs/spec, package/tooling, validation-platform, preview-tooling, broad app-kernel, command-backed visibility, or unbounded domain-realization redesign occurs without reviewed plan edit.
- Focused tests cover new canvas DTO selector/read-port contracts, projected-3D canvas item generation, visibility policy consumption, runtime wiring, transform/input behavior, and residual caller maps. Architecture/static scans prove deleted raw seams are absent and no dual raw-and-DTO path remains.

**Dependencies / ordering**

Depends on Wave 027 because Wave 027 extracted runtime read-model builders, deleted the canvas process-tree visibility leak, and deliberately left the raw canvas projection-plane/projected-3D traversal seams as named residuals. It is ordered before persistence/session contracts, command-history/producer cleanup, backend/docs/spec drift, Drive/auth, validation tooling, package/tooling, and UI/docs cleanup because those later waves should consume a cleaner canvas presentation read boundary. It is also ordered before a broad 3D scene adapter or domain-realization ownership wave because current canvas selectors still expose raw traversal more directly than `ThreeWorldReadPort`, and the current domain realization context is already typed enough for a bounded canvas DTO extraction attempt.

**Validation requirements**

All Wave 028 validation stdout/stderr must be captured to stable files under the reviewed Cycle 028 implementation directory's `validation/` subdirectory. Undefined commands may be skipped only with exact package-script evidence in the implementation log; defined root or workspace commands are mandatory.

1. Capture pre-edit scoped git status/diff and static scans for `CanvasWorldReadPort.getAllProjectionPlanes`, raw projected-3D getter trio, canvas realization methods, `CanvasPresentationSelector` `plane.getAll*` loops, `Projected3DCanvasSelector` raw loops, `CanvasWorldReadPort.getProcessTree`, process-tree-shaped visibility access, generic world-like facade names, production Vue concrete `World` access, `RuntimeSession` canvas wiring, `ThreeWorldReadPort` duplicate realization context assembly, and overlay `pointer-events` rules.
2. Run focused Vitest for new or changed canvas DTO selector/read-port modules, `CanvasPresentationSelector`, `Projected3DCanvasSelector`, `CanvasWorldReadPort`, `CanvasVisibilityPolicy` if touched, and `RuntimeSession` canvas wiring.
3. Run focused transform/input tests for `getPlaneTransformsForInput`, canvas hit/query behavior, active-plane/grid behavior, and `screenTo3D` if those contracts are touched or their read-port dependencies change.
4. Run focused 3D overlay pointer-boundary tests if any presentation/overlay-adjacent file is touched; at minimum preserve and cite existing e2e evidence if untouched.
5. Run architecture/static tests or focused scans proving deleted raw seams are absent, retained residuals have the documented caller map, no `CanvasWorldReadPort.getProcessTree()` regression exists, no production Vue component receives concrete `World`, and no generic `RuntimeWorld`/`WorldReadModel`/broad facade was added.
6. Run `npm run lint` at the repository root and in every workspace where a lint script is defined, including `frontend` while it remains the active workspace.
7. Run full Vitest at the repository root and in every workspace where a test/Vitest script is defined, including `frontend` while it remains the active workspace.
8. Run `npm run build` at the repository root and in every workspace where a build script is defined, including `frontend` while it remains the active workspace.
9. Run Playwright/e2e at the repository root and in every workspace where an e2e script is defined because canvas rendering, projected-3D display, hit testing, pointer ownership, and screen-to-3D behavior are user-observable.
10. Refresh the live preview bound to `0.0.0.0:5173`, capture HTTP 200 reachability probes, and run focused Playwright/live browser smoke for representative canvas render/hit/hover, projected-3D display toggling if available, active-plane/grid behavior, screen-to-3D coordinate behavior if available, 3D view interaction, elements visibility display, and undo/redo regression checks without real Drive/auth credentials.

**Risks**

- A canvas DTO selector can become a renamed `World` facade if it mirrors raw domain collections. Keep methods named by canvas behavior and prove every method from the required caller inventory.
- Moving traversal/realization ownership can subtly change render order, query item geometry, projected-3D feasibility filtering, or element IDs. Focused tests must compare representative primitives and query items, not only counts.
- Plane transforms serve both rendering and input. Deleting raw plane access without preserving transform semantics can break dragging, hit testing, grid placement, or screen-to-3D coordinate display.
- Visibility was narrowed in Wave 027; do not reintroduce process-tree reads or command-backed visibility redesign while cleaning canvas DTOs.
- `ThreeWorldReadPort` has real residual breadth, but broadening this wave into 3D scene/read-port redesign risks missing the sharper canvas raw traversal target. Touch three only for directly proven shared realization-read context alignment.
- The 3D overlay hotfix showed that presentation-adjacent changes can create click-through regressions. Treat pointer-boundary validation as mandatory whenever touched, even if the architectural change is nominally data-only.
- Existing unrelated dirty source state is present in the worktree. Implementation must use path-scoped status/diff, avoid reverting unrelated work, and not depend on unowned dirty files.

**No-backcompat rationale**

Raw canvas traversal getters and selector-owned domain loops are internal architecture seams, not compatibility contracts. Keeping both raw projection-plane/3D collection access and new DTO selectors would preserve the same bypass path under a new name and invite future canvas behavior to depend on mutable domain objects. Delete replaced getters, loops, casts, transitional wrappers, stale tests, and dual raw-and-DTO paths once reviewed behavior-sized DTO selectors exist. Do not preserve broad facades or compatibility overloads for internal selectors.
