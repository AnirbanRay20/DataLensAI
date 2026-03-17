const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

function buildDynamicSQLPrompt(schema) {
  const columnDescriptions = schema.columns.map(c => `- ${c.name} (${c.type}): ${c.description || 'Data column'}`).join('\n');
  
  return `You are an expert SQLite analyst. The database has ONE table named "${schema.tableName || 'sales'}" with these exact columns:

${columnDescriptions}

RULES:
1. Output ONLY the raw SQL query. No explanation. No markdown. No backticks. No comments.
2. For time grouping use strftime('%Y-%m', date_column) for month, strftime('%Y', date_column) for year.
3. Always give meaningful aliases: e.g. SUM(revenue) AS total_revenue, COUNT(*) AS order_count.
4. Round float results: ROUND(SUM(revenue), 2) AS total_revenue.
5. Add ORDER BY for time-series data (order by date ASC).
6. Add LIMIT 200 unless doing aggregates that produce few rows.
7. STRICT SECURITY: Never use DROP, INSERT, UPDATE, DELETE, CREATE, ALTER, PRAGMA.
8. If the question CANNOT be answered from this data, output exactly: CANNOT_ANSWER
9. For top N queries, use ORDER BY ... DESC LIMIT N.
10. STRICT SCHEMA ADHERENCE: You must ONLY use the columns explicitly listed above. Do NOT invent, guess, or hallucinate column names. If a requested metric requires a column that does not exist, output exactly: CANNOT_ANSWER`;
}

const CHART_SYSTEM_PROMPT = `You are a data visualization expert. Given a user question and SQL query results, return a JSON object.

CHART SELECTION RULES:
- Data with a time/date dimension (months, years) → "line" or "area"
- Comparing values across 2-8 named categories → "bar"
- Parts of a whole (proportions) → "pie" or "donut"
- Correlation between two numeric variables → "scatter"
- More than 8 rows with multiple columns → "table"
- Revenue/sales over time → "area"
- Multiple series over time → "line"

OUTPUT FORMAT: Return ONLY valid JSON, no markdown, no backticks, no explanation.

{
  "chartType": "bar",
  "title": "Chart title here",
  "xKey": "exact_column_name_for_x_axis",
  "yKey": "exact_column_name_for_y_axis",
  "yKeys": ["col1", "col2"],
  "colorBy": null,
  "insight": "2-3 sentences of plain English insight about the data.",
  "kpis": [
    { "label": "KPI label", "value": "formatted value", "trend": "up" }
  ],
  "confidence": 0.95
}`;

const EXPLAIN_SYSTEM_PROMPT = `You are a data analyst presenting to executives.
Given the user's question, the SQL used, and the raw data, provide a 2-3 paragraph executive summary explaining what the chart shows, why it matters, and any key trends or anomalies.
Format the output in plain text (no markdown, no json). Keep it concise, insightful, and actionable. Break it into short paragraphs if needed for readability.`;

async function generateSQL(userQuestion, schema, conversationHistory = []) {
  const systemPrompt = buildDynamicSQLPrompt(schema);
  const messages = [
    { role: 'system', content: systemPrompt },
  ];

  // Add last 3 conversation exchanges for follow-up context
  const recent = conversationHistory.slice(-6);
  if (recent.length > 0) {
    messages.push({
      role: 'user',
      content: `Previous conversation context:\n${recent.map(m => `${m.role}: ${m.content}`).join('\n')}\n\nCurrent question: ${userQuestion}`,
    });
  } else {
    messages.push({ role: 'user', content: userQuestion });
  }

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages,
    max_tokens: 500,
    temperature: 0.1, // low temperature for accurate SQL
  });

  return response.choices[0].message.content.trim();
}

async function generateChartConfig(userQuestion, sqlResults, totalRows) {
  const sampleData = sqlResults.slice(0, 15);
  const columns = sqlResults.length > 0 ? Object.keys(sqlResults[0]) : [];

  const userPrompt = `User question: "${userQuestion}"
Total rows returned: ${totalRows}
Column names: ${columns.join(', ')}
Sample data (first 15 rows): ${JSON.stringify(sampleData, null, 2)}`;

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: CHART_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 800,
    temperature: 0.2,
  });

  let text = response.choices[0].message.content.trim();

  // Strip markdown fences if model wraps in backticks
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  // Extract JSON if there's extra text around it
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) text = jsonMatch[0];

  try {
    return JSON.parse(text);
  } catch (e) {
    // Fallback if JSON parse fails
    console.error('[CHART CONFIG] JSON parse failed:', e.message);
    return {
      chartType: 'table',
      title: userQuestion,
      xKey: columns[0] || 'value',
      yKey: columns[1] || 'count',
      yKeys: columns.slice(1),
      colorBy: null,
      insight: 'Here are the query results.',
      kpis: [],
      confidence: 0.5,
    };
  }
}

async function explainChartData(userQuestion, sqlQuery, sqlResults) {
  const sampleData = sqlResults.slice(0, 50); // Provide more context for explanation
  
  const userPrompt = `User question: "${userQuestion}"
SQL Query: ${sqlQuery}
Data (first 50 rows): ${JSON.stringify(sampleData, null, 2)}`;

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: EXPLAIN_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 800,
    temperature: 0.3, // slightly higher temperature for creative analysis
  });

  return response.choices[0].message.content.trim();
}

module.exports = { generateSQL, generateChartConfig, explainChartData };