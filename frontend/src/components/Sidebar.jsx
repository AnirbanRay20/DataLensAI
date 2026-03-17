import React, { useRef, useState, useEffect, useMemo } from 'react';
import { MessageSquare, Trash2, ChevronRight, Sparkles, Upload, Loader2, Database } from 'lucide-react';
import { uploadCSV } from '../utils/api';

export default function Sidebar({ history, onSelectQuery, onClearHistory, dbSchema }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  // Generate dynamic suggestions based on data types
  useEffect(() => {
    if (!dbSchema || !dbSchema.columns) return;
    
    const newSuggestions = [];
    const columns = dbSchema.columns.map(c => ({ name: c.name, type: c.type }));
    
    // Categorize columns
    const numCols = columns.filter(c => c.type === 'INTEGER' || c.type === 'REAL');
    const strCols = columns.filter(c => c.type === 'TEXT');
    
    // Look for a date column (heuristics)
    const dateCol = strCols.find(c => c.name.toLowerCase().includes('date') || c.name.toLowerCase().includes('time') || c.name.toLowerCase() === 'day');

    if (numCols.length > 0) {
      // 1. Basic total of first numeric column
      newSuggestions.push(`Show total ${numCols[0].name.replace(/_/g, ' ')}`);
      
      if (strCols.length > 0) {
        // 2. Breakdown by category
        newSuggestions.push(`Show ${numCols[0].name.replace(/_/g, ' ')} by ${strCols[0].name.replace(/_/g, ' ')}`);
        
        // 3. Top 5 dimensional slice
        newSuggestions.push(`Top 5 ${strCols[0].name.replace(/_/g, ' ')} by ${numCols[0].name.replace(/_/g, ' ')}`);
      }
      
      // 4. Time series trend
      if (dateCol) {
        newSuggestions.push(`Monthly trend of ${numCols[0].name.replace(/_/g, ' ')} over time`);
      }
      
      // 5. Correlation if multiple metrics exist
      if (numCols.length > 1) {
        newSuggestions.push(`Compare ${numCols[0].name.replace(/_/g, ' ')} and ${numCols[1].name.replace(/_/g, ' ')}`);
      }
    }

    // Mix in generic prompts
    if (strCols.length > 0) {
      newSuggestions.push(`What is the distribution of ${strCols[0].name.replace(/_/g, ' ')}?`);
    }
    
    newSuggestions.push('Show me a sample of the data');

    setSuggestions(newSuggestions);
  }, [dbSchema]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      await uploadCSV(file);
      // Wait a tiny bit and let the SSE automatically refresh the UI via App.jsx
    } catch (err) {
      console.error('Failed to upload CSV', err);
      alert('Failed to upload CSV. Ensure backend is running.');
    } finally {
      setUploading(false);
      // Reset input incase they want to upload the same file again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <aside className="w-72 bg-bg-card/40 backdrop-blur-2xl border-r border-white/5 flex flex-col h-full overflow-hidden flex-shrink-0 z-0">
      
      {/* Active Dataset Display */}
      {dbSchema && (
        <div className="p-4 border-b border-indigo-500/10 bg-indigo-900/10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/20 shrink-0">
            <Database size={14} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-indigo-400/80 uppercase tracking-widest mb-0.5">Active Dataset</p>
            <p className="text-sm font-medium text-slate-200 truncate" title={dbSchema.datasetName || 'amazon_sales.csv'}>
              {dbSchema.datasetName || 'amazon_sales.csv'}
            </p>
          </div>
        </div>
      )}

      {/* Upload Section */}
      <div className="p-4 border-b border-white/5">
        <input 
          type="file" 
          accept=".csv" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          style={{ display: 'none' }} 
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 rounded-xl py-3 text-sm font-semibold transition-all shadow-black/20 shadow-inner"
        >
          {uploading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Upload size={16} />
          )}
          {uploading ? 'Processing Data...' : 'Upload Custom CSV'}
        </button>
      </div>

      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Suggested Queries</h2>
          <Sparkles size={12} className="text-indigo-400" />
        </div>
      </div>
      <div className="p-3 flex flex-col gap-1.5 border-b border-slate-800 flex-shrink-0">
        {suggestions.length === 0 ? (
          <p className="text-xs text-slate-500 italic text-center py-2">Loading suggestions...</p>
        ) : (
          suggestions.map((q, i) => (
            <button
              key={i}
              onClick={() => onSelectQuery(q)}
              className="text-left text-xs text-slate-400 hover:text-white hover:bg-bg-elevated px-3 py-2 rounded-lg transition-colors flex items-center gap-2 group"
            >
              <ChevronRight size={11} className="text-indigo-500 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
              <span className="line-clamp-2">{q}</span>
            </button>
          ))
        )}
      </div>

      <div className="p-4 border-b border-white/5 flex items-center justify-between mt-auto">
        <div className="flex items-center gap-2">
          <MessageSquare size={13} className="text-slate-500" />
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">History</h2>
        </div>
        {history.length > 0 && (
          <button
            onClick={onClearHistory}
            className="text-slate-600 hover:text-red-400 transition-colors"
            title="Clear history"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1 max-h-[30vh]">
        {history.length === 0 && (
          <p className="text-slate-600 text-xs text-center mt-8">No queries yet</p>
        )}
        {[...history].reverse().map((item, i) => (
          <button
            key={i}
            onClick={() => onSelectQuery(item.question)}
            className="text-left text-xs text-slate-400 hover:text-white hover:bg-bg-elevated px-3 py-2 rounded-lg transition-colors truncate"
          >
            {item.question}
          </button>
        ))}
      </div>
    </aside>
  );
}
