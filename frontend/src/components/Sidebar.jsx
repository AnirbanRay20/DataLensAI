import React, { useState, useEffect, useMemo } from 'react';
import { MessageSquare, Trash2, ChevronRight, Sparkles, Clock, Database, Upload, Loader2 } from 'lucide-react';

const HISTORY_KEY = 'datalens_query_history';

const AMAZON_SUGGESTED = [
  'Show total revenue by product category',
  'Monthly revenue trend for 2023',
  'Revenue breakdown by customer region',
  'Payment method distribution',
  'Average product rating by category',
  'Top 5 months by order volume',
  'Correlation between discount % and revenue',
  'Best performing categories in Asia',
];

function generateSuggestedQueries(schema) {
  if (!schema || !schema.columns || schema.columns.length === 0) return AMAZON_SUGGESTED;

  const cols = schema.columns;
  const tableName = schema.datasetName || 'the dataset';
  const numericCols = cols.filter(c => c.type === 'REAL' || c.type === 'INTEGER');
  const textCols = cols.filter(c => c.type === 'TEXT');
  const dateCols = cols.filter(c =>
    c.name.includes('date') || c.name.includes('time') ||
    c.name.includes('year') || c.name.includes('month')
  );

  const queries = [];
  queries.push(`Show me a sample of the data from ${tableName}`);
  if (numericCols.length >= 1) {
    queries.push(`What is the total ${numericCols[0].name.replace(/_/g, ' ')}?`);
    queries.push(`Show average ${numericCols[0].name.replace(/_/g, ' ')} as a chart`);
  }
  if (numericCols.length >= 2)
    queries.push(`Show correlation between ${numericCols[0].name.replace(/_/g, ' ')} and ${numericCols[1].name.replace(/_/g, ' ')}`);
  if (textCols.length >= 1) {
    queries.push(`Show distribution of ${textCols[0].name.replace(/_/g, ' ')} as a pie chart`);
    queries.push(`Count records by ${textCols[0].name.replace(/_/g, ' ')}`);
  }
  if (textCols.length >= 1 && numericCols.length >= 1)
    queries.push(`Compare ${numericCols[0].name.replace(/_/g, ' ')} across different ${textCols[0].name.replace(/_/g, ' ')}`);
  if (textCols.length >= 2 && numericCols.length >= 1)
    queries.push(`Show top 5 ${textCols[0].name.replace(/_/g, ' ')} by ${numericCols[0].name.replace(/_/g, ' ')}`);
  if (dateCols.length >= 1 && numericCols.length >= 1) {
    queries.push(`Show ${numericCols[0].name.replace(/_/g, ' ')} trend over time`);
    queries.push(`Monthly breakdown of ${numericCols[0].name.replace(/_/g, ' ')}`);
  }
  if (numericCols.length >= 1)
    queries.push(`Show distribution of ${numericCols[0].name.replace(/_/g, ' ')} as a histogram`);

  return queries.slice(0, 8);
}

export default function Sidebar({ history, onSelectQuery, onClearHistory, dbSchema, activeDataset, onUploadCsv, uploadingCsv }) {
  const [localHistory, setLocalHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    if (history && history.length > 0) {
      setLocalHistory(prev => {
        const merged = [...history, ...prev];
        const seen = new Set();
        const deduped = merged.filter(item => {
          if (seen.has(item.question)) return false;
          seen.add(item.question);
          return true;
        }).slice(0, 50);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(deduped));
        return deduped;
      });
    }
  }, [history]);

  function handleClear() {
    setLocalHistory([]);
    localStorage.removeItem(HISTORY_KEY);
    onClearHistory();
  }

  const suggestedQueries = useMemo(() => generateSuggestedQueries(dbSchema), [dbSchema]);

  return (
    <aside className="w-72 bg-bg-card border-r border-slate-800 flex flex-col h-full overflow-hidden flex-shrink-0">

      {/* ── Active Dataset + Upload — fixed ── */}
      <div className="p-3 border-b border-slate-800 flex-shrink-0">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Active Dataset
        </p>
        <div className="flex items-center gap-2 bg-bg-elevated border border-slate-700 rounded-xl px-3 py-2 mb-2">
          <Database size={13} className="text-indigo-400 flex-shrink-0" />
          <span className="text-xs text-slate-300 truncate font-medium">
            {activeDataset || 'amazon_sales.csv'}
          </span>
        </div>
        <label className={`flex items-center justify-center gap-2 w-full border text-xs font-medium py-2.5 px-3 rounded-xl transition-all ${
          uploadingCsv
            ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-400/50 cursor-not-allowed'
            : 'bg-indigo-600/20 hover:bg-indigo-600/30 border-indigo-500/40 hover:border-indigo-500/70 text-indigo-300 hover:text-indigo-200 cursor-pointer'
        }`}>
          {uploadingCsv
            ? <><Loader2 size={13} className="animate-spin" /><span>Uploading...</span></>
            : <><Upload size={13} /><span>Upload Custom CSV</span></>
          }
          <input type="file" accept=".csv" className="hidden" disabled={uploadingCsv}
            onChange={e => { const f = e.target.files[0]; if (f && onUploadCsv) onUploadCsv(f); e.target.value = ''; }}
          />
        </label>
      </div>

      {/* ── Suggested Queries — 35% of remaining space ── */}
      <div className="flex flex-col border-b border-slate-800" style={{ flex: '0 0 35%', minHeight: 0 }}>
        <div className="px-3 pt-3 pb-2 flex items-center gap-2 flex-shrink-0">
          <Sparkles size={11} className="text-indigo-400" />
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Suggested</h2>
          {dbSchema && dbSchema.datasetName !== 'amazon_sales.csv' && (
            <span className="text-xs bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded-full">auto</span>
          )}
        </div>
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#50ab46ff transparent' }}
        >
          <div className="flex flex-col gap-0.5">
            {suggestedQueries.map((q, i) => (
              <button
                key={i}
                onClick={() => onSelectQuery(q)}
                className="text-left text-xs text-slate-400 hover:text-white hover:bg-bg-elevated px-2.5 py-1.5 rounded-lg transition-colors flex items-start gap-2 group w-full"
              >
                <ChevronRight size={10} className="text-indigo-500 flex-shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform" />
                <span className="leading-relaxed" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {q}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── History — 65% of remaining space ── */}
      <div className="flex flex-col" style={{ flex: '0 0 65%', minHeight: 0 }}>
        <div className="px-3 py-2.5 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Clock size={12} className="text-slate-500" />
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">History</h2>
            {localHistory.length > 0 && (
              <span className="text-xs bg-bg-elevated text-slate-500 px-1.5 py-0.5 rounded-full">
                {localHistory.length}
              </span>
            )}
          </div>
          {localHistory.length > 0 && (
            <button onClick={handleClear} className="text-slate-600 hover:text-red-400 transition-colors" title="Clear history">
              <Trash2 size={12} />
            </button>
          )}
        </div>
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#51b68cff transparent' }}
        >
          {localHistory.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare size={16} className="text-slate-700 mx-auto mb-1.5" />
              <p className="text-slate-600 text-xs">No queries yet</p>
              <p className="text-slate-700 text-xs mt-1">Your history will appear here</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {localHistory.map((item, i) => (
                <button
                  key={i}
                  onClick={() => onSelectQuery(item.question)}
                  className="w-full text-left group hover:bg-bg-elevated rounded-xl px-3 py-2 transition-colors border border-transparent hover:border-slate-700"
                >
                  <div className="flex items-start gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${i === 0 ? 'bg-indigo-500' : 'bg-slate-700'}`} />
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-xs text-slate-300 group-hover:text-white leading-relaxed transition-colors"
                        style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}
                      >
                        {item.question}
                      </p>
                      {item.timestamp && (
                        <p className="text-xs text-slate-600 mt-0.5">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {' · '}
                          {new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

    </aside>
  );
}
