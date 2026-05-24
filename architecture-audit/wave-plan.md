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

## Wave 006 — Move UI command construction into application use-cases/tool controllers

**Scope**

- Primary one-cycle target: `frontend/src/components/workspace/SvgCanvas.vue`, `frontend/src/tools/**`, `frontend/src/composables/useCommandExecution.ts`, and the command-construction factories needed by canvas tools
- Secondary call sites only if they share the same extracted controller without broadening the implementation: `frontend/src/components/panels/ActionsPanel.vue`, `frontend/src/components/toolbars/Toolbar.vue`, `frontend/src/commands/factories/`, `frontend/src/services/factories/`
- focused tool-controller/use-case tests plus e2e construction flows

**Scope guard**

This wave must remain one implementation cycle. During proposal drafting, if removing direct operation construction from `SvgCanvas.vue`/tools and from `ActionsPanel.vue`/`Toolbar.vue` requires separate controller concepts or independent validation surfaces, the proposal must split the work through a reviewed wave-plan edit before implementation. The preferred split is: 006a canvas/tool command controllers, then 006b panel/toolbar command-intent cleanup.

**Baseline grounding**

The baseline flags UI components directly importing `Command` and concrete operations (`architecture-map.md` leak 3; `risk-register.md` R5; `quality-report.md` Q1, Q4, Q19). It also shows factories split between `commands/factories` and `services/factories` without a true dependency boundary (`architecture-map.md` “Tools and command builders”).

**Target outcome**

The primary canvas/tool path has Vue components emit user intents and render state while application use-cases/tool controllers own command creation, validation orchestration, and command-stack execution. Tool/factory modules touched by that path have a coherent location and dependency direction; broader panel/toolbar cleanup proceeds here only if it stays within the same controller boundary and one-cycle validation budget.

**Explicit DELETE list**

- Delete direct imports of concrete operations from the canvas/tool Vue path addressed by this wave; if panel/toolbar imports remain after a reviewed split, they must be named as the next dependent wave rather than left as accidental residue.
- Delete duplicate factory layers or misleading service/command factory split for the command-construction path selected by the reviewed proposal.
- Delete component methods that only assemble command internals and are replaced by use-case/controller calls.
- Delete obsolete tests that mount components to inspect command internals; replace with controller/use-case tests plus behavior tests.

**Success criteria**

- `SvgCanvas.vue` and the active tool path no longer import concrete operation classes; `ActionsPanel.vue` and `Toolbar.vue` are also cleaned in this wave only if the proposal proves they fit the same controller extraction, otherwise a reviewed follow-up wave is added before implementation proceeds beyond the canvas/tool slice.
- Tool controllers/use-cases have focused tests independent of Vue rendering.
- Existing e2e construction, guide, intersection, dynamic-plane, selection, and undo/redo flows pass.

**Dependencies**

Depends on Waves 001–005 so command, process, persistence, and authoritative state boundaries are stable before moving UI command construction.

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
