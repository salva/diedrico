/**
 * Client MCP transport: the page opens the WebSocket, so there is no listening port
 * and no backend. OpenCode is the MCP client; this page answers the JSON-RPC frames.
 *
 * Scope is deliberately narrow: one socket, one tool catalog, no persistence and no
 * credentials. The single-use ticket lives only in memory.
 */

import type { McpToolCatalog, McpToolResult } from '@/application/mcp/McpToolCatalog';

export type McpConnectionState = 'idle' | 'connecting' | 'open' | 'closed' | 'error';

export interface McpConnectionCall {
  tool: string;
  ok: boolean;
}

export interface McpConnectionSnapshot {
  state: McpConnectionState;
  detail: string;
  protocolVersion: string | null;
  callCount: number;
  recentCalls: readonly McpConnectionCall[];
}

export interface McpConnectionInput {
  /** Runtime HTTP endpoint, for example `http://127.0.0.1:49374`. */
  endpoint: string;
  clientName: string;
  /** Location directory expected to match the calling session. */
  directory: string;
  /** Single-use ticket issued by the runtime. Kept in memory only. */
  ticket: string;
}

export interface McpConnectionPort {
  connect(input: McpConnectionInput): void;
  disconnect(): void;
  snapshot(): McpConnectionSnapshot;
  subscribe(listener: () => void): () => void;
}

export interface BrowserMcpSocketHandlers {
  onOpen(): void;
  onMessage(data: string): void;
  onClose(code: number): void;
  onError(): void;
}

export interface BrowserMcpSocket {
  send(data: string): void;
  close(): void;
}

export interface BrowserMcpConnectionOptions {
  catalog: McpToolCatalog;
  /** Test seam; defaults to the platform WebSocket. */
  openSocket?: (url: string, handlers: BrowserMcpSocketHandlers) => BrowserMcpSocket;
}

interface JsonRpcFrame {
  jsonrpc?: string;
  id?: number | string | null;
  method?: string;
  params?: Record<string, unknown>;
}

const CLIENT_MCP_PATH = '/api/experimental/client-mcp';
const MAX_RECENT_CALLS = 5;

const openPlatformSocket = (url: string, handlers: BrowserMcpSocketHandlers): BrowserMcpSocket => {
  const socket = new WebSocket(url);
  socket.addEventListener('open', () => handlers.onOpen());
  socket.addEventListener('message', event => {
    handlers.onMessage(typeof event.data === 'string' ? event.data : '');
  });
  socket.addEventListener('close', event => handlers.onClose(event.code));
  socket.addEventListener('error', () => handlers.onError());
  return {
    send: data => socket.send(data),
    close: () => socket.close(1000, 'client disconnect'),
  };
};

/** Builds the `ws(s)://…/api/experimental/client-mcp` URL for one attachment. */
export function buildClientMcpSocketUrl(input: McpConnectionInput): string {
  const endpoint = new URL(input.endpoint.trim());
  const protocol = endpoint.protocol === 'https:' ? 'wss:' : 'ws:';
  const path = endpoint.pathname === '/' ? CLIENT_MCP_PATH : endpoint.pathname.replace(/\/$/, '');
  const query = new URLSearchParams({
    name: input.clientName,
    'location[directory]': input.directory,
    ticket: input.ticket,
  });
  return `${protocol}//${endpoint.host}${path}?${query.toString()}`;
}

/** Answers one JSON-RPC frame. Returns the serialized response, or null for notifications. */
export function answerClientMcpFrame(catalog: McpToolCatalog, frame: JsonRpcFrame): string | null {
  const id = frame.id ?? null;
  const respond = (payload: Record<string, unknown>) => JSON.stringify({ jsonrpc: '2.0', id, ...payload });
  const fail = (code: number, message: string) =>
    JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } });

  if (!frame.method) return null;

  switch (frame.method) {
    case 'initialize':
      return respond({
        result: {
          protocolVersion: typeof frame.params?.protocolVersion === 'string' ? frame.params.protocolVersion : '2025-06-18',
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'diedrico-mcp', version: '0.1.0' },
        },
      });
    case 'notifications/initialized':
    case 'initialized':
      return null;
    case 'ping':
      return respond({ result: {} });
    case 'tools/list':
      return respond({ result: { tools: catalog.listTools() } });
    case 'tools/call': {
      const name = typeof frame.params?.name === 'string' ? frame.params.name : '';
      const args = (frame.params?.arguments ?? {}) as Record<string, unknown>;
      const result: McpToolResult = catalog.callTool(name, args);
      return respond({ result });
    }
    default:
      if (id === null) return null;
      return fail(-32601, `Method not found: ${frame.method}`);
  }
}

export function createBrowserMcpConnection(options: BrowserMcpConnectionOptions): McpConnectionPort {
  const openSocket = options.openSocket ?? openPlatformSocket;
  const listeners = new Set<() => void>();

  let snapshot: McpConnectionSnapshot = {
    state: 'idle',
    detail: 'not connected',
    protocolVersion: null,
    callCount: 0,
    recentCalls: [],
  };
  let socket: BrowserMcpSocket | null = null;
  let callCount = 0;

  const publish = (next: Partial<McpConnectionSnapshot>): void => {
    snapshot = { ...snapshot, ...next };
    listeners.forEach(listener => listener());
  };

  const handleFrame = (data: string): void => {
    let frame: JsonRpcFrame;
    try {
      frame = JSON.parse(data) as JsonRpcFrame;
    } catch {
      return;
    }

    if (frame.method === 'initialize' && typeof frame.params?.protocolVersion === 'string') {
      publish({ protocolVersion: frame.params.protocolVersion });
    }

    if (frame.method === 'tools/call') {
      callCount += 1;
      const tool = typeof frame.params?.name === 'string' ? frame.params.name : '';
      publish({ callCount });
      const response = answerClientMcpFrame(options.catalog, frame);
      if (response) socket?.send(response);
      const parsed = response ? (JSON.parse(response) as { result?: McpToolResult }) : null;
      const ok = parsed?.result?.isError !== true;
      publish({ recentCalls: [{ tool, ok }, ...snapshot.recentCalls].slice(0, MAX_RECENT_CALLS) });
      return;
    }

    const response = answerClientMcpFrame(options.catalog, frame);
    if (response) socket?.send(response);
  };

  return {
    connect(input) {
      if (socket) return;
      let url: string;
      try {
        url = buildClientMcpSocketUrl(input);
      } catch (error) {
        publish({ state: 'error', detail: error instanceof Error ? error.message : 'invalid endpoint' });
        return;
      }

      publish({ state: 'connecting', detail: 'opening socket' });
      socket = openSocket(url, {
        onOpen: () => publish({ state: 'open', detail: 'socket open' }),
        onMessage: handleFrame,
        onClose: code => {
          socket = null;
          publish({ state: 'closed', detail: `closed (${code})` });
        },
        onError: () => publish({ state: 'error', detail: 'socket error' }),
      });
    },

    disconnect() {
      socket?.close();
      socket = null;
      publish({ state: 'closed', detail: 'disconnected' });
    },

    snapshot: () => snapshot,

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
