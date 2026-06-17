import { useState, useRef } from 'react';
import type { MCPTool } from '../types';
import JsonEditor from './JsonEditor';

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
  const [jsonError, setJsonError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  function handleToolChange(name: string) {
    setToolName(name);
    const t = tools.find(t => t.name === name);
    if (t) {
      onSelectTool(t);
      // Auto-fill args from schema if present
      if (t.inputSchema && typeof t.inputSchema === 'object') {
        const props = (t.inputSchema as { properties?: Record<string, unknown> }).properties;
        if (props) {
          const filled: Record<string, unknown> = {};
          Object.keys(props).forEach(k => { filled[k] = ''; });
          setArgs(JSON.stringify(filled, null, 2));
          return;
        }
      }
    }
    setArgs('{}');
  }

  async function handleSend() {
    if (!toolName) return;
    let parsedArgs: object;
    try {
      parsedArgs = JSON.parse(args);
      setJsonError(false);
    } catch {
      setJsonError(true);
      setResult({ content: '❌ Invalid JSON in arguments', isError: true });
      return;
    }
    setLoading(true);
    setResult(null);
    abortRef.current = new AbortController();
    try {
      const res = await fetch(`${API}/api/tools/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: toolName, arguments: parsedArgs }),
        signal: abortRef.current.signal,
      });
      const data = await res.json();
      setResult({
        content: JSON.stringify(data.response || data, null, 2),
        isError: data.status === 'error',
      });
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') {
        setResult({ content: '⏹ Request aborted', isError: false });
      } else {
        setResult({ content: String(err), isError: true });
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  function handleAbort() {
    abortRef.current?.abort();
  }

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-mono text-[#8b949e] uppercase tracking-wider">Request Builder</span>
        {loading && (
          <button
            onClick={handleAbort}
            className="px-3 py-1 bg-[#f85149]/20 border border-[#f85149]/40 text-[#f85149] text-xs rounded hover:bg-[#f85149]/30 transition-colors"
          >
            ⏹ Abort
          </button>
        )}
      </div>

      {/* Tool selector */}
      <div className="flex gap-2">
        <select
          value={toolName}
          onChange={e => handleToolChange(e.target.value)}
          className="flex-1 bg-[#161b22] border border-[#30363d] rounded px-3 py-2 text-sm text-[#e6edf3] focus:border-[#58a6ff] outline-none"
        >
          <option value="">Select a tool...</option>
          {tools.map(t => (
            <option key={t.name} value={t.name}>{t.name}</option>
          ))}
        </select>
        <button
          onClick={handleSend}
          disabled={!toolName || loading}
          className="px-4 py-2 bg-[#58a6ff] hover:bg-[#58a6ff]/80 disabled:opacity-40 disabled:cursor-not-allowed text-[#0d1117] text-sm font-bold rounded transition-colors flex items-center gap-2"
        >
          {loading ? <span className="animate-spin">◌</span> : null}
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>

      {/* Args editor with line numbers */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-[#8b949e] font-mono">Arguments (JSON)</label>
          {jsonError && <span className="text-xs text-[#f85149]">❌ Invalid JSON</span>}
        </div>
        <JsonEditor
          value={args}
          onChange={v => { setArgs(v); setJsonError(false); }}
          placeholder='{ "key": "value" }'
          error={jsonError}
        />
      </div>

      {/* Result */}
      {result && (
        <div className={`rounded p-3 text-sm font-mono whitespace-pre-wrap overflow-auto max-h-48 border ${result.isError ? 'bg-[#f85149]/10 border-[#f85149]/40 text-[#f85149]' : 'bg-[#3fb950]/10 border-[#3fb950]/40 text-[#3fb950]'}`}>
          {result.content}
        </div>
      )}
    </div>
  );
}
