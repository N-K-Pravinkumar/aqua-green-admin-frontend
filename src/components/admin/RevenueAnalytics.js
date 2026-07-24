import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
export default function RevenueAnalytics({ getAnalytics, getRevenueChart, label = 'Revenue' }) {
  const [open, setOpen] = useState(false);
  const [rangeKey, setRangeKey] = useState('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [chartGranularity, setChartGranularity] = useState('week');
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);

  const load = () => {
    if (rangeKey === 'custom' && (!customFrom || !customTo)) return;
    const [from, to] = computeRange(rangeKey, customFrom, customTo);
    setLoading(true);
    getAnalytics(from.toISOString().slice(0, 19), to.toISOString().slice(0, 19))
      .then(r => setData(r.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (open) load(); }, [rangeKey, customFrom, customTo, open]);

  useEffect(() => {
    if (!open || !getRevenueChart) return;
    setChartLoading(true);
    const count = chartGranularity === 'week' ? 8 : 9;
    getRevenueChart(chartGranularity, count)
      .then(r => setChartData(r.data.data || []))
      .catch(() => setChartData([]))
      .finally(() => setChartLoading(false));
  }, [chartGranularity, getRevenueChart, open]);

  return (
    <div className="section-card" style={{ padding: 18, marginBottom: 16 }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, cursor: 'pointer' }}
        onClick={() => setOpen(o => !o)}
      >
        <div style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-block', transition: 'transform .2s', transform: open ? 'rotate(90deg)' : 'none' }}>▶</span>
          {label} Analytics
        </div>
        {!open && <span style={{ fontSize: 11, color: '#9aa0a6' }}>Click to open</span>}
        {open && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
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
        )}
      </div>

      {open && (<>
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

      {getRevenueChart && (
        <div style={{ marginTop: 20, borderTop: '1px solid #eee', paddingTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Revenue Trend</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className={`filter-btn${chartGranularity === 'week' ? ' active' : ''}`} style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setChartGranularity('week')}>Weekly</button>
              <button className={`filter-btn${chartGranularity === 'month' ? ' active' : ''}`} style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setChartGranularity('month')}>Monthly</button>
            </div>
          </div>
          <div style={{ width: '100%', height: 220 }}>
            {chartLoading ? (
              <div style={{ textAlign: 'center', color: '#9aa0a6', paddingTop: 80 }}>Loading chart…</div>
            ) : (
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="#0F9D58" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
      </>)}
    </div>
  );
}
