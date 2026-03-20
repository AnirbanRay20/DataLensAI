require('dotenv').config();
console.log('KEY LOADED:', process.env.GEMINI_API_KEY ? 'YES ✅' : 'NO ❌');

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { initDatabase, loadCSV, runQuery, getSchema } = require('./db');
const { generateSQL, generateChartConfig, explainChartData } = require('./gemini');
const { validateAndSelectChart } = require('./chartSelector');

const app = express();
const PORT = process.env.PORT || 3001;

const requestTimestamps = [];

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '2mb' }));

let rowCount = 0;

// ─── AUTO-CREATE uploads/ FOLDER ─────────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('[Server] Created uploads/ directory');
}

// ─── MULTER ───────────────────────────────────────────────────────────────────
// dest must be a writable folder, field name MUST match frontend ('csv')
const upload = multer({ dest: uploadsDir });

// ─── SSE ──────────────────────────────────────────────────────────────────────
const sseClients = new Set();

function broadcastSSE(data) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try { client.write(message); }
    catch (err) { sseClients.delete(client); }
  }
}

// ─── ROUTES ───────────────────────────────────────────────────────────────────

app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  sseClients.add(res);
  console.log(`[SSE] Client connected. Total: ${sseClients.size}`);
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE Connection Established' })}\n\n`);
  req.on('close', () => { sseClients.delete(res); });
});

app.post('/api/test-broadcast', (req, res) => {
  const { type, payload } = req.body;
  broadcastSSE({ type: type || 'notification', payload: payload || 'This is a live update!' });
  res.json({ success: true, clientsNotified: sseClients.size });
});

const otpRoutes = require('./routes/otp');
app.use('/api', otpRoutes);

// ─── FORECAST JOB ─────────────────────────────────────────────────────────────
const activeJobs = new Map();

app.post('/api/forecast', (req, res) => {
  const { question } = req.body;
  const jobId = `job_${Date.now()}`;
  activeJobs.set(jobId, { status: 'processing', question });

  setTimeout(() => {
    const formattedData = [
      { name: 'Oct 2023', actual: 12000, predicted: 12100 },
      { name: 'Nov 2023', actual: 15400, predicted: 14800 },
      { name: 'Dec 2023', actual: 21000, predicted: 20500 },
      { name: 'Jan 2024', actual: null, predicted: 16000 },
      { name: 'Feb 2024', actual: null, predicted: 14500 },
      { name: 'Mar 2024', actual: null, predicted: 15200 },
    ];

    broadcastSSE({
      type: 'job_complete',
      jobId,
      payload: {
        question: `Forecasting: ${question}`,
        sql: '-- Generated via AI Forecasting Model',
        data: formattedData,
        chartConfig: {
          chartType: 'line',
          title: 'Revenue Forecast (Next 3 Months)',
          xKey: 'name',
          yKeys: ['actual', 'predicted'],
          insight: 'AI anticipates a slight seasonal dip through February before stabilizing in March.',
        },
        rowCount: formattedData.length,
      },
    });

    const job = activeJobs.get(jobId);
    if (job) { job.status = 'completed'; activeJobs.set(jobId, job); }
  }, 6000);

  res.status(202).json({ jobId, status: 'processing', message: 'Forecasting model started in background.' });
});

// ─── HEALTH ───────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', rowCount, message: `${rowCount.toLocaleString()} rows loaded` });
});

// ─── SCHEMA ───────────────────────────────────────────────────────────────────
app.get('/api/schema', (req, res) => {
  const schema = getSchema();
  if (!schema) return res.status(503).json({ error: 'Database not ready' });
  res.json(schema);
});

// ─── KPIs ─────────────────────────────────────────────────────────────────────
app.get('/api/kpis', (req, res) => {
  const schema = getSchema();
  if (!schema) return res.status(503).json({ error: 'Database not ready' });
  try {
    const numCols = schema.columns.filter(c => c.type === 'INTEGER' || c.type === 'REAL');
    const colsList = ['COUNT(*) as _count'];
    numCols.slice(0, 2).forEach((col, i) => {
      colsList.push(`SUM(${col.name}) as sum_${i}`);
      colsList.push(`AVG(${col.name}) as avg_${i}`);
    });
    const data = runQuery(`SELECT ${colsList.join(', ')} FROM sales`)[0];
    const fmt = v => {
      if (!v) return '0';
      const n = parseFloat(v);
      if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
      if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
      return n % 1 === 0 ? n.toString() : n.toFixed(2);
    };
    const kpis = [{ label: 'Total Rows', value: data._count.toLocaleString(), iconType: 'shopping', color: 'text-cyan-400', bg: 'bg-cyan-500/10' }];
    numCols.slice(0, 2).forEach((col, i) => {
      kpis.push({ label: `Total ${col.name.replace(/_/g, ' ')}`, value: fmt(data[`sum_${i}`]), iconType: 'dollar', color: 'text-indigo-400', bg: 'bg-indigo-500/10' });
      kpis.push({ label: `Avg ${col.name.replace(/_/g, ' ')}`, value: fmt(data[`avg_${i}`]), iconType: 'trend', color: 'text-emerald-400', bg: 'bg-emerald-500/10' });
    });
    res.json(kpis.slice(0, 4));
  } catch (e) {
    console.error('[KPI Error]', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── CSV UPLOAD ───────────────────────────────────────────────────────────────
// IMPORTANT: upload.single('csv') — field name must be 'csv' to match frontend FormData
app.post('/api/upload-csv', upload.single('csv'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file received. Make sure you are sending a field named "csv".' });
  }

  const tempPath = req.file.path;

  try {
    console.log(`[UPLOAD] Received: ${req.file.originalname} (${req.file.size} bytes)`);

    // loadCSV from db.js handles all parsing + schema inference + SQLite loading
    const newRowCount = await loadCSV(tempPath, req.file.originalname);

    // Delete temp file
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

    // Update global row count
    rowCount = newRowCount;

    // Notify all SSE clients so UI updates row count automatically
    broadcastSSE({
      type: 'notification',
      payload: `Successfully loaded ${newRowCount.toLocaleString()} rows from ${req.file.originalname}`,
    });

    console.log(`[UPLOAD] ✅ ${newRowCount} rows loaded from ${req.file.originalname}`);

    res.status(200).json({
      success: true,
      message: 'Upload successful',
      rowCount: newRowCount,
      filename: req.file.originalname,
    });

  } catch (error) {
    console.error('[UPLOAD ERROR]', error.message);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    res.status(500).json({ error: `Failed to process CSV: ${error.message}` });
  }
});

// ─── MAIN QUERY ───────────────────────────────────────────────────────────────
app.post('/api/query', async (req, res) => {
  const now = Date.now();
  const recent = requestTimestamps.filter(t => now - t < 3000);
  if (recent.length >= 1) {
    return res.status(429).json({ error: 'RATE_LIMITED', userMessage: 'Please wait a moment before sending another query.' });
  }
  requestTimestamps.push(now);

  const { question, conversationHistory = [] } = req.body;
  if (!question || typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'INVALID_INPUT', userMessage: 'Please enter a valid question.' });
  }
  if (question.length > 600) {
    return res.status(400).json({ error: 'INVALID_INPUT', userMessage: 'Question too long. Keep it under 600 characters.' });
  }

  let sql = null, data = [], chartConfig = null;

  try {
    const schema = getSchema();
    if (!schema) throw new Error('Database schema not ready');

    sql = await generateSQL(question.trim(), schema, conversationHistory);

    if (sql === 'CANNOT_ANSWER') {
      return res.status(200).json({
        error: 'CANNOT_ANSWER',
        userMessage: "This question can't be answered with the available data. Try asking about the fields shown in your dataset.",
        sql: null, data: [], chartConfig: null,
      });
    }

    if (!sql.trim().toUpperCase().startsWith('SELECT')) throw new Error('Generated query was not a SELECT statement');

    try {
      data = runQuery(sql);
    } catch (sqlErr) {
      console.error('[SQL ERROR]', sqlErr.message);
      let userMessage = "I couldn't retrieve the data. Try rephrasing.";
      if (sqlErr.message.includes('no such column')) userMessage = "Some fields weren't found. Check if what you're asking about exists in the dataset.";
      else if (sqlErr.message.includes('syntax error')) userMessage = "I didn't understand that. Try rephrasing more simply.";
      return res.status(200).json({ error: 'SQL_ERROR', userMessage, sql, data: [], chartConfig: null });
    }

    if (data.length === 0) {
      return res.status(200).json({ error: 'NO_DATA', userMessage: 'Query returned no results. Try broadening your question.', sql, data: [], chartConfig: null });
    }

    const rawChartConfig = await generateChartConfig(question.trim(), data, data.length);
    chartConfig = validateAndSelectChart(rawChartConfig, data);

    return res.status(200).json({ error: null, sql, data, chartConfig, rowCount: data.length });

  } catch (err) {
    console.error('[QUERY ERROR]', err.message);
    return res.status(500).json({ error: 'SERVER_ERROR', userMessage: 'Something went wrong. Please try again.', sql, data: [], chartConfig: null });
  }
});

// ─── EXPLAIN ──────────────────────────────────────────────────────────────────
app.post('/api/explain', async (req, res) => {
  const { question, sql, data } = req.body;
  if (!question || !sql || !data) return res.status(400).json({ error: 'Missing required fields' });
  try {
    const explanation = await explainChartData(question, sql, data);
    return res.status(200).json({ explanation });
  } catch (err) {
    console.error('[EXPLAIN ERROR]', err.message);
    return res.status(500).json({ error: 'Failed to generate explanation' });
  }
});

// ─── STARTUP ──────────────────────────────────────────────────────────────────
async function start() {
  rowCount = await initDatabase();
  app.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
    console.log(`[Server] ${rowCount.toLocaleString()} rows loaded into SQLite`);
  });
}

start().catch(err => { console.error('[Server] Fatal startup error:', err); process.exit(1); });
