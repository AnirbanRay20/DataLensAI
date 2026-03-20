import React, { useState, useRef } from 'react';
import { Send, Loader2, X, Link } from 'lucide-react';

export default function ChatInput({ onSubmit, loading, followUpContext, onClearFollowUp }) {
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
      <div className="flex flex-col gap-2 max-w-4xl mx-auto border border-transparent">
        {followUpContext && (
          <div className="flex items-center justify-between bg-indigo-500/10 border border-indigo-500/20 px-3 py-2 rounded-lg ml-0 mr-14">
            <div className="flex items-center gap-2 overflow-hidden">
              <Link size={12} className="text-indigo-400 shrink-0" />
              <span className="text-xs text-indigo-300 truncate font-medium">Following up on: {followUpContext.chartTitle || 'Chart context'}</span>
            </div>
            <button onClick={onClearFollowUp} className="text-indigo-400 hover:text-indigo-200 transition-colors shrink-0 p-1">
              <X size={12} />
            </button>
          </div>
        )}
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              maxLength={600}
              rows={2}
              placeholder={followUpContext ? 'Ask a follow up question...' : 'Ask anything... e.g. "Show monthly revenue by category for 2023"'}
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
    </div>
  );
}