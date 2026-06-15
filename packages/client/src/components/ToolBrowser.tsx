import { useState, useEffect } from 'react';
import type { MCPTool, MCPResource, MCPPrompt } from '../types';

const API = '';

interface Props {
  tab: 'tools' | 'resources' | 'prompts';
  tools: MCPTool[];
  onSelectTool: (t: MCPTool) => void;
}

export default function ToolBrowser({ tab, tools, onSelectTool }: Props) {
  const [resources, setResources] = useState<MCPResource[]>([]);
  const [prompts, setPrompts] = useState<MCPPrompt[]>([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (tab === 'resources') {
      fetch(`${API}/api/resources`).then(r => r.json()).then(d => setResources(d)).catch(() => setResources([]));
    } else if (tab === 'prompts') {
      fetch(`${API}/api/prompts`).then(r => r.json()).then(d => setPrompts(d)).catch(() => setPrompts([]));
    }
  }, [tab]);

  if (tab === 'tools') {
    const filtered = tools.filter(t => !filter || t.name.toLowerCase().includes(filter.toLowerCase()));
    return (
      <div className="p-2 space-y-1">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter tools..."
          className="w-full bg-bg border border-border rounded px-2 py-1 text-xs text-text-primary placeholder-text-muted focus:border-accent outline-none mb-2"
        />
        {filtered.map(tool => (
          <button key={tool.name}
            onClick={() => onSelectTool(tool)}
            className="w-full text-left px-3 py-2 rounded bg-bg border border-border hover:border-accent/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-accent text-xs">⚙</span>
              <span className="text-sm font-mono text-text-primary">{tool.name}</span>
            </div>
            {tool.description && (
              <p className="text-xs text-text-muted mt-0.5 ml-5 line-clamp-2">{tool.description}</p>
            )}
          </button>
        ))}
        {filtered.length === 0 && tools.length > 0 && (
          <p className="text-xs text-text-muted text-center py-4">No tools match filter</p>
        )}
      </div>
    );
  }

  if (tab === 'resources') {
    const filtered = resources.filter(r => !filter || r.name?.toLowerCase().includes(filter.toLowerCase()) || r.uri.toLowerCase().includes(filter.toLowerCase()));
    return (
      <div className="p-2 space-y-1">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter resources..."
          className="w-full bg-bg border border-border rounded px-2 py-1 text-xs text-text-primary placeholder-text-muted focus:border-accent outline-none mb-2"
        />
        {filtered.map(res => (
          <div key={res.uri} className="px-3 py-2 rounded bg-bg border border-border">
            <div className="flex items-center gap-2">
              <span className="text-warning text-xs">📄</span>
              <span className="text-sm font-mono text-text-primary">{res.name || res.uri}</span>
              {res.mimeType && <span className="text-xs text-text-muted">{res.mimeType}</span>}
            </div>
            <p className="text-xs text-text-muted font-mono mt-0.5 ml-5 truncate">{res.uri}</p>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-text-muted text-center py-4">No resources or not connected</p>
        )}
      </div>
    );
  }

  if (tab === 'prompts') {
    const filtered = prompts.filter(p => !filter || p.name.toLowerCase().includes(filter.toLowerCase()));
    return (
      <div className="p-2 space-y-1">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter prompts..."
          className="w-full bg-bg border border-border rounded px-2 py-1 text-xs text-text-primary placeholder-text-muted focus:border-accent outline-none mb-2"
        />
        {filtered.map(prompt => (
          <div key={prompt.name} className="px-3 py-2 rounded bg-bg border border-border">
            <div className="flex items-center gap-2">
              <span className="text-accent text-xs">💬</span>
              <span className="text-sm font-mono text-text-primary">{prompt.name}</span>
            </div>
            {prompt.description && (
              <p className="text-xs text-text-muted mt-0.5 ml-5">{prompt.description}</p>
            )}
            {prompt.arguments && prompt.arguments.length > 0 && (
              <div className="mt-1 ml-5 flex flex-wrap gap-1">
                {prompt.arguments.map(arg => (
                  <span key={arg.name} className="text-xs bg-surface px-1.5 py-0.5 rounded border border-border font-mono">
                    {arg.name}{arg.required ? '*' : ''}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-text-muted text-center py-4">No prompts or not connected</p>
        )}
      </div>
    );
  }

  return null;
}