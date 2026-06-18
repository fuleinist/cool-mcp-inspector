import { useState, useEffect, useCallback } from 'react';
import type { ServerConfig, MCPTool, TraceEntry } from './types';
import ServerList from './components/ServerList';
import ToolBrowser from './components/ToolBrowser';
import RequestBuilder from './components/RequestBuilder';
import ResponseTracer from './components/ResponseTracer';

const API = '';

export default function App() {
  const [servers, setServers] = useState<ServerConfig[]>([]);
  const [connectedId, setConnectedId] = useState<string | null>(null);
  const [connectedName, setConnectedName] = useState<string | null>(null);
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [traces, setTraces] = useState<TraceEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'tools' | 'resources' | 'prompts'>('tools');
  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null);

  // Load initial data + open live trace stream
  useEffect(() => {
    fetchServers();
    fetchHistory();
    const socket = new WebSocket(`ws://${window.location.host}/ws`);
    socket.onmessage = (ev) => {
      const data = JSON.parse(ev.data);
      if (data.type === 'connected') {
        setConnectedId(data.serverId);
        setConnectedName(data.serverName);
      } else if (data.type === 'disconnected') {
        setConnectedId(null);
        setConnectedName(null);
        setTools([]);
      } else if (data.type === 'trace') {
        setTraces(prev => [data.entry, ...prev].slice(0, 200));
      }
    };
    return () => socket.close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchServers() {
    const res = await fetch(`${API}/api/servers`);
    const data = await res.json();
    setServers(data);
  }

  async function fetchHistory() {
    const res = await fetch(`${API}/api/history`);
    const data = await res.json();
    setTraces(data);
  }

  const handleConnect = useCallback(async (server: ServerConfig) => {
    const res = await fetch(`${API}/api/connect/${server.id}`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      setConnectedId(server.id);
      setConnectedName(server.name);
      setTools(data.tools || []);
      setTraces([]);
    } else {
      alert(`Connection failed: ${data.error}`);
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    await fetch(`${API}/api/disconnect`, { method: 'POST' });
    setConnectedId(null);
    setConnectedName(null);
    setTools([]);
    setSelectedTool(null);
  }, []);

  const handleAddServer = useCallback(async (name: string, command: string) => {
    const res = await fetch(`${API}/api/servers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, command }),
    });
    const config = await res.json();
    setServers(prev => [...prev, config]);
  }, []);

  const handleDeleteServer = useCallback(async (id: string) => {
    await fetch(`${API}/api/servers/${id}`, { method: 'DELETE' });
    setServers(prev => prev.filter(s => s.id !== id));
    if (connectedId === id) handleDisconnect();
  }, [connectedId, handleDisconnect]);

  return (
    <div className="flex flex-col h-screen bg-bg">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
        <div className="flex items-center gap-3">
          <span className="text-accent font-mono font-bold text-lg">⬡ MCP Inspector</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${connectedId ? 'bg-success/20 text-success' : 'bg-text-muted/20 text-text-muted'}`}>
            {connectedId ? `● ${connectedName}` : '○ disconnected'}
          </span>
        </div>
        <a href="https://github.com/fuleinist/cool-mcp-inspector" target="_blank" rel="noreferrer"
           className="text-text-muted hover:text-text-primary text-sm">GitHub</a>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Server list */}
        <aside className="w-64 border-r border-border bg-surface flex flex-col">
          <ServerList
            servers={servers}
            connectedId={connectedId}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onAdd={handleAddServer}
            onDelete={handleDeleteServer}
          />
        </aside>

        {/* Center: Request Builder */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <RequestBuilder
            tools={tools}
            selectedTool={selectedTool}
            onSelectTool={setSelectedTool}
          />
        </main>

        {/* Right: Response Tracer */}
        <aside className="w-80 border-l border-border bg-surface flex flex-col">
          <ResponseTracer traces={traces} />
        </aside>
      </div>

      {/* Bottom: Tool Browser */}
      <div className="border-t border-border bg-surface h-48 flex flex-col">
        <div className="flex items-center gap-4 px-4 py-2 border-b border-border">
          {(['tools', 'resources', 'prompts'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`text-sm font-medium pb-1 border-b-2 transition-colors ${activeTab === tab ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text-primary'}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-auto">
          <ToolBrowser tab={activeTab} tools={tools} onSelectTool={setSelectedTool} />
        </div>
      </div>
    </div>
  );
}