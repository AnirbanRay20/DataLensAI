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

const VALID_CHART_TYPES = ['bar', 'line', 'area', 'pie', 'donut', 'scatter', 'histogram', 'gauge', 'heatmap', 'table'];

function validateAndSelectChart(geminiChartConfig, data) {
  const { chartType, xKey, yKey, yKeys } = geminiChartConfig;
  const rowCount = data.length;
  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  const safeXKey = columns.includes(xKey) ? xKey : columns[0];
  const safeYKey = columns.includes(yKey) ? yKey : (columns[1] || columns[0]);
  const safeYKeys = Array.isArray(yKeys)
    ? yKeys.filter(k => columns.includes(k))
    : [safeYKey];

  let finalChartType = VALID_CHART_TYPES.includes(chartType) ? chartType : 'bar';

  // Override rules
  if (rowCount === 0) finalChartType = 'table';
  if (rowCount === 1) finalChartType = 'table';
  if (rowCount > 100 && (finalChartType === 'pie' || finalChartType === 'donut')) finalChartType = 'bar';
  if (rowCount > 50 && finalChartType === 'gauge') finalChartType = 'bar';

  return {
    ...geminiChartConfig,
    chartType: finalChartType,
    xKey: safeXKey,
    yKey: safeYKey,
    yKeys: safeYKeys.length > 0 ? safeYKeys : [safeYKey],
  };
}

module.exports = { validateAndSelectChart };
