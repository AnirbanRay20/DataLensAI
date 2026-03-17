import axios from 'axios';

const BASE = '/api';

export async function queryDashboard(question, conversationHistory = []) {
  const response = await axios.post(`${BASE}/query`, { question, conversationHistory });
  return response.data;
}

export async function fetchHealth() {
  const response = await axios.get(`${BASE}/health`);
  return response.data;
}

export async function fetchSchema() {
  const response = await axios.get(`${BASE}/schema`);
  return response.data;
}

export async function fetchKPIs() {
  const response = await axios.get(`${BASE}/kpis`);
  return response.data;
}

export async function startForecastJob(question) {
  const response = await axios.post(`${BASE}/forecast`, { question });
  return response.data; // { jobId, status, message }
}

export async function explainChart(question, sql, data) {
  const response = await axios.post(`${BASE}/explain`, { question, sql, data });
  return response.data; // { explanation: "..." }
}

export async function uploadCSV(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await axios.post(`${BASE}/upload-csv`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}