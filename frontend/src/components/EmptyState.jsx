import React, { useState, useEffect } from 'react';
import { BarChart2, ChevronRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function EmptyState({ onSelectQuery, loading, serverInfo, dbSchema }) {
  const [examples, setExamples] = useState([
    'Show me a sample of the data',
    'Summarize the dataset',
  ]);

  useEffect(() => {
    if (!dbSchema || !dbSchema.columns) return;
    
    const columns = dbSchema.columns;
    const numCols = columns.filter(c => c.type === 'INTEGER' || c.type === 'REAL');
    const strCols = columns.filter(c => c.type === 'TEXT');
    const dateCol = strCols.find(c => c.name.toLowerCase().includes('date'));
    
    const newExamples = [];
    
    if (numCols.length > 0 && strCols.length > 0) {
      newExamples.push(`Show total ${numCols[0].name.replace(/_/g, ' ')} by ${strCols[0].name.replace(/_/g, ' ')}`);
    }
    
    if (dateCol && numCols.length > 0) {
      newExamples.push(`What is the monthly trend for ${numCols[0].name.replace(/_/g, ' ')}?`);
    }
    
    if (strCols.length > 1 && numCols.length > 0) {
      newExamples.push(`Compare average ${numCols[0].name.replace(/_/g, ' ')} across ${strCols[0].name.replace(/_/g, ' ')}`);
    }

    if (newExamples.length > 0) {
      setExamples(newExamples);
    }
  }, [dbSchema]);
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-pulse">
        <Loader2 size={48} className="text-indigo-500 animate-spin mb-6" />
        <h2 className="font-display text-2xl font-semibold text-white mb-3 tracking-wide">AI is analyzing your request...</h2>
        <p className="text-sm text-slate-400 max-w-sm mb-12 leading-relaxed">
          Generating SQL, querying the database, and formatting insights.
        </p>
        
        {/* Skeleton structure to imply building the UI */}
        <div className="w-full max-w-2xl bg-bg-card border border-slate-800 rounded-2xl p-6 shadow-2xl">
          <div className="flex gap-4 mb-6">
            <div className="w-12 h-12 rounded-lg bg-slate-800/50"></div>
            <div className="space-y-2 flex-1 pt-1">
              <div className="h-4 bg-slate-800/50 rounded-md w-1/4"></div>
              <div className="h-3 bg-slate-800/50 rounded-md w-3/4"></div>
            </div>
          </div>
          <div className="h-48 bg-slate-800/30 rounded-xl mb-4 w-full"></div>
          <div className="flex gap-4">
            <div className="h-10 bg-slate-800/50 rounded-lg w-1/3"></div>
            <div className="h-10 bg-slate-800/50 rounded-lg w-1/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center mt-[-40px]">
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <div className="w-20 h-20 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mb-6 shadow-[0_0_40px_-10px_rgba(99,102,241,0.3)]">
          <BarChart2 size={32} className="text-indigo-400" />
        </div>
      </motion.div>
      <h1 className="hero-title mb-1">✨ AI Sales Intelligence</h1>
      <p className="hero-subtitle max-w-md mx-auto mb-4 leading-relaxed font-medium">
        Turn your data into decisions instantly. Ask anything to get insights, charts, and predictions.
      </p>
      
      {serverInfo?.ready && (
        <p className="status text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-full mb-10 inline-flex items-center gap-2 shadow-[0_0_15px_-5px_rgba(34,197,94,0.3)]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          AI ready • {serverInfo?.rowCount ? `${Number(serverInfo.rowCount).toLocaleString()} rows loaded` : 'Database ready'}
        </p>
      )}
      
      <div className="flex flex-col gap-3 w-full max-w-lg">
        {examples.map((q, i) => (
          <button
            key={i}
            onClick={() => onSelectQuery(q)}
            className="suggestion-btn group flex items-center gap-4 text-slate-300 hover:text-white px-5 py-4 text-left text-[15px] font-medium"
          >
            <div className="w-8 h-8 rounded-full bg-slate-800 group-hover:bg-indigo-500/20 flex items-center justify-center transition-colors shrink-0">
              <ChevronRight size={16} className="text-slate-500 group-hover:text-indigo-200 transition-colors" />
            </div>
            <span>{q}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
