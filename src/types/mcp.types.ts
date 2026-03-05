/**
 * MCP protocol-related types.
 */

export interface McpToolResult {
  content: McpContent[];
  isError?: boolean;
}

export interface McpContent {
  type: 'text' | 'image' | 'resource';
  text?: string;
  data?: string;
  mimeType?: string;
  uri?: string;
}

export interface McpError {
  code: string;
  message: string;
  details?: unknown;
}

export function createTextResult(text: string): McpToolResult {
  return {
    content: [{ type: 'text', text }],
  };
}

export function createErrorResult(message: string, details?: unknown): McpToolResult {
  return {
    content: [{ type: 'text', text: `Error: ${message}${details ? `\n${JSON.stringify(details, null, 2)}` : ''}` }],
    isError: true,
  };
}

export function createJsonResult(data: unknown): McpToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}
