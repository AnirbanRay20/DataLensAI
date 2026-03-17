import React, { useEffect } from 'react';
import { AlertTriangle, X, HelpCircle } from 'lucide-react';

export default function ErrorBanner({ error, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 8000);
    return () => clearTimeout(timer);
  }, [error]);

  const isCannotAnswer = error?.type === 'CANNOT_ANSWER';
  const isNoData = error?.type === 'NO_DATA';

  return (
    <div className="bg-bg-card border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3 animate-fadeInUp">
      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
        {isCannotAnswer ? <HelpCircle size={16} className="text-amber-400" /> : <AlertTriangle size={16} className="text-amber-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-300 mb-1">
          {isCannotAnswer ? "Question out of scope" : isNoData ? "No results found" : "Something went wrong"}
        </p>
        <p className="text-xs text-slate-400">{error?.message}</p>
      </div>
      <button onClick={onDismiss} className="text-slate-600 hover:text-slate-400">
        <X size={14} />
      </button>
    </div>
  );
}
