import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import StatCards from './components/StatCards';
import ChatInput from './components/ChatInput';
import EmptyState from './components/EmptyState';
import { queryDashboard, fetchHealth, fetchSchema, startForecastJob } from './utils/api';

const MAX_PANELS = 1; // Limit to 1 panel!

export default function App() {
  const [panels, setPanels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [serverInfo, setServerInfo] = useState({ ready: false, rowCount: null });
  const [liveEvent, setLiveEvent] = useState(null); // Real-time events state
  const [dbSchema, setDbSchema] = useState(null);

  useEffect(() => {
    // 1. Initial Health Check
    async function init() {
      try {
        const healthData = await fetchHealth();
        setServerInfo({ ready: true, rowCount: healthData.rowCount });
        
        const schema = await fetchSchema();
        setDbSchema(schema);
      } catch (err) {
        setServerInfo({ ready: false, rowCount: null });
      }
    }
    
    init();

    // 2. Initialize Server-Sent Events (SSE) connection
    const eventSource = new EventSource('/api/stream');

    eventSource.onopen = () => {
      console.log('[SSE] Connection Opened');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE Event Received]', data);

        // Display generic notifications/updates in the UI
        if (data.type === 'notification' || data.type === 'update') {
          setLiveEvent(data.payload);
          
          if (data.type === 'notification' && typeof data.payload === 'string' && data.payload.includes('Successfully loaded')) {
            // Re-fetch health to update the loaded row count in the Navbar
            fetchHealth().then(res => setServerInfo({ ready: true, rowCount: res.rowCount }));
            fetchSchema().then(schema => setDbSchema(schema));
          }

          // Auto-hide the toast after 5 seconds
          setTimeout(() => {
            setLiveEvent(null);
          }, 5000);
        }

        // Handle completed ASYNC JOBS (like forecasting)
        if (data.type === 'job_complete') {
          console.log('[SSE] Job Completed:', data.jobId);
          setLiveEvent(`Calculation for "${data.payload.question}" is complete!`);
          
          setTimeout(() => setLiveEvent(null), 5000);

          // Add the newly generated result to the dashboard!
          const panel = {
            id: `panel_${data.jobId}`, // Use the jobId for the panel
            question: data.payload.question,
            ...data.payload,
          };
          
          setPanels(prev => [panel, ...prev].slice(0, MAX_PANELS));
          
          // Append to history
          const assistantMsg = { 
            role: 'assistant', 
            content: `Generated forecast chart: ${data.payload.chartConfig?.title}` 
          };
          setConversationHistory(prev => [...prev, assistantMsg]);
        }
      } catch (err) {
        console.error('[SSE] Failed to parse message', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('[SSE] Connection Error', err);
      // EventSource tries to reconnect automatically by default, 
      // but if the server died, we might want to close it:
      // eventSource.close();
    };

    // Cleanup on unmount
    return () => {
      console.log('[SSE] Closing Connection');
      eventSource.close();
    };
  }, []);

  async function handleQuery(question) {
    if (!question.trim() || loading) return;
    setLoading(true);
    setError(null);

    const userMsg = { role: 'user', content: question };
    const newConvoHistory = [...conversationHistory, userMsg];
    const isForecastQuery = question.toLowerCase().includes('predict') || question.toLowerCase().includes('forecast');

    try {
      if (isForecastQuery) {
        // ─── ASYNC JOB FLOW (Predictive Analytics) ───────────────────────────
        const jobResponse = await startForecastJob(question);
        
        // Show the initial toast notification
        setLiveEvent(`Background task started: ${jobResponse.jobId}`);
        setTimeout(() => setLiveEvent(null), 4000);
        
        // Update history, but don't add a panel yet! That happens via SSE.
        setHistory(prev => [{ question, timestamp: new Date() }, ...prev]);
        setConversationHistory(newConvoHistory);
        
      } else {
        // ─── SYNCHRONOUS FLOW (Standard Dashboard Query) ─────────────────────
        const result = await queryDashboard(question, conversationHistory);

        if (result.error) {
          setError({ type: result.error, message: result.userMessage });
          setConversationHistory([...newConvoHistory, { role: 'assistant', content: result.userMessage }]);
        } else {
          const panel = {
            id: `panel_${Date.now()}`,
            question,
            ...result,
          };
          setPanels(prev => [panel, ...prev].slice(0, MAX_PANELS));
          setHistory(prev => [{ question, timestamp: new Date() }, ...prev]);
          const assistantMsg = { role: 'assistant', content: `Generated ${result.chartConfig?.chartType} chart: ${result.chartConfig?.title}` };
          setConversationHistory([...newConvoHistory, assistantMsg]);
        }
      }
    } catch (err) {
      setError({ type: 'SERVER_ERROR', message: 'Could not reach the server. Is the backend running?' });
    } finally {
      setLoading(false);
    }
  }

  function removePanel(id) {
    setPanels(prev => prev.filter(p => p.id !== id));
  }

  const showEmptyState = panels.length === 0 && !error;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-transparent relative">
      
      {/* Live Event Notification Toast */}
      {liveEvent && (
        <div className="absolute top-20 right-6 z-50 ai-glow-box px-4 py-3 flex items-center gap-3 animate-pulse border border-white/10">
          <div className="bg-white/20 p-1.5 rounded-lg shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold tracking-wide text-blue-50">LIVE UPDATE</p>
            <p className="text-sm font-medium mt-0.5 max-w-[250px] truncate">
              {typeof liveEvent === 'string' ? liveEvent : liveEvent.message || JSON.stringify(liveEvent)}
            </p>
          </div>
        </div>
      )}

      <Navbar rowCount={serverInfo.rowCount} serverReady={serverInfo.ready} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          history={history}
          onSelectQuery={handleQuery}
          onClearHistory={() => { setHistory([]); setConversationHistory([]); }}
          dbSchema={dbSchema}
        />
        <main className="flex flex-col flex-1 overflow-hidden">
          {showEmptyState ? (
            <EmptyState onSelectQuery={handleQuery} loading={loading} serverInfo={serverInfo} dbSchema={dbSchema} />
          ) : (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="px-6 pt-5">
                <StatCards dbSchema={dbSchema} />
              </div>
              <Dashboard
                panels={panels}
                loading={loading}
                error={error}
                onRemovePanel={removePanel}
                onDismissError={() => setError(null)}
              />
            </div>
          )}
          <ChatInput onSubmit={handleQuery} loading={loading} />
        </main>
      </div>
    </div>
  );
}
