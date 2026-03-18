import React, { useState, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';

export default function ChatInput({ onSubmit, loading }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  function handleSubmit() {
    const q = value.trim();
    if (!q || loading) return;
    onSubmit(q);
    setValue('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="border-t border-white/5 bg-bg-card/40 backdrop-blur-2xl p-4 flex-shrink-0 relative z-10">
      <div className="flex gap-3 items-end max-w-4xl mx-auto">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            maxLength={600}
            rows={2}
            placeholder='Ask anything... e.g. "Show monthly revenue by category for 2023"'
            className="input-box w-full focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 px-4 py-3 text-sm text-slate-200 placeholder-slate-500 resize-none outline-none transition-all shadow-inner shadow-black/20"
          />
          <span className="absolute bottom-2 right-3 text-xs text-slate-600">
            {value.length}/600
          </span>
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading || !value.trim()}
          className="h-12 w-12 flex-shrink-0 rounded-xl bg-indigo-600 hover:bg-gradient-to-br hover:from-accent-indigo hover:to-accent-purple disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all disabled:hover:bg-indigo-600 shadow-lg shadow-indigo-500/20"
        >
          {loading
            ? <Loader2 size={18} className="text-white animate-spin" />
            : <Send size={18} className="text-white" />
          }
        </button>
      </div>
    </div>
  );
}