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
   bound to that exact name, so the name must exist before the ticket is minted.
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
- `https://salva.github.io` is **not** accepted by default.
- An `https://` page can open `ws://127.0.0.1:...`; loopback is exempt from mixed-content
  blocking.

## Allowing the published origin

The runtime accepts additional origins from the `cors` array of the service
configuration, which is also what `opencode serve --cors <origin>` sets. The published
build therefore needs that array to contain the Pages origin, and the service must be
restarted for the new policy to take effect:

```bash
# ~/.config/opencode/service.json gains a cors array; the password entry must be preserved
python3 - <<'PY'
import json, pathlib
p = pathlib.Path.home() / '.config/opencode/service.json'
data = json.loads(p.read_text())
data['cors'] = ['https://salva.github.io']
p.write_text(json.dumps(data, indent=2) + '\n')
PY

opencode service get cors   # read it back to confirm the file still parses
opencode service restart
```

`opencode service set cors …` does not work: `cors` is not a settable service key.

Widening this list admits **every page on that origin**, so it is a deliberate trust
decision, not a formality. Narrow it to a dedicated origin when the deployment moves.

## Verified results

2026-11-03, OpenCode 2.2.5, published build `f43dc84`:

| Scenario | Result |
| --- | --- |
| Local build (`http://127.0.0.1:5181`) attach and `hello` call | works |
| Published build (`https://salva.github.io/diedrico/`) attach | `403` before allowlisting |
| Same attach after adding `https://salva.github.io` to `cors` and restarting | `101`, MCP `2025-11-25`, tool registered as `diedrico_<suffix>.hello` |
| `hello` call from the session | `hello from https://salva.github.io/diedrico/ at <timestamp>` |
| Reusing a consumed ticket | `403` |

## Not covered

- Tool calls that change the drawing, selection, history or project state.
- Reconnection after an expired ticket, request cancellation and idempotence.
- Multiple simultaneous page instances and location isolation.
