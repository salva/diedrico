import { describe, expect, it } from 'vitest';
import {
  answerClientMcpFrame,
  buildClientMcpSocketUrl,
  createBrowserMcpConnection,
  type BrowserMcpSocketHandlers,
} from '@/infrastructure/mcp/BrowserMcpConnection';
import { createHelloMcpToolCatalog } from '@/application/mcp/McpToolCatalog';

const catalog = () => createHelloMcpToolCatalog({
  pageUrl: () => 'https://salva.github.io/diedrico/',
  now: () => new Date('2026-11-03T00:00:00.000Z'),
});

const frame = (value: Record<string, unknown>) => JSON.stringify(value);

describe('client MCP socket URL', () => {
  it('maps the HTTP endpoint to the client MCP WebSocket path', () => {
    const url = buildClientMcpSocketUrl({
      endpoint: 'http://127.0.0.1:49374',
      clientName: 'diedrico_test',
      directory: '/home/salva/g/ml/diedrico',
      ticket: 'abc-123',
    });

    expect(url).toBe(
      'ws://127.0.0.1:49374/api/experimental/client-mcp?name=diedrico_test&location%5Bdirectory%5D=%2Fhome%2Fsalva%2Fg%2Fml%2Fdiedrico&ticket=abc-123',
    );
  });

  it('uses secure sockets for HTTPS endpoints', () => {
    const url = buildClientMcpSocketUrl({
      endpoint: 'https://runtime.example:443',
      clientName: 'diedrico_test',
      directory: '/work',
      ticket: 't',
    });

    expect(url.startsWith('wss://runtime.example/api/experimental/client-mcp?')).toBe(true);
  });
});

describe('client MCP frame handling', () => {
  it('negotiates the requested protocol version and advertises tools', () => {
    const response = JSON.parse(answerClientMcpFrame(catalog(), {
      jsonrpc: '2.0',
      id: 0,
      method: 'initialize',
      params: { protocolVersion: '2025-11-25' },
    }) ?? '{}');

    expect(response).toEqual({
      jsonrpc: '2.0',
      id: 0,
      result: {
        protocolVersion: '2025-11-25',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'diedrico-mcp', version: '0.1.0' },
      },
    });
  });

  it('ignores the initialized notification', () => {
    expect(answerClientMcpFrame(catalog(), { jsonrpc: '2.0', method: 'notifications/initialized' })).toBeNull();
  });

  it('lists the hello tool', () => {
    const response = JSON.parse(answerClientMcpFrame(catalog(), { jsonrpc: '2.0', id: 1, method: 'tools/list' }) ?? '{}');

    expect(response.result.tools).toEqual([
      {
        name: 'hello',
        description: 'Says hello from the Diedrico page that is serving this tool.',
        inputSchema: { type: 'object', properties: {} },
      },
    ]);
  });

  it('answers a hello call with the hosting page', () => {
    const response = JSON.parse(answerClientMcpFrame(catalog(), {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: 'hello', arguments: {} },
    }) ?? '{}');

    expect(response.result.content[0].text).toBe('hello from https://salva.github.io/diedrico/ at 2026-11-03T00:00:00.000Z');
    expect(response.result.isError).toBeUndefined();
  });

  it('reports unknown tools and unknown methods', () => {
    const unknownTool = JSON.parse(answerClientMcpFrame(catalog(), {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'nope', arguments: {} },
    }) ?? '{}');
    const unknownMethod = JSON.parse(answerClientMcpFrame(catalog(), { jsonrpc: '2.0', id: 4, method: 'resources/list' }) ?? '{}');

    expect(unknownTool.result.isError).toBe(true);
    expect(unknownMethod.error.code).toBe(-32601);
  });
});

describe('client MCP connection', () => {
  it('answers initialize, tools/list and tools/call over one socket', () => {
    const sent: string[] = [];
    let handlers: BrowserMcpSocketHandlers | null = null;

    const connection = createBrowserMcpConnection({
      catalog: catalog(),
      openSocket: (_url, socketHandlers) => {
        handlers = socketHandlers;
        return { send: data => sent.push(data), close: () => socketHandlers.onClose(1000) };
      },
    });

    connection.connect({
      endpoint: 'http://127.0.0.1:49374',
      clientName: 'diedrico_test',
      directory: '/home/salva/g/ml/diedrico',
      ticket: 't',
    });
    expect(handlers).not.toBeNull();
    handlers!.onOpen();
    expect(connection.snapshot().state).toBe('open');

    handlers!.onMessage(frame({ jsonrpc: '2.0', id: 0, method: 'initialize', params: { protocolVersion: '2025-11-25' } }));
    handlers!.onMessage(frame({ jsonrpc: '2.0', method: 'notifications/initialized' }));
    handlers!.onMessage(frame({ jsonrpc: '2.0', id: 1, method: 'tools/list' }));
    handlers!.onMessage(frame({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'hello', arguments: {} } }));

    expect(sent).toHaveLength(3);
    expect(JSON.parse(sent[0]).result.protocolVersion).toBe('2025-11-25');
    expect(JSON.parse(sent[2]).result.content[0].text).toContain('hello from');

    const snapshot = connection.snapshot();
    expect(snapshot.protocolVersion).toBe('2025-11-25');
    expect(snapshot.callCount).toBe(1);
    expect(snapshot.recentCalls).toEqual([{ tool: 'hello', ok: true }]);
  });

  it('reports a closed socket and allows a new attachment', () => {
    const closed: number[] = [];
    let handlers: BrowserMcpSocketHandlers | null = null;

    const connection = createBrowserMcpConnection({
      catalog: catalog(),
      openSocket: (_url, socketHandlers) => {
        handlers = socketHandlers;
        return { send: () => {}, close: () => socketHandlers.onClose(1001) };
      },
    });

    connection.connect({ endpoint: 'http://127.0.0.1:49374', clientName: 'c', directory: '/work', ticket: 't' });
    handlers!.onClose(1001);
    closed.push(connection.snapshot().state === 'closed' ? 1001 : 0);
    expect(closed).toEqual([1001]);

    expect(() => connection.connect({ endpoint: 'http://127.0.0.1:49374', clientName: 'c', directory: '/work', ticket: 't2' })).not.toThrow();
  });
});
