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
  // Resource detail
  const [selectedResource, setSelectedResource] = useState<MCPResource | null>(null);
  const [resourceContent, setResourceContent] = useState<string | null>(null);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [resourceError, setResourceError] = useState<string | null>(null);
  // Prompt detail
  const [selectedPrompt, setSelectedPrompt] = useState<MCPPrompt | null>(null);
  const [promptArgs, setPromptArgs] = useState<Record<string, string>>({});
  const [promptResult, setPromptResult] = useState<unknown>(null);
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);

  useEffect(() => {
    if (tab === 'resources') {
      fetch(`${API}/api/resources`).then(r => r.json()).then(d => setResources(d)).catch(() => setResources([]));
    } else if (tab === 'prompts') {
      fetch(`${API}/api/prompts`).then(r => r.json()).then(d => setPrompts(d)).catch(() => setPrompts([]));
    }
    // Reset detail panels on tab switch
    setSelectedResource(null);
    setSelectedPrompt(null);
    setResourceContent(null);
    setPromptResult(null);
    setPromptError(null);
  }, [tab]);

  async function handleReadResource(res: MCPResource) {
    setSelectedResource(res);
    setSelectedPrompt(null);
    setResourceLoading(true);
    setResourceError(null);
    setResourceContent(null);
    setPromptResult(null);
    try {
      const r = await fetch(`${API}/api/resources/${encodeURIComponent(res.uri)}`);
      const d = await r.json();
      // Content might be in d.contents[0].text or d.content
      const text = d.contents?.[0]?.text ?? d.content ?? JSON.stringify(d, null, 2);
      setResourceContent(text);
    } catch (err) {
      setResourceError(String(err));
    } finally {
      setResourceLoading(false);
    }
  }

  function handleSelectPrompt(prompt: MCPPrompt) {
    setSelectedPrompt(prompt);
    setSelectedResource(null);
    setResourceContent(null);
    setPromptResult(null);
    setPromptError(null);
    // Pre-fill args with empty strings
    const init: Record<string, string> = {};
    (prompt.arguments || []).forEach(a => { init[a.name] = ''; });
    setPromptArgs(init);
  }

  async function handleCallPrompt() {
    if (!selectedPrompt) return;
    setPromptLoading(true);
    setPromptError(null);
    setPromptResult(null);
    try {
      const args: Record<string, unknown> = {};
      Object.entries(promptArgs).forEach(([k, v]) => {
        if (v.trim()) args[k] = v;
      });
      const r = await fetch(`${API}/api/prompts/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: selectedPrompt.name, arguments: args }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to call prompt');
      setPromptResult(d.prompt);
    } catch (err) {
      setPromptError(String(err));
    } finally {
      setPromptLoading(false);
    }
  }

  if (tab === 'tools') {
    const filtered = tools.filter(t => !filter || t.name.toLowerCase().includes(filter.toLowerCase()));
    return (
      <div className="p-2 space-y-1">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter tools..."
          className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs text-[#e6edf3] placeholder-[#8b949e] focus:border-[#58a6ff] outline-none mb-2"
        />
        {filtered.map(tool => (
          <button key={tool.name}
            onClick={() => onSelectTool(tool)}
            className="w-full text-left px-3 py-2 rounded bg-[#0d1117] border border-[#30363d] hover:border-[#58a6ff]/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-[#58a6ff] text-xs">⚙</span>
              <span className="text-sm font-mono text-[#e6edf3]">{tool.name}</span>
            </div>
            {tool.description && (
              <p className="text-xs text-[#8b949e] mt-0.5 ml-5 line-clamp-2">{tool.description}</p>
            )}
          </button>
        ))}
        {filtered.length === 0 && tools.length > 0 && (
          <p className="text-xs text-[#8b949e] text-center py-4">No tools match filter</p>
        )}
        {tools.length === 0 && (
          <p className="text-xs text-[#8b949e] text-center py-4">Connect to a server to see tools</p>
        )}
      </div>
    );
  }

  if (tab === 'resources') {
    const filtered = resources.filter(r =>
      !filter ||
      (r.name || '').toLowerCase().includes(filter.toLowerCase()) ||
      r.uri.toLowerCase().includes(filter.toLowerCase())
    );
    return (
      <div className="flex flex-col h-full">
        {/* List */}
        <div className="p-2 space-y-1 flex-shrink-0">
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter resources..."
            className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs text-[#e6edf3] placeholder-[#8b949e] focus:border-[#58a6ff] outline-none mb-2"
          />
          {filtered.map(res => (
            <button key={res.uri}
              onClick={() => handleReadResource(res)}
              className={`w-full text-left px-3 py-2 rounded border transition-colors ${selectedResource?.uri === res.uri ? 'bg-[#58a6ff]/10 border-[#58a6ff]/50' : 'bg-[#0d1117] border-[#30363d] hover:border-[#58a6ff]/50'}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-[#d29922] text-xs">📄</span>
                <span className="text-sm font-mono text-[#e6edf3]">{res.name || res.uri}</span>
                {res.mimeType && <span className="text-xs text-[#8b949e]">{res.mimeType}</span>}
              </div>
              <p className="text-xs text-[#8b949e] font-mono mt-0.5 ml-5 truncate">{res.uri}</p>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-[#8b949e] text-center py-4">No resources or not connected</p>
          )}
        </div>
        {/* Detail panel */}
        {selectedResource && (
          <div className="flex-1 border-t border-[#30363d] flex flex-col min-h-0">
            <div className="px-3 py-2 border-b border-[#30363d] flex items-center justify-between">
              <span className="text-xs font-mono text-[#8b949e]">📄 {selectedResource.name || selectedResource.uri}</span>
              <button onClick={() => { setSelectedResource(null); setResourceContent(null); }}
                className="text-xs text-[#8b949e] hover:text-[#e6edf3]">✕</button>
            </div>
            <div className="flex-1 overflow-auto p-3">
              {resourceLoading && <p className="text-xs text-[#8b949e] animate-pulse">Loading...</p>}
              {resourceError && <p className="text-xs text-[#f85149]">❌ {resourceError}</p>}
              {resourceContent && (
                <pre className="text-xs font-mono text-[#e6edf3] whitespace-pre-wrap break-all bg-[#0d1117] rounded p-2 border border-[#30363d]">
                  {resourceContent}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (tab === 'prompts') {
    const filtered = prompts.filter(p => !filter || p.name.toLowerCase().includes(filter.toLowerCase()));
    return (
      <div className="flex flex-col h-full">
        {/* List */}
        <div className="p-2 space-y-1 flex-shrink-0">
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter prompts..."
            className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs text-[#e6edf3] placeholder-[#8b949e] focus:border-[#58a6ff] outline-none mb-2"
          />
          {filtered.map(prompt => (
            <button key={prompt.name}
              onClick={() => handleSelectPrompt(prompt)}
              className={`w-full text-left px-3 py-2 rounded border transition-colors ${selectedPrompt?.name === prompt.name ? 'bg-[#58a6ff]/10 border-[#58a6ff]/50' : 'bg-[#0d1117] border-[#30363d] hover:border-[#58a6ff]/50'}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-[#58a6ff] text-xs">💬</span>
                <span className="text-sm font-mono text-[#e6edf3]">{prompt.name}</span>
              </div>
              {prompt.description && (
                <p className="text-xs text-[#8b949e] mt-0.5 ml-5">{prompt.description}</p>
              )}
              {prompt.arguments && prompt.arguments.length > 0 && (
                <div className="mt-1 ml-5 flex flex-wrap gap-1">
                  {prompt.arguments.map(arg => (
                    <span key={arg.name} className="text-xs bg-[#161b22] px-1.5 py-0.5 rounded border border-[#30363d] font-mono">
                      {arg.name}{arg.required ? '*' : ''}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-[#8b949e] text-center py-4">No prompts or not connected</p>
          )}
        </div>
        {/* Prompt preview + call panel */}
        {selectedPrompt && (
          <div className="flex-1 border-t border-[#30363d] flex flex-col min-h-0 overflow-auto">
            <div className="px-3 py-2 border-b border-[#30363d] flex items-center justify-between">
              <span className="text-xs font-mono text-[#8b949e]">💬 {selectedPrompt.name}</span>
              <button onClick={() => { setSelectedPrompt(null); setPromptResult(null); setPromptError(null); }}
                className="text-xs text-[#8b949e] hover:text-[#e6edf3]">✕</button>
            </div>
            <div className="p-3 space-y-3 flex-1">
              {/* Args form */}
              {selectedPrompt.arguments && selectedPrompt.arguments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-[#8b949e] font-mono uppercase tracking-wider">Arguments</p>
                  {selectedPrompt.arguments.map(arg => (
                    <div key={arg.name}>
                      <label className="text-xs text-[#8b949e] font-mono">
                        {arg.name}{arg.required ? ' *' : ''}
                        {arg.description && <span className="text-[#8b949e]/60 ml-1">— {arg.description}</span>}
                      </label>
                      <input
                        value={promptArgs[arg.name] || ''}
                        onChange={e => setPromptArgs(prev => ({ ...prev, [arg.name]: e.target.value }))}
                        placeholder={arg.description || arg.name}
                        className="w-full mt-1 bg-[#0d1117] border border-[#30363d] rounded px-2 py-1.5 text-xs text-[#e6edf3] font-mono focus:border-[#58a6ff] outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={handleCallPrompt}
                disabled={promptLoading}
                className="w-full px-4 py-2 bg-[#58a6ff] hover:bg-[#58a6ff]/80 disabled:opacity-40 text-[#0d1117] text-sm font-bold rounded transition-colors flex items-center justify-center gap-2"
              >
                {promptLoading ? <span className="animate-spin">◌</span> : null}
                {promptLoading ? 'Calling...' : '💬 Call Prompt'}
              </button>
              {promptError ? (
                <div className="rounded p-2 text-xs font-mono text-[#f85149] bg-[#f85149]/10 border border-[#f85149]/40">
                  ❌ {promptError}
                </div>
              ) : null}
              {promptResult != null ? (
                <div>
                  <p className="text-xs text-[#8b949e] font-mono mb-1">Response</p>
                  <pre className="bg-[#0d1117] rounded p-2 text-xs font-mono text-[#e6edf3] overflow-auto max-h-64 border border-[#30363d] whitespace-pre-wrap">
                    {String(JSON.stringify(promptResult, null, 2))}
                  </pre>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
