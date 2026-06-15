import { useState } from 'react';
import type { MCPTool } from '../types';

const API = '';

interface Props {
  tools: MCPTool[];
  selectedTool: MCPTool | null;
  onSelectTool: (t: MCPTool) => void;
}

export default function RequestBuilder({ tools, selectedTool, onSelectTool }: Props) {
  const [toolName, setToolName] = useState(selectedTool?.name ?? '');
  const [args, setArgs] = useState('{}');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ content?: string; isError?: boolean } | null>(null);

  function handleToolChange(name: string) {
    setToolName(name);
    const t = tools.find(t => t.name === name);
    if (t) onSelectTool(t);
  }

  async function handleSend() {
    if (!toolName) return;
    let parsedArgs: object;
    try { parsedArgs = JSON.parse(args); } catch { alert('Invalid JSON in arguments'); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API}/api/tools/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: toolName, arguments: parsedArgs }),
      });
      const data = await res.json();
      setResult({
        content: JSON.stringify(data.response || data, null, 2),
        isError: data.status === 'error',
      });
    } catch (err) {
      setResult({ content: String(err), isError: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono text-text-muted uppercase tracking-wider">Request Builder</span>
      </div>

      {/* Tool selector */}
      <div className="flex gap-2">
        <select
          value={toolName}
          onChange={e => handleToolChange(e.target.value)}
          className="flex-1 bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:border-accent outline-none"
        >
          <option value="">Select a tool...</option>
          {tools.map(t => (
            <option key={t.name} value={t.name}>{t.name}</option>
          ))}
        </select>
        <button
          onClick={handleSend}
          disabled={!toolName || loading}
          className="px-4 py-2 bg-accent hover:bg-accent/80 disabled:opacity-40 disabled:cursor-not-allowed text-bg text-sm font-bold rounded transition-colors flex items-center gap-2"
        >
          {loading ? <span className="animate-spin">◌</span> : null}
          Send
        </button>
      </div>

      {/* Args editor */}
      <div className="flex-1 flex flex-col min-h-0">
        <label className="text-xs text-text-muted font-mono mb-1">Arguments (JSON)</label>
        <textarea
          value={args}
          onChange={e => setArgs(e.target.value)}
          className="flex-1 bg-bg border border-border rounded p-3 text-sm font-mono text-text-primary focus:border-accent outline-none resize-none"
          spellCheck={false}
        />
      </div>

      {/* Result */}
      {result && (
        <div className={`rounded p-3 text-sm font-mono whitespace-pre-wrap overflow-auto max-h-48 border ${result.isError ? 'bg-error/10 border-error/40 text-error' : 'bg-success/10 border-success/40 text-success'}`}>
          {result.content}
        </div>
      )}
    </div>
  );
}