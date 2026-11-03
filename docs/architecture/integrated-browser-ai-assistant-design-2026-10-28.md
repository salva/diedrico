# Integrated browser AI assistant — Astra design proposal

Date: 2026-10-28. Status: **design for approval; provider integration blocked**.

## 1. Recommendation and constraints

Add an in-application assistant whose dialogue is a collapsible column **to the left of the existing elements/process sidebar**. Its tools execute semantic application actions inside the same browser runtime as manual editing. Keep one domain model, one command history and the existing command-stream persistence authority.

**Hard deployment constraint:** the complete product must remain browser-hosted/static, including GitHub Pages. No Diedrico backend, localhost listener/service, companion, proxy, Codex app-server, MCP bridge or extension workaround is permitted. External OpenAI authentication/inference services are the intended outbound connections. Dialogue and application tools remain in Diedrico.

**Feasibility decision:** current official documentation describes public-client OAuth and ChatGPT-plan inference, but does **not establish a supported entirely browser-hosted combination**. Its OSS subscription registration explicitly requires a loopback listener; website identity integration explicitly requires a backend; credential guidance excludes browser storage. Do not implement a guessed login, borrow another client's ID, reuse Codex/OpenCode credentials, or substitute API-key billing. Obtain an official supported SPA subscription flow and CORS/security contract first. Local semantic-interface improvements and panel work can be approved independently, but cannot be presented as a working Codex integration.

This proposal uses “assistant” for the Diedrico-owned dialogue/tool loop. Calling an available Codex-family model through Responses is not the same as embedding the Codex agent runtime. Owner must decide whether the former, authenticated through the user's ChatGPT plan, fulfills “connect to Codex.” Neither is currently proven feasible under the static-only constraint.

### Inspection record

- Initial HEAD: `c4b0ce729b959ebd9618d37970c9c71db9d87950`; initial `git status --short`: clean.
- Read workspace/repository AGENTS instructions, supplied workspace memory/handoff, README, architecture overview/domain/commands/discrimination docs, and actual sources cited below. Existing architecture proposals were inspected by directory listing; this new path did not exist.
- Source inspection, public documentation retrieval and this single proposal only. No credentials, authenticated provider calls, runtime operations, source/config changes or publishing.
- Current source wins over stale prose: `docs/architecture/domain-model.md` still mentions World active-plane ownership and `DependencyGraph.ts`; source uses `RuntimeSession` active plane and `DependencyService.ts`. README's browser/local persistence claim is broader than the inspected user-facing project workflow (see capability matrix).
- Final repository observations are recorded in the delivery report. Recheck these findings against HEAD before implementation, especially if concurrent work changes ports, schemas or geometry.

## 2. Provider feasibility: what is documented, and what is missing

Official pages retrieved on 2026-10-28 (URLs are authoritative sources, not permission to perform sign-in):

| Source | Relevant documented contract |
| --- | --- |
| [Codex authentication](https://developers.openai.com/codex/auth/) | ChatGPT subscription login and API-key usage are distinct; local Codex clients own cached credentials and renewal. A browser opened by a CLI is not a browser-hosted OAuth client. |
| [Sign in with ChatGPT website](https://developers.openai.com/siwc/website) | Limited commercial trial; registered exact callbacks; public and confidential clients; Authorization Code + S256 PKCE + OIDC. Explicit backend prerequisite and backend exchange/session examples. Identity-only public clients use token authentication `none`, but an ID token alone is not inference permission. |
| [Request client ID](https://developers.openai.com/siwc/request-client-id) | Selected commercial partners / interest form. Registration or approval cannot be assumed for Diedrico. |
| [OSS ChatGPT-plan overview](https://developers.openai.com/siwc/token-sharing-open-source) | Public plan-use flow exists for OSS/locally hosted apps; directs paid/remotely hosted apps to interest form. Host identity and account/workspace-specific client registration. Does not grant access to existing ChatGPT conversations. |
| [OSS registration/sign-in](https://developers.openai.com/siwc/token-sharing-open-source/sign-in) | Official dynamic registration entrypoint; issued client ID; no client secret; scopes include `offline_access resource.invoke chatgpt.tokens.use.direct`; resource `https://api.openai.com/v1`. Requires HTTP loopback callback on `127.0.0.1`, listener started first; only port may vary. Not a documented GitHub Pages HTTPS callback flow. |
| [Accounts/sessions](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions) | App owns token refresh; serialize rotating refreshes; revoke renewable session on sign-out; keep account/client/host mappings separate. Explicitly says keep tokens out of browser storage. |
| [Models/inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference) | OAuth bearer may call public `/v1/models` and `/v1/responses`, not ChatGPT `backend-api`. Use account-specific models, `store:false`, `stream:true`; wait for `response.completed`, handle failed/incomplete streams. |
| [Plan-use limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations) | HTTP history sent in input; no `previous_response_id` or persistent conversation API; function/custom tools grouped in namespaces or additional-tools items. Hosted MCP, native computer use and `tool_search` unsupported on this route. |
| [Function calling](https://developers.openai.com/api/docs/guides/function-calling) | Application receives calls, validates/executes them and returns call-ID-linked outputs; retain required output/reasoning items. General examples must be narrowed by plan-use limitations above. |
| [Codex app-server](https://developers.openai.com/codex/app-server) | Process-based rich-client integration; stdio and other transports. This is a real alternative integration architecture, but forbidden by this product's no-server constraint. |

### Exact blockers and release gate

1. **Callback and client eligibility:** a static page cannot listen on a raw TCP socket to implement the required loopback callback. Browser outbound fetch/SSE/WebSocket support does not fix that. A registered public HTTPS SPA callback with inference scopes is needed. Public-client support in the website identity guide alone does not establish it. OSS license alone does not establish whether a remotely served Pages app is eligible for the OSS registration route.
2. **CORS:** no reviewed official page promises SPA CORS on discovery/JWKS, code exchange, refresh, revocation, account-specific models and streaming Responses for this subscription flow. Their actual origin/header/preflight contracts remain unverified. Do not claim those endpoints definitely reject browsers; documentation is insufficient. A command-line successful request would not prove CORS. Need official allowed-origin guidance and a later authorized real-browser test from the exact Pages origin.
3. **Device authorization:** no third-party SPA device-authorization contract was established from these docs. A supported CLI login or device mode would not automatically authorize a Diedrico public client, browser polling, token exchange, renewal or inference. Device flow is not a workaround to registration or CORS.
4. **Credentials/session:** documented plan-use renewal/storage is a local-runtime contract, not an approved browser lifecycle. No client secret may enter a static bundle. No long-lived token in localStorage, sessionStorage, IndexedDB, project JSON or chat logs. Memory-only tokens reduce persistence exposure but do not establish provider support or remove XSS exposure. A Web Worker is not an OS credential store. Need an official browser credential/renewal/revocation recommendation (possibly short-lived memory-only sessions with reauthentication); do not invent one as settled policy.
5. **Provider product semantics:** approval must cover ChatGPT-plan inference and application-executed tools, not merely identity login. Model entitlement and usage limits are discovered at runtime. User selection of Astra for this design is not permission to promise Astra availability to every Diedrico account.

Ask OpenAI for supported public SPA registration, exact HTTPS callback requirements, grant/scopes/resource, CORS including SSE and error responses, token lifetime/rotation/revocation policy, browser storage guidance, and whether a static OSS Pages deployment is eligible. Only then authorize a minimal login → account model list → streamed reply → harmless application tool → refresh/sign-out validation. **No such provider validation was performed for this design.**

GitHub Pages would serve a real callback asset under its configured base path (rather than rely on an absent SPA rewrite). A future approved popup flow must validate state/nonce/PKCE, exact message origin/source, code one-time use, ID-token signature/issuer/audience/expiry and granted scopes. Clear callback parameters immediately; use no token-bearing URLs. These are conditional implementation requirements, not a currently supported callback recipe.

All outbound connections must remain HTTPS. There is no localhost fallback: mixed-content and local-network permission exceptions are irrelevant and must not be requested. Browser security settings remain intact.

**Alternatives:** wait/request official browser support is the compliant recommendation. Direct OpenAI API-key Responses is a different billing/auth product, requires explicit owner approval and a separate browser credential-security assessment; it is not silently enabled as fallback. A backend or local app-server is technically a documented integration direction but explicitly excluded. An external ChatGPT/agent UI or MCP-controlled workflow does not satisfy the requested product.

## 3. Current architecture: reusable seams and specific gaps

Most drawing mutations already have a useful high-level interface:

- `application/appShell/AppShellRuntime.ts` composes `RuntimeSession`, project/autosave/selection use cases and injected view/command ports. `RuntimeInjectionKeys.ts` supplies Vue consumers.
- `tools/ToolCommandIntents.ts` defines a typed construction union and properties/style/movement requests. `application/tools/CanvasToolController.ts` implements that sink. `application/construction/ConstructionUseCases.ts` validates references and creates operation sequences, process actions and feasibility checks.
- `application/commandProduction/RuntimeCommandProducer.ts` builds, commits, pushes and rolls back command attempts. `commands/Command.ts`, `CommandStack.ts` and `operations/OperationRegistry.ts` own execution/history/replay.
- `ProcessHistoryController`/`ProcessHistoryUseCases` own subprocess/output/encapsulation operations. `SelectionDeletionCommandService` + `DeletionSequenceFactory` own cascading deletion.
- `RuntimeViewPorts.ts` and app-shell read models expose elements, properties and process nodes. Canvas/Three selectors distinguish definitions from derived display primitives.
- `ProjectSessionUseCases.ts`, `AutoSaveUseCases.ts`, `ProjectService.ts` own Drive orchestration, transition generations and schema-8 command replay. `viewStore`, `toolStore`, `settingsStore`, `processTreeStore` own UI/preferences.

**Answer to “is there already a full high-level agent port?”: partially, not yet.** Do not expose `runtime.internals`, the DEV `window.__diedricoRuntime`, `World`, `OperationContext`, or tools' live domain objects. `ToolInteractionReadPort` currently returns mutable class instances; it is not a JSON observation boundary. Most mutation results are only `{success,message}`, history/deletion are void and project methods can catch errors into UI state. There is no stable session epoch, receipt, eligibility DTO or unified busy-state seam. Fit-to-view still uses a component callback; pan/zoom/display settings are separate store actions; Three camera controls remain rendering-owned. Those are small concrete gaps, not justification for a second application framework.

### Object hierarchy, operational counterpart and identity

| Domain definitions (actual files under `domain/world`) | Operational counterpart | Assistant interpretation |
| --- | --- | --- |
| `Element` → `Element2D` → `Point2D`; `FreePoint2D`, three intersection subtypes, `SiblingIntersectionPoint2D` in `Point.ts` | Point/intersection sequence factories; add/update/remove operations; process creation actions | A free point can move only if unlocked. An intersection is defined by inputs/branch; a sibling derives from its primary. Never “move” a dependent point by rewriting realized coordinates. |
| `Line2D` and subclasses in `Line.ts`; `Segment2D extends Line2D`; `Guide2D extends Line2DPerpendicularToLine`; `SiblingGuide2D extends Line2D`; `HalfHingeLine2D` and broken half | Line/guide/hinge/intersection factories and operations | Preserve finite-segment semantics despite inheritance; guide and hinge roles matter for eligibility. Semantic DTO kinds may discriminate without changing canonical domain `instanceof` dispatch. |
| `Circle2D` center/point, center/radius-vector and three-point variants | Current tools expose first two; editable radius only on radius-vector subtype | Class existence is not tool availability. Three-point circle is not a new callable construction unless a validated shared use case is separately added. |
| `Element3D`, points from coordinates/projections and other rules, `Line3DFromProjections`, segments, `Plane3DFromTraces` | `Add3D*Op` plus construction use cases | 3D XYZ UI construction deliberately creates a process sequence with 2D points/guides and reconstruction. Do not substitute a bare `World` coordinate point. Other domain-only constructors are not permission for new agent powers. |
| `ProjectionPlane extends Element`, fixed/auxiliary variants; `HingeLine extends Line3D` | Plane/initialization sequences and hinge relationships | Projection plane and geometric 3D plane are different objects. Active plane is transient runtime state; plane construction is persistent/undoable. |
| `Realization` and 2D/3D realizations; `domain/presentation/Paper.ts` primitives | `RealizationService`, canvas/Three selectors and render adapters | Derived geometry and representation are observations, never independent mutable entities. |
| Process actions/groups/subprocesses | `AddProcessTreeAction*Op`, push/pop/rename/output/encapsulation ops | Construction provenance and display organization; not geometric identity or dependency edges. |

Keep three relations explicit:

1. **Entity identity:** domain IDs, scoped by the current project/session. Plane-backed IDs use `ElementId.ts` hierarchical IDs; labels are display/search hints, never keys. Replay restores IDs; a new project can reuse the same strings.
2. **Construction relationships:** sibling points/guides are distinct entities with directional primary/dependency relationships and possibly paired-plane links. Two projections used to reconstruct a 3D element remain distinct 2D inputs. Report stored provenance; do not infer a universal equivalence class from “sibling.”
3. **Representation/coincidence:** `CanvasRenderItem.id`, `sourceEntityId`, `planeId`, role identify rendered forms. `Projected3DCanvasSelector.ts` creates IDs such as `proj3d-point-${id}-on-${planeId}`. Projected overlays and decorative arcs are intentionally excluded from `CanvasQueryItem`. Overlapping paper geometry can be a projection and a 2D input or two unrelated entities. Coincidence is not sameness, siblinghood or permission to delete both.

Expose separate `entityId` and `representationId`; representation stability is scoped to source/plane/role, not screen coordinates or array order. Audit other selector IDs and add deterministic role keys only where needed. Do not parse labels or projected-ID strings to recover ownership. Resolve through the read model. A render-only representation can be inspected and linked to its source, but cannot masquerade as a selectable 2D argument. If the user says “that point” and several references fit, return candidates with plane, role, source, dependencies and selectable/editable status. Highlight them for clarification. No automatic merging/deduplication based on geometric overlap.

## 4. Complete high-level capability coverage

Classes: **R** observation; **D** undoable document/drawing action; **U** transient UI or browser preference; **X** external effect or destructive session transition. X can include remote reads (data leaves/enters the app), not just writes. All tool names below are proposed names within provider namespace `diedrico`, not existing exports.

| User-facing surface | Class; proposed semantic tools | Existing owner and required adjustment |
| --- | --- | --- |
| Current project, plane, selection, history, settings, busy/account/save state | R `observe` | Compose runtime state/read ports and store snapshots; add epoch/revisions and structured eligibility. Never include tokens or all Drive account data by default. |
| Elements grouped by plane/type, properties, dependencies, feasibility, provenance, 2D/3D forms | R `list_entities`, `inspect_entities`, `inspect_representations` | Extend `ElementsPanelReadModel`, `PropertiesDialogReadModel`, canvas/Three selectors with structured values/relations rather than scrape formatted strings. Include hidden/infeasible objects explicitly. |
| Free point; line through points; segment | D `create_point`, `create_line`, `create_segment` | Map to `point`, `line`, `segment` intents, preserving plane and reference validation. |
| Circle through circumference point or numeric radius | D `create_circle` (explicit definition mode) | `circle` / `circle-by-radius`; convert positive plane-unit radius to existing radius-vector convention in shared application code. |
| Parallel/perpendicular/relative-angle lines | D `create_parallel_line`, `create_perpendicular_line`, `create_angle_line` | Existing intents; angle schema uses degrees and converts once to radians. |
| Line-line, line-circle, circle-circle intersections and tangent branches | R `construction_candidates`; D `create_intersection`, `create_tangent` | Reuse domain intersection calculations and existing intersection/tangent intents. Add branch/candidate observation and exact-branch validation in shared construction use case; no simulated mouse selection. |
| Guides and automatically created siblings | D `create_guide` | `GuideSequenceFactory.createGuideWithSibling`; result includes every created entity/process node. Do not implement siblings as a second agent call. |
| 3D point/line/segment from paired projections; plane from traces | D `reconstruct_3d` (typed definition union) | Existing `create3dpoint/line/segment/plane` intents and validation. Different dimensions/roles are explicit in schema. |
| 3D point by XYZ; YZ setup; auxiliary projection plane from T1/T2/T2′ | D `create_3d_point_xyz`, `create_projection_plane` | Existing coordinate macro, `create-yz-projection-plane`, `createprojectionplane`; preserve one logical command. YZ already-existing result is a no-op, not a new creation. |
| Transport; Folding Plane Setup, Quick 3D Line/Segment menu entries | R availability; U tool selection only where meaningful | Transport is labelled unimplemented; quick entries appear in `toolFamilies.ts`/`ToolTypes.ts` but no corresponding executor was found. Report unavailable, not success. Do not invent implementations to claim coverage. |
| Drag free point; properties position, style, visibility, radius, angle | D `update_properties`, `set_visibility` | `CanvasToolController.updateElementProperties` already combines edits in one command; `UpdateFreePoint2DPositionOp` rejects locked/non-free points. No agent drag previews. Share finite-value validation for programmatic position updates. Style of 3D entities uses existing style operation targeting semantics. |
| Delete selected/explicit entities with cascade | R `preview_delete`; D `delete_entities` | `SelectionDeletionCommandService` / `DeletionSequenceFactory`; expose validated ID-based request and structured result, not select-then-delete emulation. Cascade preview and execution must agree about system/protected entities. |
| Select single/add/multiple/all-in-plane, clear; related-action highlighting | U `set_selection` | `SelectionUseCases`/selection store; add validated explicit multiple-set method and membership checks shared by all callers. Observe actual supported selectable kinds. |
| Active-plane selection/cycling | U `set_active_plane` | `AppShellRuntime`/`RuntimeSession`; reject nonexistent plane rather than silently fall back. Return actual selected plane. |
| Tool/subtool selection, numeric argument field, cancellation | U `set_active_tool`, `cancel_interaction` | `toolStore`, `CanvasInteractionController`, `SvgCanvas` status input. Agent executes complete semantic intents rather than typing toolbar coordinates. Expose cancellation/busy state and hand-off to manual collection. |
| Pan/zoom, fit, grid, projected-overlay toggle | U `set_view`, `fit_view` | `viewStore`, canvas controller and fit callback; explicit desired values, numeric bounds and paper/viewport coordinate conventions. |
| Three-view orbit/zoom, plane surfaces, planar elements, linking visuals, grid, axes | U `set_three_view` | `ThreeView.vue`, `ThreePresentationPort`, display options, rendering runtime. Expose camera pose/reset through rendering/application seam if needed; no domain camera or duplicate projection math. |
| Three-window drag/resize/minimize/maximize/restore; assistant width/collapse | U `set_layout` | `viewStore` bounds/modes and new assistant UI state. Existing sidebar divider is CSS affordance, not evidence of functioning resize. Do not promise arbitrary plane rearrangement. |
| Process push/pop, rename subprocess, output flag, encapsulation/intermediates | D `process_edit` (closed action union) | `ProcessHistoryIntentSink`/controller/use cases; desired-state setters may adapt existing toggles after validated read. Keep process output/encapsulation separate from tree collapse. |
| Process node expand/collapse, element groups expand/collapse, panel navigation/properties display | U `set_panel_state`, `show_properties` | `processTreeStore`, `ElementsPanel`/`ElementTypeGroup` local state and canvas properties dialog; expose minimal UI state actions where currently component-local. |
| Undo/redo and history inspection | R `history_state`; D history transition `undo`, `redo` | `CommandHistoryPort`, toolbar history use cases, stack; add top-command receipt/ID observations and expected-top check. Never undo arbitrary old chat actions out of order. |
| New/create/open/rename project, chooser and file listing | X `project_create`, `project_open`, `project_rename`, `project_list`; U `show_project_chooser` | `ProjectSessionUseCases`, `DrivePort`. Current new/create/rename require Drive. Normalize outcomes rather than treat a resolved void Promise as success. Protect current drawing on project replacement. |
| Autosave, status, save-now | R `project_status`; X `project_save` | `AutoSaveUseCases`; add public structured save request/completion seam. Existing autosave policy remains the single owner. Committing drawing changes can schedule cloud writes: disclose that association. |
| Google sign-in/out | X `request_account_action` with provider `google-drive` | Existing Drive/project session actions; sign-in needs explicit user gesture, sign-out clears session/drawing in current source. Agent can request the UI flow, never credentials or silent consent. |
| Codex/ChatGPT sign-in/out, model/conversation switching | X/UI account and session controls | New browser provider session, **blocked pending section 2**. Separate from Google auth; visible account/model/entitlement state. No token tool. |
| Import/export/local persistence | R/X availability; future `project_import`, `project_export` | `ProjectService` schema 8 snapshot/validation/replay exists, but no current user-facing file import/export/download path was found. `BrowserLastProjectRepository` stores Drive reference, not a local drawing document. Mark unavailable in baseline. If approved as scope, add shared file actions and manual UI, never a model-only descriptor injection backdoor. |
| Grid spacing/color, snap enabled/radius; remembered subtool/display/window preferences | U `preferences_get`, `preferences_set` | `settingsStore`, `viewStore`, `toolStore`; some are store capabilities without a visible settings editor. Expose validated existing preferences and distinguish availability from currently visible controls. No arbitrary storage key writes. |

“Full interface” means every real action has a semantic route or an explicit, accurate unavailable/needs-user-gesture result. It does not mean exposing every internal method, implementing placeholder features, remote Drive sharing/deletion not present in the app, or giving the model auth secrets. Completeness is checked against UI handlers **and** application use cases, not only the construction intent union.

## 5. Minimal additions, ownership and data flow

```text
User in Diedrico
  ├─ existing panels/tools ───────────────┐
  └─ AssistantPanel.vue                  │
        ↕ AssistantController            │
        ├─ conversation + turn state     │
        ├─ official browser provider adapter [BLOCKED]
        │       ↕ HTTPS OAuth / Responses (OpenAI only)
        └─ validated semantic tool dispatch
                ↕ observations / eligibility / consent
                └───────────────────────┤
                         shared application use cases + UI actions
                             ├─ Command → operations → World/process tree
                             │     ↕ one CommandStack / replay registry
                             ├─ UI stores / rendering camera + viewport
                             └─ ProjectSessionUseCases / AutoSave → Drive
```

All tool execution is browser-owned. OpenAI proposes calls; it never holds a World reference or performs application effects independently. Dialogue history is Diedrico-owned; HTTP plan-use inference has no persistent conversation service to rely on.

Proposed files (all beneath `frontend/src` unless specified):

| Addition/change | Responsibility and reason |
| --- | --- |
| Add `application/assistant/AssistantController.ts` | One turn loop, streamed state, call receipts, stop/retry, account/project binding. No geometry or persistence replay logic. |
| Add `application/assistant/AssistantToolCatalog.ts` | Explicit tool schemas, effect category, dispatch handlers, eligibility. Ordinary typed table/functions, not a plugin or dependency-injection framework. Exhaustive mapping to construction intent families. |
| Add `application/assistant/AssistantContracts.ts` | JSON DTOs, result/error union, provider stream interface. No `Vector3`, Map/Set, class instances or credentials in tool DTOs. |
| Add `application/appShell/readModels/ApplicationObservation.ts` | Structured domain/application observation assembled from existing selectors and read contexts; geometry stays in domain. Shared by inspector UI where useful. |
| Add `components/panels/AssistantPanel.vue` and, if needed, a small `stores/assistantStore.ts` | Rendering, drafts, collapse/width and transcript presentation; application controller owns execution. Avoid a second reactive copy of World. |
| Add `infrastructure/openai/BrowserAssistantConnection.ts` only after provider gate | The one supported approved browser OAuth/inference implementation; renewal/session ownership explicit here. Do not create a multi-provider framework in anticipation. |
| Change `App.vue`, `AppShellRuntime.ts`, `RuntimeInjectionKeys.ts` | Compose/inject assistant and semantic UI dependencies, insert panel before sidebar, dispose controller with app. |
| Change `RuntimeSession.ts`, `RuntimeChangePublisher.ts`, command result contracts/producer and deletion/process seams | Expose read-only session/commit/history state and receipts, validate common mutations. Keep World private. Reuse existing changes/history subscriptions rather than add an event bus. |
| Change canvas controller/SvgCanvas and UI stores only at missing seams | Busy/cancel/manual edit lease, camera/viewport/panel actions; no fake pointer events. |
| Change project/autosave use cases | Typed outcomes, epoch notification, pending-save/project-switch coordination; extend existing transition/generation guards. |

Do not create an `AgentWorld`, generic remote command bus, universal transaction manager, tool-per-class hierarchy, second geometry registry or generic workflow engine. The catalog is a thin JSON boundary around existing ownership, not a parallel set of drawing implementations.

### Observations and schema

`observe` returns session epoch, drawing revision, UI revision, active plane, selected references, active subprocess, top history IDs, busy state, project/save binding and capability availability. Query tools support plane/type/ID filters, bounded pagination and `truncated`/cursor metadata. An observation cursor is invalidated by revision changes; absence from a partial page is not deletion. Detailed inspection includes numeric parameters/coordinates with units, realization feasibility, input dependencies, sibling/primary links, creating process nodes and supported operations with reasons.

Use `namespace: diedrico` and descriptive snake-case function names above. JSON schemas have closed objects, explicit enums and strict nullable optional fields compatible with provider schema restrictions. Every mutation carries observed `sessionEpoch` and `expectedDrawingRevision`; UI-sensitive actions also require the relevant UI revision. Controller binds account, conversation, turn and provider call ID itself; the model cannot choose these authorities. Validate schema again locally, finite coordinates/angles, positive radii, ID/plane ownership, role, lock status and domain feasibility.

Example proposed model arguments, with illustrative IDs (actual values come from observation):

```json
{
  "sessionEpoch": "drawing-session-7",
  "expectedDrawingRevision": 42,
  "planeId": "projPlaneH",
  "position": { "u": 12, "v": 8 }
}
```

`diedrico.create_point` converts this to the existing `point` intent using `new Vector3(u, v, 1)` and an application-generated description. Homogeneous `z=1` is not a third geometric coordinate. XYZ creation has a separate `{x,y,z}` schema and maps to `create3dpoint-by-coordinates`.

```json
{
  "sessionEpoch": "drawing-session-7",
  "expectedDrawingRevision": 43,
  "entityId": "projPlaneH/point2d12",
  "planeId": "projPlaneH",
  "position": { "u": 14, "v": 8 },
  "parameter": null,
  "style": { "color": "#336699", "visible": true }
}
```

`update_properties` maps to `CanvasToolController.updateElementProperties`, not separate move/style commands. The complete production schema enumerates nullable style fields and validates supported values; this abbreviated example shows intent, not an SDK-ready full schema.

Proposed success receipt:

```json
{
  "ok": true,
  "status": "applied",
  "sessionEpoch": "drawing-session-7",
  "beforeRevision": 43,
  "afterRevision": 44,
  "commandId": "command-observed-from-producer",
  "createdEntityIds": [],
  "updatedEntityIds": ["projPlaneH/point2d12"],
  "removedEntityIds": [],
  "processNodeIds": [],
  "undo": { "available": true, "requiresTopCommand": true },
  "persistence": { "destination": "google-drive", "state": "pending" }
}
```

Extend existing producer/use-case result contracts to return receipts from actual operation outputs, not timestamp/label guesses or whole-World diffing. In particular `ConstructionUseCases` currently discards successful producer details in favor of a message; preserve new receipt fields. Command IDs already exist in persisted command snapshots. A no-op returns `status:no_change`, no fabricated command. History transitions return the affected existing command and new top IDs.

```json
{
  "ok": false,
  "error": {
    "code": "AMBIGUOUS_TARGET",
    "message": "Two intersection branches are available; choose one.",
    "retry": "after_clarification",
    "candidates": [
      { "candidateId": "branch-0-at-revision-44", "planeId": "projPlaneH", "position": { "u": 2, "v": 4 } },
      { "candidateId": "branch-1-at-revision-44", "planeId": "projPlaneH", "position": { "u": 6, "v": 4 } }
    ]
  },
  "effects": "none"
}
```

Other error codes: `INVALID_ARGUMENT`, `NOT_FOUND`, `WRONG_PLANE`, `INELIGIBLE_TARGET`, `INFEASIBLE_CONSTRUCTION`, `STALE_STATE`, `INTERACTION_BUSY`, `CONSENT_REQUIRED`, `USER_GESTURE_REQUIRED`, `AUTH_REQUIRED`, `CAPABILITY_UNAVAILABLE`, `SESSION_CHANGED`, `EXECUTION_FAILED`, `EXTERNAL_OUTCOME_UNKNOWN`. Never infer machine codes by substring matching English domain errors; add structured codes at the owning use case where necessary. Distinguish rejected/no-effect from partial/unknown effects after a failure.

For intersection/tangent candidates, reuse the actual domain calculation/order, record input IDs and revision, then accept an exact candidate choice. Current intersection intent uses `selectionPoint`; extract its branch resolution into shared application logic and add an explicit-branch path used by both UI and semantic callers. Until that is ready, ambiguous branch tools are unavailable. A fabricated selection point is not a reliable semantic API. Tangent `tangentIndex` is already explicit; validate it against current candidates.

### Atomicity and extension rules

One logical mutating action normally produces one committed command, including its sibling/provenance operations. Combined properties and XYZ construction already illustrate this. For genuinely atomic multi-construction actions, extract reusable operation-building functions inside `ConstructionUseCases` and execute their bounded validated sequence with one producer command; use named outputs only inside that sequence. Do not repeatedly call current commit-producing methods and call that atomic. Defer a general batch tool until a concrete macro needs it.

Rollback is limited to operations and existing `Command` behavior. Test late-operation failure and rollback failure; if state cannot be confidently restored, stop further assistant mutations and surface the outcome. There is no atomic rollback across Drive/auth/browser downloads, project replacement and drawing commands. Do not expose arbitrary operation descriptors or eval. Every new geometric operation needs established validation, registered serialization/replay, undo/redo and process/dependency semantics before it becomes eligible for a tool.

## 6. Turn lifecycle, concurrency and history coherence

1. User sends text with visible context chips: active project/plane, selected entities, optional process node. Capture IDs plus epoch/revisions at send time; do not silently retarget “selected” when selection later changes. Full application query access remains available, without eagerly uploading the entire project or Drive file list.
2. Controller assembles developer instructions, complete capability schemas (namespaced for the plan-use route), current summary and conversation items. Treat labels, imported content and model text as data, never instructions that expand permissions.
3. Conditional supported provider adapter streams text/tool items. Render partial text but execute no partial JSON. Simplest first version waits for a successfully completed response containing complete validated calls before applying effects. A failed/incomplete response leaves its unexecuted calls unapplied.
4. Dispatch checks account/turn/epoch, revisions, busy state and consent immediately before execution. Execute drawing writes serially, without `await` between validation and local command commit. Read-only queries can share a snapshot. Even if provider emits parallel calls, serialize mutations; calls with stale revisions return stale-state rather than auto-rebase.
5. Record result/command receipt before sending output back. Return function outputs linked by call ID, preserving required provider output/reasoning items. Under documented plan-use HTTP constraints resend required history, `store:false`, `stream:true`; do not use `previous_response_id`, hosted MCP or `tool_search`.
6. Next model request includes current state/history corrections. Stop at final answer, user cancellation, budget cap, unrecoverable error or required user decision. Local call/turn limits are enforced in controller, not unsupported provider fields.

**Manual interactions:** do not hold the drawing locked while waiting on inference. User edits between calls are allowed and invalidate old revisions. Add a minimal shared interaction-busy contract: active drag preview, unfinished argument collection, modal properties draft, project transition. Assistant mutations return `INTERACTION_BUSY` until the user commits/cancels or explicitly hands control over. Do not secretly cancel a drag or steal a dialog. `RuntimeCommandProducer.startPreviewCommand` applies provisional operations to the live model; semantic drawing observations should wait or clearly return busy, not mistake previews for committed state. History buttons must obey the same preview boundary, not just assistant actions.

Maintain a monotonic committed drawing revision at the command/session owner (push/undo/redo/restore/reset), separate from preview/presentation notifications. Existing `RuntimeChangePublisher.getVersion()` is useful for refresh/autosave but not by itself proof of committed state. A small UI revision covers selection/plane/subprocess-sensitive context. Project epoch increments on new/open/import/sign-out/reset, even reopening the same file. `ProjectData.id` is regenerated by serialization and is not a suitable stable conversation binding. Use Drive file identity plus per-open epoch; unsaved drawings get an app-owned session ID.

**Cancellation:** Stop aborts streaming and refuses queued calls; it does not undo committed geometry or cancel an already accepted remote write. Show “Stopped; 2 drawing actions applied” with receipts. Collapse does not implicitly stop. If collapse while running is allowed, keep a header activity/Stop affordance.

**Retry/reconnect:** keep a small per-turn receipt map keyed by account/session/response/call ID and validated argument hash. Duplicate delivery returns the recorded result; same call ID with different arguments is rejected. If result upload fails after local commit, retry sending that result, not executing the tool. Do not automatically regenerate/replay a mutating turn after interruption. Reload loses in-memory certainty: restore conversation as interrupted, observe current drawing, ask before any new action. This is not an exactly-once guarantee across crashes or external providers.

**Undo:** assistant and user share the same stack. A chat “Undo this action” button is enabled only if its command is still the top eligible command; otherwise direct the user to normal chronological history. Never jump over subsequent user edits. Undo/redo and branch-discard events update action cards and context. Retain historical messages but label their effects undone/superseded. Editing a previous prompt starts a new turn from current drawing, not a hidden drawing rewind.

**Project/account switch and disposal:** invalidate controller generation, stop queued mutations, unsubscribe, abort provider fetch and drop pending confirmations. Existing project transition/autosave generation guards remain authoritative. Extend guards to any newly exposed async file listing/account completion that can finish after switch/disposal. A remote create/rename/save can still complete remotely; report that separately, do not install its result into a new session. Signing out Google currently clears the drawing, so it is not equivalent to signing out AI. Account switch starts a separate AI context and never sends prior-account conversation automatically.

## 7. UX and persistence

### Layout

Desktop main row: **[Assistant, proposed 360px] [existing 300px Elements + Process column] [drawing workspace]**. Insert `AssistantPanel` before `.left-sidebar` in `App.vue`; it is a sibling, not nested inside Elements or an external window. Give canvas `min-width:0`, observe its new dimensions and clamp floating Three window bounds. Opening/resizing must not change plane geometry, zoom or command history.

Proposed assistant width 360px, keyboard/pointer resizable 280–520px, further constrained by viewport. These are defaults for owner review, not user-set requirements. Collapse removes the assistant flex item and divider completely, reclaiming its width. A persistent labelled header button (“Open assistant”, `aria-expanded`, `aria-controls`) makes reopening obvious without reserving a blank chat rail. Retain draft, scroll position and conversation while collapsed.

For narrow viewports, preserve the left-to-right order rather than force an overlay in front of the existing sidebar: default collapsed; when explicitly opened, use a horizontally scrollable three-column workspace with a minimum usable canvas width and clear “Back to drawing”/collapse controls. Keep all columns reachable by keyboard. A mobile drawer would change the stated shifting layout; adopt it only with owner approval. Test responsive minimum widths instead of silently hiding Elements/process or shrinking drawing to zero.

### Conversation behavior

- Panel header shows current AI account/workspace, model, session and connection state separately from Google Drive status. Until provider approval: explicit unsupported/unconfigured state, not a nonfunctional sign-in promise.
- Composer supports multiline text, visible Send/Stop, draft retention; choose/document Enter versus Ctrl/Cmd+Enter behavior. Do not fire canvas shortcuts while editing chat or IME composition. Extend `KeyboardShortcutRouter` input exclusion and focus tests.
- Opening focuses composer only on deliberate activation; collapsing returns focus to opener. No desktop focus trap. Accessible separator supports arrow-key resizing and announces width; regions/transcript have labels; polite, throttled streaming announcements; tool errors have text not color alone. Escape dismisses local transient controls before touching canvas interaction.
- Action cards show proposed/running/applied/no-change/failed/blocked/undone state, actual entity links, affected cascade, command ID and save status. Click entity chips to inspect/highlight through UI actions. Plain assistant assertions never substitute for success receipts.
- Show offline, auth-expired, account usage limit, provider failure, interrupted stream and reconnection distinctly. Reauthenticate is user-initiated. Tool failure can be returned to the model; transport/auth failure stops calls until resolved.
- Context chips show the captured selection and plane. Users can remove optional context. Selection changes during work are shown as changed context, not silently substituted targets. Geometry queries are authoritative; screenshots are optional contextual additions, not the tool interface.

### Persistence scopes

Drawing remains `ProjectService` schema-8 command data; no chat text, OAuth material, assistant instructions or UI tool receipts embedded in operation descriptors. Keep chat in memory initially. Optional user-approved local transcript retention can use IndexedDB, separately keyed by AI account identity, drawing binding and conversation ID, with clear/export/delete controls and quota-failure behavior. Retain tool receipts and interrupted-state markers with transcripts if enabled; do not auto-run restored work. Local chat retention does not imply the drawing itself is locally saved.

Panel width/collapse are nonsecret UI preferences, consistent with existing app preference persistence. Model preference can be remembered by account after availability validation. Credential persistence is **not designed as IndexedDB/localStorage**; it remains a provider gate. With stateless plan-use inference, the controller owns context retention and must send needed history itself. Start with bounded recent complete turns plus current observation; if context becomes too large, ask to start a new conversation or explicitly summarize, preserving unresolved call/result pairs and current-state facts. No speculative recovery/compaction framework.

## 8. Trust boundaries and consent

- Model requests are untrusted JSON. Only allowlisted catalog handlers run. No arbitrary script, filesystem, browser navigation, fetch URL, raw command/descriptor or mutable domain reference is provided.
- Full semantic access is compatible with contextual consent. Proposed default: ordinary requested drawing edits execute visibly and undoably; destructive cascades show exact affected entities, project replacement warns of current save state, and remote create/rename/save/sign-out require clear user intent/confirmation. Final confirmation frequency is an owner decision, not an invented settled product policy.
- Confirmations bind to the exact request, target account/file, epoch and revision; any change invalidates them. The model cannot manufacture an approval flag. Browser OAuth/file dialogs require real user gestures; tool result can say `needs_user_action` rather than claim login/download completed.
- Drive autosave is an external consequence of normal drawing edits. Display the active remote destination; do not bypass autosave through a special assistant save pipeline. Undo is a new drawing state that can be autosaved, not remote version deletion.
- Sending dialogue/geometry to OpenAI is itself data transfer. Explain the scope in connection/onboarding UI; include only requested account/file metadata. Never send credentials to the model. Imported labels/content cannot authorize remote actions.
- Sanitize rendered Markdown, disable arbitrary raw HTML and unsafe links, avoid secret-bearing logs/analytics, and account for XSS/supply-chain risk in any approved browser auth design. An OAuth access token is an inference credential, not an application tool permission.

## 9. Sequenced implementation plan and verification

This is a plan, not authorization to implement. The connection gate is blocking a complete feature release.

### Phase 0 — establish the supported deployment contract

Owner/OpenAI answer section 2. Resolve whether ChatGPT-plan Responses with a Diedrico-owned tool loop is acceptable versus requiring the Codex runtime itself. Register only a legitimate approved client/callback if supported. Record official provider evidence and exact allowed browser origin. No fallback services or copied tokens. If support is unavailable, record blocked status and stop provider implementation; optionally approve independent semantic-interface work.

### Phase 1 — shared semantic foundation (can be separately approved)

Recheck HEAD, enumerate UI handlers and reconcile the capability table. Add observation DTOs, structured command/deletion/process/project results and session/commit revision tracking. Validate positions/IDs/planes, branches and eligibility in shared use cases. Add UI action seams only where currently missing. Replace existing UI callers with these improved paths where necessary, removing duplicated validation rather than creating assistant-only policy. Keep unavailable placeholder actions honest.

Tests: entity/representation distinction, sibling vs overlap, locked/free/dependent eligibility, wrong-plane inputs, finite coordinates/radius/angle constraints, explicit intersection branch selection, cascade preview/execution equality, all construction intent families mapped or deliberately unavailable. Test real use-case behavior, not merely catalog implementation details.

### Phase 2 — history and interaction safety (depends on phase 1)

Add busy/preview boundary shared with manual history actions, stale revision rejection and project epoch invalidation. Expose chronological undo receipts. Normalize async project/autosave outcomes, preserving existing guards. Add bounded receipt deduplication within the controller, not global distributed execution infrastructure.

Tests: move+style one command; guide with sibling one command; XYZ macro one command; late-operation failure leaves known state or reports failed rollback; undo/redo/replay reproduce sibling/process/dependency data; user edit between observation and call rejects mutation; drag preview cannot leak into assistant action or autosave snapshot unnoticed; project switch with late load/create/rename/save does not mutate new session; no repeated execution after lost response delivery.

### Phase 3 — integrated panel and complete local tool dispatch

Implement the panel layout and accessibility, injected controller, all supported semantic tool families, user-decision cards and transcript scope. Test with a deterministic in-process fake provider; label test mode and do not imply real Codex connectivity. No source/config hooks exposing arbitrary domain mutation.

Playwright: compare column bounding boxes before/open/collapse/reopen; width fully reclaimed; canvas/Three resizing correct; keyboard/IME not routed to drawing; selection chips stable; manual properties dialog blocks agent write; narrow-view all columns reachable; pending tools visible while collapsed; project/account switch clears pending approvals. Contract test the whole capability matrix against catalog including explicit unavailable entries.

### Phase 4 — official browser connection (depends on phase 0 and phase 3)

Implement only approved OAuth/session storage/renewal and streaming Responses contract. Discover models per account, enforce plan-route request restrictions, retain complete call/result history and handle usage limits. Provider transport tests use fixtures for fragmented streams, incomplete calls, failed terminal events, refresh races and cancellation; no credentials in automated tests or fixtures.

Owner-authorized browser acceptance must run from the production Pages origin with no service on localhost and no proxy. Verify registered callback, state/nonce/PKCE failure cases, token/discovery/model/inference CORS, SSE, renewal/revocation, expired/revoked sessions and sign-out. Network evidence must show only approved provider/Drive traffic and static assets. Scrub credentials from any evidence. Without this evidence, do not describe direct Codex login as supported.

### Phase 5 — complete acceptance, docs and release approval

End-to-end scenarios:

1. Sign in through the officially approved browser flow, ask for a free point and line, inspect numeric values/provenance, undo/redo, save/reload and inspect again.
2. Select overlapping input point and projected 3D form; assistant requests clarification, selects explicit target and cannot edit the overlay as a free point.
3. Construct guide/sibling and intersection branches; inspect relationships, cascade-delete with accurate preview, undo and replay.
4. Edit radius/angle and position/style; reject unsupported dependent/locked edits; inspect infeasibility rather than invent successful geometry.
5. Exercise active plane, selection, process stack/output/encapsulation/collapse, viewport and Three options/window, preferences and tool cancellation semantically.
6. Open/create/rename a Drive project, observe autosave, request sign-out with its drawing-clearing consequence. Test failure/unknown remote completion and project switching. File import/export remains explicitly unavailable unless separately implemented through shared UI/use cases.
7. Stop between actions, lose network after a command commits, reconnect, retry and switch projects; no duplicated drawing action or late mutation. Undo a manual edit after an assistant action and verify chronological coherence.

Run relevant unit/integration tests, `npm run validate:routine`, `npm run lint`, `npm run test:e2e` and `npm run validate:docs` when implemented, reporting actual failures separately from known baseline debt. Architectural tests should prohibit assistant/catalog imports of World mutation/operation construction and provider dependencies in domain/commands; permit application-owned observation access through explicit read composition.

Update README, `docs/architecture/overview.md`, commands/stores/domain docs (including stale ownership statements), API references for semantic DTOs, user guides for assistant/undo/privacy and contributing test/deployment docs. Register this proposal in docs navigation only when approved; do not call design text implemented behavior. No drawing schema bump for chat or transient layout. Any new persistent geometry operation must follow registry/schema compatibility policy explicitly.

## 10. Owner decisions

1. Can OpenAI authorize/support the exact static public SPA subscription-inference flow? This is the primary blocker, not an implementation detail.
2. Does an integrated Diedrico-owned loop using ChatGPT-plan Responses meet “Codex,” or is the actual Codex runtime required? The latter has no established browser-only deployment here.
3. Approve semantic interface/panel work while connection is blocked, or wait entirely?
4. Choose confirmation policy for cascades, project replacement and remote actions, accounting for current autosave and sign-out behavior.
5. Approve memory-only chat initially versus opt-in local retention; choose retention/export/account-switch semantics independently of drawing persistence.
6. Approve narrow-screen horizontal layout or explicitly permit a drawer variant; choose width/shortcut defaults.
7. Decide whether missing file import/export/local drawing persistence and placeholder construction menu entries are separate product work. They must not be silently implemented or silently advertised as working assistant tools.

Success is an integrated, collapsible dialogue with comprehensive **semantic** application access and honest provider support. A working panel, a PKCE example, or a successful CLI token exchange alone is not completion of that product.
