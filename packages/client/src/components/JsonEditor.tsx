import { useRef, useEffect, useCallback } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: boolean;
  readOnly?: boolean;
}

export default function JsonEditor({ value, onChange, placeholder, error, readOnly }: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  const lines = value.split('\n');
  const lineCount = lines.length || 1;

  const syncScroll = useCallback(() => {
    if (lineRef.current && taRef.current) {
      lineRef.current.scrollTop = taRef.current.scrollTop;
    }
  }, []);

  // Auto-resize height to content
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  }, [value]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newVal = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newVal);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  }

  return (
    <div className={`flex flex-col flex-1 min-h-0 rounded border ${error ? 'border-error/50' : 'border-border'} bg-bg focus-within:${error ? 'border-error' : 'border-accent'}`}
      style={{ '--tw-border-opacity': 1 } as React.CSSProperties}>
      {/* Line numbers gutter */}
      <div className="flex flex-1 min-h-0" style={{ maxHeight: '100%' }}>
        <div
          ref={lineRef}
          className="select-none py-2 px-2 text-right text-text-muted text-xs font-mono leading-[1.5] overflow-hidden flex-shrink-0 border-r bg-surface/50"
          style={{ width: '3rem', minWidth: '3rem' }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className="h-[1.5em]">{i + 1}</div>
          ))}
        </div>
        <textarea
          ref={taRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onScroll={syncScroll}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          placeholder={placeholder}
          className={`flex-1 py-2 px-3 text-sm font-mono text-text-primary bg-transparent resize-none focus:outline-none leading-[1.5] ${readOnly ? 'cursor-default' : ''}`}
          spellCheck={false}
          style={{ minHeight: '6rem' }}
        />
      </div>
    </div>
  );
}
