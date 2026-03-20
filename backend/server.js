require('dotenv').config();
console.log('KEY LOADED:', process.env.GEMINI_API_KEY ? 'YES ✅' : 'NO ❌');

const express = require('express');
const cors = require('cors');
const { initDatabase, runQuery, getSchema } = require('./db');
const { generateSQL, generateChartConfig, explainChartData } = require('./gemini');
const { validateAndSelectChart } = require('./chartSelector');

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting - max 1 request per 3 seconds
const requestTimestamps = [];

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '2mb' }));

let rowCount = 0;

// ─── SSE (SERVER-SENT EVENTS) SETUP ──────────────────────────────────────────
const sseClients = new Set();

function broadcastSSE(data) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch (err) {
      console.error('[SSE] Broadcast error:', err);
      sseClients.delete(client);
    }
  }
}

// ─── ROUTES ──────────────────────────────────────────────────────────────────

// SSE Stream Endpoint
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.add(res);
  console.log(`[SSE] Client connected. Total: ${sseClients.size}`);

  // Send an initial handshake
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE Connection Established' })}\n\n`);

  req.on('close', () => {
    sseClients.delete(res);
    console.log(`[SSE] Client disconnected. Total: ${sseClients.size}`);
  });
});

// Test Endpoint to trigger SSE broadcast
app.post('/api/test-broadcast', (req, res) => {
  const { type, payload } = req.body;
  broadcastSSE({ type: type || 'notification', payload: payload || 'This is a live update!' });
  res.json({ success: true, clientsNotified: sseClients.size });
});

const otpRoutes = require('./routes/otp');
app.use('/api', otpRoutes);

// ─── IN-MEMORY JOB QUEUE ─────────────────────────────────────────────────────
const activeJobs = new Map();

// Mock Forecasting Endpoint
app.post('/api/forecast', (req, res) => {
  const { question } = req.body;
  const jobId = `job_${Date.now()}`;
  
  // 1. Register the job
  activeJobs.set(jobId, { status: 'processing', question });
  
  // 2. Start the "Background Task" (Mocking a 6-second python process)
  setTimeout(() => {
    const jobData = activeJobs.get(jobId);
    if (!jobData) return;
    
    // 1. Helper function to format the data
    function formatForecastData(inputData) {
      return inputData.map(item => ({
        name: new Date(item.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        actual: item.actual,
        predicted: item.predicted
      }));
    }

    // Simulate AI Forecast Results
    const rawMockedData = [
      { date: '2023-10-01', actual: 12000, predicted: 12100 },
      { date: '2023-11-01', actual: 15400, predicted: 14800 },
      { date: '2023-12-01', actual: 21000, predicted: 20500 },
      { date: '2024-01-01', actual: null,  predicted: 16000 },
      { date: '2024-02-01', actual: null,  predicted: 14500 },
      { date: '2024-03-01', actual: null,  predicted: 15200 },
    ];
    
    const formattedData = formatForecastData(rawMockedData);
    
    const mockChart = {
      chartType: 'line',
      title: 'Revenue Forecast (Next 3 Months)',
      xKey: 'name', 
      yKeys: ['actual', 'predicted'], 
      seriesNames: { actual: 'Actual Revenue', predicted: 'AI Predicted Revenue' },
      insight: 'Based on historical trends, our AI model anticipates a slight seasonal dip in revenue through February before stabilizing and beginning an upward trend in March.'
    };

    // Update job status 
    jobData.status = 'completed';
    activeJobs.set(jobId, jobData);
    
    // 3. Broadcast Completion via SSE!
    broadcastSSE({
      type: 'job_complete',
      jobId: jobId,
      payload: {
        question: `Forecasting: ${question}`, 
        sql: '-- Generated via AI Forecasting Model',
        data: formattedData,
        chartConfig: mockChart,
        rowCount: formattedData.length
      }
    });

  }, 6000); // Wait 6 seconds

  // 4. Return the ID immediately
  res.status(202).json({ 
    jobId, 
    status: 'processing',
    message: 'Forecasting model started in the background.'
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', rowCount, message: `${rowCount.toLocaleString()} rows loaded` });
});

// Schema info
app.get('/api/schema', (req, res) => {
  const schema = getSchema();
  if (!schema) return res.status(503).json({ error: 'Database not ready' });
  res.json(schema);
});

// Dynamic fast KPIs
app.get('/api/kpis', (req, res) => {
  const schema = getSchema();
  if (!schema) return res.status(503).json({ error: 'Database not ready' });

  try {
    const numCols = schema.columns.filter(c => c.type === 'INTEGER' || c.type === 'REAL');
    const colsList = [`COUNT(*) as _count`];
    
    // Target top 2 numeric columns for KPIs
    numCols.slice(0, 2).forEach((col, i) => {
      colsList.push(`SUM(${col.name}) as sum_${i}`);
      colsList.push(`AVG(${col.name}) as avg_${i}`);
    });

    const query = `SELECT ${colsList.join(', ')} FROM sales`;
    const data = runQuery(query)[0];

    // Format utility
    const fmt = (val) => {
      if (!val) return '0';
      const num = parseFloat(val);
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
      if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
      return num % 1 === 0 ? num.toString() : num.toFixed(2);
    };

    const kpis = [];
    kpis.push({ 
      label: 'Total Rows', 
      value: data._count.toLocaleString(), 
      iconType: 'shopping',
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10'
    });

    numCols.slice(0, 2).forEach((col, i) => {
      // Sum KPI
      kpis.push({
        label: `Total ${col.name.replace(/_/g, ' ')}`,
        value: fmt(data[`sum_${i}`]),
        iconType: 'dollar',
        color: 'text-indigo-400',
        bg: 'bg-indigo-500/10'
      });
      // Avg KPI
      kpis.push({
        label: `Avg ${col.name.replace(/_/g, ' ')}`,
        value: fmt(data[`avg_${i}`]),
        iconType: 'trend',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10'
      });
    });

    // Provide at most 4 KPI cards for the UI grid
    res.json(kpis.slice(0, 4));
  } catch(e) {
    console.error('[KPI Error]', e);
    res.status(500).json({ error: e.message });
  }
});

// Main query endpoint
app.post('/api/query', async (req, res) => {
  // Rate limit check
  const now = Date.now();
  const recent = requestTimestamps.filter(t => now - t < 3000);
  if (recent.length >= 1) {
    return res.status(429).json({
      error: 'RATE_LIMITED',
      userMessage: 'Please wait a moment before sending another query.',
    });
  }
  requestTimestamps.push(now);

  const { question, conversationHistory = [] } = req.body;

  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      userMessage: 'Please enter a valid question.',
    });
  }

  if (question.length > 600) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      userMessage: 'Question is too long. Please keep it under 600 characters.',
    });
  }

  let sql = null;
  let data = [];
  let chartConfig = null;

  try {
    // STEP 1: Generate SQL
    const schema = getSchema();
    if (!schema) throw new Error("Database schema not ready");
    sql = await generateSQL(question.trim(), schema, conversationHistory);

    if (sql === 'CANNOT_ANSWER') {
      return res.status(200).json({
        error: 'CANNOT_ANSWER',
        userMessage:
          "This question can't be answered with the available data. Try asking about the fields shown in your dataset.",
        sql: null,
        data: [],
        chartConfig: null,
      });
    }

    // Validate SQL is a SELECT before running
    if (!sql.trim().toUpperCase().startsWith('SELECT')) {
      throw new Error('Generated query was not a SELECT statement');
    }

    // STEP 2: Run query
    try {
      data = runQuery(sql);
    } catch (sqlErr) {
      console.error('[SQL ERROR]', sqlErr.message, '\nQuery:', sql);
      
      let userMessage = 'I couldn\'t retrieve the data. Try rephrasing your question.';
      if (sqlErr.message.includes('no such column')) {
        userMessage = 'I couldn\'t find some of the requested information in the dataset. Please check if the fields you\'re asking about exist.';
      } else if (sqlErr.message.includes('syntax error')) {
        userMessage = 'I didn\'t quite understand that. Could you try rephrasing your question more simply?';
      } else if (sqlErr.message.includes('Only SELECT queries') || sqlErr.message.includes('Unsafe keyword')) {
        userMessage = 'The generated query was blocked for security reasons.';
      } else {
        userMessage = `I couldn't retrieve the data. (${sqlErr.message})`;
      }

      return res.status(200).json({
        error: 'SQL_ERROR',
        userMessage,
        sql,
        data: [],
        chartConfig: null,
      });
    }

    if (data.length === 0) {
      return res.status(200).json({
        error: 'NO_DATA',
        userMessage: 'The query ran successfully but returned no results. Try broadening your question.',
        sql,
        data: [],
        chartConfig: null,
      });
    }

    // STEP 3: Generate chart config
    const rawChartConfig = await generateChartConfig(question.trim(), data, data.length);
    chartConfig = validateAndSelectChart(rawChartConfig, data);

    return res.status(200).json({
      error: null,
      sql,
      data,
      chartConfig,
      rowCount: data.length,
    });

  } catch (err) {
    console.error('[QUERY ERROR]', err.message);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      userMessage: 'Something went wrong on the server. Please try again.',
      sql,
      data: [],
      chartConfig: null,
    });
  }
});

// Explain Chart endpoint
app.post('/api/explain', async (req, res) => {
  const { question, sql, data } = req.body;
  
  if (!question || !sql || !data) {
    return res.status(400).json({ error: 'Missing required chart context (question, sql, data)' });
  }

  try {
    const explanation = await explainChartData(question, sql, data);
    return res.status(200).json({ explanation });
  } catch (err) {
    console.error('[EXPLAIN ERROR]', err.message);
    return res.status(500).json({ error: 'Failed to generate chart explanation' });
  }
});

const multer = require('multer');
const fs = require('fs');

// Configure multer for temp file storage
const upload = multer({ dest: 'data/' });

// CSV upload endpoint
app.post('/api/upload-csv', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  try {
    const { loadCSV } = require('./db');
    const newRowCount = await loadCSV(req.file.path, req.file.originalname);
    
    // Clean up the uploaded temp file after loading
    fs.unlinkSync(req.file.path);

    // Update global row count
    rowCount = newRowCount;
    
    // Broadcast the update so the UI knows
    broadcastSSE({ type: 'notification', payload: `Successfully loaded ${newRowCount.toLocaleString()} rows from new dataset.` });

    res.status(200).json({ 
      message: 'Upload successful', 
      rowCount: newRowCount 
    });
  } catch (error) {
    console.error('[UPLOAD ERROR]', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to process CSV file.' });
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

start().catch(err => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});