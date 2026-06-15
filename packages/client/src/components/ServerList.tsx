import { useState } from 'react';
import type { ServerConfig } from '../types';

interface Props {
  servers: ServerConfig[];
  connectedId: string | null;
  onConnect: (s: ServerConfig) => void;
  onDisconnect: () => void;
  onAdd: (name: string, command: string) => void;
  onDelete: (id: string) => void;
}

export default function ServerList({ servers, connectedId, onConnect, onDisconnect, onAdd, onDelete }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [command, setCommand] = useState('');
  const [filter, setFilter] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !command.trim()) return;
    onAdd(name.trim(), command.trim());
    setName('');
    setCommand('');
    setShowForm(false);
  }

  const filtered = servers.filter(s =>
    s.name.toLowerCase().includes(filter.toLowerCase()) ||
    s.command.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <span className="text-xs font-mono text-text-muted uppercase tracking-wider">Servers</span>
        <button onClick={() => setShowForm(v => !v)}
          className="text-xs text-accent hover:text-accent/80 font-mono">+ add</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-3 border-b border-border space-y-2 bg-bg/50">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Server name"
            className="w-full bg-surface border border-border rounded px-2 py-1 text-sm text-text-primary placeholder-text-muted focus:border-accent outline-none" />
          <input value={command} onChange={e => setCommand(e.target.value)} placeholder="Command (e.g. npx @modelcontextprotocol/server-filesystem ./data)"
            className="w-full bg-surface border border-border rounded px-2 py-1 text-xs text-text-primary placeholder-text-muted focus:border-accent outline-none font-mono" />
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-accent hover:bg-accent/80 text-bg text-xs font-bold py-1 rounded transition-colors">Add</button>
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-border hover:border-text-muted text-text-muted text-xs py-1 rounded transition-colors">Cancel</button>
          </div>
        </form>
      )}

      <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter..."
        className="mx-3 mt-2 bg-bg border border-border rounded px-2 py-1 text-xs text-text-primary placeholder-text-muted focus:border-accent outline-none" />

      <div className="flex-1 overflow-auto py-2">
        {filtered.length === 0 && (
          <p className="text-xs text-text-muted text-center px-3 py-4">
            {servers.length === 0 ? 'No servers added yet' : 'No servers match filter'}
          </p>
        )}
        {filtered.map(server => {
          const isConnected = connectedId === server.id;
          return (
            <div key={server.id} className="mx-2 mb-2 p-2 rounded bg-bg border border-border">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-text-primary truncate">{server.name}</span>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ml-2 ${isConnected ? 'bg-success' : 'bg-text-muted'}`} />
              </div>
              <p className="text-xs text-text-muted font-mono truncate mb-2" title={server.command}>{server.command}</p>
              <div className="flex gap-1">
                {isConnected ? (
                  <button onClick={onDisconnect}
                    className="flex-1 bg-error/20 hover:bg-error/30 text-error text-xs py-1 rounded border border-error/30 transition-colors">
                    Disconnect
                  </button>
                ) : (
                  <button onClick={() => onConnect(server)}
                    className="flex-1 bg-success/20 hover:bg-success/30 text-success text-xs py-1 rounded border border-success/30 transition-colors">
                    Connect
                  </button>
                )}
                <button onClick={() => onDelete(server.id)}
                  className="text-text-muted hover:text-error text-xs px-2 py-1 rounded border border-border hover:border-error/30 transition-colors">
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}