import { useState } from 'react';
import type { TraceEntry } from '../types';

interface Props {
  traces: TraceEntry[];
}

export default function ResponseTracer({ traces }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function copyJson(obj: unknown) {
    await navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
  }

  const filtered = traces.filter(t =>
    !filter || t.tool.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <span className="text-xs font-mono text-text-muted uppercase tracking-wider">Trace ({traces.length})</span>
      </div>
      <input
        value={filter}
        onChange={e => setFilter(e.target.value)}
        placeholder="Filter by tool..."
        className="mx-3 mt-2 bg-bg border border-border rounded px-2 py-1 text-xs text-text-primary placeholder-text-muted focus:border-accent outline-none"
      />
      <div className="flex-1 overflow-auto">
        {filtered.length === 0 && (
          <p className="text-xs text-text-muted text-center px-3 py-6">
            {traces.length === 0 ? 'No requests yet' : 'No matching traces'}
          </p>
        )}
        {filtered.map(entry => {
          const isExpanded = expanded.has(entry.id);
          const isError = entry.status === 'error';
          return (
            <div key={entry.id}
              className={`mx-2 my-1 rounded border transition-colors cursor-pointer ${isError ? 'border-error/40 bg-error/5' : 'border-success/40 bg-success/5'}`}
              onClick={() => toggle(entry.id)}
            >
              <div className="flex items-center justify-between px-2 py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isError ? 'bg-error' : 'bg-success'}`} />
                  <span className="text-xs font-mono text-text-primary truncate">{entry.tool}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-text-muted">{entry.durationMs}ms</span>
                  <button
                    onClick={e => { e.stopPropagation(); copyJson({ request: entry.request, response: entry.response }); }}
                    className="text-text-muted hover:text-text-primary text-xs px-1"
                    title="Copy JSON"
                  >⎘</button>
                </div>
              </div>
              {isExpanded && (
                <div className="px-2 pb-2 space-y-1" onClick={e => e.stopPropagation()}>
                  <div>
                    <p className="text-xs text-text-muted mb-0.5">Request</p>
                    <pre className="bg-bg rounded p-2 text-xs font-mono text-text-primary overflow-auto max-h-32 border border-border">
                      {JSON.stringify(entry.request, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted mb-0.5">Response</p>
                    <pre className={`bg-bg rounded p-2 text-xs font-mono overflow-auto max-h-48 border ${isError ? 'border-error/40 text-error' : 'border-success/40 text-success'}`}>
                      {JSON.stringify(entry.response, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}