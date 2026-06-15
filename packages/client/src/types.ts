export interface ServerConfig {
  id: string;
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: object;
}

export interface MCPResource {
  uri: string;
  name?: string;
  mimeType?: string;
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: { name: string; required?: boolean; description?: string }[];
}

export interface TraceEntry {
  id: string;
  timestamp: string;
  serverId: string;
  tool: string;
  request: unknown;
  response: unknown;
  durationMs: number;
  status: 'success' | 'error';
}

export interface ConnectionStatus {
  connected: boolean;
  serverId: string | null;
  serverName?: string;
}