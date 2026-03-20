import React from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
  RadialBarChart, RadialBar, PieChart, Pie,
} from 'recharts';
import { smartFormat } from './formatters';

const COLORS = ['#6366f1', '#22d3ee', '#10b981', '#f59e0b', '#ef4444', '#a78bfa', '#f472b6', '#fb923c'];

const AXIS_STYLE = { fill: '#64748b', fontSize: 11, fontFamily: 'Inter' };
const GRID_STYLE = { stroke: '#2a2d3e', strokeDasharray: '3 3' };
const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: '#22263a',
    border: '1px solid #6366f1',
    borderRadius: '8px',
    color: '#f1f5f9',
    fontFamily: 'Inter',
    fontSize: '13px',
  },
  labelStyle: { color: '#94a3b8' },
};

function truncateLabel(str, max = 12) {
  if (!str) return '';
  const s = String(str);
  return s.length > max ? s.slice(0, max) + '…' : s;
}

function SortableTable({ data }) {
  const [sortKey, setSortKey] = React.useState(null);
  const [sortDir, setSortDir] = React.useState('asc');
  
  if (!data || data.length === 0) return <p className="text-slate-500 text-sm">No data</p>;
  
  const columns = Object.keys(data[0]);
  
  const sorted = [...data].sort((a, b) => {
    if (!sortKey) return 0;
    const av = a[sortKey], bv = b[sortKey];
    if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
    return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  function toggleSort(col) {
    if (sortKey === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(col); setSortDir('asc'); }
  }

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-slate-700">
            {columns.map(col => (
              <th
                key={col}
                onClick={() => toggleSort(col)}
                className="py-2 px-3 text-left text-slate-400 font-medium cursor-pointer hover:text-slate-200 whitespace-nowrap select-none"
              >
                {col} {sortKey === col ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i} className={`border-b border-slate-800 ${i % 2 === 0 ? 'bg-bg-card' : 'bg-bg-elevated'} hover:bg-slate-700 transition-colors`}>
              {columns.map(col => (
                <td key={col} className="py-2 px-3 text-slate-300 whitespace-nowrap">
                  {smartFormat(col, row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ChartRenderer({ chartType, data, xKey, yKey, yKeys = [] }) {
  if (!data || data.length === 0) return <p className="text-slate-500 text-sm p-4">No data to display.</p>;

  const allYKeys = yKeys.length > 0 ? [...new Set([yKey, ...yKeys].filter(Boolean))] : [yKey];

  if (chartType === 'table') return <SortableTable data={data} />;

  // HEATMAP
  if (chartType === 'heatmap') {
    const columns = data.length > 0 ? Object.keys(data[0]) : [];
    const numericCols = columns.filter(c => typeof data[0][c] === 'number');
    const allVals = data.flatMap(row => numericCols.map(c => row[c]));
    const minVal = Math.min(...allVals);
    const maxVal = Math.max(...allVals);

    function getColor(val) {
      if (typeof val !== 'number') return 'transparent';
      const safeMax = maxVal;
      const safeMin = minVal;
      const ratio = (val - safeMin) / (safeMax - safeMin || 1);
      const r = Math.round(99 + (239 - 99) * ratio);
      const g = Math.round(102 + (68 - 102) * ratio);
      const b = Math.round(241 + (68 - 241) * ratio);
      return `rgba(${r},${g},${b},${0.2 + ratio * 0.8})`;
    }

    return (
      <div style={{ overflow: 'auto', height: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col} style={{ padding: '6px 10px', textAlign: 'left', color: '#64748b', borderBottom: '0.5px solid #2a2d3e', whiteSpace: 'nowrap' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i}>
                {columns.map(col => (
                  <td key={col} style={{
                    padding: '6px 10px',
                    borderBottom: '0.5px solid #1e2130',
                    background: getColor(row[col]),
                    color: '#f1f5f9',
                    whiteSpace: 'nowrap',
                  }}>
                    {typeof row[col] === 'number' ? Number(row[col]).toLocaleString() : row[col]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // GAUGE
  if (chartType === 'gauge') {
    const gaugeData = data.slice(0, 5).map((d, i) => ({
      name: d[xKey],
      value: d[yKey],
      fill: COLORS[i % COLORS.length],
    }));
    return (
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%" cy="60%"
          innerRadius="20%" outerRadius="90%"
          data={gaugeData}
          startAngle={180} endAngle={0}
        >
          <RadialBar
            minAngle={15}
            background={{ fill: '#22263a' }}
            clockWise
            dataKey="value"
            label={{ position: 'insideStart', fill: '#f1f5f9', fontSize: 11 }}
          />
          <Legend
            iconSize={10}
            formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>}
          />
          <Tooltip {...TOOLTIP_STYLE} />
        </RadialBarChart>
      </ResponsiveContainer>
    );
  }

  // HISTOGRAM
  if (chartType === 'histogram') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 20, bottom: 20, left: 10 }} barCategoryGap="1%">
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" />
          <XAxis dataKey={xKey} tick={{ fill: '#64748b', fontSize: 11 }} />
          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
          <Tooltip contentStyle={{ backgroundColor: '#22263a', border: '1px solid #6366f1', borderRadius: '8px', color: '#f1f5f9' }} />
          <Bar dataKey={yKey} fill="#6366f1" radius={[2, 2, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // DONUT / PIE
  if (chartType === 'pie' || chartType === 'donut') {
    const innerRadius = chartType === 'donut' ? 55 : 0;
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey={yKey}
            nameKey={xKey}
            cx="50%"
            cy="50%"
            outerRadius={95}
            innerRadius={innerRadius}
            paddingAngle={chartType === 'donut' ? 3 : 0}
            label={({ name, percent }) => `${truncateLabel(name, 10)} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip {...TOOLTIP_STYLE} formatter={(v, n) => [smartFormat(yKey, v), n]} />
          <Legend formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  // SCATTER
  if (chartType === 'scatter') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey={xKey} tick={AXIS_STYLE} name={xKey} tickFormatter={v => truncateLabel(v)} />
          <YAxis dataKey={yKey} tick={AXIS_STYLE} name={yKey} />
          <Tooltip {...TOOLTIP_STYLE} cursor={{ strokeDasharray: '3 3' }} />
          <Scatter data={data} fill="#10b981">
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  // LINE
  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey={xKey} tick={AXIS_STYLE} tickFormatter={v => truncateLabel(v)} />
          <YAxis tick={AXIS_STYLE} tickFormatter={v => smartFormat(yKey, v)} />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v, n) => [smartFormat(n, v), n]} />
          <Legend formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>} />
          {allYKeys.map((key, i) => (
            <Line 
              key={key} 
              type="monotone" 
              dataKey={key} 
              stroke={key.toLowerCase().includes('predict') ? '#22C55E' : COLORS[i % COLORS.length]} 
              strokeWidth={3} 
              strokeDasharray={key.toLowerCase().includes('predict') ? '5 5' : 'none'}
              dot={false} 
              activeDot={{ r: 5 }} 
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // AREA
  if (chartType === 'area') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          <defs>
            {allYKeys.map((key, i) => (
              <linearGradient key={key} id={`grad_${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.35} />
                <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey={xKey} tick={AXIS_STYLE} tickFormatter={v => truncateLabel(v)} />
          <YAxis tick={AXIS_STYLE} tickFormatter={v => smartFormat(yKey, v)} />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v, n) => [smartFormat(n, v), n]} />
          <Legend formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>} />
          {allYKeys.map((key, i) => (
            <Area key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} fill={`url(#grad_${i})`} strokeWidth={2} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // DEFAULT: BAR
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
        <CartesianGrid {...GRID_STYLE} />
        <XAxis dataKey={xKey} tick={AXIS_STYLE} tickFormatter={v => truncateLabel(v)} />
        <YAxis tick={AXIS_STYLE} tickFormatter={v => smartFormat(yKey, v)} />
        <Tooltip {...TOOLTIP_STYLE} formatter={(v, n) => [smartFormat(n, v), n]} />
        <Legend formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>} />
        {allYKeys.map((key, i) => (
          <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
