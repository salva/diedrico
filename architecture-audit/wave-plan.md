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

Added by `cycle-021-wave-plan-extension` after Wave 020 completed. Requires review of this plan extension before the canonical `cycle-021-fresh-scout-proposals` stage and before any implementation. This entry is grounded in post-Wave-020 source evidence and the Wave 020 decision/implementation logs, which explicitly retained `SelectionUseCases` direct delete-command construction as residual debt.

**Scope**

- `frontend/src/application/appShell/SelectionUseCases.ts`
- command execution/kernel boundary modules that should own application command creation for selection/delete, expected under `frontend/src/application/` if the reviewed proposal introduces them
- `frontend/src/application/appShell/AppShellRuntime.ts` only where it wires the selected selection/delete command service or command-kernel port; do not move `World`/`CommandStack` ownership broadly unless selected by reviewed proposal
- `frontend/src/application/appShell/AppShellPorts.ts` only where selection/delete command execution needs a narrow typed port
- `frontend/src/application/appShell/KeyboardShortcutRouter.ts` only to preserve delete/select-all shortcut routing through the cleaned selection API
- `frontend/src/commands/factories/DeletionSequenceFactory.ts` and deletion-related command tests only as the command-side dependency that the new boundary consumes; do not redesign cascade deletion semantics unless current evidence proves the factory contract itself must move
- focused app-shell selection/use-case/command-kernel tests and representative keyboard/delete/select-all e2e/live checks

**Scope guard**

This wave owns the post-Wave-020 selection/delete command-construction seam. It must start with a current inventory of all active delete-selection call sites, direct `new Command(...)` construction in application/UI layers, `DeletionSequenceFactory` consumers, `CommandStack` push paths reachable from keyboard/app-shell selection flows, and selection-store cascade-preview coupling.

Do not reopen project persistence schema, command descriptor serialization, operation replay, Google Drive/auth, app-shell production browser composition, canvas/tool construction controllers, process-history panel/toolbar controllers, rendering selectors, Three scene-host lifecycle, backend stance, validation platform, docs/spec reconciliation, or placeholder/debug cleanup. If the inventory proves that a broader application kernel for all command execution is required before selection/delete can be cleaned, the proposals may select that higher-layer restructure, but implementation must remain bounded to the reviewed selection/delete slice and must not silently absorb canvas/tool/panel/toolbar command paths.

**Baseline/current grounding**

Wave 020 deliberately cleaned app-shell production composition but retained selection/delete command construction as accepted residual debt. The Wave 020 decision states that `frontend/src/application/appShell/SelectionUseCases.ts` direct construction of delete commands through `Command` / `DeletionSequenceFactory` is intentionally retained for that cycle and may need a future reviewed wave (`architecture-audit/cycle-020-app-shell-project-session-browser-boundary/decision.md`, “SelectionUseCases residual handling”; “Residual risks accepted for implementation”). The Wave 020 implementation log confirms the same residual after validation: `SelectionUseCases` still directly constructs delete commands via `Command` / `DeletionSequenceFactory`, while `AppShellRuntime.ts` still creates `World` and `CommandStack` as an allowed residual application-kernel question (`architecture-audit/cycle-020-app-shell-project-session-browser-boundary/implementation-log.md`, “Protected-surface checks”; “Residual risks / future wave candidates”; “Residual risks accepted after closure”).

Current post-Wave-020 source evidence confirms the residual is active and central rather than historical. `SelectionUseCases` imports `Command`, `CommandStack`, `DeletionSequenceFactory`, and `World`; its constructor receives `world` and `commandStack`; `deleteSelected()` creates `new Command('Delete elements', this.world)`, asks `DeletionSequenceFactory.createCascadeDeletion(...)` to fill it, commits it, pushes it to `commandStack`, and clears selection (`frontend/src/application/appShell/SelectionUseCases.ts:2`, `frontend/src/application/appShell/SelectionUseCases.ts:3`, `frontend/src/application/appShell/SelectionUseCases.ts:4`, `frontend/src/application/appShell/SelectionUseCases.ts:12`, `frontend/src/application/appShell/SelectionUseCases.ts:13`, `frontend/src/application/appShell/SelectionUseCases.ts:36`, `frontend/src/application/appShell/SelectionUseCases.ts:37`, `frontend/src/application/appShell/SelectionUseCases.ts:38`, `frontend/src/application/appShell/SelectionUseCases.ts:39`). The same class also reaches through `World` for dependency cascade preview (`frontend/src/application/appShell/SelectionUseCases.ts:58`), so deletion behavior mixes selection state, dependency preview, command construction, command commit/push, and active-plane selection reads in one app-shell use case.

`AppShellRuntime` remains the composition point that creates `new World()` and `new CommandStack()`, then passes both concrete objects into `SelectionUseCases` and other app-shell/session use cases (`frontend/src/application/appShell/AppShellRuntime.ts:16`, `frontend/src/application/appShell/AppShellRuntime.ts:17`, `frontend/src/application/appShell/AppShellRuntime.ts:31`). `AppShellPorts` still types project-session persistence in terms of concrete `CommandStack`, `World`, and `ProjectData` (`frontend/src/application/appShell/AppShellPorts.ts:2`, `frontend/src/application/appShell/AppShellPorts.ts:3`, `frontend/src/application/appShell/AppShellPorts.ts:5`, `frontend/src/application/appShell/AppShellPorts.ts:26`, `frontend/src/application/appShell/AppShellPorts.ts:28`), which shows the broader kernel/persistence contract question remains present but should not displace the narrower selection/delete seam unless a reviewed proposal proves it is necessary.

Lower-priority candidates remain real but are less central for the immediate next wave. Current scans show `ProjectService` still owns command-stream persistence orchestration and is still reached through the narrow Wave 020 app-shell adapter (`frontend/src/services/ProjectService.ts:2`, `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:7`, `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:16`), but Wave 020 intentionally did not redesign persistence internals and a selection/delete command boundary is the active app-shell command leak directly called by keyboard behavior. Placeholder/debug/noisy logging surfaces exist in canvas/toolbars/panels and command factories (`frontend/src/components/workspace/SvgCanvas.vue:491`, `frontend/src/components/toolbars/ToolFamilyButton.vue:98`, `frontend/src/components/dialogs/PropertiesDialog.vue:329`, `frontend/src/commands/factories/DeletionSequenceFactory.ts:65`), but cleanup would be peripheral before the command-use-case seam is resolved. Backend/frontend contract stance, docs/spec drift, and validation-gate hardening remain deferred because the current active frontend application-kernel boundary still exposes concrete command construction.

**Target outcome**

Selection/delete application behavior is routed through a typed application command boundary rather than constructing and pushing concrete `Command` objects inside `SelectionUseCases`. `SelectionUseCases` owns selection intent orchestration and selection-store updates; a command-kernel/use-case service owns delete command creation, cascade deletion factory use, commit/push behavior, and error/result reporting for delete-selected. Cascade preview should be expressed through a narrow read/query dependency rather than making selection state reach through the entire mutable `World` unless the reviewed proposal explicitly keeps a minimal world-read port as the current bounded compromise.

The wave should clarify, not broaden, runtime object ownership. `AppShellRuntime` may continue to own the current in-memory `World` and `CommandStack` if the selected proposal keeps the slice narrow, but it should wire them behind an explicit delete-selection command service/port so the app-shell selection use case no longer imports command construction primitives. If the restructure proposal selects a small command-kernel composition object, it must be limited to selection/delete and must leave canvas/tool, panel/toolbar, persistence, and project/session command paths untouched except for named wiring needed by this wave.

**Explicit DELETE list**

- Delete `SelectionUseCases.ts` imports of `Command`, `CommandStack`, and `DeletionSequenceFactory` once a typed delete-selection command boundary is introduced.
- Delete `SelectionUseCases.deleteSelected()` direct `new Command(...)`, `DeletionSequenceFactory.createCascadeDeletion(...)`, `commit()`, and `commandStack.push(...)` calls.
- Delete any selection-use-case test assertions that inspect concrete command internals or require `SelectionUseCases` to construct commands itself; replace with intent/result/port interaction tests and command-boundary tests.
- Delete broad fake `World as any` / `CommandStack as any` test helpers in touched selection tests where typed test doubles or command-boundary fakes replace them.
- Delete transitional overloads, compatibility wrappers, or parallel old/new delete-selected paths that preserve both direct command construction in `SelectionUseCases` and the new command boundary.
- Do not delete or rewrite `DeletionSequenceFactory` cascade semantics, command descriptor persistence, project serialization, canvas/tool command controllers, process-history panel/toolbar controllers, backend files, docs/specs, package/tooling, or debug/placeholder surfaces in this wave unless a reviewed mini-cycle explicitly broadens scope.

**Success criteria**

- `SelectionUseCases.ts` no longer imports or directly instantiates `Command`, imports `CommandStack`, imports `DeletionSequenceFactory`, commits commands, or pushes commands to the stack.
- Delete-selected behavior remains user-visible equivalent: empty selection is a no-op, selected elements and dependent cascade elements are removed in the existing order, selection is cleared after successful deletion, cascade highlight behavior remains correct, undo/redo restores/deletes as before, and keyboard Delete/Backspace routing still invokes the selection flow.
- A focused command-boundary/use-case test covers successful cascade deletion, empty selection, failure/result handling if introduced, command-stack push/undo integration, and selection-store clearing without mounting Vue components.
- A focused selection-use-case test covers selection intent orchestration and cascade-preview query behavior through typed fakes/ports rather than concrete command internals.
- `AppShellRuntime` wiring makes the command ownership boundary explicit and does not reintroduce hidden browser/global or production-composition defaults cleaned in Wave 020.
- No project persistence schema, command descriptor/replay behavior, Google Drive/auth behavior, rendering/Three/canvas/tool/panel/toolbar controller architecture, backend stance, package/tooling, docs/spec, or placeholder/debug cleanup is changed without reviewed plan edit.
- Mandatory validation cadence passes with stable logs: root/frontend lint where defined, focused Vitest for selection/app-shell command-boundary tests, full root/frontend Vitest, root/frontend build, root/frontend Playwright e2e because delete/undo/keyboard behavior is user-observable, live preview refresh on `0.0.0.0:5173`, HTTP reachability probe, and Playwright/live smoke for representative selection-delete-undo keyboard behavior.

**Dependencies**

Depends on Wave 020 because Wave 020 established the explicit app-shell production composition and intentionally left `SelectionUseCases` direct command construction as residual debt. It is ordered before broader application-kernel/runtime-object ownership, persistence-contract residue cleanup, backend/frontend contract stance, validation-gate hardening, placeholder/debug cleanup, docs/spec drift, and remaining rendering/domain-contract seams because the active app-shell command leak sits on the keyboard/delete path and is a central application/use-case boundary violation.

**Validation requirements**

All Wave 021 validation stdout/stderr must be captured to stable files under the reviewed Cycle 021 implementation directory's `validation/` subdirectory. Undefined commands may be skipped only with exact package-script evidence in the implementation log; defined root or workspace commands are mandatory.

1. Capture pre-edit scoped git status/diff and static scans for `SelectionUseCases`, delete-selected call sites, `new Command`, `DeletionSequenceFactory`, `CommandStack.push`, cascade-preview dependency reads, and keyboard delete routing.
2. Run focused Vitest for changed selection use-case, command-boundary/kernel, app-shell runtime wiring, and keyboard routing modules.
3. Run `npm run lint` at the repository root and in every workspace where a lint script is defined, including `frontend` while it remains the active workspace.
4. Run full Vitest at the repository root and in every workspace where a test/Vitest script is defined, including `frontend` while it remains the active workspace.
5. Run `npm run build` at the repository root and in every workspace where a build script is defined, including `frontend` while it remains the active workspace.
6. Run Playwright/e2e at the repository root and in every workspace where an e2e script is defined because selection/delete/undo/keyboard behavior is user-observable.
7. Refresh the live preview bound to `0.0.0.0:5173`, capture HTTP 200 reachability probes for loopback and in-container host binding where meaningful, and run focused Playwright/live browser smoke for creating/selecting/deleting/restoring representative elements via keyboard or UI without real Drive credentials.

**Risks**

- A “command kernel” can become a new god service if it absorbs canvas/tool, panel/toolbar, persistence, and project/session command concerns in one wave. Keep Wave 021 limited to selection/delete unless a reviewed proposal explicitly selects a bounded higher-layer design.
- Deletion cascade order and dependency cleanup are correctness-critical; tests must prove dependent elements, process-tree actions, undo/redo, and selection clearing remain equivalent.
- Moving command push/commit ownership can change autosave dirty-version behavior if command-stack mutation timing changes. Include focused assertions and e2e/live smoke for delete/undo and save-status-adjacent behavior where practical.
- Cascade preview still needs dependency information from the domain. Avoid replacing full `World` with an equally broad read port; expose only the dependency/candidate lookups actually needed by the selection flow.
- Existing unrelated dirty source files are present in command and component paths. Implementation must use path-scoped status/diff, avoid reverting unrelated work, and not depend on unowned dirty changes.

**No-backcompat rationale**

Direct command construction inside `SelectionUseCases` is internal architecture debt, not a compatibility surface. Preserving old and new delete-selected paths would keep the application/use-case boundary ambiguous and would let future app-shell behavior keep reaching into command internals. Delete the old direct command imports/calls once the reviewed boundary is in place, and update active callers/tests directly.
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
