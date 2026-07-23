import { useState, useEffect } from 'react';
import { Search, Phone, MessageCircle, Wrench, AlertTriangle } from 'lucide-react';
import { maintenanceAPI } from '../../services/api';
import { formatDate, useToast } from '../../components/admin/AdminHelpers';

const INTERVAL_OPTIONS = [
  { label: '3 months',  months: 3 },
  { label: '6 months',  months: 6 },
  { label: '1 year',    months: 12 },
  { label: 'Custom…',   months: 'custom' },
];

export default function AdminMaintenance() {
  const [partName, setPartName] = useState('');
  const [interval, setInterval_] = useState(6);
  const [customMonths, setCustomMonths] = useState(6);
  const [knownParts, setKnownParts] = useState([]);
  const [results, setResults] = useState(null); // null = not searched yet
  const [loading, setLoading] = useState(false);
  const { show, ToastEl } = useToast();

  useEffect(() => {
    document.getElementById('admin-page-title') && (document.getElementById('admin-page-title').textContent = 'Maintenance Reminders');
  }, []);

  useEffect(() => {
    maintenanceAPI.getParts().then(r => setKnownParts(r.data.data || [])).catch(() => {});
  }, []);

  const monthsToUse = interval === 'custom' ? Number(customMonths) || 6 : interval;

  const handleSearch = async () => {
    if (!partName.trim()) { show('Enter a part name to search for', 'error'); return; }
    setLoading(true);
    try {
      const r = await maintenanceAPI.getOverdue(partName.trim(), monthsToUse);
      setResults(r.data.data || []);
    } catch {
      show('Search failed', 'error');
      setResults([]);
    }
    setLoading(false);
  };

  const openWhatsapp = (row) => {
    const digits = (row.customerMobile || '').replace(/\D/g, '');
    const mobile = digits.length === 10 ? `91${digits}` : digits;
    const msg = `Dear ${row.customerName || ''}, it's been over ${monthsToUse} months since your ${partName} was last replaced` +
      (row.lastReplacedDate ? ` (on ${formatDate(row.lastReplacedDate)})` : '') +
      `. We recommend scheduling a replacement soon to keep your RO purifier performing at its best. Call 09952828740 or reply here to book a visit. - Aqua Green Agencies, Coimbatore`;
    window.open(`https://wa.me/${mobile}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div>
      {ToastEl}
      <div className="flex-between mb-16">
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Maintenance Reminders</div>
          <div className="text-muted text-sm">Find customers overdue for a part replacement — based on spare parts already logged during past services.</div>
        </div>
      </div>

      {/* Filter card */}
      <div className="section-card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.4fr auto', gap: 12, alignItems: 'end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Part / Product Name</label>
            <input
              className="form-input"
              list="known-parts"
              value={partName}
              onChange={e => setPartName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="e.g. Carbon Filter, Sediment Filter, RO Membrane…"
            />
            <datalist id="known-parts">
              {knownParts.map(p => <option key={p} value={p} />)}
            </datalist>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Overdue if last changed more than</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select className="form-select" value={interval} onChange={e => setInterval_(e.target.value === 'custom' ? 'custom' : Number(e.target.value))}>
                {INTERVAL_OPTIONS.map(o => (
                  <option key={o.label} value={o.months}>{o.label}</option>
                ))}
              </select>
              {interval === 'custom' && (
                <input className="form-input" type="number" min={1} style={{ width: 80 }}
                  value={customMonths} onChange={e => setCustomMonths(e.target.value)} placeholder="months" />
              )}
            </div>
          </div>

          <button className="btn btn-primary" style={{ padding: '10px 20px', height: 40 }} onClick={handleSearch} disabled={loading}>
            {loading ? 'Searching…' : <><Search size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Find Overdue</>}
          </button>
        </div>
        {knownParts.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 11, color: '#9aa0a6' }}>
            Parts logged before: {knownParts.slice(0, 8).join(', ')}{knownParts.length > 8 ? '…' : ''}
          </div>
        )}
      </div>

      {/* Results */}
      {results === null ? (
        <div className="section-card" style={{ padding: 48, textAlign: 'center', color: '#9aa0a6' }}>
          <Wrench size={32} style={{ opacity: .3, marginBottom: 10 }} />
          <div>Enter a part name and interval, then click Find Overdue.</div>
        </div>
      ) : loading ? (
        <div className="section-card" style={{ padding: 40, textAlign: 'center', color: '#9aa0a6' }}>Searching…</div>
      ) : results.length === 0 ? (
        <div className="section-card" style={{ padding: 48, textAlign: 'center', color: '#9aa0a6' }}>
          No one's overdue — either everyone's within {monthsToUse} months, or "{partName}" hasn't been logged as a replaced part yet.
        </div>
      ) : (
        <div className="section-card">
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 8, background: '#fff7ed' }}>
            <AlertTriangle size={16} color="#b45309" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#b45309' }}>
              {results.length} customer{results.length !== 1 ? 's' : ''} overdue for "{partName}" ({monthsToUse}+ months since last change)
            </span>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Customer</th><th>Mobile</th><th>Product</th><th>Last Replaced</th><th>Days Since</th><th>Actions</th></tr></thead>
              <tbody>
                {results.map((row, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{row.customerName || '—'}</td>
                    <td><a href={`tel:${row.customerMobile}`} style={{ color: '#009B00', fontWeight: 600 }}>{row.customerMobile}</a></td>
                    <td style={{ fontSize: 12 }}>{row.productName || '—'}</td>
                    <td style={{ fontSize: 12 }}>{formatDate(row.lastReplacedDate)}</td>
                    <td>
                      <span className="badge badge-followup" style={{ fontWeight: 700 }}>
                        {row.daysSinceReplaced} days
                      </span>
                    </td>
                    <td>
                      <div className="flex-gap" style={{ gap: 4 }}>
                        <a href={`tel:${row.customerMobile}`} className="btn btn-xs btn-ghost"><Phone size={13} style={{ verticalAlign: 'middle' }} /></a>
                        <button className="btn btn-xs btn-ghost" onClick={() => openWhatsapp(row)} title="Send reminder via WhatsApp">
                          <MessageCircle size={13} style={{ verticalAlign: 'middle', color: '#25D366' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
