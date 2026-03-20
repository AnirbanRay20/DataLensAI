import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import StatCards from './components/StatCards';
import ChatInput from './components/ChatInput';
import EmptyState from './components/EmptyState';
import { queryDashboard, fetchHealth, fetchSchema, startForecastJob } from './utils/api';

const MAX_PANELS = 6;

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

export default function App() {
  const [panels, setPanels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [serverInfo, setServerInfo] = useState({ ready: false, rowCount: null });
  const [liveEvent, setLiveEvent] = useState(null);
  const [dbSchema, setDbSchema] = useState(null);
  const [followUpContext, setFollowUpContext] = useState(null);
  const [activeDataset, setActiveDataset] = useState('amazon_sales.csv');
  const [uploadingCsv, setUploadingCsv] = useState(false);

  function handleFollowUp(chartTitle, sql) {
    setFollowUpContext({ chartTitle, sql });
    setTimeout(() => document.querySelector('textarea')?.focus(), 100);
  }

  useEffect(() => {
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

    const eventSource = new EventSource('/api/stream');
    eventSource.onopen = () => console.log('[SSE] Connection Opened');
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'notification' || data.type === 'update') {
          setLiveEvent(data.payload);
          if (data.type === 'notification' && typeof data.payload === 'string' && data.payload.includes('Successfully loaded')) {
            fetchHealth().then(res => setServerInfo({ ready: true, rowCount: res.rowCount }));
            fetchSchema().then(schema => setDbSchema(schema));
          }
          setTimeout(() => setLiveEvent(null), 5000);
        }
        if (data.type === 'job_complete') {
          setLiveEvent(`Calculation for "${data.payload.question}" is complete!`);
          setTimeout(() => setLiveEvent(null), 5000);
          const panel = { id: `panel_${data.jobId}`, question: data.payload.question, ...data.payload };
          setPanels(prev => [panel, ...prev].slice(0, MAX_PANELS));
          setConversationHistory(prev => [...prev, { role: 'assistant', content: `Generated forecast chart: ${data.payload.chartConfig?.title}` }]);
        }
      } catch (err) {
        console.error('[SSE] Failed to parse message', err);
      }
    };
    eventSource.onerror = (err) => console.error('[SSE] Connection Error', err);
    return () => { console.log('[SSE] Closing'); eventSource.close(); };
  }, []);

  async function handleUploadCsv(file) {
    if (!file || !file.name.endsWith('.csv')) {
      setError({ type: 'UPLOAD_ERROR', message: 'Please upload a valid .csv file.' });
      return;
    }
    setUploadingCsv(true);
    setLiveEvent(`Uploading ${file.name}...`);
    try {
      const formData = new FormData();
      formData.append('csv', file);
      const res = await fetch(`${BASE}/upload-csv`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setActiveDataset(file.name);
      const [newHealth, newSchema] = await Promise.all([fetchHealth(), fetchSchema()]);
      setServerInfo({ ready: true, rowCount: newHealth.rowCount });
      setDbSchema(newSchema);
      setPanels([]);
      setConversationHistory([]);
      setLiveEvent(`✓ ${file.name} loaded — ${newHealth.rowCount?.toLocaleString()} rows ready`);
      setTimeout(() => setLiveEvent(null), 4000);
    } catch (err) {
      setError({ type: 'UPLOAD_ERROR', message: `Upload failed: ${err.message}` });
      setLiveEvent(null);
    }
    setUploadingCsv(false);
  }

  async function handleQuery(question) {
    if (!question.trim() || loading) return;
    setLoading(true);
    setError(null);
    const finalQuestion = followUpContext
      ? `[Follow-up to chart: "${followUpContext.chartTitle}"] ${question}`
      : question;
    const userMsg = { role: 'user', content: finalQuestion };
    const newConvoHistory = [...conversationHistory, userMsg];
    const isForecastQuery = finalQuestion.toLowerCase().includes('predict') || finalQuestion.toLowerCase().includes('forecast');
    setFollowUpContext(null);
    try {
      if (isForecastQuery) {
        const jobResponse = await startForecastJob(question);
        setLiveEvent(`Background task started: ${jobResponse.jobId}`);
        setTimeout(() => setLiveEvent(null), 4000);
        setHistory(prev => [{ question, timestamp: new Date() }, ...prev]);
        setConversationHistory(newConvoHistory);
      } else {
        const result = await queryDashboard(question, conversationHistory);
        if (result.error) {
          setError({ type: result.error, message: result.userMessage });
          setConversationHistory([...newConvoHistory, { role: 'assistant', content: result.userMessage }]);
        } else {
          const panel = { id: `panel_${Date.now()}`, question, ...result };
          setPanels(prev => [panel, ...prev].slice(0, MAX_PANELS));
          setHistory(prev => [{ question, timestamp: new Date() }, ...prev]);
          setConversationHistory([...newConvoHistory, {
            role: 'assistant',
            content: `Generated ${result.chartConfig?.chartType} chart: ${result.chartConfig?.title}`,
          }]);
        }
      }
    } catch (err) {
      setError({ type: 'SERVER_ERROR', message: 'Could not reach the server. Is the backend running?' });
    } finally {
      setLoading(false);
    }
  }

  function removePanel(id) { setPanels(prev => prev.filter(p => p.id !== id)); }

  const showEmptyState = panels.length === 0 && !error;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-transparent relative">
      {liveEvent && (
        <div className="absolute top-20 right-6 z-50 ai-glow-box px-4 py-3 flex items-center gap-3 animate-pulse border border-white/10">
          <div className="bg-white/20 p-1.5 rounded-lg shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold tracking-wide text-blue-50">{uploadingCsv ? 'UPLOADING CSV' : 'LIVE UPDATE'}</p>
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
          activeDataset={activeDataset}
          onUploadCsv={handleUploadCsv}
          uploadingCsv={uploadingCsv}
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
                onFollowUp={handleFollowUp}
              />
            </div>
          )}
          <ChatInput
            onSubmit={handleQuery}
            loading={loading}
            conversationHistory={conversationHistory}
            followUpContext={followUpContext}
            onClearFollowUp={() => setFollowUpContext(null)}
          />
        </main>
      </div>
    </div>
  );
}
