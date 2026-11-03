/**
 * Protocol-agnostic tool catalog exposed by the Diedrico page when it acts as an
 * MCP server for an OpenCode session.
 *
 * Deliberately minimal: a single `hello` tool. It proves that an OpenCode session
 * can discover and call a tool served by the web page itself. It does not touch the
 * drawing or any application state.
 */

export interface McpToolTextContent {
  type: 'text';
  text: string;
}

export interface McpToolResult {
  content: McpToolTextContent[];
  isError?: boolean;
}

export interface McpToolInputSchema {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
}

export interface McpToolDescriptor {
  name: string;
  description: string;
  inputSchema: McpToolInputSchema;
}

export interface McpToolCatalog {
  listTools(): McpToolDescriptor[];
  callTool(name: string, args: Record<string, unknown>): McpToolResult;
}

export interface HelloMcpToolCatalogOptions {
  /** Produces the URL reported by `hello`. Defaults to the current page. */
  pageUrl?: () => string;
  /** Produces the timestamp reported by `hello`. Defaults to `new Date()`. */
  now?: () => Date;
}

const text = (value: string, isError = false): McpToolResult => ({
  content: [{ type: 'text', text: value }],
  ...(isError ? { isError: true } : {}),
});

/**
 * One harmless tool. Calling it returns where the call was answered, which is the
 * whole point: the reply can only come from the page that hosts the socket.
 */
export function createHelloMcpToolCatalog(options: HelloMcpToolCatalogOptions = {}): McpToolCatalog {
  const pageUrl = options.pageUrl ?? (() => (typeof window === 'undefined' ? '' : window.location.href));
  const now = options.now ?? (() => new Date());

  const tools: McpToolDescriptor[] = [
    {
      name: 'hello',
      description: 'Says hello from the Diedrico page that is serving this tool.',
      inputSchema: { type: 'object', properties: {} },
    },
  ];

  return {
    listTools: () => tools.map(tool => ({ ...tool })),
    callTool(name, args) {
      if (name === 'hello') {
        const suffix = typeof args.name === 'string' && args.name ? `, ${args.name}` : '';
        return text(`hello${suffix} from ${pageUrl()} at ${now().toISOString()}`);
      }
      return text(`Unknown tool: ${name}`, true);
    },
  };
}
