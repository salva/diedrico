# OpenCode MCP bridge (validation)

The Diedrico page can act as an MCP server for a running OpenCode session. The page
opens an outbound WebSocket to the OpenCode runtime, answers `initialize`,
`tools/list` and `tools/call`, and exposes a single harmless tool:

| Tool | Arguments | Returns |
| --- | --- | --- |
| `hello` | none | `hello from <page url> at <timestamp>` |

The reply can only come from the page that holds the socket, so a successful call
proves the whole round trip: page → runtime → model → tool call → page → model.

This is a **validation bridge**, not the semantic application interface described in
[the browser-hosted MCP design](./opencode-browser-mcp-design-2026-10-29.md). It does
not read or modify the drawing.

## Ownership

| Path | Responsibility |
| --- | --- |
| `frontend/src/application/mcp/McpToolCatalog.ts` | Protocol-agnostic tool contract and the `hello` catalog. |
| `frontend/src/infrastructure/mcp/BrowserMcpConnection.ts` | Socket URL construction, JSON-RPC frames, attachment lifecycle. |
| `frontend/src/components/panels/McpConnectionPanel.vue` | Operator UI: runtime endpoint, location, ticket, status and recent calls. |

The transport only answers protocol frames; it owns no geometry and no application
state. There is no backend, no listening port and no persisted credential.

## Connecting

1. Start Diedrico (`npm run dev`, or the published build) and open the **OpenCode MCP**
   panel in the left sidebar.
2. Note the client name the panel shows, for example `diedrico_a1b2c3`. The ticket is
   bound to that exact name.
3. Mint a single-use ticket from a terminal that already has OpenCode credentials:

   ```bash
   opencode api post "/api/experimental/client-mcp/token?name=diedrico_a1b2c3&location%5Bdirectory%5D=$PWD" \
     --header 'x-opencode-ticket:1'
   ```

4. Paste the returned `ticket` into the panel, fill the runtime endpoint
   (`http://127.0.0.1:49374` by default) and the location (the session's directory,
   which must match the ticket), and press **Connect**.
5. The tool appears in the session tool catalog as `<client name>.hello`.

## Runtime facts this bridge depends on

Verified against OpenCode 2.2.5:

- `POST /api/experimental/client-mcp/token` issues a ticket valid for 60 seconds.
- The ticket authorizes exactly one attachment and is bound to **client name and
  location**; reusing it, or using another name, returns `403`.
- The WebSocket upgrade accepts these origins only: `http://localhost:*`,
  `http://127.0.0.1:*`, `oc://renderer*`, Tauri origins, `https://*.opencode.ai`, plus
  anything listed in `server.cors`.
- `https://salva.github.io` is **not** accepted by default. Allowing it requires adding
  that origin to the runtime service configuration and restarting the service, which
  widens the trust boundary to every page on that origin.
- An `https://` page can open `ws://127.0.0.1:...`; loopback is exempt from mixed-content
  blocking.

## Not covered

- Tool calls that change the drawing, selection, history or project state.
- Reconnection after an expired ticket, request cancellation and idempotence.
- Multiple simultaneous page instances and location isolation.
