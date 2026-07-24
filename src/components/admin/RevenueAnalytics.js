import { useState, useEffect } from 'react';

const RANGE_OPTIONS = [
  { key: 'week',  label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'last2', label: 'Last 2 Months' },
  { key: 'last3', label: 'Last 3 Months' },
  { key: 'last4', label: 'Last 4 Months' },
  { key: 'last5', label: 'Last 5 Months' },
  { key: 'last6', label: 'Last 6 Months' },
  { key: 'last7', label: 'Last 7 Months' },
  { key: 'last8', label: 'Last 8 Months' },
  { key: 'last9', label: 'Last 9 Months' },
  { key: 'custom', label: 'Custom Range' },
];

function computeRange(key, customFrom, customTo) {
  const now = new Date();
  if (key === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return [start, now];
  }
  if (key === 'month') {
    return [new Date(now.getFullYear(), now.getMonth(), 1), now];
  }
  const m = key.match(/^last(\d+)$/);
  if (m) {
    const n = parseInt(m[1], 10);
    return [new Date(now.getFullYear(), now.getMonth() - n + 1, 1), now];
  }
  if (key === 'custom' && customFrom && customTo) {
    return [new Date(customFrom + 'T00:00:00'), new Date(customTo + 'T23:59:59')];
  }
  return [new Date(now.getFullYear(), now.getMonth(), 1), now];
}

/**
 * Revenue analytics card with a "This Week / This Month (default) / Last N
 * Months / Custom Range" selector. Reused identically on Sales and Service
 * Requests — just point `getAnalytics` at the matching API helper.
 */
export default function RevenueAnalytics({ getAnalytics, label = 'Revenue' }) {
  const [rangeKey, setRangeKey] = useState('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    if (rangeKey === 'custom' && (!customFrom || !customTo)) return;
    const [from, to] = computeRange(rangeKey, customFrom, customTo);
    setLoading(true);
    getAnalytics(from.toISOString().slice(0, 19), to.toISOString().slice(0, 19))
      .then(r => setData(r.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(load, [rangeKey, customFrom, customTo]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="section-card" style={{ padding: 18, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{label} Analytics</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {RANGE_OPTIONS.map(o => (
            <button
              key={o.key}
              className={`filter-btn${rangeKey === o.key ? ' active' : ''}`}
              style={{ fontSize: 11, padding: '5px 10px' }}
              onClick={() => setRangeKey(o.key)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {rangeKey === 'custom' && (
        <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center' }}>
          <input type="date" className="form-input" style={{ maxWidth: 160 }} value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
          <span style={{ color: '#9aa0a6', fontSize: 12 }}>to</span>
          <input type="date" className="form-input" style={{ maxWidth: 160 }} value={customTo} onChange={e => setCustomTo(e.target.value)} />
        </div>
      )}

      <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: '#9aa0a6', fontWeight: 600 }}>TOTAL REVENUE</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#009B00' }}>
            {loading ? '…' : `₹${Number(data?.revenue || 0).toLocaleString('en-IN')}`}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#9aa0a6', fontWeight: 600 }}>RECORDS</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#374151' }}>
            {loading ? '…' : (data?.count ?? 0)}
          </div>
        </div>
      </div>
    </div>
  );
}
