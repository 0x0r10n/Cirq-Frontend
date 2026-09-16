/**
 * A minimal Model Context Protocol client — JSON-RPC 2.0 over HTTP, calling
 * the standard `tools/list` and `tools/call` methods. This wire shape is
 * part of the MCP spec itself, not a Longbow-specific fact, so it's safe to
 * implement directly; which tool names Longbow's MCP endpoint actually
 * exposes is not — discover those via `listMcpTools` at runtime rather than
 * assuming a name.
 */

interface JsonRpcResponse<T> {
  jsonrpc: "2.0";
  id: number;
  result?: T;
  error?: { code: number; message: string };
}

async function callJsonRpc<T>(
  url: string,
  method: string,
  params: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!response.ok) {
    throw new Error(`MCP request to ${url} failed: HTTP ${response.status}`);
  }
  const body = (await response.json()) as JsonRpcResponse<T>;
  if (body.error) {
    throw new Error(`MCP request to ${url} returned an error: ${body.error.message}`);
  }
  if (body.result === undefined) {
    throw new Error(`MCP request to ${url} returned no result`);
  }
  return body.result;
}

export interface McpToolDescriptor {
  name: string;
  description?: string;
  inputSchema?: unknown;
}

export function listMcpTools(mcpUrl: string): Promise<McpToolDescriptor[]> {
  return callJsonRpc<{ tools: McpToolDescriptor[] }>(mcpUrl, "tools/list", {}).then(
    (r) => r.tools,
  );
}

export function callMcpTool<T = unknown>(
  mcpUrl: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<T> {
  return callJsonRpc<T>(mcpUrl, "tools/call", { name: toolName, arguments: args });
}
