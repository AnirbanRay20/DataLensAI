const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');

let db;
let dynamicSchema = null;

function convertDate(ddmmyyyy) {
  if (!ddmmyyyy) return null;
  const parts = ddmmyyyy.split('-');
  if (parts.length !== 3) return ddmmyyyy;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

// Sniff column types dynamically (INTEGER, REAL, TEXT)
function sniffType(val) {
  if (!val) return 'TEXT';
  if (!isNaN(val) && val.trim() !== '') {
    return val.includes('.') ? 'REAL' : 'INTEGER';
  }
  return 'TEXT';
}

async function loadCSV(filePath, originalName = 'amazon_sales.csv') {
  if (!fs.existsSync(filePath)) {
    console.warn('[DB] WARNING: CSV not found at', filePath);
    return 0;
  }

  // 1. Parse CSV and infer column types
  const rows = [];
  const columnTypes = {};
  const columns = [];

  await new Promise((resolve, reject) => {
    let isFirstRow = true;
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('headers', (headers) => {
        // Sanitize headers to be valid SQLite column names
        headers.forEach(h => {
          const clean = h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '') || 'col';
          columns.push(clean);
          columnTypes[clean] = 'INTEGER'; // Default to strictest, degrade later
        });
      })
      .on('data', (row) => {
        const processedRow = [];
        Object.values(row).forEach((val, i) => {
          const colName = columns[i];
          const strVal = String(val || '').trim();
          
          let parsedVal = strVal;
          if (strVal) {
             const type = sniffType(strVal);
             if (type === 'TEXT') {
                columnTypes[colName] = 'TEXT'; // Degrade to TEXT
                // Try converting dates if it looks like DD-MM-YYYY
                if (/^\d{2}-\d{2}-\d{4}$/.test(strVal)) {
                  parsedVal = convertDate(strVal);
                }
             } else if (type === 'REAL' && columnTypes[colName] !== 'TEXT') {
                columnTypes[colName] = 'REAL'; // Degrade to REAL
                parsedVal = parseFloat(strVal);
             } else if (type === 'INTEGER' && columnTypes[colName] === 'INTEGER') {
                parsedVal = parseInt(strVal, 10);
             } else if (columnTypes[colName] !== 'TEXT') {
                 // Already degraded to REAL or something, cast numeric
                 parsedVal = parseFloat(strVal);
             }
          } else {
             parsedVal = null;
          }
          processedRow.push(parsedVal);
        });
        rows.push(processedRow);
      })
      .on('end', () => resolve())
      .on('error', reject);
  });

  if (columns.length === 0) return 0;

  // Ensure unique column names if sanitized names collide
  const uniqueCols = new Set();
  columns.forEach((c, i) => {
    let finalC = c;
    let counter = 1;
    while (uniqueCols.has(finalC)) {
      finalC = `${c}_${counter}`;
      counter++;
    }
    columns[i] = finalC;
    uniqueCols.add(finalC);
  });

  // 2. Drop existing table and create new dynamic table
  db.run('DROP TABLE IF EXISTS sales;');
  
  const createTableCols = columns.map(c => `${c} ${columnTypes[c]}`).join(', ');
  db.run(`CREATE TABLE sales (${createTableCols})`);

  // 3. Bulk insert rows using a transaction
  db.run('BEGIN TRANSACTION');
  const placeholders = columns.map(() => '?').join(',');
  const stmt = db.prepare(`INSERT INTO sales VALUES (${placeholders})`);
  
  for (const row of rows) {
    stmt.run(row);
  }
  stmt.free();
  db.run('COMMIT');

  // Build the dynamic schema description
  dynamicSchema = {
    tableName: 'sales',
    datasetName: originalName,
    columns: columns.map(c => ({
      name: c,
      type: columnTypes[c],
      description: `Data column: ${c}`
    }))
  };

  console.log(`[DB] Dynamically loaded ${rows.length} rows into sql.js SQLite`);
  return rows.length;
}

async function initDatabase() {
  const SQL = await initSqlJs();
  db = new SQL.Database();
  const defaultCsvPath = path.join(__dirname, 'data', 'amazon_sales.csv');
  return await loadCSV(defaultCsvPath);
}

function runQuery(sql) {
  if (!db) throw new Error('Database not initialized');

  // Safety: only allow SELECT statements
  const normalized = sql.trim().toUpperCase();
  if (!normalized.startsWith('SELECT')) {
    throw new Error('Only SELECT queries are allowed');
  }

  // Basic validation layer to reject unsafe keywords
  const unsafeKeywords = ['DROP', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'PRAGMA', 'COMMIT', 'ROLLBACK', 'ATTACH', 'DETACH'];
  for (const keyword of unsafeKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(sql)) {
      throw new Error(`Unsafe keyword detected: ${keyword}`);
    }
  }

  try {
    // sql.js uses db.exec() which returns [{columns, values}]
    // NOT db.prepare().all() like better-sqlite3
    const results = db.exec(sql);

    if (!results || results.length === 0) return [];

    const { columns, values } = results[0];

    // Convert array-of-arrays → array-of-objects
    return values.map((row) => {
      const obj = {};
      columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    });
  } catch (err) {
    throw new Error(`SQL execution failed: ${err.message}`);
  }
}

function getSchema() {
  if (!db || !dynamicSchema) return null;

  const sample = runQuery('SELECT * FROM sales LIMIT 3');
  const countResult = db.exec('SELECT COUNT(*) as count FROM sales');
  const totalRows = countResult[0]?.values[0][0] || 0;

  return {
    ...dynamicSchema,
    sampleRows: sample,
    totalRows,
  };
}

function getDb() {
  return db;
}

module.exports = { initDatabase, loadCSV, runQuery, getSchema, getDb };