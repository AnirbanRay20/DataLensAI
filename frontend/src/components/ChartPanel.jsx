import React, { useRef, useState } from 'react';
import { Download, Code2, X, MoreHorizontal, Info, Loader2, Sparkles, MessageSquare } from 'lucide-react';
import ChartRenderer from '../utils/chartRenderer';

const TYPE_LABELS = {
  bar: 'Bar Chart', line: 'Line Chart', area: 'Area Chart',
  pie: 'Pie Chart', donut: 'Donut Chart', scatter: 'Scatter Plot', table: 'Data Table',
};

export default function ChartPanel({ result, onRemove, onFollowUp }) {
  const { chartConfig, data, sql } = result;
  const [showMenu, setShowMenu] = useState(false);
  const [showSQL, setShowSQL] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const [explainError, setExplainError] = useState(false);
  const panelRef = useRef(null);

  async function handleDownload() {
    if (!panelRef.current) return;
    setShowMenu(false);
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(panelRef.current, { backgroundColor: '#1a1d27', scale: 2 });
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chartConfig.title.replace(/\s+/g, '_')}.png`;
    a.click();
  }

  const confidence = chartConfig?.confidence ?? 1;
  const lowConfidence = confidence < 0.7;

  return (
    <div ref={panelRef} className="glass-card flex flex-col animate-fadeInUp mb-6">
      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-2">
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full uppercase tracking-wide">
              {TYPE_LABELS[chartConfig?.chartType] || 'Chart'}
            </span>
            {lowConfidence && (
              <span className="text-xs text-amber-500 flex items-center gap-1">
                <Info size={11} /> Moderate confidence
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-white font-display leading-snug">
            {chartConfig?.title || 'Query Result'}
          </h3>
        </div>
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowMenu(s => !s)}
            className="text-slate-600 hover:text-slate-300 p-1 rounded-md hover:bg-bg-elevated transition-colors"
          >
            <MoreHorizontal size={16} />
          </button>
          <div className={`dropdown-menu ${showMenu ? 'show' : ''}`}>
            <button onClick={handleDownload} className="dropdown-item">
              <Download size={14} /> <span>Download PNG</span>
            </button>
            <button onClick={() => { setShowSQL(s => !s); setShowMenu(false); }} className="dropdown-item">
              <Code2 size={14} /> <span>{showSQL ? 'Hide SQL' : 'View SQL'}</span>
            </button>
            <button 
              onClick={async () => { 
                setShowMenu(false);
                if (explanation || isExplaining) return;
                
                setIsExplaining(true);
                setExplainError(false);
                try {
                  const { explainChart } = await import('../utils/api');
                  const res = await explainChart(result.question, result.sql, result.data);
                  setExplanation(res.explanation);
                } catch (e) {
                  setExplainError(true);
                } finally {
                  setIsExplaining(false);
                }
              }} 
              className="dropdown-item"
              disabled={isExplaining}
              style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
            >
              {isExplaining ? <Loader2 size={14} className="animate-spin" /> : <Info size={14} />}
              <span className={isExplaining ? 'text-indigo-400 opacity-80' : 'text-indigo-300'}>{isExplaining ? 'Analyzing...' : 'Explain This Chart'}</span>
            </button>
            <button onClick={onRemove} className="dropdown-item danger">
              <X size={14} /> <span>Remove</span>
            </button>
          </div>
        </div>
      </div>

      {/* SQL viewer */}
      {showSQL && sql && (
        <div className="mx-4 mb-2 bg-bg-elevated rounded-lg p-3 border border-slate-700">
          <p className="text-xs font-mono text-emerald-400 whitespace-pre-wrap break-all">{sql}</p>
        </div>
      )}

      {/* AI Insight Header Banner */}
      {chartConfig?.insight && (
        <div className="mx-4 mb-2 ai-glow-box flex gap-3 items-start animate-fadeInUp">
          <div className="mt-0.5 shrink-0 opacity-90">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold opacity-90 mb-0.5 uppercase tracking-wide">AI Analysis</p>
            <p className="text-sm leading-relaxed font-body">
              {chartConfig.insight}
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="px-3 pb-2" style={{ height: 280 }}>
        <ChartRenderer
          chartType={chartConfig?.chartType}
          data={data}
          xKey={chartConfig?.xKey}
          yKey={chartConfig?.yKey}
          yKeys={chartConfig?.yKeys}
        />
      </div>

      {/* KPIs */}
      {chartConfig?.kpis?.length > 0 && (
        <div className="px-4 pb-3 flex gap-3 flex-wrap">
          {chartConfig.kpis.map((kpi, i) => (
            <div key={i} className="bg-bg-elevated rounded-lg px-3 py-2">
              <p className="text-xs text-slate-500">{kpi.label}</p>
              <p className="text-sm font-semibold text-white">{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Dynamic Executive Summary (Explain This Chart) */}
      {(isExplaining || explanation || explainError) && (
        <div className="mx-4 mb-4 mt-2 p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl rounded-tl-sm animate-fadeInUp">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-indigo-400" />
            <h4 className="text-xs font-semibold text-indigo-300 uppercase tracking-widest">Executive Summary</h4>
          </div>
          
          {isExplaining && (
            <div className="flex items-center gap-3 text-sm text-slate-400 font-medium py-2">
               <Loader2 size={16} className="animate-spin text-indigo-500" />
               Drafting analysis based on the latest query context...
            </div>
          )}
          
          {explainError && (
             <p className="text-sm text-red-400 py-1">⚠️ Failed to generate explanation. Please try again.</p>
          )}

          {explanation && (
            <div className="text-sm text-slate-300 leading-relaxed font-body whitespace-pre-wrap space-y-3">
              {explanation}
            </div>
          )}
        </div>
      )}

      {/* NEW: Follow-up bar at bottom */}
      <div className="border-t border-slate-800 px-4 py-2 flex items-center justify-between">
        <button
          onClick={() => onFollowUp(chartConfig?.title, sql)}
          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors"
        >
          <MessageSquare size={11} />
          Follow up on this chart
        </button>
        <div className="flex items-center gap-2">
          {result.isFollowUp && (
            <span className="text-xs text-slate-600 bg-bg-elevated px-2 py-0.5 rounded-full">
              follow-up
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
