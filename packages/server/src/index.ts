import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { randomUUID } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const DATA_DIR = path.join(homedir(), '.mcp-inspector');
const SERVERS_FILE = path.join(DATA_DIR, 'servers.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

function loadServers(): ServerConfig[] {
  if (!existsSync(SERVERS_FILE)) return [];
  try { return JSON.parse(readFileSync(SERVERS_FILE, 'utf-8')); } catch { return []; }
}

function saveServers(servers: ServerConfig[]) {
  writeFileSync(SERVERS_FILE, JSON.stringify(servers, null, 2));
}

function loadHistory(): TraceEntry[] {
  if (!existsSync(HISTORY_FILE)) return [];
  try { return JSON.parse(readFileSync(HISTORY_FILE, 'utf-8')); } catch { return []; }
}

function saveHistory(history: TraceEntry[]) {
  writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

interface ServerConfig {
  id: string;
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

interface TraceEntry {
  id: string;
  timestamp: string;
  serverId: string;
  tool: string;
  request: unknown;
  response: unknown;
  durationMs: number;
  status: 'success' | 'error';
}

// MCP client state
let mcpClient: Client | null = null;
let currentServerId: string | null = null;

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

// WebSocket clients
const wsClients = new Set<WebSocket>();

function broadcast(event: object) {
  const msg = JSON.stringify(event);
  wsClients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  });
}

// --- Server Config API ---

app.get('/api/servers', (_req, res) => {
  res.json(loadServers());
});

app.post('/api/servers', (req, res) => {
  const servers = loadServers();
  const config: ServerConfig = { id: randomUUID(), ...req.body };
  servers.push(config);
  saveServers(servers);
  res.json(config);
});

app.delete('/api/servers/:id', (req, res) => {
  let servers = loadServers();
  servers = servers.filter(s => s.id !== req.params.id);
  saveServers(servers);
  res.json({ ok: true });
});

// --- MCP Connection API ---

app.post('/api/connect/:id', async (req, res) => {
  const servers = loadServers();
  const config = servers.find(s => s.id === req.params.id);
  if (!config) return res.status(404).json({ error: 'Server not found' });

  try {
    // Disconnect existing
    if (mcpClient) {
      await mcpClient.close();
      mcpClient = null;
      currentServerId = null;
    }

    const parts = config.command.split(' ');
    const cmd = parts[0];
    const args = config.args ?? parts.slice(1);

    const transport = new StdioClientTransport({ command: cmd, args, env: config.env });

    mcpClient = new Client({ name: 'mcp-inspector', version: '1.0.0' }, { capabilities: {} });

    await mcpClient.connect(transport);
    currentServerId = config.id;

    // Fetch tools using typed SDK method
    const toolsResult = await mcpClient.listTools();
    const tools = toolsResult.tools || [];

    broadcast({ type: 'connected', serverId: config.id, serverName: config.name });
    res.json({ ok: true, tools });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/disconnect', async (_req, res) => {
  if (mcpClient) {
    await mcpClient.close();
    mcpClient = null;
    currentServerId = null;
    broadcast({ type: 'disconnected' });
  }
  res.json({ ok: true });
});

app.get('/api/connection-status', (_req, res) => {
  res.json({ connected: mcpClient !== null, serverId: currentServerId });
});

// --- Tools API ---

app.get('/api/tools', async (_req, res) => {
  if (!mcpClient) return res.status(400).json({ error: 'Not connected' });
  try {
    const result = await mcpClient.listTools();
    res.json(result.tools || []);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/tools/call', async (req, res) => {
  if (!mcpClient) return res.status(400).json({ error: 'Not connected' });
  const { name, arguments: args = {} } = req.body;

  const entry: TraceEntry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    serverId: currentServerId!,
    tool: name,
    request: args,
    response: null,
    durationMs: 0,
    status: 'success',
  };

  const start = Date.now();
  try {
    const result = await mcpClient.callTool({ name, arguments: args });
    entry.durationMs = Date.now() - start;
    entry.response = result;
    entry.status = 'success';
    const history = loadHistory();
    history.unshift(entry);
    saveHistory(history.slice(0, 500));
    broadcast({ type: 'trace', entry });
    res.json(entry);
  } catch (err: unknown) {
    entry.durationMs = Date.now() - start;
    entry.response = err instanceof Error ? err.message : String(err);
    entry.status = 'error';
    const history = loadHistory();
    history.unshift(entry);
    saveHistory(history.slice(0, 500));
    broadcast({ type: 'trace', entry });
    res.status(500).json(entry);
  }
});

// --- Resources API ---

app.get('/api/resources', async (_req, res) => {
  if (!mcpClient) return res.status(400).json({ error: 'Not connected' });
  try {
    const result = await mcpClient.listResources();
    res.json(result.resources || []);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.get('/api/resources/:uri', async (req, res) => {
  if (!mcpClient) return res.status(400).json({ error: 'Not connected' });
  try {
    const result = await mcpClient.readResource({ uri: req.params.uri });
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// --- Prompts API ---

app.get('/api/prompts', async (_req, res) => {
  if (!mcpClient) return res.status(400).json({ error: 'Not connected' });
  try {
    const result = await mcpClient.listPrompts();
    res.json(result.prompts || []);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/prompts/call', async (req, res) => {
  if (!mcpClient) return res.status(400).json({ error: 'Not connected' });
  const { name, arguments: args = {} } = req.body;

  const entry: TraceEntry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    serverId: currentServerId!,
    tool: name,
    request: args,
    response: null,
    durationMs: 0,
    status: 'success',
  };

  const start = Date.now();
  try {
    const result = await mcpClient.getPrompt({ name, arguments: args });
    entry.durationMs = Date.now() - start;
    entry.response = result;
    entry.status = 'success';
    const history = loadHistory();
    history.unshift(entry);
    saveHistory(history.slice(0, 500));
    broadcast({ type: 'trace', entry });
    res.json({ ok: true, prompt: result, durationMs: entry.durationMs });
  } catch (err: unknown) {
    entry.durationMs = Date.now() - start;
    entry.response = err instanceof Error ? err.message : String(err);
    entry.status = 'error';
    const history = loadHistory();
    history.unshift(entry);
    saveHistory(history.slice(0, 500));
    broadcast({ type: 'trace', entry });
    res.status(500).json({ error: entry.response, durationMs: entry.durationMs });
  }
});

// --- History API ---

app.get('/api/history', (_req, res) => {
  res.json(loadHistory());
});

app.delete('/api/history', (_req, res) => {
  saveHistory([]);
  res.json({ ok: true });
});

// --- HTTP Server + WebSocket ---

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

wss.on('connection', (ws) => {
  wsClients.add(ws);
  ws.on('close', () => wsClients.delete(ws));
  ws.on('error', () => wsClients.delete(ws));
});

httpServer.listen(PORT, () => {
  console.log(`MCP Inspector server running on http://localhost:${PORT}`);
  console.log(`WebSocket available at ws://localhost:${PORT}/ws`);
});