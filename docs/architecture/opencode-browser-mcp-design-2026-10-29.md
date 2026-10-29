# Browser-hosted MCP for OpenCode — feasibility and design

Date: 2026-10-29. Status: **analysis and proposed implementation plan; not implemented or live-validated**.

## 1. Decision summary

Build an optional, user-enabled MCP server **inside the running Diedrico page**. The page opens an outbound WebSocket to the user's existing OpenCode V2 runtime. OpenCode acts as the MCP client and runs inference; Diedrico validates and executes tools through its application use cases and existing command history.

This is a credible implementation direction, backed by OpenCode's published API, implementation and tests. It is not yet a complete drop-in integration: secure bootstrap, allowed origins, actual installed-server compatibility and session isolation must be validated first.

Recommended order:

1. Prove the authenticated transport with an isolated, harmless diagnostic tool, two chats and two tabs.
2. Add a small transport-independent semantic application interface, structured observations and command receipts.
3. Deliver read-only inspection, then basic undoable drawing operations.
4. Expand to all implemented application capabilities, with explicit unavailable results for placeholders.
5. Automate connection UX only after proving an appropriately narrow OpenCode-side bootstrap mechanism.

No Diedrico backend, new listening process, provider credential sharing or duplicated geometry engine is necessary. **The existing OpenCode runtime is still required.** In a normal browser without a connection, Diedrico continues to work normally and has no AI agent.

This is an alternative to the earlier integrated assistant proposal (`docs/architecture/integrated-browser-ai-assistant-design-2026-10-28.md`, currently an untracked local document), not a claim to satisfy that proposal's stricter requirement for an independent browser-only assistant with its own dialogue. Here, conversation, model selection, inference billing and provider authentication belong to OpenCode. A Diedrico chat column is not required for this mode.

## 2. Evidence and confidence

### Inspection scope

- Diedrico source examined at `7f212a439c53270a9afc8a44cfb01807c061fc96` on `develop`.
- Existing assistant design was already untracked; it was read, not changed.
- Official OpenCode V2 docs and OpenAPI inspected on 2026-10-29.
- OpenCode implementation inspected at pinned public commit `726cf096396d5014c3b1845e231cc01efe0421ee`, then the repository's `dev` HEAD. Source-specific observations below apply to that commit, not every release.
- Local `opencode --version` returned `1.17.13`. This identifies the shell binary only, **not necessarily the desktop application's connected server**. Do not conclude that the current session lacks V2 capabilities from that number alone.
- No credentials inspected, no service started/reconfigured, no provider calls, no production drawing changes and no live MCP attachment performed.

### Official contracts

| Source | Established fact |
| --- | --- |
| [V2 HTTP API](https://opencode.ai/v2/docs/api/) and [OpenAPI](https://opencode.ai/v2/openapi.json) | Browser client-MCP ticket and WebSocket endpoints exist; explicitly experimental. |
| [Client guide](https://opencode.ai/v2/docs/build/client/) | Main client entrypoints are browser-compatible, but connect to an OpenCode runtime. |
| [MCP guide](https://opencode.ai/v2/docs/mcp-servers/) | Code Mode, permission actions and `ai.opencode/sessionID` call metadata; session ID is not standalone authentication. |
| [GUI plugin guide](https://opencode.ai/v2/docs/build/plugins/gui/) | Trusted plugins can run in Electron main and create embedded views. Public Browser contract opens pages, but does not document a page-facing MCP bootstrap API. |

### Source evidence

All links below are pinned to the inspected commit:

- [HTTP handlers](https://github.com/anomalyco/opencode/blob/726cf096396d5014c3b1845e231cc01efe0421ee/packages/server/src/handlers/mcp.ts): authenticated ticket issuance, origin checks, ticket consumption and socket-scoped attachment.
- [HTTP integration tests](https://github.com/anomalyco/opencode/blob/726cf096396d5014c3b1845e231cc01efe0421ee/packages/server/test/client-mcp.test.ts): real socket attachment, tool registration, caller metadata, ticket reuse rejection, name validation and same-name fallback.
- [Client helper](https://github.com/anomalyco/opencode/blob/726cf096396d5014c3b1845e231cc01efe0421ee/packages/client/src/mcp.ts): `connectClientMcp` is exported by `@opencode/client/mcp`; serves tools, forwards session ID and reconnects.
- [Socket transport](https://github.com/anomalyco/opencode/blob/726cf096396d5014c3b1845e231cc01efe0421ee/packages/core/src/mcp/socket-client.ts): inverted connection direction, one JSON-RPC message per frame, no batching or replay on reconnect.
- [Attachment tests](https://github.com/anomalyco/opencode/blob/726cf096396d5014c3b1845e231cc01efe0421ee/packages/core/test/mcp-attach.test.ts): Location-scoped registration, Code Mode, dynamic tool lists, hidden status entries and stacked connections.
- [TUI consumer](https://github.com/anomalyco/opencode/blob/726cf096396d5014c3b1845e231cc01efe0421ee/packages/tui/src/context/client-mcp.tsx): existing production-source example of a UI exposing MCP tools back to its runtime; comments explicitly identify Location scope.
- [Origin policy](https://github.com/anomalyco/opencode/blob/726cf096396d5014c3b1845e231cc01efe0421ee/packages/server/src/cors.ts), [authorization](https://github.com/anomalyco/opencode/blob/726cf096396d5014c3b1845e231cc01efe0421ee/packages/server/src/middleware/authorization.ts) and [tickets](https://github.com/anomalyco/opencode/blob/726cf096396d5014c3b1845e231cc01efe0421ee/packages/core/src/pty/ticket.ts).
- [Embedded Chromium](https://github.com/anomalyco/opencode/blob/726cf096396d5014c3b1845e231cc01efe0421ee/packages/gui-plugins/src/browser/chromium.ts) and [network setup](https://github.com/anomalyco/opencode/blob/726cf096396d5014c3b1845e231cc01efe0421ee/packages/gui-plugins/src/browser/network.ts): sandbox/context isolation/web security enabled; page network uses the connected server's network through a browser proxy.

Tests were inspected, not executed here. They prove an upstream intended/tested behavior, not this machine's readiness.

## 3. Architecture: a server without a listener

```text
User's OpenCode desktop session
  ├─ chat, model, provider authentication and agent loop
  └─ OpenCode runtime: MCP client / tool catalog / permissions
          ⇅ MCP JSON-RPC over an existing runtime endpoint
          ⇅ WebSocket opened outbound by the page
Diedrico page in an embedded browser tab
  ├─ optional connection/permission/status UI
  ├─ browser MCP transport adapter
  └─ validated semantic application interface
          ├─ JSON observation selectors
          ├─ construction / properties / process / selection use cases
          ├─ ordinary Command → operations → World + process tree
          └─ same CommandStack, undo/redo and autosave as manual editing
```

“MCP server” is a protocol role, not a requirement to bind a TCP port. The browser accepts MCP requests **over its outbound socket**. OpenCode sends `initialize`, then discovers tools and invokes them. This is not a remote HTTP MCP server hosted by GitHub Pages, and should not be configured as an ordinary remote MCP URL pointing at the static website.

The semantic interface should not know about OpenCode, WebSockets or the model provider. A future independent assistant can reuse it without adopting OpenCode's runtime, authentication or transport.

## 4. Exact transport contract and limitations

### Attach sequence

1. A trusted, already authenticated OpenCode-side component obtains the selected session's actual runtime endpoint and Location. Do not infer either from Diedrico's site URL or assume the runtime is on the desktop machine.
2. Generate a unique client name, for example `diedrico_<random-instance-suffix>`. Allowed characters are `[a-zA-Z0-9_-]+`.
3. Request `POST /api/experimental/client-mcp/token?name=...&location[directory]=...` using the runtime's existing authentication context and `x-opencode-ticket: 1`. The generated API's Location encoding is authoritative; do not invent additional workspace parameters.
4. Receive `{ location, data: { ticket, expires_in } }`. Current source defaults to 60 seconds. Treat `expires_in` as authoritative rather than hard-coding that duration.
5. Deliver a narrow connection grant to the approved page instance: runtime endpoint, returned canonical Location, client name, one-use ticket, intended calling session, binding generation and expiry. Bind that grant to an outstanding user-approved connection request.
6. The page opens the matching `ws:`/`wss:` endpoint with `name`, `location[directory]` and `ticket`. Standard browser WebSockets cannot set an Authorization header.
7. Answer MCP initialization and `tools/list`. Tools are usable only after initialization/catalog registration, not merely after WebSocket `open`.
8. Answer `tools/call` through local validation, authorization and shared use cases. Close the connection and revoke local authorization on disconnect/disposal.

The one-use ticket authorizes an attachment by **client name and Location**, not by a particular OpenCode chat, website path, drawing or tool set. Origin admission is a separate check. The page's local connection grant is not an extra server-enforced ticket restriction.

### Security and routing findings that change the design

| Finding | Required response |
| --- | --- |
| `security: []` appears in generated OpenAPI, but runtime authorization middleware still protects these routes. | Do not interpret the schema as permission for unauthenticated attachment. Verify with negative tests. |
| Ticket minting requires authentication, the special header and an accepted Origin. WebSocket upgrade also checks Origin. | A ticket does not bypass origin policy. Preserve those checks. |
| `https://salva.github.io` is not in the inspected default origin allowlist. | Deployment needs explicit narrow origin admission or a trusted host-mediated transport; merely opening Pages in the embedded browser is insufficient. |
| GitHub Pages origin is `https://salva.github.io`, not the `/diedrico/` path. | Origin admission covers other pages on that origin too. A connection grant must additionally validate the exact application path and tab/document generation. A separate dedicated origin is stronger isolation. |
| OpenCode session cookies are accepted only for same-origin requests in the inspected middleware. | A cross-origin Diedrico fetch cannot simply reuse OpenCode UI login cookies, even with `credentials: include`. |
| Client MCP attachment is Location-scoped. | Other sessions in the same Location can see tool names. Reject unauthorized callers in Diedrico, including read calls. |
| Same-name connections stack; closing the latest reactivates the previous one, potentially without a tool-change event. | Never use one shared `diedrico` name for all tabs. Give every instance its own name and revoke superseded generations. |
| Attached-only servers are hidden from ordinary configured-server status in inspected tests. | `/mcps` or `GET /api/mcp` alone is not a reliable health check. Prove a real discovery/call and show state in Diedrico. |
| Embedded pages are sandboxed and do not automatically receive OpenCode credentials. | No assumed `window.opencode` bridge, Electron APIs or automatic page registration. |
| Browser localhost traffic resolves through the connected runtime's network. | Do not confuse desktop loopback, remote-server loopback and Diedrico's host. Test the actual network path. |

### The existing helper is useful, but not sufficient unchanged

`@opencode/client/mcp` is small and browser-oriented. Its handlers receive plain arguments and optional `ctx.sessionID`, and return text/image content plus optional `isError`.

Important limitations at the inspected commit:

- Input schemas are advertised but **not validated** by the helper.
- Handlers can execute concurrently; there is no drawing-write queue.
- Handler context does not expose JSON-RPC request ID, cancellation signal or connection state.
- No resources/prompts/output-schema/structured-content registration is exposed by this helper.
- It reconnects using the original URL, including the same ticket. A consumed single-use ticket cannot authorize that reconnect.
- It catches thrown errors into model-visible text; uncensored application exceptions must not reach it.

For a throwaway transport spike, wrap this helper with explicit disposal and reconnect using a newly issued ticket. For production, prefer a supported MCP server SDK with a small browser WebSocket transport adapter if its browser build and version negotiation are verified. Alternatively contribute a narrow helper extension upstream for fresh-ticket acquisition, lifecycle callbacks and cancellation. Do not ship a partial handwritten JSON-RPC framework or depend on private OpenCode internals throughout the application.

Use the classic MCP handshake supported by this endpoint; support for a configurable remote-server protocol version elsewhere in OpenCode is not evidence that this endpoint supports every newer MCP revision.

## 5. Bootstrap choices: the actual feasibility gate

### A. Explicit ticket bootstrap into the existing browser tab — first proof

Keep provider/server passwords outside Diedrico. An authenticated host component creates a one-use grant; the user explicitly connects the approved page. For an isolated diagnostic test, an operator can transfer a short-lived grant through a dedicated connection UI without retaining it. Do not place it in a chat transcript, persistent setting, analytics event or drawing file.

This proves native client MCP without adding a Diedrico backend. It still needs accepted page Origin and a browser-permitted route to the runtime. It is not yet the polished permanent onboarding UX.

Prefer a structured host-to-page channel for a product connection. Validate exact origin, top-level frame, URL path, tab/document generation and connection-request nonce. If using `postMessage`, validate `event.origin` and `event.source`, not merely a payload claiming to be OpenCode. A message from the page itself is not authenticated host authorization. Do not expose a generic fetch/IPC/eval bridge.

Do not put long-lived credentials in a URL. Even the short-lived WebSocket ticket URL must be redacted from network logs and reports. Avoid launch-query/fragment grants: they are visible to page scripts and can persist in browser history or diagnostics. An initial proof does not justify distributing a reusable OpenCode password.

### B. Trusted OpenCode GUI plugin — candidate for normal UX

An optional plugin could offer “Connect Diedrico to this session”, obtain the intended session and Location, ask the user for consent, issue scoped connection tickets and renew grants after reconnect.

However, the documented public `Browser` GUI contract currently provides `attached`, `canOpen`, `open` and `openFile`; it does **not** provide a documented bootstrap/injection API for an arbitrary existing browser tab. Do not promise this plugin is just a few calls to an existing public bridge.

Investigate, in order:

1. A supported OpenCode browser capability to deliver an origin/tab-bound grant, ideally upstream rather than private native hooks.
2. A plugin-owned embedded `WebContentsView` using the documented native embedding API and a minimal origin-checked preload/message channel. This is a custom embedded panel, not automatically the existing generic Browser tab. Its remote-network behavior, Google login behavior and lifecycle need independent tests.
3. A supported, authenticated host pairing flow restricted to client MCP. The documented general `/api/pair` flow is not a substitute: it produces a broadly usable server session, not a client-MCP-only page credential.

A native host can instead carry the transport while Diedrico hosts the handlers over a narrow message channel. This avoids page-origin/loopback networking problems but is an **in-process host bridge**, not the direct page-to-runtime WebSocket design. It requires separate approval if a literal no-bridge constraint is retained.

Do not weaken Chromium `webSecurity`, disable CORS, remove authentication, expose the runtime publicly without protection, or grant every origin access to solve bootstrap. Explicitly admitting one trusted origin through OpenCode's supported policy is different from disabling origin checks, but still broadens the trust boundary and needs operator approval.

### Network release gate

Test the actual Pages HTTPS origin against the actual runtime, including WebSocket Origin rejection, TLS, private-network/local-network permission rules, CSP and remote/SSH configurations. An HTTPS page-to-plain-loopback WebSocket may be restricted; command-line success does not prove browser success. Use supported secure transport or the explicitly approved host-mediated alternative rather than browser-security flags.

**Conclusion:** the native protocol mechanism is established; automatic secure attachment from an arbitrary embedded page remains a bounded engineering/compatibility task, not a documented ready-made feature.

## 6. Diedrico seams to reuse, and gaps to close

All source paths below are under `frontend/src/`.

| Existing owner | Reuse | Necessary change |
| --- | --- | --- |
| `application/appShell/AppShellRuntime.ts` | Composition, command/history/selection/read ports, lifecycle and project state | Compose optional semantic access and MCP connection; dispose even during pending connection. |
| `application/appShell/RuntimeSession.ts` | Owns World, CommandStack, producers, read models, active plane, restore/reset | Add JSON observation boundary, per-open epoch, committed revision, history identity and preview/busy state. Keep World private. |
| `tools/ToolCommandIntents.ts` | 19 implemented construction intent variants plus properties/style/movement | Convert validated JSON to existing typed intents; don't export Three.js vectors or English success strings as the API. |
| `application/tools/CanvasToolController.ts` | Construction dispatch and combined position/parameter/style updates | Preserve one logical command; expose typed receipt and errors. |
| `application/construction/ConstructionUseCases.ts` | Construction validation, sequence factories, siblings and provenance | Preserve created IDs/results; explicit branch selection for intersection instead of guessing a mouse position. |
| `application/commandProduction/RuntimeCommandProducer.ts` | Commit/push and preview/rollback | Return command ID and operation-derived effects; currently mostly returns `{success,message}`. |
| `commands/Command.ts`, `commands/CommandStack.ts` | Existing IDs, operation results, chronological undo/redo/replay | Expose top undo/redo IDs and committed changes without serializing all internal operation objects to the agent. |
| `application/appShell/RuntimeChangePublisher.ts` | Presentation invalidation | Its version increments per operation, rollback and preview, not just committed commands. Do not call it the document revision. |
| `application/appShell/SelectionUseCases.ts` | Selection actions | Existing single/add methods accept IDs without membership validation. Add a shared validated explicit-set path. |
| `application/selectionDeletion/SelectionDeletionCommandService.ts` | Cascading deletion with process/dependency semantics | Structured preview/result and rollback handling; currently void and does not locally catch command-build failure. |
| `application/processHistory/ProcessHistoryIntents.ts` | Push/pop, rename, output and encapsulation | Typed receipts and desired-state setters rather than unsafe repeatable toggles. |
| Canvas/Three presentation selectors and app-shell read models | Entity/representation/source/plane relationships | JSON-safe structured observations and explicit render-only eligibility. |
| Project/autosave use cases | Existing Drive transitions and save policy | Only expose later through explicit consent and typed asynchronous outcomes. |

`RuntimeSession.setActivePlaneId` accepts an arbitrary string and later `ensureActivePlane` falls back. A semantic request must validate and return the actual plane, not report success selecting an invalid ID.

`App.vue` has a DEV-only `window.__diedricoRuntime` hook. It is not the production automation contract. Do not expose `runtime.internals`, mutable domain classes, raw command descriptors or a model-callable `eval`.

## 7. Minimal new components and ownership

Proposed paths; these are not existing files:

```text
frontend/src/application/automation/
  AutomationContracts.ts          JSON DTOs, errors, receipts and capability metadata
  AutomationController.ts         authorization, revisions, busy gates, serial execution
  AutomationToolCatalog.ts        explicit schemas and handlers, no tool-per-class framework
frontend/src/application/appShell/readModels/
  ApplicationObservation.ts       shared JSON read model
frontend/src/infrastructure/mcp/
  BrowserMcpConnection.ts         handshake, ticket lifecycle, socket/SDK adapter
frontend/src/components/panels/
  AgentConnectionPanel.vue        consent, read-only/edit status, approvals, action log, Disconnect
```

The application layer accepts a verified calling context from the transport and enforces its grant; it does not parse socket URLs. The transport never implements geometric constructions. A small capability table records name/schema/effect/availability and maps directly to existing use cases. Avoid an AgentWorld, a second command stack, generic RPC bus, universal transaction engine, speculative multi-provider infrastructure or a tool class hierarchy.

Initially lazy-load the MCP adapter only when the user opens Connect. Do not open sockets or perform OpenCode discovery during normal Diedrico startup. Test the bundled entrypoint for Node built-ins and transitive browser incompatibilities before choosing an SDK dependency.

The panel is connection/control UI, not a second conversation history. Show session binding, page instance, current drawing, permissions, initialization state, pending approvals, recent receipts and a persistent disconnect control. Disconnection must be reachable without asking the model.

## 8. Semantic tool surface

Use descriptive tools, not pointer coordinates or a single untyped `execute(action:any)`. Tool names below are proposed. OpenCode adds the unique MCP client prefix; Code Mode discovers the effective namespace. Do not hard-code `tools.diedrico` when instances use unique names.

| Group | Proposed tools | Policy |
| --- | --- | --- |
| Discovery | `get_state`, `list_capabilities` | Small authoritative summary; protocol/app version and availability. |
| Drawing queries | `list_entities`, `inspect_entities`, `inspect_representations`, `get_relations`, `get_process_tree` | Bounded DTOs; plane/type filters; no raw project/Drive account dump. |
| Disambiguation | `find_candidates`, `preview_highlight`, `construction_candidates` | Plane/source/role/eligibility; use actual calculation/hit-test conventions. |
| Basic construction | `create_point`, `create_line`, `create_segment`, `create_circle` | Existing point/line/segment/circle and radius-vector intents; explicit definition mode. |
| Constrained construction | `create_parallel_line`, `create_perpendicular_line`, `create_angle_line`, `create_guide`, `create_intersection`, `create_tangent` | Existing geometric validation and sibling creation; explicit branches. |
| 3D and planes | `reconstruct_3d`, `create_3d_point_xyz`, `create_projection_plane` | Closed definition unions; use normal reconstruction/macro commands, not bare World constructors. |
| Edits/history | `update_properties`, `preview_delete`, `delete_entities`, `history_state`, `undo`, `redo` | Shared undo stack, deletion approval and expected top-command guard. |
| Transient UI | `set_selection`, `set_active_plane`, `fit_view`, `set_view`, `cancel_interaction` | Validated explicit values; never silently cancel the user's active interaction. |
| Process | `process_edit` | Closed action union, explicit node IDs, output/encapsulation distinct from UI tree collapse. |
| External/project effects | Eventually `project_open`, `project_create`, `project_rename`, `project_save` | Separate explicit consent, user gestures where needed; defer from first release. |

Every actual UI capability should eventually have either a semantic path or an honest unavailable/needs-user-action result. Do not expose unimplemented Transport/quick-construction menu entries as working tools. Domain class existence does not mean a supported application action exists. The earlier assistant proposal contains the broader capability inventory; re-audit it before delivery.

### Identity and overlapping representations

Keep separate:

- `entityId`: one domain definition, scoped to a drawing epoch.
- `representationId`: one visible form, with source entity, projection plane and presentation role.
- sibling/primary and projection/reconstruction links: explicit construction relationships.
- geometric coincidence: a spatial observation, not identity or dependency.

Return `kind` values such as `free-point`, `intersection-point`, `sibling-intersection-point`, `finite-segment`, `infinite-line`, `guide`, `sibling-guide`, `projection-plane`, `geometric-3d-plane`, and explicit realization/eligibility states. Do not flatten segment semantics into Line merely because of inheritance.

For “use that point”, report candidates with IDs, plane, label, role, source, sibling/dependency relationships, position and selectable/editable status. A projected 3D overlay may be visible but intentionally absent from selectable `CanvasQueryItem`s. It cannot masquerade as a plane-backed construction argument. Labels are search hints, never primary keys. Do not parse presentation-ID strings to recover ownership.

Coordinates must identify their space: 2D plane units `{u,v}`, 3D `{x,y,z}`, paper coordinates or viewport CSS pixels. Normal semantic construction uses plane coordinates, not screenshot pixels. Convert to homogeneous `Vector3(u,v,1)` at the application adapter; `1` is not physical z. Angles use documented degrees at the JSON boundary with one radians conversion. Reuse domain branch calculations and tolerances, not model-computed approximate final coordinates.

For multi-solution intersections, return revision-bound candidate IDs then require an exact candidate choice. Extract explicit branch selection into shared construction logic. Do not synthesize a mouse `selectionPoint` to hope the desired branch wins. Current tangent indices already exist but still need eligibility/range validation against candidates.

### Example tool argument and receipt

Illustrative contract, not an implemented SDK call:

```json
{
  "bindingId": "binding-issued-by-the-page",
  "sessionEpoch": "drawing-open-7",
  "expectedDrawingRevision": 42,
  "operationId": "unique-logical-request-id",
  "planeId": "projPlaneH",
  "position": { "u": 12, "v": 8 }
}
```

The OpenCode caller comes from transport metadata, **not** an argument such as `sessionID` selected by the model. A visible binding ID is correlation/staleness protection, not a secret credential.

```json
{
  "ok": true,
  "status": "applied",
  "instanceId": "page-instance-uuid",
  "sessionEpoch": "drawing-open-7",
  "beforeRevision": 42,
  "afterRevision": 43,
  "operationId": "unique-logical-request-id",
  "commandId": "actual-command-id",
  "createdEntityIds": ["actual-created-point-id"],
  "updatedEntityIds": [],
  "removedEntityIds": [],
  "processNodeIds": ["actual-created-process-action-id"],
  "persistence": { "destination": "google-drive", "state": "pending" }
}
```

Return receipts from actual operation outputs, including automatic sibling outputs. No label scans, arbitrary sleeps, “last entity” heuristics or whole-World before/after diffs. `no_change` returns no fabricated command. With the current helper, encode DTOs as JSON inside an MCP text content item; do not claim its API supports `structuredContent`. A richer SDK can add supported output schemas later.

## 9. Permissions, isolation and data transfer

### Two permission boundaries

1. OpenCode's tool permissions decide whether its agent may invoke a named tool.
2. Diedrico's local grant decides whether this caller may inspect or change this particular drawing.

Neither replaces the other. MCP tool annotations, tool descriptions and a prompt saying “be careful” are not enforcement. Keep a visible read-only default; let the user enable ordinary undoable drawing edits. Destructive cascades and external/project transitions need narrower approvals. Final confirmation frequency is a product choice, but it must be implemented outside model-controlled arguments.

Bind the connection to runtime identity, intended OpenCode session, unique page instance, connection generation, per-open drawing epoch, capability grants and expiry/revocation state. Within the authenticated trusted runtime channel, compare `params._meta["ai.opencode/sessionID"]` to the approved caller. Missing, changed or unknown caller: fail closed. This is an additional local restriction, not proof of independent identity; do not accept session metadata over an untrusted channel as authentication.

Child sessions are different IDs. Default deny; explicit approval or a host-verified delegation policy can allow them later. Do not automatically trust a caller-provided parent ID or authorize the first caller seen. Multiple sessions in the same Location may discover the tool schemas, but unauthorized calls must reveal no geometry, labels, file metadata or detailed error information.

User switching between OpenCode chat tabs does not itself transfer Diedrico control. Multiple Diedrico tabs are separate instances with unique names; the agent must observe and use the intended instance. Never route by the currently focused browser tab or global active project.

Read-only MCP still sends construction data to OpenCode and potentially its chosen model provider. Explain that before connection. Query only requested subsets, return truncation and revision-bound cursors, and treat labels/project text as data rather than instructions. No Drive OAuth tokens, OpenCode passwords, provider keys or auth-profile access tools.

This controls the Diedrico semantic interface, not every capability of a trusted desktop agent. An agent separately permitted to evaluate arbitrary page JavaScript, inspect memory or operate the full UI has broader access. Do not advertise MCP read-only mode as a sandbox against those independently granted browser privileges. A restricted assistant profile should limit those alternative mutation routes if that guarantee is desired.

## 10. History, concurrency, cancellation and reconnect

### Revision and busy-state rules

- Maintain a monotonically increasing **committed drawing revision** for successful command push, undo, redo and restoration, independently of presentation/preview changes. Restore/reset also changes the drawing epoch.
- A minimal UI revision covers active plane, selection and active subprocess where commands depend on them. Prefer explicit plane/entity/subprocess arguments over implicit ambient state.
- Track active drag previews, unfinished tool collection, properties drafts and project transitions. Return `INTERACTION_BUSY`, not inconsistent reads of provisional World state.
- Queue writes and validate caller/grant/epoch/revision/busy state immediately before execution. Do not `await` between that validation and a synchronous local command commit. Recheck after any asynchronous approval.
- Parallel mutation requests with the same revision must not both apply: first commits, second gets `STALE_STATE`. The agent observes again and decides; no silent rebasing.
- Do not hold the document locked while the model is thinking. Manual editing remains usable and invalidates stale requests.

Important errors include `INVALID_ARGUMENT`, `NOT_FOUND`, `WRONG_PLANE`, `INELIGIBLE_TARGET`, `AMBIGUOUS_TARGET`, `INFEASIBLE_CONSTRUCTION`, `STALE_STATE`, `INTERACTION_BUSY`, `CALLER_NOT_AUTHORIZED`, `SESSION_CHANGED`, `CONSENT_REQUIRED`, `CAPABILITY_UNAVAILABLE`, `EXECUTION_FAILED` and `OUTCOME_UNKNOWN`. Rejections state `effects:none`; failure after an uncertain commit/rollback must not claim that guarantee. Do not derive codes by parsing English error messages.

### Undo and atomicity

One logical construction is one command, including its siblings and process actions. Position + style + parameter changes share the existing combined properties command. MCP is not another persistence authority.

Undo/redo is chronological across manual and agent edits. Require expected drawing revision and expected top command ID; never skip newer user edits to undo an older agent action. OpenCode conversation rewind does not automatically rewind Diedrico. After session fork, transcript compaction or interrupted work, inspect the live drawing again.

Do not advertise a whole multi-call construction as atomic. Initially defer generic batches. A future atomic macro must compose operation-building paths inside one existing command, not call already-committing use cases repeatedly. No cross-Drive/browser/auth transaction is possible. Test late-operation and rollback failure; disable further remote writes if drawing consistency is uncertain.

### Cancellation and late calls

Closing a socket or pressing OpenCode Stop does not undo a committed command. The inspected helper has no cancellation signal and can finish an asynchronous handler after close. Therefore connection generation, cancellation checks and pending-approval invalidation must be enforced locally. Queued/awaiting work is discarded on disconnect; already committed actions retain receipts.

A proper SDK adapter should propagate MCP cancellation to cancellable work, but a local Disconnect button must work even when the host does not send cancellation. External effects already accepted by Drive may still complete and must be reported honestly.

### Idempotence and recovery

Require a logical `operationId` for mutations. Maintain a bounded in-memory receipt ledger keyed by binding/drawing epoch/operation ID and canonical argument hash. Identical repeated requests return the recorded historical receipt; changed arguments with the same ID are rejected. Include current-state/revision information so an undone historical action is not represented as currently applied.

Check authorization before looking up receipts. Deduplication does not authorize another session. A JSON-RPC ID alone is insufficient across reconnect; the helper does not even expose it. After cache eviction or page reload, monotonic revision/epoch checks reject old preconditions, and the agent must reconcile rather than assume exactly-once execution.

If a connection fails after commit but before the result arrives, **do not replay the action automatically**. Reconnect with a fresh ticket, observe current epoch/revision and query the receipt if still available. No exactly-once guarantee across browser crash is claimed.

Reconnect requires fresh scoped authorization, not the consumed URL. Close old sockets, revoke old local generations, use bounded backoff and return to read-only/disconnected on authentication/origin failure. No polling scan of localhost ports. On reload, project switch, sign-out, runtime change or user Disconnect, stop pending calls and invalidate the old drawing grant; project switching must not silently authorize the replacement drawing. Old bound queued calls fail even if IDs are reused.

## 11. Implementation and validation plan

### Gate 0 — compatibility and harmless end-to-end transport

Use the **actual desktop-connected runtime**, not whichever CLI is first in PATH. Read its version and OpenAPI through supported authenticated access; check both endpoints and package export. Do not start or restart services merely to probe them.

In a diagnostic page, expose only `get_connection_info`, returning nonsecret instance ID, protocol version and authorized calling-session match. No drawing/Drive access. Obtain an explicit user grant and one-use ticket through the approved bootstrap path. Verify discovery and a real OpenCode call, not just `101 Switching Protocols`.

Required tests: missing auth; missing header; wrong/expired/reused ticket; wrong name/Location; unauthorized Origin; malformed JSON/unsupported methods; tab close; reconnect with fresh ticket; two tabs; two chats in one Location; another Location; absent caller metadata; child session; host restart; remote-network path. Record actual app/server versions and CORS/security setup, never credentials. Stop if safe Pages connectivity/bootstrap cannot be established.

### Phase 1 — shared semantic read interface

Add JSON observations, identity/relations, eligibility, query bounds, epoch/revision tracking and a connection-independent controller. Implement read-only tools and a local permission/status panel. No global mutable debug runtime export.

Tests: planes/entities/siblings/projections/dependencies; hidden/infeasible definitions; overlapping unrelated objects; projected render-only items; deterministic representation IDs; cyclic dependency-safe bounded output; pagination invalidation; preview busy state; unknown IDs; unauthorized reads; no sensitive metadata in errors/logs.

### Phase 2 — basic undoable writes

Extend existing producer/use-case results to carry true receipts. Add points, lines, segments, circles, property edits, explicit selection/active plane and guarded undo/redo. Update ordinary UI callers where shared validation changes are needed; do not create agent-only copies of existing geometry logic.

Tests: invalid numbers/radii; locked/dependent point edits; wrong-plane references; stale revision; two parallel writes; user edit between calls; one logical action/one command; lost result; duplicate operation ID; undo after user edits; undo then retry; failed rollback; restore/epoch invalidation. Verify persistence replay produces the same geometry and process relationships.

### Phase 3 — complete construction and process coverage

Add explicit intersection/tangent candidates, guides/siblings, 3D reconstruction/XYZ macro, auxiliary planes, process operations, deletion preview/approval and view actions. Record deliberate unavailable capabilities. Maintain an exhaustive construction-intent/catalog coverage test.

Tests: both intersection branches and tangencies; infeasible cases; primary/sibling edits and cascading deletion; 3D projections distinct from source objects; process encapsulation/output behavior; finite segment semantics; actual affected IDs and one-command sibling construction; original manual workflows unchanged.

### Phase 4 — connection polish and external effects

Implement only the proven secure host bootstrap/renewal path, with explicit instance/session selection and origin/path/document binding. Keep optional OpenCode plugin packaging separate from static Diedrico. Add project/Drive operations only with narrow consent, user-gesture support and observable asynchronous outcomes. No Drive login performed automatically by the agent.

E2E: published-like HTTPS/base-path deployment in the real embedded browser; read-only connect; enable edits; create geometry; inspect relationships; manually edit; reject stale call; guarded undo/redo; open another tab/chat; deny unauthorized reads/writes; disconnect during approval; reconnect after lost result without duplicate creation; reload/project switch invalidates prior authority; normal standalone browser remains fully usable. Test Google login in the embedded browser separately if needed; MCP connectivity does not establish identity-provider acceptance of an embedded user agent.

For implementation, run focused tests plus `npm run validate:routine`, `npm run lint`, relevant `npm run test:e2e` scenarios and `npm run validate:docs`. A documentation-only build does not validate transport, runtime behavior or authentication.

## 12. Final recommendation and explicit nonclaims

Proceed with **Gate 0 first**, then a shared semantic application interface. Prefer the native outbound client-MCP connection over inventing a new Diedrico bridge service. Treat the optional OpenCode plugin as UX integration, not proof that secure page bootstrap already exists.

The highest-risk items are not geometry or MCP JSON formatting: they are cross-origin authenticated bootstrap, Location-versus-chat scope, same-name fallback, stale manual/agent state and ambiguous outcomes after disconnect. The design above addresses them without replacing Diedrico's command model.

Not established by this analysis: compatibility of the currently running desktop server, authenticated Pages-origin connectivity, a public browser bootstrap bridge, live tool discovery, cancellation propagation in that installed version, or a completed Diedrico construction through MCP. No application feature was implemented, deployed or enabled.
