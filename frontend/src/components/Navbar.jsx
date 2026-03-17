import React from 'react';
import { BarChart2, Zap } from 'lucide-react';

export default function Navbar({ rowCount, serverReady }) {
  return (
    <nav className="h-14 bg-bg-card/40 backdrop-blur-2xl border-b border-white/5 flex items-center justify-between px-6 flex-shrink-0 z-10">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
          <BarChart2 size={16} className="text-white" />
        </div>
        <span className="font-display text-base font-semibold text-white tracking-tight">
          DataLens AI
        </span>
      </div>
      <div className="flex items-center gap-3">
        {serverReady && (
          <div className="flex items-center gap-2 bg-bg-elevated px-3 py-1.5 rounded-full border border-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-400 font-medium">
              {rowCount ? `${Number(rowCount).toLocaleString()} rows loaded` : 'Connected'}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Zap size={12} className="text-yellow-500" />
          <span>Powered by Groq</span>
        </div>
      </div>
    </nav>
  );
}
