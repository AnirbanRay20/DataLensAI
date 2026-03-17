// Helper to guess data type of a column based on a sample of values
function sniffColumnType(data, column) {
  let hasDateString = false;
  let hasNumeric = false;
  let hasString = false;

  const dateRegex = /^\d{4}-\d{2}(-\d{2})?$/; // Matches YYYY-MM or YYYY-MM-DD

  for (let i = 0; i < Math.min(data.length, 10); i++) {
    const val = data[i][column];
    if (val === null || val === undefined) continue;
    
    if (typeof val === 'number') {
      hasNumeric = true;
    } else if (typeof val === 'string') {
      if (dateRegex.test(val)) {
        hasDateString = true;
      } else if (!isNaN(Number(val))) {
        hasNumeric = true; // String but numeric
      } else {
        hasString = true;
      }
    }
  }

  if (hasDateString) return 'date';
  if (hasNumeric && !hasString) return 'numeric';
  return 'string';
}

// Rule-based logic to intelligently select chart types based on Actual Data
function validateAndSelectChart(geminiChartConfig, data) {
  const { chartType, xKey, yKey, yKeys } = geminiChartConfig;
  const rowCount = data.length;
  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  if (rowCount === 0) {
    return { ...geminiChartConfig, chartType: 'table', xKey: null, yKey: null, yKeys: [] };
  }

  // 1. Analyze column types
  const colTypes = {};
  columns.forEach(col => {
    colTypes[col] = sniffColumnType(data, col);
  });

  const dateCols = columns.filter(c => colTypes[c] === 'date');
  const numericCols = columns.filter(c => colTypes[c] === 'numeric');
  const stringCols = columns.filter(c => colTypes[c] === 'string');

  // 2. Identify primary axes
  // Respect the LLM's choice if it exists in the data and typing makes sense, otherwise pick the best available
  let bestXKey = columns.includes(xKey) ? xKey : null;
  let bestYKey = columns.includes(yKey) ? yKey : null;
  let bestYKeys = Array.isArray(yKeys) ? yKeys.filter(k => numericCols.includes(k)) : [];

  if (!bestXKey || !columns.includes(bestXKey)) {
    bestXKey = dateCols[0] || stringCols[0] || columns[0];
  }

  if (!bestYKeys.length) {
    if (bestYKey && numericCols.includes(bestYKey)) {
      bestYKeys = [bestYKey];
    } else {
      bestYKeys = numericCols.length ? [...numericCols] : [columns[1] || columns[0]];
    }
  }

  bestYKey = bestYKeys[0];

  // 3. Intelligent Chart Selection Rules
  let finalChartType = 'bar'; // default fallback

  if (rowCount === 1 || Object.keys(colTypes).length > 5) {
    // Single row or very wide dataset -> Table
    finalChartType = 'table';
  } else if (dateCols.length > 0 && bestXKey && colTypes[bestXKey] === 'date') {
    // Time-series -> Line/Area
    finalChartType = bestYKeys.length > 1 ? 'line' : (chartType === 'area' ? 'area' : 'line');
  } else if (colTypes[bestXKey] === 'string') {
    // Categorical Data
    if (rowCount <= 5 && bestYKeys.length === 1 && chartType !== 'bar') {
      // Small category count -> Pie/Donut (if model suggested it, let it be pie/donut, else default pie)
      finalChartType = (chartType === 'donut') ? 'donut' : 'pie';
    } else {
      // Categories + Numeric -> Bar
      finalChartType = 'bar';
    }
  } else if (numericCols.includes(bestXKey) && numericCols.includes(bestYKey) && rowCount > 10) {
    // Numeric vs Numeric -> Scatter (if suggested) or Line
    finalChartType = (chartType === 'scatter') ? 'scatter' : 'line';
  }

  // Final sanity overrides
  if ((finalChartType === 'pie' || finalChartType === 'donut') && rowCount > 8) {
    finalChartType = 'bar'; // Pie charts with too many slices are unreadable
  }

  return {
    ...geminiChartConfig,
    chartType: finalChartType,
    xKey: bestXKey,
    yKey: bestYKey,
    yKeys: bestYKeys,
  };
}

module.exports = { validateAndSelectChart };
