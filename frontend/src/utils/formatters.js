export function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) return '$0';
  const num = parseFloat(value);
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(2)}`;
}

export function formatNumber(value) {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return parseFloat(value).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function formatPercent(value) {
  return `${parseFloat(value).toFixed(1)}%`;
}

export function formatRating(value) {
  return `${parseFloat(value).toFixed(1)}/5`;
}

export function smartFormat(key, value) {
  if (value === null || value === undefined) return '—';
  const k = (key || '').toLowerCase();
  if (k.includes('revenue') || k.includes('price') || k.includes('discounted')) return formatCurrency(value);
  if (k.includes('percent') || k.includes('rate')) return formatPercent(value);
  if (k.includes('rating')) return formatRating(value);
  if (typeof value === 'number') return formatNumber(value);
  return String(value);
}
