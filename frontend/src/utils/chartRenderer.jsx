import React from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { Pie, PieChart } from 'recharts';
import { smartFormat } from './formatters';

const COLORS = ['#6366F1', '#A855F7', '#22C55E', '#F59E0B', '#ef4444', '#22d3ee', '#f472b6'];

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
            outerRadius={100}
            innerRadius={innerRadius}
            paddingAngle={2}
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

  if (chartType === 'scatter') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey={xKey} tick={AXIS_STYLE} name={xKey} tickFormatter={v => truncateLabel(v)} />
          <YAxis dataKey={yKey} tick={AXIS_STYLE} name={yKey} />
          <Tooltip {...TOOLTIP_STYLE} cursor={{ strokeDasharray: '3 3' }} />
          <Scatter data={data} fill="#10b981" />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

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

  // Default: bar chart
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
